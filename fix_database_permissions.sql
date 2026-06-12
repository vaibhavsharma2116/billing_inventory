-- ==========================================
-- Complete Database Permission Fix Script
-- Run this as PostgreSQL superuser (postgres)
-- ==========================================

-- Connect to the database
\c billing_inventory

-- 1. Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE billing_inventory TO billing_inventory;

-- 2. Grant all privileges on schema public
GRANT ALL PRIVILEGES ON SCHEMA public TO billing_inventory;

-- 3. Grant all privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO billing_inventory;

-- 4. Grant all privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO billing_inventory;

-- 5. Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO billing_inventory;

-- 6. Make sure the user owns the schema
ALTER SCHEMA public OWNER TO billing_inventory;

-- 7. Verify the permissions
SELECT 
    table_catalog, 
    table_schema, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = 'billing_inventory';

-- ==========================================
-- If that doesn't work, try this alternative:
-- ==========================================
/*
-- Drop and recreate the database (WARNING: DELETES ALL DATA!)
-- Only use this as a last resort

-- Connect to postgres database first
\c postgres

-- Terminate all connections to billing_inventory
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'billing_inventory';

-- Drop and recreate
DROP DATABASE IF EXISTS billing_inventory;
CREATE DATABASE billing_inventory OWNER billing_inventory;

-- Then run migrations from backend:
-- cd /var/www/billing_inventory/backend
-- npx prisma migrate deploy
*/

-- ==========================================
-- Quick verification
-- ==========================================
\dt
SELECT current_user;
SELECT current_database();

