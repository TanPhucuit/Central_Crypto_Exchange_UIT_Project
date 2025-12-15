<?php
require_once __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

$db = Database::getConnection();
$stmt = $db->query('SELECT * FROM future_orders ORDER BY future_order_id');
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== ALL FUTURE ORDERS ===\n\n";
echo "Total: " . count($orders) . "\n\n";

foreach($orders as $r) {
    echo "ID: {$r['future_order_id']} | {$r['symbol']} | {$r['side']} | Margin: {$r['margin']} | Leverage: {$r['leverage']}x\n";
    echo "  Open: {$r['open_ts']}\n";
    echo "  Close: " . ($r['close_ts'] ?? 'NULL (STILL OPEN)') . "\n";
    echo "  Exit Price: " . ($r['exit_price'] ?? 'NULL') . "\n";
    echo "  Profit: " . ($r['profit'] ?? 'NULL') . "\n";
    echo "  ---\n";
}
