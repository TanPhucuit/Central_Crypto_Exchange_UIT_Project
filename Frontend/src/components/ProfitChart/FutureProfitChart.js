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
                console.log('[FutureProfitChart] openPositions:', openPositions.length);
                console.log('[FutureProfitChart] history:', history.length);

                // Use closed orders from history (they have profit field)
                const closedOrders = history.filter(order => order.close_ts && order.profit !== null && order.profit !== undefined);
                console.log('[FutureProfitChart] closedOrders:', closedOrders.length);

                if (closedOrders.length === 0) {
                    // No data, show empty chart with 30 days of 0
                    const today = new Date();
                    const emptyData = [];
                    for (let i = 29; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(today.getDate() - i);
                        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        emptyData.push({ time: dateStr, value: 0 });
                    }
                    setChartData(emptyData);
                    setLoading(false);
                    return;
                }

                // Group by day and calculate cumulative profit
                const dailyProfit = {};
                const today = new Date();
                const limit = 30;

                // Initialize last 30 days with 0
                for (let i = limit - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(today.getDate() - i);
                    const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    dailyProfit[dateStr] = 0;
                }

                // Add profits from closed orders
                closedOrders.forEach(order => {
                    const closeDate = new Date(order.close_ts);
                    const dateStr = closeDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    if (dailyProfit[dateStr] !== undefined) {
                        dailyProfit[dateStr] += parseFloat(order.profit || 0);
                    }
                });

                // Convert to cumulative array
                const dates = Object.keys(dailyProfit);
                let cumulative = 0;
                const finalData = dates.map(date => {
                    cumulative += dailyProfit[date];
                    return { time: date, value: parseFloat(cumulative.toFixed(2)) };
                });

                console.log('[FutureProfitChart] finalData:', finalData);
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
