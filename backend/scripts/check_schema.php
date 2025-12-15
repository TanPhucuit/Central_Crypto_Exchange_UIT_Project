<?php

require __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

use App\Helpers\Database;

echo "=== Database Schema Checker ===\n\n";

try {
    $pdo = Database::getConnection();
    
    // Check Users table structure
    echo "📋 Checking USERS table structure:\n";
    $stmt = $pdo->query("DESCRIBE users");
    $userColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $hasUserId = false;
    $hasId = false;
    $hasUsername = false;
    $hasRole = false;
    
    foreach ($userColumns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
        if ($col['Field'] === 'user_id') $hasUserId = true;
        if ($col['Field'] === 'id') $hasId = true;
        if ($col['Field'] === 'username') $hasUsername = true;
        if ($col['Field'] === 'role') $hasRole = true;
    }
    
    echo "\n";
    
    if ($hasUserId) {
        echo "✅ Users table uses NEW schema (user_id)\n";
    } elseif ($hasId) {
        echo "❌ Users table uses OLD schema (id) - MISMATCH!\n";
    }
    
    echo "\n";
    
    // Check Wallets table structure
    echo "📋 Checking WALLETS table structure:\n";
    $stmt = $pdo->query("DESCRIBE wallets");
    $walletColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $hasWalletId = false;
    $hasWalletIdOld = false;
    $hasType = false;
    $hasCurrency = false;
    
    foreach ($walletColumns as $col) {
        echo "  - {$col['Field']} ({$col['Type']})\n";
        if ($col['Field'] === 'wallet_id') $hasWalletId = true;
        if ($col['Field'] === 'id') $hasWalletIdOld = true;
        if ($col['Field'] === 'type') $hasType = true;
        if ($col['Field'] === 'currency') $hasCurrency = true;
    }
    
    echo "\n";
    
    if ($hasWalletId && $hasType) {
        echo "✅ Wallets table uses NEW schema (wallet_id, type)\n";
    } elseif ($hasWalletIdOld && $hasCurrency) {
        echo "❌ Wallets table uses OLD schema (id, currency) - MISMATCH!\n";
    }
    
    echo "\n";
    
    // Check if Properties table exists
    echo "📋 Checking PROPERTIES table:\n";
    try {
        $stmt = $pdo->query("DESCRIBE properties");
        $propColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo "✅ Properties table exists\n";
        foreach ($propColumns as $col) {
            echo "  - {$col['Field']} ({$col['Type']})\n";
        }
    } catch (Exception $e) {
        echo "❌ Properties table does NOT exist - CRITICAL!\n";
    }
    
    echo "\n";
    
    // Summary
    echo "=== SUMMARY ===\n";
    if ($hasUserId && $hasWalletId && $hasType) {
        echo "✅ Database is using NEW schema (schema.sql)\n";
        echo "✅ Backend code should work correctly\n";
    } else {
        echo "❌ Database is using OLD schema (schema.sql.old)\n";
        echo "❌ Backend code will NOT work - SCHEMA MISMATCH!\n";
        echo "\n";
        echo "🔧 SOLUTION: You need to migrate to the new schema or update backend code\n";
        echo "   Option 1: Drop old database and import schema.sql\n";
        echo "   Option 2: Run migration script to update schema\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "   Make sure database connection is configured correctly\n";
}
