-- ==========================================
-- Insert Super Admin User - SQL Query
-- ==========================================

-- IMPORTANT: First, make sure you have the Role enum created
-- If not, run this first:
-- CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CSA', 'USER');

-- ==========================================
-- Option 1: Using existing Node.js script (RECOMMENDED)
-- ==========================================
-- Run this from backend directory:
-- cd c:\Users\admin\Desktop\billing_inventory\backend
-- node create-superadmin.js
--
-- This will automatically:
-- - Generate a proper bcrypt hash
-- - Insert the super admin
-- - Check if it already exists

-- ==========================================
-- Option 2: Direct SQL Insert (Manual)
-- ==========================================
-- Note: You need to generate a valid bcrypt hash for your password
-- You can use online tools or Node.js to generate it

-- Example (replace the password hash with your own):
/*
INSERT INTO "User" (
    "id",
    "name",
    "email",
    "password",
    "role",
    "logo",
    "distributorId",
    "adminId",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid()::text,
    'Super Admin',
    'superadmin@example.com',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Replace this hash!
    'SUPER_ADMIN'::"Role",
    NULL,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
*/

-- ==========================================
-- How to generate a bcrypt hash:
-- ==========================================
-- Create a file generate-hash.js with this code:
/*
const bcrypt = require('bcrypt');
async function generate() {
    const hash = await bcrypt.hash('your_password', 10);
    console.log('Hash:', hash);
}
generate();
*/
-- Then run: node generate-hash.js

