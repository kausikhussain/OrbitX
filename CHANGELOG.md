# 📝 CHANGELOG — ECLIPTARA

All notable changes to the **ECLIPTARA** Space Intelligence & Planetary Defense Observatory are documented in this file.

---

## [2.0.0] - 2026-10-30 — *The Flagship Observatory Release*

### 🌌 Complete Architecture & Product Transformation
- **Product Identity:** Rebranded from Orbit Watch to **ECLIPTARA** — an ultra-premium, cinematic, scientifically grounded Space Situational Awareness and Planetary Defense platform.
- **Mission Control Layout:** Completely overhauled UI layout into a professional four-tier cockpit:
  - **Top Command Bar (48px):** Real-time dual UTC/IST clock, threat verdict badge (`CLEAR` / `WATCH` / `ALERT`), live object count, date navigation, Quick Jump calendar, synthesized audio toggle, and Quick Palette search trigger (`Ctrl+K`).
  - **Left Navigation Rail (60px):** Mode selector enabling 1-click transitions between:
    - 🌍 **Asteroid Tracker (3D Space)** — Near-Earth object flybys and trajectory projections.
    - 🛰️ **Satellite Swarm** — ~16,000 real-time tracked orbital assets with dedicated ISRO / India filter.
    - 💥 **Impact Lab** — Ballistic physics simulation and geospatial blast modeling.
    - 🚀 **Launch Manifest** — Upcoming global rocket launches with live countdowns.
    - 🌞 **Space Today** — NASA APOD, DSCOVR EPIC, DONKI space weather, JPL Fireballs, and JPL Sentry watch list.
  - **Contextual Inspector Drawer (380px):** Dual-view drawer featuring:
    - **Callset Browser:** Complete list of passing NEOs with real-time sorting (Time, Miss Distance, Diameter, Velocity) and hazard filtering.
    - **Object Dossier:** In-depth telemetry card with physical dimensions, relative speed (Mach / km/s), human-scale comparisons (e.g., Boeing 747, Eiffel Tower), orbital vectors, and direct "Simulate Impact" deep-linking.
  - **Orbital Timeline (56px):** Chronological 24-hour flyby scrubber with visual distance nodes and automated playback.
  - **Canvas HUD:** Floating glassmorphic target indicator pinned to selected asteroids in 3D WebGL space.

### ⚡ Windows Zero-Dependency Runtime & Server
- **Eliminated Python Dependency:** Replaced `python -m http.server` with a native, zero-dependency Node.js HTTP server (`server.js`).
- **High-Performance Static Server (`server.js`):**
  - Serves static files with automatic MIME type resolution (HTML, CSS, JS, WOFF2, PNG, JSON, GLTF).
  - Includes directory-traversal security guards preventing access outside project bounds.
  - Features automatic port fallback: attempts port 4173, falls back gracefully if occupied.
  - Sets appropriate caching and CORS headers for WebGL assets.
- **Windows Double-Click Launcher (`start-windows.bat`):**
  - Verifies Node.js installation with clear error handling and instructions if missing.
  - Automatically launches the user's default browser at `http://localhost:4173/`.
  - Starts the local server cleanly.
- **Cross-Platform NPM Scripts:** Added `npm start`, `npm run serve`, `npm test`, `npm run verify`, `npm run lint`, and `npm run build`.

### 💥 Enhanced Planetary Impact Physics Engine
- **Composition & Density Selector:** Added material density dropdown in Impact Lab:
  - *Stony Chondrite* ($3,000\text{ kg/m}^3$)
  - *Iron-Nickel Metallic* ($7,800\text{ kg/m}^3$)
  - *Carbonaceous / Cometary* ($1,000\text{ kg/m}^3$)
- **Ballistic Calculations:**
  - Dynamic kinetic energy computation: $E = \frac{1}{2} m v^2$, reported in Megatons of TNT and Hiroshima equivalents.
  - Crater diameter and depth scaling models based on target geology (sedimentary rock / water).
  - Multi-zone blast overpressure visualization on Leaflet maps:
    - 🟡 **Thermal Radiation Radius** (3rd-degree burns)
    - 🟠 **Airburst Overpressure** (5 psi - residential collapse)
    - 🔴 **Total Destruction Zone** (20 psi - multi-story concrete failure)
    - 🟣 **Transient Impact Crater**
- **Impact Presets:** Quick-target buttons for major metropolitan areas worldwide and across India (Bengaluru, New Delhi, Mumbai, Kolkata, Chennai, Tokyo, New York, London).

### 🛰️ Satellite Swarm & Space Weather Modules
- **CelesTrak SGP4 Orbit Propagation:** Propagates 16,000+ orbital objects using `satellite.js`.
- **ISRO / India Filter:** One-click filter highlighting Indian Space Research Organisation assets (Chandrayaan, GSAT, Cartosat, RISAT, PSLV/GSLV upper stages).
- **Heliophysics Telemetry:** Integrated NASA DONKI solar flare notifications, coronal mass ejections, and geomagnetic disturbance indices.
- **Deep Space Earth Imagery:** NASA DSCOVR EPIC real-color full-disk Earth imagery.
- **JPL Sentry & Fireball Watch:** Direct ingestion of active Sentry impact monitoring items and worldwide bolide atmospheric detonations.

### 🧪 Automated Verification Suite
- Built lightweight, zero-dependency Node.js test harness (`tests/run.js`) with 100% test pass rate:
  - **Astronomy Math:** Verifies distance conversions (AU, Lunar Distances, km), Keplerian velocity vectors, and coordinate projections.
  - **Impact Physics:** Tests kinetic energy scaling, crater dimensions, and blast overpressure radii against published benchmarks.
  - **Data Schemas:** Validates NASA NeoWs, JPL CNEOS, and CelesTrak TLE payload structures and offline fallbacks.

### 📸 Shareable Intelligence & Media
- **Canvas Dossier Generator (`share.js`):** Creates downloadable high-resolution 1200x630 mission briefing cards with branded ECLIPTARA headers and close-approach parameters.
- **3D WebGL Snapshot:** One-click high-resolution screenshot export capturing the exact 3D camera angle and illuminated Earth.

---
*ECLIPTARA — Precision Planetary Defense*

