import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import './DashboardPage.css';
import {
    FiDollarSign,
    FiTrendingUp,
    FiTrendingDown,
    FiPieChart,
    FiActivity,
    FiBarChart2,
    FiZap,
    FiShield
} from 'react-icons/fi';
import { walletAPI, tradingAPI } from '../../services/api';
import cryptoWebSocket from '../../services/cryptoWebSocket';
import TotalProfitChart from '../../components/ProfitChart/TotalProfitChart';
import FutureProfitChart from '../../components/ProfitChart/FutureProfitChart';
import SpotProfitChart from '../../components/ProfitChart/SpotProfitChart';

const DashboardPage = () => {
    const { user } = useSelector((state) => state.auth);
    const [wallets, setWallets] = useState([]);
    const [spotAssets, setSpotAssets] = useState([]);
    const [futuresPositions, setFuturesPositions] = useState([]);
    const [futuresHistory, setFuturesHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState({});

    const iconMap = {
        BTC: '₿',
        ETH: 'Ξ',
        USDT: '₮',
        BNB: 'BNB',
        SOL: 'SOL',
        XRP: 'XRP',
        ADA: 'ADA',
        DOT: 'DOT',
        DOGE: 'Ð',
        AVAX: 'AVAX',
        LTC: 'Ł',
    };

    useEffect(() => {
        loadDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // WebSocket Subscription
    useEffect(() => {
        const symbols = new Set();

        // Add spot symbols
        spotAssets.forEach(asset => {
            if (asset.symbol && asset.symbol !== 'USDT') {
                symbols.add(`${asset.symbol}USDT`);
            }
        });

        // Add futures symbols
        futuresPositions.forEach(pos => {
            if (pos.symbol) {
                symbols.add(pos.symbol.includes('USDT') ? pos.symbol : `${pos.symbol}USDT`);
            }
        });

        if (symbols.size === 0) return;

        const unsubscribers = [];
        symbols.forEach(symbol => {
            const unsub = cryptoWebSocket.subscribe(symbol, (data) => {
                setPrices(prev => ({
                    ...prev,
                    [symbol]: parseFloat(data.price)
                }));
            });
            unsubscribers.push(unsub);
        });

        return () => {
            unsubscribers.forEach(unsub => unsub && unsub());
        };
    }, [spotAssets, futuresPositions]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const userId = localStorage.getItem('user_id');

            // Load wallets first
            const walletsRes = await walletAPI.getWallets(userId);
            const walletsData = Array.isArray(walletsRes) ? walletsRes : (walletsRes.data || []);

            // Find spot and futures wallets
            const spotWallet = walletsData.find(w => w.type === 'spot');
            const futuresWallet = walletsData.find(w => w.type === 'future');

            // Load spot assets, futures positions, and futures history
            const promises = [
                Promise.resolve(walletsData)
            ];

            if (spotWallet) {
                promises.push(
                    walletAPI.getWalletWithProperties(userId, spotWallet.wallet_id)
                        .then(res => res.data?.properties || [])
                        .catch(() => [])
                );
            } else {
                promises.push(Promise.resolve([]));
            }

            promises.push(
                tradingAPI.getOpenFutures(userId)
                    .then(res => Array.isArray(res) ? res : (res.data || []))
                    .catch(() => [])
            );

            if (futuresWallet) {
                promises.push(
                    tradingAPI.getFutureHistory(userId, futuresWallet.wallet_id)
                        .then(res => Array.isArray(res) ? res : (res.data || []))
                        .catch(() => [])
                );
            } else {
                promises.push(Promise.resolve([]));
            }

            const [wallets, spotData, futuresData, historyData] = await Promise.all(promises);

            setWallets(wallets);
            setSpotAssets(spotData);
            setFuturesPositions(futuresData);
            setFuturesHistory(historyData);

            // Debug logs
            console.log('Futures Positions:', futuresData);
            console.log('Futures History:', historyData);

        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Statistics
    const stats = useMemo(() => {
        // 1. Calculate Spot Assets Value & PnL
        let spotAssetsValue = 0;
        let spotPnL = 0;

        if (Array.isArray(spotAssets)) {
            spotAssets.forEach(asset => {
                if (asset.symbol === 'USDT') return;

                const balance = parseFloat(asset.unit_number || 0);
                const avgPrice = parseFloat(asset.average_buy_price || 0);
                const pair = `${asset.symbol}USDT`;
                // Use real-time price if available, else fallback to API current_price or avgPrice
                const currentPrice = prices[pair] || parseFloat(asset.current_price || 0) || avgPrice || 0;

                const value = balance * currentPrice;
                spotAssetsValue += value;

                if (avgPrice > 0) {
                    spotPnL += (currentPrice - avgPrice) * balance;
                }
            });
        }


        // 2. Calculate Futures PnL (Unrealized + Realized)
        let futuresUnrealizedPnL = 0;
        if (Array.isArray(futuresPositions)) {
            futuresPositions.forEach(pos => {
                const pair = pos.symbol.includes('USDT') ? pos.symbol : `${pos.symbol}USDT`;
                const currentPrice = prices[pair];

                if (currentPrice && parseFloat(pos.entry_price) > 0) {
                    const entry = parseFloat(pos.entry_price);
                    const margin = parseFloat(pos.margin || 0);
                    const leverage = parseFloat(pos.leverage || 1);
                    // Use position_size if available, otherwise calculate from margin * leverage
                    const positionSize = parseFloat(pos.position_size) || (margin * leverage);

                    const sideMultiplier = (pos.side === 'buy' || pos.side === 'long') ? 1 : -1;

                    // PnL = ((Current - Entry) / Entry) * PositionSize * SideMultiplier
                    // Note: PositionSize is in USDT (Notional Value)
                    futuresUnrealizedPnL += ((currentPrice - entry) / entry) * positionSize * sideMultiplier;
                } else {
                    futuresUnrealizedPnL += parseFloat(pos.unrealized_pnl || 0);
                }
            });
        }

        let futuresRealizedPnL = 0;
        if (Array.isArray(futuresHistory)) {
            futuresHistory.forEach(tx => {
                if (tx.realized_pnl) {
                    const val = parseFloat(tx.realized_pnl);
                    if (!isNaN(val)) {
                        futuresRealizedPnL += val;
                    }
                }
            });
        }

        const futuresTotalPnL = futuresUnrealizedPnL + futuresRealizedPnL;

        // 3. Total Assets
        const spotWalletUSDT = parseFloat(wallets.find(w => w.type === 'spot')?.balance || 0);
        const futuresWalletUSDT = parseFloat(wallets.find(w => w.type === 'future')?.balance || 0);

        const totalAssets = spotWalletUSDT + futuresWalletUSDT + spotAssetsValue;

        // 4. Total Profit
        const totalProfit = spotPnL + futuresTotalPnL;

        return {
            totalAssets: isNaN(totalAssets) ? 0 : totalAssets,
            spotProfit: isNaN(spotPnL) ? 0 : spotPnL,
            futuresProfit: isNaN(futuresTotalPnL) ? 0 : futuresTotalPnL,
            totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
            spotAssetsValue
        };
    }, [wallets, spotAssets, futuresPositions, futuresHistory, prices]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const formatPercent = (value, total) => {
        if (!total || total === 0) return '0.00%';
        const percent = (value / total) * 100;
        return `${value >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-header">
                    <h1>Dashboard</h1>
                    <p className="text-secondary">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            {/* Cexora Showcase Section */}
            <div className="cexora-showcase">
                <div className="showcase-content">
                    <div className="logo-container">
                        <div className="logo-glow"></div>
                        <div className="cexora-logo">
                            <div className="logo-text">CEXORA</div>
                            <div className="logo-subtitle">Advanced Crypto Exchange</div>
                        </div>
                    </div>

                    <div className="animated-icons">
                        <div className="icon-item">
                            <FiZap className="floating-icon" />
                            <span>Lightning Fast</span>
                        </div>
                        <div className="icon-item">
                            <FiShield className="floating-icon" />
                            <span>Secure Trading</span>
                        </div>
                        <div className="icon-item">
                            <FiActivity className="floating-icon" />
                            <span>Real-time Data</span>
                        </div>
                        <div className="icon-item">
                            <FiBarChart2 className="floating-icon" />
                            <span>Advanced Charts</span>
                        </div>
                    </div>

                    <div className="showcase-stats">
                        <div className="showcase-stat">
                            <div className="stat-number">24/7</div>
                            <div className="stat-text">Trading</div>
                        </div>
                        <div className="showcase-stat">
                            <div className="stat-number">100+</div>
                            <div className="stat-text">Cryptocurrencies</div>
                        </div>
                        <div className="showcase-stat">
                            <div className="stat-number">0.1%</div>
                            <div className="stat-text">Low Fees</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <div>
                        <h1>Welcome back, {user?.username || 'Trader'}!</h1>
                        <p className="text-secondary">Here's your portfolio overview</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-cards">
                {/* Card 1: Total Assets */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Tổng Tài Sản</span>
                        <FiDollarSign className="stat-icon" />
                    </div>
                    <div className="stat-value">{formatCurrency(stats.totalAssets)}</div>
                    <div className="stat-subtext">Bao gồm Spot & Futures</div>
                </div>

                {/* Card 2: Spot Profit */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Lợi Nhuận Spot</span>
                        <FiPieChart className="stat-icon" />
                    </div>
                    <div className="stat-value">{formatCurrency(stats.spotProfit)}</div>
                    <div className={`stat-change ${stats.spotProfit >= 0 ? 'positive' : 'negative'}`}>
                        {stats.spotProfit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                    </div>
                </div>

                {/* Card 3: Futures Profit */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Lợi Nhuận Futures</span>
                        <FiActivity className="stat-icon" />
                    </div>
                    <div className="stat-value">{formatCurrency(stats.futuresProfit)}</div>
                    <div className={`stat-change ${stats.futuresProfit >= 0 ? 'positive' : 'negative'}`}>
                        {stats.futuresProfit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                    </div>
                </div>

                {/* Card 4: Total Profit */}
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-label">Tổng Lợi Nhuận</span>
                        <FiTrendingUp className="stat-icon" />
                    </div>
                    <div className="stat-value">{formatCurrency(stats.totalProfit)}</div>
                    <div className={`stat-change ${stats.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                        {stats.totalProfit >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
                    </div>
                </div>
            </div>

            {/* Profit Charts Section */}
            <div className="charts-section">
                <h2 className="section-title">Báo Cáo Lợi Nhuận</h2>
                <div className="charts-grid">
                    <div className="chart-card">
                        <h3>Lợi Nhuận Spot</h3>
                        <div className="chart-container">
                            <SpotProfitChart
                                spotHoldings={spotAssets}
                                prices={prices}
                            />
                        </div>
                    </div>
                    <div className="chart-card">
                        <h3>Lợi Nhuận Futures</h3>
                        <div className="chart-container">
                            <FutureProfitChart
                                openPositions={futuresPositions}
                                history={futuresHistory}
                            />
                        </div>
                    </div>
                    <div className="chart-card full-width">
                        <h3>Tổng Lợi Nhuận</h3>
                        <div className="chart-container">
                            <TotalProfitChart
                                spotHoldings={spotAssets}
                                futurePositions={futuresPositions}
                                futureHistory={futuresHistory}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
