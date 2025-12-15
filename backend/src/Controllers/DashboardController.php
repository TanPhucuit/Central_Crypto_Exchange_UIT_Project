<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Wallet;

// use App\Models\Property;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class DashboardController
{
    /**
     * Get dashboard summary with calculated total assets
     */
    public function getSummary(Request $request, ResponseInterface $response): ResponseInterface
    {
        $queryParams = $request->getQueryParams();
        $userId = $queryParams['user_id'] ?? null;

        if (!$userId) {
            return Response::error($response, 'user_id parameter is required', 400);
        }

        $walletModel = new Wallet();
        // $propertyModel = new Property();
        
        // 1. Wallets & Assets
        $wallets = $walletModel->getByUserId($userId);
        
        $totalUsdtBalance = 0;
        $spotAssets = [];
        $futureWalletId = null;

        foreach ($wallets as $wallet) {
            $totalUsdtBalance += floatval($wallet['balance'] ?? 0);
            
            if ($wallet['type'] === 'spot') {
                 $propertyModel = new \App\Models\Property();
                 $assets = $propertyModel->getByWalletId($wallet['wallet_id']);
                 // Filter out zero items
                 $spotAssets = array_values(array_filter($assets, fn($a) => floatval($a['unit_number']) > 0));
                 error_log("[Dashboard] Wallet {$wallet['wallet_id']} has " . count($spotAssets) . " spot assets.");
            } elseif ($wallet['type'] === 'future') {
                $futureWalletId = $wallet['wallet_id'];
            }
        }

        // 2. Future Stats
        $futureClosedProfit = 0;
        $futureOpenPositions = [];
        
        if ($futureWalletId) {
            $futureOrderModel = new \App\Models\FutureOrder();
            // Assuming we have methods or can add them. 
            // For now, we fetch all orders and calculate manually if model methods don't exist
            // But better to expect them or add them.
            // Let's use raw query here for speed if methods absent, or try to use existing.
            // Existing: getByWalletId(limit 50). We probably need ALL history for total profit?
            // Let's assume a simplified approach: fetch open and fetch stats.
            
            // Open Positions
            $futureOpenPositions = $futureOrderModel->getOpenOrders($futureWalletId);
            
            // Closed Orders (for chart)
            $futureClosedOrders = $futureOrderModel->getClosedOrders($futureWalletId);
            
            // Closed Profit (for stats)
            $futureClosedProfit = $futureOrderModel->getTotalClosedProfit($futureWalletId);
        }

        return Response::success($response, [
            'total_usdt_balance' => $totalUsdtBalance,
            'spot_assets' => $spotAssets, // Frontend calculates value & PnL based on live price
            'future_wallet_id' => $futureWalletId,
            'future_open_positions' => $futureOpenPositions, // Frontend calculates PnL based on live price
            'future_closed_orders' => $futureClosedOrders ?? [], // For chart
            'future_closed_profit' => $futureClosedProfit,
        ]);
    }
}
