<?php

use Slim\App;
use App\Controllers\BankAccountController;

return function (App $app) {
    $app->get('/api/bank', [BankAccountController::class, 'index']);
    $app->post('/api/bank', [BankAccountController::class, 'create']);
    $app->post('/api/bank/transfer', [BankAccountController::class, 'transfer']);
    $app->post('/api/bank/lookup', [BankAccountController::class, 'lookup']);
    $app->get('/api/bank/transactions', [BankAccountController::class, 'transactions']);
    $app->delete('/api/bank/{accountNumber}', [BankAccountController::class, 'delete']);
};
