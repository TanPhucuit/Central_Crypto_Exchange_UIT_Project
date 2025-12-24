<?php

use DI\Container;
use Slim\Factory\AppFactory;
use App\Middleware\CorsMiddleware;

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Create Container
$container = new Container();
AppFactory::setContainer($container);

// Create App
$app = AppFactory::create();

// Add Routing Middleware
$app->addRoutingMiddleware();

// Add Body Parsing Middleware (for JSON and form data)
$app->addBodyParsingMiddleware();

// Add Error Middleware
$errorMiddleware = $app->addErrorMiddleware(
    $_ENV['APP_DEBUG'] === 'true',
    true,
    true
);

// Add CORS Middleware (must be after error middleware to handle all responses)
$app->add(CorsMiddleware::class);

// Register Routes
$routes = [
    __DIR__ . '/../src/Routes/health.php',
    __DIR__ . '/../src/Routes/auth.php',
    __DIR__ . '/../src/Routes/user.php',
    __DIR__ . '/../src/Routes/wallet.php',
    __DIR__ . '/../src/Routes/trading.php',
    __DIR__ . '/../src/Routes/p2p.php',
    __DIR__ . '/../src/Routes/bank.php',
    __DIR__ . '/../src/Routes/dashboard.php',
    __DIR__ . '/../src/Routes/merchant.php',
];

foreach ($routes as $routeFile) {
    if (file_exists($routeFile)) {
        $routeDefinition = require $routeFile;
        $routeDefinition($app);
    }
}

// Optional: Run migrations automatically in development when AUTO_MIGRATE env var set to 'true'
if (isset($_ENV['AUTO_MIGRATE']) && $_ENV['AUTO_MIGRATE'] === 'true') {
    try {
        // run_migrations.php uses the project's autoload and Database helper
        require __DIR__ . '/../scripts/run_migrations.php';
    } catch (\Throwable $e) {
        error_log('Auto-migrate failed: ' . $e->getMessage());
        // Do not halt the app in production; migrations are best-effort here
    }
}

// Run app
$app->run();
