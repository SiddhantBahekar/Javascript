/**
 * ============================================================================
 * Experiment 12 - AJAX Service Module (ajax-api.js)
 * Covers: jQuery $.ajax(), $.getJSON(), HTTP Lifecycle hooks (beforeSend,
 *         success, error, complete), Promise patterns, Fallback simulation,
 *         and Real-Time polling mechanisms.
 * ============================================================================
 */

const AjaxService = (function ($) {
  'use strict';

  // State cache for simulation engine and sparklines
  let cachedAssets = [];
  let isSimulating = false;
  let simulatedErrorTriggered = false;

  // Primary Live Endpoint (Free Public API without required API Key)
  const LIVE_API_URL = 'https://api.coincap.io/v2/assets?limit=15';
  const FALLBACK_LOCAL_URL = 'data/sample-market.json';
  const NEWS_LOCAL_URL = 'data/market-news.json';

  /**
   * Generates realistic simulated price updates with stochastic drift (Brownian motion)
   */
  function simulateLiveTick(assets) {
    return assets.map(asset => {
      // Stochastic percentage change between -1.8% and +1.8%
      const volatility = 0.018;
      const deltaPercent = (Math.random() - 0.495) * volatility;
      const oldPrice = parseFloat(asset.priceUsd);
      const newPrice = Math.max(0.0001, oldPrice * (1 + deltaPercent));
      
      const newChange = parseFloat((parseFloat(asset.changePercent24Hr) + (deltaPercent * 10)).toFixed(2));
      const high = Math.max(asset.high24h || newPrice, newPrice);
      const low = Math.min(asset.low24h || newPrice, newPrice);

      // Append new point to sparkline, keeping 7 data points
      const sparkline = Array.isArray(asset.sparkline) ? [...asset.sparkline] : [newPrice];
      sparkline.push(parseFloat(newPrice.toFixed(newPrice < 1 ? 4 : 2)));
      if (sparkline.length > 8) sparkline.shift();

      return {
        ...asset,
        priceUsd: parseFloat(newPrice.toFixed(newPrice < 1 ? 4 : 2)),
        changePercent24Hr: newChange,
        high24h: parseFloat(high.toFixed(high < 1 ? 4 : 2)),
        low24h: parseFloat(low.toFixed(low < 1 ? 4 : 2)),
        volumeUsd24Hr: parseFloat(asset.volumeUsd24Hr || 0) * (1 + (Math.random() - 0.5) * 0.005),
        sparkline: sparkline,
        lastUpdated: new Date().toLocaleTimeString()
      };
    });
  }

  /**
   * Transform raw CoinCap API response into normalized application schema
   */
  function normalizeCoinCapData(apiData) {
    if (!apiData || !Array.isArray(apiData.data)) return [];
    return apiData.data.map(item => {
      const price = parseFloat(item.priceUsd);
      const change = parseFloat(item.changePercent24Hr);
      return {
        id: item.id,
        rank: parseInt(item.rank, 10),
        symbol: item.symbol,
        name: item.name,
        priceUsd: parseFloat(price.toFixed(price < 1 ? 4 : 2)),
        changePercent24Hr: parseFloat(change.toFixed(2)),
        marketCapUsd: parseFloat(item.marketCapUsd),
        volumeUsd24Hr: parseFloat(item.volumeUsd24Hr),
        high24h: parseFloat((price * 1.04).toFixed(price < 1 ? 4 : 2)),
        low24h: parseFloat((price * 0.96).toFixed(price < 1 ? 4 : 2)),
        sparkline: [
          price * 0.98,
          price * 0.99,
          price * 0.975,
          price * 1.01,
          price * 1.02,
          price * 0.995,
          price
        ],
        lastUpdated: new Date().toLocaleTimeString()
      };
    });
  }

  /**
   * Fetches market data using jQuery $.ajax() with comprehensive lifecycle handling
   *
   * @param {Object} options - Configuration options
   * @param {Function} options.onStart - Callback before AJAX starts
   * @param {Function} options.onSuccess - Callback on data received
   * @param {Function} options.onError - Callback on failure
   * @param {Function} options.onComplete - Callback when request finishes
   * @param {boolean} options.forceSimulation - Force fallback mode
   */
  function fetchMarketData(options = {}) {
    const startTime = performance.now();
    const settings = StorageService.getSettings();
    const forceSim = options.forceSimulation || settings.simulationMode;

    if (typeof options.onStart === 'function') {
      options.onStart();
    }

    // Check if error simulation is toggled on for lab testing
    if (simulatedErrorTriggered) {
      setTimeout(() => {
        const errorDetails = {
          status: 503,
          statusText: 'Simulated Service Unavailable (Lab Test Mode)',
          isSimulated: true
        };
        StorageService.incrementSessionMetric('errorsEncountered');
        if (typeof options.onError === 'function') {
          options.onError(errorDetails);
        }
        if (typeof options.onComplete === 'function') {
          options.onComplete({ latencyMs: 250, source: 'error-simulation' });
        }
      }, 300);
      return;
    }

    // If simulation mode is explicitly enabled or we already have cached data in simulation:
    if (forceSim && cachedAssets.length > 0) {
      setTimeout(() => {
        cachedAssets = simulateLiveTick(cachedAssets);
        const latencyMs = Math.round(performance.now() - startTime + (settings.simulateLatency ? 450 : 80));
        StorageService.incrementSessionMetric('apiCallsCount');

        if (typeof options.onSuccess === 'function') {
          options.onSuccess(cachedAssets, { source: 'simulated-engine', latencyMs });
        }
        if (typeof options.onComplete === 'function') {
          options.onComplete({ latencyMs, source: 'simulated-engine' });
        }
      }, settings.simulateLatency ? 450 : 80);
      return;
    }

    // Initiate genuine jQuery AJAX Request to Live API
    $.ajax({
      url: LIVE_API_URL,
      method: 'GET',
      dataType: 'json',
      timeout: 4500, // 4.5 seconds timeout
      beforeSend: function (jqXHR, settings) {
        // jQuery AJAX Hook: Can set custom headers or trigger loading spinners
        jqXHR.setRequestHeader('Accept', 'application/json');
      },
      success: function (response, textStatus, jqXHR) {
        const latencyMs = Math.round(performance.now() - startTime);
        const normalized = normalizeCoinCapData(response);
        cachedAssets = normalized;
        isSimulating = false;

        StorageService.incrementSessionMetric('apiCallsCount');

        if (typeof options.onSuccess === 'function') {
          options.onSuccess(normalized, {
            source: 'live-api',
            latencyMs,
            status: jqXHR.status
          });
        }
      },
      error: function (jqXHR, textStatus, errorThrown) {
        // Graceful Fallback: Fall back to local JSON or internal simulation engine
        console.warn(`[AJAX] Live API request failed (${textStatus} - ${errorThrown}). Transitioning to fallback engine.`);
        StorageService.incrementSessionMetric('errorsEncountered');

        fallbackToLocalOrSimulation(options, startTime, `${textStatus}: ${errorThrown}`);
      },
      complete: function (jqXHR, textStatus) {
        const latencyMs = Math.round(performance.now() - startTime);
        if (typeof options.onComplete === 'function') {
          options.onComplete({ latencyMs, textStatus });
        }
      }
    });
  }

  /**
   * Internal Fallback: Loads data from local sample-market.json or algorithmic simulation
   */
  function fallbackToLocalOrSimulation(options, startTime, reason) {
    if (cachedAssets.length > 0) {
      // Use existing cache with real-time drift
      cachedAssets = simulateLiveTick(cachedAssets);
      isSimulating = true;
      const latencyMs = Math.round(performance.now() - startTime);

      if (typeof options.onSuccess === 'function') {
        options.onSuccess(cachedAssets, {
          source: 'simulated-fallback',
          latencyMs,
          reason
        });
      }
      return;
    }

    // Try secondary jQuery AJAX call to local data file
    $.ajax({
      url: FALLBACK_LOCAL_URL,
      method: 'GET',
      dataType: 'json',
      timeout: 2000,
      success: function (data) {
        cachedAssets = data.map(item => ({
          ...item,
          lastUpdated: new Date().toLocaleTimeString()
        }));
        isSimulating = true;
        const latencyMs = Math.round(performance.now() - startTime);

        if (typeof options.onSuccess === 'function') {
          options.onSuccess(cachedAssets, {
            source: 'local-fallback',
            latencyMs,
            reason
          });
        }
      },
      error: function () {
        // Last-resort hardcoded seed data to guarantee 100% zero-crash operation
        const seed = getEmergencySeedData();
        cachedAssets = seed;
        isSimulating = true;
        const latencyMs = Math.round(performance.now() - startTime);

        if (typeof options.onSuccess === 'function') {
          options.onSuccess(seed, {
            source: 'emergency-seed',
            latencyMs,
            reason: 'Network and file:// restricted'
          });
        }
      }
    });
  }

  /**
   * Loads real-time market news ticker data via $.getJSON()
   */
  function fetchMarketNews(callback) {
    $.getJSON(NEWS_LOCAL_URL)
      .done(function (data) {
        if (typeof callback === 'function') callback(null, data);
      })
      .fail(function (jqxhr, textStatus, error) {
        // Fallback news items if file is inaccessible
        const fallbackNews = [
          {
            id: 'n1',
            title: 'Global Markets Digest High-Frequency Crypto Volatility',
            source: 'Nexus Intelligence',
            time: 'Just now',
            sentiment: 'bullish',
            summary: 'Institutional desks report elevated automated trading volume across spot liquidity pools.'
          },
          {
            id: 'n2',
            title: 'Algorithmic Arbitrage Activity Surges 18% Across Decentralized DEXs',
            source: 'Quant Analytics',
            time: '15m ago',
            sentiment: 'neutral',
            summary: 'On-chain telemetry reveals cross-venue price convergence efficiency.'
          }
        ];
        if (typeof callback === 'function') callback(null, fallbackNews);
      });
  }

  /**
   * Built-in hardcoded seed data ensuring zero dependencies failure
   */
  function getEmergencySeedData() {
    return [
      { id: 'bitcoin', rank: 1, symbol: 'BTC', name: 'Bitcoin', priceUsd: 91240.50, changePercent24Hr: 3.25, marketCapUsd: 1800000000000, volumeUsd24Hr: 42000000000, high24h: 92000, low24h: 88500, sparkline: [89000, 89500, 90200, 91240], lastUpdated: new Date().toLocaleTimeString() },
      { id: 'ethereum', rank: 2, symbol: 'ETH', name: 'Ethereum', priceUsd: 3140.20, changePercent24Hr: -0.85, marketCapUsd: 377000000000, volumeUsd24Hr: 18500000000, high24h: 3200, low24h: 3090, sparkline: [3180, 3160, 3130, 3140], lastUpdated: new Date().toLocaleTimeString() },
      { id: 'solana', rank: 3, symbol: 'SOL', name: 'Solana', priceUsd: 219.80, changePercent24Hr: 8.12, marketCapUsd: 103000000000, volumeUsd24Hr: 9100000000, high24h: 224, low24h: 203, sparkline: [204, 210, 215, 219.8], lastUpdated: new Date().toLocaleTimeString() },
      { id: 'ripple', rank: 4, symbol: 'XRP', name: 'XRP', priceUsd: 0.885, changePercent24Hr: 14.20, marketCapUsd: 50400000000, volumeUsd24Hr: 6500000000, high24h: 0.92, low24h: 0.77, sparkline: [0.78, 0.82, 0.85, 0.885], lastUpdated: new Date().toLocaleTimeString() },
      { id: 'binance-coin', rank: 5, symbol: 'BNB', name: 'BNB', priceUsd: 648.50, changePercent24Hr: 1.15, marketCapUsd: 94500000000, volumeUsd24Hr: 1680000000, high24h: 655, low24h: 640, sparkline: [641, 644, 646, 648.5], lastUpdated: new Date().toLocaleTimeString() }
    ];
  }

  function setSimulatedError(state) {
    simulatedErrorTriggered = state;
  }

  function isSimulatedErrorActive() {
    return simulatedErrorTriggered;
  }

  function getCachedAssetById(id) {
    return cachedAssets.find(a => a.id === id) || null;
  }

  function getAllCachedAssets() {
    return [...cachedAssets];
  }

  return {
    fetchMarketData,
    fetchMarketNews,
    setSimulatedError,
    isSimulatedErrorActive,
    getCachedAssetById,
    getAllCachedAssets
  };
})(jQuery);
