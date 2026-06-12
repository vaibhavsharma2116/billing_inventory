#!/bin/bash
echo "====================================="
echo "Fixing Database Permissions"
echo "====================================="

# Step 1: Fix permissions via SQL
echo "Running SQL commands..."
sudo -u postgres psql << 'EOF'
\c billing_inventory
GRANT ALL PRIVILEGES ON DATABASE billing_inventory TO billing_inventory;
GRANT ALL PRIVILEGES ON SCHEMA public TO billing_inventory;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO billing_inventory;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO billing_inventory;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO billing_inventory;
ALTER SCHEMA public OWNER TO billing_inventory;
\dt
\q
EOF

echo ""
echo "====================================="
echo "Testing Prisma Connection..."
echo "====================================="

# Step 2: Test Prisma
cd /var/www/billing_inventory/backend
npx prisma db pull

echo ""
echo "====================================="
echo "Restarting Backend Server..."
echo "====================================="

# Step 3: Restart backend
pm2 restart all

echo ""
echo "✅ Done! Try logging in now:"
echo "Email: superadmin@example.com"
echo "Password: superadmin123"

