<?php
/**
 * Test script to simulate opening a future position
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;
use App\Models\Wallet;
use App\Models\FutureOrder;
use App\Models\Property;

try {
    echo "=== TESTING FUTURE ORDER CREATION ===\n\n";
    
    $db = Database::getConnection();
    
    // Get a future wallet
    $stmt = $db->prepare("SELECT * FROM wallets WHERE type = 'future' LIMIT 1");
    $stmt->execute();
    $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$wallet) {
        echo "No future wallet found. Please create one first.\n";
        exit(1);
    }
    
    echo "Using wallet:\n";
    echo "  Wallet ID: {$wallet['wallet_id']}\n";
    echo "  User ID: {$wallet['user_id']}\n";
    echo "  Balance: {$wallet['balance']}\n\n";
    
    // Test data
    $testData = [
        'wallet_id' => $wallet['wallet_id'],
        'symbol' => 'BTC',
        'side' => 'long',
        'entry_price' => 50000.00,
        'margin' => 100.00,
        'leverage' => 2,
        'position_size' => 200.00, // margin * leverage
    ];
    
    echo "Test order data:\n";
    print_r($testData);
    echo "\n";
    
    // Check if property exists
    $propertyModel = new Property();
    $prop = $propertyModel->getByWalletAndSymbol($wallet['wallet_id'], 'BTC');
    
    if (!$prop) {
        echo "Property for BTC not found. Creating...\n";
        try {
            $propertyModel->create($wallet['wallet_id'], 'BTC', 0.0, 0.0);
            echo "✓ Property created\n\n";
        } catch (Exception $e) {
            echo "✗ Failed to create property: " . $e->getMessage() . "\n";
            echo "This might be OK - continuing anyway...\n\n";
        }
    } else {
        echo "✓ Property already exists\n\n";
    }
    
    // Try to create the order
    echo "Creating future order...\n";
    $futureModel = new FutureOrder();
    
    try {
        $db->beginTransaction();
        
        $orderId = $futureModel->create($testData);
        
        if ($orderId) {
            echo "✓ Order created with ID: $orderId\n";
            
            // Fetch the created order
            $order = $futureModel->findById($orderId);
            echo "\nCreated order:\n";
            print_r($order);
            
            $db->commit();
            echo "\n✓ Transaction committed\n";
        } else {
            echo "✗ Failed to create order (no ID returned)\n";
            $db->rollBack();
        }
        
    } catch (Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        echo "✗ Error creating order: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }
    
    // Check if order was saved
    echo "\n=== VERIFYING ORDER IN DATABASE ===\n";
    $stmt = $db->prepare("SELECT * FROM future_orders WHERE wallet_id = ? ORDER BY open_ts DESC LIMIT 1");
    $stmt->execute([$wallet['wallet_id']]);
    $savedOrder = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($savedOrder) {
        echo "✓ Order found in database:\n";
        print_r($savedOrder);
    } else {
        echo "✗ No order found in database\n";
    }
    
} catch (Exception $e) {
    echo "Fatal error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
