<?php

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Helpers\Response;
use App\Models\P2POrder;
use App\Models\BankAccount;
use App\Models\AccountTransaction;

class MerchantController
{
    /**
     * Get merchant dashboard statistics
     */
    public function getDashboardStats(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $merchantId = $queryParams['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        try {
            $p2pModel = new P2POrder();
            
            // Get total orders
            $totalOrders = $p2pModel->getTotalOrdersByMerchant($merchantId);
            
            // Get completed orders
            $completedOrders = $p2pModel->getCompletedOrdersByMerchant($merchantId);
            
            // Calculate completion rate
            $completionRate = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 2) : 0;
            
            // Get total trading volume
            $totalVolume = $p2pModel->getTotalVolumeByMerchant($merchantId);

            $stats = [
                'total_orders' => $totalOrders,
                'completed_orders' => $completedOrders,
                'completion_rate' => $completionRate,
                'total_volume' => $totalVolume
            ];

            return Response::success($response, $stats, 'Dashboard statistics retrieved');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to get dashboard statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get all P2P orders for merchant
     */
    public function getMerchantOrders(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $merchantId = $queryParams['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        try {
            $p2pModel = new P2POrder();
            $orders = $p2pModel->getOrdersByMerchant($merchantId);

            // Check payment status for each order based on state
            // state = 'matched' means user has transferred money
            // state = 'open' means waiting for payment
            // state = 'filled' means completed (merchant released USDT)
            // state = 'cancelled' means cancelled
            foreach ($orders as &$order) {
                $order['payment_status'] = match($order['state']) {
                    'matched' => 'paid',
                    'filled' => 'completed',
                    'cancelled' => 'cancelled',
                    default => 'pending'
                };
            }

            return Response::success($response, $orders, 'Merchant orders retrieved');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to get merchant orders: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get merchant bank accounts
     */
    public function getBankAccounts(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $merchantId = $queryParams['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        try {
            $bankModel = new BankAccount();
            $accounts = $bankModel->getByUserId($merchantId);

            return Response::success($response, $accounts, 'Bank accounts retrieved');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to get bank accounts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get transaction history for merchant
     */
    public function getTransactionHistory(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $merchantId = $queryParams['merchant_id'] ?? null;

        if (!$merchantId) {
            return Response::error($response, 'merchant_id is required', 400);
        }

        try {
            $bankModel = new BankAccount();
            $merchantAccounts = $bankModel->getByUserId($merchantId);
            
            if (empty($merchantAccounts)) {
                return Response::success($response, [], 'No transactions found');
            }

            // Extract account numbers
            $accountNumbers = array_column($merchantAccounts, 'account_number');

            $txModel = new AccountTransaction();
            $transactions = $txModel->getByAccountNumbers($accountNumbers);

            return Response::success($response, $transactions, 'Transaction history retrieved');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to get transaction history: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Set default bank account
     */
    public function setDefaultBankAccount(Request $request, ResponseInterface $response, array $args): ResponseInterface
    {
        $data = $request->getParsedBody();
        $merchantId = $data['merchant_id'] ?? null;
        $accountNumber = $data['account_number'] ?? null;

        if (!$merchantId || !$accountNumber) {
            return Response::error($response, 'merchant_id and account_number are required', 400);
        }

        try {
            $bankModel = new BankAccount();
            
            // Verify account belongs to merchant
            $account = $bankModel->getByAccountNumber($accountNumber);
            if (!$account || $account['user_id'] != $merchantId) {
                return Response::error($response, 'Invalid account', 403);
            }

            // TODO: Implement default account logic in database or user preferences
            // For now, just return success
            return Response::success($response, ['account_number' => $accountNumber], 'Default account set');
        } catch (\Exception $e) {
            return Response::error($response, 'Failed to set default account: ' . $e->getMessage(), 500);
        }
    }
}
