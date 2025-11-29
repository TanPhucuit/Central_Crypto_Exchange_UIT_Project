<?php

use Slim\App;
use App\Controllers\MerchantController;
use App\Middleware\AuthMiddleware;

return function (App $app) {
    // Dashboard statistics
    $app->get('/api/merchant/dashboard/stats', [MerchantController::class, 'getDashboardStats']);
    
    // P2P order management
    $app->get('/api/merchant/orders', [MerchantController::class, 'getMerchantOrders']);
    
    // Bank account management
    $app->get('/api/merchant/bank-accounts', [MerchantController::class, 'getBankAccounts']);
    $app->get('/api/merchant/transactions', [MerchantController::class, 'getTransactionHistory']);
    $app->post('/api/merchant/bank-accounts/default', [MerchantController::class, 'setDefaultBankAccount']);
};
