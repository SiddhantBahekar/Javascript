/**
 * timer.js - ES6 Module for Timer and Countdown Operations
 * Demonstrates: setInterval(), clearInterval(), setTimeout(), clearTimeout()
 * and Web Audio API for synthetic audio alerts.
 */

/**
 * Calculates remaining time breakdown between now and target date
 * @param {Date|string|number} targetDate
 * @returns {Object} { totalMs, days, hours, minutes, seconds, isExpired }
 */
export function calculateTimeRemaining(targetDate) {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const totalMs = target - now;

  if (isNaN(totalMs)) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false
  };
}

/**
 * Pad number with leading zero
 * @param {number} n
 * @returns {string}
 */
export function padZero(n) {
  return String(Math.floor(Math.max(0, n))).padStart(2, '0');
}

/**
 * Formats a duration in milliseconds to HH:MM:SS or MM:SS
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${padZero(hrs)}:${padZero(mins)}:${padZero(secs)}`;
  }
  return `${padZero(mins)}:${padZero(secs)}`;
}

/**
 * Demonstrates setTimeout() and clearTimeout()
 * Schedules a delayed callback and provides a cancellation handle.
 * @param {Function} callback - Function to execute when timer expires
 * @param {number} delayMs - Delay in milliseconds
 * @returns {Object} { id, cancel: Function }
 */
export function createDelayedAction(callback, delayMs) {
  let timeoutId = setTimeout(() => {
    callback();
    timeoutId = null;
  }, delayMs);

  return {
    get id() {
      return timeoutId;
    },
    cancel() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
        return true;
      }
      return false;
    }
  };
}

/**
 * Demonstrates setInterval() and clearInterval()
 * CountdownTimer class manages a live countdown with pause, resume, and reset.
 */
export class CountdownTimer {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique ID
   * @param {string} options.title - Name of event
   * @param {Date|string|number} options.targetDate - Target timestamp
   * @param {Function} [options.onTick] - Called every 1000ms
   * @param {Function} [options.onComplete] - Called when target is reached
   */
  constructor({ id, title, targetDate, onTick, onComplete, category = 'General' }) {
    this.id = id || `cd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.title = title || 'Untitled Countdown';
    this.targetDate = new Date(targetDate);
    this.initialTargetDate = new Date(targetDate);
    this.category = category;
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});

    this.intervalId = null;
    this.isPaused = false;
    this.pausedRemainingMs = 0;
    this.isCompleted = false;
  }

  /**
   * Start or resume the interval timer using setInterval()
   */
  start() {
    if (this.intervalId !== null) return; // Already running

    // If resumed from pause, adjust targetDate based on saved remaining time
    if (this.isPaused && this.pausedRemainingMs > 0) {
      this.targetDate = new Date(Date.now() + this.pausedRemainingMs);
      this.isPaused = false;
    }

    // Execute first tick immediately
    this._tick();

    // Use setInterval() to tick once per second
    this.intervalId = setInterval(() => {
      this._tick();
    }, 1000);
  }

  /**
   * Pause the countdown using clearInterval() and record remaining ms
   */
  pause() {
    if (this.intervalId === null || this.isPaused) return;

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isPaused = true;
    const remaining = calculateTimeRemaining(this.targetDate);
    this.pausedRemainingMs = remaining.totalMs;

    this.onTick({
      id: this.id,
      title: this.title,
      isPaused: true,
      isCompleted: this.isCompleted,
      ...remaining
    });
  }

  /**
   * Reset countdown back to original target date
   * Demonstrates clearInterval()
   */
  reset(newTargetDate = null) {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.targetDate = newTargetDate ? new Date(newTargetDate) : new Date(this.initialTargetDate);
    this.isPaused = false;
    this.isCompleted = false;
    this.pausedRemainingMs = 0;

    this._tick();
  }

  /**
   * Stop countdown permanently
   */
  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Internal tick handler
   */
  _tick() {
    const remaining = calculateTimeRemaining(this.targetDate);

    if (remaining.isExpired) {
      this.isCompleted = true;
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.onComplete({
        id: this.id,
        title: this.title,
        ...remaining
      });
      this.onTick({
        id: this.id,
        title: this.title,
        isPaused: this.isPaused,
        isCompleted: true,
        ...remaining
      });
      return;
    }

    this.onTick({
      id: this.id,
      title: this.title,
      isPaused: this.isPaused,
      isCompleted: false,
      ...remaining
    });
  }

  /**
   * Snapshot data for serialization
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      targetDate: this.targetDate.toISOString(),
      initialTargetDate: this.initialTargetDate.toISOString(),
      category: this.category,
      isPaused: this.isPaused,
      pausedRemainingMs: this.pausedRemainingMs,
      isCompleted: this.isCompleted
    };
  }
}

/**
 * Web Audio API synthesizer for alert sounds (Chime, Beep, Bell)
 * Pure client-side synthetic audio - requires no external assets.
 * @param {'chime'|'beep'|'bell'} type
 */
export function playSyntheticAlert(type = 'chime') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    if (type === 'beep') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'bell') {
      // 2-tone school bell alert
      [659.25, 523.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.2);
        gain.gain.setValueAtTime(0.25, now + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.4);
      });
    } else {
      // Chime: 3-tone arpeggio (C5 - E5 - G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    }
  } catch (err) {
    console.warn('Audio playback not allowed or not supported yet:', err);
  }
}
