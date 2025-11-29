<?php

use Slim\App;
use App\Controllers\AuthController;

return function (App $app) {
    $app->post('/api/auth/register', [AuthController::class, 'register']);
    $app->post('/api/auth/login', [AuthController::class, 'login']);
    $app->get('/api/auth/me', [AuthController::class, 'me']);
};
