-- Simple test data for 2 tenants

-- Tenant A data (bank_id = 1)
INSERT INTO customers (bank_id, name) VALUES
    (1, 'Alice from Bank A'),
    (1, 'Bob from Bank A'),
    (1, 'Carol from Bank A');

-- Tenant B data (bank_id = 2)
INSERT INTO customers (bank_id, name) VALUES
    (2, 'David from Bank B'),
    (2, 'Eva from Bank B');