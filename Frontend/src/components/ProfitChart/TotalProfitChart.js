import React, { useState, useEffect } from 'react';
import binanceAPI from '../../services/binanceAPI';
import ProfitChart from './ProfitChart';

const EMPTY_ARRAY = [];

const TotalProfitChart = ({ spotHoldings = EMPTY_ARRAY, futurePositions = EMPTY_ARRAY, futureHistory = EMPTY_ARRAY }) => {
    const [chartData, setChartData] = useState([]);
    useEffect(() => {
        const calculateData = async () => {
            try {
                const limit = 30;
                const interval = '1d';

                // --- 1. Prepare Spot Data ---
                const spotSymbols = [...new Set(spotHoldings.map(h => h.symbol))].filter(s => s !== 'USDT');

                // --- 2. Prepare Future Data ---
                const futureSymbols = [...new Set(futurePositions.map(p => p.symbol))];

                // --- 3. Fetch All Prices ---
                const allSymbols = [...new Set([...spotSymbols, ...futureSymbols])];
                const historicalPrices = {};

                await Promise.all(
                    allSymbols.map(async (symbol) => {
                        const pair = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
                        const klines = await binanceAPI.getKlines(pair, interval, limit);
                        historicalPrices[symbol] = klines;
                    })
                );

                // --- 4. Calculate Daily Totals ---
                // Use a reference symbol for timestamps (or generate dates)
                const today = new Date();
                const dates = [];
                for (let i = limit - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    dates.push({
                        dateStr: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                        timestamp: d.getTime() // Approximate
                    });
                }

                // Pre-calculate Cumulative Realized Future PnL
                const dailyRealizedPnL = {};
                dates.forEach(d => dailyRealizedPnL[d.dateStr] = 0);

                futureHistory.forEach(tx => {
                    if (tx.realized_pnl) {
                        const date = new Date(tx.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        if (dailyRealizedPnL[date] !== undefined) {
                            dailyRealizedPnL[date] += parseFloat(tx.realized_pnl);
                        }
                    }
                });

                let cumulativeRealized = 0;
                const realizedByDate = {};
                dates.forEach(d => {
                    cumulativeRealized += dailyRealizedPnL[d.dateStr];
                    realizedByDate[d.dateStr] = cumulativeRealized;
                });

                // Combine everything
                const finalData = dates.map((dateObj, index) => {
                    let spotPnL = 0;
                    let futureUnrealizedPnL = 0;
                    const dateStr = dateObj.dateStr;

                    // Spot PnL
                    spotHoldings.forEach(asset => {
                        if (asset.symbol === 'USDT') return;
                        const klines = historicalPrices[asset.symbol];
                        // Use index (assuming aligned)
                        const kline = klines ? klines[index] : null;
                        if (kline) {
                            const price = kline.close;
                            const avg = parseFloat(asset.average_buy_price || 0);
                            const bal = parseFloat(asset.unit_number || 0);
                            spotPnL += (price - avg) * bal;
                        }
                    });

                    // Future Unrealized PnL
                    futurePositions.forEach(pos => {
                        const klines = historicalPrices[pos.symbol];
                        const kline = klines ? klines[index] : null;
                        if (kline) {
                            const price = kline.close;
                            const entry = parseFloat(pos.entry_price);

                            if (entry > 0) {
                                const margin = parseFloat(pos.margin || 0);
                                const leverage = parseFloat(pos.leverage || 1);
                                const positionSize = parseFloat(pos.position_size) || (margin * leverage);

                                const sideMultiplier = (pos.side === 'buy' || pos.side === 'long') ? 1 : -1;

                                // PnL = ((Price - Entry) / Entry) * PositionSize * SideMultiplier
                                const pnl = ((price - entry) / entry) * positionSize * sideMultiplier;

                                if (!isNaN(pnl)) {
                                    futureUnrealizedPnL += pnl;
                                }
                            }
                        }
                    });

                    const totalFuturePnL = realizedByDate[dateStr] + futureUnrealizedPnL;

                    return {
                        time: dateStr,
                        value: parseFloat((spotPnL + totalFuturePnL).toFixed(2))
                    };
                });

                setChartData(finalData);

            } catch (err) {
                console.error('Error calculating total profit chart:', err);
            }
        };

        calculateData();
    }, [spotHoldings, futurePositions, futureHistory]);

    return (
        <ProfitChart
            data={chartData}
            title="Tổng Lợi Nhuận (Spot + Futures)"
            color="#8b5cf6"
        />
    );
};

export default TotalProfitChart;
