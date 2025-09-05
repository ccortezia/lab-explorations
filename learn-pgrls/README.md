# PostgreSQL Row-Level Security Experiment

## Overview

This experiment demonstrates PostgreSQL Row-Level Security (RLS) for multi-tenant data isolation. 

**Setup:** Single `customers` table with `bank_id` (tenant identifier) and `name` columns.

**Objective:** Prove that Tenant A cannot see, modify, or delete Tenant B's data using database-level security policies.

**Key Components:**
- Two database users: `tenant_a` (bank_id=1) and `tenant_b` (bank_id=2)
- RLS policies that filter rows based on `bank_id`
- Test data: 3 customers for Tenant A, 2 customers for Tenant B
- FastAPI app with JWT-based tenant authentication

## Setup

Install [uv](https://docs.astral.sh/uv/) and dependencies:
```bash
# Setup fastapi app (python)
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync

# Launch the database locally
docker compose up -d

# Run schema migrations
./init.sh
```

## Instructions

**Run Test Scripts**

```bash
./test-sql.sh
./test-api.sh
```
