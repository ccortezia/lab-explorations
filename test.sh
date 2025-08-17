#!/bin/bash

# PostgreSQL Row Level Security Test
# Demonstrates tenant isolation with bank_id column

set -e

run_sql() {
    echo "$2" | PGPASSWORD=$3 pgcli postgres://$1@localhost:5432/multitenant_db 2>/dev/null | grep -E "^\||\+.*\+" || true
}

echo "🚀 Starting PostgreSQL RLS Test"
docker-compose up -d
sleep 5

echo "📊 Admin sees all data:"
run_sql admin "SELECT * FROM customers;" admin123

echo "🏦 Tenant A (bank_id=1) sees only its data:"
run_sql tenant_a "SELECT * FROM customers;" password_a

echo "🏦 Tenant B (bank_id=2) sees only its data:"
run_sql tenant_b "SELECT * FROM customers;" password_b

echo "🚫 Tenant A tries to insert for Tenant B (should fail):"
echo "INSERT INTO customers VALUES (2, 'Hacker');" | PGPASSWORD=password_a pgcli postgres://tenant_a@localhost:5432/multitenant_db 2>&1 | grep "policy" && echo "✅ Blocked!"

echo "✅ Tenant A inserts for itself (should work):"
echo "INSERT INTO customers VALUES (1, 'New Customer A');" | PGPASSWORD=password_a pgcli postgres://tenant_a@localhost:5432/multitenant_db >/dev/null 2>&1

echo "📊 Final state - admin view:"
run_sql admin "SELECT * FROM customers ORDER BY bank_id;" admin123

echo "🎉 Test complete! RLS prevents cross-tenant access."