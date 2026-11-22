// pedestrians.js — people on the sidewalks: they stroll, cross at corners,
// and run away from the player, gunfire and police when the heat is on.
import * as THREE from 'three';
import { buildPersonMesh } from './vehicles.js';

const SHIRTS = [0xe8e8e8, 0xffd23e, 0x3cae5f, 0xc94a6b, 0x4aa8ff, 0xff9a3c, 0x9d6bd8, 0x37c8c0];
const NAMES = ['Sinta', 'Bayu', 'Dewi', 'Agus', 'Rina', 'Joko', 'Maya', 'Putri', 'Andi', 'Lestari', 'Budi', 'Sari'];

// Sidewalk lanes the pedestrians stroll along.
const LANES = [
  { axis: 'z', fixed: 30.5, from: -180, to: 180 },
  { axis: 'z', fixed: 49.5, from: -180, to: 180 },
  { axis: 'x', fixed: -68, from: -130, to: 120 },
  { axis: 'x', fixed: -52, from: -130, to: 120 },
  { axis: 'x', fixed: 8, from: -130, to: 120 },
  { axis: 'x', fixed: 68, from: -130, to: 120 },
];

export function spawnPedestrians(scene, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const lane = LANES[i % LANES.length];
    const mesh = buildPersonMesh(SHIRTS[i % SHIRTS.length], 0xb98a62 + (i % 3) * 0x101010, 0x333333 + (i % 5) * 0x222222);
    const along = lane.from + ((i * 37) % (lane.to - lane.from));
    const x = lane.axis === 'z' ? lane.fixed + (i % 2 ? 0.8 : -0.8) : along;
    const z = lane.axis === 'z' ? along : lane.fixed + (i % 2 ? 0.8 : -0.8);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, lane, along, dir: i % 2 ? 1 : -1,
      speed: 1.1 + (i % 3) * 0.35, fleeing: false,
      name: NAMES[i % NAMES.length], walkPhase: Math.random() * 6,
    });
  }
  return peds;
}

export function updatePedestrians(dt, peds, threatPos, wanted, time) {
  for (const ped of peds) {
    // Flee when the threat is near or the city is hot.
    let flee = false;
    if (threatPos) {
      const d = Math.hypot(ped.mesh.position.x - threatPos.x, ped.mesh.position.z - threatPos.z);
      if (d < 14 || (wanted >= 2 && d < 26)) flee = true;
    }
    ped.fleeing = flee;
    const speed = flee ? ped.speed * 3.4 : ped.speed;
    if (flee && threatPos) {
      const dx = ped.mesh.position.x - threatPos.x;
      const dz = ped.mesh.position.z - threatPos.z;
      const d = Math.hypot(dx, dz) || 1;
      ped.mesh.position.x += (dx / d) * speed * dt;
      ped.mesh.position.z += (dz / d) * speed * dt;
      ped.mesh.rotation.y = Math.atan2(dx, dz);
    } else {
      ped.along += ped.dir * speed * dt;
      if (ped.along > ped.lane.to) { ped.along = ped.lane.to; ped.dir = -1; }
      if (ped.along < ped.lane.from) { ped.along = ped.lane.from; ped.dir = 1; }
      if (ped.lane.axis === 'z') {
        ped.mesh.position.z = ped.along;
        ped.mesh.rotation.y = ped.dir > 0 ? 0 : Math.PI;
      } else {
        ped.mesh.position.x = ped.along;
        ped.mesh.rotation.y = ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // walk-cycle swing on the legs and arms
    ped.walkPhase += dt * speed * 4;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    const legL = ped.mesh.getObjectByName('legL');
    const legR = ped.mesh.getObjectByName('legR');
    const armL = ped.mesh.getObjectByName('armL');
    const armR = ped.mesh.getObjectByName('armR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (armL) armL.rotation.x = -swing * 0.7;
    if (armR) armR.rotation.x = swing * 0.7;
  }
}
