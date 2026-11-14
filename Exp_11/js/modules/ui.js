/**
 * ui.js - ES6 Module for DOM Rendering, Animations, and Visual Feedback
 * Demonstrates: dynamic DOM updates, setTimeout() auto-dismiss toasts,
 * and responsive UI components.
 */

import { padZero, formatDuration } from './timer.js';
import { formatTime12Hour, getClassStatus, formatSecondsDetailed } from './scheduler.js';

/**
 * Updates real-time digital clock display
 * @param {Object} elements - { clockEl, ampmEl, dateEl, dayEl }
 * @param {Date} [now]
 */
export function updateDigitalClock(elements, now = new Date()) {
  if (!elements) return;

  const hours24 = now.getHours();
  const hours12 = hours24 % 12 || 12;
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const minutes = padZero(now.getMinutes());
  const seconds = padZero(now.getSeconds());

  if (elements.clockEl) {
    elements.clockEl.innerHTML = `${padZero(hours12)}<span class="clock-colon">:</span>${minutes}<span class="clock-colon">:</span>${seconds}`;
  }
  if (elements.ampmEl) {
    elements.ampmEl.textContent = ampm;
  }
  if (elements.dayEl) {
    elements.dayEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long' });
  }
  if (elements.dateEl) {
    elements.dateEl.textContent = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
}

/**
 * Renders the Hero Live Class Banner
 * @param {HTMLElement} container
 * @param {Object} activeInfo - from scheduler.getActiveAndNextClass
 */
export function renderActiveLectureBanner(container, activeInfo) {
  if (!container) return;

  const { currentClass, nextClass, todaysClasses } = activeInfo;

  if (currentClass) {
    const status = currentClass.statusInfo;
    const progress = Math.round(status.progressPercent);
    const timeLeft = formatSecondsDetailed(status.remainingSeconds);

    container.innerHTML = `
      <div class="banner-active-card ongoing-glow" style="border-left: 6px solid ${currentClass.color};">
        <div class="banner-header">
          <div class="banner-pill live-pill">
            <span class="pulsing-dot"></span> LIVE LECTURE NOW
          </div>
          <span class="course-code-tag">${currentClass.code || 'COURSE'}</span>
        </div>

        <div class="banner-body">
          <h2 class="banner-title">${escapeHtml(currentClass.subject)}</h2>
          <div class="banner-meta">
            <span><i class="icon">👤</i> ${escapeHtml(currentClass.faculty)}</span>
            <span><i class="icon">📍</i> ${escapeHtml(currentClass.room)}</span>
            <span><i class="icon">⏰</i> ${formatTime12Hour(currentClass.startTime)} - ${formatTime12Hour(currentClass.endTime)}</span>
          </div>

          <div class="progress-section">
            <div class="progress-labels">
              <span>Progress: <strong>${progress}%</strong></span>
              <span class="time-remaining-badge">⏳ ${timeLeft} left</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${progress}%; background: ${currentClass.color};"></div>
            </div>
          </div>
        </div>

        ${
          nextClass
            ? `<div class="banner-footer">
                <span class="next-lecture-hint">
                  <strong>Up Next:</strong> ${escapeHtml(nextClass.subject)} at ${formatTime12Hour(nextClass.startTime)} (${escapeHtml(nextClass.room)})
                </span>
              </div>`
            : `<div class="banner-footer"><span class="next-lecture-hint">🎉 This is the final lecture for today!</span></div>`
        }
      </div>
    `;
    return;
  }

  // If no class is running right now
  if (nextClass) {
    const status = nextClass.statusInfo;
    const startsIn = formatSecondsDetailed(status.startsInSeconds);

    container.innerHTML = `
      <div class="banner-active-card idle-card" style="border-left: 6px solid ${nextClass.color};">
        <div class="banner-header">
          <div class="banner-pill upcoming-pill">
            <span class="idle-dot"></span> NEXT UPCOMING CLASS
          </div>
          <span class="starts-in-pill">Starts in ${startsIn}</span>
        </div>
        <div class="banner-body">
          <h2 class="banner-title">${escapeHtml(nextClass.subject)}</h2>
          <div class="banner-meta">
            <span><i class="icon">👤</i> ${escapeHtml(nextClass.faculty)}</span>
            <span><i class="icon">📍</i> ${escapeHtml(nextClass.room)}</span>
            <span><i class="icon">⏰</i> ${formatTime12Hour(nextClass.startTime)} - ${formatTime12Hour(nextClass.endTime)}</span>
          </div>
        </div>
        <div class="banner-footer">
          <span class="next-lecture-hint">Take a break or prepare your notes for the next lecture!</span>
        </div>
      </div>
    `;
    return;
  }

  // If all classes today are finished or none scheduled
  const message =
    todaysClasses.length > 0
      ? 'All lectures for today have concluded. Great work!'
      : 'No lectures scheduled on this day. Time for self-study or rest!';

  container.innerHTML = `
    <div class="banner-active-card free-card">
      <div class="banner-header">
        <div class="banner-pill free-pill">
          <i class="icon">✨</i> FREE TIME
        </div>
      </div>
      <div class="banner-body">
        <h2 class="banner-title">${message}</h2>
        <p class="banner-subtitle">Use the dynamic countdowns below to prepare for upcoming assignment deadlines and examinations.</p>
      </div>
    </div>
  `;
}

/**
 * Renders the class timetable list
 * @param {HTMLElement} container
 * @param {Array<Object>} classes
 * @param {Function} onDeleteCallback
 * @param {Date} [now]
 */
export function renderScheduleGrid(container, classes, onDeleteCallback, now = new Date()) {
  if (!container) return;

  if (classes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No classes found</h3>
        <p>No lectures scheduled matching your current filter. Click "Add Class" to schedule one.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = classes
    .map((item) => {
      const status = getClassStatus(item, now);

      let statusBadge = '';
      if (status.status === 'ONGOING') {
        statusBadge = `<span class="badge badge-ongoing"><span class="pulsing-dot-sm"></span> Live Now (${Math.round(status.progressPercent)}%)</span>`;
      } else if (status.status === 'UPCOMING') {
        statusBadge = `<span class="badge badge-upcoming">Upcoming</span>`;
      } else if (status.status === 'COMPLETED') {
        statusBadge = `<span class="badge badge-completed">Completed</span>`;
      } else {
        statusBadge = `<span class="badge badge-other">${escapeHtml(item.day)}</span>`;
      }

      return `
        <div class="schedule-card ${status.status === 'ONGOING' ? 'card-ongoing' : ''}" style="border-top: 4px solid ${item.color || '#6366f1'};">
          <div class="schedule-card-header">
            <span class="course-code">${escapeHtml(item.code || 'COURSE')}</span>
            ${statusBadge}
          </div>

          <h3 class="schedule-subject">${escapeHtml(item.subject)}</h3>

          <div class="schedule-details">
            <div class="detail-row">
              <span class="detail-label">🕒 Time:</span>
              <span class="detail-val">${formatTime12Hour(item.startTime)} - ${formatTime12Hour(item.endTime)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📍 Room:</span>
              <span class="detail-val">${escapeHtml(item.room)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">👤 Faculty:</span>
              <span class="detail-val">${escapeHtml(item.faculty)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Day:</span>
              <span class="detail-val">${escapeHtml(item.day)}</span>
            </div>
          </div>

          <div class="schedule-card-footer">
            <button class="btn-icon-delete" data-action="delete-class" data-id="${item.id}" title="Remove Class">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach delete handlers
  container.querySelectorAll('[data-action="delete-class"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (onDeleteCallback) onDeleteCallback(id);
    });
  });
}

/**
 * Renders dynamic countdown cards
 * @param {HTMLElement} container
 * @param {Array<Object>} countdownInstances - Array of { instance, state }
 * @param {Object} actionHandlers - { onTogglePause, onReset, onDelete }
 */
export function renderCountdownCards(container, countdownInstances, actionHandlers) {
  if (!container) return;

  if (countdownInstances.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <h3>No countdown timers active</h3>
        <p>Create a custom countdown for exams, assignments, or project milestones above.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = countdownInstances
    .map(({ data, remaining }) => {
      const isExpired = remaining.isExpired || data.isCompleted;
      const isPaused = data.isPaused;

      let statusBadge = '<span class="status-chip chip-running">Active</span>';
      if (isExpired) {
        statusBadge = '<span class="status-chip chip-expired">Reached!</span>';
      } else if (isPaused) {
        statusBadge = '<span class="status-chip chip-paused">Paused</span>';
      }

      return `
        <div class="countdown-card ${isExpired ? 'expired-glow' : ''}" id="card-${data.id}">
          <div class="countdown-card-header">
            <span class="category-tag">${escapeHtml(data.category || 'Event')}</span>
            ${statusBadge}
          </div>

          <h3 class="countdown-title">${escapeHtml(data.title)}</h3>
          <p class="target-date-label">Target: ${new Date(data.targetDate).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>

          <div class="timer-digits-grid">
            <div class="digit-box">
              <span class="digit-val" data-val="days">${padZero(remaining.days)}</span>
              <span class="digit-unit">Days</span>
            </div>
            <div class="digit-box">
              <span class="digit-val" data-val="hours">${padZero(remaining.hours)}</span>
              <span class="digit-unit">Hours</span>
            </div>
            <div class="digit-box">
              <span class="digit-val" data-val="minutes">${padZero(remaining.minutes)}</span>
              <span class="digit-unit">Mins</span>
            </div>
            <div class="digit-box">
              <span class="digit-val" data-val="seconds">${padZero(remaining.seconds)}</span>
              <span class="digit-unit">Secs</span>
            </div>
          </div>

          <div class="countdown-actions">
            ${
              !isExpired
                ? `<button class="btn btn-secondary btn-sm" data-action="toggle-pause" data-id="${data.id}">
                    ${isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>`
                : ''
            }
            <button class="btn btn-ghost btn-sm" data-action="reset" data-id="${data.id}" title="Reset Timer">
              🔄 Reset
            </button>
            <button class="btn btn-danger-outline btn-sm" data-action="delete" data-id="${data.id}" title="Delete Timer">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');

  // Attach handlers
  container.querySelectorAll('[data-action="toggle-pause"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (actionHandlers.onTogglePause) actionHandlers.onTogglePause(id);
    });
  });

  container.querySelectorAll('[data-action="reset"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (actionHandlers.onReset) actionHandlers.onReset(id);
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (actionHandlers.onDelete) actionHandlers.onDelete(id);
    });
  });
}

/**
 * Demonstrates setTimeout() and clearTimeout()
 * Toast notification system with auto-dismiss timer.
 * @param {string} message
 * @param {'info'|'success'|'warning'|'danger'} [type]
 * @param {number} [durationMs] - auto dismiss time (default 4000ms)
 */
export function showToast(message, type = 'info', durationMs = 4000) {
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    danger: '🚨'
  };

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '🔔'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close-btn" aria-label="Close">&times;</button>
    <div class="toast-progress-bar" style="animation-duration: ${durationMs}ms;"></div>
  `;

  toastContainer.appendChild(toast);

  // Trigger smooth enter animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Use setTimeout() to auto-dismiss
  let dismissTimeout = setTimeout(() => {
    removeToast();
  }, durationMs);

  function removeToast() {
    if (dismissTimeout) {
      clearTimeout(dismissTimeout);
      dismissTimeout = null;
    }
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-leaving');
    // Allow slide-out animation to complete before removing from DOM
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 300);
  }

  // Manual close button clears timeout and dismisses
  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removeToast();
    });
  }
}

/**
 * Escapes unsafe HTML characters to prevent XSS
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
