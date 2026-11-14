
#### Experiment 12: Interactive Real-Time Web Application using JavaScript and jQuery with DOM, Events, Storage, and AJAX Integration

---

## 🚀 Project Overview: NexusTrade Pro

**NexusTrade Pro** is an enterprise-grade, real-time financial intelligence dashboard and paper trading simulator built using modern JavaScript (ES6+) and jQuery. It demonstrates the seamless integration of dynamic DOM manipulation, advanced event delegation, browser storage persistence (`localStorage` & `sessionStorage`), and asynchronous real-time data streaming via jQuery AJAX.

![Dashboard Preview](https://img.shields.io/badge/Architecture-Modular%20Client--Side-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Complete-emerald?style=for-the-badge)
![Dependencies](https://img.shields.io/badge/Library-jQuery%203.7.1%20(Bundled)-orange?style=for-the-badge)

---

## 🎯 Lab Objectives & Requirements Fulfillment

| Requirement | Implementation in NexusTrade Pro | File Reference |
| :--- | :--- | :--- |
| **JavaScript & jQuery** | IIFE modular pattern, jQuery utility chaining, DOM traversals, animations, and mathematical financial models. | [`js/app.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/app.js) |
| **DOM Manipulation** | Dynamic table row generation, responsive card grids, SVG sparkline chart generation, price flash animations (`price-flash-up`, `price-flash-down`), modal injection, and toast notification rendering. | [`js/modules/ui.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/modules/ui.js) |
| **Event Handling** | Event delegation (`$(document).on(...)`), debounced input search, form validation & submission (`e.preventDefault()`), global keyboard shortcuts (`/`, `R`, `D`, `Esc`), and decoupled Custom Events (`market:updated`). | [`js/app.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/app.js) |
| **Web Storage** | **`localStorage`**: Watchlist, user paper portfolio, trade transaction history, display currency, theme, and refresh rates.<br>**`sessionStorage`**: Session runtime metrics, round-trip API counters, and ephemeral filters.<br>Features JSON export/import and reset. | [`js/modules/storage.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/modules/storage.js) |
| **AJAX Integration** | jQuery `$.ajax()` and `$.getJSON()` with full lifecycle hooks (`beforeSend`, `success`, `error`, `complete`), live public API streaming (CoinCap/CoinGecko), graceful offline simulation fallback, and lab error injection. | [`js/modules/ajax-api.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/modules/ajax-api.js) |
| **Real-Time Polling** | Configurable ticker interval (3s, 6s, 12s, 30s) with live countdown progress, ticker marquee banner, and `visibilitychange` auto-pause/resume. | [`js/app.js`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/js/app.js) |

---

## 📁 Repository Structure

```
Experiment_12(VAC)/
├── index.html                   # Semantic HTML5 layout, modals, telemetry badges
├── css/
│   └── styles.css               # Theming (Dark/Light variables), keyframes, glassmorphism
├── js/
│   ├── vendor/
│   │   └── jquery.min.js        # Offline-first bundled jQuery 3.7.1
│   ├── modules/
│   │   ├── storage.js           # Web Storage API manager (localStorage & sessionStorage)
│   │   ├── ajax-api.js          # jQuery AJAX data engine, live endpoints & simulation
│   │   ├── portfolio.js         # Paper trading engine, mark-to-market calculations
│   │   └── ui.js                # DOM rendering, SVG sparklines, modals, toasts
│   └── app.js                   # Main controller, event routing, lifecycle timers
├── data/
│   ├── sample-market.json       # Fallback market snapshot for local environments
│   └── market-news.json         # Real-time market intelligence news feed (AJAX loaded)
├── package.json                 # Project descriptor and quick-start scripts
└── README.md                    # Comprehensive laboratory documentation
```

---

## 🔬 In-Depth Technical Architecture

### 1. Dynamic DOM Manipulation (`ui.js`)
* **Real-time Price Flashes**: Previous prices are tracked in memory. When new data arrives, DOM cells flash green (`price-flash-up`) if price increased, or red (`price-flash-down`) if price decreased:
  ```javascript
  if (asset.priceUsd > previousPrices[asset.id]) {
    flashClass = 'price-flash-up';
  } else if (asset.priceUsd < previousPrices[asset.id]) {
    flashClass = 'price-flash-down';
  }
  ```
* **Dynamic Inline SVG Sparklines**: Evaluates the 7-period historical price array, normalizes min/max bounding coordinates, and constructs `<polyline>` and `<polygon>` SVG elements dynamically without heavy external charting libraries.
* **Component-Level Modals & Toasts**: Floating alerts are injected into `#toast-container` with animated entrances and auto-dismiss timer handles (`setTimeout`).

### 2. Comprehensive Event Handling (`app.js`)
* **Event Delegation**:
  ```javascript
  $(document).on('click', '.btn-star', function (e) {
    e.stopPropagation();
    const assetId = $(this).data('id');
    const result = StorageService.toggleWatchlist(assetId);
    $(this).toggleClass('active', result.isAdded);
  });
  ```
* **Debounced Search**: Input events on `#search-input` are debounced with a 150ms timeout to avoid unnecessary DOM re-renders while typing.
* **Global Keyboard Shortcuts**:
  * <kbd>/</kbd> — Focus real-time search field
  * <kbd>R</kbd> or <kbd>r</kbd> — Trigger instant AJAX sync
  * <kbd>D</kbd> or <kbd>d</kbd> — Toggle Dark / Light theme
  * <kbd>Esc</kbd> — Dismiss any active modal

### 3. Persistent Storage Engine (`storage.js`)
* **`localStorage`**: Long-term state persistence.
  * `nexustrade_watchlist`: Array of pinned asset IDs.
  * `nexustrade_portfolio`: Paper trading balance ($100,000 default), cost basis, active asset positions.
  * `nexustrade_transactions`: Full audit log of completed BUY/SELL transactions with realized P&L and timestamps.
  * `nexustrade_settings`: Currency symbol/rate, polling frequency, active view mode, simulation preferences.
* **`sessionStorage`**: Tab-specific ephemeral data.
  * `nexustrade_session_metrics`: Total API requests made this session, round-trip latency, errors caught, session start time.
* **Backup & Migration**:
  * **Export**: Serializes entire storage state into a downloadable `.json` file using `Blob` and `URL.createObjectURL()`.
  * **Import**: Uses the `FileReader` API to parse and validate uploaded JSON backups.
  * **Reset**: Restores factory defaults with user confirmation dialog.

### 4. Advanced AJAX Implementation (`ajax-api.js`)
* Complete jQuery AJAX lifecycle integration:
  ```javascript
  $.ajax({
    url: LIVE_API_URL,
    method: 'GET',
    dataType: 'json',
    timeout: 4500,
    beforeSend: function (jqXHR) {
      $('#sync-status-indicator').text('Syncing...');
    },
    success: function (response, status, jqXHR) {
      // Normalize live API payload
      // Broadcast decoupled custom event
      $(document).trigger('market:updated', [normalizedAssets, meta]);
    },
    error: function (jqXHR, textStatus, errorThrown) {
      // Graceful offline fallback
      fallbackToLocalOrSimulation(options, startTime, textStatus);
    },
    complete: function (jqXHR) {
      // Record latency, reset spinner and countdown
    }
  });
  ```
* **Zero-Failure Fallback Engine**: If the live public API is blocked by CORS, rate limits, or network unavailability (e.g. offline lab environment), the app automatically transitions into high-fidelity Brownian motion simulation without crashing or displaying empty tables.
* **Lab Error Simulation Toggle**: An evaluator can check the "Simulate Network Error" box in the telemetry panel to verify the application's error handling and toast alert recovery in real-time.

---

## 💻 How to Run the Application

The web application is 100% self-contained with bundled jQuery and local fallback data.

### Option 1: Direct Browser Launch (Simplest)
* Double-click [`index.html`](file:///d:/Symbiosis/SEM%205/Javascript%20lab/Experiment_12(VAC)/index.html) or open it directly in Chrome, Firefox, or Edge.

### Option 2: Using Python HTTP Server
Open PowerShell in the project directory and run:
```powershell
python -m http.server 3000
```
Then open: [http://localhost:3000](http://localhost:3000)

### Option 3: Using Node.js
```powershell
npx serve -l 3000 .
```

---

## 🧪 Laboratory Verification & Test Checklist

1. [x] **Real-Time Polling**: Observe top live ticker marquee updating and the next-sync countdown badge ticking down.
2. [x] **DOM Flashes**: Observe table cells briefly flash green on positive price updates and red on negative price updates.
3. [x] **Search & Filter**: Type "bit" or "sol" in the search box; verify instant debounced filtering of rows and cards.
4. [x] **Watchlist Toggle**: Click the star icon (★) on any row. Switch to the "Watchlist" tab and verify the asset is pinned. Refresh page to confirm persistence via `localStorage`.
5. [x] **Paper Trade Simulation**:
   - Click "Trade" on Bitcoin.
   - Enter quantity `0.2` and observe the live cost calculation.
   - Click "Confirm Order".
   - Switch to "Paper Portfolio" to view the updated position and mark-to-market P&L.
   - Switch to "Activity Log" to view the timestamped transaction.
6. [x] **AJAX Error Handling**:
   - Go to "Intelligence & Telemetry" tab.
   - Check the "Simulate Network Error" checkbox.
   - Observe the immediate warning toast and the status pill updating to "Error State (Offline)".
   - Uncheck the box to see normal streaming resume.
7. [x] **Data Export & Import**:
   - Open Settings (⚙️).
   - Click "Export JSON Backup" to download your portfolio state.
   - Click "Reset to Defaults" to restore initial state.
   - Click "Import Backup JSON" to restore your saved data.
8. [x] **Keyboard Shortcuts**: Press `/` to search, `R` to refresh, `D` to toggle theme, `Esc` to close modals.

---

## 👨‍💻 Course Information
* **Institution**: Symbiosis Institute of Technology (SIT), Symbiosis International (Deemed University)
* **Course**: SEM 5 JavaScript Lab / Value-Added Course (VAC)
* **Experiment**: Experiment 12
* **Topic**: Interactive Real-Time Web Application (DOM, Events, Web Storage, AJAX)
