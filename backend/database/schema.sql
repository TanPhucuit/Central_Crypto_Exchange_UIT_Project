-- Crypto Exchange Database Schema (From TiDB Production)
-- Database: crypto_exchange_2

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('normal','merchant') NOT NULL DEFAULT 'normal',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='User (normal/merchant)';

-- Wallets table
CREATE TABLE IF NOT EXISTS `wallets` (
  `wallet_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` enum('fund','spot','future') NOT NULL,
  `balance` decimal(28,8) NOT NULL DEFAULT '0',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`wallet_id`),
  KEY `idx_wallet_user` (`user_id`,`type`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Mỗi user có nhiều ví: fund, spot, future';

-- Properties table (số dư crypto theo từng symbol trong wallet)
CREATE TABLE IF NOT EXISTS `properties` (
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `average_buy_price` decimal(28,8) NOT NULL DEFAULT '0',
  `unit_number` decimal(28,8) NOT NULL DEFAULT '0',
  PRIMARY KEY (`wallet_id`,`symbol`),
  CONSTRAINT `fk_property_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Số dư & giá vốn của từng symbol trong một wallet';

-- Bank Accounts table
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `account_number` varchar(34) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `account_balance` decimal(28,8) NOT NULL DEFAULT '0',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`account_number`),
  KEY `fk_bank_accounts_user` (`user_id`),
  CONSTRAINT `fk_bank_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='Liên kết 1..N từ User sang Bank_Account';

-- Account Transactions table (giao dịch ngân hàng nội bộ/P2P)
CREATE TABLE IF NOT EXISTS `account_transactions` (
  `transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_account_number` varchar(34) NOT NULL,
  `target_account_number` varchar(34) NOT NULL,
  `transaction_amount` decimal(28,8) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`transaction_id`),
  KEY `idx_tx_ts` (`ts`),
  KEY `idx_tx_src` (`source_account_number`),
  KEY `idx_tx_tgt` (`target_account_number`),
  CONSTRAINT `fk_tx_src` FOREIGN KEY (`source_account_number`) REFERENCES `bank_accounts` (`account_number`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tx_tgt` FOREIGN KEY (`target_account_number`) REFERENCES `bank_accounts` (`account_number`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Chuyển khoản ngân hàng nội bộ/ra-vào phục vụ P2P';

-- Spot Transactions table
CREATE TABLE IF NOT EXISTS `spot_transactions` (
  `spot_transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `type` enum('buy','sell') NOT NULL,
  `index_price` decimal(28,8) NOT NULL,
  `unit_numbers` decimal(28,8) NOT NULL,
  `amount` decimal(28,8) NOT NULL,
  `profit` decimal(28,8) DEFAULT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`spot_transaction_id`),
  KEY `idx_spot_wallet_ts` (`wallet_id`,`ts`),
  KEY `idx_spot_symbol_ts` (`symbol`,`ts`),
  KEY `fk_spot_property` (`wallet_id`,`symbol`),
  CONSTRAINT `fk_spot_property` FOREIGN KEY (`wallet_id`,`symbol`) REFERENCES `properties` (`wallet_id`,`symbol`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Giao dịch spot; ràng buộc tới tài sản (wallet_id, symbol)';

-- Future Orders table
CREATE TABLE IF NOT EXISTS `future_orders` (
  `future_order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `side` enum('long','short') NOT NULL DEFAULT 'long',
  `entry_price` decimal(28,8) NOT NULL,
  `position_size` decimal(28,8) NOT NULL,
  `margin` decimal(28,8) NOT NULL DEFAULT '0',
  `leverage` int(10) unsigned NOT NULL,
  `open_ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `close_ts` timestamp(6) NULL DEFAULT NULL,
  `exit_price` decimal(28,8) DEFAULT NULL,
  `profit` decimal(28,8) DEFAULT NULL,
  PRIMARY KEY (`future_order_id`),
  KEY `idx_future_wallet_ts` (`wallet_id`,`open_ts`),
  KEY `idx_future_symbol` (`symbol`),
  KEY `fk_future_property` (`wallet_id`,`symbol`),
  CONSTRAINT `fk_future_property` FOREIGN KEY (`wallet_id`,`symbol`) REFERENCES `properties` (`wallet_id`,`symbol`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Đơn/position futures gắn với (wallet_id, symbol)';

-- P2P Orders table
CREATE TABLE IF NOT EXISTS `p2p_orders` (
  `order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `merchant_id` bigint(20) unsigned DEFAULT NULL,
  `type` enum('buy','sell') NOT NULL,
  `unit_numbers` decimal(28,8) NOT NULL,
  `state` enum('open','matched','filled','cancelled') NOT NULL DEFAULT 'open',
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `transaction_id` bigint(20) unsigned DEFAULT NULL,
  PRIMARY KEY (`order_id`),
  KEY `idx_p2p_user_ts` (`user_id`,`ts`),
  KEY `idx_p2p_state` (`state`,`ts`),
  UNIQUE KEY `uk_p2p_tx` (`transaction_id`),
  KEY `fk_p2p_merchant` (`merchant_id`),
  CONSTRAINT `fk_p2p_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_p2p_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_p2p_tx` FOREIGN KEY (`transaction_id`) REFERENCES `account_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Đơn P2P (buy/sell), liên kết 1..1 với Transaction khi hoàn tất';

-- Crypto Transfers table (chuyển token giữa các ví)
CREATE TABLE IF NOT EXISTS `crypto_transfers` (
  `crypto_transfer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_wallet_id` bigint(20) unsigned NOT NULL,
  `target_wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `unit_numbers` decimal(28,8) NOT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`crypto_transfer_id`),
  KEY `idx_crypto_src` (`source_wallet_id`,`ts`),
  KEY `idx_crypto_tgt` (`target_wallet_id`,`ts`),
  CONSTRAINT `fk_crypto_src` FOREIGN KEY (`source_wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_crypto_tgt` FOREIGN KEY (`target_wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Chuyển token giữa các ví (không đổi sở hữu ngân hàng)';

-- Internal Transfers table (chuyển số dư nội bộ giữa các ví)
CREATE TABLE IF NOT EXISTS `internal_transfers` (
  `internal_transfer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_wallet_id` bigint(20) unsigned NOT NULL,
  `target_wallet_id` bigint(20) unsigned NOT NULL,
  `transfer_amount` decimal(28,8) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`internal_transfer_id`),
  KEY `idx_internal_src` (`source_wallet_id`,`ts`),
  KEY `idx_internal_tgt` (`target_wallet_id`,`ts`),
  CONSTRAINT `fk_internal_src` FOREIGN KEY (`source_wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_internal_tgt` FOREIGN KEY (`target_wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001 COMMENT='Chuyển số dư nội bộ giữa các ví của người dùng';

-- View: v_wallet_property_balance (view để tính tổng balance + properties)
-- Note: Views cannot be created via this script, must be created manually in TiDB
-- CREATE VIEW v_wallet_property_balance AS ...
