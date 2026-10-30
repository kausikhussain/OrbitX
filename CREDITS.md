# 📜 CREDITS & DATA PROVENANCE — ECLIPTARA

**ECLIPTARA** is an advanced Space Situational Awareness and Planetary Defense Observatory. The platform relies on scientific telemetry, astronomical models, and data provided by international space agencies and open-source scientific projects.

---

## 🏛️ Scientific Data Providers & Authorities

| Agency / Project | Dataset / Service | Primary Use in Ecliptara | License / Terms of Use |
| :--- | :--- | :--- | :--- |
| **NASA JPL CNEOS** (Center for Near Earth Object Studies) | **NeoWs API** (Near Earth Object Web Service) | Real-time Near-Earth Asteroid trajectories, close-approach velocity, miss distance, diameter bounds, and hazardous status. | Public Domain (NASA Open Data Policy) |
| **NASA JPL SSD** (Solar System Dynamics) | **Sentry Earth Impact Monitoring** | Impact probabilities, Palermo & Torino scale ratings, and potential future collision analysis. | Public Domain (NASA Open Data Policy) |
| **NASA JPL CNEOS** | **Fireball and Bolide Reports** | Chronological record of high-energy atmospheric fireballs, impact kinetic energy (kt TNT), and atmospheric altitude. | Public Domain (NASA Open Data Policy) |
| **NASA GSFC** (Goddard Space Flight Center) | **DONKI API** (Space Weather Database of Notifications, Knowledge, and Information) | Geomagnetic storms (GST), Coronal Mass Ejections (CME), and Solar Flares (FLR). | Public Domain (NASA Open Data Policy) |
| **NASA DSCOVR Mission** | **EPIC API** (Earth Polychromatic Imaging Camera) | High-definition natural color imagery of Earth taken from the Sun-Earth Lagrange Point 1 (L1). | Public Domain (NASA Open Data Policy) |
| **NASA / APOD** | **Astronomy Picture of the Day** | Daily curated astrophysical photography, high-resolution imagery, and expert descriptive commentary. | NASA / Respective Astrophotographers |
| **CelesTrak / Dr. T.S. Kelso** | **General Perturbations (GP) TLEs** | Two-Line Element sets for 16,000+ active satellites, debris, and constellation tracking (including ISRO / India filter). | Open Access / CelesTrak attribution |
| **The Space Devs** | **Launch Library 2 API** | Global rocket launch manifests, orbital countdowns, launch vehicle specifications, and pad locations. | CC BY-SA 4.0 / The Space Devs |
| **NASA Visible Earth** | **Blue Marble & Night Lights** | Photorealistic daytime land textures, cloud layers, and city night light radiance maps. | NASA Public Domain |

---

## 💻 Open-Source Software Libraries

| Library | Version | License | Role in Ecliptara |
| :--- | :--- | :--- | :--- |
| **Three.js** | `r128` | MIT License | 3D WebGL scenegraph, Earth shader, orbital trajectories, asteroid geometry, and celestial particles. |
| **Leaflet** | `1.9.4` | BSD-2-Clause | Planetary Impact Lab: interactive 2D geospatial ballistic mapping and damage zone visualization. |
| **satellite.js** | `5.0.0` | MIT License | SGP4/SDP4 satellite orbit propagation from CelesTrak TLE records to ECI coordinates. |
| **astronomy-engine** | `2.1.19` | MIT License | High-precision heliocentric planetary positions, celestial coordinates, and orrery mechanics. |
| **Node.js** | `>=18.0` | MIT License | Lightweight, zero-dependency local static server (`server.js`) with security boundary checking. |

---

## 🎨 Visual Assets, Typography & Media

- **Typefaces:**
  - **Space Grotesk** by Florian Karsten (SIL Open Font License 1.1)
  - **JetBrains Mono** by JetBrains (Apache License 2.0 / SIL Open Font License 1.1)
  - **Inter** by Rasmus Andersson (SIL Open Font License 1.1)
- **Audio:**
  - Procedural Web Audio API sound synthesis (sub-bass cosmic drone, radar sweeps, telemetry pulses) generated mathematically in-browser with zero external audio assets.
- **Cartography & Maps:**
  - OpenStreetMap & CartoDB Dark Matter tiles for Leaflet geospatial impact analysis (ODbL / CC BY 3.0).

---

## ⚖️ Scientific Disclaimers

1. **Simulation Models:** Calculations in the Planetary Impact Lab (crater dimensions, airburst blast overpressures, thermal radiation, and seismic effects) utilize simplified scientific scaling laws based on Collins et al. (2005) (*Earth Impact Effects Program*, Imperial College London / Purdue University). They are intended for educational and situational assessment purposes.
2. **Trajectory Data:** Asteroid orbital paths and close-approach vectors are computed from NASA/JPL osculating orbital elements. For high-precision scientific ephemerides, refer to JPL Horizons.

---
*ECLIPTARA — Planetary Defense & Space Situational Awareness Platform*

