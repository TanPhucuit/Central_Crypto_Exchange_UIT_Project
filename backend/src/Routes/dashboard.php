<?php

use Slim\App;
use App\Controllers\DashboardController;

return function (App $app) {
    $app->get('/api/dashboard/summary', [DashboardController::class, 'getSummary']);
};
