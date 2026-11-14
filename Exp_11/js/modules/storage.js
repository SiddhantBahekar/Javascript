/**
 * storage.js - ES6 Module for LocalStorage Persistence and Sample Seed Data
 * Manages class schedules, countdown timers, and user preferences.
 */

const STORAGE_KEYS = {
  SCHEDULE: 'exp11_class_schedule',
  COUNTDOWNS: 'exp11_countdowns',
  THEME: 'exp11_theme_preference',
  NOTIFICATIONS: 'exp11_audio_notifications'
};

/**
 * Generates default timetable data across weekdays
 * @returns {Array<Object>}
 */
export function getDefaultSchedule() {
  return [
    // MONDAY
    {
      id: 'cls-mon-1',
      day: 'Monday',
      subject: 'Advanced Web Technologies',
      code: 'CS501',
      room: 'Lab 302 (IT Block)',
      faculty: 'Prof. Ananya Sharma',
      startTime: '09:00',
      endTime: '10:30',
      color: '#4f46e5' // Indigo
    },
    {
      id: 'cls-mon-2',
      day: 'Monday',
      subject: 'Database Management Systems',
      code: 'CS502',
      room: 'Lecture Hall 104',
      faculty: 'Dr. Rajiv Verma',
      startTime: '10:45',
      endTime: '12:15',
      color: '#0ea5e9' // Sky
    },
    {
      id: 'cls-mon-3',
      day: 'Monday',
      subject: 'Computer Networks',
      code: 'CS503',
      room: 'Hall B (Science Complex)',
      faculty: 'Prof. Sneha Kulkarni',
      startTime: '13:00',
      endTime: '14:30',
      color: '#10b981' // Emerald
    },

    // TUESDAY
    {
      id: 'cls-tue-1',
      day: 'Tuesday',
      subject: 'Cloud Computing & Virtualization',
      code: 'CS504',
      room: 'Room 205 (Engg Wing)',
      faculty: 'Dr. Chirag Patel',
      startTime: '09:30',
      endTime: '11:00',
      color: '#f59e0b' // Amber
    },
    {
      id: 'cls-tue-2',
      day: 'Tuesday',
      subject: 'Software Engineering & Agile',
      code: 'CS505',
      room: 'Lecture Hall 102',
      faculty: 'Prof. Vikram Rao',
      startTime: '11:15',
      endTime: '12:45',
      color: '#8b5cf6' // Purple
    },
    {
      id: 'cls-tue-3',
      day: 'Tuesday',
      subject: 'Operating Systems & Linux Lab',
      code: 'CS506P',
      room: 'Central Computing Lab 2',
      faculty: 'Prof. Pooja Deshmukh',
      startTime: '13:30',
      endTime: '15:30',
      color: '#ec4899' // Pink
    },

    // WEDNESDAY
    {
      id: 'cls-wed-1',
      day: 'Wednesday',
      subject: 'Full Stack JavaScript Lab',
      code: 'CS507P',
      room: 'Advanced Web Lab (3rd Flr)',
      faculty: 'Dr. Karan Singh',
      startTime: '09:00',
      endTime: '11:00',
      color: '#06b6d4' // Cyan
    },
    {
      id: 'cls-wed-2',
      day: 'Wednesday',
      subject: 'Information & Cyber Security',
      code: 'CS508',
      room: 'Hall A (Admin Wing)',
      faculty: 'Prof. Meenakshi Gupta',
      startTime: '11:30',
      endTime: '13:00',
      color: '#ef4444' // Red
    },
    {
      id: 'cls-wed-3',
      day: 'Wednesday',
      subject: 'Artificial Intelligence & ML',
      code: 'CS509',
      room: 'Smart Classroom 401',
      faculty: 'Dr. Alok Mehta',
      startTime: '14:00',
      endTime: '15:30',
      color: '#6366f1' // Indigo-violet
    },

    // THURSDAY
    {
      id: 'cls-thu-1',
      day: 'Thursday',
      subject: 'Mobile Application Development',
      code: 'CS510',
      room: 'Room 303 (Innovation Hub)',
      faculty: 'Dr. Suresh Nair',
      startTime: '09:30',
      endTime: '11:00',
      color: '#14b8a6' // Teal
    },
    {
      id: 'cls-thu-2',
      day: 'Thursday',
      subject: 'Computer Networks Lab',
      code: 'CS503P',
      room: 'Cisco Networking Lab',
      faculty: 'Prof. Sneha Kulkarni',
      startTime: '11:30',
      endTime: '13:30',
      color: '#10b981' // Emerald
    },
    {
      id: 'cls-thu-3',
      day: 'Thursday',
      subject: 'Design & Analysis of Algorithms',
      code: 'CS511',
      room: 'Lecture Hall 104',
      faculty: 'Prof. Rohit Bhatia',
      startTime: '14:15',
      endTime: '15:45',
      color: '#f97316' // Orange
    },

    // FRIDAY
    {
      id: 'cls-fri-1',
      day: 'Friday',
      subject: 'Cloud & DevOps Practical',
      code: 'CS504P',
      room: 'Cloud Computing Lab 404',
      faculty: 'Dr. Chirag Patel',
      startTime: '09:00',
      endTime: '11:00',
      color: '#3b82f6' // Blue
    },
    {
      id: 'cls-fri-2',
      day: 'Friday',
      subject: 'Value Added Course (VAC) - Web Dev',
      code: 'VAC101',
      room: 'Auditorium (Seminar Hall 1)',
      faculty: 'Prof. Ananya Sharma',
      startTime: '11:30',
      endTime: '13:00',
      color: '#a855f7' // Purple-accent
    },
    {
      id: 'cls-fri-3',
      day: 'Friday',
      subject: 'Project Mentorship & Review',
      code: 'PRJ501',
      room: 'Faculty Cabin 208',
      faculty: 'Department Committee',
      startTime: '14:00',
      endTime: '16:00',
      color: '#eab308' // Yellow
    },

    // SATURDAY
    {
      id: 'cls-sat-1',
      day: 'Saturday',
      subject: 'Industry Guest Lecture / Workshop',
      code: 'WRK501',
      room: 'Main Auditorium',
      faculty: 'Visiting Industry Expert',
      startTime: '10:00',
      endTime: '12:30',
      color: '#64748b' // Slate
    }
  ];
}

/**
 * Generates default countdown milestones relative to current date
 * @returns {Array<Object>}
 */
export function getDefaultCountdowns() {
  const now = new Date();

  // Helper to add days/hours to current date
  const addTime = (days, hours = 0, minutes = 0) => {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours, d.getMinutes() + minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'cd-default-1',
      title: 'Semester End Theory Examinations',
      targetDate: addTime(14, 2, 30),
      category: 'Exam',
      color: '#ef4444',
      isPaused: false,
      pausedRemainingMs: 0
    },
    {
      id: 'cd-default-2',
      title: 'Full Stack Project Code Submission',
      targetDate: addTime(5, 5, 0),
      category: 'Assignment',
      color: '#f59e0b',
      isPaused: false,
      pausedRemainingMs: 0
    },
    {
      id: 'cd-default-3',
      title: 'Annual College Hackathon 2026',
      targetDate: addTime(21, 0, 0),
      category: 'Event',
      color: '#10b981',
      isPaused: false,
      pausedRemainingMs: 0
    }
  ];
}

/**
 * Load schedule from localStorage or fallback to default
 * @returns {Array<Object>}
 */
export function loadSchedule() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse schedule from localStorage, using defaults.', err);
  }
  const defaults = getDefaultSchedule();
  saveSchedule(defaults);
  return defaults;
}

/**
 * Save schedule to localStorage
 * @param {Array<Object>} schedule
 */
export function saveSchedule(schedule) {
  try {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  } catch (err) {
    console.error('Failed to save schedule to localStorage', err);
  }
}

/**
 * Load countdowns from localStorage or fallback to default
 * @returns {Array<Object>}
 */
export function loadCountdowns() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COUNTDOWNS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse countdowns from localStorage, using defaults.', err);
  }
  const defaults = getDefaultCountdowns();
  saveCountdowns(defaults);
  return defaults;
}

/**
 * Save countdowns to localStorage
 * @param {Array<Object>} countdowns
 */
export function saveCountdowns(countdowns) {
  try {
    localStorage.setItem(STORAGE_KEYS.COUNTDOWNS, JSON.stringify(countdowns));
  } catch (err) {
    console.error('Failed to save countdowns to localStorage', err);
  }
}

/**
 * Load theme preference (light | dark)
 * @returns {string}
 */
export function loadTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
}

/**
 * Save theme preference
 * @param {'light'|'dark'} theme
 */
export function saveTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

/**
 * Load audio notification preference
 * @returns {boolean}
 */
export function loadAudioPref() {
  const pref = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  return pref === null ? true : pref === 'true';
}

/**
 * Save audio notification preference
 * @param {boolean} enabled
 */
export function saveAudioPref(enabled) {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, String(enabled));
}

/**
 * Reset all data to factory sample defaults
 */
export function resetAllStorage() {
  localStorage.removeItem(STORAGE_KEYS.SCHEDULE);
  localStorage.removeItem(STORAGE_KEYS.COUNTDOWNS);
  return {
    schedule: loadSchedule(),
    countdowns: loadCountdowns()
  };
}
