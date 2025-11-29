import React, { useState, useEffect } from 'react';
import binanceAPI from '../../services/binanceAPI';
import ProfitChart from './ProfitChart';

const EMPTY_ARRAY = [];

const SpotProfitChart = ({ spotHoldings = EMPTY_ARRAY }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const calculateData = async () => {
            if (spotHoldings.length === 0) {
                setChartData([]);
                return;
            }

            try {
                const limit = 30;
                const interval = '1d';

                // 1. Prepare Spot Data
                const spotSymbols = [...new Set(spotHoldings.map(h => h.symbol))].filter(s => s !== 'USDT');

                if (spotSymbols.length === 0) {
                    setChartData([]);
                    return;
                }

                // 2. Fetch Historical Prices
                const historicalPrices = {};
                await Promise.all(
                    spotSymbols.map(async (symbol) => {
                        const pair = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
                        const klines = await binanceAPI.getKlines(pair, interval, limit);
                        historicalPrices[symbol] = klines;
                    })
                );

                // 3. Calculate Daily Spot PnL
                // Generate dates
                const today = new Date();
                const dates = [];
                for (let i = limit - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    dates.push({
                        dateStr: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                        timestamp: d.getTime()
                    });
                }

                const finalData = dates.map((dateObj, index) => {
                    let spotPnL = 0;
                    const dateStr = dateObj.dateStr;

                    spotHoldings.forEach(asset => {
                        if (asset.symbol === 'USDT') return;
                        const klines = historicalPrices[asset.symbol];
                        // Use index (assuming aligned)
                        const kline = klines ? klines[index] : null;
                        if (kline) {
                            const price = parseFloat(kline.close);
                            const avg = parseFloat(asset.average_buy_price || 0);
                            const bal = parseFloat(asset.unit_number || 0);

                            // PnL = (Current Price - Avg Buy Price) * Quantity
                            if (avg > 0) {
                                spotPnL += (price - avg) * bal;
                            }
                        }
                    });

                    return {
                        time: dateStr,
                        value: parseFloat(spotPnL.toFixed(2))
                    };
                });

                setChartData(finalData);

            } catch (err) {
                console.error('Error calculating spot profit chart:', err);
            }
        };

        calculateData();
    }, [spotHoldings]);

    return (
        <ProfitChart
            data={chartData}
            title="Lợi nhuận Spot (Ước tính)"
            color="#10b981" // Emerald-500
        />
    );
};

export default SpotProfitChart;
