<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (\Exception $e) {}

try {
    $pdo = Database::getConnection();
    echo "Database Connection: OK\n";
    
    $tables = ['users', 'wallets', 'bank_accounts', 'p2p_orders', 'properties', 'transactions'];
    
    foreach ($tables as $table) {
        echo "\n\n--- Table: $table ---\n";
        try {
            $stmt = $pdo->query("DESCRIBE $table");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($columns as $col) {
                echo $col['Field'] . " | " . $col['Type'] . "\n";
            }
        } catch (Exception $e) {
            echo "Error describing $table: " . $e->getMessage();
        }
    }
} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage();
}
