<?php
/**
 * Debug script to check user data structure
 */

require_once __DIR__ . '/vendor/autoload.php';

use App\Helpers\Database;

try {
    $db = Database::getConnection();
    
    echo "=== Checking users table structure ===\n\n";
    
    // Check table structure
    $stmt = $db->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Table columns:\n";
    foreach ($columns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
    }
    
    echo "\n=== Checking user 'alice' ===\n\n";
    
    // Check if alice exists and what columns are returned
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
    $stmt->execute(['alice']);
    
    // Try fetch with ASSOC
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        echo "User found! Columns returned:\n";
        foreach ($user as $key => $value) {
            if ($key === 'password_hash') {
                echo "  - $key: " . substr($value, 0, 50) . "...\n";
            } else {
                echo "  - $key: $value\n";
            }
        }
    } else {
        echo "User 'alice' not found!\n";
    }
    
    echo "\n=== Testing User Model ===\n\n";
    
    $userModel = new App\Models\User();
    $user2 = $userModel->findByUsername('alice');
    
    if ($user2) {
        echo "User model result:\n";
        foreach ($user2 as $key => $value) {
            if ($key === 'password_hash') {
                echo "  - $key: " . (isset($value) ? substr($value, 0, 50) . "..." : "NULL") . "\n";
            } else {
                echo "  - $key: " . ($value ?? "NULL") . "\n";
            }
        }
    } else {
        echo "User model returned null\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
