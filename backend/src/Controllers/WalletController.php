<?php

namespace App\Controllers;

use App\Helpers\Database;
use App\Helpers\Response;
use App\Models\InternalTransfer;
use App\Models\Wallet;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class WalletController
{
    public function index(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $walletModel = new Wallet();
        $wallets = $walletModel->getByUserId($userId);

        return Response::success($response, $wallets);
    }

    public function getByType(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $type = $args['type'] ?? 'fund';

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }
        
        if (!in_array($type, ['fund', 'spot', 'future'])) {
            return Response::error($response, 'Invalid wallet type', 400);
        }
        
        $walletModel = new Wallet();
        $wallet = $walletModel->getByUserIdAndType($userId, $type);

        if (!$wallet) {
            return Response::error($response, 'Wallet not found', 404);
        }

        return Response::success($response, $wallet);
    }

    public function getWithProperties(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $walletId = (int)$args['id'];

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }
        
        $walletModel = new Wallet();
        $wallet = $walletModel->getWithProperties($walletId);

        if (!$wallet || $wallet['user_id'] != $userId) {
            return Response::error($response, 'Wallet not found', 404);
        }

        return Response::success($response, $wallet);
    }

    public function create(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        if (empty($data['user_id'])) {
            return Response::error($response, 'user_id is required', 400);
        }

        if (empty($data['type'])) {
            return Response::error($response, 'Wallet type is required', 400);
        }

        if (!in_array($data['type'], ['fund', 'spot', 'future'])) {
            return Response::error($response, 'Invalid wallet type', 400);
        }

        $walletModel = new Wallet();
        
        // Check if wallet already exists
        $existing = $walletModel->getByUserIdAndType($data['user_id'], $data['type']);
        if ($existing) {
            return Response::error($response, 'Wallet already exists', 409);
        }

        $walletId = $walletModel->create($data['user_id'], $data['type']);

        if (!$walletId) {
            return Response::error($response, 'Failed to create wallet', 500);
        }

        $wallet = $walletModel->findById($walletId);
        return Response::success($response, $wallet, 'Wallet created', 201);
    }

    public function internalTransfer(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        $userId = $data['user_id'] ?? null;
        $fromType = $data['from_type'] ?? null;
        $toType = $data['to_type'] ?? null;
        $amount = isset($data['amount']) ? (float)$data['amount'] : null;
        $note = $data['note'] ?? null;

        if (!$userId || !$fromType || !$toType || !$amount) {
            return Response::error($response, 'user_id, from_type, to_type and amount are required', 400);
        }

        if ($fromType === $toType) {
            return Response::error($response, 'Source and target wallet types must be different', 400);
        }

        if (!in_array($fromType, ['spot', 'future'], true) || !in_array($toType, ['spot', 'future'], true)) {
            return Response::error($response, 'Only spot and future wallets are supported', 400);
        }

        if ($amount <= 0) {
            return Response::error($response, 'Amount must be greater than zero', 400);
        }

        $walletModel = new Wallet();
        $source = $walletModel->getByUserIdAndType((int)$userId, $fromType);
        $target = $walletModel->getByUserIdAndType((int)$userId, $toType);

        if (!$source || !$target) {
            return Response::error($response, 'Required wallets not found', 404);
        }

        $sourceBalance = (float)$source['balance'];
        if ($sourceBalance < $amount) {
            return Response::error($response, 'Insufficient balance in source wallet', 400);
        }

        $pdo = Database::getConnection();
        try {
            $pdo->beginTransaction();

            $walletModel->setBalance($source['wallet_id'], $sourceBalance - $amount);
            $walletModel->setBalance($target['wallet_id'], (float)$target['balance'] + $amount);

            $transferModel = new InternalTransfer();
            $transferId = $transferModel->create([
                'source_wallet_id' => $source['wallet_id'],
                'target_wallet_id' => $target['wallet_id'],
                'transfer_amount' => $amount,
                'note' => $note,
            ]);

            $pdo->commit();

            $updatedSource = $walletModel->findById($source['wallet_id']);
            $updatedTarget = $walletModel->findById($target['wallet_id']);

            return Response::success($response, [
                'transfer_id' => $transferId,
                'source_wallet' => $updatedSource,
                'target_wallet' => $updatedTarget,
            ], 'Internal transfer completed');
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::error($response, 'Failed to complete transfer: ' . $e->getMessage(), 500);
        }
    }
}
