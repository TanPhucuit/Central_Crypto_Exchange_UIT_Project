# Frontend-Backend Data Mapping Guide

## 📋 Overview
This document maps every data display element in the frontend to its corresponding backend API endpoint and response field.

---

## 🔐 Authentication Pages

### LoginPage (`src/pages/Auth/LoginPage.js`)
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Login Form | `POST /api/auth/login` | `{login, password}` | `{user_id, username, email, role}` |
| Error Message | Same | - | HTTP 401 / error message |

**Current Issue**: ⚠️ Login succeeds even with wrong credentials - needs error handling fix

**Implementation Status**: ✅ Integrated (but has bug)

---

### RegisterPage (`src/pages/Auth/RegisterPage.js`)
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Register Form | `POST /api/auth/register` | `{username, email, password, full_name}` | `{user_id, username, email, role}` |

**Implementation Status**: ✅ Integrated

---

## 📊 Dashboard (`src/pages/Dashboard/DashboardPage.js`)

### Total Balance
| Display Element | Backend Endpoint | Request | Response Field | Calculation |
|----------------|------------------|---------|----------------|-------------|
| Total Balance | `GET /api/wallet?user_id={userId}` | `user_id` | `wallets[]` | Sum all `wallets[].balance * current_price` |

### Portfolio Distribution (Pie Chart)
| Display Element | Backend Endpoint | Request | Response Field | Calculation |
|----------------|------------------|---------|----------------|-------------|
| Asset Allocation | `GET /api/wallet?user_id={userId}` | `user_id` | `wallets[]` | Calculate percentage of each `wallet.balance * price` |

### Recent Transactions
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Transaction List | `GET /api/trading/spot/history?user_id={userId}&limit=5` | `user_id, limit=5` | `transactions[]` with `{symbol, type, amount, price, timestamp}` |

### Asset Holdings
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Asset List | `GET /api/wallet?user_id={userId}` | `user_id` | `wallets[]` with `{symbol, balance}` |
| Asset Properties | `GET /api/wallet/{wallet_id}/properties?user_id={userId}` | `user_id, wallet_id` | `properties[]` with `{property_type, quantity, purchase_price}` |

**Implementation Status**: ⚠️ Partially integrated - needs complete implementation

**Required Data Flow**:
```javascript
// 1. Load all wallets
const wallets = await walletAPI.getWallets(userId);

// 2. For each wallet, load properties to get actual holdings
for (const wallet of wallets) {
  const properties = await walletAPI.getWalletWithProperties(wallet.wallet_id, userId);
  // properties.data contains actual holdings
}

// 3. Calculate total balance
const totalBalance = wallets.reduce((sum, wallet) => {
  return sum + (wallet.balance * getCurrentPrice(wallet.symbol));
}, 0);
```

---

## 💼 Wallet Page (`src/pages/Wallet/WalletPage.js`)

### Wallet Balances
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Wallet List | `GET /api/wallet?user_id={userId}` | `user_id` | `wallets[]` with `{wallet_id, symbol, balance}` |
| Wallet Details | `GET /api/wallet/{wallet_id}?user_id={userId}` | `user_id, wallet_id` | `{wallet_id, symbol, balance, created_at}` |

### Holdings/Properties
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Holdings List | `GET /api/wallet/{wallet_id}/properties?user_id={userId}` | `user_id, wallet_id` | `properties[]` with `{property_id, property_type, quantity, purchase_price}` |

### Transactions History
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Spot Transactions | `GET /api/trading/spot/history?user_id={userId}&limit=10` | `user_id, limit` | `transactions[]` |
| P2P Orders | `GET /api/p2p/orders?user_id={userId}&limit=10` | `user_id, limit` | `orders[]` |
| Futures Orders | `GET /api/trading/futures/history?user_id={userId}&limit=10` | `user_id, limit` | `orders[]` |

### Actions
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Create Wallet | `POST /api/wallet` | `{user_id, symbol}` | `{wallet_id, symbol, balance}` |
| Deposit | `PUT /api/wallet/{wallet_id}` | `{user_id, balance: +amount}` | Updated wallet |
| Withdraw | `PUT /api/wallet/{wallet_id}` | `{user_id, balance: -amount}` | Updated wallet |

**Implementation Status**: ❌ Using mock data - needs complete implementation

**Current Mock Data**:
```javascript
// WRONG - Mock data
wallets: [
  { id: 1, symbol: 'BTC', balance: 0.5, value: 22500 },
  { id: 2, symbol: 'ETH', balance: 5.2, value: 10400 }
]

// CORRECT - Should load from backend
useEffect(() => {
  const loadWallets = async () => {
    const response = await walletAPI.getWallets(userId);
    setWallets(response.data);
  };
  loadWallets();
}, [userId]);
```

---

## 👤 Profile Page (`src/pages/Profile/ProfilePage.js`)

### User Information
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Username | `GET /api/user/profile?user_id={userId}` | `user_id` | `username` |
| Email | Same | `user_id` | `email` |
| Full Name | Same | `user_id` | `full_name` |
| Phone | Same | `user_id` | `phone_number` |
| Role | Same | `user_id` | `role` |
| Created At | Same | `user_id` | `created_at` |

### Profile Update
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Update Profile | `PUT /api/user/profile` | `{user_id, full_name, phone_number}` | Updated user object |
| Change Password | `PUT /api/user/password` | `{user_id, current_password, new_password}` | Success message |

**Implementation Status**: ⚠️ Reads from Redux but doesn't save to backend

**Required Implementation**:
```javascript
// Load profile on mount
useEffect(() => {
  const loadProfile = async () => {
    const response = await userAPI.getProfile(userId);
    setProfileData(response.data);
  };
  loadProfile();
}, [userId]);

// Save profile
const handleProfileUpdate = async (values) => {
  await userAPI.updateProfile(userId, values);
  // Update Redux state
  dispatch(updateUser(values));
};
```

---

## 🏦 Bank Account Page (`src/pages/BankAccount/BankAccountPage.js`)

### Bank Accounts List
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Accounts List | `GET /api/bank/accounts?user_id={userId}` | `user_id` | `accounts[]` with `{account_id, bank_name, account_number, account_name, branch}` |

### Actions
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Add Account | `POST /api/bank/accounts` | `{user_id, bank_name, account_number, account_name, branch}` | New account object |
| Delete Account | `DELETE /api/bank/accounts/{account_id}?user_id={userId}` | `user_id, account_id` | Success message |

**Implementation Status**: ❌ Using mock data - needs complete implementation

**Current Mock Data**:
```javascript
// WRONG
bankAccounts: [
  { id: 1, bankName: 'Vietcombank', accountNumber: '1234567890' }
]

// CORRECT
useEffect(() => {
  const loadBankAccounts = async () => {
    const response = await bankAPI.getAccounts(userId);
    setBankAccounts(response.data);
  };
  loadBankAccounts();
}, [userId]);
```

---

## 📈 Spot Trading Page (`src/pages/Trading/SpotTradingPage.js`)

### Available Coins List
| Display Element | Backend Endpoint | Request | Response Field | Notes |
|----------------|------------------|---------|----------------|-------|
| Coins with Prices | External API or Static | - | - | **Currently mock data - may use external price API like CoinGecko** |

### User Wallet Balances
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| USDT Balance | `GET /api/wallet?user_id={userId}` | `user_id` | Find wallet with `symbol='USDT'`, get `balance` |
| Selected Coin Balance | Same | `user_id` | Find wallet with `symbol={selectedCoin}`, get `balance` |

### Place Order
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Place Spot Order | `POST /api/trading/spot` | `{user_id, symbol, type, side, amount, price}` | Transaction object |

### Order History
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Open Orders | `GET /api/trading/spot/history?user_id={userId}&status=pending` | `user_id, status` | `transactions[]` |
| Order History | `GET /api/trading/spot/history?user_id={userId}` | `user_id` | All transactions |

**Implementation Status**: ❌ Using mock data for balances - needs integration

**Required Implementation**:
```javascript
// Load wallet balances
useEffect(() => {
  const loadBalances = async () => {
    const response = await walletAPI.getWallets(userId);
    const usdtWallet = response.data.find(w => w.symbol === 'USDT');
    setUsdtBalance(usdtWallet?.balance || 0);
  };
  loadBalances();
}, [userId]);

// Place order
const handlePlaceOrder = async () => {
  await tradingAPI.createSpotTransaction(userId, {
    symbol: selectedPair,
    type: orderType,
    side: side,
    amount: amount,
    price: price
  });
  // Reload balances
  loadBalances();
};
```

---

## 🚀 Futures Trading Page (`src/pages/Trading/FuturesTradingPage.js`)

### Available Futures Pairs
| Display Element | Backend Endpoint | Notes |
|----------------|------------------|-------|
| Futures Pairs | External API or Static | Same as Spot - mock data |

### User Balance
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| USDT Balance (Margin) | `GET /api/wallet?user_id={userId}` | `user_id` | Find USDT wallet `balance` |

### Place Futures Order
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Open Position | `POST /api/trading/futures` | `{user_id, symbol, side, amount, price, leverage}` | Order object |
| Close Position | `PUT /api/trading/futures/{order_id}/close?user_id={userId}` | `user_id, order_id` | Closed order |

### Open Positions
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Active Positions | `GET /api/trading/futures/active?user_id={userId}` | `user_id` | `orders[]` with status='open' |
| Position History | `GET /api/trading/futures/history?user_id={userId}` | `user_id` | All orders |

**Implementation Status**: ❌ Using mock data - needs complete implementation

---

## 🤝 P2P Trading Page (`src/pages/Trading/P2PTradingPage.js`)

### Available P2P Orders (Merchant Listings)
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Buy Orders | `GET /api/p2p/orders?type=sell&status=pending` | `type=sell, status=pending` | `orders[]` (Merchant sell = User buy) |
| Sell Orders | `GET /api/p2p/orders?type=buy&status=pending` | `type=buy, status=pending` | `orders[]` (Merchant buy = User sell) |

### Create P2P Order
| Action | Backend Endpoint | Request | Response |
|--------|------------------|---------|----------|
| Create Order | `POST /api/p2p/orders` | `{user_id, crypto_symbol, fiat_amount, fiat_currency, type, price_per_unit}` | Order object |
| Cancel Order | `PUT /api/p2p/orders/{order_id}?user_id={userId}` | `{user_id, status: 'cancelled'}` | Updated order |
| Complete Order | `PUT /api/p2p/orders/{order_id}?user_id={userId}` | `{user_id, status: 'completed'}` | Updated order |

### User's P2P Orders
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| My Orders | `GET /api/p2p/orders?user_id={userId}` | `user_id` | User's orders |

**Implementation Status**: ❌ Using mock merchant data - needs complete implementation

**Note**: For merchant listings, need to query all pending orders created by merchants (users with `role='merchant'`)

---

## 📊 Market Page (`src/pages/Market/MarketPage.js`)

### Market Data
| Display Element | Backend Endpoint | Notes |
|----------------|------------------|-------|
| Coin Prices | External API (CoinGecko/Binance) | **No backend endpoint - use external price API** |
| Market Stats | External API | **No backend endpoint** |

**Implementation Status**: ❌ Using mock data - should use external API like:
- CoinGecko API: `https://api.coingecko.com/api/v3/simple/price`
- Binance API: `https://api.binance.com/api/v3/ticker/24hr`

---

## 📈 PnL Analytics Page (`src/pages/Trading/PnLAnalyticsPage.js`)

### Profit/Loss Statistics
| Display Element | Backend Endpoint | Request | Calculation |
|----------------|------------------|---------|-------------|
| Total PnL | `GET /api/trading/spot/history?user_id={userId}` + `GET /api/trading/futures/history?user_id={userId}` | `user_id` | Calculate: `(sell_price - buy_price) * amount` for all closed trades |
| Today's PnL | Same | `user_id` | Filter by `timestamp >= today` |
| Win Rate | Same | `user_id` | `(profitable_trades / total_trades) * 100` |

### Transaction Breakdown
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| Spot Transactions | `GET /api/trading/spot/history?user_id={userId}` | `user_id` | `transactions[]` |
| Futures Orders | `GET /api/trading/futures/history?user_id={userId}` | `user_id` | `orders[]` |

**Implementation Status**: ❌ Using mock data - needs calculation from real transaction data

---

## 🔄 Transaction Pages

### Spot Transaction History
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| All Transactions | `GET /api/trading/spot/history?user_id={userId}` | `user_id` | `transactions[]` |
| Filtered by Symbol | `GET /api/trading/spot/history?user_id={userId}&symbol={symbol}` | `user_id, symbol` | Filtered transactions |

### Futures Transaction History
| Display Element | Backend Endpoint | Request | Response Field |
|----------------|------------------|---------|----------------|
| All Orders | `GET /api/trading/futures/history?user_id={userId}` | `user_id` | `orders[]` |
| Active Orders | `GET /api/trading/futures/active?user_id={userId}` | `user_id` | Open positions |

---

## 🔧 Implementation Priority

### 🔴 CRITICAL (Fix First)
1. **LoginPage Error Handling** - Login should reject invalid credentials
2. **WalletPage** - Load real wallet data from backend
3. **Dashboard** - Load real total balance and assets

### 🟡 HIGH (Implement Next)
4. **ProfilePage** - Save/load user data from backend
5. **BankAccountPage** - CRUD operations with backend
6. **SpotTradingPage** - Place real orders and load balances

### 🟢 MEDIUM (After Core Features)
7. **FuturesTradingPage** - Full futures trading integration
8. **P2PTradingPage** - Load merchant orders from backend
9. **PnLAnalyticsPage** - Calculate real PnL from transaction data

### 🔵 LOW (Enhancement)
10. **MarketPage** - Integrate external price API (CoinGecko/Binance)

---

## 📝 Implementation Pattern Template

For each page that needs backend integration:

```javascript
import { useAuth } from '../../hooks/useAuth';
import { walletAPI, userAPI, tradingAPI } from '../../services/api';

const YourPage = () => {
  const { userId } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await yourAPI.getData(userId);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  // 2. Handle actions
  const handleAction = async (actionData) => {
    try {
      await yourAPI.performAction(userId, actionData);
      // Reload data
      loadData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // 3. Render with loading/error states
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Render data */}
    </div>
  );
};
```

---

## 🎯 Next Steps

1. **Fix Login Bug** - Test with curl and fix error handling
2. **Create comprehensive tests** - Test each endpoint with real user data
3. **Implement WalletPage integration** - Use as template for other pages
4. **Systematic page-by-page integration** - Follow priority list above
5. **Add loading states** - Improve UX during data fetching
6. **Error handling** - Consistent error display across all pages

---

## ✅ Summary

- **Total Pages Analyzed**: 10+
- **Mock Data Pages**: 8 pages need backend integration
- **Partially Integrated**: 2 pages (Login, Dashboard)
- **Fully Integrated**: 1 page (Register)
- **Critical Issues**: 1 (Login validation bug)

**Estimated Work**: ~3-5 hours for complete frontend-backend integration following this mapping guide.
