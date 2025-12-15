<?php

require __DIR__ . '/vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

use App\Controllers\AuthController;
use Slim\Psr7\Factory\ServerRequestFactory;
use Slim\Psr7\Factory\ResponseFactory;

echo "Testing Merchant Registration\n";
echo "============================\n\n";

// Create test request
$requestFactory = new ServerRequestFactory();
$responseFactory = new ResponseFactory();

$request = $requestFactory->createServerRequest('POST', '/api/auth/register');
$response = $responseFactory->createResponse();

// Add test data
$testData = [
    'username' => 'testmerchant_' . time(),
    'email' => 'testmerchant_' . time() . '@test.com',
    'password' => 'password123',
    'role' => 'merchant'
];

$request = $request->withParsedBody($testData);

// Call controller
$controller = new AuthController();
$response = $controller->register($request, $response);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Response Body:\n";
echo $response->getBody() . "\n";

// Now check if wallet was created
if ($response->getStatusCode() === 201) {
    $body = json_decode($response->getBody(), true);
    if (isset($body['data']['user_id'])) {
        $userId = $body['data']['user_id'];
        
        echo "\n\nChecking created wallets for user_id=$userId:\n";
        
        $walletModel = new \App\Models\Wallet();
        $propertyModel = new \App\Models\Property();
        
        $spotWallet = $walletModel->getByUserIdAndType($userId, 'spot');
        if ($spotWallet) {
            echo "Spot wallet found: wallet_id={$spotWallet['wallet_id']}\n";
            
            $usdtProperty = $propertyModel->getByWalletAndSymbol($spotWallet['wallet_id'], 'USDT');
            if ($usdtProperty) {
                echo "USDT property found: {$usdtProperty['unit_number']} USDT\n";
            } else {
                echo "ERROR: No USDT property found!\n";
            }
        } else {
            echo "ERROR: No spot wallet found!\n";
        }
    }
}
