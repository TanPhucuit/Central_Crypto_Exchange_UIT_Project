<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$db = Database::getConnection();
$stmt = $db->prepare('SELECT * FROM future_orders WHERE close_ts IS NULL ORDER BY open_ts DESC');
$stmt->execute();
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== OPEN ORDERS (close_ts IS NULL) ===\n\n";
echo "Total: " . count($orders) . "\n\n";

foreach($orders as $o) {
    echo "Order ID: {$o['future_order_id']}\n";
    echo "  Symbol: {$o['symbol']}\n";
    echo "  Side: {$o['side']}\n";
    echo "  Entry Price: {$o['entry_price']}\n";
    echo "  Margin: {$o['margin']}\n";
    echo "  Leverage: {$o['leverage']}x\n";
    echo "  Position Size: {$o['position_size']}\n";
    echo "  Opened: {$o['open_ts']}\n";
    echo "  ---\n";
}
