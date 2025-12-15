-- 1. Thiết lập môi trường
CREATE DATABASE IF NOT EXISTS `crypto_exchange_2`;
USE `crypto_exchange_2`;

-- Tắt kiểm tra khóa ngoại để tránh lỗi khi xóa/tạo lại bảng
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- 2. TẠO CÁC BẢNG CỐT LÕI (Users, Wallets, Banks)
-- ==========================================

-- Bảng Users
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('normal','merchant') NOT NULL DEFAULT 'normal',
  `fullname` text DEFAULT NULL,
  `usdt_price` double DEFAULT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Migrations
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Wallets
DROP TABLE IF EXISTS `wallets`;
CREATE TABLE `wallets` (
  `wallet_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `type` varchar(20) DEFAULT NULL,
  `balance` decimal(28,8) DEFAULT NULL,
  PRIMARY KEY (`wallet_id`),
  KEY `fk_wallet_user_idx` (`user_id`),
  CONSTRAINT `fk_wallet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Bank Accounts
DROP TABLE IF EXISTS `bank_accounts`;
CREATE TABLE `bank_accounts` (
  `account_number` varchar(34) NOT NULL,
  `bank_name` varchar(100) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `account_balance` decimal(28,8) NOT NULL DEFAULT '0.00000000',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`account_number`),
  KEY `fk_bank_accounts_user_idx` (`user_id`),
  CONSTRAINT `fk_bank_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 3. TẠO BẢNG PROPERTIES MỚI (Thay thế View cũ)
-- ==========================================

-- Bảng này trước đây là v_wallet_property_balance
-- Giờ đóng vai trò là bảng chính lưu trữ số dư tài sản (Portfolio)
DROP TABLE IF EXISTS `properties`;
CREATE TABLE `properties` (
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `unit_number` decimal(28,8) DEFAULT '0.00000000',    -- Số lượng coin sở hữu
  `average_buy_price` decimal(28,8) DEFAULT '0.00000000',
  `cost_basis` decimal(56,16) DEFAULT '0.00000000',
  
  -- Thiết lập Khóa Chính là cặp (Ví + Symbol) để đảm bảo mỗi ví chỉ có 1 dòng cho 1 loại coin
  PRIMARY KEY (`wallet_id`, `symbol`),
  
  -- Khóa ngoại trỏ về Wallet cha
  CONSTRAINT `fk_properties_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`wallet_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. TẠO CÁC BẢNG GIAO DỊCH (Transaction Tables)
-- ==========================================

-- Bảng Account Transactions
DROP TABLE IF EXISTS `account_transactions`;
CREATE TABLE `account_transactions` (
  `transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_account_number` varchar(34) NOT NULL,
  `target_account_number` varchar(34) NOT NULL,
  `transaction_amount` decimal(28,8) NOT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`transaction_id`),
  KEY `fk_tx_src_idx` (`source_account_number`),
  KEY `fk_tx_tgt_idx` (`target_account_number`),
  CONSTRAINT `fk_tx_src` FOREIGN KEY (`source_account_number`) REFERENCES `bank_accounts` (`account_number`),
  CONSTRAINT `fk_tx_tgt` FOREIGN KEY (`target_account_number`) REFERENCES `bank_accounts` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng P2P Orders
DROP TABLE IF EXISTS `p2p_orders`;
CREATE TABLE `p2p_orders` (
  `p2p_order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `merchant_id` bigint(20) unsigned NOT NULL,
  `transaction_id` bigint(20) unsigned DEFAULT NULL,
  `amount` decimal(28,8) NOT NULL,
  `price` decimal(28,8) NOT NULL,
  `status` enum('pending','completed','cancelled','disputed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`p2p_order_id`),
  KEY `fk_p2p_user_idx` (`user_id`),
  KEY `fk_p2p_merchant_idx` (`merchant_id`),
  KEY `fk_p2p_tx_idx` (`transaction_id`),
  CONSTRAINT `fk_p2p_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_p2p_merchant` FOREIGN KEY (`merchant_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_p2p_tx` FOREIGN KEY (`transaction_id`) REFERENCES `account_transactions` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Spot Transactions
-- Tham chiếu trực tiếp đến bảng properties mới
DROP TABLE IF EXISTS `spot_transactions`;
CREATE TABLE `spot_transactions` (
  `spot_transaction_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint(20) unsigned NOT NULL,
  `symbol` varchar(32) NOT NULL,
  `amount` decimal(28,8) NOT NULL,
  `price` decimal(28,8) NOT NULL,
  `side` enum('buy','sell') NOT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`spot_transaction_id`),
  KEY `fk_spot_property_idx` (`wallet_id`, `symbol`),
  
  -- KHÓA NGOẠI QUAN TRỌNG:
  -- Tham chiếu đến cặp khóa chính (wallet_id, symbol) của bảng properties mới
  CONSTRAINT `fk_spot_property_new` FOREIGN KEY (`wallet_id`, `symbol`) 
  REFERENCES `properties` (`wallet_id`, `symbol`) 
  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Crypto Transfers
DROP TABLE IF EXISTS `crypto_transfers`;
CREATE TABLE `crypto_transfers` (
  `crypto_transfer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_wallet_id` bigint(20) unsigned NOT NULL,
  `target_wallet_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(28,8) NOT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`crypto_transfer_id`),
  KEY `fk_crypto_src_idx` (`source_wallet_id`),
  KEY `fk_crypto_tgt_idx` (`target_wallet_id`),
  CONSTRAINT `fk_crypto_src` FOREIGN KEY (`source_wallet_id`) REFERENCES `wallets` (`wallet_id`),
  CONSTRAINT `fk_crypto_tgt` FOREIGN KEY (`target_wallet_id`) REFERENCES `wallets` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Internal Transfers
DROP TABLE IF EXISTS `internal_transfers`;
CREATE TABLE `internal_transfers` (
  `internal_transfer_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_wallet_id` bigint(20) unsigned NOT NULL,
  `target_wallet_id` bigint(20) unsigned NOT NULL,
  `amount` decimal(28,8) NOT NULL,
  `ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`internal_transfer_id`),
  KEY `fk_internal_src_idx` (`source_wallet_id`),
  KEY `fk_internal_tgt_idx` (`target_wallet_id`),
  CONSTRAINT `fk_internal_src` FOREIGN KEY (`source_wallet_id`) REFERENCES `wallets` (`wallet_id`),
  CONSTRAINT `fk_internal_tgt` FOREIGN KEY (`target_wallet_id`) REFERENCES `wallets` (`wallet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bảng Future Orders
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

-- Bật lại kiểm tra khóa ngoại
SET FOREIGN_KEY_CHECKS = 1;
