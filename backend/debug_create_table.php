<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (\Exception $e) {}

$pdo = Database::getConnection();

$tables = ['wallets', 'transactions', 'properties'];
foreach ($tables as $t) {
    try {
        $stmt = $pdo->query("SHOW CREATE TABLE $t");
        $row = $stmt->fetch();
        echo "Table: $t\n";
        echo $row[1] . "\n\n";
    } catch (\Exception $e) {
        echo "Table $t not found or error: " . $e->getMessage() . "\n";
    }
}
