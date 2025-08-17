-- Simple multi-tenant table with RLS
-- Single table with bank_id for tenant isolation

-- Create users for different tenants
CREATE ROLE tenant_a LOGIN PASSWORD 'password_a';
CREATE ROLE tenant_b LOGIN PASSWORD 'password_b';

-- Grant basic connection privileges
GRANT CONNECT ON DATABASE multitenant_db TO tenant_a, tenant_b;

-- Create simple table
CREATE TABLE customers (
    bank_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL
);

-- Grant table permissions to tenant users
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO tenant_a, tenant_b;