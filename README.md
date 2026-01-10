# Raw System

A multi-tenant Salesforce-like system built with Next.js 15, Supabase, and TypeScript. This application provides a comprehensive platform for managing organizations, users, roles, profiles, and permissions with Row Level Security (RLS) enforcement.

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.1.1 with App Router, React 19.2.3, TypeScript
- **Backend**: Supabase (PostgreSQL with RLS, Auth, Real-time)
- **Styling**: Tailwind CSS with Radix UI components
- **Icons**: Lucide React
- **State Management**: React hooks with Supabase real-time subscriptions

### Core Features
- **Multi-tenant Architecture**: Complete organization isolation with RLS
- **Role-based Access Control**: Hierarchical roles with inheritance
- **Profile-based Permissions**: Granular CRUD and field-level security
- **Sharing Rules**: Organization-wide defaults, criteria-based, and manual sharing
- **Dynamic Object Management**: CRUD interface for all system tables
- **Foreign Key Management**: Smart reference handling with search capabilities

## 📁 Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/               # Authentication pages
│   ├── api/
│   │   └── schema/              # Schema discovery API
│   ├── objects/                 # Dynamic object management
│   │   └── [table]/
│   │       ├── page.tsx         # Table column details
│   │       └── records/
│   │           ├── page.tsx     # Record listing
│   │           └── [id]/edit/   # Record editor
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout with sidebar
│   └── page.tsx                 # Dashboard home
├── components/
│   ├── examples/                # Development examples
│   ├── layout/
│   │   └── SidebarLayout.tsx    # Main app layout
│   └── ui/                      # Reusable UI primitives
│       ├── foreign-key-*.tsx    # Foreign key components
│       └── *.tsx                # Base UI components
├── hooks/
│   └── use-foreign-key.ts       # Custom hooks
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   └── server.ts            # Server client
│   ├── foreign-key-config.ts    # FK configuration
│   ├── proxy.ts                 # Session helpers
│   └── utils.ts                 # Utilities
├── types/
│   └── foreign-key.ts           # Type definitions
└── middleware.ts                # Auth middleware

supabase/
└── migrations/
    ├── 20260104163134_initial_schema.sql    # Core schema
    ├── 20260104163211_admin_setup.sql       # Admin user setup
    └── 20260104163245_admin_orgs_setup.sql  # Sample organizations
```

## 🗄️ Database Schema

### Core Tables (system schema)
- **organizations**: Tenant isolation and configuration
- **users**: User accounts linked to Supabase Auth
- **roles**: Hierarchical role structure with inheritance
- **profiles**: Permission templates and access control
- **profile_object_permissions**: CRUD permissions per object
- **profile_field_permissions**: Field-level security
- **org_wide_defaults**: Default sharing settings
- **sharing_rules**: Criteria-based and role-based sharing
- **manual_shares**: Individual record sharing
- **list_views**: Custom filtered views

### Key Features
- **Row Level Security**: All tables enforce tenant isolation
- **JWT Integration**: org_id and profile_id embedded in tokens
- **Role Hierarchy**: Recursive role relationships with level-based access
- **Permission Inheritance**: Roles inherit permissions from parent roles
- **Audit Trail**: created_at/updated_at timestamps on all records

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase project with PostgreSQL database
- Environment variables configured

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd raw-system
npm install
```

2. **Configure environment variables**:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Optional for admin operations
```

3. **Run database migrations**:
```bash
# Apply migrations to your Supabase project
supabase db push
```

4. **Start development server**:
```bash
npm run dev
```

5. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Login with: `admin@system.com` / `smartsolution`

## 🔐 Authentication & Authorization

### Authentication Flow
1. Users authenticate via Supabase Auth (email/password)
2. JWT tokens include `org_id` and `profile_id` in app_metadata
3. Middleware enforces authentication on all routes except `/login`
4. RLS policies use JWT claims for tenant isolation

### Permission System
- **Profiles**: Define permission templates (e.g., "System Administrator")
- **Object Permissions**: CRUD access per table/object type
- **Field Permissions**: Read/edit access per field
- **Sharing Rules**: Override default access with criteria-based rules
- **Manual Sharing**: Individual record-level access grants

### Default Users
- **System Admin**: `admin@system.com` (full system access)
- **Org Admins**: `admin@org0001.com`, `admin@org0002.com` (org-scoped access)

## 🔧 Development

### Key Components

#### Foreign Key Management
- **ForeignKeyReference**: Manual configuration component
- **SmartForeignKeyReference**: Config-driven component
- **InlineForeignKeyEditor**: Dropdown search editor
- **useForeignKey**: Hook for FK data fetching

#### Dynamic Object Interface
- **Objects Page**: Lists all system tables with metadata
- **Table Details**: Shows column definitions and types
- **Records Page**: Displays table data with smart rendering
- **Record Editor**: Create/edit interface with type-aware inputs

### API Routes
- **GET /api/schema**: Discovers system tables and record counts
- Uses service role key if available for admin-level access

### Styling
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **class-variance-authority**: Variant-based component styling
- **Lucide React**: Consistent iconography

## 🧪 Testing & Quality

### Code Quality
```bash
npm run lint          # ESLint checking
npm run type-check     # TypeScript validation
npm run build          # Production build test
```

### Database Testing
- Test with multiple organizations to verify RLS isolation
- Verify permission inheritance in role hierarchies
- Test sharing rules with different criteria

## 📚 Key Concepts

### Multi-tenancy
- Complete data isolation per organization
- JWT-based tenant identification
- RLS policies enforce boundaries automatically

### Role Hierarchy
- Roles can have parent-child relationships
- Higher-level roles inherit subordinate access
- Level-based permission escalation

### Sharing Model
- **Private**: Owner-only access (default)
- **Public Read**: Organization-wide read access
- **Public Read/Write**: Organization-wide full access
- **Criteria-based**: Rule-driven sharing
- **Manual**: Individual record grants

### Foreign Key System
- Automatic UUID reference resolution
- Smart display field detection
- Search-enabled selection interfaces
- Configuration-driven relationship mapping

## 🚀 Deployment

### Environment Setup
1. Configure production environment variables
2. Set up Supabase production project
3. Apply migrations to production database
4. Deploy to Vercel or preferred platform

### Security Considerations
- Never expose service role keys client-side
- Validate all user inputs with Zod schemas
- Implement proper CSRF protection
- Use HTTPS in production
- Regular security audits of RLS policies

## 📖 Additional Documentation

- **Foreign Key System**: See `README-FOREIGN-KEY.md`
- **Database Schema**: Review migration files in `supabase/migrations/`
- **Component Examples**: Check `src/components/examples/`

## 🤝 Contributing

1. Follow TypeScript strict mode requirements
2. Add JSDoc comments to all public functions
3. Maintain RLS policy coverage for new tables
4. Test multi-tenant scenarios thoroughly
5. Update documentation for architectural changes

## 📄 License

This project is licensed under the MIT License.
