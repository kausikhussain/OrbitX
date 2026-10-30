// ==========================================================================
// Orbit Watch — NASA API Services (NeoWs, APOD, EPIC, DONKI)
// ==========================================================================

import { fetchWithCache, getStoredApiKey } from "./client.js";

/** Reference calibration dataset derived from JPL Small-Body Database */
export const REFERENCE_ASTEROIDS = [
  { id: "3542519", name: "2010 PK9", designation: "2010 PK9", diameterM: 140, diameterMinM: 110, diameterMaxM: 260, hazardous: true, missKm: 3400000, velocityKmh: 58320, time: "05:14 UTC", magnitudeH: 21.8, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2010%20PK9" },
  { id: "54418382", name: "2024 JV8", designation: "2024 JV8", diameterM: 34, diameterMinM: 24, diameterMaxM: 54, hazardous: false, missKm: 912000, velocityKmh: 28440, time: "08:30 UTC", magnitudeH: 24.8, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2024%20JV8" },
  { id: "3892408", name: "2019 UO7", designation: "2019 UO7", diameterM: 155, diameterMinM: 110, diameterMaxM: 240, hazardous: true, missKm: 4890000, velocityKmh: 61200, time: "11:22 UTC", magnitudeH: 21.2, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2019%20UO7" },
  { id: "3637158", name: "2013 GM3", designation: "2013 GM3", diameterM: 88, diameterMinM: 60, diameterMaxM: 135, hazardous: false, missKm: 2140000, velocityKmh: 33840, time: "14:05 UTC", magnitudeH: 22.6, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2013%20GM3" },
  { id: "54498302", name: "2025 AC2", designation: "2025 AC2", diameterM: 14, diameterMinM: 10, diameterMaxM: 22, hazardous: false, missKm: 386000, velocityKmh: 45720, time: "16:48 UTC", magnitudeH: 26.6, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2025%20AC2" },
  { id: "2467460", name: "467460 (2006 JF42)", designation: "467460", diameterM: 420, diameterMinM: 310, diameterMaxM: 690, hazardous: true, missKm: 26300000, velocityKmh: 40680, time: "19:12 UTC", magnitudeH: 19.1, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=467460" },
  { id: "54224781", name: "2021 XT4", designation: "2021 XT4", diameterM: 61, diameterMinM: 42, diameterMaxM: 95, hazardous: false, missKm: 7420000, velocityKmh: 52200, time: "21:35 UTC", magnitudeH: 23.4, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2021%20XT4" },
  { id: "3826224", name: "2018 PN22", designation: "2018 PN22", diameterM: 23, diameterMinM: 16, diameterMaxM: 36, hazardous: false, missKm: 1560000, velocityKmh: 21600, time: "23:02 UTC", magnitudeH: 25.5, url: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=2018%20PN22" },
];

function normalizeNeo(neo) {
  const ca = (neo.close_approach_data && neo.close_approach_data[0]) || null;
  const dm = neo.estimated_diameter && neo.estimated_diameter.meters
    ? neo.estimated_diameter.meters
    : { estimated_diameter_min: 25, estimated_diameter_max: 55 };

  const minM = dm.estimated_diameter_min || 25;
  const maxM = dm.estimated_diameter_max || 55;
  const avgM = (minM + maxM) / 2.0;

  const velKmh = ca ? parseFloat(ca.relative_velocity.kilometers_per_hour) : 42000;
  const missKm = ca ? parseFloat(ca.miss_distance.kilometers) : 4e6;

  return {
    id: String(neo.id || Math.random()),
    name: (neo.name || "Unknown NEO").replace(/[()]/g, "").trim(),
    designation: neo.designation || neo.name || "Uncataloged",
    diameterM: avgM,
    diameterMinM: minM,
    diameterMaxM: maxM,
    hazardous: Boolean(neo.is_potentially_hazardous_asteroid),
    missKm,
    velocityKmh: velKmh,
    velocityKms: velKmh / 3600.0,
    time: ca ? (ca.close_approach_date_full || ca.close_approach_date) : "Time pending",
    epochMs: ca ? Number(ca.epoch_date_close_approach) : null,
    magnitudeH: typeof neo.absolute_magnitude_h === "number" ? neo.absolute_magnitude_h : null,
    orbitClass: (ca && ca.orbiting_body) ? `Orbiting ${ca.orbiting_body}` : "Heliocentric NEO",
    url: neo.nasa_jpl_url || `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(neo.name || "")}`,
  };
}

/**
 * Fetches Near-Earth Asteroid close approaches for a specific calendar date.
 * 
 * @param {string} dateStr - Date formatted as YYYY-MM-DD.
 * @param {Object} [options] - Options including forceRefresh and signal.
 * @returns {Promise<{asteroids: Array<Object>, source: 'live'|'cached'|'reference', date: string, timestamp: number}>}
 */
export async function getAsteroidFeed(dateStr, options = {}) {
  const targetDate = dateStr || new Date().toISOString().slice(0, 10);
  const cacheKey = `neows_${targetDate}`;
  const apiKey = getStoredApiKey();
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${targetDate}&end_date=${targetDate}&api_key=${apiKey}`;

  try {
    const { data, fromCache, timestamp } = await fetchWithCache(cacheKey, url, {
      ttlMs: 24 * 3600 * 1000,
      forceRefresh: options.forceRefresh,
      signal: options.signal,
    });

    const days = data.near_earth_objects || {};
    const rawList = Object.values(days).flat();

    if (!rawList.length) {
      throw new Error("Empty NEO feed returned by NASA NeoWs");
    }

    const asteroids = rawList.map(normalizeNeo).sort((a, b) => a.missKm - b.missKm);
    return {
      asteroids,
      source: fromCache ? "cached" : "live",
      date: targetDate,
      timestamp,
    };
  } catch (err) {
    // If request was aborted by user changing dates, re-throw to allow cancellation
    if (err.name === "AbortError") throw err;

    console.warn(`[OrbitWatch] NeoWs retrieval fell back to reference records: ${err.message}`);
    const baseEpoch = new Date(targetDate + "T00:00:00Z").getTime() || Date.now();
    const calibratedList = REFERENCE_ASTEROIDS.map((item, idx) => ({
      ...item,
      epochMs: baseEpoch + (idx + 1) * 2.8 * 3600 * 1000,
      velocityKms: item.velocityKmh / 3600.0,
    })).sort((a, b) => a.missKm - b.missKm);

    return {
      asteroids: calibratedList,
      source: "reference",
      date: targetDate,
      timestamp: Date.now(),
      errorDetail: err.message,
    };
  }
}

/**
 * Fetches NASA Astronomy Picture of the Day (APOD).
 */
export async function getApod() {
  const apiKey = getStoredApiKey();
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
  const { data } = await fetchWithCache("apod", url, { ttlMs: 12 * 3600 * 1000 });
  return data;
}

/**
 * Fetches latest DSCOVR EPIC Earth imagery metadata.
 */
export async function getEpicImagery() {
  const apiKey = getStoredApiKey();
  const url = `https://api.nasa.gov/EPIC/api/natural?api_key=${apiKey}`;
  const { data } = await fetchWithCache("epic", url, { ttlMs: 6 * 3600 * 1000 });
  return Array.isArray(data) ? data : [];
}

/**
 * Fetches DONKI solar flare telemetry.
 */
export async function getSolarFlares(daysBack = 7) {
  const apiKey = getStoredApiKey();
  const past = new Date(Date.now() - daysBack * 86400 * 1000).toISOString().slice(0, 10);
  const url = `https://api.nasa.gov/DONKI/FLR?startDate=${past}&api_key=${apiKey}`;
  const { data } = await fetchWithCache("donki", url, { ttlMs: 4 * 3600 * 1000 });
  return Array.isArray(data) ? data : [];
}

