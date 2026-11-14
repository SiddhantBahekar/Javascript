/**
 * ============================================================================
 * Experiment 12 - DOM Manipulation & UI Controller Module (ui.js)
 * Covers: jQuery DOM Selectors, Element Creation & Insertion, Attributes,
 *         CSS Class Animation, SVG Sparkline Rendering, Modal Management,
 *         and Toast Notification System.
 * ============================================================================
 */

const UI = (function ($) {
  'use strict';

  // Cache previously rendered prices to detect changes for DOM flash animations
  const previousPrices = {};

  /**
   * Currency formatter respecting user preferences
   */
  function formatCurrency(amount, customCurrency = null) {
    const settings = StorageService.getSettings();
    const curr = customCurrency || settings.currency || 'USD';
    const rate = settings.currencyRates[curr] || 1.0;
    const symbol = settings.currencySymbols[curr] || '$';
    const converted = amount * rate;

    if (Math.abs(converted) >= 1e9) {
      return symbol + (converted / 1e9).toFixed(2) + ' B';
    }
    if (Math.abs(converted) >= 1e6) {
      return symbol + (converted / 1e6).toFixed(2) + ' M';
    }
    if (Math.abs(converted) >= 1000) {
      return symbol + converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Math.abs(converted) < 1 && converted !== 0) {
      return symbol + converted.toFixed(4);
    }
    return symbol + converted.toFixed(2);
  }

  function formatPercent(val) {
    const num = parseFloat(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
  }

  /**
   * Generates dynamic SVG Sparkline Chart Element
   */
  function createSparklineSvg(dataPoints, isPositive, width = 110, height = 32) {
    if (!dataPoints || dataPoints.length < 2) {
      return '<div class="sparkline-empty">--</div>';
    }

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = (max - min) || 1;

    const strokeColor = isPositive ? '#10b981' : '#ef4444';
    const fillColor = isPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';

    // Normalize coordinates
    const points = dataPoints.map((val, idx) => {
      const x = (idx / (dataPoints.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const polylinePoints = points.join(' ');
    const polygonPoints = `2,${height - 2} ` + polylinePoints + ` ${width - 2},${height - 2}`;

    return `
      <svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polygon points="${polygonPoints}" fill="${fillColor}" />
        <polyline points="${polylinePoints}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  /**
   * Render Top Live Ticker Bar
   */
  function renderLiveTicker(assets) {
    const $container = $('#ticker-track');
    $container.empty();

    assets.slice(0, 10).forEach(asset => {
      const isUp = asset.changePercent24Hr >= 0;
      const pillClass = isUp ? 'ticker-up' : 'ticker-down';
      const arrow = isUp ? '▲' : '▼';

      const $item = $(`
        <div class="ticker-item" data-id="${asset.id}">
          <span class="ticker-symbol">${asset.symbol}</span>
          <span class="ticker-price">${formatCurrency(asset.priceUsd)}</span>
          <span class="ticker-change ${pillClass}">${arrow} ${Math.abs(asset.changePercent24Hr)}%</span>
        </div>
      `);
      $container.append($item);
    });
  }

  /**
   * Render Market Table View (DOM Table Rows)
   */
  function renderMarketTable(assets, searchQuery = '', sortConfig = { field: 'rank', asc: true }, targetSelector = '#market-table-body') {
    const $tbody = $(targetSelector);
    if (!$tbody.length) return;
    const watchlist = StorageService.getWatchlist();
    const isWatchlistTab = targetSelector.includes('watchlist');

    // Filter by query
    let filtered = assets.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q);
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let valA = a[sortConfig.field];
      let valB = b[sortConfig.field];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sortConfig.asc ? -1 : 1;
      if (valA > valB) return sortConfig.asc ? 1 : -1;
      return 0;
    });

    $tbody.empty();

    if (filtered.length === 0) {
      const emptyMsg = isWatchlistTab
        ? 'Your watchlist is empty. Click the ★ star icon on any asset in the Market Overview to track it here!'
        : `No assets found matching "<strong>${escapeHtml(searchQuery)}</strong>"`;

      $tbody.html(`
        <tr>
          <td colspan="8" class="empty-state-cell" style="text-align: center; padding: 40px;">
            <div class="empty-state">
              <span class="empty-icon" style="font-size: 2rem;">⭐</span>
              <p style="margin: 10px 0; color: var(--text-muted);">${emptyMsg}</p>
              ${searchQuery ? '<button class="btn btn-sm btn-outline btn-clear-search">Clear Search Filter</button>' : ''}
            </div>
          </td>
        </tr>
      `);
      return;
    }

    filtered.forEach(asset => {
      const isWatched = watchlist.includes(asset.id);
      const isPositive = asset.changePercent24Hr >= 0;
      const changeClass = isPositive ? 'text-success' : 'text-danger';
      const badgeClass = isPositive ? 'badge-success' : 'badge-danger';
      const arrow = isPositive ? '+' : '';

      // Determine price change flash animation
      let flashClass = '';
      if (previousPrices[asset.id] !== undefined) {
        if (asset.priceUsd > previousPrices[asset.id]) {
          flashClass = 'price-flash-up';
        } else if (asset.priceUsd < previousPrices[asset.id]) {
          flashClass = 'price-flash-down';
        }
      }
      previousPrices[asset.id] = asset.priceUsd;

      const sparklineHtml = createSparklineSvg(asset.sparkline, isPositive);

      const $row = $(`
        <tr class="asset-row" data-id="${asset.id}" data-symbol="${asset.symbol}">
          <td class="col-watch">
            <button class="btn-star ${isWatched ? 'active' : ''}" title="${isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}" data-id="${asset.id}">
              ★
            </button>
          </td>
          <td class="col-rank font-mono text-muted">#${asset.rank}</td>
          <td class="col-asset">
            <div class="asset-info">
              <div class="asset-symbol-avatar">${asset.symbol.substring(0, 3)}</div>
              <div>
                <span class="asset-name font-semibold">${asset.name}</span>
                <span class="asset-sym text-muted">${asset.symbol}</span>
              </div>
            </div>
          </td>
          <td class="col-price font-mono ${flashClass}">
            <strong>${formatCurrency(asset.priceUsd)}</strong>
          </td>
          <td class="col-change ${changeClass} font-mono">
            <span class="badge ${badgeClass}">${arrow}${asset.changePercent24Hr}%</span>
          </td>
          <td class="col-sparkline">
            ${sparklineHtml}
          </td>
          <td class="col-mcap font-mono text-muted">
            ${formatCurrency(asset.marketCapUsd)}
          </td>
          <td class="col-actions">
            <div class="action-btn-group">
              <button class="btn btn-xs btn-primary btn-open-trade" data-id="${asset.id}" data-symbol="${asset.symbol}" data-price="${asset.priceUsd}">
                Trade
              </button>
              <button class="btn btn-xs btn-outline btn-open-details" data-id="${asset.id}">
                Details
              </button>
            </div>
          </td>
        </tr>
      `);

      $tbody.append($row);
    });

    // Remove flash animations after 900ms to allow future re-triggers
    setTimeout(() => {
      $('.price-flash-up, .price-flash-down').removeClass('price-flash-up price-flash-down');
    }, 900);
  }

  /**
   * Render Grid Card View
   */
  function renderMarketCards(assets, searchQuery = '', targetSelector = '#market-cards-grid') {
    const $grid = $(targetSelector);
    if (!$grid.length) return;
    const watchlist = StorageService.getWatchlist();
    const isWatchlistTab = targetSelector.includes('watchlist');

    let filtered = assets.filter(a => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q);
    });

    $grid.empty();

    if (filtered.length === 0) {
      const msg = isWatchlistTab
        ? 'Your watchlist is empty. Click the ★ star icon on any asset in the Market Overview to track it here!'
        : 'No asset cards match current filter.';

      $grid.html(`
        <div class="empty-state-card col-span-all" style="grid-column: 1 / -1; text-align: center; padding: 40px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <p style="color: var(--text-muted);">${msg}</p>
        </div>
      `);
      return;
    }

    filtered.forEach(asset => {
      const isWatched = watchlist.includes(asset.id);
      const isPositive = asset.changePercent24Hr >= 0;
      const badgeClass = isPositive ? 'badge-success' : 'badge-danger';
      const sparklineHtml = createSparklineSvg(asset.sparkline, isPositive, 180, 48);

      const $card = $(`
        <div class="market-card card" data-id="${asset.id}">
          <div class="card-header-row">
            <div class="card-title-group">
              <span class="card-symbol">${asset.symbol}</span>
              <span class="card-name">${asset.name}</span>
            </div>
            <button class="btn-star ${isWatched ? 'active' : ''}" data-id="${asset.id}">★</button>
          </div>
          <div class="card-price-row">
            <span class="card-price font-mono">${formatCurrency(asset.priceUsd)}</span>
            <span class="badge ${badgeClass}">${asset.changePercent24Hr > 0 ? '+' : ''}${asset.changePercent24Hr}%</span>
          </div>
          <div class="card-chart-container">
            ${sparklineHtml}
          </div>
          <div class="card-stats-row text-muted font-mono text-xs">
            <span>24h H: ${formatCurrency(asset.high24h)}</span>
            <span>24h L: ${formatCurrency(asset.low24h)}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-sm btn-primary w-full btn-open-trade" data-id="${asset.id}" data-symbol="${asset.symbol}" data-price="${asset.priceUsd}">
              Trade ${asset.symbol}
            </button>
          </div>
        </div>
      `);

      $grid.append($card);
    });
  }

  /**
   * Render Portfolio Tab & Holdings Table
   */
  function renderPortfolio(valuation) {
    $('#portfolio-net-worth').text(formatCurrency(valuation.netWorth));
    $('#portfolio-cash-balance').text(formatCurrency(valuation.cashBalance));
    $('#portfolio-holdings-value').text(formatCurrency(valuation.totalHoldingsValue));

    const pnl = valuation.totalProfitLoss;
    const pnlSign = pnl >= 0 ? '+' : '';
    const pnlClass = pnl >= 0 ? 'text-success' : 'text-danger';
    const pnlBadgeClass = pnl >= 0 ? 'badge-success' : 'badge-danger';

    $('#portfolio-pnl').html(`
      <span class="${pnlClass}">${pnlSign}${formatCurrency(pnl)}</span>
      <span class="badge ${pnlBadgeClass}">${formatPercent(valuation.totalProfitLossPercent)}</span>
    `);

    // Render Holdings Table
    const $tbody = $('#holdings-table-body');
    $tbody.empty();

    if (!valuation.holdings || valuation.holdings.length === 0) {
      $tbody.html(`
        <tr>
          <td colspan="7" class="text-center py-6 text-muted">
            No active positions in your paper portfolio. Visit the Market tab to place your first trade!
          </td>
        </tr>
      `);
      return;
    }

    valuation.holdings.forEach(pos => {
      const isPosGain = pos.unrealizedPnL >= 0;
      const gainClass = isPosGain ? 'text-success' : 'text-danger';

      const $row = $(`
        <tr>
          <td>
            <div class="font-semibold">${pos.name} <span class="text-muted">(${pos.symbol})</span></div>
          </td>
          <td class="font-mono">${pos.quantity}</td>
          <td class="font-mono">${formatCurrency(pos.avgPrice)}</td>
          <td class="font-mono">${formatCurrency(pos.currentPrice)}</td>
          <td class="font-mono font-bold">${formatCurrency(pos.currentValue)}</td>
          <td class="font-mono ${gainClass}">
            ${isPosGain ? '+' : ''}${formatCurrency(pos.unrealizedPnL)} (${formatPercent(pos.unrealizedPnLPercent)})
          </td>
          <td>
            <div class="action-btn-group">
              <button class="btn btn-xs btn-primary btn-open-trade" data-id="${pos.id}" data-symbol="${pos.symbol}" data-price="${pos.currentPrice}" data-trade-type="BUY">
                Buy More
              </button>
              <button class="btn btn-xs btn-danger btn-open-trade" data-id="${pos.id}" data-symbol="${pos.symbol}" data-price="${pos.currentPrice}" data-trade-type="SELL">
                Sell
              </button>
            </div>
          </td>
        </tr>
      `);
      $tbody.append($row);
    });
  }

  /**
   * Render Trade History Log Table
   */
  function renderTransactions(transactions) {
    const $tbody = $('#transactions-table-body');
    $tbody.empty();

    if (!transactions || transactions.length === 0) {
      $tbody.html(`
        <tr>
          <td colspan="7" class="text-center py-6 text-muted">
            No transactions executed yet. Orders placed will appear here with live timestamps.
          </td>
        </tr>
      `);
      return;
    }

    transactions.forEach(tx => {
      const isBuy = tx.type === 'BUY';
      const typeBadge = isBuy ? '<span class="badge badge-success">BUY</span>' : '<span class="badge badge-warning">SELL</span>';
      const formattedDate = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let pnlDisplay = '--';
      if (tx.realizedPnL !== undefined) {
        const isPnLPos = tx.realizedPnL >= 0;
        pnlDisplay = `<span class="${isPnLPos ? 'text-success' : 'text-danger'} font-mono">${isPnLPos ? '+' : ''}${formatCurrency(tx.realizedPnL)}</span>`;
      }

      const $row = $(`
        <tr>
          <td class="font-mono text-muted text-xs">${formattedDate}</td>
          <td>${typeBadge}</td>
          <td class="font-semibold">${tx.symbol}</td>
          <td class="font-mono">${tx.quantity}</td>
          <td class="font-mono">${formatCurrency(tx.price)}</td>
          <td class="font-mono font-bold">${formatCurrency(tx.total)}</td>
          <td>${pnlDisplay}</td>
        </tr>
      `);
      $tbody.append($row);
    });
  }

  /**
   * Render Real-Time Market News Feed (Loaded via AJAX)
   */
  function renderNewsFeed(newsItems) {
    const $container = $('#news-feed-list');
    $container.empty();

    if (!newsItems || newsItems.length === 0) {
      $container.html('<div class="text-muted p-4">No recent intelligence dispatches.</div>');
      return;
    }

    newsItems.forEach(item => {
      const sentimentBadge = item.sentiment === 'bullish'
        ? '<span class="badge badge-success text-xs">Bullish</span>'
        : '<span class="badge badge-secondary text-xs">Neutral</span>';

      const $item = $(`
        <div class="news-item-card">
          <div class="news-meta">
            <span class="news-source font-semibold text-xs">${escapeHtml(item.source)}</span>
            <span class="text-muted text-xs">• ${escapeHtml(item.time)}</span>
            ${sentimentBadge}
          </div>
          <h4 class="news-title text-sm font-semibold">${escapeHtml(item.title)}</h4>
          <p class="news-summary text-xs text-muted">${escapeHtml(item.summary)}</p>
        </div>
      `);
      $container.append($item);
    });
  }

  /**
   * Render Session Statistics & Network Telemetry
   */
  function renderTelemetry(meta = {}) {
    const session = StorageService.getSessionMetrics();
    $('#metric-api-calls').text(session.apiCallsCount || 0);
    $('#metric-trades').text(session.tradesExecuted || 0);
    $('#metric-session-start').text(session.startedAt || '--');
    
    if (meta.latencyMs !== undefined) {
      $('#metric-latency').text(meta.latencyMs + ' ms');
    }

    const $statusPill = $('#network-status-pill');
    if (meta.isError) {
      $statusPill.attr('class', 'status-pill status-error').html('<span class="status-dot"></span> <span id="sync-status-indicator" class="status-text">Error State (Offline)</span>');
    } else if (meta.source === 'live-api') {
      $statusPill.attr('class', 'status-pill status-live').html('<span class="status-dot"></span> <span id="sync-status-indicator" class="status-text">Live API Active</span>');
    } else {
      $statusPill.attr('class', 'status-pill status-simulated').html('<span class="status-dot"></span> <span id="sync-status-indicator" class="status-text">Simulation Fallback</span>');
    }
  }

  /**
   * Show Interactive Toast Notification
   */
  function showToast(title, message, type = 'info') {
    const $container = $('#toast-container');
    const toastId = 'toast_' + Date.now();

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const $toast = $(`
      <div id="${toastId}" class="toast-card toast-${type}">
        <span class="toast-icon">${icons[type] || '🔔'}</span>
        <div class="toast-body">
          <div class="toast-title">${escapeHtml(title)}</div>
          <div class="toast-msg">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
      </div>
    `);

    $container.append($toast);
    $toast.fadeIn(250);

    // Auto dismiss after 4.5s
    const timer = setTimeout(() => {
      dismissToast($toast);
    }, 4500);

    // Manual close button
    $toast.find('.toast-close').on('click', function () {
      clearTimeout(timer);
      dismissToast($toast);
    });
  }

  function dismissToast($toast) {
    $toast.fadeOut(300, function () {
      $toast.remove();
    });
  }

  /**
   * Modal Manager: Open & Close Modal
   */
  function openModal(modalId) {
    const $modal = $(modalId);
    if ($modal.length) {
      $modal.addClass('active').fadeIn(200);
      $('body').addClass('modal-open');
    }
  }

  function closeModal(modalId) {
    const $modal = $(modalId);
    if ($modal.length) {
      $modal.removeClass('active').fadeOut(150);
      $('body').removeClass('modal-open');
    }
  }

  function closeAllModals() {
    $('.modal-overlay.active').removeClass('active').fadeOut(150);
    $('body').removeClass('modal-open');
  }

  /**
   * Safe HTML Escaper to prevent XSS
   */
  function escapeHtml(str) {
    if (!str) return '';
    return $('<div>').text(str).html();
  }

  return {
    formatCurrency,
    formatPercent,
    createSparklineSvg,
    renderLiveTicker,
    renderMarketTable,
    renderMarketCards,
    renderPortfolio,
    renderTransactions,
    renderNewsFeed,
    renderTelemetry,
    showToast,
    openModal,
    closeModal,
    closeAllModals
  };
})(jQuery);
