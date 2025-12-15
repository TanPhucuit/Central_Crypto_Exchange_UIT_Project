<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$pdo = Database::getConnection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Attempting to create future_orders...\n";

try {
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
    
    $pdo->exec($sql);
    echo "future_orders created!\n";
} catch (PDOException $e) {
    echo "Error creating future_orders: " . $e->getMessage() . "\n";
}

echo "Attempting to create spot_transactions...\n";
try {
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
    echo "spot_transactions created!\n";
} catch (PDOException $e) {
     echo "Error creating spot_transactions: " . $e->getMessage() . "\n";
}
