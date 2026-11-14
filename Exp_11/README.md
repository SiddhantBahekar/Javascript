# Experiment 11: Dynamic Class Scheduler & Countdown Hub

**Course:** SEM 5 JavaScript Laboratory / Value Added Course (VAC)  
**Topic:** JavaScript Timers (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`) & ES6 Modules (`import` / `export`)  
**Technology Stack:** Modern Vanilla JavaScript (ES6+), HTML5, CSS3 (Glassmorphism, Responsive Grid/Flexbox), Web Audio API

---

## 📌 1. Aim & Objectives

### Aim
To design and develop a responsive, real-time **Dynamic Countdown and Class Scheduler** web application utilizing JavaScript asynchronous timer functions (`setTimeout()`, `setInterval()`, `clearTimeout()`, `clearInterval()`) and native ES6 modular architecture (`import` / `export`).

### Objectives
1. **Master JavaScript Timers**:
   - Implement `setInterval()` for continuous 1-second system clock updates, active lecture countdowns, and event timers.
   - Implement `clearInterval()` to pause, reset, or stop live timers.
   - Implement `setTimeout()` for auto-dismissing notifications (toasts) and input debouncing for responsive search.
   - Implement `clearTimeout()` for manual cancellations and reset cycles.
2. **Implement Native ES6 Modules**:
   - Structure application logic cleanly into distinct functional modules (`timer.js`, `scheduler.js`, `storage.js`, `ui.js`, and `app.js`).
   - Utilize named `export` and `import` syntax without bundling tools.
   - Understand the execution context of `<script type="module">` (strict mode, deferred loading, module scoping, CORS requirements).
3. **Build a Real-Time Interactive UI**:
   - Provide real-time detection of currently active lectures, percentage completed, and time remaining.
   - Display dynamic countdown cards for upcoming deadlines and exams with pause/resume/reset capabilities.
   - Provide synthesized sound alerts via the Web Audio API without requiring external audio asset files.
   - Ensure complete responsiveness across mobile, tablet, and desktop devices with Dark/Light theme toggles.

---

## 🏗️ 2. Architectural Structure

The project strictly follows modern modular software design principles:

```
Experiment_11(VAC)/
├── index.html               # Main dashboard UI structure (<script type="module">)
├── css/
│   └── style.css            # Responsive styles, glassmorphic themes & animations
├── js/
│   ├── app.js               # Main application coordinator & entry point
│   └── modules/
│       ├── timer.js         # CountdownTimer class, timer helpers, Web Audio synthesizer
│       ├── scheduler.js     # Timetable status calculation (ongoing, upcoming, completed)
│       ├── storage.js       # LocalStorage persistence & default college timetable data
│       └── ui.js            # DOM updates, banner rendering, cards & toast notifications
└── README.md                # Comprehensive documentation & lab experiment report
```

---

## ⚙️ 3. Core Concepts Explained

### A. JavaScript Asynchronous Timers

JavaScript is single-threaded; timer functions do not block the thread. Instead, they schedule callbacks through the browser's Web APIs into the **Macro-task Queue** (Event Loop).

| Function | Purpose in Experiment | Syntax | Cancellation |
| :--- | :--- | :--- | :--- |
| `setInterval(fn, delay)` | Drives 1-second digital clock and active countdowns | `const id = setInterval(callback, 1000);` | `clearInterval(id)` |
| `clearInterval(id)` | Pauses or stops countdown tickers | `clearInterval(timerId);` | — |
| `setTimeout(fn, delay)` | Auto-dismisses toasts & debounces live search | `const id = setTimeout(callback, 250);` | `clearTimeout(id)` |
| `clearTimeout(id)` | Cancels pending toasts or queued search executions | `clearTimeout(timeoutId);` | — |

#### 1. Input Debouncing with `setTimeout` & `clearTimeout`
When a student types in the lecture search bar, re-rendering on every keystroke causes unnecessary calculations. We debounce the input by clearing any previous pending timeout before queueing a new one:
```javascript
function handleSearchInput(e) {
  const val = e.target.value;
  // Clear previous pending timeout
  if (AppState.searchDebounceTimer) {
    clearTimeout(AppState.searchDebounceTimer);
  }
  // Schedule execution after 250ms delay
  AppState.searchDebounceTimer = setTimeout(() => {
    AppState.searchQuery = val;
    refreshScheduleView();
  }, 250);
}
```

#### 2. Toast Auto-Dismiss Timer
```javascript
export function showToast(message, type = 'info', durationMs = 4000) {
  // ... create toast element ...
  let dismissTimeout = setTimeout(() => {
    removeToast();
  }, durationMs);

  // If user clicks the 'X' button early:
  closeBtn.addEventListener('click', () => {
    clearTimeout(dismissTimeout);
    removeToast();
  });
}
```

#### 3. Countdown Timer Engine with `setInterval`
```javascript
export class CountdownTimer {
  start() {
    if (this.intervalId !== null) return;
    this._tick();
    this.intervalId = setInterval(() => {
      this._tick();
    }, 1000);
  }

  pause() {
    if (this.intervalId === null) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isPaused = true;
  }
}
```

---

### B. ES6 Modules (`import` / `export`)

1. **Scoped Execution**: Variables defined inside an ES6 module are private by default; only entities declared with `export` are accessible externally.
2. **Strict Mode by Default**: Modules automatically execute in `'use strict'` mode.
3. **Deferred Loading**: Scripts loaded with `type="module"` are automatically deferred until HTML parsing completes.
4. **CORS Requirement**: Browsers enforce the Same-Origin Policy on module scripts. Thus, the application must be served over HTTP/HTTPS (e.g. `localhost`) rather than direct `file://` execution.

#### Export Syntax Example (`js/modules/timer.js`):
```javascript
export function calculateTimeRemaining(targetDate) { /* ... */ }
export class CountdownTimer { /* ... */ }
export function playSyntheticAlert(type = 'chime') { /* ... */ }
```

#### Import Syntax Example (`js/app.js`):
```javascript
import { calculateTimeRemaining, CountdownTimer, playSyntheticAlert } from './modules/timer.js';
import { getActiveAndNextClass, filterSchedule } from './modules/scheduler.js';
import { loadSchedule, saveSchedule } from './modules/storage.js';
import { updateDigitalClock, renderActiveLectureBanner } from './modules/ui.js';
```

---

### C. Web Audio API (Synthesized Chimes)

Rather than depending on external `.mp3` or `.wav` sound files which can fail to load or get blocked, we synthesize auditory cues programmatically using `AudioContext` and `OscillatorNode`:
- **Chime**: 3-tone arpeggio (C5 - E5 - G5: 523.25 Hz, 659.25 Hz, 783.99 Hz) played upon countdown completion.
- **Bell**: 2-tone school bell alert (659.25 Hz, 523.25 Hz) triggered when a new lecture begins or ends.
- **Beep**: Crisp sine burst (880 Hz) for UI feedback.

---

## 🚀 4. How to Run the Application

Because native ES6 modules are subject to CORS restrictions on local file paths (`file://`), run the project using any local web server:

### Option 1: Using Python (Recommended)
Open a terminal in this directory and execute:
```bash
python -m http.server 8000
```
Then visit: **[http://localhost:8000](http://localhost:8000)**

### Option 2: Using Node.js `npx serve`
```bash
npx serve .
```

### Option 3: Using VS Code Live Server
1. Open this folder in Visual Studio Code.
2. Right-click on `index.html` and click **"Open with Live Server"**.

---

## 🌟 5. Application Features Walkthrough

1. **Live Header & Digital Clock**:
   - High-precision 12-hour digital clock with blinking colons, AM/PM tag, day of the week, and date.
   - Quick action buttons: Dark/Light Mode switch, Sound Toggle, Sound Test, and Reset Data.
2. **Hero Active Class Banner**:
   - Detects the current running lecture based on system day and time.
   - Displays live progress percentage with an animated fill bar and exact remaining time (`Xm Ys left`).
   - Shows the next scheduled class and starting time.
   - Displays a celebratory "Free Time" card if all lectures for the day have ended.
3. **Dynamic Countdown Hub**:
   - Preset one-click quick timers: **5m Break**, **15m Sprint**, **25m Pomodoro**, **60m Lab**.
   - Custom countdown creator for exams, assignments, or hackathons.
   - Real-time animated digit cards for **Days, Hours, Minutes, and Seconds**.
   - Full control bar for each timer: **Pause / Resume**, **Reset**, and **Delete**.
4. **Weekly Timetable Explorer**:
   - Day selector filter tabs (**Today**, **Monday**, **Tuesday**, **Wednesday**, **Thursday**, **Friday**, **Saturday**, **All Week**).
   - Real-time search filter with debouncing (`setTimeout`).
   - "Live Now" pulsating badge, "Upcoming" badge, and "Completed" badges for easy schedule tracking.
   - Custom "Add Class" modal form with subject, course code, room, faculty, start/end times, and color accent picker.
5. **Toast Notifications**:
   - Non-intrusive floating toasts with animated timeout progress bars driven by `setTimeout()`.
   - Close button with `clearTimeout()` cancellation.
6. **Persistence**:
   - All custom classes, countdowns, theme preferences, and sound settings persist across page reloads using `localStorage`.

---

## 📋 6. Summary of Learning Outcomes
- Demonstrated complete proficiency in asynchronous JavaScript timing (`setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`).
- Implemented modular, maintainable, and reusable architecture using native ES6 `import`/`export`.
- Designed an interactive responsive dashboard with zero external framework dependencies.
