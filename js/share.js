// Renders today's Earth status as a 1080×1350 image (Insta/WhatsApp story friendly).
export function downloadShareCard(s) {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const x = cv.getContext("2d");

  // background
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#050a1e");
  bg.addColorStop(1, "#0b1434");
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // stars
  for (let i = 0; i < 260; i++) {
    x.globalAlpha = 0.15 + Math.random() * 0.75;
    x.fillStyle = Math.random() > 0.85 ? "#9ad8ff" : "#ffffff";
    const r = Math.random() * 1.8 + 0.4;
    x.beginPath();
    x.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    x.fill();
  }
  x.globalAlpha = 1;

  // Earth peeking from the bottom
  const ex = W / 2, ey = H + 320, er = 620;
  x.save();
  x.shadowColor = "#4aa8ff";
  x.shadowBlur = 120;
  const eg = x.createRadialGradient(ex - 150, ey - er + 200, 80, ex, ey, er);
  eg.addColorStop(0, "#2f6fbd");
  eg.addColorStop(0.55, "#123a6e");
  eg.addColorStop(1, "#081a38");
  x.fillStyle = eg;
  x.beginPath();
  x.arc(ex, ey, er, 0, Math.PI * 2);
  x.fill();
  x.restore();

  const danger = /SPICY/.test(s.verdict);
  const sans = '"Space Grotesk", system-ui, sans-serif';
  const mono = '"IBM Plex Mono", monospace';

  const center = (txt, y, font, color, spacing) => {
    x.font = font;
    x.fillStyle = color;
    x.textAlign = "center";
    if ("letterSpacing" in x) x.letterSpacing = spacing || "0px";
    x.fillText(txt, W / 2, y);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
  };

  center(s.date.toUpperCase(), 150, "26px " + mono, "#8fa3c8", "8px");
  center("IS ANYTHING HITTING EARTH TODAY?", 220, "600 34px " + sans, "#c8d6f2", "6px");

  // verdict — shrink to fit
  let size = 92;
  x.font = `700 ${size}px ` + sans;
  while (x.measureText(s.verdict).width > W - 120 && size > 40) {
    size -= 4;
    x.font = `700 ${size}px ` + sans;
  }
  x.save();
  x.shadowColor = danger ? "rgba(255,92,122,.65)" : "rgba(74,222,128,.55)";
  x.shadowBlur = 40;
  center(s.verdict, 340, `700 ${size}px ` + sans, danger ? "#ff5c7a" : "#4ade80");
  x.restore();

  // sub line, wrapped
  x.font = "26px " + mono;
  x.fillStyle = "#8fa3c8";
  const words = s.sub.split(" ");
  let line = "", y = 420;
  for (const w of words) {
    if (x.measureText(line + w).width > W - 200) {
      center(line.trim(), y, "26px " + mono, "#8fa3c8");
      line = ""; y += 42;
    }
    line += w + " ";
  }
  center(line.trim(), y, "26px " + mono, "#8fa3c8");

  // closest-rock spotlight card
  const cy = 560;
  x.fillStyle = "rgba(110,231,255,0.06)";
  x.strokeStyle = "rgba(110,231,255,0.25)";
  roundRect(x, 120, cy, W - 240, 300, 28);
  x.fill(); x.stroke();
  center("⭐ STAR OF THE DAY", cy + 62, "22px " + mono, "#6ee7ff", "6px");
  center(s.closest.name, cy + 130, "700 52px " + sans, "#eaf2ff");
  center(`~${Math.round(s.closest.diameterM)} m wide · ${Math.round(s.closest.velocityKmh).toLocaleString("en-IN")} km/h`, cy + 190, "26px " + mono, "#8fa3c8");
  center(`passes ${(s.closest.missKm / 384400).toFixed(1)}× farther than the Moon`, cy + 240, "26px " + mono, "#8fa3c8");

  center(`${s.count} space rocks flew past Earth · all missed`, 960, "600 30px " + sans, "#c8d6f2");

  // footer
  center("☄️ ORBIT WATCH", H - 130, "700 34px " + sans, "#eaf2ff", "8px");
  center("LIVE DATA · NASA NeoWs API · api.nasa.gov", H - 80, "22px " + mono, "#6ee7ff", "4px");

  cv.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `orbit-watch-${new Date().toISOString().slice(0, 10)}.png`;
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
