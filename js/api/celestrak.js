// ==========================================================================
// Orbit Watch — CelesTrak Active Satellite TLE Service
// ==========================================================================

const INDIA_SATELLITE_REGEX = /(INSAT|GSAT|CARTOSAT|RISAT|IRNSS|NVS-|ASTROSAT|OCEANSAT|RESOURCESAT|EOS-\d|EMISAT|SARAL|SCATSAT|MEGHA|KALPANA|IRS-|HAMSAT|MICROSAT|ANUSAT|YOUTHSAT|CHANDRAYAAN|ADITYA|XPOSAT|GISAT|CMS-\d|DS-SAR|PRATHAM|SROSS|ROHINI|APPLE|BHASKARA|ARYABHATA|AZAADISAT|ANAND|SINDHU|VELOX|INS-\d)/i;

/**
 * Fetches active satellite TLE catalog from CelesTrak.
 * 
 * @returns {Promise<{sats: Array<{name: string, rec: any}>, india: Array<{name: string, rec: any}>}>}
 */
export async function getActiveSatelliteTLEs() {
  if (!window.satellite) {
    throw new Error("satellite.js library not loaded");
  }

  const key = `tle_active_${new Date().toISOString().slice(0, 10)}`;
  let text = null;

  try {
    text = localStorage.getItem(key);
  } catch (_) {}

  if (!text) {
    const res = await fetch("https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle");
    if (!res.ok) throw new Error(`CelesTrak responded ${res.status}`);
    text = await res.text();

    try {
      // Purge prior days TLE caches to keep localStorage quota bounded
      Object.keys(localStorage)
        .filter((k) => k.startsWith("tle_active_") && k !== key)
        .forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, text);
    } catch (_) {}
  }

  const lines = text.split("\n").map((l) => l.trimEnd()).filter(Boolean);
  const sats = [];
  const india = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    if (!line1 || !line2 || line1[0] !== "1" || line2[0] !== "2") continue;

    try {
      const rec = window.satellite.twoline2satrec(line1, line2);
      const isIndia = INDIA_SATELLITE_REGEX.test(name);
      (isIndia ? india : sats).push({ name, rec, isIndia });
    } catch (_) {}
  }

  return { sats, india };
}

