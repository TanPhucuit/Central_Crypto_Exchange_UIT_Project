<?php
$host = '127.0.0.1';
$db   = 'crypto_exchange_2';
$user = 'root';
$pass = '123456';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    echo "Creating future_orders table for $db...\n";
    
    $sql = "CREATE TABLE IF NOT EXISTS `future_orders` (
      `future_order_id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
      `wallet_id` bigint(20) unsigned NOT NULL,
      `symbol` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
      `side` enum('long','short') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'long',
      `type` enum('market','limit') COLLATE utf8mb4_unicode_ci DEFAULT 'market',
      `leverage` int(10) unsigned NOT NULL,
      `entry_price` decimal(28,8) NOT NULL DEFAULT '0.00000000',
      `exit_price` decimal(28,8) DEFAULT NULL,
      `position_size` decimal(28,8) NOT NULL DEFAULT '0.00000000',
      `margin` decimal(28,8) NOT NULL DEFAULT '0.00000000',
      `liquidation_price` decimal(28,8) DEFAULT NULL,
      `profit` decimal(28,8) DEFAULT NULL,
      `status` enum('open','closed','liquidated','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
      `open_ts` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      `close_ts` timestamp(6) NULL DEFAULT NULL,
      `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (`future_order_id`),
      KEY `idx_wallet_id` (`wallet_id`),
      KEY `idx_symbol` (`symbol`),
      KEY `idx_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    
    $pdo->exec($sql);
    echo "Table future_orders checked/created in $db.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
