-- =====================================================
-- RECYCLE BIN MIGRATION
-- =====================================================
-- This migration creates a complete recycle bin system with:
-- - Soft delete functionality
-- - Restore capability (with reverse-order for cascade handling)
-- - Permanent delete (purge) option
-- - Multi-tenant support (org isolation)
-- - Two-table design: deletion_batches + deleted_records
-- =====================================================

-- =====================================================
-- CREATE SCHEMA
-- =====================================================

CREATE SCHEMA IF NOT EXISTS recycle;

-- =====================================================
-- MIGRATE OLD SCHEMA TO NEW (IF EXISTS)
-- =====================================================

-- Check if deletion_batches table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'recycle' AND table_name = 'deletion_batches') THEN
    CREATE TABLE recycle.deletion_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      deleted_by UUID NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      org_id UUID NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      restored_at TIMESTAMP WITH TIME ZONE,
      restored_by UUID
    );
  END IF;
END $$;

-- Migrate data from old deleted_records to new two-table design
DO $$
DECLARE
  v_old_batches_count INTEGER;
BEGIN
  -- Check if we have old-style records with deletion_id
  SELECT COUNT(*) INTO v_old_batches_count
  FROM recycle.deleted_records
  WHERE deletion_id IS NOT NULL AND batch_id IS NULL;

  IF v_old_batches_count > 0 THEN
    -- Create batches from old deletion_id records
    INSERT INTO recycle.deletion_batches (id, deleted_by, deleted_at, org_id)
    SELECT DISTINCT
      dr.deletion_id,
      dr.deleted_by,
      dr.deleted_at,
      dr.org_id
    FROM recycle.deleted_records dr
    WHERE dr.deletion_id IS NOT NULL
      AND dr.batch_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM recycle.deletion_batches db WHERE db.id = dr.deletion_id
      );

    -- Update deleted_records to reference batches
    UPDATE recycle.deleted_records dr
    SET batch_id = dr.deletion_id
    WHERE dr.deletion_id IS NOT NULL
      AND dr.batch_id IS NULL
      AND EXISTS (
        SELECT 1 FROM recycle.deletion_batches db WHERE db.id = dr.deletion_id
      );
  END IF;
END $$;

-- Drop old columns that are no longer needed
DO $$
BEGIN
  -- Drop old columns from deleted_records if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'deletion_id'
  ) THEN
    ALTER TABLE recycle.deleted_records DROP COLUMN IF EXISTS deletion_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE recycle.deleted_records DROP COLUMN IF EXISTS deleted_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'deleted_by'
  ) THEN
    ALTER TABLE recycle.deleted_records DROP COLUMN IF EXISTS deleted_by;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE recycle.deleted_records DROP COLUMN IF EXISTS org_id;
  END IF;
END $$;

-- =====================================================
-- CREATE/UPDATE TABLES
-- =====================================================

-- Ensure deletion_batches has all correct columns
DO $$
BEGIN
  -- Add restored_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deletion_batches' AND column_name = 'restored_at'
  ) THEN
    ALTER TABLE recycle.deletion_batches ADD COLUMN restored_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add restored_by if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deletion_batches' AND column_name = 'restored_by'
  ) THEN
    ALTER TABLE recycle.deletion_batches ADD COLUMN restored_by UUID;
  END IF;
END $$;

-- Ensure deleted_records has correct structure
DO $$
BEGIN
  -- Add batch_id if not exists (nullable for migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE recycle.deleted_records ADD COLUMN batch_id UUID;
  END IF;

  -- Make batch_id NOT NULL after migration
  -- (This will be done after data migration is complete)

  -- Add deletion_order if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'deletion_order'
  ) THEN
    ALTER TABLE recycle.deleted_records ADD COLUMN deletion_order INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- Add metadata if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'recycle' AND table_name = 'deleted_records' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE recycle.deleted_records ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add foreign key constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'recycle'
      AND constraint_name = 'fk_deleted_records_batch'
      AND table_name = 'deleted_records'
  ) THEN
    ALTER TABLE recycle.deleted_records
    ADD CONSTRAINT fk_deleted_records_batch
    FOREIGN KEY (batch_id)
    REFERENCES recycle.deletion_batches(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Indexes for deletion_batches
CREATE INDEX IF NOT EXISTS idx_recycle_batches_deleted_by ON recycle.deletion_batches(deleted_by);
CREATE INDEX IF NOT EXISTS idx_recycle_batches_org_id ON recycle.deletion_batches(org_id);
CREATE INDEX IF NOT EXISTS idx_recycle_batches_deleted_at ON recycle.deletion_batches(deleted_at);
CREATE INDEX IF NOT EXISTS idx_recycle_batches_restored_at ON recycle.deletion_batches(restored_at);

-- Indexes for deleted_records
CREATE INDEX IF NOT EXISTS idx_recycle_records_batch_id ON recycle.deleted_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_recycle_records_schema_table ON recycle.deleted_records(schema_name, table_name);
CREATE INDEX IF NOT EXISTS idx_recycle_records_record_id ON recycle.deleted_records(record_id);
CREATE INDEX IF NOT EXISTS idx_recycle_records_deletion_order ON recycle.deleted_records(batch_id, deletion_order);

-- Drop old indexes that are no longer needed
DROP INDEX IF EXISTS recycle.idx_recycle_deletion_id;
DROP INDEX IF EXISTS recycle.idx_recycle_org_id;

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Helper function to get the next deletion order for a batch
CREATE OR REPLACE FUNCTION recycle.get_next_deletion_order(p_batch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_next_order INTEGER := 1;
BEGIN
  SELECT COALESCE(MAX(deletion_order), 0) + 1
  INTO v_next_order
  FROM recycle.deleted_records
  WHERE batch_id = p_batch_id;

  RETURN v_next_order;
END;
$$;

-- Function to perform soft delete
CREATE OR REPLACE FUNCTION recycle.soft_delete_record(
  p_schema TEXT,
  p_table TEXT,
  p_record_id UUID,
  p_batch_id UUID DEFAULT NULL
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
  v_deletion_order INTEGER;
  v_batch_id UUID := p_batch_id;
  v_user_id UUID := auth.uid();
BEGIN
  -- Get org_id from system.users table
  SELECT u.org_id INTO v_org_id
  FROM system.users u
  WHERE u.id = v_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID not found for user';
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

  -- Create batch if not provided
  IF v_batch_id IS NULL THEN
    INSERT INTO recycle.deletion_batches (deleted_by, org_id)
    VALUES (v_user_id, v_org_id)
    RETURNING id INTO v_batch_id;
  END IF;

  -- Get deletion order
  v_deletion_order := recycle.get_next_deletion_order(v_batch_id);

  -- Store deleted record
  INSERT INTO recycle.deleted_records (
    batch_id,
    schema_name,
    table_name,
    record_id,
    record_data,
    deletion_order
  ) VALUES (
    v_batch_id,
    p_schema,
    p_table,
    p_record_id,
    v_record_data,
    v_deletion_order
  );

  -- Perform actual deletion
  EXECUTE format('DELETE FROM %I.%I WHERE %I = $1', p_schema, p_table, v_pk_column)
  USING p_record_id;

  RETURN v_batch_id;
END;
$$;

-- Function to restore a deletion batch
CREATE OR REPLACE FUNCTION recycle.restore_deletion(p_batch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_record RECORD;
  v_sql TEXT;
  v_column_list TEXT;
  v_restored_count INTEGER := 0;
  v_restored_ids UUID[] := '{}'::UUID[];
BEGIN
  -- Restore records in REVERSE order (for cascade delete handling)
  FOR v_record IN
    SELECT schema_name, table_name, record_id, record_data
    FROM recycle.deleted_records
    WHERE batch_id = p_batch_id
    ORDER BY deletion_order DESC
  LOOP
    -- Build column list and type cast from JSONB keys
    SELECT STRING_AGG(quote_ident(key), ', ')
    INTO v_column_list
    FROM jsonb_object_keys(v_record.record_data) AS t(key);

    -- Build dynamic INSERT with proper type casting
    v_sql := format(
      'INSERT INTO %I.%I (%s) SELECT * FROM jsonb_to_record($1) AS t(%s)',
      v_record.schema_name,
      v_record.table_name,
      v_column_list,
      v_column_list
    );

    BEGIN
      -- Execute the insert
      EXECUTE v_sql USING v_record.record_data;
      v_restored_count := v_restored_count + 1;
      v_restored_ids := array_append(v_restored_ids, v_record.record_id);
    EXCEPTION WHEN OTHERS THEN
      -- Re-raise to preserve records on failure
      RAISE EXCEPTION 'Failed to restore record % from %.%: %',
                   v_record.record_id, v_record.schema_name, v_record.table_name, SQLERRM;
    END;
  END LOOP;

  -- Only delete successfully restored records
  IF v_restored_count > 0 AND array_length(v_restored_ids, 1) > 0 THEN
    DELETE FROM recycle.deleted_records
    WHERE batch_id = p_batch_id
      AND record_id = ANY(v_restored_ids);

    -- Update batch with restored timestamp
    UPDATE recycle.deletion_batches
    SET restored_at = NOW(),
        restored_by = auth.uid()
    WHERE id = p_batch_id
      AND NOT EXISTS (
        SELECT 1 FROM recycle.deleted_records WHERE batch_id = p_batch_id
      );
  END IF;

  RETURN v_restored_count;
END;
$$;

-- Function to permanently delete (purge) a deletion batch
CREATE OR REPLACE FUNCTION recycle.purge_deletion(p_batch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete from recycle bin (cascade will delete records too)
  DELETE FROM recycle.deletion_batches
  WHERE id = p_batch_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- Function to get all deletions for current org
CREATE OR REPLACE FUNCTION recycle.get_org_deletions()
RETURNS TABLE (
  batch_id UUID,
  schema_name TEXT,
  table_name TEXT,
  record_id UUID,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by_email TEXT,
  record_count BIGINT,
  restored_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'information_schema', 'system', 'pg_temp', 'recycle'
AS $$
  SELECT
    b.id as batch_id,
    d.schema_name,
    d.table_name,
    d.record_id,
    b.deleted_at,
    COALESCE(u.email, 'Unknown') as deleted_by_email,
    COUNT(*) OVER (PARTITION BY b.id) as record_count,
    b.restored_at
  FROM recycle.deletion_batches b
  JOIN recycle.deleted_records d ON d.batch_id = b.id
  LEFT JOIN system.users u ON u.id = b.deleted_by
  WHERE b.org_id = (SELECT org_id FROM system.users WHERE id = auth.uid())
  ORDER BY b.deleted_at DESC;
$$;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE recycle.deletion_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycle.deleted_records ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users see own org deleted records" ON recycle.deleted_records;

-- Users can only see their org's deletion batches
CREATE POLICY IF NOT EXISTS "Users see own org deletion batches" ON recycle.deletion_batches
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM system.users WHERE id = auth.uid())
  );

-- Users can only see their org's deleted records (via batch)
CREATE POLICY IF NOT EXISTS "Users see own org deleted records" ON recycle.deleted_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recycle.deletion_batches b
      WHERE b.id = batch_id
        AND b.org_id = (SELECT org_id FROM system.users WHERE id = auth.uid())
    )
  );

-- =====================================================
-- GRANT STATEMENTS
-- =====================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA recycle TO authenticated;

-- Grant table permissions
GRANT SELECT, INSERT ON recycle.deletion_batches TO authenticated;
GRANT SELECT ON recycle.deleted_records TO authenticated;

-- Grant sequence usage
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA recycle TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION recycle.soft_delete_record(TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.restore_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.purge_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.get_org_deletions() TO authenticated;
GRANT EXECUTE ON FUNCTION recycle.get_next_deletion_order(UUID) TO authenticated;

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

COMMENT ON SCHEMA recycle IS 'Recycle bin for soft-delete functionality with two-table design';
COMMENT ON TABLE recycle.deletion_batches IS 'Tracks each deletion event with batch-level metadata';
COMMENT ON TABLE recycle.deleted_records IS 'Individual deleted records linked to deletion batches';
COMMENT ON COLUMN recycle.deletion_batches.restored_at IS 'Timestamp when batch was restored';
COMMENT ON COLUMN recycle.deleted_records.batch_id IS 'Foreign key to deletion_batches';
COMMENT ON COLUMN recycle.deleted_records.record_data IS 'Complete record data as JSONB for restoration';
COMMENT ON COLUMN recycle.deleted_records.deletion_order IS 'Order of deletion for proper restore (reverse on restore for cascades)';
