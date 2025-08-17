-- Simple Row Level Security Policies
-- Tenant A can only see bank_id = 1
-- Tenant B can only see bank_id = 2

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Simple RLS policy for tenant_a (bank_id = 1)
CREATE POLICY tenant_a_policy ON customers
    FOR ALL
    TO tenant_a
    USING (bank_id = 1)
    WITH CHECK (bank_id = 1);

-- Simple RLS policy for tenant_b (bank_id = 2)  
CREATE POLICY tenant_b_policy ON customers
    FOR ALL
    TO tenant_b
    USING (bank_id = 2)
    WITH CHECK (bank_id = 2);