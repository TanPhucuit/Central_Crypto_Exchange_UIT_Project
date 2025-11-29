-- Migration: add missing columns to future_orders to match application expectations
-- Adds: side, entry_price, position_size, margin, exit_price
-- Run with the project's migration runner or execute directly in your DB client.

ALTER TABLE `future_orders`
  ADD COLUMN `side` ENUM('long','short') NOT NULL DEFAULT 'long' AFTER `symbol`,
  ADD COLUMN `entry_price` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `side`,
  ADD COLUMN `position_size` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `entry_price`,
  ADD COLUMN `margin` DECIMAL(28,8) NOT NULL DEFAULT 0 AFTER `position_size`,
  ADD COLUMN `exit_price` DECIMAL(28,8) DEFAULT NULL AFTER `close_ts`;

-- Note: `leverage`, `open_ts`, `close_ts`, `profit` are expected to already exist in this schema.
