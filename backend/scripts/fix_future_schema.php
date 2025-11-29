<?php
require __DIR__ . '/../vendor/autoload.php';

use App\\Helpers\\Database;

echo "Checking future_orders schema...\n";
$pdo = Database::getConnection();

$required = [
    'entry_price' => "DECIMAL(28,8) NOT NULL DEFAULT 0",
    'position_size' => "DECIMAL(28,8) NOT NULL DEFAULT 0",
    'margin' => "DECIMAL(28,8) NOT NULL DEFAULT 0",
    'exit_price' => "DECIMAL(28,8) DEFAULT NULL",
];

try {
    $stmt = $pdo->prepare("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'future_orders'");
    $stmt->execute();
    $cols = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Throwable $e) {
    echo "Failed to query INFORMATION_SCHEMA: " . $e->getMessage() . "\n";
    exit(1);
}

foreach ($required as $col => $definition) {
    if (!in_array($col, $cols, true)) {
        $sql = "ALTER TABLE `future_orders` ADD COLUMN `{$col}` {$definition};";
        echo "Adding column {$col}... ";
        try {
            $pdo->exec($sql);
            echo "OK\n";
        } catch (Throwable $e) {
            echo "FAILED: " . $e->getMessage() . "\n";
        }
    } else {
        echo "Column {$col} already exists, skipping.\n";
    }
}

echo "Done.\n";
