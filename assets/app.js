// Bibliothèque de traces GPX — rendu de la liste et des pages parcours, sans étape de build.
// Ajouter un parcours = déposer le GPX dans gpx/ et ajouter une entrée dans parcours.json.
// Un parcours couru par Amaury porte "teste": true et "teste_le" : il reçoit le badge vert TESTÉ.

const fmtKm = (km) => km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const link = (txt, href) => (href ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(txt)}</a>` : esc(txt));

async function loadRoutes() {
  const res = await fetch("parcours.json", { cache: "no-cache" });
  return res.json();
}

// Badges : testé (vert) ou pas encore, plus une alerte si le secteur est fermé.
function badges(r) {
  const t = r.teste
    ? `<span class="tag ok">✓ Testé${r.teste_le ? ` le ${fmtDate(r.teste_le)}` : ""}</span>`
    : `<span class="tag todo">Pas encore testé</span>`;
  const kind = r.origine?.type === "course" ? `<span class="tag">Tracé de course</span>` : "";
  const closed = r.alerte ? `<span class="tag warn">⚠ ${esc(r.alerte)}</span>` : "";
  return `<div class="tags">${t}${kind}${closed}</div>`;
}

// Origine du tracé, toujours citée : course (organisation), balisage officiel (parc, fédération…), ou personnel.
function originHtml(r, compact = false) {
  const o = r.origine || { type: "personnel" };
  if (o.type === "course") {
    const main = `Tracé de ${link(o.course, o.lien)}, par <b>${esc(o.organisation)}</b>. Tout le mérite du tracé revient à l'organisation.`;
    return `<div class="credit">${main}${o.detail && !compact ? `<br><span class="meta">${esc(o.detail)}</span>` : ""}</div>`;
  }
  if (o.type === "balisage") {
    const src = o.source ? `Itinéraire balisé : ${link(o.source, o.lien)}.` : "Itinéraire balisé.";
    const osm = o.osm
      ? (compact ? " Tracé OpenStreetMap." : ` Tracé issu d'${link("OpenStreetMap", o.osm)} (© contributeurs OSM, ODbL).`)
      : "";
    return `<div class="credit">${src}${osm}</div>`;
  }
  return `<span class="tag">Itinéraire personnel</span>`;
}

// Accès : de gare à gare, depuis une gare (boucle), ou en voiture.
function accessLine(r) {
  const a = r.acces || {};
  const g = (x) => `Gare de ${esc(x.gare)}${x.ligne ? ` (${esc(x.ligne)})` : ""}${x.distance ? `, ${esc(x.distance)}` : ""}`;
  if (a.depart && a.arrivee) return `<div class="route-line">${g(a.depart)}<span class="arrow">→</span>${g(a.arrivee)}</div>`;
  if (a.depart) return `<div class="route-line">Depuis : ${g(a.depart)}</div>`;
  if (a.voiture) return `<div class="route-line">Accès en voiture${a.texte ? ` · <span class="meta">${esc(a.texte)}</span>` : ""}</div>`;
  return a.texte ? `<div class="route-line">${esc(a.texte)}</div>` : "";
}

function stats(r) {
  return `<div class="stats"><span class="box">${fmtKm(r.distance_km)} km</span><span class="box">${Math.round(r.dplus_m)} m D+</span>${
    r.type ? `<span class="meta">${esc(r.type)}</span>` : ""
  }</div>`;
}

function card(r) {
  return `<article class="card${r.teste ? " is-tested" : ""}">
    ${badges(r)}
    <h2><a href="parcours.html?id=${encodeURIComponent(r.id)}">${esc(r.titre)}</a></h2>
    ${accessLine(r)}
    ${stats(r)}
    ${r.resume ? `<p style="margin:0">${esc(r.resume)}</p>` : ""}
    ${originHtml(r, true)}
    <div class="actions">
      <a class="btn primary" href="parcours.html?id=${encodeURIComponent(r.id)}">Voir le parcours</a>
      <a class="btn" href="${esc(r.gpx)}" download>GPX</a>
    </div>
  </article>`;
}

async function renderIndex() {
  const all = await loadRoutes();
  const el = document.getElementById("list");
  const nTested = all.filter((r) => r.teste).length;
  let filter = "tous";
  try { filter = localStorage.getItem("filtre") || "tous"; } catch (e) {}

  const draw = () => {
    const routes = all.filter((r) => filter === "tous" || r.teste);
    document.querySelectorAll("[data-filtre]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtre === filter)));
    // regroupement par zone ; dans chaque zone, les parcours testés d'abord
    const zones = new Map();
    routes.forEach((r) => {
      const z = r.zone || "Autres";
      if (!zones.has(z)) zones.set(z, []);
      zones.get(z).push(r);
    });
    // zones avec un parcours testé d'abord, puis accès en train, puis zones en voiture
    const carOnly = (rs) => rs.every((r) => r.acces?.voiture);
    const order = [...zones.entries()].sort((a, b) =>
      b[1].filter((r) => r.teste).length - a[1].filter((r) => r.teste).length ||
      carOnly(a[1]) - carOnly(b[1]) || a[0].localeCompare(b[0], "fr"));
    el.innerHTML = order
      .map(([z, rs]) => `<section class="zone"><h3 class="zone-title">${esc(z)} <span class="meta">${rs.length}</span></h3>
        <div class="list-inner">${rs
          .sort((a, b) => (b.teste ? 1 : 0) - (a.teste ? 1 : 0) || a.distance_km - b.distance_km)
          .map(card).join("")}</div></section>`)
      .join("");
  };

  document.getElementById("filters").innerHTML = `
    <button class="chip" data-filtre="tous">Tous <span>${all.length}</span></button>
    <button class="chip" data-filtre="testes">✓ Testés <span>${nTested}</span></button>`;
  document.querySelectorAll("[data-filtre]").forEach((b) =>
    b.addEventListener("click", () => {
      filter = b.dataset.filtre;
      try { localStorage.setItem("filtre", filter); } catch (e) {}
      draw();
    }));
  draw();
}

function parseGpx(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  let nodes = [...xml.getElementsByTagName("trkpt")];
  if (!nodes.length) nodes = [...xml.getElementsByTagName("rtept")];
  const pts = nodes.map((p) => ({
    lat: +p.getAttribute("lat"),
    lon: +p.getAttribute("lon"),
    // altitude absente = portion non mesurée : on la laisse vide plutôt que d'inventer un profil
    ele: p.getElementsByTagName("ele")[0] ? +p.getElementsByTagName("ele")[0].textContent : NaN,
  }));
  let d = 0;
  pts.forEach((p, i) => {
    if (i) {
      const a = pts[i - 1], R = 6371000, toR = Math.PI / 180;
      const dLat = (p.lat - a.lat) * toR, dLon = (p.lon - a.lon) * toR;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(p.lat * toR) * Math.sin(dLon / 2) ** 2;
      d += 2 * R * Math.asin(Math.sqrt(h));
    }
    p.d = d;
  });
  return pts;
}

function profileSvg(pts) {
  const W = 1000, H = 250, padL = 100, padB = 42, padT = 14;
  const maxD = pts[pts.length - 1].d;
  const eles = pts.map((p) => p.ele).filter((e) => !Number.isNaN(e));
  if (!eles.length) return `<p class="meta" style="margin:4px 0 6px">Pas d'altitude dans ce GPX.</p>`;
  const lo = Math.floor(Math.min(...eles) / 25) * 25, hi = Math.max(Math.ceil(Math.max(...eles) / 25) * 25, lo + 25);
  const x = (d) => padL + (d / maxD) * (W - padL - 10);
  const y = (e) => padT + (1 - (e - lo) / (hi - lo)) * (H - padT - padB);
  // une suite de morceaux là où l'altitude est connue (les trous restent vides)
  const runs = [];
  let cur = [];
  pts.forEach((p) => {
    if (Number.isNaN(p.ele)) { if (cur.length > 1) runs.push(cur); cur = []; }
    else cur.push(p);
  });
  if (cur.length > 1) runs.push(cur);
  const seg = (run) => run.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele).toFixed(1)}`).join("");
  const line = runs.map(seg).join("");
  const area = runs.map((run) => seg(run) + `L${x(run[run.length - 1].d).toFixed(1)},${H - padB}L${x(run[0].d).toFixed(1)},${H - padB}Z`).join("");
  const missing = pts.some((p) => Number.isNaN(p.ele));
  const step = maxD > 30000 ? 10 : 5;
  let ticks = "";
  for (let km = 0; km <= maxD / 1000; km += step) {
    ticks += `<text class="axis" x="${x(km * 1000)}" y="${H - 6}" text-anchor="middle">${km} km</text>`;
  }
  ticks += `<text class="axis" x="${padL - 10}" y="${y(hi) + 8}" text-anchor="end">${hi} m</text>`;
  ticks += `<text class="axis" x="${padL - 10}" y="${y(lo)}" text-anchor="end">${lo} m</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profil altimétrique">
    <path d="${area}" fill="#f4cc3d" fill-opacity="0.35"/>
    <path d="${line}" fill="none" stroke="#e0b21c" stroke-width="3"/>
    <line x1="${x(0)}" x2="${x(maxD)}" y1="${H - padB}" y2="${H - padB}" stroke="currentColor" stroke-opacity="0.2"/>
    ${ticks}</svg>${missing ? `<p class="meta" style="margin:4px 0 6px">Altitude non mesurée sur les portions laissées vides.</p>` : ""}`;
}

async function renderRoute() {
  const id = new URLSearchParams(location.search).get("id");
  const routes = await loadRoutes();
  const r = routes.find((x) => x.id === id) || routes[0];
  document.title = `${r.titre} · Traces GPX`;
  const a = r.acces || {};
  const panel = (h, x) => `<div class="panel"><h3>${h}</h3><p>Gare de <b>${esc(x.gare)}</b>${x.ligne ? ` · ${esc(x.ligne)}` : ""}${
    x.paris ? ` · ${esc(x.paris)}` : ""}${x.distance ? ` · ${esc(x.distance)} du tracé` : ""}</p></div>`;
  const accessPanels = a.depart
    ? `<div class="grid2">${panel(a.arrivee ? "Aller" : "Accès", a.depart)}${a.arrivee ? panel("Retour", a.arrivee) : ""}</div>`
    : a.voiture || a.texte
      ? `<div class="grid2"><div class="panel"><h3>Accès</h3><p>${a.voiture ? "En voiture" : ""}${a.texte ? `${a.voiture ? " · " : ""}${esc(a.texte)}` : ""}</p></div></div>`
      : "";
  document.getElementById("route").innerHTML = `
    ${badges(r)}
    <h1 style="font-size:clamp(34px,7vw,64px);margin-top:10px">${esc(r.titre)}</h1>
    <div style="margin-top:14px">${accessLine(r)}${r.zone ? `<div class="meta">${esc(r.zone)}</div>` : ""}</div>
    <div style="margin-top:14px">${stats(r)}</div>
    <div style="margin-top:16px">${originHtml(r)}</div>
    <div id="map" aria-label="Carte du parcours"></div>
    <div class="profile" id="profile"></div>
    ${accessPanels}
    ${r.resume || r.notes?.length ? `<div class="panel"><h3>Le parcours</h3>${r.resume ? `<p>${esc(r.resume)}</p>` : ""}
      ${r.notes?.length ? `<ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    </div>` : ""}
    <div class="actions" style="margin-top:16px"><a class="btn primary" href="${esc(r.gpx)}" download>Télécharger le GPX</a></div>`;

  const pts = parseGpx(await (await fetch(r.gpx)).text());
  document.getElementById("profile").innerHTML = profileSvg(pts);

  const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17,
    attribution: 'Carte : © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style : © <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  });
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
  const map = L.map("map", { layers: [topo], scrollWheelZoom: false });
  L.control.layers({ "Topo": topo, "Plan": osm }).addTo(map);
  const ll = pts.map((p) => [p.lat, p.lon]);
  L.polyline(ll, { color: "#141414", weight: 8, opacity: 0.55 }).addTo(map);
  const trace = L.polyline(ll, { color: "#f4cc3d", weight: 5 }).addTo(map);
  const lbl = (x, def) => (x ? `gare de ${x.gare}` : def);
  L.circleMarker(ll[0], { radius: 8, color: "#141414", weight: 3, fillColor: "#ffffff", fillOpacity: 1 })
    .bindTooltip(`Départ${a.depart && a.arrivee ? ` : ${lbl(a.depart)}` : ""}`).addTo(map);
  L.circleMarker(ll[ll.length - 1], { radius: 8, color: "#141414", weight: 3, fillColor: "#f4cc3d", fillOpacity: 1 })
    .bindTooltip(`Arrivée${a.arrivee ? ` : ${lbl(a.arrivee)}` : ""}`).addTo(map);
  map.fitBounds(trace.getBounds(), { padding: [20, 20] });
}
