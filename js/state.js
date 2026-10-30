// ==========================================================================
// ECLIPTARA — Centralized Reactive State Store
// ==========================================================================

const listeners = new Map();

export const state = {
  currentDate: new Date().toISOString().slice(0, 10),
  asteroids: [],
  filteredAsteroids: [],
  selectedAsteroid: null,
  selectedMesh: null,
  
  // Signature features state
  comparisonList: [], // Array of up to 3 asteroid objects
  encounterReplay: {
    active: false,
    asteroid: null,
    offsetHours: 0,
    isPlaying: false,
  },

  // Telemetry status
  dataStatus: {
    type: "connecting", // 'live' | 'cached' | 'reference' | 'loading' | 'error'
    label: "Connecting",
    lastUpdated: null,
    sourceName: "NASA NeoWs",
  },

  // View & UI controls
  viewMode: "earth", // 'earth' | 'orbit'
  isPanelCollapsed: false,
  searchQuery: "",
  sortBy: "distance",
  filterHazardous: false,

  // Settings & Accessibility
  preferences: {
    showOrbits: true,
    showGrid: false,
    showAtmosphere: true,
    showClouds: true,
    showLabels: true,
    reducedMotion: false,
    highContrast: false,
    soundMuted: false,
  },
};

/**
 * Subscribe to state changes.
 * @param {string} key - State property or '*' for all changes.
 * @param {Function} callback - Callback function(newValue, oldValue).
 */
export function subscribe(key, callback) {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key).add(callback);
  return () => listeners.get(key).delete(callback);
}

/**
 * Updates a top-level state property and notifies subscribers.
 * @param {string} key - State property name.
 * @param {any} value - New value.
 */
export function setState(key, value) {
  const oldValue = state[key];
  state[key] = value;

  if (listeners.has(key)) {
    listeners.get(key).forEach((cb) => {
      try { cb(value, oldValue); } catch (e) { console.error(e); }
    });
  }
  if (listeners.has("*")) {
    listeners.get("*").forEach((cb) => {
      try { cb(key, value, oldValue); } catch (e) { console.error(e); }
    });
  }
}

