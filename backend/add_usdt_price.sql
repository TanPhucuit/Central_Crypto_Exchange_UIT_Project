-- Add usdt_price column to users table for merchants
ALTER TABLE users 
ADD COLUMN usdt_price DECIMAL(28,8) DEFAULT 24500.00 COMMENT 'Giá USDT của merchant (VND)';

-- Update existing merchants with default price
UPDATE users 
SET usdt_price = 24500.00 
WHERE role = 'merchant';
