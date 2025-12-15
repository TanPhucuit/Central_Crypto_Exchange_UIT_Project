<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Models\User;
use App\Models\Wallet;
use App\Models\Property;

echo "Creating spot wallets for existing merchants...\n";
echo "===============================================\n\n";

try {
    $userModel = new User();
    $walletModel = new Wallet();
    $propertyModel = new Property();
    
    // Get all merchants
    $merchants = $userModel->getMerchants();
    
    echo "Found " . count($merchants) . " merchants\n\n";
    
    foreach ($merchants as $merchant) {
        $merchantId = $merchant['user_id'];
        $username = $merchant['username'];
        
        echo "Processing merchant: $username (ID: $merchantId)\n";
        
        // Check if merchant already has spot wallet
        $existingWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
        
        if ($existingWallet) {
            echo "  - Already has spot wallet (ID: {$existingWallet['wallet_id']})\n";
            
            // Check if has USDT property
            $usdtProperty = $propertyModel->getByWalletAndSymbol($existingWallet['wallet_id'], 'USDT');
            if (!$usdtProperty) {
                echo "  - Adding 10,000 USDT to existing wallet\n";
                $propertyModel->create($existingWallet['wallet_id'], 'USDT', 0, 10000);
            } else {
                echo "  - Already has USDT: {$usdtProperty['unit_number']}\n";
            }
        } else {
            echo "  - Creating new spot wallet\n";
            $spotWalletId = $walletModel->create([
                'user_id' => $merchantId,
                'type' => 'spot',
                'balance' => 0
            ]);
            
            if ($spotWalletId) {
                echo "  - Created wallet ID: $spotWalletId\n";
                echo "  - Adding 10,000 USDT\n";
                $propertyModel->create($spotWalletId, 'USDT', 0, 10000);
            } else {
                echo "  - ERROR: Failed to create wallet\n";
            }
        }
        
        echo "\n";
    }
    
    echo "Done!\n";
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
