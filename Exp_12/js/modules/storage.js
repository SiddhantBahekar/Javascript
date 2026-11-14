/**
 * ============================================================================
 * Experiment 12 - Storage Service Module (storage.js)
 * Covers: Web Storage API (localStorage, sessionStorage), JSON Serialization,
 *         State Persistence, and Data Import/Export Mechanics.
 * ============================================================================
 */

const StorageService = (function () {
  'use strict';

  // Storage Keys Constants
  const STORAGE_KEYS = {
    WATCHLIST: 'nexustrade_watchlist',
    PORTFOLIO: 'nexustrade_portfolio',
    TRANSACTIONS: 'nexustrade_transactions',
    SETTINGS: 'nexustrade_settings',
    SESSION_METRICS: 'nexustrade_session_metrics',
    SESSION_STATE: 'nexustrade_session_state'
  };

  // Default initial states
  const DEFAULT_SETTINGS = {
    theme: 'dark',
    currency: 'USD',
    currencySymbols: { USD: '$', EUR: '€', INR: '₹' },
    currencyRates: { USD: 1.0, EUR: 0.92, INR: 84.4 },
    refreshInterval: 6000, // in milliseconds
    autoRefresh: true,
    viewMode: 'table', // 'table' or 'grid'
    simulationMode: false,
    simulateLatency: false
  };

  const DEFAULT_PORTFOLIO = {
    cashBalance: 100000.00, // $100,000 Paper Trading balance
    initialCapital: 100000.00,
    holdings: {
      // assetId: { quantity: number, totalCost: number, avgPrice: number }
      bitcoin: { quantity: 0.5, totalCost: 44000.00, avgPrice: 88000.00 },
      ethereum: { quantity: 4.0, totalCost: 12000.00, avgPrice: 3000.00 },
      solana: { quantity: 25.0, totalCost: 5000.00, avgPrice: 200.00 }
    }
  };

  const DEFAULT_WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'ripple'];

  /**
   * Helper: Safe JSON parser
   */
  function safeParse(jsonString, fallback) {
    if (!jsonString) return fallback;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn('Storage parsing error, falling back:', e);
      return fallback;
    }
  }

  // --- LOCAL STORAGE: Watchlist Operations ---
  function getWatchlist() {
    const data = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    if (!data) {
      setWatchlist(DEFAULT_WATCHLIST);
      return [...DEFAULT_WATCHLIST];
    }
    return safeParse(data, [...DEFAULT_WATCHLIST]);
  }

  function setWatchlist(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage:', e);
    }
  }

  function toggleWatchlist(assetId) {
    const list = getWatchlist();
    const index = list.indexOf(assetId);
    let isAdded = false;

    if (index > -1) {
      list.splice(index, 1);
      isAdded = false;
    } else {
      list.push(assetId);
      isAdded = true;
    }

    setWatchlist(list);
    return { isAdded, watchlist: list };
  }

  function isWatched(assetId) {
    return getWatchlist().includes(assetId);
  }

  // --- LOCAL STORAGE: Portfolio Operations ---
  function getPortfolio() {
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    if (!data) {
      savePortfolio(DEFAULT_PORTFOLIO);
      return JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO));
    }
    return safeParse(data, JSON.parse(JSON.stringify(DEFAULT_PORTFOLIO)));
  }

  function savePortfolio(portfolio) {
    try {
      localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(portfolio));
    } catch (e) {
      console.error('Failed to save portfolio to localStorage:', e);
    }
  }

  // --- LOCAL STORAGE: Trade Transactions Log ---
  function getTransactions() {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return safeParse(data, []);
  }

  function addTransaction(tx) {
    const transactions = getTransactions();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      ...tx
    };
    transactions.unshift(newTx); // most recent first
    if (transactions.length > 50) transactions.pop(); // keep last 50 transactions

    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed to persist transaction log:', e);
    }
    return newTx;
  }

  // --- LOCAL STORAGE: Settings Operations ---
  function getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...safeParse(data, {}) };
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to persist settings:', e);
    }
  }

  function updateSetting(key, value) {
    const settings = getSettings();
    settings[key] = value;
    saveSettings(settings);
    return settings;
  }

  // --- SESSION STORAGE: Ephemeral Session State & Metrics ---
  function initSession() {
    let session = safeParse(sessionStorage.getItem(STORAGE_KEYS.SESSION_METRICS), null);
    if (!session) {
      session = {
        sessionId: 'sess_' + Math.random().toString(36).substring(2, 9),
        startedAt: new Date().toLocaleTimeString(),
        apiCallsCount: 0,
        tradesExecuted: 0,
        errorsEncountered: 0,
        lastFilterQuery: ''
      };
      sessionStorage.setItem(STORAGE_KEYS.SESSION_METRICS, JSON.stringify(session));
    }
    return session;
  }

  function getSessionMetrics() {
    return safeParse(sessionStorage.getItem(STORAGE_KEYS.SESSION_METRICS), initSession());
  }

  function incrementSessionMetric(metricKey) {
    const session = getSessionMetrics();
    if (typeof session[metricKey] === 'number') {
      session[metricKey] += 1;
    } else {
      session[metricKey] = 1;
    }
    try {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_METRICS, JSON.stringify(session));
    } catch (e) {
      console.warn('SessionStorage write error:', e);
    }
    return session;
  }

  function setSessionState(key, val) {
    try {
      const state = safeParse(sessionStorage.getItem(STORAGE_KEYS.SESSION_STATE), {});
      state[key] = val;
      sessionStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(state));
    } catch (e) {
      console.warn('Session state write error:', e);
    }
  }

  function getSessionState(key, fallback = null) {
    const state = safeParse(sessionStorage.getItem(STORAGE_KEYS.SESSION_STATE), {});
    return state[key] !== undefined ? state[key] : fallback;
  }

  // --- SYSTEM WIDE: Export / Import / Reset ---
  function exportAllData() {
    const fullBackup = {
      app: 'NexusTrade Pro',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      localStorage: {
        watchlist: getWatchlist(),
        portfolio: getPortfolio(),
        transactions: getTransactions(),
        settings: getSettings()
      },
      sessionStorage: getSessionMetrics()
    };
    return JSON.stringify(fullBackup, null, 2);
  }

  function importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.localStorage) {
        throw new Error('Invalid backup schema: missing localStorage root.');
      }
      if (data.localStorage.watchlist) setWatchlist(data.localStorage.watchlist);
      if (data.localStorage.portfolio) savePortfolio(data.localStorage.portfolio);
      if (data.localStorage.transactions) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(data.localStorage.transactions));
      }
      if (data.localStorage.settings) saveSettings(data.localStorage.settings);
      return { success: true, message: 'All state imported successfully.' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  function resetToDefaults() {
    localStorage.removeItem(STORAGE_KEYS.WATCHLIST);
    localStorage.removeItem(STORAGE_KEYS.PORTFOLIO);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    sessionStorage.clear();

    setWatchlist(DEFAULT_WATCHLIST);
    savePortfolio(DEFAULT_PORTFOLIO);
    saveSettings(DEFAULT_SETTINGS);
    initSession();
    return true;
  }

  // Public API
  return {
    getWatchlist,
    setWatchlist,
    toggleWatchlist,
    isWatched,
    getPortfolio,
    savePortfolio,
    getTransactions,
    addTransaction,
    getSettings,
    saveSettings,
    updateSetting,
    initSession,
    getSessionMetrics,
    incrementSessionMetric,
    setSessionState,
    getSessionState,
    exportAllData,
    importData,
    resetToDefaults
  };
})();
