<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Helpers\Database;

echo "Checking properties table in TiDB\n";
echo "=================================\n\n";

try {
    $db = Database::getConnection();
    
    // Get all properties
    $stmt = $db->prepare("
        SELECT p.*, w.user_id, w.type 
        FROM properties p
        JOIN wallets w ON p.wallet_id = w.wallet_id
        WHERE p.symbol = 'USDT' AND w.type = 'spot'
        ORDER BY w.user_id DESC
        LIMIT 20
    ");
    $stmt->execute();
    $properties = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($properties) . " USDT properties in spot wallets:\n\n";
    
    foreach ($properties as $prop) {
        echo sprintf(
            "User: %d | Wallet: %d | USDT: %s\n",
            $prop['user_id'],
            $prop['wallet_id'],
            $prop['unit_number']
        );
    }
    
    echo "\n\nNow checking recent merchants (956130, 956131, 956132):\n";
    echo "=======================================================\n";
    
    $userIds = [956130, 956131, 956132];
    
    foreach ($userIds as $userId) {
        echo "\nUser ID: $userId\n";
        
        // Get spot wallet
        $stmt = $db->prepare("SELECT * FROM wallets WHERE user_id = ? AND type = 'spot' LIMIT 1");
        $stmt->execute([$userId]);
        $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($wallet) {
            echo "  Spot wallet: {$wallet['wallet_id']}\n";
            
            // Get USDT property
            $stmt = $db->prepare("SELECT * FROM properties WHERE wallet_id = ? AND symbol = 'USDT'");
            $stmt->execute([$wallet['wallet_id']]);
            $property = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($property) {
                echo "  USDT: {$property['unit_number']}\n";
            } else {
                echo "  ERROR: No USDT property found!\n";
                
                // Try to create it now
                echo "  Attempting to create USDT property...\n";
                $stmt = $db->prepare("
                    INSERT INTO properties (wallet_id, symbol, average_buy_price, unit_number)
                    VALUES (?, 'USDT', 0, 10000)
                ");
                if ($stmt->execute([$wallet['wallet_id']])) {
                    echo "  SUCCESS: Created 10,000 USDT\n";
                } else {
                    echo "  FAILED: " . print_r($stmt->errorInfo(), true) . "\n";
                }
            }
        } else {
            echo "  ERROR: No spot wallet found!\n";
        }
    }
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
