// traffic.js — street traffic: cars that loop the city blocks on fixed routes,
// keep their lane, brake for the car ahead, and honk (visually) when blocked.
import * as THREE from 'three';
import { buildCarMesh } from './vehicles.js';

const TRAFFIC_COLORS = [0xd8d2c4, 0x3c6fd0, 0xd23c2e, 0x37a05a, 0xe8b23c, 0x8a97a8, 0xc94a6b, 0x2fae9d];
const TRAFFIC_KINDS = ['sedan', 'sedan', 'taxi', 'van', 'sedan', 'sedan'];

// Rectangular loops around city blocks, driven on the right-hand side.
function blockLoop(cx, cz, hw, hd, dir) {
  const pts = [
    new THREE.Vector3(cx - hw, 0, cz - hd), new THREE.Vector3(cx + hw, 0, cz - hd),
    new THREE.Vector3(cx + hw, 0, cz + hd), new THREE.Vector3(cx - hw, 0, cz + hd),
  ];
  return dir < 0 ? pts.reverse() : pts;
}

export function spawnTraffic(scene, count) {
  const routes = [
    blockLoop(40, 0, 8, 200, 1),     // coastal boulevard loop
    blockLoop(0, -60, 130, 8, -1),   // north cross street
    blockLoop(0, 0, 130, 8, 1),      // Jalan Merdeka
    blockLoop(0, 60, 130, 8, -1),    // south cross street
    blockLoop(-40, -30, 40, 24, 1),  // downtown west block
    blockLoop(-40, 30, 40, 24, -1),  // downtown south-west block
  ];
  const cars = [];
  for (let i = 0; i < count; i++) {
    const route = routes[i % routes.length];
    const mesh = buildCarMesh(TRAFFIC_COLORS[i % TRAFFIC_COLORS.length], TRAFFIC_KINDS[i % TRAFFIC_KINDS.length]);
    const wp = Math.floor((i / routes.length) * route.length) % route.length;
    const start = route[wp].clone();
    start.x += (i % 3 - 1) * 2.2;
    mesh.position.copy(start);
    scene.add(mesh);
    cars.push({
      mesh, route, wp, kind: 'traffic',
      speed: 7 + (i % 4), maxSpeed: 9 + (i % 5),
      heading: 0, name: `CAR-${100 + i}`,
      cruise: 0,
    });
  }
  return cars;
}

// Steer each traffic car toward its next waypoint; slow down for the car ahead.
export function updateTraffic(dt, traffic, playerPos) {
  for (const car of traffic) {
    const target = car.route[(car.wp + 1) % car.route.length];
    const dx = target.x - car.mesh.position.x;
    const dz = target.z - car.mesh.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { car.wp = (car.wp + 1) % car.route.length; continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += THREE.MathUtils.clamp(diff, -1.6 * dt, 1.6 * dt);
    // brake if another car or the player is close ahead
    let ahead = 30;
    for (const other of traffic) {
      if (other === car) continue;
      const ox = other.mesh.position.x - car.mesh.position.x;
      const oz = other.mesh.position.z - car.mesh.position.z;
      const d = Math.hypot(ox, oz);
      if (d < 9) {
        const fwd = ox * Math.sin(car.heading) + oz * Math.cos(car.heading);
        if (fwd > 0) ahead = Math.min(ahead, d);
      }
    }
    if (playerPos) {
      const px = playerPos.x - car.mesh.position.x;
      const pz = playerPos.z - car.mesh.position.z;
      const d = Math.hypot(px, pz);
      if (d < 9) {
        const fwd = px * Math.sin(car.heading) + pz * Math.cos(car.heading);
        if (fwd > 0) ahead = Math.min(ahead, d);
      }
    }
    const wantSpeed = ahead < 8 ? 0 : car.maxSpeed;
    car.speed += THREE.MathUtils.clamp(wantSpeed - car.speed, -14 * dt, 6 * dt);
    car.mesh.position.x += Math.sin(car.heading) * car.speed * dt;
    car.mesh.position.z += Math.cos(car.heading) * car.speed * dt;
    car.mesh.rotation.y = car.heading;
  }
}

// Place a parked car the player can steal (E). Returns the car record.
export function spawnParkedCar(scene, x, z, heading, color, kind, name) {
  const mesh = buildCarMesh(color, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, kind: 'parked', speed: 0, maxSpeed: 0, heading, name, parked: true };
}
