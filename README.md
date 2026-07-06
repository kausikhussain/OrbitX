# ☄️ Orbit Watch

**Is anything hitting Earth today?** A live 3D tracker of every asteroid passing Earth right now — powered by real NASA data.

🔭 **[Live demo →](https://prithal11yt.github.io/orbit-watch/)**

## What it does

- Renders a cinematic 3D Earth (city lights, clouds, atmosphere) with the **real asteroids passing today**, pulled live from NASA's [NeoWs API](https://api.nasa.gov).
- Click any rock to see its size, speed and miss distance in plain language ("the size of a Boeing 747", "54× farther than the Moon").
- **💥 Impact simulator** — drop any asteroid on an Indian city and see the blast radius on a real map, with Hiroshima-equivalent energy.
- **🛰️ Live satellite swarm** — ~16,000 real tracked objects in orbit (CelesTrak TLEs propagated in-browser), with an India/ISRO filter.
- **🚀 Launch countdown**, **🌞 Space Today** panel (APOD, solar flares, fireballs, NASA's real impact watch list), **📸 share cards**, **🕰️ time travel**, and synthesized space audio.

## Run locally

No build step — it's a static site.

```bash
python3 -m http.server 4173
# then open http://localhost:4173
```

## Tech

Vanilla JS + [three.js](https://threejs.org) (WebGL), Leaflet for the impact map, satellite.js for orbits, astronomy-engine for the orrery. Data: NASA NeoWs / DONKI / EPIC / APOD, JPL SSD (fireballs & Sentry), CelesTrak, Launch Library 2.

Built with [Claude Code](https://claude.com/claude-code).
