<?php
/**
 * Debug script to check future orders in database
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

try {
    $db = Database::getConnection();
    
    echo "=== CHECKING FUTURE ORDERS ===\n\n";
    
    // Get all future orders
    $stmt = $db->prepare("SELECT * FROM future_orders ORDER BY open_ts DESC LIMIT 20");
    $stmt->execute();
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total future orders: " . count($orders) . "\n\n";
    
    if (empty($orders)) {
        echo "No future orders found in database.\n";
    } else {
        foreach ($orders as $order) {
            echo "Order ID: {$order['future_order_id']}\n";
            echo "  Wallet ID: {$order['wallet_id']}\n";
            echo "  Symbol: {$order['symbol']}\n";
            echo "  Side: {$order['side']}\n";
            echo "  Entry Price: {$order['entry_price']}\n";
            echo "  Position Size: {$order['position_size']}\n";
            echo "  Margin: {$order['margin']}\n";
            echo "  Leverage: {$order['leverage']}\n";
            echo "  Open Time: {$order['open_ts']}\n";
            echo "  Close Time: " . ($order['close_ts'] ?? 'NULL (OPEN)') . "\n";
            echo "  Exit Price: " . ($order['exit_price'] ?? 'NULL') . "\n";
            echo "  Profit: " . ($order['profit'] ?? 'NULL') . "\n";
            echo "  ---\n";
        }
    }
    
    // Check open orders
    echo "\n=== OPEN ORDERS (close_ts IS NULL) ===\n\n";
    $stmt = $db->prepare("SELECT * FROM future_orders WHERE close_ts IS NULL ORDER BY open_ts DESC");
    $stmt->execute();
    $openOrders = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total open orders: " . count($openOrders) . "\n\n";
    
    if (!empty($openOrders)) {
        foreach ($openOrders as $order) {
            echo "Order ID: {$order['future_order_id']} | Symbol: {$order['symbol']} | Side: {$order['side']} | Margin: {$order['margin']} | Leverage: {$order['leverage']}x\n";
        }
    }
    
    // Check wallets
    echo "\n=== FUTURE WALLETS ===\n\n";
    $stmt = $db->prepare("SELECT * FROM wallets WHERE type = 'future'");
    $stmt->execute();
    $wallets = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Total future wallets: " . count($wallets) . "\n\n";
    
    foreach ($wallets as $wallet) {
        echo "Wallet ID: {$wallet['wallet_id']} | User ID: {$wallet['user_id']} | Balance: {$wallet['balance']}\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
