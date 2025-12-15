-- Add type column to p2p_orders table
USE `crypto_exchange_2`;

-- Check if column exists before adding
SET @dbname = 'crypto_exchange_2';
SET @tablename = 'p2p_orders';
SET @columnname = 'type';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN `type` ENUM('buy', 'sell') NOT NULL DEFAULT 'buy' AFTER `merchant_id`;")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing orders to have a type (default to 'buy' if not set)
UPDATE p2p_orders SET type = 'buy' WHERE type IS NULL OR type = '';

SELECT 'Column type added successfully to p2p_orders table' as Status;
