-- =====================================================
-- RECYCLE BIN MIGRATION
-- =====================================================
-- This migration creates a complete recycle bin system with:
-- - Soft delete functionality
-- - Restore capability
-- - Permanent delete (purge) option
-- - Multi-tenant support (org isolation)
-- =====================================================

-- =====================================================
-- CREATE SCHEMA AND TABLES
-- =====================================================

-- Create recycle schema
CREATE SCHEMA IF NOT EXISTS recycle;

-- Create deleted_records table to track all deletions
CREATE TABLE recycle.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_id UUID NOT NULL DEFAULT gen_random_uuid(), -- Groups all records deleted in one transaction
  schema_name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_data JSONB NOT NULL, -- Complete record data for restore
  deleted_by UUID NOT NULL, -- User who performed the deletion
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_order INTEGER NOT NULL, -- Order for proper restore
  org_id UUID NOT NULL, -- For multi-tenancy
  metadata JSONB DEFAULT '{}'::jsonb -- Additional metadata (foreign keys, dependencies, etc.)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Create indexes for performance
CREATE INDEX idx_recycle_deletion_id ON recycle.deleted_records(deletion_id);
CREATE INDEX idx_recycle_schema_table ON recycle.deleted_records(schema_name, table_name);
CREATE INDEX idx_recycle_record_id ON recycle.deleted_records(record_id);
CREATE INDEX idx_recycle_org_id ON recycle.deleted_records(org_id);
CREATE INDEX idx_recycle_deleted_at ON recycle.deleted_records(deleted_at);
CREATE INDEX idx_recycle_deletion_order ON recycle.deleted_records(deletion_id, deletion_order);

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Function to perform soft delete
CREATE OR REPLACE FUNCTION recycle.soft_delete_record(
  p_schema TEXT,
  p_table TEXT,
  p_record_id UUID,
  p_deletion_id UUID DEFAULT gen_random_uuid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_record_data JSONB;
  v_org_id UUID;
  v_pk_column TEXT;
  v_counter INTEGER := 0;
BEGIN
  -- Get org_id from JWT
  v_org_id := (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID not found in JWT';
  END IF;

  -- Get primary key column
  SELECT kcu.column_name INTO v_pk_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = p_schema
    AND tc.table_name = p_table
    AND tc.constraint_type = 'PRIMARY KEY';

  IF v_pk_column IS NULL THEN
    RAISE EXCEPTION 'No primary key found for %.%', p_schema, p_table;
  END IF;

  -- Get complete record data using dynamic SQL
  EXECUTE format('SELECT to_jsonb(t) FROM %I.%I t WHERE %I = $1', p_schema, p_table, v_pk_column)
  USING p_record_id
  INTO v_record_data;

  IF v_record_data IS NULL THEN
    RAISE EXCEPTION 'Record not found';
  END IF;

  -- Store deleted record
  INSERT INTO recycle.deleted_records (
    deletion_id,
    schema_name,
    table_name,
    record_id,
    record_data,
    deleted_by,
    deletion_order,
    org_id
  ) VALUES (
    p_deletion_id,
    p_schema,
    p_table,
    p_record_id,
    v_record_data,
    auth.uid(),
    v_counter,
    v_org_id
  );

  -- Perform actual deletion
  EXECUTE format('DELETE FROM %I.%I WHERE %I = $1', p_schema, p_table, v_pk_column)
  USING p_record_id;

  RETURN p_deletion_id;
END;
$$;

-- Function to restore a deletion group
CREATE OR REPLACE FUNCTION recycle.restore_deletion(p_deletion_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_record RECORD;
  v_sql TEXT;
  v_restored_count INTEGER := 0;
BEGIN
  -- Restore records in reverse order of deletion
  FOR v_record IN
    SELECT schema_name, table_name, record_id, record_data
    FROM recycle.deleted_records
    WHERE deletion_id = p_deletion_id
    ORDER BY deletion_order DESC
  LOOP
    -- Build dynamic INSERT statement from JSONB data
    v_sql := format('INSERT INTO %I.%I SELECT * FROM jsonb_to_record($1) AS t(jsonb)',
                    v_record.schema_name, v_record.table_name);

    BEGIN
      EXECUTE v_sql USING v_record.record_data;
      v_restored_count := v_restored_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue with other records
      RAISE NOTICE 'Failed to restore record % from %.%: %',
                   v_record.record_id, v_record.schema_name, v_record.table_name, SQLERRM;
    END;
  END LOOP;

  -- Delete successfully restored records from recycle bin
  DELETE FROM recycle.deleted_records
  WHERE deletion_id = p_deletion_id;

  RETURN v_restored_count;
END;
$$;

-- Function to permanently delete (purge) a deletion group
CREATE OR REPLACE FUNCTION recycle.purge_deletion(p_deletion_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete from recycle bin
  DELETE FROM recycle.deleted_records
  WHERE deletion_id = p_deletion_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Function to get all deletions for current org
CREATE OR REPLACE FUNCTION recycle.get_org_deletions()
RETURNS TABLE (
  deletion_id UUID,
  schema_name TEXT,
  table_name TEXT,
  record_id UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by_email TEXT,
  record_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
  SELECT
    d.deletion_id,
    d.schema_name,
    d.table_name,
    d.record_id,
    d.deleted_at,
    COALESCE(u.email, 'Unknown') as deleted_by_email,
    COUNT(*) OVER (PARTITION BY d.deletion_id) as record_count
  FROM recycle.deleted_records d
  LEFT JOIN system.users u ON u.id = d.deleted_by
  WHERE d.org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID
  ORDER BY d.deleted_at DESC;
$$;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE recycle.deleted_records ENABLE ROW LEVEL SECURITY;

-- Users can only see their org's deleted records
CREATE POLICY "Users see own org deleted records" ON recycle.deleted_records
  FOR SELECT
  USING (
    org_id = (auth.jwt() -> 'app_metadata' ->> 'org_id')::UUID
  );

-- =====================================================
-- GRANT STATEMENTS
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA recycle TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT ON recycle.deleted_records TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA recycle TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION recycle.soft_delete_record(TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.restore_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.purge_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.get_org_deletions() TO authenticated;

-- =====================================================
-- DEFAULT PRIVILEGES
-- =====================================================

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA recycle
GRANT SELECT, INSERT ON TABLES TO authenticated;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA recycle
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- =====================================================
-- TABLE COMMENTS
-- =====================================================

COMMENT ON SCHEMA recycle IS 'Recycle bin for soft-delete functionality';
COMMENT ON TABLE recycle.deleted_records IS 'Tracks all deleted records with complete data for restoration';
COMMENT ON COLUMN recycle.deleted_records.deletion_id IS 'Groups all records deleted in one transaction';
COMMENT ON COLUMN recycle.deleted_records.record_data IS 'Complete record data as JSONB for restoration';
COMMENT ON COLUMN recycle.deleted_records.deletion_order IS 'Order of deletion for proper restore (reverse on restore)';
