<div align="center">

# ☄️ ECLIPTARA
### **Autonomous Space Situational Awareness & Planetary Defense Observatory**

*Observe Near-Earth Space. Understand Every Encounter.*

[![Version](https://img.shields.io/badge/version-2.0.0-00f0ff.svg?style=for-the-badge&logo=satellite)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20%3E%3D%2018%20(Zero%20Python)-green.svg?style=for-the-badge&logo=node.js)](server.js)
[![WebGL](https://img.shields.io/badge/Graphics-Three.js%20r128%20WebGL-ff69b4.svg?style=for-the-badge&logo=three.js)](https://threejs.org)
[![Telemetry](https://img.shields.io/badge/Telemetry-NASA%20NeoWs%20%7C%20JPL%20CNEOS%20%7C%20CelesTrak-blue.svg?style=for-the-badge&logo=nasa)](CREDITS.md)
[![Scientific Verification](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen.svg?style=for-the-badge&logo=checkmarx)](tests/run.js)

<br/>

[**Explore Live Telemetry**](#-core-modules--capabilities) •
[**Quick Start (Windows/Mac/Linux)**](#-quick-start-zero-dependency--no-python-needed) •
[**Astrodynamics & Physics**](#-scientific--astrodynamic-formulations) •
[**Code Architecture**](#-system-architecture--codebase-map) •
[**Data Provenance**](CREDITS.md)

---

</div>

## 🔭 Executive Briefing

**ECLIPTARA** is a cinematic, precision-engineered Space Situational Awareness (SSA) and Planetary Defense platform. It aggregates live orbital telemetry from NASA, JPL, and CelesTrak, rendering Near-Earth Objects (NEOs), space weather, and satellite constellations into a 3D mission-control workstation.

When a near-Earth asteroid approaches our planet, ECLIPTARA computes its trajectory, gravitational acceleration, miss distance, physical size comparisons, and hypothetical ground impact physics down to overpressure blast radii and crater excavation metrics.

> **Primary Threat Status:** Real-time threat classification engine automatically evaluates daily flybys against NASA Sentry criteria and marks hazardous objects under Torino/Palermo risk scales.

---

## 🪟 Quick Start (Zero-Dependency — No Python Needed)

Ecliptara requires **no build step, no bundlers, and no Python**. It runs out-of-the-box using standard Node.js.

### ⚡ Method 1: Windows One-Click Launcher (Recommended)
Simply double-click:
```text
start-windows.bat
```
*Automatically validates your Node runtime, boots the local static server, and launches your default browser at `http://localhost:4173/`.*

---

### 💻 Method 2: Command Line (PowerShell, Bash, Zsh)

```bash
# 1. Clone repository
git clone https://github.com/prithal11yt/orbit-watch.git
cd orbit-watch

# 2. Launch Observatory Server
npm start
# (Or: 'node server.js' / 'npm run serve')

# 3. Open in Browser
# Navigate to: http://localhost:4173/
```

### 🧪 Run Scientific Verification Suite
Ecliptara comes with an automated unit test harness validating all astronomical equations, coordinate transformations, and ballistic damage scaling laws:
```bash
npm test
# (Or: 'npm run verify' / 'node tests/run.js')
```

---

## 🌟 Core Modules & Capabilities

```
+---------------------------------------------------------------------------------------+
|                                    ECLIPTARA HUD                                      |
+---------------------------------------------------------------------------------------+
|  [NAV RAIL]   | [VIEWPORT]                              | [INSPECTOR DRAWER]          |
|  - 3D Asteroid|  - Procedural WebGL Earth               |  - Callset Queue & Filters  |
|  - Satellites |  - Hyperbolic Asteroid Trajectories     |  - Full Telemetry Dossier   |
|  - Impact Lab |  - Logarithmic Radial Scene Depth       |  - Scale Comparisons        |
|  - Launches   |  - Atmospheric Rayleigh Shader          |  - Instant Impact Transfer  |
|  - Weather    |  - Real-time Pinned Target HUD          |                             |
+---------------------------------------------------------------------------------------+
|  [24-HOUR ORBITAL TIMELINE SCRUBBER]                                                  |
+---------------------------------------------------------------------------------------+
```

### 1. 🌍 3D Near-Earth Object Orbit Visualizer
* **Multi-Layer WebGL Earth:** Procedural land textures with dynamic daylight illumination, nocturnal city luminescence, procedural cloud layers, and Rayleigh atmospheric glow.
* **Logarithmic Radial Projection:** Resolves the astronomical dynamic range problem by preserving radial ordering from Low Earth Orbit ($< 2,000\text{ km}$) out to $50,000,000\text{ km}$ ($> 130\text{ LD}$) while maintaining interactive target picking.
* **Live Ingestion:** Real-time synchronization with NASA's NeoWs API displaying today's asteroid callset with velocity vectors and miss distances.

### 2. 💥 Planetary Impact Lab (Geospatial Ballistics)
An interactive cartographic physics laboratory modeling impact scenarios on an interactive Leaflet map:
* **Material Composition & Density:**
  * 🪨 **Stony Chondrite:** $\rho = 3,000\text{ kg/m}^3$
  * ⚙️ **Iron-Nickel Metallic:** $\rho = 7,800\text{ kg/m}^3$
  * ☄️ **Carbonaceous / Cometary:** $\rho = 1,000\text{ kg/m}^3$
* **Kinetic Energy Computation:**
  $$E_k = \frac{1}{2} m v^2$$
  Yield expressed in Megatons of TNT ($1\text{ Mt} = 4.184 \times 10^{15}\text{ J}$) and Hiroshima atomic bomb equivalents ($15\text{ kt}$).
* **Multi-Tier Damage Radii:**
  * 🟣 **Transient Impact Crater:** Excavated diameter and depth from Collins, Melosh & Marcus (2005) scaling.
  * 🔴 **Total Destruction Zone ($20\text{ psi}$):** Complete collapse of reinforced multi-story concrete structures.
  * 🟠 **Severe Damage Zone ($5\text{ psi}$):** Structural failure of residential dwellings.
  * 🟡 **Thermal Radiation Radius:** Third-degree burns from hyper-velocity atmospheric flash.
  * ⚪ **Window Shatter Zone ($1\text{ psi}$):** Glass failure across broad urban areas.
* **Target Presets:** 1-click targeting for major global and Indian metropolises (Bengaluru, New Delhi, Mumbai, Kolkata, Chennai, Tokyo, London, New York).

### 3. 🛰️ Live Satellite Swarm (~16,000 Tracked Objects)
* **SGP4/SDP4 Orbit Propagation:** Ingests General Perturbations (GP) Two-Line Elements from CelesTrak and calculates orbital coordinates in real time via `satellite.js`.
* **ISRO / India Spotlight:** Dedicated saffron layer isolating Indian Space Research Organisation assets (Chandrayaan, Cartosat, GSAT, RISAT, PSLV rocket bodies).

### 4. 🚀 Global Launch Manifest
* Real-time orbital mission manifests aggregated from Launch Library 2.
* Live ticking countdowns to upcoming orbital rocket launches, launch vehicle specifications, operator details, and pad coordinates.

### 5. 🌞 Heliophysics & Space Weather ("Space Today")
* **NASA DONKI:** Real-time tracking of Coronal Mass Ejections (CME), Solar Flares (FLR), and Geomagnetic Storms (GST).
* **NASA DSCOVR EPIC:** Full-disk natural color Earth imagery taken from the Sun-Earth L1 Lagrange point ($1.5\text{ million km}$ away).
* **JPL Fireballs & Bolides:** Chronological atmospheric detonation coordinates plotted directly onto the 3D globe.
* **JPL Sentry:** Earth Impact Monitoring list with Palermo and Torino risk indices.

---

## 🔬 Scientific & Astrodynamic Formulations

### 1. Diameter Estimation from Absolute Magnitude ($H$)
When visual albedo ($p_v$) is unmeasured, ECLIPTARA applies the Bowell et al. (1989) standard relationship:
$$D = \frac{1329}{\sqrt{p_v}} \times 10^{-0.2 H} \quad (\text{km})$$
Nominal diameters are derived assuming NEO standard geometric albedo $p_v = 0.14$, accompanied by minimum ($p_v = 0.25$) and maximum ($p_v = 0.05$) uncertainty bounds.

### 2. Logarithmic Scene Projection
To display Earth ($R_{\oplus} = 6,371\text{ km}$) and distant flybys ($> 50,000,000\text{ km}$) within the same WebGL frustum without clipping or occluding close encounters:
$$R_{\text{scene}} = 10.0 + \log_{10}(1.0 + \text{LD}) \times 22.0$$

### 3. Instantaneous Hyperbolic Flyby Trajectory
For encounter replay modeling relative to closest approach ($\Delta t = 0$):
$$r(\Delta t) = \sqrt{d_{\text{min}}^2 + (v_{\infty} \cdot \Delta t)^2}$$
Gravitational acceleration in Earth's potential well:
$$v(r) = \sqrt{v_{\infty}^2 + \frac{2 G M_{\oplus}}{r}}$$

---

## 🏛️ System Architecture & Codebase Map

```text
ecliptara/
├── index.html                    # 4-tier observatory cockpit interface
├── package.json                  # Scripts: start, serve, test, verify, lint, build
├── server.js                     # Zero-dependency Node.js HTTP server (MIME, CORS, traversal guard)
├── start-windows.bat             # One-click Windows startup script
├── start.command                 # macOS / Linux startup script
├── README.md                     # Engineering documentation & scientific formulas
├── CREDITS.md                    # Data provenance, licensing, and authorities
├── CHANGELOG.md                  # Release log
├── LICENSE                       # MIT License
├── css/
│   └── style.css                 # Mission control design system (Obsidian glassmorphism)
├── js/
│   ├── main.js                   # Application bootstrap, WebGL loop & state synchronization
│   ├── state.js                  # Centralized reactive observable telemetry store
│   ├── impact.js                 # Planetary Impact Lab: Ballistics & Leaflet mapping
│   ├── launches.js               # Launch Library 2 service with countdown ticker
│   ├── share.js                  # Canvas mission card dossier export generator
│   ├── sky.js                    # Night sky orrery & celestial coordinate projection
│   ├── sound.js                  # Procedural Web Audio API sound synthesis
│   ├── swarm.js                  # SGP4 satellite propagation engine
│   ├── today.js                  # Multimodal space weather controller
│   ├── api/                      # Resilient telemetry API clients
│   │   ├── client.js             # HTTP client with timeouts, cache safety & AbortController
│   │   ├── nasa.js               # NASA NeoWs, APOD, DSCOVR EPIC, and DONKI feeds
│   │   ├── jpl.js                # JPL CNEOS Fireball bolides & Sentry impact risk catalog
│   │   ├── celestrak.js          # CelesTrak active satellite TLEs with ISRO regex classification
│   │   └── launches.js           # Launch Library 2 service with ISRO mission priority
│   ├── astronomy/                # Core astrodynamic & physical calculations
│   │   ├── constants.js          # IAU, CODATA & NASA Planetary Defense physical constants
│   │   ├── calculations.js       # Astronomical coordinate transforms & Bowell magnitude math
│   │   ├── impact-physics.js     # Collins/Melosh crater scaling & Glasstone blast overpressure
│   │   └── encounter.js          # Hyperbolic flyby astrodynamics & instantaneous state vectors
│   └── features/                 # Advanced investigation modules
│       ├── encounter-replay.js   # 24h interactive flyby trajectory scrubber
│       ├── comparison-lab.js     # Multi-asteroid side-by-side comparison matrix
│       └── provenance.js         # Data provenance, telemetry freshness & quality panel
└── tests/
    ├── astronomy.test.js         # Astronomical math & coordinate transform unit tests
    ├── impact.test.js            # Kinetic energy & crater dimension unit tests
    ├── api.test.js               # Telemetry schema validation & offline fallback tests
    └── run.js                    # Automated scientific test runner
```

---

## ⌨️ Command Palette & Keyboard Shortcuts

| Key Combination | Action |
|:---|:---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>⌘</kbd> + <kbd>K</kbd> | Open Command Palette / Global Search |
| <kbd>E</kbd> | Toggle Asteroid Callset Inspector Drawer |
| <kbd>T</kbd> | Launch 24h Encounter Replay Scrubber |
| <kbd>C</kbd> | Open Asteroid Comparison Lab |
| <kbd>←</kbd> / <kbd>→</kbd> | Shift Observation Date (Previous / Next Day) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Cycle Previous / Next Asteroid in Callset |
| <kbd>Esc</kbd> | Clear Active Selection / Dismiss Modal or Drawer |
| <kbd>R</kbd> | Reset 3D Camera to Prime Meridian Orientation |
| <kbd>F</kbd> | Toggle Fullscreen Mission Control Mode |
| <kbd>M</kbd> | Toggle Procedural Sub-Bass Audio Atmosphere |
| <kbd>S</kbd> | Toggle Active Satellite Swarm Point Cloud |
| <kbd>?</kbd> | Open Help & Technical Specification Panel |

---

## 📜 Scientific Authorities & Data Provenance

| Agency / Project | Dataset | Primary Role |
| :--- | :--- | :--- |
| **NASA JPL CNEOS** | **NeoWs** | Near-Earth Asteroid trajectories, velocities, diameters, miss distances. |
| **NASA JPL SSD** | **Sentry** | Earth impact monitoring, Palermo & Torino impact risk calculations. |
| **NASA JPL CNEOS** | **Fireballs** | Bolide atmospheric detonation coordinates and total optical energy. |
| **NASA GSFC** | **DONKI** | Space Weather: Coronal Mass Ejections, Solar Flares, Geomagnetic Storms. |
| **NASA DSCOVR** | **EPIC** | Full-disk Earth photography from Sun-Earth L1 Lagrange point. |
| **NASA / APOD** | **APOD** | Daily curated astrophysical photography and research commentary. |
| **CelesTrak** | **GP TLEs** | SGP4 orbital elements for 16,000+ active satellites and debris. |
| **The Space Devs** | **Launch Library 2** | Global orbital rocket launch manifest and countdown tracking. |

*Full data licensing and citation guidelines are documented in [`CREDITS.md`](CREDITS.md).*

---

## ⚖️ License & Open Source Attribution

ECLIPTARA is released under the **[MIT License](LICENSE)**.

Third-party scientific and graphics libraries utilized:
- **Three.js** (MIT) — 3D WebGL scenegraph & rendering engine
- **Leaflet** (BSD-2-Clause) — Geospatial planetary impact mapping
- **satellite.js** (MIT) — SGP4/SDP4 satellite orbit propagation
- **astronomy-engine** (MIT) — Heliocentric planetary positions & orrery calculations

---

<div align="center">
  <sub>Engineered for Planetary Defense & Space Situational Awareness • 2026</sub>
</div>
