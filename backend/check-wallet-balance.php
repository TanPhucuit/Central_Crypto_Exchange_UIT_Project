<?php
require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

// Get database connection
$db = Database::getConnection();

// Check wallets table
echo "=== WALLETS TABLE ===\n";
$stmt = $db->query("SELECT * FROM wallets ORDER BY wallet_id");
$wallets = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($wallets as $wallet) {
    echo sprintf(
        "ID: %d | User: %d | Type: %s | Balance: %s\n",
        $wallet['wallet_id'],
        $wallet['user_id'],
        $wallet['type'] ?? 'NULL',
        $wallet['balance']
    );
}

echo "\n=== OPEN FUTURE ORDERS ===\n";
$stmt = $db->query("SELECT future_order_id, wallet_id, symbol, side, margin, entry_price, position_size, leverage FROM future_orders WHERE close_ts IS NULL ORDER BY future_order_id");
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($orders)) {
    echo "No open positions\n";
} else {
    foreach ($orders as $order) {
        echo sprintf(
            "Order #%d | Wallet: %d | %s %s | Margin: %s | Entry: %s | Size: %s | Leverage: %sx\n",
            $order['future_order_id'],
            $order['wallet_id'],
            strtoupper($order['side']),
            $order['symbol'],
            $order['margin'],
            $order['entry_price'],
            $order['position_size'],
            $order['leverage']
        );
    }
}

// Calculate total margin locked
echo "\n=== TOTAL MARGIN LOCKED ===\n";
$stmt = $db->query("SELECT wallet_id, SUM(margin) as total_margin FROM future_orders WHERE close_ts IS NULL GROUP BY wallet_id");
$margins = $stmt->fetchAll(PDO::FETCH_ASSOC);
if (empty($margins)) {
    echo "No margin locked\n";
} else {
    foreach ($margins as $m) {
        echo sprintf("Wallet %d: %s USDT locked\n", $m['wallet_id'], $m['total_margin']);
    }
}

echo "\n=== AVAILABLE BALANCE (Balance - Locked Margin) ===\n";
foreach ($wallets as $wallet) {
    if ($wallet['type'] === 'future') {
        $walletId = $wallet['wallet_id'];
        $balance = (float)$wallet['balance'];
        
        // Find locked margin
        $locked = 0;
        foreach ($margins as $m) {
            if ($m['wallet_id'] == $walletId) {
                $locked = (float)$m['total_margin'];
                break;
            }
        }
        
        $available = $balance - $locked;
        echo sprintf(
            "Future Wallet %d: Balance=%s | Locked=%s | Available=%s USDT\n",
            $walletId,
            $balance,
            $locked,
            $available
        );
    }
}
