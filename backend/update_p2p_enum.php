<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

try {
    $db = Database::getConnection();
    echo "Altering p2p_orders to support 'pending' state...\n";
    
    // Update Enum to include pending, completed and map old values
    // Old: open, matched, filled, cancelled
    // New (User Request): pending, completed, cancelled
    // Let's support all to be safe: pending, open, matched, filled, completed, cancelled
    
    $sql = "ALTER TABLE p2p_orders MODIFY COLUMN state ENUM('pending', 'open', 'matched', 'filled', 'completed', 'cancelled') NOT NULL DEFAULT 'pending'";
    $db->exec($sql);
    
    echo "p2p_orders state column updated.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
