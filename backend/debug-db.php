<?php
require __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

try {
    echo "Testing Database::getConnection()...\n";
    $pdo = Database::getConnection();
    echo "Success!\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
