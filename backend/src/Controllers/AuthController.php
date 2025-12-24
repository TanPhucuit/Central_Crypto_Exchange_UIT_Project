<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
    public function register(Request $request, ResponseInterface $response): ResponseInterface
    {
        try {
            $data = $request->getParsedBody();

            // Validation
            if (empty($data['username']) || empty($data['email']) || empty($data['password'])) {
                return Response::error($response, 'Username, email and password are required', 400);
            }

            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return Response::error($response, 'Invalid email format', 400);
            }

            if (strlen($data['password']) < 5) {
                return Response::error($response, 'Password must be more than 4 characters', 400);
            }

            $userModel = new User();

            // Check if username or email exists
            if ($userModel->findByUsername($data['username'])) {
                return Response::error($response, 'Username already exists', 409);
            }

            if ($userModel->findByEmail($data['email'])) {
                return Response::error($response, 'Email already exists', 409);
            }

            // Create user
            error_log("Attempting to create user...");
            $userId = $userModel->create([
                'username' => $data['username'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => $data['role'] ?? 'normal'
            ]);
            error_log("User created: " . ($userId ?: 'FAIL'));

            if (!$userId) {
                return Response::error($response, 'Failed to create user', 500);
            }

            // Auto-create wallets
            // Auto-create wallets
            $walletModel = new \App\Models\Wallet();
            $isMerchant = isset($data['role']) && $data['role'] === 'merchant';
            $createdWallets = [];

            if ($isMerchant) {
                // Merchant: Create 1 wallet (Merchant) with 10,000 USDT
                // We use 'merchant' type as requested
                $walletId = $walletModel->create($userId, 'merchant', 10000);
                if (!$walletId) {
                     error_log("Failed to create merchant wallet for user_id=$userId");
                } else {
                     $createdWallets[] = 'merchant';
                }
            } else {
                // Normal User: Create Future and Spot wallets
                $walletModel->create($userId, 'future', 0);
                $spotWalletId = $walletModel->create($userId, 'spot', 0);
                $createdWallets = ['future', 'spot'];

                // Initialize 10 default assets in Properties for Spot Wallet
                if ($spotWalletId) {
                    $defaultAssets = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'TRX', 'DOT', 'LTC'];
                    $propertyModel = new \App\Models\Property();
                    foreach ($defaultAssets as $symbol) {
                        $propertyModel->create($spotWalletId, $symbol, 0, 0);
                    }
                }
            }

            error_log("Wallets created for user $userId: " . implode(', ', $createdWallets));

            // If user is merchant, create default bank account
            if ($isMerchant) {
                $bankModel = new \App\Models\BankAccount();
                $bankModel->create([
                    'account_number' => 'MERCHANT-' . time(), // Generate unique account number
                    'bank_name' => 'Merchant Default Bank',
                    'user_id' => $userId,
                    'account_balance' => 100000000 // 100M VND default
                ]);
            }

            error_log("About to fetch user by ID: $userId");
            $user = $userModel->findById($userId);
            error_log("User fetched: " . json_encode($user));
            
            if ($user && isset($user['password'])) {
                unset($user['password']);
            }

            error_log("Sending success response");
            return Response::success($response, [
                'user' => $user,
                'user_id' => $userId
            ], 'Registration successful', 201);
            
        } catch (\Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return Response::error($response, 'Registration failed: ' . $e->getMessage(), 500);
        }
    }

    public function login(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        if (empty($data['login']) || empty($data['password'])) {
            return Response::error($response, 'Username/Email and password are required', 400);
        }

        $userModel = new User();
        
        // Try login with username or email
        $user = $userModel->findByUsername($data['login']);
        if (!$user) {
            $user = $userModel->findByEmail($data['login']);
        }

        if (!$user) {
            return Response::error($response, 'Invalid credentials', 401);
        }

        // SO SÁNH TRỰC TIẾP PASSWORD (không dùng hash)
        // Cột trong database là 'password' không phải 'password_hash'
        $passwordMatch = false;
        
        // Cách 1: So sánh trực tiếp với password trong database
        if (isset($user['password']) && $data['password'] === $user['password']) {
            $passwordMatch = true;
        }
        
        // Cách 2: Nếu password là hash thật (bcrypt), thử verify
        if (!$passwordMatch && isset($user['password']) && $userModel->verifyPassword($data['password'], $user['password'])) {
            $passwordMatch = true;
        }
        
        if (!$passwordMatch) {
            return Response::error($response, 'Invalid credentials', 401);
        }

        unset($user['password']);

        return Response::success($response, [
            'user' => $user,
            'user_id' => $user['user_id']
        ], 'Login successful');
    }

    public function me(Request $request, ResponseInterface $response): ResponseInterface
    {
        // Lấy user_id từ query parameter thay vì JWT
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $userModel = new User();
        $user = $userModel->findById($userId);

        if (!$user) {
            return Response::error($response, 'User not found', 404);
        }

        unset($user['password']);

        return Response::success($response, $user);
    }
}
