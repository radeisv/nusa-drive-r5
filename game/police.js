// police.js — the wanted system: Polisis Nusa respond in tiers, cruisers
// chase and ram, and Air One (the helicopter) joins with its spotlight at
// 3 stars and above. Dispatch units are named with roles and distances.
import * as THREE from 'three';
import { buildCarMesh, buildHelicopterMesh } from './vehicles.js';

export const UNIT_NAMES = ['ELANG-1', 'HIU-3', 'GARUDA-7', 'MERAK-2', 'KOMODO-5', 'RAJAWALI-9', 'BURUNG-4'];
export const UNIT_ROLES = ['PURSUIT', 'RAMMING', 'FLANKING', 'ROADBLOCK', 'SPOTLIGHT', 'PURSUIT', 'CLOSING IN'];

export function raiseWanted(state, amount) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + amount));
  state.heat = 100;
  if (state.wanted >= 1) ensurePolice(state);
  return state.wanted;
}

export function lowerWanted(state, amount) {
  state.wanted = Math.max(0, state.wanted - amount);
  if (state.wanted === 0) {
    for (const u of state.police) u.mesh.visible = false;
    state.police = [];
    if (state.heli) { state.heli.mesh.visible = false; state.heli = null; }
  }
}

// Spawn the cruisers that match the current wanted level (1 unit per star + 1).
export function ensurePolice(state) {
  const want = Math.min(6, state.wanted + 1);
  while (state.police.length < want) {
    const i = state.police.length;
    const mesh = buildCarMesh(0xf2f2f2, 'police');
    const a = (i / 6) * Math.PI * 2 + state.time;
    const px = state.playerPos.x + Math.cos(a) * (26 + i * 7);
    const pz = state.playerPos.z + Math.sin(a) * (26 + i * 7);
    mesh.position.set(px, 0, pz);
    state.scene.add(mesh);
    state.police.push({
      mesh, kind: 'police', speed: 0, maxSpeed: 15 + state.wanted * 1.6,
      heading: Math.atan2(state.playerPos.x - px, state.playerPos.z - pz),
      name: UNIT_NAMES[i % UNIT_NAMES.length],
      role: UNIT_ROLES[i % UNIT_ROLES.length],
      ramCooldown: 0,
    });
  }
  if (state.wanted >= 3 && !state.heli) spawnHelicopter(state);
}

export function spawnHelicopter(state) {
  const mesh = buildHelicopterMesh();
  mesh.position.set(state.playerPos.x + 18, 26, state.playerPos.z - 24);
  state.scene.add(mesh);
  state.heli = { mesh, kind: 'heli', name: 'AIR ONE', role: 'SPOTLIGHT', angle: 0 };
}

// Cruisers steer at the player, ram when close, and flash their beacons.
// The helicopter circles above and keeps its spotlight cone on the player.
export function updatePolice(dt, state) {
  const p = state.playerPos;
  for (const unit of state.police) {
    if (!unit.mesh.visible) unit.mesh.visible = true;
    const dx = p.x - unit.mesh.position.x;
    const dz = p.z - unit.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - unit.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // flankers hold a side offset instead of piling onto the same spot
    const flank = unit.role === 'FLANKING' ? 0.5 : 0;
    unit.heading += THREE.MathUtils.clamp(diff + flank, -2.2 * dt, 2.2 * dt);
    const targetSpeed = dist > 60 ? unit.maxSpeed : unit.maxSpeed * (dist > 8 ? 0.85 : 0.55);
    unit.speed += THREE.MathUtils.clamp(targetSpeed - unit.speed, -20 * dt, 9 * dt);
    unit.mesh.position.x += Math.sin(unit.heading) * unit.speed * dt;
    unit.mesh.position.z += Math.cos(unit.heading) * unit.speed * dt;
    unit.mesh.rotation.y = unit.heading;
    // ram: a close pass shoves the player's car and costs condition
    unit.ramCooldown -= dt;
    if (dist < 3.4 && unit.ramCooldown <= 0) {
      unit.ramCooldown = 2.5;
      state.vehicleCondition = Math.max(5, (state.vehicleCondition ?? 100) - 6);
      state.playerHealth = Math.max(5, state.playerHealth - 4);
      state.toast('RAMMED BY ' + unit.name + '!', 1400);
      if (state.audio) state.audio.playThud();
    }
    // flashing beacons
    const on = Math.floor(state.time * 6 + (unit.role === 'FLANKING' ? 1 : 0)) % 2 === 0;
    const red = unit.mesh.getObjectByName('beacon-red');
    const blue = unit.mesh.getObjectByName('beacon-blue');
    if (red) red.material.emissiveIntensity = on ? 2.2 : 0.15;
    if (blue) blue.material.emissiveIntensity = on ? 0.15 : 2.2;
    unit.distance = Math.round(dist);
  }
  if (state.heli) {
    const heli = state.heli;
    heli.angle += dt * 0.45;
    const hx = p.x + Math.cos(heli.angle) * 20;
    const hz = p.z + Math.sin(heli.angle) * 20;
    heli.mesh.position.x += (hx - heli.mesh.position.x) * dt * 1.4;
    heli.mesh.position.z += (hz - heli.mesh.position.z) * dt * 1.4;
    heli.mesh.position.y = 26 + Math.sin(state.time * 0.8) * 1.5;
    heli.mesh.rotation.y = Math.atan2(p.x - heli.mesh.position.x, p.z - heli.mesh.position.z);
    const rotor = heli.mesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 22;
    const tail = heli.mesh.getObjectByName('tail-rotor');
    if (tail) tail.rotation.x += dt * 30;
    const cone = heli.mesh.getObjectByName('spot-cone');
    if (cone) cone.material.opacity = 0.18 + Math.sin(state.time * 3) * 0.05;
    heli.distance = Math.round(Math.hypot(hx - p.x, hz - p.z));
  }
  // heat cools when the player breaks line of sight; wanted drops a star
  if (state.wanted > 0) {
    const nearest = state.police.reduce((m, u) => Math.min(m, u.distance ?? 999), 999);
    if (nearest > 70 && !state.heli) {
      state.heat -= dt * 6;
      if (state.heat <= 0) { lowerWanted(state, 1); state.heat = 100; state.toast('HEAT DROPPED — ' + state.wanted + ' STARS', 1600); }
    } else {
      state.heat = 100;
    }
  }
}

// Distance-sorted dispatch rows for the HUD panel. Distances are computed
// live from the player's position so they are never stale or zero.
export function dispatchRows(state) {
  const p = state.playerPos;
  const rows = state.police.map((u) => ({
    name: u.name, role: u.role,
    dist: Math.round(Math.hypot(u.mesh.position.x - p.x, u.mesh.position.z - p.z)),
  }));
  if (state.heli) rows.push({
    name: 'AIR ONE', role: 'SPOTLIGHT',
    dist: Math.round(Math.hypot(state.heli.mesh.position.x - p.x, state.heli.mesh.position.z - p.z)),
  });
  rows.sort((a, b) => a.dist - b.dist);
  return rows.slice(0, 6);
}
