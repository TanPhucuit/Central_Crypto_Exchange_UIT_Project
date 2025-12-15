<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Models\User;
use App\Models\Wallet;
use App\Models\Property;

echo "Ensuring ALL merchants have 10,000 USDT\n";
echo "======================================\n\n";

try {
    $userModel = new User();
    $walletModel = new Wallet();
    $propertyModel = new Property();
    
    // Get all merchants
    $merchants = $userModel->getMerchants();
    
    echo "Found " . count($merchants) . " merchants\n\n";
    
    $fixed = 0;
    $alreadyOk = 0;
    $errors = 0;
    
    foreach ($merchants as $merchant) {
        $merchantId = $merchant['user_id'];
        $username = $merchant['username'];
        
        echo "Checking merchant: $username (ID: $merchantId)... ";
        
        // Get or create spot wallet
        $spotWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
        
        if (!$spotWallet) {
            echo "creating wallet... ";
            $spotWalletId = $walletModel->create([
                'user_id' => $merchantId,
                'type' => 'spot',
                'balance' => 0
            ]);
            
            if (!$spotWalletId) {
                echo "ERROR: Failed to create wallet\n";
                $errors++;
                continue;
            }
            
            $spotWallet = $walletModel->findById($spotWalletId);
        }
        
        // Check USDT property
        $usdtProperty = $propertyModel->getByWalletAndSymbol($spotWallet['wallet_id'], 'USDT');
        
        if (!$usdtProperty) {
            echo "adding 10,000 USDT... ";
            try {
                $propertyModel->create($spotWallet['wallet_id'], 'USDT', 0, 10000);
                echo "DONE\n";
                $fixed++;
            } catch (\Exception $e) {
                echo "ERROR: " . $e->getMessage() . "\n";
                $errors++;
            }
        } else {
            $currentAmount = floatval($usdtProperty['unit_number']);
            echo "already has {$currentAmount} USDT\n";
            $alreadyOk++;
        }
    }
    
    echo "\n";
    echo "Summary:\n";
    echo "  - Already OK: $alreadyOk\n";
    echo "  - Fixed: $fixed\n";
    echo "  - Errors: $errors\n";
    
} catch (\Exception $e) {
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
