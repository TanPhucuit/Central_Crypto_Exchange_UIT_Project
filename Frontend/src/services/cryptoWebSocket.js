// WebSocket Service for Real-time Crypto Price Data
class CryptoWebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnecting = false;
  }

  // Connect to Binance WebSocket API (free, no auth required)
  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('WebSocket connection in progress');
      return;
    }

    this.isConnecting = true;

    try {
      // Binance WebSocket streams for multiple symbols
      const symbols = ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt', 'adausdt'];
      const streams = symbols.map(s => `${s}@ticker`).join('/');
      
      this.ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to Binance');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.stream && data.data) {
            const ticker = data.data;
            const symbol = ticker.s; // e.g., "BTCUSDT"
            
            const priceData = {
              symbol: symbol,
              price: parseFloat(ticker.c), // Current price
              change24h: parseFloat(ticker.p), // 24h price change
              changePercent24h: parseFloat(ticker.P), // 24h price change percent
              high24h: parseFloat(ticker.h), // 24h high
              low24h: parseFloat(ticker.l), // 24h low
              volume24h: parseFloat(ticker.v), // 24h volume
              timestamp: ticker.E, // Event time
            };

            // Notify all subscribers
            this.notifySubscribers(symbol, priceData);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnecting = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  // Subscribe to price updates for a specific symbol
  subscribe(symbol, callback) {
    const normalizedSymbol = symbol.toUpperCase();
    
    if (!this.subscribers.has(normalizedSymbol)) {
      this.subscribers.set(normalizedSymbol, new Set());
    }
    
    this.subscribers.get(normalizedSymbol).add(callback);

    // Ensure WebSocket is connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(symbol, callback);
    };
  }

  // Unsubscribe from price updates
  unsubscribe(symbol, callback) {
    const normalizedSymbol = symbol.toUpperCase();
    
    if (this.subscribers.has(normalizedSymbol)) {
      this.subscribers.get(normalizedSymbol).delete(callback);
      
      if (this.subscribers.get(normalizedSymbol).size === 0) {
        this.subscribers.delete(normalizedSymbol);
      }
    }
  }

  // Notify all subscribers for a symbol
  notifySubscribers(symbol, data) {
    if (this.subscribers.has(symbol)) {
      this.subscribers.get(symbol).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
    this.reconnectAttempts = 0;
  }

  // Get connection status
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create singleton instance
const cryptoWebSocket = new CryptoWebSocketService();

export default cryptoWebSocket;
