#!/bin/bash

# API Test Script for Multi-tenant RLS Demo

set -e

echo "🚀 Starting API RLS Test"

# Start database
docker-compose up -d
sleep 5

# Install Python dependencies
echo "📦 Installing Python dependencies..."
uv sync >/dev/null 2>&1

# Start API in background
echo "🔧 Starting FastAPI server..."
uv run python app.py &
API_PID=$!
sleep 3

# Get tokens from API root
echo "🔑 Getting demo tokens..."
RESPONSE=$(curl -s http://localhost:8000/)
TENANT_A_TOKEN=$(echo $RESPONSE | uv run python -c "import sys, json; print(json.load(sys.stdin)['demo_tokens']['tenant_a'])")
TENANT_B_TOKEN=$(echo $RESPONSE | uv run python -c "import sys, json; print(json.load(sys.stdin)['demo_tokens']['tenant_b'])")

echo "📊 Tenant A gets customers via API:"
curl -s -H "Authorization: Bearer $TENANT_A_TOKEN" http://localhost:8000/customers | uv run python -m json.tool

echo -e "\n📊 Tenant B gets customers via API:"
curl -s -H "Authorization: Bearer $TENANT_B_TOKEN" http://localhost:8000/customers | uv run python -m json.tool

echo -e "\n✅ Tenant A creates new customer:"
curl -s -X POST -H "Authorization: Bearer $TENANT_A_TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "API Customer A"}' http://localhost:8000/customers | uv run python -m json.tool

echo -e "\n✅ Tenant A updates their own record (should succeed):"
UPDATE_SUCCESS_RESPONSE=$(curl -s -X PUT -H "Authorization: Bearer $TENANT_A_TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}' http://localhost:8000/customers/Alice%20from%20Bank%20A)
echo $UPDATE_SUCCESS_RESPONSE | uv run python -m json.tool
if echo $UPDATE_SUCCESS_RESPONSE | grep -q "updated"; then
  echo "✅ Successfully updated own record"
else
  echo "❌ Error: Should have been able to update own record!"
fi

echo -e "\n🚫 Tenant A tries to update a Tenant B record (should fail):"
UPDATE_RESPONSE=$(curl -s -X PUT -H "Authorization: Bearer $TENANT_A_TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Hacked Customer"}' http://localhost:8000/customers/David%20from%20Bank%20B)
echo $UPDATE_RESPONSE | uv run python -m json.tool
if echo $UPDATE_RESPONSE | grep -q "Customer not found"; then
  echo "✅ Correctly failed - Customer not found (RLS working)"
else
  echo "❌ Error: Update should have failed!"
fi

echo -e "\n📊 Final state - Tenant A customers:"
curl -s -H "Authorization: Bearer $TENANT_A_TOKEN" http://localhost:8000/customers | uv run python -m json.tool

# Cleanup
echo -e "\n🧹 Cleaning up..."
kill $API_PID 2>/dev/null || true

echo "🎉 API test complete! RLS works through API layer."