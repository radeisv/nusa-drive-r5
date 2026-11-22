// hud.js — the whole interface: circular coloured minimap, wanted stars,
// cash, health and armour, respect, weapon slots, crew cards, mission panel
// with stage bar + NEXT + timer, radio, location name and speed.
import { dispatchRows } from './police.js';
import { currentStage } from './missions.js';
import { WEAPONS } from './combat.js';

const $ = (id) => document.getElementById(id);

// Circular minimap: roads, beach, sea, mission marker, police dots, player arrow.
export function drawMinimap(state) {
  const cv = $('minimap');
  if (!cv) return;
  const g = cv.getContext('2d');
  const S = cv.width, C = S / 2;
  const scale = S / 420; // whole island fits
  const toMap = (x, z) => [C + x * scale, C + z * scale];
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(C, C, C - 2, 0, Math.PI * 2); g.clip();
  // land, sea, beach
  g.fillStyle = '#3f7a34'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#2f7fc4'; g.fillRect(C + 95 * scale, 0, S, S);
  g.fillStyle = '#e8d29a'; g.fillRect(C + 95 * scale, 0, 46 * scale, S);
  // airport island (west)
  g.fillStyle = '#6b7a6b'; g.fillRect(C - 185 * scale, C - 40 * scale, 70 * scale, 80 * scale);
  // roads
  g.strokeStyle = '#3a3d46'; g.lineWidth = 14 * scale;
  g.beginPath(); g.moveTo(...toMap(40, -210)); g.lineTo(...toMap(40, 210)); g.stroke();
  for (const z of [-60, 0, 60]) { g.beginPath(); g.moveTo(...toMap(-150, z)); g.lineTo(...toMap(95, z)); g.stroke(); }
  g.beginPath(); g.moveTo(...toMap(-160, 0)); g.lineTo(...toMap(-40, 0)); g.stroke();
  // lane dashes
  g.strokeStyle = '#ffd23e'; g.lineWidth = 2; g.setLineDash([8, 10]);
  g.beginPath(); g.moveTo(...toMap(40, -210)); g.lineTo(...toMap(40, 210)); g.stroke();
  g.setLineDash([]);
  // mission marker (pulsing diamond)
  const stage = currentStage(state);
  if (stage && stage.target) {
    const [mx, my] = toMap(stage.target.x, stage.target.z);
    const r = 12 + Math.sin(state.time * 4) * 3;
    g.fillStyle = '#ffd23e';
    g.beginPath(); g.moveTo(mx, my - r); g.lineTo(mx + r * 0.7, my); g.lineTo(mx, my + r); g.lineTo(mx - r * 0.7, my); g.closePath(); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  }
  // police dots (red/blue)
  for (const u of state.police) {
    const [ux, uy] = toMap(u.mesh.position.x, u.mesh.position.z);
    g.fillStyle = '#ff2a2a'; g.beginPath(); g.arc(ux, uy, 6, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  }
  if (state.heli) {
    const [hx, hy] = toMap(state.heli.mesh.position.x, state.heli.mesh.position.z);
    g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
  }
  // traffic dots (white)
  for (const t of state.traffic) {
    const [tx, ty] = toMap(t.mesh.position.x, t.mesh.position.z);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(tx - 2, ty - 2, 4, 4);
  }
  // player arrow (centre-ish, points along heading)
  const [px, py] = toMap(state.playerPos.x, state.playerPos.z);
  g.save();
  g.translate(px, py); g.rotate(state.playerHeading || 0);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 5); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke();
  g.restore();
  // north tick
  g.fillStyle = '#fff'; g.font = 'bold 20px Arial'; g.textAlign = 'center';
  g.fillText('N', C, 22);
  g.restore();
}

function fmtTime(s) {
  const m = Math.floor(Math.max(0, s) / 60);
  const ss = Math.floor(Math.max(0, s) % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

export function updateHud(state) {
  // mission panel
  const m = state.mission;
  if (m && m.active) {
    $('mission-chapter').textContent = m.def.chapter;
    $('mission-title').textContent = m.def.title;
    $('mission-timer').textContent = fmtTime(m.timer);
    $('mission-timer').style.color = m.timer < 30 ? '#ff5d5d' : '#ffd23e';
    $('mission-stagefill').style.width = ((m.stage + 1) / m.def.stages.length * 100) + '%';
    const stage = currentStage(state);
    $('mission-objective').textContent = stage ? stage.text : '';
    $('mission-next').innerHTML = 'NEXT <b>' + (stage ? stage.next : '—') + '</b>';
    $('mission-panel').style.display = 'block';
  } else {
    $('mission-panel').style.display = 'none';
  }
  // police panel
  const rows = dispatchRows(state);
  const panel = $('police-panel');
  if (state.wanted > 0) {
    panel.classList.remove('clean');
    $('police-count').textContent = rows.length + ' UNITS';
    $('police-rows').innerHTML = rows.map((r) =>
      `<div class="police-row"><span class="unit">▲ ${r.name}</span><span class="role">${r.role}</span><span class="dist">${r.dist} m</span></div>`).join('');
  } else {
    panel.classList.add('clean');
    $('police-count').textContent = 'CLEAR';
    $('police-rows').innerHTML = '<div class="police-row"><span>No units on you. Stay clean, Raka.</span></div>';
  }
  // cash / stars / rank
  $('cash').textContent = '$' + state.cash.toLocaleString();
  let stars = '';
  for (let i = 1; i <= 5; i++) stars += `<span class="${i <= state.wanted ? 'lit' : 'dim'}">★</span>`;
  $('stars').innerHTML = stars;
  $('wanted-label').textContent = state.wanted === 0 ? 'CLEAN — NO HEAT'
    : state.wanted >= 4 ? 'MANHUNT — LOSE THE HEAT'
    : state.wanted >= 3 ? 'AIR ONE IS ON YOU' : 'POLICE ON YOUR TAIL';
  $('rank-fill').style.width = Math.min(100, (state.respect % 5200) / 52) + '%';
  // weapon slots
  $('weapon-slots').innerHTML = WEAPONS.map((w, i) =>
    `<div class="weapon-slot ${state.weapon === i + 1 ? 'active' : ''}"><div class="key">${w.key}</div><div class="name">${w.name}</div><div class="ammo">${w.ammo === Infinity ? '∞' : (state.ammo[w.key] ?? 0)}</div></div>`).join('');
  // vitals
  $('health-num').textContent = Math.round(state.playerHealth);
  $('health-fill').style.width = state.playerHealth + '%';
  $('armour-num').textContent = Math.round(state.playerArmour);
  $('armour-fill').style.width = state.playerArmour + '%';
  $('respect-line').textContent = 'RESPECT ' + state.respect.toLocaleString() + ' / 5,200 RP';
  // speed / vehicle / radio
  const kmh = state.inCar ? Math.round(Math.abs(state.carSpeed || 0) * 3.6) : Math.round((state.walkSpeed || 0) * 3.6);
  $('speed').textContent = kmh;
  $('vehicle-name').textContent = state.inCar ? (state.carName || 'KOMODO GT · SPORTS') : 'ON FOOT · KOTA NUSA';
  $('cond-num').textContent = Math.round(state.vehicleCondition ?? 100) + '%';
  $('cond-fill').style.width = (state.vehicleCondition ?? 100) + '%';
  $('location-name').textContent = state.location || 'PANTAI BOULEVARD';
  $('location-sub').textContent = state.locationSub || 'Kota Nusa · Coastal District';
  // dialogue
  if (state.dialogueUntil > state.time) {
    $('dialogue').style.display = 'flex';
    $('dialogue-name').textContent = state.dialogueName || '';
    $('dialogue-text').textContent = state.dialogueText || '';
    $('dialogue-face').textContent = state.dialogueFace || '?';
  } else {
    $('dialogue').style.display = 'none';
  }
  // crosshair + interact prompt
  $('crosshair').classList.toggle('on', !state.inCar && state.mode === 'playing');
  $('interact').classList.toggle('on', !!state.nearCar && !state.inCar && state.mode === 'playing');
  drawMinimap(state);
}
