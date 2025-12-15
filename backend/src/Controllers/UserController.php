<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\User;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class UserController
{
    public function profile(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $userModel = new User();
        $userData = $userModel->findById($userId);
        
        if (!$userData) {
            return Response::error($response, 'User not found', 404);
        }

        unset($userData['password']);
        return Response::success($response, $userData);
    }

    public function updateProfile(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        
        if (empty($data['user_id'])) {
            return Response::error($response, 'user_id is required', 400);
        }

        $userId = $data['user_id'];
        unset($data['user_id']); // Remove user_id from update data
        
        $userModel = new User();
        $success = $userModel->update($userId, $data);

        if (!$success) {
            return Response::error($response, 'Failed to update profile', 500);
        }

        $userData = $userModel->findById($userId);
        unset($userData['password']);
        
        return Response::success($response, $userData, 'Profile updated');
    }

    public function changePassword(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        if (empty($data['user_id']) || empty($data['old_password']) || empty($data['new_password'])) {
            return Response::error($response, 'user_id, old password and new password are required', 400);
        }

        $userModel = new User();
        $userData = $userModel->findById($data['user_id']);

        if (!$userData) {
            return Response::error($response, 'User not found', 404);
        }

        $passwordMatch = false;
        
        // 1. Try verify with 'password' column (which stores plain text or hash depending on implementation)
        // Schema says 'password', we are using plain text comparison in AuthController::login for now?
        // Let's support both.
        
        $currentPassword = $userData['password'] ?? '';
        
        if ($data['old_password'] === $currentPassword) {
             $passwordMatch = true;
        } elseif ($userModel->verifyPassword($data['old_password'], $currentPassword)) {
             $passwordMatch = true;
        }

        if (!$passwordMatch) {
            return Response::error($response, 'Invalid old password', 401);
        }

        $success = $userModel->updatePassword($data['user_id'], $data['new_password']);

        if (!$success) {
            return Response::error($response, 'Failed to update password', 500);
        }

        return Response::success($response, null, 'Password updated');
    }
}
