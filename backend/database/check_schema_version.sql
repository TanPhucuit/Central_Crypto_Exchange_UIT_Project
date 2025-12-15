-- Run this query in your database client (TiDB/MySQL) to check schema version

-- Check Users table structure
DESCRIBE users;

-- Check Wallets table structure  
DESCRIBE wallets;

-- Check Properties table (should exist in new schema)
DESCRIBE properties;

-- Check if using old or new schema
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'user_id'
        ) THEN 'NEW SCHEMA (user_id exists)'
        ELSE 'OLD SCHEMA (using id instead)'
    END AS users_schema_version,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'wallets' 
            AND COLUMN_NAME = 'wallet_id'
        ) THEN 'NEW SCHEMA (wallet_id exists)'
        ELSE 'OLD SCHEMA (using id instead)'
    END AS wallets_schema_version,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'wallets' 
            AND COLUMN_NAME = 'type'
        ) THEN 'NEW SCHEMA (type column exists)'
        ELSE 'OLD SCHEMA (using currency instead)'
    END AS wallets_type_column,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'properties'
        ) THEN 'NEW SCHEMA (properties table exists)'
        ELSE 'OLD SCHEMA (no properties table)'
    END AS properties_table_check;
