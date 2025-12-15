<?php
require __DIR__ . '/vendor/autoload.php';
use App\Models\User;

try {
    $userModel = new User();
    echo "User model instantiated.\n";
    
    // Try to create a user directly
    $username = 'direct_' . time();
    echo "Creating user $username...\n";
    $id = $userModel->create([
        'username' => $username,
        'email' => $username . '@test.com',
        'password' => '123456',
        'role' => 'normal'
    ]);
    echo "User created with ID: $id\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
