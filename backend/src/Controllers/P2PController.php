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

        if (empty($data['unit_numbers']) || empty($data['merchant_id']) || empty($data['type'])) {
             // Frontend sends 'unit_numbers' (crypto qty) and 'type' (buy/sell)
             return Response::error($response, 'unit_numbers, merchant_id and type are required', 400);
        }

        // Validate type
        if (!in_array($data['type'], ['buy', 'sell'])) {
            return Response::error($response, 'type must be buy or sell', 400);
        }

        // Validate merchant exists
        $userModel = new User();
        $merchant = $userModel->findById($data['merchant_id']);
        if (!$merchant || $merchant['role'] !== 'merchant') {
            return Response::error($response, 'Invalid merchant', 400);
        }
        
        $price = (float)($merchant['usdt_price'] ?? 1.0); // Default to 1 if not set
        $amount = (float)$data['unit_numbers']; // Crypto Amount

        // Create P2P order with pending status
        $p2pModel = new P2POrder();
        $orderId = $p2pModel->create([
            'user_id' => $data['user_id'],
            'merchant_id' => $data['merchant_id'],
            'amount' => $amount, 
            'price' => $price,
            'type' => $data['type'], // buy or sell from user perspective
            'status' => 'pending'
        ]);

        if (!$orderId) {
            return Response::error($response, 'Failed to create order', 500);
        }

        $order = $p2pModel->findById($orderId);
        // Add compat fields for frontend which might expect 'state', 'order_id', 'unit_numbers', 'type'
        $order['state'] = $order['status'];
        $order['order_id'] = $order['p2p_order_id'];
        $order['unit_numbers'] = $order['amount'];
        $order['type'] = $data['type'] ?? 'buy';
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

        if ($order['status'] !== 'pending') {
            return Response::error($response, 'Can only cancel pending orders', 400);
        }

        // Update order status to cancelled
        $p2pModel->updateStatus($orderId, 'cancelled');

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

        $amount = floatval($data['amount']); // Fiat Amount transferred
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

        if ($order['status'] !== 'pending') {
            return Response::error($response, 'Order is not in pending state', 400);
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

        $merchantAccount = $merchantAccounts[0]; // Use first

        // Create account transaction (bank transfer from user to merchant)
        $txModel = new AccountTransaction();
        $transactionId = $txModel->create([
            'source_account_number' => $data['source_account'],
            'target_account_number' => $merchantAccount['account_number'],
            'transaction_amount' => $amount
        ]);

        if (!$transactionId) {
            return Response::error($response, 'Failed to create transaction', 500);
        }

        // Update bank balances
        $bankModel->updateBalance($sourceAccount['account_number'], -$amount);
        $bankModel->updateBalance($merchantAccount['account_number'], $amount);

        // Link transaction to order and update status to 'banked' (payment transferred, waiting for confirmation)
        $p2pModel->linkTransaction($orderId, $transactionId);
        $p2pModel->updateStatus($orderId, 'banked');

        return Response::success($response, [
            'order_id' => $orderId,
            'transaction_id' => $transactionId,
            'merchant_account' => $merchantAccount['account_number']
        ], 'Payment transferred, waiting for merchant confirmation');
    }

    public function merchantTransferPayment(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = $request->getParsedBody();
        $orderId = (int)$args['id'];
        $merchantId = $data['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        if (empty($data['source_account']) || empty($data['amount'])) {
            return Response::error($response, 'source_account and amount are required', 400);
        }

        $amount = floatval($data['amount']); // VND amount
        if ($amount <= 0) {
            return Response::error($response, 'amount must be greater than 0', 400);
        }

        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order) {
            return Response::error($response, 'Order not found', 404);
        }

        if ($order['merchant_id'] != $merchantId) {
            return Response::error($response, 'Unauthorized - not order merchant', 403);
        }

        if ($order['type'] !== 'sell') {
            return Response::error($response, 'This endpoint is only for sell orders', 400);
        }

        if ($order['status'] !== 'pending') {
            return Response::error($response, 'Order is not in pending state', 400);
        }

        // Get merchant and user bank accounts
        $bankModel = new BankAccount();
        $merchantAccount = $bankModel->findByAccountNumber($data['source_account']);
        
        if (!$merchantAccount || $merchantAccount['user_id'] != $merchantId) {
            return Response::error($response, 'Invalid merchant bank account', 400);
        }

        if (floatval($merchantAccount['account_balance']) < $amount) {
            return Response::error($response, 'Insufficient merchant bank balance', 400);
        }

        $userAccounts = $bankModel->getByUserId($order['user_id']);
        
        if (empty($userAccounts)) {
            return Response::error($response, 'User has no bank account', 400);
        }

        $userAccount = $userAccounts[0]; // Use first account

        // Create account transaction (bank transfer from merchant to user)
        $txModel = new AccountTransaction();
        $transactionId = $txModel->create([
            'source_account_number' => $data['source_account'],
            'target_account_number' => $userAccount['account_number'],
            'transaction_amount' => $amount
        ]);

        if (!$transactionId) {
            return Response::error($response, 'Failed to create transaction', 500);
        }

        // Update bank balances
        $bankModel->updateBalance($merchantAccount['account_number'], -$amount);
        $bankModel->updateBalance($userAccount['account_number'], $amount);

        // Link transaction to order and update status to 'banked'
        $p2pModel->linkTransaction($orderId, $transactionId);
        $p2pModel->updateStatus($orderId, 'banked');

        return Response::success($response, [
            'order_id' => $orderId,
            'transaction_id' => $transactionId,
            'user_account' => $userAccount['account_number']
        ], 'Payment transferred to user, waiting for user confirmation');
    }

    public function confirmAndRelease(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = $request->getParsedBody();
        $orderId = (int)$args['id'];
        $userId = $data['user_id'] ?? null;
        
        $p2pModel = new P2POrder();
        $order = $p2pModel->findById($orderId);

        if (!$order) {
            return Response::error($response, 'Order not found', 404);
        }

        $orderType = $order['type'] ?? 'buy';
        
        // IMPORTANT: Get merchant_id from ORDER, not from request!
        // This prevents user from sending wrong merchant_id
        $merchantId = $order['merchant_id'];
        
        if (!$merchantId) {
            return Response::error($response, 'Order has no merchant_id', 400);
        }
        
        // Verify authorization based on order type
        if ($orderType === 'buy') {
            // Buy order: merchant confirms and releases USDT to user
            $requestMerchantId = $data['merchant_id'] ?? null;
            if (!$requestMerchantId) {
                return Response::error($response, 'merchant_id is required in request', 400);
            }
            if ($merchantId != $requestMerchantId) {
                return Response::error($response, 'Unauthorized - not order merchant', 403);
            }
        } else {
            // Sell order: user confirms receiving money and releases USDT to merchant
            if (!$userId) {
                return Response::error($response, 'user_id is required', 400);
            }
            if ($order['user_id'] != $userId) {
                return Response::error($response, 'Unauthorized - not order owner', 403);
            }
            // For sell orders, use merchant_id from ORDER (already set above)
            error_log("SELL ORDER: Using merchant_id from order: " . $merchantId);
        }

        // For sell orders, allow confirmation from pending or banked state
        // For buy orders, must be in banked state (payment transferred)
        $validStates = ($orderType === 'sell') ? ['pending', 'banked'] : ['banked'];
        if (!in_array($order['status'], $validStates)) {
            return Response::error($response, 'Order is not in valid state for confirmation', 400);
        }
        
        if (empty($order['transaction_id']) && $order['status'] === 'banked') {
             // Transaction ID should be present if payment was transferred
             // For buy orders: user transfers VND first, then merchant confirms
             // For sell orders: merchant transfers VND first, then user confirms
        }

        // Get order type to determine flow
        $orderType = $order['type'] ?? 'buy'; // buy or sell from user perspective
        $walletModel = new Wallet();
        
        if ($orderType === 'buy') {
            // USER BUYS: Merchant releases USDT to user (merchant -> user)
            // Get merchant wallet 
            $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'merchant');
            if (!$merchantWallet) {
                $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
            }

            if (!$merchantWallet) {
                return Response::error($response, 'Merchant wallet not found', 400);
            }

            $orderCryptoAmount = floatval($order['amount']);
            $merchantBalance = floatval($merchantWallet['balance']);
            
            if ($merchantBalance < $orderCryptoAmount) {
                return Response::error($response, 'Insufficient merchant balance', 400);
            }

            // Get user spot wallet
            $userWallet = $walletModel->getByUserIdAndType($order['user_id'], 'spot');
            if (!$userWallet) {
                $walletModel->create($order['user_id'], 'spot', 0);
                $userWallet = $walletModel->getByUserIdAndType($order['user_id'], 'spot');
            }

            $pdo = \App\Helpers\Database::getConnection();
            try {
                $pdo->beginTransaction();

                // Deduct from merchant
                $newMerchantBalance = $merchantBalance - $orderCryptoAmount;
                $walletModel->setBalance($merchantWallet['wallet_id'], $newMerchantBalance);

                // Add to user
                $newUserBalance = floatval($userWallet['balance']) + $orderCryptoAmount;
                $walletModel->setBalance($userWallet['wallet_id'], $newUserBalance);
                
                // Update order status
                $p2pModel->updateStatus($orderId, 'completed');

                $pdo->commit();

                return Response::success($response, [
                    'order_id' => $orderId,
                    'user_balance' => $newUserBalance,
                    'merchant_balance' => $newMerchantBalance
                ], 'Order completed successfully');

            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                return Response::error($response, 'Transaction failed: ' . $e->getMessage(), 500);
            }
            
        } else {
            // USER SELLS: User releases USDT to merchant (user -> merchant)
            error_log("=== SELL ORDER CONFIRMATION ===");
            error_log("Order ID: " . $orderId);
            error_log("User ID: " . $order['user_id']);
            error_log("Merchant ID: " . $merchantId);
            error_log("Amount: " . $order['amount']);
            
            // Get user spot wallet
            $userWallet = $walletModel->getByUserIdAndType($order['user_id'], 'spot');
            if (!$userWallet) {
                return Response::error($response, 'User wallet not found', 400);
            }

            $orderCryptoAmount = floatval($order['amount']);
            $userBalance = floatval($userWallet['balance']);
            
            error_log("User balance BEFORE: " . $userBalance);
            
            if ($userBalance < $orderCryptoAmount) {
                return Response::error($response, 'Insufficient user balance. Required: ' . $orderCryptoAmount . ', Available: ' . $userBalance, 400);
            }

            // Get merchant wallet (prefer merchant type, fallback to spot)
            $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'merchant');
            if (!$merchantWallet) {
                $merchantWallet = $walletModel->getByUserIdAndType($merchantId, 'spot');
            }
            if (!$merchantWallet) {
                return Response::error($response, 'Merchant wallet not found', 400);
            }
            
            $merchantBalanceBefore = floatval($merchantWallet['balance']);
            error_log("Merchant balance BEFORE: " . $merchantBalanceBefore);

            $pdo = \App\Helpers\Database::getConnection();
            try {
                $pdo->beginTransaction();

                // DEDUCT from user (user is SELLING, so balance goes DOWN)
                $newUserBalance = $userBalance - $orderCryptoAmount;
                $walletModel->setBalance($userWallet['wallet_id'], $newUserBalance);
                error_log("User balance AFTER: " . $newUserBalance . " (deducted " . $orderCryptoAmount . ")");

                // ADD to merchant (merchant is BUYING, so balance goes UP)
                $newMerchantBalance = $merchantBalanceBefore + $orderCryptoAmount;
                $walletModel->setBalance($merchantWallet['wallet_id'], $newMerchantBalance);
                error_log("Merchant balance AFTER: " . $newMerchantBalance . " (added " . $orderCryptoAmount . ")");
                
                // Update order status
                $p2pModel->updateStatus($orderId, 'completed');

                $pdo->commit();
                error_log("=== TRANSACTION COMMITTED ===");

                return Response::success($response, [
                    'order_id' => $orderId,
                    'user_balance' => $newUserBalance,
                    'merchant_balance' => $newMerchantBalance,
                    'amount_transferred' => $orderCryptoAmount
                ], 'Order completed successfully');

            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                error_log("=== TRANSACTION FAILED: " . $e->getMessage() . " ===");
                return Response::error($response, 'Transaction failed: ' . $e->getMessage(), 500);
            }
        }
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

        $status = $data['status'] ?? $data['state'] ?? null;
        if ($status) {
            $p2pModel->updateStatus($orderId, $status);
        }

        $updatedOrder = $p2pModel->findById($orderId);
        return Response::success($response, $updatedOrder, 'Order updated');
    }

    public function listMerchants(Request $request, ResponseInterface $response): ResponseInterface
    {
        $userModel = new User();
        $merchants = $userModel->getMerchants();
        
        // Debug
        error_log("Found " . count($merchants) . " merchants.");
        
        return Response::success($response, $merchants);
    }
}
