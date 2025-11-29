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
        $data = $request->getParsedBody();

        // Validation
        if (empty($data['username']) || empty($data['email']) || empty($data['password'])) {
            return Response::error($response, 'Username, email and password are required', 400);
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return Response::error($response, 'Invalid email format', 400);
        }

        if (strlen($data['password']) < 6) {
            return Response::error($response, 'Password must be at least 6 characters', 400);
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
        $userId = $userModel->create([
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'] ?? 'normal'
        ]);

        if (!$userId) {
            return Response::error($response, 'Failed to create user', 500);
        }

        // Auto-create wallets
        $walletModel = new \App\Models\Wallet();
        
        // Create Fund Wallet
        $walletModel->create([
            'user_id' => $userId,
            'type' => 'fund',
            'balance' => 0
        ]);

        // Create Spot Wallet
        $walletModel->create([
            'user_id' => $userId,
            'type' => 'spot',
            'balance' => 0
        ]);

        // Create Future Wallet
        $walletModel->create([
            'user_id' => $userId,
            'type' => 'future',
            'balance' => 0
        ]);

        // If user is merchant, create default bank account
        if (isset($data['role']) && $data['role'] === 'merchant') {
            $bankModel = new \App\Models\BankAccount();
            $bankModel->create([
                'account_number' => 'MERCHANT-' . time(), // Generate unique account number
                'bank_name' => 'Merchant Default Bank',
                'user_id' => $userId,
                'account_balance' => 100000000 // 100M VND default
            ]);
        }

        $user = $userModel->findById($userId);
        unset($user['password_hash']);

        return Response::success($response, [
            'user' => $user,
            'user_id' => $userId
        ], 'Registration successful', 201);
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

        unset($user['password_hash']);

        return Response::success($response, $user);
    }
}
