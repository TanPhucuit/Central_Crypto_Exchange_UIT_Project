<?php

use Slim\App;
use App\Controllers\WalletController;

return function (App $app) {
    $app->get('/api/wallet', [WalletController::class, 'index']);
    $app->post('/api/wallet', [WalletController::class, 'create']);
    $app->post('/api/wallet/internal-transfer', [WalletController::class, 'internalTransfer']);
    $app->get('/api/wallet/type/{type}', [WalletController::class, 'getByType']);
    $app->get('/api/wallet/{id}/properties', [WalletController::class, 'getWithProperties']);
};
