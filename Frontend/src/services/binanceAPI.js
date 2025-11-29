// Binance REST API Service for Historical Candlestick Data
class BinanceAPIService {
  constructor() {
    this.baseURL = 'https://api.binance.com/api/v3';
  }

  // Get historical candlestick data
  async getKlines(symbol, interval, limit = 100) {
    try {
      const url = `${this.baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform Binance klines format to our candlestick format
      return data.map(kline => ({
        time: new Date(kline[0]).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          ...(interval.includes('d') || interval.includes('w') ? { 
            day: '2-digit',
            month: '2-digit'
          } : {})
        }),
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error('Error fetching klines:', error);
      return [];
    }
  }

  // Get klines with optional startTime/endTime (ms) for paging windows
  async getKlinesWithTime(symbol, interval, { startTime, endTime, limit = 100 } = {}) {
    try {
      const params = new URLSearchParams({ symbol, interval, limit: String(limit) });
      if (typeof startTime === 'number') params.append('startTime', String(startTime));
      if (typeof endTime === 'number') params.append('endTime', String(endTime));
      const url = `${this.baseURL}/klines?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.map(kline => ({
        time: new Date(kline[0]).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          ...(interval.includes('d') || interval.includes('w') ? { 
            day: '2-digit',
            month: '2-digit'
          } : {})
        }),
        timestamp: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));
    } catch (error) {
      console.error('Error fetching klines with time:', error);
      return [];
    }
  }

  // Convenience: get previous klines before a timestamp
  async getPreviousKlines(symbol, interval, beforeTimestamp, limit = 100) {
    const endTime = beforeTimestamp - 1;
    return this.getKlinesWithTime(symbol, interval, { endTime, limit });
  }

  // Get current price
  async getCurrentPrice(symbol) {
    try {
      const url = `${this.baseURL}/ticker/price?symbol=${symbol}`;
      const response = await fetch(url);
      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      console.error('Error fetching current price:', error);
      return null;
    }
  }

  // Get 24h ticker stats
  async get24hStats(symbol) {
    try {
      const url = `${this.baseURL}/ticker/24hr?symbol=${symbol}`;
      const response = await fetch(url);
      const data = await response.json();
      return {
        priceChange: parseFloat(data.priceChange),
        priceChangePercent: parseFloat(data.priceChangePercent),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
      };
    } catch (error) {
      console.error('Error fetching 24h stats:', error);
      return null;
    }
  }

  // Convert our timeframe to Binance interval
  timeframeToInterval(timeframe) {
    const map = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '1D': '1d',
      '1W': '1w'
    };
    return map[timeframe] || '1m';
  }
}

const binanceAPI = new BinanceAPIService();
export default binanceAPI;
