import React, { useState, useEffect } from 'react';
import binanceAPI from '../../services/binanceAPI';
import ProfitChart from './ProfitChart';

const EMPTY_ARRAY = [];

const FutureProfitChart = ({ openPositions = EMPTY_ARRAY, history = EMPTY_ARRAY }) => {
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const calculateData = async () => {
            setLoading(true);
            try {
                // 1. Process Realized PnL from History
                // Group by day
                const dailyRealizedPnL = {};
                const today = new Date();
                const limit = 30;

                // Initialize last 30 days with 0
                for (let i = limit - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    dailyRealizedPnL[dateStr] = 0;
                }

                history.forEach(tx => {
                    if (tx.realized_pnl) {
                        const date = new Date(tx.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        if (dailyRealizedPnL[date] !== undefined) {
                            dailyRealizedPnL[date] += parseFloat(tx.realized_pnl);
                        }
                    }
                });

                // Convert to cumulative array
                const dates = Object.keys(dailyRealizedPnL);
                let cumulativeRealized = 0;
                const realizedData = dates.map(date => {
                    cumulativeRealized += dailyRealizedPnL[date];
                    return { date, realized: cumulativeRealized };
                });

                // 2. Process Unrealized PnL for Open Positions (Hypothetical history)
                // For simplicity, we'll just add the CURRENT unrealized PnL to the LAST data point
                // Because calculating historical unrealized PnL requires fetching historical prices for all open positions
                // which is expensive and maybe inaccurate if positions changed.
                // However, the user asked for "based on entry_price and historical price".
                // Let's try to fetch historical prices for open positions.

                const openSymbols = [...new Set(openPositions.map(p => p.symbol))];
                const historicalPrices = {};

                if (openSymbols.length > 0) {
                    await Promise.all(
                        openSymbols.map(async (symbol) => {
                            // Ensure symbol format for Binance (e.g. BTCUSDT)
                            const pair = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
                            const klines = await binanceAPI.getKlines(pair, '1d', limit);
                            historicalPrices[symbol] = klines;
                        })
                    );
                }

                // Combine Realized + Unrealized
                const finalData = realizedData.map((dayData, index) => {
                    let unrealizedPnL = 0;

                    // For each open position, calculate PnL at this day's closing price
                    openPositions.forEach(pos => {
                        const klines = historicalPrices[pos.symbol];
                        // We need to map the date string back to an index or find the kline
                        // Since we initialized dates based on 'limit' days ago, and fetched 'limit' klines,
                        // indices should roughly match.
                        // A safer way is matching timestamps, but let's use index for now as they are both "last 30 days".
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
                                    unrealizedPnL += pnl;
                                }
                            }
                        }
                    });

                    return {
                        time: dayData.date,
                        value: parseFloat((dayData.realized + unrealizedPnL).toFixed(2))
                    };
                });

                setChartData(finalData);

            } catch (err) {
                console.error('Error calculating future profit chart:', err);
            } finally {
                setLoading(false);
            }
        };

        calculateData();
    }, [openPositions, history]);

    if (loading) return <div className="chart-loading">Đang tải biểu đồ...</div>;
    // if (chartData.length === 0) return <div className="chart-empty">Không có dữ liệu biểu đồ</div>;

    return (
        <ProfitChart
            data={chartData}
            title="Lợi nhuận Futures (Tổng hợp)"
            color="#f43f5e"
        />
    );
};

export default FutureProfitChart;
