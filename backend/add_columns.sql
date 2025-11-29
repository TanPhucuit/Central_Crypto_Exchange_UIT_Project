-- Add full_name and usdt_price columns to users table

ALTER TABLE users 
ADD COLUMN full_name VARCHAR(255) NULL AFTER username;

ALTER TABLE users 
ADD COLUMN usdt_price DECIMAL(28,8) NULL DEFAULT 25000.00 AFTER email;

-- Update existing merchants with default price
UPDATE users 
SET usdt_price = 25000.00 
WHERE role = 'merchant' AND usdt_price IS NULL;
