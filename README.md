# Experiment: PostgreSQL Row Security Policies

This is an experiment of https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Simple Multi-tenant Database with Row-Level Security

This experiment demonstrates how to use PostgreSQL Row-Level Security (RLS) to implement perfect tenant isolation in a multi-tenant application using a simple `bank_id` column.

### Experiment Setup

A single `customers` table with two columns:
- `bank_id` (INTEGER) - tenant identifier 
- `name` (VARCHAR) - customer name

Two tenants with complete data isolation:
- **Tenant A** (bank_id = 1) - 3 customers
- **Tenant B** (bank_id = 2) - 2 customers

### Key Components

1. **Simple Schema** (`init/01-schema.sql`)
   - Single `customers` table with `bank_id` and `name` columns
   - Two database users: `tenant_a` and `tenant_b`
   - Basic table permissions

2. **Row-Level Security Policies** (`init/02-rls.sql`)
   - RLS enabled on the customers table
   - `tenant_a_policy`: tenant_a can only see/modify bank_id = 1
   - `tenant_b_policy`: tenant_b can only see/modify bank_id = 2
   - Both USING and WITH CHECK clauses for complete protection

3. **Test Data** (`init/03-data.sql`)
   - 3 customers for Tenant A (bank_id = 1)
   - 2 customers for Tenant B (bank_id = 2)

### Running the Experiment

```bash
./test.sh
```

This single script starts PostgreSQL and runs the complete RLS demonstration.

### What the Experiment Demonstrates

✅ **Perfect Tenant Isolation**: Each tenant sees only their own data  
✅ **Cross-tenant Read Protection**: Tenants cannot see other tenant's rows  
✅ **Cross-tenant Write Protection**: INSERT to wrong tenant fails with policy violation  
✅ **Cross-tenant Update Protection**: UPDATE attempts affect 0 rows  
✅ **Cross-tenant Delete Protection**: DELETE attempts affect 0 rows  
✅ **Valid Operations**: Tenants can freely INSERT/UPDATE/DELETE their own data  

### Experiment Results

**Data Visibility:**
- Tenant A: sees 3 rows (only bank_id = 1)
- Tenant B: sees 2 rows (only bank_id = 2)
- Admin: sees all 5 rows

**Security Enforcement:**
- Cross-tenant INSERTs: `new row violates row-level security policy`
- Cross-tenant UPDATEs: `UPDATE 0` (no rows affected)
- Cross-tenant DELETEs: `DELETE 0` (no rows affected)

### Key Findings

- **Database-level Security**: RLS provides bulletproof tenant isolation at the database layer
- **Transparent to Application**: No application code changes needed
- **Simple Implementation**: Just enable RLS and create policies based on tenant column
- **Performance**: Minimal impact with proper indexing on `bank_id`
- **Bulletproof**: Protects against developer errors and SQL injection

### Files Structure

```
.
├── docker-compose.yml     # PostgreSQL container setup
├── init/
│   ├── 01-schema.sql     # Simple table schema and users
│   ├── 02-rls.sql        # Row-Level Security policies  
│   └── 03-data.sql       # Test data for both tenants
├── test.sh               # Complete RLS demonstration
└── README.md             # This documentation
```

### Cleanup

```bash
docker-compose down -v  # Stop and remove all data
```

**Conclusion:** This experiment proves that PostgreSQL RLS provides perfect multi-tenant data isolation using a simple column-based approach. Tenant A cannot see, change, or delete Tenant B's rows, and vice versa.