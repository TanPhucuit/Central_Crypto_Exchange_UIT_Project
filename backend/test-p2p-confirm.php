<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Models\P2POrder;
use App\Models\Wallet;
use App\Models\Property;

echo "Testing P2P Confirm Logic\n";
echo "========================\n\n";

$orderId = 180001;
$merchantId = 956127; // PHUCM merchant

try {
    $p2pModel = new P2POrder();
    $order = $p2pModel->findById($orderId);
    
    echo "Order found:\n";
    print_r($order);
    echo "\n";
    
    if (!$order) {
        die("Order not found\n");
    }
    
    $walletModel = new Wallet();
    $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
    
    echo "Merchant wallet:\n";
    print_r($merchantWallet);
    echo "\n";
    
    if (!$merchantWallet) {
        die("Merchant wallet not found\n");
    }
    
    $propertyModel = new Property();
    $merchantUsdtProperty = $propertyModel->getByWalletAndSymbol($merchantWallet['wallet_id'], 'USDT');
    
    echo "Merchant USDT property:\n";
    print_r($merchantUsdtProperty);
    echo "\n";
    
    $orderAmount = floatval($order['unit_numbers']);
    $merchantUsdtBalance = $merchantUsdtProperty ? floatval($merchantUsdtProperty['unit_number']) : 0;
    
    echo "Order amount: " . $orderAmount . "\n";
    echo "Merchant USDT balance: " . $merchantUsdtBalance . "\n";
    
    if ($merchantUsdtBalance < $orderAmount) {
        echo "ERROR: Insufficient merchant USDT balance\n";
    } else {
        echo "OK: Merchant has enough USDT\n";
    }
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
