-- Add 'banked' status to p2p_orders for payment transferred state
-- banked = payment has been transferred to bank, waiting for confirmation

USE `crypto_exchange_2`;

ALTER TABLE `p2p_orders` 
MODIFY COLUMN `status` ENUM('pending','completed','cancelled','banked') NOT NULL DEFAULT 'pending';
