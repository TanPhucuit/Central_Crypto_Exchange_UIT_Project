<?php
/**
 * Comprehensive test for future orders functionality
 * This script tests the complete flow: create wallet -> open position -> verify -> close position
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;
use App\Models\Wallet;
use App\Models\FutureOrder;

echo "=== FUTURE ORDERS COMPREHENSIVE TEST ===\n\n";

try {
    $db = Database::getConnection();
    
    // Step 1: Find or create a test user
    echo "Step 1: Finding test user...\n";
    $stmt = $db->prepare("SELECT user_id FROM users LIMIT 1");
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        echo "✗ No users found. Please create a user first.\n";
        exit(1);
    }
    
    $userId = $user['user_id'];
    echo "✓ Using user ID: $userId\n\n";
    
    // Step 2: Find or create future wallet
    echo "Step 2: Checking future wallet...\n";
    $walletModel = new Wallet();
    $futureWallet = $walletModel->getByUserIdAndType($userId, 'future');
    
    if (!$futureWallet) {
        echo "Creating future wallet...\n";
        $walletId = $walletModel->create($userId, 'future');
        $futureWallet = $walletModel->findById($walletId);
        // Add some balance for testing
        $walletModel->setBalance($walletId, 10000.00);
        $futureWallet = $walletModel->findById($walletId);
    }
    
    echo "✓ Future wallet ID: {$futureWallet['wallet_id']}\n";
    echo "✓ Balance: {$futureWallet['balance']} USDT\n\n";
    
    // Step 3: Open a test position
    echo "Step 3: Opening test position...\n";
    $testOrder = [
        'wallet_id' => $futureWallet['wallet_id'],
        'symbol' => 'BTC',
        'side' => 'long',
        'entry_price' => 50000.00,
        'margin' => 100.00,
        'leverage' => 2,
        'position_size' => 200.00, // margin * leverage
    ];
    
    echo "Test order details:\n";
    echo "  Symbol: {$testOrder['symbol']}\n";
    echo "  Side: {$testOrder['side']}\n";
    echo "  Entry Price: \${$testOrder['entry_price']}\n";
    echo "  Margin: {$testOrder['margin']} USDT\n";
    echo "  Leverage: {$testOrder['leverage']}x\n";
    echo "  Position Size: {$testOrder['position_size']}\n\n";
    
    $futureModel = new FutureOrder();
    
    $db->beginTransaction();
    
    // Deduct margin
    $newBalance = (float)$futureWallet['balance'] - $testOrder['margin'];
    $walletModel->setBalance($futureWallet['wallet_id'], $newBalance);
    
    // Create order
    $orderId = $futureModel->create($testOrder);
    
    if (!$orderId) {
        throw new Exception("Failed to create order");
    }
    
    $db->commit();
    
    echo "✓ Order created with ID: $orderId\n\n";
    
    // Step 4: Verify order in database
    echo "Step 4: Verifying order in database...\n";
    $createdOrder = $futureModel->findById($orderId);
    
    if (!$createdOrder) {
        echo "✗ Order not found in database!\n";
        exit(1);
    }
    
    echo "✓ Order found:\n";
    echo "  Order ID: {$createdOrder['future_order_id']}\n";
    echo "  Wallet ID: {$createdOrder['wallet_id']}\n";
    echo "  Symbol: {$createdOrder['symbol']}\n";
    echo "  Side: {$createdOrder['side']}\n";
    echo "  Entry Price: {$createdOrder['entry_price']}\n";
    echo "  Position Size: {$createdOrder['position_size']}\n";
    echo "  Margin: {$createdOrder['margin']}\n";
    echo "  Leverage: {$createdOrder['leverage']}\n";
    echo "  Open Time: {$createdOrder['open_ts']}\n";
    echo "  Close Time: " . ($createdOrder['close_ts'] ?? 'NULL (OPEN)') . "\n\n";
    
    // Step 5: Test getOpenOrders
    echo "Step 5: Testing getOpenOrders()...\n";
    $openOrders = $futureModel->getOpenOrders($futureWallet['wallet_id']);
    
    echo "✓ Found " . count($openOrders) . " open order(s)\n";
    
    if (count($openOrders) === 0) {
        echo "✗ ERROR: getOpenOrders() returned empty array!\n";
        echo "This is the bug we're trying to fix.\n";
        exit(1);
    }
    
    $foundOrder = false;
    foreach ($openOrders as $order) {
        if ($order['future_order_id'] == $orderId) {
            $foundOrder = true;
            echo "✓ Our test order is in the open orders list!\n\n";
            break;
        }
    }
    
    if (!$foundOrder) {
        echo "✗ Our test order is NOT in the open orders list!\n";
        exit(1);
    }
    
    // Step 6: Test closing the position
    echo "Step 6: Testing close position...\n";
    $exitPrice = 52000.00; // Simulate price increase
    
    // Calculate expected PnL
    $expectedPnl = (($exitPrice - $testOrder['entry_price']) / $testOrder['entry_price']) * $testOrder['position_size'];
    echo "Exit Price: \$$exitPrice\n";
    echo "Expected PnL: \$$expectedPnl\n\n";
    
    $db->beginTransaction();
    
    $success = $futureModel->close($orderId, $exitPrice, $expectedPnl);
    
    if (!$success) {
        throw new Exception("Failed to close order");
    }
    
    // Return margin + profit to wallet
    $currentWallet = $walletModel->findById($futureWallet['wallet_id']);
    $finalBalance = (float)$currentWallet['balance'] + $testOrder['margin'] + $expectedPnl;
    $walletModel->setBalance($futureWallet['wallet_id'], $finalBalance);
    
    $db->commit();
    
    echo "✓ Order closed successfully\n\n";
    
    // Step 7: Verify closed order
    echo "Step 7: Verifying closed order...\n";
    $closedOrder = $futureModel->findById($orderId);
    
    if ($closedOrder['close_ts'] === null) {
        echo "✗ Order still shows as open (close_ts is NULL)!\n";
        exit(1);
    }
    
    echo "✓ Order is marked as closed\n";
    echo "  Exit Price: {$closedOrder['exit_price']}\n";
    echo "  Profit: {$closedOrder['profit']}\n";
    echo "  Close Time: {$closedOrder['close_ts']}\n\n";
    
    // Step 8: Verify it's not in open orders anymore
    echo "Step 8: Verifying order is not in open orders...\n";
    $openOrdersAfter = $futureModel->getOpenOrders($futureWallet['wallet_id']);
    
    $stillOpen = false;
    foreach ($openOrdersAfter as $order) {
        if ($order['future_order_id'] == $orderId) {
            $stillOpen = true;
            break;
        }
    }
    
    if ($stillOpen) {
        echo "✗ Order still appears in open orders!\n";
        exit(1);
    }
    
    echo "✓ Order is no longer in open orders list\n\n";
    
    // Step 9: Verify wallet balance
    echo "Step 9: Verifying wallet balance...\n";
    $finalWallet = $walletModel->findById($futureWallet['wallet_id']);
    echo "Final balance: {$finalWallet['balance']} USDT\n";
    echo "Expected balance: $finalBalance USDT\n";
    
    if (abs((float)$finalWallet['balance'] - $finalBalance) > 0.01) {
        echo "✗ Balance mismatch!\n";
        exit(1);
    }
    
    echo "✓ Balance is correct\n\n";
    
    // Success!
    echo "=== ALL TESTS PASSED ✓ ===\n";
    echo "\nSummary:\n";
    echo "✓ Future wallet created/found\n";
    echo "✓ Position opened successfully\n";
    echo "✓ Order appears in database\n";
    echo "✓ getOpenOrders() returns the order\n";
    echo "✓ Position closed successfully\n";
    echo "✓ Order marked as closed\n";
    echo "✓ Order removed from open orders\n";
    echo "✓ Wallet balance updated correctly\n";
    echo "\n🎉 Future orders functionality is working correctly!\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "\n✗ TEST FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
