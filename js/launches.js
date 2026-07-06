// Next rocket launch countdown — Launch Library 2 (free), ISRO gets priority. 🚀
const $ = (id) => document.getElementById(id);

export async function initLaunches() {
  let list = null;
  try {
    const c = JSON.parse(localStorage.getItem("ll2-cache") || "null");
    if (c && Date.now() - c.t < 6 * 3600e3) list = c.d;
  } catch (_) {}

  if (!list) {
    const res = await fetch("https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=40&mode=list");
    if (!res.ok) throw new Error("LL2 " + res.status);
    const j = await res.json();
    list = (j.results || []).map((x) => ({
      name: x.name || "",
      net: x.net,
      lsp: x.lsp_name || (x.launch_service_provider && x.launch_service_provider.name) || "",
    }));
    try { localStorage.setItem("ll2-cache", JSON.stringify({ t: Date.now(), d: list })); } catch (_) {}
  }

  const future = list.filter((l) => l.net && new Date(l.net) > Date.now());
  if (!future.length) return;
  const isro = future.find((l) => /ISRO|Indian Space/i.test(l.lsp));
  const pick = isro || future[0];

  const chip = $("launch-chip");
  const mission = (pick.name.split("|")[1] || pick.name).trim();
  const rocket = (pick.name.split("|")[0] || "").trim();
  chip.classList.remove("hidden-hard");
  $("launch-label").textContent = (isro ? "🇮🇳 " : "🚀 ") + mission;
  $("launch-rocket").textContent = (isro ? "ISRO · " : (pick.lsp ? pick.lsp + " · " : "")) + rocket;

  const t = new Date(pick.net).getTime();
  const tick = () => {
    let s = Math.max(0, Math.floor((t - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    $("launch-count").textContent =
      d > 0 ? `T− ${d}d ${h}h ${m}m` : `T− ${h}h ${m}m ${String(s).padStart(2, "0")}s`;
  };
  tick();
  setInterval(tick, 1000);
}
