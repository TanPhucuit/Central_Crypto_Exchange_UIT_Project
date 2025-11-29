<?php

use Slim\App;
use App\Controllers\P2PController;

return function (App $app) {
    $app->get('/api/p2p/orders', [P2PController::class, 'listOrders']);
    $app->get('/api/p2p/my-orders', [P2PController::class, 'myOrders']);
    $app->get('/api/p2p/merchants', [P2PController::class, 'listMerchants']);
    $app->post('/api/p2p/orders', [P2PController::class, 'createOrder']);
    $app->post('/api/p2p/orders/{id}/cancel', [P2PController::class, 'cancelOrder']);
    $app->post('/api/p2p/orders/{id}/transfer', [P2PController::class, 'transferPayment']);
    $app->post('/api/p2p/orders/{id}/confirm', [P2PController::class, 'confirmAndRelease']);
    $app->put('/api/p2p/orders/{id}', [P2PController::class, 'updateOrder']);
};
