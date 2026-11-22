// combat.js — on-foot fighting: the player shoots with the mouse, guards
// shoot back, and every guard down pays cash. Fists are weapon 1, the .38
// is weapon 2, the SMG is weapon 3 and the 12G is weapon 4.
import * as THREE from 'three';
import { buildPersonMesh } from './vehicles.js';
import { raiseWanted } from './police.js';

export const WEAPONS = [
  { key: '1', name: 'FISTS', ammo: Infinity, damage: 20, range: 3.2, rate: 0.45 },
  { key: '2', name: '.38', ammo: 60, damage: 34, range: 42, rate: 0.5 },
  { key: '3', name: 'SMG', ammo: 120, damage: 16, range: 38, rate: 0.11 },
  { key: '4', name: '12G', ammo: 18, damage: 70, range: 20, rate: 0.9 },
];

export function spawnGuards(scene, count, center) {
  const guards = [];
  for (let i = 0; i < count; i++) {
    const mesh = buildPersonMesh(0xd23c2e, 0x8a6b4a, 0x1c1c1c);
    const a = (i / count) * Math.PI * 2;
    mesh.position.set(center.x + Math.cos(a) * (5 + (i % 3) * 3), 0, center.z + Math.sin(a) * (5 + (i % 3) * 3));
    scene.add(mesh);
    guards.push({
      mesh, health: 100, alive: true, shootCooldown: 1 + i * 0.7,
      patrol: mesh.position.clone(), patrolAngle: a, speed: 2.2,
    });
  }
  return guards;
}

// One shot from the player toward the camera aim point.
export function fireWeapon(state) {
  const w = WEAPONS[state.weapon - 1];
  const now = state.time;
  if (state.lastShot && now - state.lastShot < w.rate) return;
  if (w.ammo !== Infinity && state.ammo[w.key] <= 0) { state.toast('NO AMMO — PRESS 1 FOR FISTS', 1200); return; }
  state.lastShot = now;
  if (w.ammo !== Infinity) state.ammo[w.key]--;
  if (state.audio) state.audio.playGunshot();
  state.muzzleFlash = 0.07;
  // hit the nearest guard inside the aim cone
  const origin = state.playerPos;
  const dir = new THREE.Vector3();
  state.camera.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  let best = null, bestScore = 0.94; // cos of ~20 degrees
  for (const g of state.guards) {
    if (!g.alive) continue;
    const to = new THREE.Vector3(g.mesh.position.x - origin.x, 0, g.mesh.position.z - origin.z);
    const d = to.length();
    if (d > w.range) continue;
    to.normalize();
    const score = to.dot(dir);
    if (score > bestScore) { bestScore = score; best = { g, d }; }
  }
  if (best) {
    best.g.health -= w.damage;
    spawnTracer(state, origin, best.g.mesh.position);
    if (best.g.health <= 0) {
      best.g.alive = false;
      best.g.mesh.visible = false;
      state.cash += 120;
      state.toast('GUARD DOWN — +$120', 1500);
      if (state.mission) state.mission.guardsDown++;
      raiseWanted(state, 1);
      if (state.audio) state.audio.playChime();
    }
  } else {
    const end = origin.clone().add(dir.clone().multiplyScalar(w.range));
    spawnTracer(state, origin, end);
  }
}

function spawnTracer(state, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, 1.4, from.z),
    new THREE.Vector3(to.x, 1.3, to.z),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe9a8 }));
  state.scene.add(line);
  state.tracers = state.tracers || [];
  state.tracers.push({ line, life: 0.12 });
}

// Guards patrol their post and open fire when the player comes close.
export function updateCombat(dt, state) {
  for (const g of state.guards) {
    if (!g.alive) continue;
    const dx = state.playerPos.x - g.mesh.position.x;
    const dz = state.playerPos.z - g.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 26) {
      g.mesh.rotation.y = Math.atan2(dx, dz);
      if (d > 6) {
        g.mesh.position.x += (dx / d) * g.speed * dt;
        g.mesh.position.z += (dz / d) * g.speed * dt;
      }
      g.shootCooldown -= dt;
      if (g.shootCooldown <= 0 && d < 30) {
        g.shootCooldown = 1.4 + Math.random() * 0.8;
        if (Math.random() < 0.45) {
          state.playerHealth = Math.max(1, state.playerHealth - 6);
          if (state.audio) state.audio.playGunshot();
          spawnTracer(state, g.mesh.position, state.playerPos);
          if (state.playerHealth <= 1) {
            state.toast('WASTED — YOU WAKE UP AT THE CLINIC, -$500', 2600);
            state.cash = Math.max(0, state.cash - 500);
            state.playerHealth = 60; state.playerArmour = 30;
            state.playerPos.set(40, 0, 40);
            if (state.playerMesh) state.playerMesh.position.copy(state.playerPos);
          }
        }
      }
    } else {
      // patrol a small circle around the post
      g.patrolAngle += dt * 0.25;
      const tx = g.patrol.x + Math.cos(g.patrolAngle) * 3;
      const tz = g.patrol.z + Math.sin(g.patrolAngle) * 3;
      const pdx = tx - g.mesh.position.x, pdz = tz - g.mesh.position.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd > 0.3) {
        g.mesh.position.x += (pdx / pd) * 1.2 * dt;
        g.mesh.position.z += (pdz / pd) * 1.2 * dt;
        g.mesh.rotation.y = Math.atan2(pdx, pdz);
      }
    }
  }
  // fade tracers out
  if (state.tracers) {
    for (const t of state.tracers) t.life -= dt;
    state.tracers = state.tracers.filter((t) => {
      if (t.life <= 0) { state.scene.remove(t.line); return false; }
      return true;
    });
  }
}
