<?php

use Slim\App;
use App\Controllers\UserController;

return function (App $app) {
    $app->get('/api/user/profile', [UserController::class, 'profile']);
    $app->put('/api/user/profile', [UserController::class, 'updateProfile']);
    $app->post('/api/user/change-password', [UserController::class, 'changePassword']);
};
