// Bibliothèque de traces GPX — rendu de la liste et des pages parcours, sans étape de build.
// Ajouter un parcours = déposer le GPX dans gpx/ et ajouter une entrée dans parcours.json.

const fmtKm = (km) => km.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function loadRoutes() {
  const res = await fetch("parcours.json", { cache: "no-cache" });
  return res.json();
}

// Origine du parcours : personnel, ou inspiré d'une course (organisation citée, obligatoire).
function originHtml(r) {
  const o = r.origine || { type: "personnel" };
  if (o.type === "course") {
    const course = o.lien ? `<a href="${esc(o.lien)}" target="_blank" rel="noopener">${esc(o.course)}</a>` : esc(o.course);
    return `<div class="credit">Itinéraire inspiré de <b>${course}</b>, tracé par <b>${esc(o.organisation)}</b>. Tout le mérite du tracé revient à l'organisation.${
      o.detail ? `<br><span class="meta">${esc(o.detail)}</span>` : ""
    }</div>`;
  }
  return `<span class="badge">Itinéraire personnel</span>`;
}

function routeLine(r) {
  return `<div class="route-line">Gare de ${esc(r.depart.gare)}<span class="arrow">→</span>Gare de ${esc(r.arrivee.gare)}</div>
    <div class="meta">${esc(r.depart.ligne)} depuis ${esc(r.depart.paris)}${
      r.arrivee.ligne !== r.depart.ligne ? ` · retour ${esc(r.arrivee.ligne)}` : ""
    } · testé le ${fmtDate(r.teste_le)}</div>`;
}

function stats(r) {
  return `<div class="stats"><span class="box">${fmtKm(r.distance_km)} km</span><span class="box">${r.dplus_m} m D+</span></div>`;
}

async function renderIndex() {
  const el = document.getElementById("list");
  const routes = (await loadRoutes()).sort((a, b) => b.teste_le.localeCompare(a.teste_le));
  document.getElementById("count").textContent =
    routes.length === 1 ? "1 parcours pour l'instant" : `${routes.length} parcours`;
  el.innerHTML = routes
    .map(
      (r) => `<article class="card">
        <h2><a href="parcours.html?id=${encodeURIComponent(r.id)}">${esc(r.titre)}</a></h2>
        ${routeLine(r)}
        ${stats(r)}
        <p style="margin:0">${esc(r.resume)}</p>
        <div>${originHtml(r)}</div>
        <div class="actions">
          <a class="btn primary" href="parcours.html?id=${encodeURIComponent(r.id)}">Voir le parcours</a>
          <a class="btn" href="${esc(r.gpx)}" download>Télécharger le GPX</a>
        </div>
      </article>`
    )
    .join("");
}

function parseGpx(text) {
  const xml = new DOMParser().parseFromString(text, "application/xml");
  const pts = [...xml.getElementsByTagName("trkpt")].map((p) => ({
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
  if (!eles.length) return "";
  const lo = Math.floor(Math.min(...eles) / 25) * 25, hi = Math.ceil(Math.max(...eles) / 25) * 25;
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
  const line = runs.map((run) => run.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele).toFixed(1)}`).join("")).join("");
  const area = runs
    .map((run) => run.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele).toFixed(1)}`).join("") +
      `L${x(run[run.length - 1].d).toFixed(1)},${H - padB}L${x(run[0].d).toFixed(1)},${H - padB}Z`)
    .join("");
  const missing = pts.some((p) => Number.isNaN(p.ele));
  let ticks = "";
  for (let km = 0; km <= maxD / 1000; km += 5) {
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
  document.getElementById("route").innerHTML = `
    <h1 style="font-size:clamp(34px,7vw,64px)">${esc(r.titre)}</h1>
    <div style="margin-top:14px">${routeLine(r)}</div>
    <div style="margin-top:14px">${stats(r)}</div>
    <div style="margin-top:16px">${originHtml(r)}</div>
    <div id="map" aria-label="Carte du parcours"></div>
    <div class="profile" id="profile"></div>
    <div class="grid2">
      <div class="panel"><h3>Aller</h3><p>Gare de <b>${esc(r.depart.gare)}</b> · ${esc(r.depart.ligne)} depuis ${esc(r.depart.paris)}</p></div>
      <div class="panel"><h3>Retour</h3><p>Gare de <b>${esc(r.arrivee.gare)}</b> · ${esc(r.arrivee.ligne)} vers ${esc(r.arrivee.paris)}</p></div>
    </div>
    <div class="panel"><h3>Le parcours</h3><p>${esc(r.resume)}</p>
      ${r.notes?.length ? `<ul class="notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="actions"><a class="btn primary" href="${esc(r.gpx)}" download>Télécharger le GPX</a></div>`;

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
  L.circleMarker(ll[0], { radius: 8, color: "#141414", weight: 3, fillColor: "#ffffff", fillOpacity: 1 })
    .bindTooltip(`Départ : gare de ${r.depart.gare}`).addTo(map);
  L.circleMarker(ll[ll.length - 1], { radius: 8, color: "#141414", weight: 3, fillColor: "#f4cc3d", fillOpacity: 1 })
    .bindTooltip(`Arrivée : gare de ${r.arrivee.gare}`).addTo(map);
  map.fitBounds(trace.getBounds(), { padding: [20, 20] });
}
