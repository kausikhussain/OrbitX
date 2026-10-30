// ==========================================================================
// Share Card Generator
// Produces a crisp 1080×1350 image card for social sharing & mission logging.
// ==========================================================================

export function downloadShareCard(s) {
  const W = 1080;
  const H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const x = cv.getContext("2d");

  // Deep space gradient
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#030611");
  bg.addColorStop(0.5, "#081024");
  bg.addColorStop(1, "#030611");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // Background star field
  for (let i = 0; i < 240; i++) {
    x.globalAlpha = 0.15 + Math.random() * 0.75;
    x.fillStyle = Math.random() > 0.8 ? "#9ad8ff" : "#ffffff";
    const r = Math.random() * 1.8 + 0.4;
    x.beginPath();
    x.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;

  // Earth limb at bottom
  const ex = W / 2;
  const ey = H + 340;
  const er = 640;
  x.save();
  x.shadowColor = "#4aa8ff";
  x.shadowBlur = 100;
  const eg = x.createRadialGradient(ex - 120, ey - er + 180, 80, ex, ey, er);
  eg.addColorStop(0, "#2b6ebd");
  eg.addColorStop(0.6, "#0f2d57");
  eg.addColorStop(1, "#050e1f");
  x.fillStyle = eg;
  x.beginPath();
  x.arc(ex, ey, er, 0, Math.PI * 2);
  x.fill();
  x.restore();

  const sans = '"Space Grotesk", -apple-system, sans-serif';
  const mono = '"IBM Plex Mono", monospace';

  const centerText = (txt, y, font, color, spacing) => {
    x.font = font;
    x.fillStyle = color;
    x.textAlign = "center";
    if ("letterSpacing" in x) x.letterSpacing = spacing || "0px";
    x.fillText(txt, W / 2, y);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
  };

  centerText("ORBIT SITUATIONAL REPORT", 140, "600 20px " + mono, "#6ee7ff", "6px");
  centerText(s.date.toUpperCase(), 185, "500 24px " + mono, "#9db2d5", "4px");
  centerText("NEAR-EARTH OBJECT FLYBY STATUS", 260, "700 36px " + sans, "#ffffff", "2px");

  // Status verdict
  const isHazardous = Boolean(s.hazardCount && s.hazardCount > 0);
  x.save();
  x.shadowColor = isHazardous ? "rgba(255,82,119,0.5)" : "rgba(56,239,125,0.4)";
  x.shadowBlur = 35;
  const verdictText = isHazardous ? "MONITORED FLYBYS RECORDED" : "NOMINAL TRAJECTORIES";
  centerText(verdictText, 350, "700 48px " + sans, isHazardous ? "#ff5277" : "#38ef7d");
  x.restore();

  // Sub-caption
  centerText(
    `${s.count || 0} asteroids passing Earth on ${s.date} · All calculated trajectories clear Earth`,
    420,
    "400 22px " + mono,
    "#8fa3c8"
  );

  // Spotlight Card
  if (s.closest) {
    const cy = 540;
    x.fillStyle = "rgba(14, 25, 52, 0.75)";
    x.strokeStyle = "rgba(110, 231, 255, 0.3)";
    x.lineWidth = 1.5;
    roundRect(x, 140, cy, W - 280, 320, 24);
    x.fill();
    x.stroke();

    centerText("CLOSEST PASSAGE SPOTLIGHT", cy + 60, "600 20px " + mono, "#6ee7ff", "4px");
    centerText(s.closest.name, cy + 130, "700 50px " + sans, "#ffffff");
    
    const sizeStr = `Est. ~${Math.round(s.closest.diameterM)} m diameter`;
    const speedStr = `${Math.round(s.closest.velocityKmh).toLocaleString("en-US")} km/h`;
    centerText(`${sizeStr}  ·  ${speedStr}`, cy + 195, "500 24px " + mono, "#9db2d5");

    const lunarMult = (s.closest.missKm / 384400).toFixed(1);
    const missKmFmt = Math.round(s.closest.missKm).toLocaleString("en-US");
    centerText(`Miss distance: ${missKmFmt} km (${lunarMult}× Lunar Distance)`, cy + 250, "500 22px " + mono, "#6ee7ff");
  }

  // Summary Metrics Bar
  const barY = 960;
  centerText(`Total Tracked: ${s.count || 0}   |   PHAs Listed: ${s.hazardCount || 0}   |   Live NASA Ephemeris`, barY, "500 22px " + mono, "#c8d6f2");

  // Footer Branding
  centerText("☄️ ECLIPTARA", H - 140, "700 32px " + sans, "#ffffff", "6px");
  centerText("SPACE INTELLIGENCE OBSERVATORY · NASA NeoWs & JPL Ephemerides", H - 90, "400 18px " + mono, "#5e779f", "2px");

  cv.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ecliptara-${s.date}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}
