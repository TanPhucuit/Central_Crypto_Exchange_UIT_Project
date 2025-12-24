<?php

use Slim\App;
use App\Controllers\AuthController;

return function (App $app) {
    // OPTIONS routes for CORS preflight
    $app->options('/api/auth/register', function ($request, $response) {
        return $response;
    });
    $app->options('/api/auth/login', function ($request, $response) {
        return $response;
    });
    $app->options('/api/auth/me', function ($request, $response) {
        return $response;
    });
    
    $app->post('/api/auth/register', [AuthController::class, 'register']);
    $app->post('/api/auth/login', [AuthController::class, 'login']);
    $app->get('/api/auth/me', [AuthController::class, 'me']);
};
