<?php

namespace App\Controllers;

use App\Helpers\Database;
use App\Helpers\Response;
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

    public function getByCurrency(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $currency = strtoupper($args['currency'] ?? 'USDT');

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        // Map currency to wallet type
        // 'FUTURE' -> 'future', anything else -> 'spot'
        $type = ($currency === 'FUTURE' || $currency === 'FUTURES') ? 'future' : 'spot';

        $walletModel = new Wallet();
        $wallet = $walletModel->getByUserIdAndType($userId, $type);

        if (!$wallet) {
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

        // Map currency to type if provided, or use direct type if provided
        $type = 'spot';
        if (!empty($data['type'])) {
            $type = strtolower($data['type']);
        } elseif (!empty($data['currency'])) {
            $currency = strtoupper($data['currency']);
            if ($currency === 'FUTURE' || $currency === 'FUTURES') {
                $type = 'future';
            }
        }

        if (!in_array($type, ['spot', 'future', 'fund'])) {
            $type = 'spot';
        }

        $walletModel = new Wallet();

        // Check if wallet already exists
        $existing = $walletModel->getByUserIdAndType($data['user_id'], $type);
        if ($existing) {
            return Response::error($response, 'Wallet already exists', 409);
        }

        $walletId = $walletModel->create(
            $data['user_id'],
            $type,
            $data['balance'] ?? 0
        );

        if (!$walletId) {
            return Response::error($response, 'Failed to create wallet', 500);
        }

        $wallet = $walletModel->findById($walletId);
        return Response::success($response, $wallet, 'Wallet created', 201);
    }

    public function transfer(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();
        $userId = $data['user_id'] ?? null;
        
        // Handle legacy params: from_currency, to_currency
        // Map them to source_type and target_type
        $fromCurrency = isset($data['from_currency']) ? strtoupper($data['from_currency']) : null;
        $toCurrency = isset($data['to_currency']) ? strtoupper($data['to_currency']) : null;
        
        $sourceType = 'spot';
        $targetType = 'spot';

        if ($fromCurrency === 'FUTURE' || $fromCurrency === 'FUTURES') $sourceType = 'future';
        if ($toCurrency === 'FUTURE' || $toCurrency === 'FUTURES') $targetType = 'future';

        // Override if explicit types provided
        if (isset($data['from_type'])) $sourceType = strtolower($data['from_type']);
        if (isset($data['to_type'])) $targetType = strtolower($data['to_type']);

        $amount = isset($data['amount']) ? (float)$data['amount'] : null;

        if (!$userId || !$amount || $amount <= 0) {
            return Response::error($response, 'user_id and valid amount are required', 400);
        }

        if ($sourceType === $targetType) {
            return Response::error($response, 'Source and target wallet types must be different', 400);
        }

        $walletModel = new Wallet();
        $source = $walletModel->getByUserIdAndType((int)$userId, $sourceType);
        $target = $walletModel->getByUserIdAndType((int)$userId, $targetType);

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

            // Log internal transfer
            // Use internal_transfers table if available, or just respond success (Transaction logging in separate table?)
            // Schema has `internal_transfers` table.
            
            $stmt = $pdo->prepare("
                INSERT INTO internal_transfers (source_wallet_id, target_wallet_id, amount)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$source['wallet_id'], $target['wallet_id'], $amount]);

            $pdo->commit();

            $updatedSource = $walletModel->findById($source['wallet_id']);
            $updatedTarget = $walletModel->findById($target['wallet_id']);

            return Response::success($response, [
                'source_wallet' => $updatedSource,
                'target_wallet' => $updatedTarget,
            ], 'Transfer completed');
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return Response::error($response, 'Failed to complete transfer: ' . $e->getMessage(), 500);
        }
    }

    public function getWalletWithProperties(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $walletId = (int)$args['id'];

        if (!$userId) {
            return Response::error($response, 'user_id is required', 400);
        }

        $walletModel = new Wallet();
        $wallet = $walletModel->findById($walletId);

        if (!$wallet || $wallet['user_id'] != $userId) {
            return Response::error($response, 'Wallet not found', 404);
        }

        // Load properties (spot assets) from database
        $propertyModel = new \App\Models\Property();
        $properties = $propertyModel->getByWalletId($walletId);
        $wallet['properties'] = $properties;

        return Response::success($response, $wallet);
    }
}
