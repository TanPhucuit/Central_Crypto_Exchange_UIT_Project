-- Migration: Fix future_orders schema to match application code
-- This migration updates the future_orders table to include all necessary columns
-- for futures trading functionality

USE `crypto_exchange_2`;

-- Drop existing future_orders table and recreate with correct schema
DROP TABLE IF EXISTS `future_orders`;

CREATE TABLE `future_orders` (
  `future_order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(20) NOT NULL,
  `side` enum('long','short') NOT NULL DEFAULT 'long',
  `entry_price` decimal(28,8) NOT NULL DEFAULT 0,
  `exit_price` decimal(28,8) DEFAULT NULL,
  `position_size` decimal(28,8) NOT NULL DEFAULT 0,
  `margin` decimal(28,8) NOT NULL DEFAULT 0,
  `leverage` int(11) NOT NULL DEFAULT 1,
  `profit` decimal(28,8) DEFAULT NULL,
  `open_ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `close_ts` timestamp(6) NULL DEFAULT NULL,
  PRIMARY KEY (`future_order_id`),
  KEY `idx_wallet_id` (`wallet_id`),
  KEY `idx_symbol` (`symbol`),
  KEY `idx_close_ts` (`close_ts`),
  CONSTRAINT `fk_future_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
