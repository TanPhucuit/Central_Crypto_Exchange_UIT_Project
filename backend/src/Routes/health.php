<?php

use Slim\App;
use App\Controllers\HealthController;

return function (App $app) {
    $app->get('/api/health', [HealthController::class, 'check']);
    $app->get('/api/health/database', [HealthController::class, 'database']);
};
