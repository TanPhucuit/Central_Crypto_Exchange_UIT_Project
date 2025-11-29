<?php

namespace App\Controllers;

use App\Helpers\Response;
use App\Models\Wallet;
use App\Models\Property;
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
        $propertyModel = new Property();
        
        // Get all wallets
        $wallets = $walletModel->getByUserId($userId);
        
        // Mock current prices (in production, này nên lấy từ API external hoặc database)
        $mockPrices = [
            'BTC' => 45000,
            'ETH' => 3000,
            'USDT' => 1,
            'BNB' => 400,
            'SOL' => 100,
            'XRP' => 0.5,
            'ADA' => 0.4,
        ];
        
        $totalAssetValue = 0;
        $spotAvailable = 0;
        $futureAvailable = 0;
        $lockedBalance = 0;
        
        $walletSummary = [];
        
        foreach ($wallets as $wallet) {
            $walletId = $wallet['wallet_id'];
            $type = $wallet['type'];
            
            // Get USDT balance
            $usdtBalance = floatval($wallet['balance'] ?? 0);
            
            // Get all coin holdings in this wallet
            $properties = $propertyModel->getByWalletId($walletId);
            
            $walletValue = $usdtBalance; // Start with USDT
            
            $holdings = [];
            foreach ($properties as $prop) {
                $symbol = $prop['symbol'];
                $unitNumbers = floatval($prop['unit_numbers'] ?? 0);
                $price = $mockPrices[$symbol] ?? 0;
                $value = $unitNumbers * $price;
                
                $walletValue += $value;
                
                $holdings[] = [
                    'symbol' => $symbol,
                    'amount' => $unitNumbers,
                    'price' => $price,
                    'value' => $value,
                ];
            }
            
            $totalAssetValue += $walletValue;
            
            // Calculate available balance (spot + future wallets USDT)
            if ($type === 'spot') {
                $spotAvailable += $usdtBalance;
            } elseif ($type === 'future') {
                $futureAvailable += $usdtBalance;
            }
            
            $walletSummary[] = [
                'wallet_id' => $walletId,
                'type' => $type,
                'usdt_balance' => $usdtBalance,
                'total_value' => $walletValue,
                'holdings' => $holdings,
            ];
        }
        
        $availableBalance = $spotAvailable + $futureAvailable;
        
        // Calculate profit/loss (mock data - should be calculated from historical data)
        $profitLoss = 0;
        $profitLossPercent = 0;
        
        $summary = [
            'total_asset_value' => $totalAssetValue,
            'available_balance' => $availableBalance,
            'spot_available' => $spotAvailable,
            'future_available' => $futureAvailable,
            'locked_balance' => $lockedBalance,
            'profit_loss' => $profitLoss,
            'profit_loss_percent' => $profitLossPercent,
            'wallets' => $walletSummary,
            'prices' => $mockPrices,
        ];
        
        return Response::success($response, $summary);
    }
}
