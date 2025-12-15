<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

try {
    $db = Database::getConnection();
    
    echo "--- future_orders schema ---\n";
    $stmt = $db->query("DESCRIBE future_orders");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($columns as $col) {
        echo $col['Field'] . " | " . $col['Type'] . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
