/**
 * ============================================================================
 * Experiment 12 - Main Application Orchestrator (app.js)
 * Coordinates: DOM manipulation, Event Delegation, Storage Service,
 *              AJAX data pipeline, Polling lifecycle, and Custom Events.
 * ============================================================================
 */

$(document).ready(function () {
  'use strict';

  // Application Runtime State
  const AppState = {
    assets: [],
    searchQuery: '',
    sortConfig: { field: 'rank', asc: true },
    activeTab: 'market',
    activeViewMode: 'table', // 'table' or 'grid'
    pollingTimerId: null,
    countdownTimerId: null,
    nextSyncSeconds: 6,
    isFetching: false
  };

  /**
   * Initialize Application
   */
  function init() {
    console.info('[App] Initializing NexusTrade Real-Time Financial Dashboard...');

    // 1. Initialize Storage & Session
    StorageService.initSession();
    applySavedTheme();
    loadSavedSettings();

    // 2. Attach Global Event Listeners & Event Delegation
    setupEventListeners();
    setupKeyboardShortcuts();

    // 3. Initial AJAX Data Fetch
    triggerMarketRefresh();

    // 4. Fetch Auxiliary News Feed via AJAX
    fetchMarketNewsFeed();

    // 5. Start Real-time Auto-Refresh Polling Lifecycle
    startAutoRefreshLifecycle();

    // 6. Handle tab visibility changes to pause/resume real-time polling
    document.addEventListener('visibilitychange', handleVisibilityChange);

    UI.showToast('System Ready', 'NexusTrade connected with live AJAX & localStorage engine.', 'success');
  }

  /**
   * Apply Theme (Dark / Light) from localStorage
   */
  function applySavedTheme() {
    const settings = StorageService.getSettings();
    if (settings.theme === 'light') {
      $('body').addClass('theme-light').removeClass('theme-dark');
      $('#btn-toggle-theme').html('🌙 <span class="btn-text">Dark Mode</span>');
    } else {
      $('body').addClass('theme-dark').removeClass('theme-light');
      $('#btn-toggle-theme').html('☀️ <span class="btn-text">Light Mode</span>');
    }
  }

  /**
   * Load Saved User Settings into UI Elements
   */
  function loadSavedSettings() {
    const settings = StorageService.getSettings();
    AppState.activeViewMode = settings.viewMode || 'table';
    updateViewModeUI();

    $('#setting-currency').val(settings.currency);
    $('#setting-refresh-rate').val(settings.refreshInterval);
    $('#setting-auto-refresh').prop('checked', settings.autoRefresh);
    $('#setting-sim-mode').prop('checked', settings.simulationMode);
    $('#setting-sim-latency').prop('checked', settings.simulateLatency);

    AppState.nextSyncSeconds = Math.round(settings.refreshInterval / 1000);
  }

  /**
   * Central AJAX Data Retrieval Cycle
   */
  function triggerMarketRefresh() {
    if (AppState.isFetching) return;
    AppState.isFetching = true;

    const $btnRefresh = $('#btn-manual-refresh');
    $btnRefresh.addClass('loading').prop('disabled', true);
    $('#refresh-spinner').addClass('spin');

    AjaxService.fetchMarketData({
      onStart: function () {
        $('#sync-status-indicator').text('Syncing...');
      },
      onSuccess: function (assets, meta) {
        AppState.assets = assets;

        // Custom Event Broadcast: Decoupled UI updates
        $(document).trigger('market:updated', [assets, meta]);

        UI.renderTelemetry(meta);
      },
      onError: function (err) {
        console.error('[App] AJAX Fetch Error:', err);
        UI.renderTelemetry({ isError: true });
        UI.showToast('Connection Alert', 'Live API unreachable. Fallback engine maintaining real-time quotes.', 'warning');
      },
      onComplete: function (meta) {
        AppState.isFetching = false;
        $btnRefresh.removeClass('loading').prop('disabled', false);
        $('#refresh-spinner').removeClass('spin');
        $('#sync-status-indicator').text('Synced');
        resetSyncCountdown();
      }
    });
  }

  /**
   * Fetch News Feed via AJAX
   */
  function fetchMarketNewsFeed() {
    AjaxService.fetchMarketNews(function (err, newsList) {
      if (!err && newsList) {
        UI.renderNewsFeed(newsList);
      }
    });
  }

  /**
   * Real-Time Polling Engine with Visual Countdown
   */
  function startAutoRefreshLifecycle() {
    stopAutoRefreshLifecycle();

    const settings = StorageService.getSettings();
    if (!settings.autoRefresh) {
      $('#sync-countdown-badge').text('Auto-sync: OFF');
      return;
    }

    const intervalMs = parseInt(settings.refreshInterval, 10) || 6000;
    AppState.nextSyncSeconds = Math.round(intervalMs / 1000);
    updateCountdownUI();

    // 1-second interval for UI countdown ticker
    AppState.countdownTimerId = setInterval(function () {
      AppState.nextSyncSeconds -= 1;
      if (AppState.nextSyncSeconds <= 0) {
        triggerMarketRefresh();
        AppState.nextSyncSeconds = Math.round(intervalMs / 1000);
      }
      updateCountdownUI();
    }, 1000);
  }

  function stopAutoRefreshLifecycle() {
    if (AppState.countdownTimerId) {
      clearInterval(AppState.countdownTimerId);
      AppState.countdownTimerId = null;
    }
  }

  function resetSyncCountdown() {
    const settings = StorageService.getSettings();
    AppState.nextSyncSeconds = Math.round((parseInt(settings.refreshInterval, 10) || 6000) / 1000);
    updateCountdownUI();
  }

  function updateCountdownUI() {
    $('#sync-countdown-badge').text(`Next sync: ${AppState.nextSyncSeconds}s`);
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stopAutoRefreshLifecycle();
      console.log('[App] Window hidden: Polling paused.');
    } else {
      startAutoRefreshLifecycle();
      triggerMarketRefresh();
      console.log('[App] Window visible: Polling resumed.');
    }
  }

  /**
   * Custom Event Listeners
   */
  $(document).on('market:updated', function (event, assets, meta) {
    // 1. Live Ticker Bar
    UI.renderLiveTicker(assets);

    // 2. Render View according to active tab
    renderActiveTabContent();

    // 3. Update Portfolio Valuation
    const valuation = PortfolioService.calculateValuation(assets);
    UI.renderPortfolio(valuation);

    // 4. Update Watchlist Badge Count
    const watchlist = StorageService.getWatchlist();
    $('#badge-watchlist-count').text(watchlist.length);
  });

  /**
   * Active Tab Content Router
   */
  function renderActiveTabContent() {
    const assets = AppState.assets;
    if (!assets || assets.length === 0) return;

    if (AppState.activeTab === 'market') {
      if (AppState.activeViewMode === 'table') {
        UI.renderMarketTable(assets, AppState.searchQuery, AppState.sortConfig, '#market-table-body');
      } else {
        UI.renderMarketCards(assets, AppState.searchQuery, '#market-cards-grid');
      }
    } else if (AppState.activeTab === 'watchlist') {
      const watchlist = StorageService.getWatchlist();
      const watchedAssets = assets.filter(a => watchlist.includes(a.id));
      if (AppState.activeViewMode === 'table') {
        UI.renderMarketTable(watchedAssets, AppState.searchQuery, AppState.sortConfig, '#watchlist-table-body');
      } else {
        UI.renderMarketCards(watchedAssets, AppState.searchQuery, '#watchlist-cards-grid');
      }
    } else if (AppState.activeTab === 'portfolio') {
      const valuation = PortfolioService.calculateValuation(assets);
      UI.renderPortfolio(valuation);
    } else if (AppState.activeTab === 'logs') {
      const transactions = StorageService.getTransactions();
      UI.renderTransactions(transactions);
    }
  }

  function updateViewModeUI() {
    if (AppState.activeViewMode === 'table') {
      $('#market-table-container, #watchlist-table-container').show();
      $('#market-cards-container, #watchlist-cards-container').hide();
      $('#btn-toggle-view').html('📊 <span class="btn-text">Cards View</span>');
    } else {
      $('#market-table-container, #watchlist-table-container').hide();
      $('#market-cards-container, #watchlist-cards-container').show();
      $('#btn-toggle-view').html('📋 <span class="btn-text">Table View</span>');
    }
  }

  /**
   * Event Handling: Comprehensive Event Listeners & Event Delegation
   */
  function setupEventListeners() {
    // --- 1. Tab Navigation Click Events ---
    $('.nav-tab-btn').on('click', function () {
      const targetTab = $(this).data('tab');
      $('.nav-tab-btn').removeClass('active');
      $(this).addClass('active');

      AppState.activeTab = targetTab;
      $('.tab-content-panel').hide();
      $(`#tab-panel-${targetTab}`).fadeIn(200);

      renderActiveTabContent();
    });

    // --- 2. Real-Time Search with Debounce (keyup / input) ---
    let searchDebounceTimer = null;
    $('#search-input').on('input keyup', function () {
      const query = $(this).val().trim();
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        AppState.searchQuery = query;
        renderActiveTabContent();
      }, 150); // 150ms debounce
    });

    // Clear search button delegation
    $(document).on('click', '.btn-clear-search, #btn-search-clear-icon', function () {
      $('#search-input').val('');
      AppState.searchQuery = '';
      renderActiveTabContent();
    });

    // --- 3. Sorting by Table Headers (Click Events) ---
    $(document).on('click', 'th.sortable', function () {
      const field = $(this).data('sort');
      if (AppState.sortConfig.field === field) {
        AppState.sortConfig.asc = !AppState.sortConfig.asc;
      } else {
        AppState.sortConfig.field = field;
        AppState.sortConfig.asc = true;
      }

      // Update Header Sort Arrows
      $('th.sortable').removeClass('sort-asc sort-desc');
      $(this).addClass(AppState.sortConfig.asc ? 'sort-asc' : 'sort-desc');

      renderActiveTabContent();
    });

    // --- 4. Event Delegation: Watchlist Star Toggle (Click) ---
    $(document).on('click', '.btn-star', function (e) {
      e.stopPropagation();
      const assetId = $(this).data('id');
      const result = StorageService.toggleWatchlist(assetId);

      $(this).toggleClass('active', result.isAdded);
      $('#badge-watchlist-count').text(result.watchlist.length);

      const asset = AjaxService.getCachedAssetById(assetId);
      const name = asset ? asset.name : assetId;

      if (result.isAdded) {
        UI.showToast('Watchlist Updated', `Added ${name} to your watchlist.`, 'success');
      } else {
        UI.showToast('Watchlist Updated', `Removed ${name} from watchlist.`, 'info');
      }

      if (AppState.activeTab === 'watchlist') {
        renderActiveTabContent();
      }
    });

    // --- 5. Event Delegation: Open Trade Modal ---
    $(document).on('click', '.btn-open-trade', function () {
      const assetId = $(this).data('id');
      const symbol = $(this).data('symbol');
      const price = parseFloat($(this).data('price'));
      const tradeType = $(this).data('trade-type') || 'BUY';

      populateTradeModal(assetId, symbol, price, tradeType);
      UI.openModal('#modal-trade');
    });

    // --- 6. Event Delegation: Open Asset Details Modal ---
    $(document).on('click', '.btn-open-details', function () {
      const assetId = $(this).data('id');
      const asset = AjaxService.getCachedAssetById(assetId);
      if (!asset) return;

      populateDetailsModal(asset);
      UI.openModal('#modal-details');
    });

    // --- 7. Trade Modal Form Interactions & Live Cost Calculation ---
    $('#trade-quantity').on('input', calculateTradeTotal);

    $('.trade-type-tab').on('click', function () {
      $('.trade-type-tab').removeClass('active');
      $(this).addClass('active');
      const type = $(this).data('type');
      $('#trade-action-type').val(type);
      $('#btn-submit-trade').text(`Confirm ${type} Order`)
        .toggleClass('btn-danger', type === 'SELL')
        .toggleClass('btn-primary', type === 'BUY');
      calculateTradeTotal();
    });

    $('#btn-trade-max').on('click', function () {
      const type = $('#trade-action-type').val();
      const price = parseFloat($('#trade-modal-price').val()) || 1;
      const assetId = $('#trade-modal-asset-id').val();
      const portfolio = StorageService.getPortfolio();

      if (type === 'BUY') {
        const maxAffordable = Math.floor((portfolio.cashBalance / price) * 1000) / 1000;
        $('#trade-quantity').val(maxAffordable > 0 ? maxAffordable : 0);
      } else {
        const owned = portfolio.holdings[assetId] ? portfolio.holdings[assetId].quantity : 0;
        $('#trade-quantity').val(owned);
      }
      calculateTradeTotal();
    });

    // --- 8. Trade Order Form Submission (Submit Event) ---
    $('#form-trade').on('submit', function (e) {
      e.preventDefault();

      const assetId = $('#trade-modal-asset-id').val();
      const symbol = $('#trade-modal-symbol').val();
      const price = parseFloat($('#trade-modal-price').val());
      const quantity = parseFloat($('#trade-quantity').val());
      const type = $('#trade-action-type').val();

      if (isNaN(quantity) || quantity <= 0) {
        UI.showToast('Validation Error', 'Please enter a valid positive quantity.', 'warning');
        return;
      }

      let result;
      if (type === 'BUY') {
        result = PortfolioService.executeBuy(assetId, symbol, quantity, price);
      } else {
        result = PortfolioService.executeSell(assetId, symbol, quantity, price);
      }

      if (result.success) {
        UI.showToast('Order Executed', result.message, 'success');
        UI.closeModal('#modal-trade');

        // Re-render portfolio and logs
        const valuation = PortfolioService.calculateValuation(AppState.assets);
        UI.renderPortfolio(valuation);
        UI.renderTransactions(StorageService.getTransactions());
      } else {
        UI.showToast('Order Rejected', result.message, 'error');
      }
    });

    // --- 9. Header Buttons: Manual Refresh, View Toggle, Theme Toggle ---
    $('#btn-manual-refresh').on('click', function () {
      triggerMarketRefresh();
    });

    $('#btn-toggle-view').on('click', function () {
      AppState.activeViewMode = AppState.activeViewMode === 'table' ? 'grid' : 'table';
      StorageService.updateSetting('viewMode', AppState.activeViewMode);
      updateViewModeUI();
      renderActiveTabContent();
    });

    $('#btn-toggle-theme').on('click', function () {
      const isCurrentlyLight = $('body').hasClass('theme-light');
      const newTheme = isCurrentlyLight ? 'dark' : 'light';
      StorageService.updateSetting('theme', newTheme);
      applySavedTheme();
      UI.showToast('Theme Changed', `Switched to ${newTheme} mode.`, 'info');
    });

    // --- 10. Settings & Modal Controls ---
    $('#btn-open-settings').on('click', function () {
      loadSavedSettings();
      UI.openModal('#modal-settings');
    });

    $('#form-settings').on('submit', function (e) {
      e.preventDefault();

      const newSettings = {
        currency: $('#setting-currency').val(),
        refreshInterval: parseInt($('#setting-refresh-rate').val(), 10),
        autoRefresh: $('#setting-auto-refresh').is(':checked'),
        simulationMode: $('#setting-sim-mode').is(':checked'),
        simulateLatency: $('#setting-sim-latency').is(':checked')
      };

      StorageService.saveSettings(newSettings);
      startAutoRefreshLifecycle();
      UI.closeModal('#modal-settings');
      UI.showToast('Settings Saved', 'User preferences updated and persisted.', 'success');
      triggerMarketRefresh();
    });

    // Modal Close Buttons (delegated)
    $(document).on('click', '.modal-close, .btn-modal-cancel', function () {
      UI.closeAllModals();
    });

    // Click outside modal content to dismiss
    $('.modal-overlay').on('click', function (e) {
      if ($(e.target).hasClass('modal-overlay')) {
        UI.closeAllModals();
      }
    });

    // --- 11. Lab Testing: Simulate Error Toggle ---
    $('#chk-simulate-error').on('change', function () {
      const isChecked = $(this).is(':checked');
      AjaxService.setSimulatedError(isChecked);
      if (isChecked) {
        UI.showToast('Lab Mode', 'Simulated Network Error active. Next AJAX sync will trigger error handler.', 'warning');
      } else {
        UI.showToast('Lab Mode', 'Simulated Network Error disabled. Live/fallback restored.', 'info');
      }
    });

    // --- 12. Storage Operations: Export, Import, Reset Defaults ---
    $('#btn-export-data').on('click', function () {
      const dataStr = StorageService.exportAllData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexustrade-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      UI.showToast('Data Exported', 'Downloaded complete localStorage state JSON.', 'success');
    });

    $('#btn-import-trigger').on('click', function () {
      $('#import-file-input').click();
    });

    $('#import-file-input').on('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (evt) {
        const result = StorageService.importData(evt.target.result);
        if (result.success) {
          UI.showToast('Import Succeeded', result.message, 'success');
          applySavedTheme();
          loadSavedSettings();
          triggerMarketRefresh();
        } else {
          UI.showToast('Import Failed', result.message, 'error');
        }
      };
      reader.readAsText(file);
      $(this).val(''); // reset input
    });

    $('#btn-reset-defaults').on('click', function () {
      if (confirm('Are you sure you want to reset all storage to initial laboratory defaults? This will restore paper balance to $100,000 and clear history.')) {
        StorageService.resetToDefaults();
        applySavedTheme();
        loadSavedSettings();
        triggerMarketRefresh();
        UI.showToast('Reset Complete', 'Application restored to default factory state.', 'info');
      }
    });
  }

  /**
   * Keyboard Shortcuts Handler
   */
  function setupKeyboardShortcuts() {
    $(document).on('keydown', function (e) {
      // Don't trigger shortcuts when user is typing in form inputs
      if ($(e.target).is('input, select, textarea')) {
        if (e.key === 'Escape') {
          UI.closeAllModals();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        $('#search-input').focus().select();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        triggerMarketRefresh();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        $('#btn-toggle-theme').click();
      } else if (e.key === 'Escape') {
        UI.closeAllModals();
      }
    });
  }

  /**
   * Helper: Populate Trade Modal with Selected Asset Data
   */
  function populateTradeModal(assetId, symbol, price, tradeType = 'BUY') {
    $('#trade-modal-asset-id').val(assetId);
    $('#trade-modal-symbol').val(symbol);
    $('#trade-modal-price').val(price);
    $('#trade-action-type').val(tradeType);

    $('#trade-dialog-title').text(`Place Order: ${symbol}`);
    $('#trade-current-price-display').text(UI.formatCurrency(price));

    $('.trade-type-tab').removeClass('active');
    $(`.trade-type-tab[data-type="${tradeType}"]`).addClass('active');

    $('#btn-submit-trade').text(`Confirm ${tradeType} Order`)
      .toggleClass('btn-danger', tradeType === 'SELL')
      .toggleClass('btn-primary', tradeType === 'BUY');

    const portfolio = StorageService.getPortfolio();
    $('#trade-available-cash').text(UI.formatCurrency(portfolio.cashBalance));
    
    const holding = portfolio.holdings[assetId];
    const ownedQty = holding ? holding.quantity : 0;
    $('#trade-owned-qty').text(`${ownedQty} ${symbol}`);

    $('#trade-quantity').val(1);
    calculateTradeTotal();
  }

  /**
   * Helper: Calculate Live Total in Trade Modal
   */
  function calculateTradeTotal() {
    const price = parseFloat($('#trade-modal-price').val()) || 0;
    const qty = parseFloat($('#trade-quantity').val()) || 0;
    const total = price * qty;
    const type = $('#trade-action-type').val();
    const portfolio = StorageService.getPortfolio();

    $('#trade-estimated-total').text(UI.formatCurrency(total));

    const $balanceHint = $('#trade-balance-hint');
    if (type === 'BUY') {
      const remaining = portfolio.cashBalance - total;
      if (remaining < 0) {
        $balanceHint.html(`<span class="text-danger">Insufficient balance! Deficit: ${UI.formatCurrency(Math.abs(remaining))}</span>`);
        $('#btn-submit-trade').prop('disabled', true);
      } else {
        $balanceHint.html(`Cash remaining after trade: <strong>${UI.formatCurrency(remaining)}</strong>`);
        $('#btn-submit-trade').prop('disabled', false);
      }
    } else {
      const assetId = $('#trade-modal-asset-id').val();
      const owned = portfolio.holdings[assetId] ? portfolio.holdings[assetId].quantity : 0;
      if (qty > owned) {
        $balanceHint.html(`<span class="text-danger">Exceeds owned amount! You own ${owned}</span>`);
        $('#btn-submit-trade').prop('disabled', true);
      } else {
        $balanceHint.html(`Proceeds added to balance: <strong>+${UI.formatCurrency(total)}</strong>`);
        $('#btn-submit-trade').prop('disabled', false);
      }
    }
  }

  /**
   * Helper: Populate Details Inspection Modal
   */
  function populateDetailsModal(asset) {
    $('#detail-title').text(`${asset.name} (${asset.symbol})`);
    $('#detail-rank').text(`#${asset.rank}`);
    $('#detail-price').text(UI.formatCurrency(asset.priceUsd));

    const isPos = asset.changePercent24Hr >= 0;
    $('#detail-change').html(`<span class="${isPos ? 'text-success' : 'text-danger'} font-bold">${isPos ? '+' : ''}${asset.changePercent24Hr}%</span>`);
    $('#detail-high').text(UI.formatCurrency(asset.high24h));
    $('#detail-low').text(UI.formatCurrency(asset.low24h));
    $('#detail-mcap').text(UI.formatCurrency(asset.marketCapUsd));
    $('#detail-volume').text(UI.formatCurrency(asset.volumeUsd24Hr));
    $('#detail-last-updated').text(asset.lastUpdated || 'Just now');

    // Render large sparkline
    const svgChart = UI.createSparklineSvg(asset.sparkline, isPos, 420, 110);
    $('#detail-chart-container').html(svgChart);

    // Quick trade action button from inside details modal
    $('#btn-detail-trade-trigger').off('click').on('click', function () {
      UI.closeModal('#modal-details');
      populateTradeModal(asset.id, asset.symbol, asset.priceUsd, 'BUY');
      UI.openModal('#modal-trade');
    });
  }

  // Kickstart application
  init();
});
