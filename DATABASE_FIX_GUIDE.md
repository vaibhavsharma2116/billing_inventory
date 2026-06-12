# Database Permission Fix Guide

## Error Explanation
The error says: "User `billing_inventory` was denied access on the database `billing_inventory.public`"

## Solutions

### Option 1: Grant Database Permissions (PostgreSQL)
Run these SQL commands on your PostgreSQL server:

```sql
-- Connect to PostgreSQL as superuser (postgres)
-- psql -U postgres

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON DATABASE billing_inventory TO billing_inventory;

-- Grant all privileges on the schema
GRANT ALL PRIVILEGES ON SCHEMA public TO billing_inventory;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO billing_inventory;

-- Grant all privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO billing_inventory;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO billing_inventory;
```

### Option 2: Check Database Connection
Make sure your `.env` file in the backend has the correct DATABASE_URL:

```env
DATABASE_URL="postgresql://billing_inventory:password@localhost:5432/billing_inventory?schema=public"
```

### Option 3: Re-run Prisma Migration
From your backend directory:

```bash
cd /var/www/billing_inventory/backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify the database
npx prisma db push
```

### Option 4: Quick Test
Test if you can connect to the database:

```bash
cd /var/www/billing_inventory/backend

# Open Prisma Studio to test connection
npx prisma studio
```

## If All Else Fails
You can also recreate the database user with proper permissions:

```sql
-- Drop existing user if needed
DROP USER IF EXISTS billing_inventory;

-- Create new user
CREATE USER billing_inventory WITH PASSWORD 'your_secure_password';

-- Create database
DROP DATABASE IF EXISTS billing_inventory;
CREATE DATABASE billing_inventory OWNER billing_inventory;

-- Connect to the database
\c billing_inventory

-- Then run the migrations
```

## Verify the Fix
After applying permissions, restart your backend server and try logging in again with:
- Email: superadmin@example.com
- Password: superadmin123

