/**
 * scheduler.js - ES6 Module for Timetable & Class Status Computations
 * Handles schedule state, active lecture detection, and progress tracking.
 */

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/**
 * Gets day name for a given Date
 * @param {Date} [date]
 * @returns {string}
 */
export function getDayName(date = new Date()) {
  return DAYS_OF_WEEK[date.getDay()];
}

/**
 * Parses "HH:MM" (24-hr) to total minutes from midnight
 * @param {string} timeStr - e.g. "09:30" or "14:15"
 * @returns {number}
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Formats 24h time "14:30" into 12-hour format "02:30 PM"
 * @param {string} timeStr
 * @returns {string}
 */
export function formatTime12Hour(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let hours = parseInt(hStr, 10);
  const minutes = mStr || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

/**
 * Returns detailed status of a class entry relative to now
 * @param {Object} classItem
 * @param {Date} [now]
 * @returns {Object}
 */
export function getClassStatus(classItem, now = new Date()) {
  const currentDay = getDayName(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentSeconds = currentMinutes * 60 + now.getSeconds();

  const isToday = classItem.day.toLowerCase() === currentDay.toLowerCase();

  const startMins = timeStringToMinutes(classItem.startTime);
  const endMins = timeStringToMinutes(classItem.endTime);

  const startSecs = startMins * 60;
  const endSecs = endMins * 60;
  const durationSecs = Math.max(1, endSecs - startSecs);

  if (!isToday) {
    return {
      status: 'OTHER_DAY',
      badgeClass: 'badge-other',
      badgeText: classItem.day,
      progressPercent: 0,
      remainingSeconds: 0,
      startsInSeconds: 0
    };
  }

  if (currentSeconds < startSecs) {
    const startsIn = startSecs - currentSeconds;
    return {
      status: 'UPCOMING',
      badgeClass: 'badge-upcoming',
      badgeText: 'Upcoming',
      progressPercent: 0,
      remainingSeconds: 0,
      startsInSeconds: startsIn
    };
  }

  if (currentSeconds >= startSecs && currentSeconds < endSecs) {
    const elapsedSecs = currentSeconds - startSecs;
    const remainingSecs = endSecs - currentSeconds;
    const progressPercent = Math.min(100, Math.max(0, (elapsedSecs / durationSecs) * 100));

    return {
      status: 'ONGOING',
      badgeClass: 'badge-ongoing',
      badgeText: 'Live Now',
      progressPercent,
      remainingSeconds: remainingSecs,
      startsInSeconds: 0
    };
  }

  return {
    status: 'COMPLETED',
    badgeClass: 'badge-completed',
    badgeText: 'Completed',
    progressPercent: 100,
    remainingSeconds: 0,
    startsInSeconds: 0
  };
}

/**
 * Analyzes entire schedule to find current running class & next upcoming lecture today
 * @param {Array<Object>} schedule
 * @param {Date} [now]
 * @returns {Object}
 */
export function getActiveAndNextClass(schedule, now = new Date()) {
  const currentDay = getDayName(now);
  const todaysClasses = schedule
    .filter((c) => c.day.toLowerCase() === currentDay.toLowerCase())
    .sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  let currentClass = null;
  let nextClass = null;

  for (const item of todaysClasses) {
    const info = getClassStatus(item, now);
    const enriched = { ...item, statusInfo: info };

    if (info.status === 'ONGOING' && !currentClass) {
      currentClass = enriched;
    } else if (info.status === 'UPCOMING' && !nextClass) {
      nextClass = enriched;
    }
  }

  return {
    currentDay,
    todaysClasses,
    currentClass,
    nextClass
  };
}

/**
 * Filter schedule by day and optional search text
 * @param {Array<Object>} schedule
 * @param {string} day - 'All' or specific day name
 * @param {string} [search]
 * @returns {Array<Object>}
 */
export function filterSchedule(schedule, day = 'All', search = '') {
  let list = [...schedule];

  if (day && day !== 'All') {
    list = list.filter((c) => c.day.toLowerCase() === day.toLowerCase());
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.faculty && c.faculty.toLowerCase().includes(q)) ||
        (c.room && c.room.toLowerCase().includes(q))
    );
  }

  return list.sort((a, b) => {
    // Sort primarily by day order, secondarily by start time
    const dayOrderA = DAYS_OF_WEEK.indexOf(a.day);
    const dayOrderB = DAYS_OF_WEEK.indexOf(b.day);
    if (dayOrderA !== dayOrderB) return dayOrderA - dayOrderB;
    return timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime);
  });
}

/**
 * Formats seconds into "Xh Ym Zs" or "Ym Zs"
 * @param {number} totalSecs
 * @returns {string}
 */
export function formatSecondsDetailed(totalSecs) {
  if (totalSecs <= 0) return '0s';
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
  parts.push(`${secs}s`);
  return parts.join(' ');
}
