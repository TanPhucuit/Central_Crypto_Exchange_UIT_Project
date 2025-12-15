<?php
require __DIR__ . '/vendor/autoload.php';
use App\Helpers\Database;

try {
    $db = Database::getConnection();
    $stmt = $db->query("DESCRIBE wallets");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($columns);
    
    // Also try the getByUserId method to see if it errors
    $walletModel = new \App\Models\Wallet();
    echo "\nTesting getByUserId(15):\n";
    try {
        $wallets = $walletModel->getByUserId(15);
        print_r($wallets);
    } catch (Exception $e) {
        echo "Error calling getByUserId: " . $e->getMessage() . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
