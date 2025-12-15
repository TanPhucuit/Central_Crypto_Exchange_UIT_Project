<?php

use Slim\App;
use App\Controllers\WalletController;

return function (App $app) {
    // Get all wallets for user
    $app->get('/api/wallet', [WalletController::class, 'index']);
    
    // Get wallet by currency
    $app->get('/api/wallet/currency/{currency}', [WalletController::class, 'getByCurrency']);
    
    // Create new wallet
    $app->post('/api/wallet', [WalletController::class, 'create']);
    
    // Get wallet with properties
    $app->get('/api/wallet/{id}/properties', [WalletController::class, 'getWalletWithProperties']);

    // Internal transfer between wallets
    $app->post('/api/wallet/transfer', [WalletController::class, 'transfer']);
};
