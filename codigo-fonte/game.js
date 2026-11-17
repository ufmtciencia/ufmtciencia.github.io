/* =====================================================================
   UFMT CIÊNCIA — LÓGICA DO JOGO (protótipo)
   ===================================================================== */
'use strict';

/* ---------- Configuração geral (ajuste à vontade) */
const CFG = {
  centroPadrao: [-15.6097, -56.0650], // centro aproximado do campus Cuiabá — ajuste no modo professor
  raioPadrao: 700,          // raio da área de jogo (m)
  alcance: 40,              // distância para interagir (m)
  maxSpawns: 7,             // criaturas simultâneas
  raioSpawn: 220,           // distância máx. do jogador onde nascem (m)
  vidaSpawn: 8 * 60e3,      // tempo que cada criatura fica no mapa (ms)
  recargaEstacao: 5 * 60e3, // tempo de recarga das estações (ms)
  velVirtual: 14,           // velocidade no modo virtual (m/s, acelerada)
  tempoBatalha: 20,         // segundos por pergunta na arena
};
const GEO = (typeof GEO_CAMPUS !== 'undefined') ? GEO_CAMPUS : null;

/* ---------- Utilidades */
const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SP = Object.fromEntries(CRIATURAS.map(c => [c.id, c]));
function dist(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function deslocar(p, dx, dy) { // dx leste, dy norte (m)
  return [p[0] + dy / 111320, p[1] + dx / (111320 * Math.cos(p[0] * Math.PI / 180))];
}
const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};

/* ---------- Lugares (estações e arenas) */
function centroide(coords) { let la = 0, ln = 0; coords.forEach(c => { la += c[1]; ln += c[0]; }); return [la / coords.length, ln / coords.length]; }
function anelExterno(g) {
  if (!g) return null;
  if (g.type === 'Polygon') return g.coordinates[0];
  if (g.type === 'MultiPolygon') return g.coordinates[0][0];
  if (g.type === 'LineString') return g.coordinates;
  if (g.type === 'Point') return [g.coordinates];
  return null;
}
function lugaresPadrao() {
  if (typeof LUGARES_PADRAO !== 'undefined') return JSON.parse(JSON.stringify(LUGARES_PADRAO));
  let centro = CFG.centroPadrao.slice(), raio = CFG.raioPadrao;
  const est = [], arenas = [];
  if (GEO) {
    const uni = GEO.features.find(f => f.properties && f.properties.amenity === 'university' && /Polygon/.test(f.geometry.type));
    if (uni) {
      const anel = anelExterno(uni.geometry);
      centro = centroide(anel);
      raio = Math.max(...anel.map(c => dist(centro, [c[1], c[0]]))) + 60;
    }
    const nomeados = [];
    GEO.features.forEach(f => {
      const p = f.properties || {};
      if (!p.name || p.amenity === 'university' || p.highway) return;
      const anel = anelExterno(f.geometry); if (!anel) return;
      const c = centroide(anel);
      if (dist(c, centro) > raio) return;
      if (nomeados.some(n => n.nome === p.name || dist(n.pos, c) < 70)) return;
      nomeados.push({ nome: p.name, pos: c });
    });
    const prioridade = [/f[ií]sica/i, /biblioteca/i, /teatro|zool[oó]gico|reitoria|gin[aá]sio/i];
    prioridade.forEach(rx => {
      const i = nomeados.findIndex(n => rx.test(n.nome));
      if (i >= 0 && arenas.length < 3) { const n = nomeados.splice(i, 1)[0]; arenas.push(n); }
    });
    while (arenas.length < 3 && nomeados.length) arenas.push(nomeados.splice(Math.floor(nomeados.length / 2), 1)[0]);
    nomeados.slice(0, 14).forEach(n => est.push(n));
  }
  const L = { centro, raio, estacoes: [], arenas: [] };
  if (est.length) est.forEach(n => L.estacoes.push({ id: uid(), nome: n.nome, lat: n.pos[0], lng: n.pos[1], texto: '' }));
  else for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI; const p = deslocar(centro, Math.cos(a) * raio * 0.45, Math.sin(a) * raio * 0.45); L.estacoes.push({ id: uid(), nome: 'Estação Científica ' + (i + 1), lat: p[0], lng: p[1], texto: '' }); }
  const guardioes = [['onca', 'Arena da Força'], ['loboguara', 'Arena do Cosmos'], ['ariranha', 'Arena das Águas']];
  if (arenas.length) arenas.forEach((n, i) => L.arenas.push({ id: uid(), nome: n.nome, lat: n.pos[0], lng: n.pos[1], guardiao: guardioes[i % 3][0], nivel: 10 + i * 3 }));
  else guardioes.forEach(([g, nome], i) => { const a = (i / 3) * 2 * Math.PI + 0.5; const p = deslocar(centro, Math.cos(a) * raio * 0.2, Math.sin(a) * raio * 0.2); L.arenas.push({ id: uid(), nome, lat: p[0], lng: p[1], guardiao: g, nivel: 10 + i * 3 }); });
  return L;
}
let LUG = store.get('ufmtc_lugares', null) || lugaresPadrao();
const salvarLugares = () => store.set('ufmtc_lugares', LUG);
// Mapa oficial (o publicado no jogo). Batalhas, recompensas e conquistas sempre usam estes dados.
const LUG_OFICIAL = lugaresPadrao();
const oficial = (lista, x) => (LUG_OFICIAL[lista] || []).find(o => o.id === x.id) || null;
// Contas de professor (administradores do jogo), pelo UID do Firebase Authentication.
const ADMINS = [
  'gWnQ3apyOiNOatHYgG36wNIMwFz2', // João Basso Marques
];
const ehAdmin = () => typeof Nuvem !== 'undefined' && !!Nuvem.user && ADMINS.includes(Nuvem.user.uid);

/* Área do jogo: o contorno real da UFMT (se houver mapa) ou um círculo. */
const AREA_POLI = (() => {
  if (!GEO) return null;
  const u = GEO.features.find(f => f.properties && f.properties.amenity === 'university' && /Mato Grosso/.test(f.properties.name || '') && /Polygon/.test(f.geometry.type));
  return u ? anelExterno(u.geometry).map(c => [c[1], c[0]]) : null;
})();
function dentroArea(p) {
  if (!AREA_POLI) return dist(p, LUG.centro) <= LUG.raio;
  let dentro = false;
  for (let i = 0, j = AREA_POLI.length - 1; i < AREA_POLI.length; j = i++) {
    const [yi, xi] = AREA_POLI[i], [yj, xj] = AREA_POLI[j];
    if (((yi > p[0]) !== (yj > p[0])) && (p[1] < (xj - xi) * (p[0] - yi) / (yj - yi) + xi)) dentro = !dentro;
  }
  return dentro;
}
/* Pontos de água (lagos, brejos) para os animais aquáticos. */
const AGUA = GEO ? GEO.features.filter(f => f.properties && (f.properties.natural === 'water' || f.properties.natural === 'wetland') && /Polygon/.test(f.geometry.type))
  .flatMap(f => anelExterno(f.geometry).map(c => [c[1], c[0]])) : [];
const AQUATICOS = ['jacare', 'ariranha', 'sucuri', 'piranha', 'capivara', 'tuiuiu'];

/* ---------- Estado do jogador */
const AVATARES = ['🧑‍🔬', '👩‍🔬', '👨‍🔬', '🧑‍🎓', '🦊', '🐸', '🦉', '🐝', '🌵', '🌻', '🔭', '⚡'];
const ESTADO_NOVO = () => ({ nome: '', avatar: AVATARES[0], nivel: 1, xp: 0, xpTotal: 0, uid: null, itens: { lupa: 3, fruta: 3 }, parceiros: [], registros: {}, vistos: {}, estacoes: {}, arenas: {}, modo: 'virtual', pos: null, recentes: [] });
let S = Object.assign(ESTADO_NOVO(), store.get('ufmtc_estado', {}));
const avatarDe = x => AVATARES.includes(x) ? x : AVATARES[0];
const gradeAvatares = sel => `<div class="grade-av">${AVATARES.map(a => `<button class="av ${a === sel ? 'sel' : ''}" data-av="${a}">${a}</button>`).join('')}</div>`;
function ligarGradeAvatares(raiz, aoEscolher) {
  raiz.querySelectorAll('.av').forEach(b => b.onclick = () => {
    raiz.querySelectorAll('.av').forEach(x => x.classList.toggle('sel', x === b));
    aoEscolher(b.dataset.av);
  });
}
const salvar = () => { store.set('ufmtc_estado', S); if (typeof Nuvem !== 'undefined') Nuvem.marcar(); };
const xpPara = n => 500 * n;

function ganharXP(q, motivo) {
  S.xp += q; S.xpTotal = (S.xpTotal || 0) + q;
  let subiu = false;
  while (S.xp >= xpPara(S.nivel)) { S.xp -= xpPara(S.nivel); S.nivel++; subiu = true; S.itens.lupa += 2; S.itens.fruta += 2; }
  salvar(); hud();
  if (subiu) toast(`🎉 Você subiu para o nível ${S.nivel}! +2 lupas e +2 frutas`);
  else if (motivo) toast(`+${q} XP · ${motivo}`);
}
function novaInstancia(spId, nivel) {
  const sp = SP[spId];
  const f = 1 + nivel * 0.05;
  return { uid: uid(), sp: spId, nivel, atk: Math.round(sp.atk * f), hp: Math.round(sp.hp * f) };
}

/* ---------- Interface: HUD, toast */
function hud() {
  $('#nivel').textContent = S.nivel;
  $('#nome-jog').textContent = `${avatarDe(S.avatar)} ${S.nome || 'Explorador(a)'}`;
  $('#xp-barra').style.width = Math.min(100, S.xp / xpPara(S.nivel) * 100) + '%';
  $('#xp-txt').textContent = `${S.xp} / ${xpPara(S.nivel)} XP · 🔍${S.itens.lupa} 🍈${S.itens.fruta}`;
  const m = $('#modo'); m.className = 'cartao ' + S.modo; m.textContent = S.modo === 'gps' ? '📍 GPS' : '🕹️ Virtual';
}
let toastT;
function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg; document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms);
}
function aviso(msg) { const a = $('#aviso'); if (!msg) { a.style.display = 'none'; return; } a.innerHTML = msg; a.style.display = 'block'; }
function abrir(id, html, centro) {
  const t = $('#' + id); t.innerHTML = `<div class="painel ${centro ? 'centro' : ''}">${html}</div>`; t.classList.add('aberta');
  t.onclick = e => { if (e.target === t && t.dataset.trava !== '1') fechar(id); };
  return t.firstChild;
}
function fechar(id) { const t = $('#' + id); t.classList.remove('aberta'); t.innerHTML = ''; t.dataset.trava = ''; }
const etqTipo = t => `<span class="etq" style="background:${TIPOS[t].cor}">${TIPOS[t].icone} ${TIPOS[t].nome}</span>`;
const etqRar = r => `<span class="etq" style="background:${RARIDADES[r].cor}">${RARIDADES[r].nome}</span>`;

/* ---------- Mapa */
let map, jogMk, alcanceCirc, areaCirc, seguir = true;
const camadaLugares = L.layerGroup(), camadaSpawns = L.layerGroup();
function iniciarMapa() {
  map = L.map('mapa', { zoomControl: false, minZoom: 3, maxZoom: 20, preferCanvas: true, worldCopyJump: true }).setView(LUG.centro, 17);
  // Mapa-múndi próprio (Natural Earth), sem textos e sem depender de servidores de mapa.
  map.attributionControl.addAttribution('Mapa: <a href="https://www.naturalearthdata.com">Natural Earth</a> · campus © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
  if (typeof MUNDO !== 'undefined') {
    L.geoJSON(MUNDO.terra, { style: { color: '#cdbf9f', weight: 1, fillColor: '#efe7d4', fillOpacity: 1 }, interactive: false }).addTo(map);
    L.geoJSON(MUNDO.brasil, { style: { stroke: false, fillColor: '#e3ecd0', fillOpacity: 1 }, interactive: false }).addTo(map);
    L.geoJSON(MUNDO.fronteiras, { style: { color: '#b9a984', weight: 1, opacity: 0.8 }, interactive: false }).addTo(map);
  }
  // Fora da UFMT o mapa fica esmaecido; o campus fica em destaque.
  if (AREA_POLI) {
    L.polygon(AREA_POLI, { stroke: false, fillColor: '#f7f3e8', fillOpacity: 1, interactive: false }).addTo(map);
  }
  if (GEO) desenharGeo();
  // Alfinete para achar a UFMT quando o mapa está afastado
  const pino = L.marker(LUG.centro, { icon: L.divIcon({ className: '', html: '<div class="pino-ufmt">📍 UFMT</div>', iconSize: [90, 30], iconAnchor: [45, 30] }), interactive: true });
  pino.on('click', () => { seguir = true; map.setView(S.pos, 17); });
  const pinoVis = () => {
    const longe = map.getZoom() < 15;
    if (longe) { pino.addTo(map); camadaLugares.remove(); camadaSpawns.remove(); jogMk.remove(); alcanceCirc.remove(); }
    else { pino.remove(); camadaLugares.addTo(map); if (!EDITOR) camadaSpawns.addTo(map); jogMk.addTo(map); alcanceCirc.addTo(map); }
  };
  map.on('zoomend', pinoVis);
  areaCirc = L.circle(LUG.centro, { radius: LUG.raio, color: '#1f6f4a', weight: 2, dashArray: '8 8', fill: false, interactive: false });
  if (!AREA_POLI) areaCirc.addTo(map);
  camadaLugares.addTo(map); camadaSpawns.addTo(map);
  if (!S.pos || !dentroArea(S.pos)) S.pos = (LUG.inicio || LUG.centro).slice();
  alcanceCirc = L.circle(S.pos, { radius: CFG.alcance, color: '#1e88e5', weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
  jogMk = L.marker(S.pos, { icon: L.divIcon({ className: '', html: '<div class="mk-jog"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }), zIndexOffset: 1000, interactive: false }).addTo(map);
  map.on('dragstart', () => { seguir = false; });
  const rotulos = () => $('#mapa').classList.toggle('zoom-baixo', map.getZoom() < 17);
  map.on('zoomend', rotulos); rotulos();
  map.on('click', e => {
    if (EDITOR) return editorClique(e.latlng);
    if (S.modo === 'virtual') andarAte([e.latlng.lat, e.latlng.lng]);
  });
  desenharLugares();
}
function desenharGeo() {
  const estilo = p => {
    if (p.amenity === 'university') return { color: '#1f6f4a', weight: 3, fill: false, dashArray: '10 6' };
    if (p.building) return { color: '#c9b48f', weight: 1, fillColor: '#ead9b9', fillOpacity: 0.95 };
    if (p.natural === 'water' || p.water || p.leisure === 'swimming_pool') return { color: '#5fa8d3', weight: 1, fillColor: '#9fd3ef', fillOpacity: 0.95 };
    if (p.highway) {
      const pe = /footway|path|pedestrian|steps|cycleway/.test(p.highway);
      return { color: pe ? '#ffffff' : '#fdf3d8', weight: pe ? 3 : 7, opacity: 0.95, dashArray: pe ? '1 5' : null, lineCap: 'round' };
    }
    if (p.natural === 'wood' || p.landuse === 'forest') return { stroke: false, fillColor: '#8cc58a', fillOpacity: 0.7 };
    if (p.landuse || p.leisure || p.natural) return { stroke: false, fillColor: '#c3e2b4', fillOpacity: 0.6 };
    return { color: '#bbb', weight: 1, fillOpacity: 0.1 };
  };
  const ordem = f => { const p = f.properties || {}; return p.amenity === 'university' ? 9 : p.building ? 4 : p.highway ? 3 : (p.natural === 'water') ? 2 : 1; };
  const feats = GEO.features.filter(f => f.geometry && f.geometry.type !== 'Point').sort((a, b) => ordem(a) - ordem(b));
  L.geoJSON({ type: 'FeatureCollection', features: feats }, { style: f => estilo(f.properties || {}), interactive: false }).addTo(map);
}
function moverJogador(p, suave) {
  S.pos = p; jogMk.setLatLng(p); alcanceCirc.setLatLng(p);
  if (seguir) map.panTo(p, { animate: !!suave, duration: 0.3 });
  atualizarProximidade();
}
// Perfis novos (conta nova, dependente, aparelho do menor) começam sem posição: põe o jogador no ponto inicial do campus.
function garantirPosicao(centralizar) {
  if (S.pos && S.pos.length === 2 && isFinite(S.pos[0]) && isFinite(S.pos[1])) return;
  S.pos = (LUG.inicio || LUG.centro).slice();
  if (jogMk) { seguir = true; moverJogador(S.pos, false); if (centralizar && map) map.setView(S.pos, Math.max(map.getZoom(), 17)); }
}
let andarAnim = null;
function andarAte(dest) {
  if (!dentroArea(dest)) { toast('Esse ponto fica fora do campus.'); return; }
  garantirPosicao(false);
  cancelAnimationFrame(andarAnim);
  seguir = true;
  const ini = S.pos.slice(), d = dist(ini, dest), dur = Math.max(250, d / CFG.velVirtual * 1000), t0 = performance.now();
  const passo = t => {
    const k = Math.min(1, (t - t0) / dur);
    moverJogador([ini[0] + (dest[0] - ini[0]) * k, ini[1] + (dest[1] - ini[1]) * k], false);
    if (k < 1) andarAnim = requestAnimationFrame(passo); else salvar();
  };
  andarAnim = requestAnimationFrame(passo);
}

/* ---------- GPS */
let gpsWatch = null;
function ligarGPS() {
  if (!navigator.geolocation) { toast('Este navegador não oferece GPS. Usando o modo virtual.'); return mudarModo('virtual'); }
  aviso('📡 Procurando sinal de GPS…');
  gpsWatch = navigator.geolocation.watchPosition(p => {
    const pos = [p.coords.latitude, p.coords.longitude];
    const d = dist(pos, LUG.centro);
    if (!dentroArea(pos) && d > 300) aviso(`Você está a ${(d / 1000).toFixed(1)} km da área do jogo. Vá até o campus ou use o modo 🕹️ Virtual.`);
    else aviso('');
    moverJogador(pos, true); salvar();
  }, err => {
    aviso('');
    toast(err.code === 1 ? 'Acesso à localização negado. Usando o modo virtual.' : 'Não foi possível obter o GPS. Usando o modo virtual.', 3500);
    mudarModo('virtual');
  }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 });
}
function mudarModo(m) {
  if (gpsWatch !== null) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
  S.modo = m; salvar(); hud(); aviso('');
  if (m === 'gps') ligarGPS();
  else toast('🕹️ Modo virtual: toque no mapa para caminhar.');
}

/* ---------- Estações e arenas no mapa */
const mkLugar = {};
function desenharLugares() {
  camadaLugares.clearLayers();
  areaCirc.setLatLng(LUG.centro).setRadius(LUG.raio);
  LUG.estacoes.forEach(e => {
    const usada = S.estacoes[e.id] && Date.now() - S.estacoes[e.id] < CFG.recargaEstacao;
    const html = `<div class="mk-est ${usada ? 'usada' : ''}"><span>🔬</span></div><div class="rotulo">${esc(e.nome)}</div>`;
    const m = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: '', html, iconSize: [34, 34], iconAnchor: [17, 17] }) });
    m.on('click', ev => { L.DomEvent.stop(ev); EDITOR ? editorForm('estacao', e) : abrirEstacao(e); });
    m.addTo(camadaLugares); mkLugar[e.id] = m;
  });
  LUG.arenas.forEach(a => {
    const dono = (typeof Nuvem !== 'undefined' && Nuvem.arenas[a.id]) || null;
    const selo = dono ? `<div class="mk-dono" title="${esc(dono.apelido)}">${esc(avatarDe(dono.avatar))}</div>` : '';
    const html = `<div class="mk-arena ${S.arenas[a.id] ? 'conquistada' : ''}">${S.arenas[a.id] ? '🏆' : '🏟️'}${selo}</div><div class="rotulo">${esc(a.nome)}</div>`;
    const m = L.marker([a.lat, a.lng], { icon: L.divIcon({ className: '', html, iconSize: [44, 44], iconAnchor: [22, 22] }), zIndexOffset: 200 });
    m.on('click', ev => { L.DomEvent.stop(ev); EDITOR ? editorForm('arena', a) : abrirArena(a); });
    m.addTo(camadaLugares);
  });
}
function longe(lat, lng) {
  const d = dist(S.pos, [lat, lng]);
  if (d <= CFG.alcance) return false;
  toast(`Chegue mais perto: faltam ${Math.round(d - CFG.alcance)} m.` + (S.modo === 'virtual' ? ' Toque no mapa ao lado para caminhar.' : ''));
  return true;
}
function atualizarProximidade() { /* espaço para efeitos de proximidade (vibração, brilho etc.) */ }

/* ---------- Criaturas no mapa (spawns) */
let spawns = [];
function sortearEspecie() {
  const total = Object.values(RARIDADES).reduce((s, r) => s + r.peso, 0);
  let x = Math.random() * total, rar = 'comum';
  for (const [k, r] of Object.entries(RARIDADES)) { if ((x -= r.peso) <= 0) { rar = k; break; } }
  return pick(CRIATURAS.filter(c => c.raridade === rar));
}
function criarSpawn() {
  if (!S.pos) return;
  for (let tent = 0; tent < 20; tent++) {
    const sp = sortearEspecie();
    let p;
    if (AQUATICOS.includes(sp.id)) {
      const perto = AGUA.filter(w => dist(w, S.pos) < CFG.raioSpawn + 80);
      if (perto.length && Math.random() < 0.8) { const w = pick(perto); p = deslocar(w, rnd(-20, 20), rnd(-20, 20)); }
      else if (sp.id === 'piranha') continue; // piranha só aparece perto da água
    }
    if (!p) { const a = Math.random() * 2 * Math.PI, r = rnd(30, CFG.raioSpawn); p = deslocar(S.pos, Math.cos(a) * r, Math.sin(a) * r); }
    if (!dentroArea(p)) continue;
    const nivel = rint(1, Math.min(30, 4 + S.nivel * 2));
    const s = { id: uid(), sp: sp.id, nivel, pos: p, ate: Date.now() + CFG.vidaSpawn * rnd(0.6, 1.2) };
    const r2 = RARIDADES[sp.raridade];
    s.mk = L.marker(p, { icon: L.divIcon({ className: '', html: `<div class="mk">${sp.emoji}<div class="anel" style="border-color:${r2.cor}"></div></div>`, iconSize: [40, 40], iconAnchor: [20, 20] }), zIndexOffset: 500 });
    s.mk.on('click', ev => { L.DomEvent.stop(ev); if (EDITOR) return; if (!longe(p[0], p[1])) abrirEncontro(s); });
    s.mk.addTo(camadaSpawns);
    spawns.push(s); return;
  }
}
function removerSpawn(s) { camadaSpawns.removeLayer(s.mk); spawns = spawns.filter(x => x !== s); }
function cicloSpawns() {
  if (!S.pos) return;   // ainda sem posição (antes de escolher GPS ou modo virtual)
  const agora = Date.now();
  spawns.filter(s => s.ate < agora || dist(s.pos, S.pos) > CFG.raioSpawn * 2.2).forEach(removerSpawn);
  if (spawns.length < CFG.maxSpawns) criarSpawn();
  LUG.estacoes.forEach(e => { const m = mkLugar[e.id]; if (!m || !m.getElement()) return; const usada = S.estacoes[e.id] && agora - S.estacoes[e.id] < CFG.recargaEstacao; m.getElement().querySelector('.mk-est')?.classList.toggle('usada', !!usada); });
}

/* ---------- Perguntas */
function sortearPergunta(tipo, difs) {
  let pool = PERGUNTAS.map((q, i) => ({ ...q, i })).filter(q => q.t === tipo && difs.includes(q.d) && !S.recentes.includes(q.i));
  if (!pool.length) pool = PERGUNTAS.map((q, i) => ({ ...q, i })).filter(q => q.t === tipo);
  const q = pick(pool);
  S.recentes = [q.i, ...S.recentes].slice(0, 25);
  return { ...q, ops: shuffle(q.o.map((txt, k) => ({ txt, certa: k === 0 }))) };
}
function htmlPergunta(q) {
  return `<div class="pergunta">${esc(q.p)}</div>` + q.ops.map((o, k) => `<button class="alt" data-k="${k}">${esc(o.txt)}</button>`).join('') + `<div id="explica"></div>`;
}
function usarLupa(painel, q) {
  if (S.itens.lupa <= 0) return toast('Sem lupas! Visite uma Estação Científica.');
  const erradas = [...painel.querySelectorAll('.alt')].filter(b => !q.ops[b.dataset.k].certa && !b.classList.contains('oculta'));
  if (erradas.length < 2) return;
  shuffle(erradas).slice(0, 2).forEach(b => b.classList.add('oculta'));
  S.itens.lupa--; salvar(); hud();
  const bl = painel.querySelector('#bt-lupa'); if (bl) { bl.disabled = true; bl.textContent = `🔍 Lupa usada (${S.itens.lupa})`; }
}
function responder(painel, q, cb) {
  painel.querySelectorAll('.alt').forEach(b => b.onclick = () => {
    painel.querySelectorAll('.alt').forEach(x => { x.disabled = true; if (q.ops[x.dataset.k].certa) x.classList.add('certa'); });
    const ok = q.ops[b.dataset.k].certa;
    if (!ok) b.classList.add('errada');
    painel.querySelector('#explica').innerHTML = `<div class="explica"><b>${ok ? '✅ Correto!' : '❌ Não foi dessa vez.'}</b> ${esc(q.e)}</div>`;
    cb(ok);
  });
}

/* ---------- Encontro (registro com a câmera de campo) */
function abrirEncontro(s) {
  const sp = SP[s.sp], rar = RARIDADES[sp.raridade];
  S.vistos[sp.id] = true; salvar();
  const q = sortearPergunta(sp.tipo, rar.dif);
  const p = abrir('t-encontro', `
    <button class="fechar" id="bt-sair">✕</button>
    <h2>${esc(sp.nome)} <span class="mini">nv. ${s.nivel}</span></h2>
    ${etqTipo(sp.tipo)}${etqRar(sp.raridade)}
    <div class="palco"><div class="bicho">${sp.emoji}</div><div class="flash"></div></div>
    <div class="mini">📷 Acerte a pergunta de <b>${TIPOS[sp.tipo].nome}</b> para registrar este animal na sua câmera de campo.</div>
    ${htmlPergunta(q)}
    <div class="linha" id="acoes"><button class="bt sec" id="bt-lupa" ${S.itens.lupa ? '' : 'disabled'}>🔍 Lupa (${S.itens.lupa})</button><button class="bt sec" id="bt-fugir">🏃 Sair</button></div>`);
  $('#t-encontro').dataset.trava = '1';
  p.querySelector('#bt-sair').onclick = p.querySelector('#bt-fugir').onclick = () => fechar('t-encontro');
  p.querySelector('#bt-lupa').onclick = () => usarLupa(p, q);
  responder(p, q, ok => {
    const palco = p.querySelector('.palco'), acoes = p.querySelector('#acoes');
    if (ok) {
      palco.querySelector('.flash').classList.add('on');
      setTimeout(() => palco.classList.add('pego'), 350);
      const novo = !S.registros[sp.id];
      S.registros[sp.id] = (S.registros[sp.id] || 0) + 1;
      S.parceiros.push(novaInstancia(sp.id, s.nivel));
      removerSpawn(s);
      ganharXP(rar.xp + (novo ? 100 : 0), novo ? 'Nova espécie no Bioguia!' : 'Registro feito');
      acoes.innerHTML = `<button class="bt" id="bt-ok">📖 ${novo ? 'Nova espécie! Ver no Bioguia' : 'Continuar'}</button>`;
      acoes.querySelector('#bt-ok').onclick = () => { fechar('t-encontro'); if (novo) abrirFicha(sp.id); };
    } else if (Math.random() < rar.fuga) {
      palco.classList.add('foge');
      removerSpawn(s);
      acoes.innerHTML = `<div class="mini" style="flex:2">O animal se assustou e foi embora.</div><button class="bt sec" id="bt-ok">Voltar</button>`;
      acoes.querySelector('#bt-ok').onclick = () => fechar('t-encontro');
    } else {
      acoes.innerHTML = `<button class="bt" id="bt-nova">Ele continua aqui! Nova pergunta</button>`;
      acoes.querySelector('#bt-nova').onclick = () => abrirEncontro(s);
    }
  });
}

/* ---------- Estação científica */
function abrirEstacao(e) {
  const eo = oficial('estacoes', e);
  e = eo ? { ...e, ...eo } : { ...e, teste: true };
  if (longe(e.lat, e.lng)) return;
  const ult = S.estacoes[e.id] || 0, falta = CFG.recargaEstacao - (Date.now() - ult);
  const cur = e.texto || pick(CURIOSIDADES);
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>🔬 ${esc(e.nome)}</h2><div class="mini">Estação Científica</div>
    <div class="explica" style="margin-top:12px">💡 ${esc(cur)}</div>
    ${falta > 0 ? `<button class="bt" disabled>Recarregando… volte em ${Math.ceil(falta / 60000)} min</button>`
      : `<button class="bt" id="bt-girar">Coletar recursos</button>`}`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  const g = p.querySelector('#bt-girar');
  if (g) g.onclick = () => {
    if (e.teste) { g.outerHTML = `<div class="explica">🧪 Estação de teste (modo professor): não dá recompensas nem XP. Para valer no jogo, exporte o mapa e publique.</div>`; return; }
    const lupa = rint(1, 2), fruta = rint(0, 2);
    S.itens.lupa += lupa; S.itens.fruta += fruta; S.estacoes[e.id] = Date.now(); salvar();
    g.outerHTML = `<div class="explica" style="border-color:#d4a017">Você recebeu <b>${lupa} 🔍 lupa${lupa > 1 ? 's' : ''}</b>${fruta ? ` e <b>${fruta} 🍈 fruta${fruta > 1 ? 's' : ''}</b>` : ''}.</div>`;
    ganharXP(50, 'Estação visitada'); cicloSpawns();
  };
}

/* ---------- Arena e batalha */
function multiplicador(a, b) { return TIPOS[a].vence === b ? 1.5 : TIPOS[b].vence === a ? 0.75 : 1; }
function abrirArena(a) {
  const ao = oficial('arenas', a);
  a = ao ? { ...a, ...ao } : { ...a, teste: true };
  if (longe(a.lat, a.lng)) return;
  const g = SP[a.guardiao];
  const lista = S.parceiros.slice().sort((x, y) => y.nivel - x.nivel);
  let escolhido = lista[0];
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>🏟️ ${esc(a.nome)}</h2>
    <div class="mini">${S.arenas[a.id] ? '🏆 Você já conquistou esta arena. Pode desafiar de novo para treinar.' : 'Vença o guardião para conquistar a arena.'}</div>
    <div class="item-lista" style="margin-top:10px"><div class="bicho">${g.emoji}</div><div class="f"><b>Guardião: ${esc(g.nome)}</b> · nv. ${a.nivel}<br>${etqTipo(g.tipo)}</div></div>
    <div id="ultimo-conq">${htmlConquistador(a)}</div>
    <h3>Escolha seu parceiro</h3>
    ${lista.length ? `<div class="grade" id="grade-p">${lista.map(i => {
      const sp = SP[i.sp], m = multiplicador(sp.tipo, g.tipo);
      return `<button class="ficha" data-u="${i.uid}"><div class="bicho">${sp.emoji}</div><div class="nm">${esc(sp.nome)}<br>nv. ${i.nivel}${m > 1 ? ' · ⬆️' : m < 1 ? ' · ⬇️' : ''}</div></button>`;
    }).join('')}</div><div class="mini" style="margin-top:6px">⬆️ vantagem de área · ⬇️ desvantagem. ${TIPOS[g.tipo].nome} perde para ${Object.values(TIPOS).find(t => t.vence === g.tipo).nome}.</div>
    <button class="bt ouro" id="bt-lutar">Desafiar!</button>`
      : `<div class="explica">Você ainda não tem parceiros. Registre animais no mapa primeiro!</div>`}`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  const marcar = () => p.querySelectorAll('.ficha').forEach(f => f.classList.toggle('sel', f.dataset.u === escolhido?.uid));
  p.querySelectorAll('.ficha').forEach(f => f.onclick = () => { escolhido = lista.find(i => i.uid === f.dataset.u); marcar(); });
  marcar();
  const bl = p.querySelector('#bt-lutar');
  if (bl) bl.onclick = () => { fechar('t-geral'); batalha(a, escolhido); };
  // Atualiza o último conquistador com o dado mais recente da nuvem
  if (!a.teste && typeof Nuvem !== 'undefined' && Nuvem.user) Nuvem.lerArena(a.id).then(() => {
    const el = p.querySelector('#ultimo-conq'); if (el && el.isConnected) el.innerHTML = htmlConquistador(a);
  });
}
function haQuanto(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'agora há pouco';
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24); return d === 1 ? 'ontem' : `há ${d} dias`;
}
function htmlConquistador(a) {
  if (a.teste) return `<div class="conq vazio">🧪 Arena de teste (modo professor): vitórias aqui não dão XP nem registram conquistador.</div>`;
  if (typeof Nuvem === 'undefined' || !Nuvem.ok) return '';
  if (!Nuvem.user) return `<div class="conq vazio">👑 Entre com uma conta para ver e registrar quem conquistou esta arena.</div>`;
  const d = Nuvem.arenas[a.id];
  if (!d) return `<div class="conq vazio">👑 Ninguém conquistou esta arena ainda. Seja o primeiro!</div>`;
  const sp = SP[d.parceiro];
  const voce = d.uid === Nuvem.perfil;
  return `<div class="conq"><div class="av-conq">${esc(avatarDe(d.avatar))}</div><div class="f"><span class="mini">👑 Última conquista</span><br><b>${esc(d.apelido)}</b>${voce ? ' (você)' : ''}${sp ? ` · com ${sp.emoji} ${esc(sp.nome)} nv. ${d.nivel | 0}` : ''}<br><span class="mini">${d.quando ? haQuanto(d.quando) : ''}</span></div></div>`;
}
function batalha(a, inst) {
  const g = novaInstancia(a.guardiao, a.nivel);
  const B = { a, p: { ...inst, vida: inst.hp }, g: { ...g, vida: g.hp }, turno: 0, timer: null };
  const spP = SP[B.p.sp], spG = SP[B.g.sp];
  const p = abrir('t-batalha', `
    <h2>⚔️ ${esc(a.nome)}</h2>
    <div class="arena-campo">
      <div class="lutador" id="lp"><div class="bicho">${spP.emoji}</div><div class="nm">${esc(spP.nome)} nv.${B.p.nivel}</div><div class="vida"><i id="vp" style="width:100%"></i></div><div class="mini" id="np"></div></div>
      <div class="vs">VS</div>
      <div class="lutador" id="lg"><div class="bicho">${spG.emoji}</div><div class="nm">${esc(spG.nome)} nv.${B.g.nivel}</div><div class="vida"><i id="vg" style="width:100%"></i></div><div class="mini" id="ng"></div></div>
    </div>
    <div class="log" id="log">Acerte para atacar. Errou ou o tempo acabou? O guardião ataca.</div>
    <div id="area-q"></div>`);
  $('#t-batalha').dataset.trava = '1';
  const barras = () => {
    p.querySelector('#vp').style.width = Math.max(0, B.p.vida / B.p.hp * 100) + '%';
    p.querySelector('#vg').style.width = Math.max(0, B.g.vida / B.g.hp * 100) + '%';
    p.querySelector('#np').textContent = `${Math.max(0, Math.round(B.p.vida))}/${B.p.hp}`;
    p.querySelector('#ng').textContent = `${Math.max(0, Math.round(B.g.vida))}/${B.g.hp}`;
  };
  barras();
  const tremer = id => { const el = p.querySelector(id); el.classList.remove('dano'); void el.offsetWidth; el.classList.add('dano'); };
  const fim = venceu => {
    const area = p.querySelector('#area-q');
    if (venceu && a.teste) {
      area.innerHTML = `<div class="explica" style="border-color:#d4a017"><b>🧪 Vitória na arena de teste.</b> Arenas criadas no modo professor não dão XP, recompensas nem registro de conquistador.</div><button class="bt" id="bt-fim">Voltar ao mapa</button>`;
    } else if (venceu) {
      const primeira = !S.arenas[a.id];
      S.arenas[a.id] = true; S.itens.lupa += 3; S.itens.fruta += 2; salvar(); desenharLugares();
      ganharXP(primeira ? 400 : 100, primeira ? 'Arena conquistada!' : 'Treino na arena');
      const naNuvem = typeof Nuvem !== 'undefined' && Nuvem.user;
      area.innerHTML = `<div class="explica" style="border-color:#d4a017"><b>🏆 Vitória!</b> ${primeira ? 'Você conquistou esta arena.' : 'Ótimo treino.'} Recompensa: 3 🔍 e 2 🍈.
        <div class="mini" id="msg-conq" style="margin-top:6px">${naNuvem ? '👑 Registrando você como último conquistador…' : '👑 Entre com uma conta para aparecer como conquistador desta arena.'}</div></div><button class="bt" id="bt-fim">Voltar ao mapa</button>`;
      if (naNuvem) Nuvem.registrarConquista(a.id, B.p).then(ok => {
        const m = area.querySelector('#msg-conq');
        if (m) m.textContent = ok ? `👑 ${avatarDe(S.avatar)} ${S.nome} agora aparece como último conquistador!` : '👑 Não foi possível registrar a conquista agora (verifique a conexão).';
        desenharLugares();
      });
    } else {
      area.innerHTML = `<div class="explica" style="border-color:#c0392b"><b>Seu parceiro precisa descansar.</b> Estude um pouco e tente de novo, ou escolha outro parceiro com vantagem de área.</div><button class="bt" id="bt-fim">Voltar ao mapa</button>`;
    }
    area.querySelector('#bt-fim').onclick = () => fechar('t-batalha');
  };
  const rodada = () => {
    const tipo = B.turno % 2 === 0 ? spP.tipo : spG.tipo;
    const difs = a.nivel >= 16 ? [2, 3] : a.nivel >= 12 ? [1, 2, 3] : [1, 2];
    const q = sortearPergunta(tipo, difs);
    const area = p.querySelector('#area-q');
    area.innerHTML = `<div class="mini">Pergunta de ${TIPOS[tipo].icone} <b>${TIPOS[tipo].nome}</b></div><div class="timer"><i id="tm"></i></div>${htmlPergunta(q)}
      <div class="linha" id="acoes"><button class="bt sec" id="bt-lupa" ${S.itens.lupa ? '' : 'disabled'}>🔍 Lupa (${S.itens.lupa})</button><button class="bt sec" id="bt-fruta" ${S.itens.fruta ? '' : 'disabled'}>🍈 Fruta (${S.itens.fruta})</button></div>`;
    area.querySelector('#bt-lupa').onclick = () => usarLupa(area, q);
    area.querySelector('#bt-fruta').onclick = ev => {
      if (S.itens.fruta <= 0) return;
      S.itens.fruta--; salvar(); hud();
      B.p.vida = Math.min(B.p.hp, B.p.vida + B.p.hp * 0.4); barras();
      ev.target.disabled = true; ev.target.textContent = `🍈 +40% vida (${S.itens.fruta})`;
    };
    const t0 = Date.now(), tm = area.querySelector('#tm');
    let respondeu = false;
    const resolver = (ok, rapido) => {
      respondeu = true; clearInterval(B.timer);
      const log = p.querySelector('#log');
      if (ok) {
        const m = multiplicador(spP.tipo, spG.tipo), dano = Math.round(B.p.atk * 1.5 * m * (rapido ? 1.25 : 1) * rnd(0.9, 1.1));
        B.g.vida -= dano; tremer('#lg');
        log.textContent = `${spP.nome} causou ${dano} de dano${rapido ? ' (resposta rápida!)' : ''}${m > 1 ? ' · super efetivo!' : m < 1 ? ' · pouco efetivo' : ''}`;
      } else {
        const m = multiplicador(spG.tipo, spP.tipo), dano = Math.round(B.g.atk * 0.5 * m * rnd(0.9, 1.1));
        B.p.vida -= dano; tremer('#lp');
        log.textContent = `${spG.nome} contra-atacou: ${dano} de dano.`;
      }
      barras(); B.turno++;
      const acoes = area.querySelector('#acoes');
      if (B.g.vida <= 0) return setTimeout(() => fim(true), 600);
      if (B.p.vida <= 0) return setTimeout(() => fim(false), 600);
      acoes.innerHTML = `<button class="bt" id="bt-prox">Próxima pergunta ▶</button>`;
      acoes.querySelector('#bt-prox').onclick = rodada;
    };
    responder(area, q, ok => resolver(ok, (Date.now() - t0) / 1000 < 8));
    B.timer = setInterval(() => {
      const f = 1 - (Date.now() - t0) / 1000 / CFG.tempoBatalha;
      tm.style.width = Math.max(0, f * 100) + '%';
      if (f <= 0 && !respondeu) {
        area.querySelectorAll('.alt').forEach(x => { x.disabled = true; if (q.ops[x.dataset.k].certa) x.classList.add('certa'); });
        area.querySelector('#explica').innerHTML = `<div class="explica"><b>⏰ Tempo esgotado!</b> ${esc(q.e)}</div>`;
        resolver(false, false);
      }
    }, 100);
  };
  rodada();
}

/* ---------- Bioguia, parceiros, menu */
function abrirBioguia() {
  const n = Object.keys(S.registros).length;
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>📖 Bioguia</h2><div class="mini">${n} de ${CRIATURAS.length} espécies registradas</div>
    <div class="barra"><i style="width:${n / CRIATURAS.length * 100}%"></i></div>
    <div class="grade">${CRIATURAS.map((c, i) => {
      const reg = S.registros[c.id];
      return `<button class="ficha ${reg ? '' : 'desconhecido'}" data-id="${c.id}"><div class="bicho">${c.emoji}</div><div class="nm">#${String(i + 1).padStart(2, '0')} ${reg ? esc(c.nome) : (S.vistos[c.id] ? esc(c.nome) : '???')}</div></button>`;
    }).join('')}</div>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  p.querySelectorAll('.ficha').forEach(f => f.onclick = () => abrirFicha(f.dataset.id));
}
function abrirFicha(id) {
  const c = SP[id], reg = S.registros[id];
  const p = abrir('t-geral', reg ? `
    <button class="fechar" id="bt-x">✕</button>
    <div class="palco" style="height:140px"><div class="bicho">${c.emoji}</div></div>
    <h2>${esc(c.nome)}</h2><div class="mini"><i>${esc(c.cientifico)}</i></div>
    <div style="margin:8px 0">${etqTipo(c.tipo)}${etqRar(c.raridade)}</div>
    <div class="explica">${esc(c.fato)}</div>
    <h3>Ficha</h3>
    <div class="mini">🌎 <b>Bioma:</b> ${esc(c.bioma)}</div>
    ${c.status ? `<div class="mini">🛡️ <b>Conservação (IUCN):</b> ${STATUS[c.status]}</div>` : ''}
    <div class="mini">📷 <b>Registros:</b> ${reg}</div>
    <button class="bt sec" id="bt-v">← Bioguia</button>` : `
    <button class="fechar" id="bt-x">✕</button>
    <div class="palco" style="height:140px"><div class="bicho" style="filter:grayscale(1) brightness(0);opacity:.3">${c.emoji}</div></div>
    <h2>${S.vistos[id] ? esc(c.nome) : '???'}</h2>
    <div class="explica">Ainda não registrado. Explore o campus e acerte a pergunta para registrar!</div>
    <button class="bt sec" id="bt-v">← Bioguia</button>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  p.querySelector('#bt-v').onclick = abrirBioguia;
}
function abrirParceiros() {
  const lista = S.parceiros.slice().sort((x, y) => y.nivel - x.nivel);
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>🎒 Parceiros e mochila</h2>
    <div class="linha" style="margin:10px 0"><div class="item-lista">🔍 <b>${S.itens.lupa}</b>&nbsp;lupas</div><div class="item-lista">🍈 <b>${S.itens.fruta}</b>&nbsp;frutas</div></div>
    <div class="mini">🔍 Lupa: elimina duas alternativas erradas. 🍈 Fruta: recupera 40% da vida do parceiro na arena.</div>
    <h3>${lista.length} parceiro${lista.length === 1 ? '' : 's'}</h3>
    ${lista.map(i => { const sp = SP[i.sp]; return `<div class="item-lista"><div class="bicho">${sp.emoji}</div><div class="f"><b>${esc(sp.nome)}</b> · nv. ${i.nivel}<br>${etqTipo(sp.tipo)} <span class="mini">⚔️ ${i.atk} · ❤️ ${i.hp}</span></div></div>`; }).join('') || '<div class="mini">Nenhum ainda.</div>'}`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
}
function abrirMenu() {
  const conq = LUG.arenas.filter(a => S.arenas[a.id]).length;
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>☰ Menu</h2>
    <div class="item-lista"><div class="bicho">${avatarDe(S.avatar)}</div><div class="f"><b>${esc(S.nome)}</b> · nível ${S.nivel}<br>${Object.keys(S.registros).length}/${CRIATURAS.length} espécies · ${conq}/${LUG.arenas.length} arenas</div></div>
    <details class="troca-av"><summary>Trocar avatar</summary>${gradeAvatares(avatarDe(S.avatar))}</details>
    <button class="bt" id="bt-modo">${S.modo === 'gps' ? '🕹️ Mudar para modo virtual' : '📍 Usar GPS (estou no campus)'}</button>
    <button class="bt sec" id="bt-ajuda">❓ Como jogar</button>
    ${typeof Nuvem !== 'undefined' && Nuvem.adulto && Nuvem.perfil ? '<button class="bt sec" id="bt-perfis">👨‍👧 Perfis e dependentes</button>' : ''}
    ${ehAdmin() ? '<button class="bt sec" id="bt-prof">🧑‍🏫 Modo professor (editar mapa)</button><button class="bt sec" id="bt-painel">📊 Painel do professor</button>' : ''}
    ${contaHTML()}
    <div class="mini" style="margin-top:12px">UFMT Ciência · protótipo · mapa © OpenStreetMap${typeof Nuvem !== 'undefined' && Nuvem.user ? ' · <a href="#" id="bt-privacidade" style="color:inherit">Conta e privacidade</a>' : ''}</div>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  ligarGradeAvatares(p, x => { S.avatar = x; salvar(); hud(); p.querySelector('.item-lista .bicho').textContent = x; toast(`Avatar trocado para ${x}`); });
  p.querySelector('#bt-modo').onclick = () => { fechar('t-geral'); mudarModo(S.modo === 'gps' ? 'virtual' : 'gps'); };
  p.querySelector('#bt-ajuda').onclick = abrirAjuda;
  const bs = p.querySelector('#bt-sair-conta'); if (bs) bs.onclick = () => Nuvem.sair();
  const be = p.querySelector('#bt-entrar-conta'); if (be) be.onclick = () => { fechar('t-geral'); store.set('ufmtc_convidado', false); telaLogin(); };
  const bp = p.querySelector('#bt-prof'); if (bp) bp.onclick = () => { fechar('t-geral'); ligarEditor(true); };
  const bpn = p.querySelector('#bt-painel'); if (bpn) bpn.onclick = abrirPainel;
  const bpf = p.querySelector('#bt-perfis'); if (bpf) bpf.onclick = abrirPerfis;
  const bpv = p.querySelector('#bt-privacidade'); if (bpv) bpv.onclick = e => { e.preventDefault(); abrirPrivacidade(); };
}
function abrirAjuda() {
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>❓ Como jogar</h2>
    <h3>🚶 Explore</h3><div class="mini">Ande pelo campus (GPS) ou toque no mapa (modo virtual). O círculo azul mostra seu alcance de ${CFG.alcance} m.</div>
    <h3>📷 Registre animais</h3><div class="mini">Toque num animal ao seu alcance e acerte a pergunta da área científica dele. Errou? Ele pode fugir — quanto mais raro, mais arisco.</div>
    <h3>🔬 Estações Científicas</h3><div class="mini">Losangos azuis: dão lupas, frutas e uma curiosidade. Recarregam em ${CFG.recargaEstacao / 60000} min.</div>
    <h3>🏟️ Arenas</h3><div class="mini">Escolha um parceiro e enfrente o guardião. As perguntas alternam entre a área do seu parceiro e a do guardião. Responder em menos de 8 s dá dano extra.</div>
    <h3>⚡ Vantagens</h3><div class="mini">${Object.values(TIPOS).map(t => `${t.icone} ${t.nome} vence ${TIPOS[t.vence].nome}`).join(' · ')}</div>
    <button class="bt" id="bt-ok">Entendi!</button>`);
  p.querySelector('#bt-x').onclick = p.querySelector('#bt-ok').onclick = () => fechar('t-geral');
}
function boasVindas() {
  const iniciais = ['capivara', 'seriema', 'tucano'];
  let ini = iniciais[0];
  const p = abrir('t-geral', `
    <h2>🌿 Bem-vindo(a) ao UFMT Ciência!</h2>
    <div class="mini">Explore o campus, registre animais de Mato Grosso e vença os desafios científicos das arenas.</div>
    <h3>Seu apelido no jogo</h3><input id="in-nome" maxlength="20" placeholder="Apelido (aparece no ranking)" value="${esc(apelidoSugerido())}">
    <h3>Seu avatar</h3>${gradeAvatares(avatarDe(S.avatar))}
    <h3>Escolha seu primeiro parceiro</h3>
    <div class="grade">${iniciais.map(id => `<button class="ficha" data-id="${id}"><div class="bicho">${SP[id].emoji}</div><div class="nm">${SP[id].nome}<br>${TIPOS[SP[id].tipo].icone} ${TIPOS[SP[id].tipo].nome}</div></button>`).join('')}</div>
    <button class="bt" id="bt-gps">📍 Jogar com GPS (estou no campus)</button>
    <button class="bt sec" id="bt-virt">🕹️ Explorar virtualmente</button>`, true);
  $('#t-geral').dataset.trava = '1';
  const marcar = () => p.querySelectorAll('.ficha').forEach(f => f.classList.toggle('sel', f.dataset.id === ini));
  p.querySelectorAll('.ficha').forEach(f => f.onclick = () => { ini = f.dataset.id; marcar(); }); marcar();
  let av = avatarDe(S.avatar);
  ligarGradeAvatares(p, x => { av = x; });
  const comecar = modo => {
    const nm = (p.querySelector('#in-nome').value || '').trim();
    if (nm.length < 2) return toast('O apelido precisa ter pelo menos 2 letras.');
    S.nome = nm.slice(0, 20); S.avatar = av;
    S.parceiros = [novaInstancia(ini, 5)]; S.registros[ini] = 1; S.vistos[ini] = true;
    salvar(); fechar('t-geral'); hud(); jogoIniciado = true; mudarModo(modo);
    for (let i = 0; i < CFG.maxSpawns; i++) criarSpawn();
    if (typeof Nuvem !== 'undefined') Nuvem.gravar(true);
  };
  p.querySelector('#bt-gps').onclick = () => comecar('gps');
  p.querySelector('#bt-virt').onclick = () => comecar('virtual');
}

function contaHTML() {
  if (typeof Nuvem === 'undefined' || !Nuvem.ok) return '';
  if (!Nuvem.user) return `<h3>Conta</h3><div class="mini">Jogando como convidado: progresso só neste aparelho.</div><button class="bt" id="bt-entrar-conta">Entrar ou criar conta</button>`;
  if (Nuvem.anonimo) return `<h3>Conta</h3><div class="mini">Perfil de dependente, conectado a este aparelho pelo responsável. O progresso é salvo na nuvem.</div>`;
  return `<h3>Conta</h3><div class="mini">Conectado como <b>${esc(Nuvem.user.email || '')}</b>${Nuvem.dep ? ` · jogando com o perfil de <b>${esc(Nuvem.dep.apelido)}</b>` : ''}. O progresso é salvo na nuvem.</div>
    <button class="bt sec" id="bt-sair-conta">Sair da conta</button>`;
}
function apelidoSugerido() {
  if (typeof Nuvem !== 'undefined' && Nuvem.dep) return String(Nuvem.dep.apelido || '').slice(0, 20);
  const u = (typeof Nuvem !== 'undefined') && Nuvem.user;
  if (u && u.isAnonymous) return '';
  if (u && u.displayName) return u.displayName.split(' ')[0].slice(0, 20);
  if (u && u.email) return u.email.split('@')[0].slice(0, 20);
  return '';
}
let jogoIniciado = false;
function entrarNoJogo() {
  if (!ehAdmin()) {
    if (EDITOR) ligarEditor(false);
    if (store.get('ufmtc_lugares', null)) { store.del('ufmtc_lugares'); LUG = lugaresPadrao(); }
  }
  garantirPosicao(true);
  hud(); desenharLugares();
  if (typeof Nuvem !== 'undefined' && Nuvem.user) Nuvem.carregarArenas().then(() => Nuvem.registrarHistorico()).then(desenharLugares);
  spawns.slice().forEach(removerSpawn);
  if (!S.nome) { boasVindas(); return; }
  if (!jogoIniciado) { jogoIniciado = true; mudarModo(S.modo === 'gps' ? 'gps' : 'virtual'); }
  for (let i = 0; i < CFG.maxSpawns; i++) criarSpawn();
}

/* ---------- Modo professor (editor de lugares) */
let EDITOR = false;
function ligarEditor(on) {
  if (on && !ehAdmin()) { toast('O modo professor é só para contas de professor.'); return; }
  EDITOR = on;
  $('#editor-barra').style.display = on ? 'block' : 'none';
  $('#barra-inf').style.display = on ? 'none' : 'flex';
  camadaSpawns[on ? 'remove' : 'addTo'](map);
  if (on) toast('Modo professor: toque no mapa para criar uma estação ou arena.', 3500);
}
function editorClique(ll) { editorForm(null, { lat: ll.lat, lng: ll.lng }); }
function editorForm(tipo, obj) {
  const novo = !tipo; tipo = tipo || 'estacao';
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>🧑‍🏫 ${novo ? 'Novo lugar' : 'Editar lugar'}</h2>
    <div class="mini">${obj.lat.toFixed(6)}, ${obj.lng.toFixed(6)}</div>
    <h3>Tipo</h3><select id="ed-tipo" ${novo ? '' : 'disabled'}><option value="estacao">🔬 Estação Científica</option><option value="arena">🏟️ Arena</option></select>
    <h3>Nome</h3><input id="ed-nome" value="${esc(obj.nome || '')}" placeholder="Ex.: Instituto de Física">
    <div id="ed-est"><h3>Curiosidade (opcional)</h3><input id="ed-texto" value="${esc(obj.texto || '')}" placeholder="Em branco = curiosidade aleatória"></div>
    <div id="ed-arena"><h3>Guardião</h3><select id="ed-guard">${CRIATURAS.map(c => `<option value="${c.id}" ${obj.guardiao === c.id ? 'selected' : ''}>${c.emoji} ${c.nome} (${TIPOS[c.tipo].nome})</option>`).join('')}</select>
      <h3>Nível do guardião</h3><input id="ed-nivel" type="number" min="1" max="30" value="${obj.nivel || 10}"></div>
    <button class="bt" id="ed-salvar">Salvar</button>
    ${novo ? `<button class="bt sec" id="ed-centro">🎯 Usar este ponto como centro da área do jogo</button>` : `<button class="bt sec" id="ed-del" style="color:#c0392b">Excluir</button>`}`);
  const sel = p.querySelector('#ed-tipo'); sel.value = tipo;
  const vis = () => { p.querySelector('#ed-est').style.display = sel.value === 'estacao' ? '' : 'none'; p.querySelector('#ed-arena').style.display = sel.value === 'arena' ? '' : 'none'; };
  sel.onchange = vis; vis();
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  p.querySelector('#ed-salvar').onclick = () => {
    const nome = p.querySelector('#ed-nome').value.trim(); if (!nome) return toast('Dê um nome ao lugar.');
    if (sel.value === 'estacao') {
      if (novo) LUG.estacoes.push({ id: uid(), nome, lat: obj.lat, lng: obj.lng, texto: p.querySelector('#ed-texto').value.trim() });
      else Object.assign(obj, { nome, texto: p.querySelector('#ed-texto').value.trim() });
    } else {
      const d = { nome, guardiao: p.querySelector('#ed-guard').value, nivel: Math.max(1, Math.min(30, +p.querySelector('#ed-nivel').value || 10)) };
      if (novo) LUG.arenas.push({ id: uid(), lat: obj.lat, lng: obj.lng, ...d }); else Object.assign(obj, d);
    }
    salvarLugares(); desenharLugares(); fechar('t-geral'); toast('Salvo!');
  };
  const c = p.querySelector('#ed-centro');
  if (c) c.onclick = () => { LUG.centro = [obj.lat, obj.lng]; salvarLugares(); desenharLugares(); fechar('t-geral'); toast('Centro da área atualizado. Ajuste o raio em "Exportar / área".'); };
  const del = p.querySelector('#ed-del');
  if (del) del.onclick = () => { LUG.estacoes = LUG.estacoes.filter(x => x !== obj); LUG.arenas = LUG.arenas.filter(x => x !== obj); salvarLugares(); desenharLugares(); fechar('t-geral'); toast('Excluído.'); };
}
function editorExportar() {
  const p = abrir('t-geral', `
    <button class="fechar" id="bt-x">✕</button>
    <h2>📤 Área e exportação</h2>
    <h3>Raio da área do jogo (m)</h3><div class="linha"><input id="ex-raio" type="number" min="100" max="5000" value="${Math.round(LUG.raio)}"><button class="bt" id="ex-raio-ok" style="margin-top:6px;flex:0 0 90px">Aplicar</button></div>
    <h3>Configuração dos lugares (JSON)</h3>
    <div class="mini">Copie e me envie (ou cole no arquivo do jogo) para que todos os jogadores vejam as mesmas estações e arenas.</div>
    <textarea id="ex-json">${esc(JSON.stringify(LUG, null, 1))}</textarea>
    <div class="linha"><button class="bt" id="ex-copiar">📋 Copiar</button><button class="bt sec" id="ex-aplicar">Aplicar texto colado</button></div>
    <button class="bt sec" id="ex-padrao">↺ Restaurar lugares padrão</button>`);
  p.querySelector('#bt-x').onclick = () => fechar('t-geral');
  p.querySelector('#ex-raio-ok').onclick = () => { LUG.raio = Math.max(100, +p.querySelector('#ex-raio').value || LUG.raio); salvarLugares(); desenharLugares(); toast('Raio atualizado.'); };
  p.querySelector('#ex-copiar').onclick = async () => {
    const ta = p.querySelector('#ex-json');
    try { await navigator.clipboard.writeText(ta.value); toast('Copiado!'); } catch (e) { ta.select(); toast('Selecionei o texto: copie com Ctrl+C / segurar e copiar.'); }
  };
  p.querySelector('#ex-aplicar').onclick = () => {
    try { const j = JSON.parse(p.querySelector('#ex-json').value); if (!j.centro || !j.estacoes || !j.arenas) throw 0; LUG = j; salvarLugares(); desenharLugares(); fechar('t-geral'); toast('Configuração aplicada.'); }
    catch (e) { toast('Texto inválido.'); }
  };
  p.querySelector('#ex-padrao').onclick = ev => {
    if (ev.target.dataset.c !== '1') { ev.target.dataset.c = '1'; ev.target.textContent = 'Toque de novo para confirmar'; return; }
    LUG = lugaresPadrao(); salvarLugares(); desenharLugares(); fechar('t-geral'); toast('Lugares restaurados.');
  };
}

/* ---------- Início */
function iniciar() {
  iniciarMapa(); hud();
  $('#bt-bioguia').onclick = abrirBioguia;
  $('#bt-parceiros').onclick = abrirParceiros;
  $('#bt-menu').onclick = abrirMenu;
  $('#bt-ranking').onclick = abrirRanking;
  $('#modo').onclick = () => mudarModo(S.modo === 'gps' ? 'virtual' : 'gps');
  $('#centralizar').onclick = () => { seguir = true; map.setView(S.pos, Math.max(map.getZoom(), 17)); };
  $('#ed-sair').onclick = () => ligarEditor(false);
  $('#ed-exportar').onclick = editorExportar;
  document.addEventListener('keydown', e => {
    if (S.modo !== 'virtual' || EDITOR || document.querySelector('.tela.aberta')) return;
    const d = { ArrowUp: [0, 12], ArrowDown: [0, -12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[e.key];
    if (d) { e.preventDefault(); seguir = true; const np = deslocar(S.pos, d[0], d[1]); if (dentroArea(np)) moverJogador(np, false); }
  });
  setInterval(cicloSpawns, 4000);
  if (typeof Nuvem !== 'undefined') Nuvem.iniciar(); else entrarNoJogo();
}
window.addEventListener('load', iniciar);

/* ---------- Erros inesperados: mostra um aviso em vez de travar em silêncio (ajuda a diagnosticar no celular) */
let ultimoErroT = 0;
function avisarErro(msg) {
  if (!msg || /^Script error\.?$/i.test(msg) || /ResizeObserver/.test(msg)) return;
  console.error(msg);
  if (Date.now() - ultimoErroT < 10000) return;
  ultimoErroT = Date.now();
  try { toast(`⚠️ Algo deu errado: <span style="font-weight:400">${esc(String(msg).slice(0, 140))}</span><br><span class="mini" style="color:#fff">Se o jogo parar de responder, recarregue a página. Um print desta mensagem ajuda a corrigir.</span>`, 7000); } catch (e) { }
}
window.addEventListener('error', ev => { if (ev && ev.message) avisarErro(ev.message); });
window.addEventListener('unhandledrejection', ev => { const r = ev && ev.reason; avisarErro(r && (r.message || r.code) ? (r.message || r.code) : ''); });
