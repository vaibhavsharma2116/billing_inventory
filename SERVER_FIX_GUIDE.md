# STEP-BY-STEP SERVER FIX GUIDE

## On your server, run these commands:

### Step 1: Connect to PostgreSQL
```bash
# As root or postgres user
sudo -u postgres psql
```

### Step 2: Run the permission fix script
Once in psql, you can either:

**Option A: Copy and paste the SQL from fix_database_permissions.sql**

OR

**Option B: Run these commands one by one:**
```sql
\c billing_inventory
GRANT ALL PRIVILEGES ON DATABASE billing_inventory TO billing_inventory;
GRANT ALL PRIVILEGES ON SCHEMA public TO billing_inventory;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO billing_inventory;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO billing_inventory;
ALTER SCHEMA public OWNER TO billing_inventory;
\q
```

### Step 3: Restart your backend server
```bash
# Using pm2 (if that's what you're using)
pm2 restart all

# Or restart however you normally do
```

### Step 4: Verify from backend directory
```bash
cd /var/www/billing_inventory/backend

# Test database connection
npx prisma db pull

# Or try running the check script
node check-db.js
```

### Step 5: Try to login again
- Email: superadmin@example.com
- Password: superadmin123

## Still having issues?
Try these commands:

```bash
# Check if tables exist
sudo -u postgres psql -d billing_inventory -c "\dt"

# Check current permissions
sudo -u postgres psql -d billing_inventory -c "\dp"

# Re-run migrations
cd /var/www/billing_inventory/backend
npx prisma migrate reset  # WARNING: Deletes all data!
npx prisma migrate deploy
node create-superadmin.js
```

