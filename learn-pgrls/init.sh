#!/bin/bash

# Database Schema Migration Script
# Applies schema, RLS policies, and test data to PostgreSQL

set -e

echo "🗄️ Initializing database schema and RLS policies..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=admin123 psql -h localhost -U admin -d multitenant_db -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Apply schema migrations in order
echo "📋 Applying schema (01-schema.sql)..."
PGPASSWORD=admin123 psql -h localhost -U admin -d multitenant_db -f init/01-schema.sql

echo "🔒 Applying RLS policies (02-rls.sql)..."
PGPASSWORD=admin123 psql -h localhost -U admin -d multitenant_db -f init/02-rls.sql

echo "📊 Loading test data (03-data.sql)..."
PGPASSWORD=admin123 psql -h localhost -U admin -d multitenant_db -f init/03-data.sql

echo "🎉 Database initialization complete!"
echo "📝 You can now run the test scripts:"
echo "   ./test-sql.sh"
echo "   ./test-api.sh"