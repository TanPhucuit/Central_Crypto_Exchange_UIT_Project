<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$pdo = Database::getConnection();

echo "Starting tables reconstruction to match schema.sql and Codebase...\n";

try {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // 1. P2P Orders
    echo "Recreating p2p_orders...\n";
    $pdo->exec("DROP TABLE IF EXISTS p2p_orders");
    $sql = "CREATE TABLE p2p_orders (
        order_id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT(20) UNSIGNED NOT NULL,
        merchant_id BIGINT(20) UNSIGNED,
        type ENUM('buy', 'sell') NOT NULL,
        unit_numbers DECIMAL(28, 8) NOT NULL,
        state ENUM('open', 'matched', 'filled', 'cancelled') NOT NULL DEFAULT 'open',
        transaction_id BIGINT(20) UNSIGNED UNIQUE,
        ts TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_user_id (user_id),
        KEY idx_state (state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $pdo->exec($sql);
    echo "p2p_orders recreated.\n";

    // 2. Future Orders
    echo "Recreating future_orders...\n";
    $pdo->exec("DROP TABLE IF EXISTS future_orders");
    $sql = "CREATE TABLE future_orders (
        future_order_id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        wallet_id BIGINT(20) UNSIGNED NOT NULL,
        symbol VARCHAR(32) NOT NULL,
        side ENUM('long', 'short') NOT NULL DEFAULT 'long',
        leverage INT(10) UNSIGNED NOT NULL,
        open_ts TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        close_ts TIMESTAMP(6),
        profit DECIMAL(28, 8),
        entry_price DOUBLE,
        margin DOUBLE,
        position_size DOUBLE,
        KEY idx_wallet_id (wallet_id),
        KEY idx_symbol (symbol)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    // Added position_size as it is used in TradingController::openFuture
    $pdo->exec($sql);
    echo "future_orders recreated.\n";

    // 3. Spot Transactions
    echo "Recreating spot_transactions...\n";
    $pdo->exec("DROP TABLE IF EXISTS spot_transactions");
    $sql = "CREATE TABLE spot_transactions (
        spot_transaction_id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        wallet_id BIGINT(20) UNSIGNED NOT NULL,
        symbol VARCHAR(32) NOT NULL,
        type ENUM('buy', 'sell') NOT NULL,
        index_price DECIMAL(28, 8) NOT NULL,
        unit_numbers DECIMAL(28, 8) NOT NULL,
        amount DECIMAL(28, 8) NOT NULL,
        profit DECIMAL(28, 8),
        ts TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_wallet_id (wallet_id),
        KEY idx_symbol (symbol)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
    $pdo->exec($sql);
    echo "spot_transactions recreated.\n";

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "All tables reconstructed successfully.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
