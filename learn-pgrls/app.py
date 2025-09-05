#!/usr/bin/env python3

import jwt
import psycopg2
from fastapi import FastAPI, HTTPException, Depends, Header
from typing import List, Dict

app = FastAPI(title="Multi-tenant RLS Demo API")

# Hardcoded JWT tokens for demo purposes
DEMO_TOKENS = {
    "tenant_a_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnRfaWQiOjF9.4f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f",
    "tenant_b_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnRfaWQiOjJ9.8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f8f"
}

# Generate hardcoded tokens for demo
SECRET = "demo_secret"
TENANT_A_TOKEN = jwt.encode({"tenant_id": 1}, SECRET, algorithm="HS256")
TENANT_B_TOKEN = jwt.encode({"tenant_id": 2}, SECRET, algorithm="HS256")

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "multitenant_db"
}

def get_tenant_from_token(authorization: str = Header(None)) -> int:
    """Extract tenant_id from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return payload["tenant_id"]
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_db_connection(tenant_id: int):
    """Get database connection with appropriate tenant user"""
    if tenant_id == 1:
        user, password = "tenant_a", "password_a"
    elif tenant_id == 2:
        user, password = "tenant_b", "password_b"
    else:
        raise HTTPException(status_code=403, detail="Invalid tenant")
    
    try:
        return psycopg2.connect(
            user=user,
            password=password,
            **DB_CONFIG
        )
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {e}")

@app.get("/")
def root():
    return {
        "message": "Multi-tenant RLS Demo API",
        "demo_tokens": {
            "tenant_a": TENANT_A_TOKEN,
            "tenant_b": TENANT_B_TOKEN
        },
        "usage": "Add 'Authorization: Bearer <token>' header to requests"
    }

@app.get("/customers")
def get_customers(tenant_id: int = Depends(get_tenant_from_token)) -> List[Dict]:
    """Get all customers for the authenticated tenant"""
    with get_db_connection(tenant_id) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT bank_id, name FROM customers ORDER BY name")
            rows = cur.fetchall()
            return [{"bank_id": row[0], "name": row[1]} for row in rows]

@app.post("/customers")
def create_customer(
    customer: Dict[str, str], 
    tenant_id: int = Depends(get_tenant_from_token)
) -> Dict:
    """Create a new customer for the authenticated tenant"""
    name = customer.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    with get_db_connection(tenant_id) as conn:
        with conn.cursor() as cur:
            try:
                cur.execute(
                    "INSERT INTO customers (bank_id, name) VALUES (%s, %s)",
                    (tenant_id, name)
                )
                conn.commit()
                return {"bank_id": tenant_id, "name": name, "status": "created"}
            except psycopg2.Error as e:
                raise HTTPException(status_code=400, detail=f"Database error: {e}")

@app.put("/customers/{customer_name}")
def update_customer(
    customer_name: str,
    customer: Dict[str, str],
    tenant_id: int = Depends(get_tenant_from_token)
) -> Dict:
    """Update a customer name for the authenticated tenant"""
    new_name = customer.get("name")
    if not new_name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    with get_db_connection(tenant_id) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE customers SET name = %s WHERE name = %s",
                (new_name, customer_name)
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Customer not found")
            conn.commit()
            return {"old_name": customer_name, "new_name": new_name, "status": "updated"}

@app.delete("/customers/{customer_name}")
def delete_customer(
    customer_name: str,
    tenant_id: int = Depends(get_tenant_from_token)
) -> Dict:
    """Delete a customer for the authenticated tenant"""
    with get_db_connection(tenant_id) as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM customers WHERE name = %s", (customer_name,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Customer not found")
            conn.commit()
            return {"name": customer_name, "status": "deleted"}

if __name__ == "__main__":
    import uvicorn
    print(f"Tenant A token: {TENANT_A_TOKEN}")
    print(f"Tenant B token: {TENANT_B_TOKEN}")
    uvicorn.run(app, host="0.0.0.0", port=8000)