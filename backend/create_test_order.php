<?php
/**
 * Create a test future order and leave it OPEN
 * This simulates what happens when user opens a position from frontend
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;
use App\Models\Wallet;
use App\Models\FutureOrder;

echo "=== CREATING TEST FUTURE ORDER (OPEN) ===\n\n";

try {
    $db = Database::getConnection();
    
    // Find user with future wallet
    $stmt = $db->prepare("SELECT w.*, u.user_id FROM wallets w JOIN users u ON w.user_id = u.user_id WHERE w.type = 'future' LIMIT 1");
    $stmt->execute();
    $wallet = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$wallet) {
        echo "No future wallet found. Creating one...\n";
        
        $stmt = $db->prepare("SELECT user_id FROM users LIMIT 1");
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            echo "✗ No users found. Please create a user first.\n";
            exit(1);
        }
        
        $walletModel = new Wallet();
        $walletId = $walletModel->create($user['user_id'], 'future');
        $walletModel->setBalance($walletId, 10000.00);
        $wallet = $walletModel->findById($walletId);
        $wallet['user_id'] = $user['user_id'];
    }
    
    echo "Using wallet:\n";
    echo "  Wallet ID: {$wallet['wallet_id']}\n";
    echo "  User ID: {$wallet['user_id']}\n";
    echo "  Balance: {$wallet['balance']} USDT\n\n";
    
    // Create test order
    $testOrder = [
        'wallet_id' => $wallet['wallet_id'],
        'symbol' => 'ETH',
        'side' => 'long',
        'entry_price' => 3500.00,
        'margin' => 200.00,
        'leverage' => 3,
        'position_size' => 600.00, // margin * leverage
    ];
    
    echo "Creating order:\n";
    echo "  Symbol: {$testOrder['symbol']}\n";
    echo "  Side: {$testOrder['side']}\n";
    echo "  Entry Price: \${$testOrder['entry_price']}\n";
    echo "  Margin: {$testOrder['margin']} USDT\n";
    echo "  Leverage: {$testOrder['leverage']}x\n";
    echo "  Position Size: {$testOrder['position_size']}\n\n";
    
    $db->beginTransaction();
    
    // Deduct margin from wallet
    $walletModel = new Wallet();
    $newBalance = (float)$wallet['balance'] - $testOrder['margin'];
    $walletModel->setBalance($wallet['wallet_id'], $newBalance);
    
    // Create order
    $futureModel = new FutureOrder();
    $orderId = $futureModel->create($testOrder);
    
    if (!$orderId) {
        throw new Exception("Failed to create order");
    }
    
    $db->commit();
    
    echo "✓ Order created successfully!\n";
    echo "  Order ID: $orderId\n\n";
    
    // Verify it's in open orders
    $openOrders = $futureModel->getOpenOrders($wallet['wallet_id']);
    echo "Open orders for this wallet: " . count($openOrders) . "\n";
    
    $found = false;
    foreach ($openOrders as $order) {
        if ($order['future_order_id'] == $orderId) {
            $found = true;
            echo "\n✓ Order is in open orders list!\n";
            echo "  This order should now be visible in frontend.\n";
            break;
        }
    }
    
    if (!$found) {
        echo "\n✗ WARNING: Order NOT in open orders list!\n";
    }
    
    echo "\n=== NEXT STEPS ===\n";
    echo "1. Open frontend: http://localhost:3000\n";
    echo "2. Login with user_id: {$wallet['user_id']}\n";
    echo "3. Go to Futures Trading page\n";
    echo "4. Click 'Lệnh đang mở' tab\n";
    echo "5. You should see the ETH/USDT Long position\n";
    echo "6. Click 'Đóng vị thế' to close it\n";
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    echo "\n✗ Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
