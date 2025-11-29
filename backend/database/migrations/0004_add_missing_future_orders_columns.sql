-- Migration: add missing columns to `future_orders` safely
-- This migration uses IF NOT EXISTS where supported to avoid duplicate-column errors
-- It is safe to run multiple times.

ALTER TABLE `future_orders`
  ADD COLUMN IF NOT EXISTS `side` ENUM('long','short') NOT NULL DEFAULT 'long' AFTER `symbol`;

ALTER TABLE `future_orders`
  ADD COLUMN IF NOT EXISTS `entry_price` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `side`;

ALTER TABLE `future_orders`
  ADD COLUMN IF NOT EXISTS `position_size` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `entry_price`;

ALTER TABLE `future_orders`
  ADD COLUMN IF NOT EXISTS `margin` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `position_size`;

ALTER TABLE `future_orders`
  ADD COLUMN IF NOT EXISTS `exit_price` DECIMAL(28,8) DEFAULT NULL AFTER `close_ts`;

-- Note: If your TiDB version does not support "IF NOT EXISTS" for ADD COLUMN,
-- run the appropriate ALTER statements manually or let me provide adjusted SQL.
