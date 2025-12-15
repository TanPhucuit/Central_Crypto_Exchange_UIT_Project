import React, { useState, useEffect } from 'react';
import './MerchantPricePage.css';
import { FiDollarSign, FiCheck, FiEdit2, FiSave } from 'react-icons/fi';
import { authAPI, merchantAPI } from '../../services/api';

const MerchantPricePage = () => {
    const [currentPrice, setCurrentPrice] = useState(0);
    const [newPrice, setNewPrice] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadCurrentPrice();
    }, []);

    const loadCurrentPrice = async () => {
        try {
            setLoading(true);
            const merchantId = localStorage.getItem('user_id');
            const response = await authAPI.getProfile(merchantId);

            if (response.data && response.data.usdt_price) {
                setCurrentPrice(parseFloat(response.data.usdt_price));
                setNewPrice(response.data.usdt_price);
            } else {
                setCurrentPrice(24500);
                setNewPrice('24500');
            }
        } catch (err) {
            console.error('Failed to load price:', err);
            setError('Không thể tải giá hiện tại');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePrice = async () => {
        if (!newPrice || parseFloat(newPrice) <= 0) {
            setError('Giá phải lớn hơn 0');
            setTimeout(() => setError(''), 3000);
            return;
        }

        try {
            setLoading(true);
            const merchantId = localStorage.getItem('user_id');
            await merchantAPI.updatePrice(merchantId, parseFloat(newPrice));

            setCurrentPrice(parseFloat(newPrice));
            setIsEditing(false);
            setSuccess('Cập nhật giá thành công!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Update price error:', err);
            setError(err.response?.data?.message || 'Không thể cập nhật giá');
            setTimeout(() => setError(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="merchant-price-page">
            <div className="page-header">
                <h1>Quản lý giá USDT</h1>
                <p className="text-secondary">Thiết lập giá bán USDT của bạn cho giao dịch P2P</p>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                    <button onClick={() => setError('')} className="alert-close">×</button>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <FiCheck /> {success}
                    <button onClick={() => setSuccess('')} className="alert-close">×</button>
                </div>
            )}

            <div className="price-card">
                <div className="card-header">
                    <div className="icon-wrapper">
                        <FiDollarSign size={32} />
                    </div>
                    <h2>Giá bán USDT</h2>
                </div>

                <div className="card-body">
                    {loading && !isEditing ? (
                        <div className="loading-state">
                            <p>Đang tải...</p>
                        </div>
                    ) : (
                        <>
                            {!isEditing ? (
                                <div className="price-display-section">
                                    <div className="current-price">
                                        <span className="price-value">{currentPrice.toLocaleString()}</span>
                                        <span className="currency">VND</span>
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn btn-primary"
                                    >
                                        <FiEdit2 /> Chỉnh sửa giá
                                    </button>
                                </div>
                            ) : (
                                <div className="price-edit-section">
                                    <div className="form-group">
                                        <label htmlFor="price-input">Giá mới (VND)</label>
                                        <input
                                            id="price-input"
                                            type="number"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="price-input-field"
                                            placeholder="Nhập giá mới"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="action-buttons">
                                        <button
                                            onClick={handleUpdatePrice}
                                            className="btn btn-success"
                                            disabled={loading}
                                        >
                                            <FiSave /> Lưu thay đổi
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setNewPrice(currentPrice);
                                            }}
                                            className="btn btn-secondary"
                                            disabled={loading}
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="info-box">
                                <h3>Lưu ý</h3>
                                <ul>
                                    <li>Giá này sẽ được hiển thị cho tất cả người dùng khi họ thực hiện giao dịch P2P với bạn.</li>
                                    <li>Hãy đảm bảo giá cạnh tranh để thu hút nhiều giao dịch hơn.</li>
                                    <li>Bạn có thể thay đổi giá bất cứ lúc nào.</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MerchantPricePage;
