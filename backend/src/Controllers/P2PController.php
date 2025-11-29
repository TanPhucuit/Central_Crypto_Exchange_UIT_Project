<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\P2POrder;
use App\Models\User;
use App\Models\Wallet;
use App\Models\BankAccount;
use App\Models\AccountTransaction;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class P2PController
{
    public function listOrders(Request $request, ResponseInterface $response): ResponseInterface
    {
        $p2pModel = new P2POrder();
        $orders = $p2pModel->getOpenOrders(50);

        return Response::success($response, $orders);
    }

    public function myOrders(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $p2pModel = new P2POrder();
        $orders = $p2pModel->getByUserId($userId);

        return Response::success($response, $orders);
    }

    public function createOrder(Request $request, ResponseInterface $response): ResponseInterface
    {
        $data = $request->getParsedBody();

        if (empty($data['user_id'])) {
            return Response::error($response, 'user_id is required', 400);
        }

        if (empty($data['type']) || empty($data['unit_numbers']) || empty($data['merchant_id'])) {
            return Response::error($response, 'Type, unit_numbers and merchant_id are required', 400);
        }

        if (!in_array($data['type'], ['buy', 'sell'])) {
            return Response::error($response, 'Invalid type', 400);
        }

        // Validate merchant exists
        $userModel = new User();
        $merchant = $userModel->findById($data['merchant_id']);
        if (!$merchant || $merchant['role'] !== 'merchant') {
            return Response::error($response, 'Invalid merchant', 400);
        }

        // Create P2P order with open state
        $p2pModel = new P2POrder();
        $orderId = $p2pModel->create([
            'user_id' => $data['user_id'],
            'type' => $data['type'],
            'unit_numbers' => $data['unit_numbers'],
            'merchant_id' => $data['merchant_id'],
            'state' => 'open'
        ]);

        if (!$orderId) {
            return Response::error($response, 'Failed to create order', 500);
        }

        $order = $p2pModel->findById($orderId);
        return Response::success($response, $order, 'Order created', 201);
    }

    public function cancelOrder(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;
        $orderId = (int)$args['id'];

        if (!$userId) {
            return Response::error($response, 'user_id is required', 400);
        }

        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order) {
            return Response::error($response, 'Order not found', 404);
        }

        if ($order['user_id'] != $userId) {
            return Response::error($response, 'Unauthorized', 403);
        }

        if ($order['state'] !== 'open') {
            return Response::error($response, 'Can only cancel open orders', 400);
        }

        // Update order state to cancelled
        $p2pModel->updateState($orderId, 'cancelled');

        return Response::success($response, ['order_id' => $orderId], 'Order cancelled');
    }

    public function transferPayment(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = $request->getParsedBody();
        $orderId = (int)$args['id'];
        $userId = $data['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id is required', 400);
        }

        if (empty($data['source_account']) || empty($data['amount'])) {
            return Response::error($response, 'source_account and amount are required', 400);
        }

        $amount = floatval($data['amount']);
        if ($amount <= 0) {
            return Response::error($response, 'amount must be greater than 0', 400);
        }

        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order) {
            return Response::error($response, 'Order not found', 404);
        }

        if ($order['user_id'] != $userId) {
            return Response::error($response, 'Unauthorized', 403);
        }

        if ($order['state'] !== 'open') {
            return Response::error($response, 'Order is not in open state', 400);
        }

        // Get user and merchant bank accounts
        $bankModel = new BankAccount();
        $sourceAccount = $bankModel->findByAccountNumber($data['source_account']);
        if (!$sourceAccount || $sourceAccount['user_id'] != $userId) {
            return Response::error($response, 'Invalid source bank account', 400);
        }

        if (floatval($sourceAccount['account_balance']) < $amount) {
            return Response::error($response, 'Insufficient bank account balance', 400);
        }

        $merchantAccounts = $bankModel->getByUserId($order['merchant_id']);
        
        if (empty($merchantAccounts)) {
            return Response::error($response, 'Merchant has no bank account', 400);
        }

        // Use first bank account or default one
        $merchantAccount = $merchantAccounts[0];

        // Create account transaction
        $txModel = new AccountTransaction();
        $transactionId = $txModel->create([
            'source_account_number' => $data['source_account'],
            'destination_account_number' => $merchantAccount['account_number'],
            'amount' => $amount,
            'transaction_type' => 'p2p_payment',
            'description' => 'P2P Order #' . $orderId . ' - Payment to merchant'
        ]);

        if (!$transactionId) {
            return Response::error($response, 'Failed to create transaction', 500);
        }

        // Update account balances
        $bankModel->updateBalance($sourceAccount['account_number'], -$amount);
        $bankModel->updateBalance($merchantAccount['account_number'], $amount);

        // Update order state to matched (waiting for merchant confirmation)
        $p2pModel->updateState($orderId, 'matched');

        return Response::success($response, [
            'order_id' => $orderId,
            'transaction_id' => $transactionId,
            'merchant_account' => $merchantAccount['account_number']
        ], 'Payment transferred, waiting for merchant confirmation');
    }

    public function confirmAndRelease(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = $request->getParsedBody();
        $orderId = (int)$args['id'];
        $merchantId = $data['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order) {
            return Response::error($response, 'Order not found', 404);
        }

        if ($order['merchant_id'] != $merchantId) {
            return Response::error($response, 'Unauthorized - not order merchant', 403);
        }

        if ($order['state'] !== 'matched') {
            return Response::error($response, 'Order is not in matched state', 400);
        }

        // Transfer USDT from merchant wallet to user wallet
        $walletModel = new Wallet();
        
        // Get merchant spot wallet
        $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
        if (!$merchantWallet) {
            return Response::error($response, 'Merchant spot wallet not found', 400);
        }

        $orderAmount = floatval($order['unit_numbers']);
        $merchantBalance = floatval($merchantWallet['balance']);
        if ($merchantBalance < $orderAmount) {
            return Response::error($response, 'Insufficient merchant USDT balance', 400);
        }

        // Get user spot wallet (create if not exists)
        $userWallet = $walletModel->getByUserIdAndType($order['user_id'], 'spot');
        if (!$userWallet) {
            $newWalletId = $walletModel->create([
                'user_id' => $order['user_id'],
                'type' => 'spot',
                'balance' => 0,
                'symbol' => 'USDT'
            ]);

            if (!$newWalletId) {
                return Response::error($response, 'Failed to create user wallet', 500);
            }

            $userWallet = $walletModel->findById($newWalletId);
        }

        $userBalance = floatval($userWallet['balance']);

        // Deduct from merchant
        $newMerchantBalance = $merchantBalance - $orderAmount;
        $walletModel->setBalance($merchantWallet['wallet_id'], $newMerchantBalance);
        $walletModel->updatePropertyBalance($merchantWallet['wallet_id'], 'USDT', $newMerchantBalance);

        // Add to user
        $newUserBalance = $userBalance + $orderAmount;
        $walletModel->setBalance($userWallet['wallet_id'], $newUserBalance);
        $walletModel->updatePropertyBalance($userWallet['wallet_id'], 'USDT', $newUserBalance);

        // Update order state to filled
        $p2pModel->updateState($orderId, 'filled');

        return Response::success($response, [
            'order_id' => $orderId,
            'user_balance' => $newUserBalance,
            'merchant_balance' => $newMerchantBalance
        ], 'Order completed successfully');
    }

    public function updateOrder(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $user = $request->getAttribute('user');
        $orderId = (int)$args['id'];
        $data = $request->getParsedBody();

        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order || $order['user_id'] != $user->user_id) {
            return Response::error($response, 'Order not found', 404);
        }

        if (!empty($data['state'])) {
            $p2pModel->updateState($orderId, $data['state']);
        }

        $updatedOrder = $p2pModel->findById($orderId);
        return Response::success($response, $updatedOrder, 'Order updated');
    }

    public function listMerchants(Request $request, ResponseInterface $response): ResponseInterface
    {
        $userModel = new User();
        $merchants = $userModel->getMerchants();
        
        return Response::success($response, $merchants);
    }
}
