// main.js — Nusa Drive boot and game loop: menu, driving and walking, car
// stealing, wanted heat, missions, combat, crew help, save/load, and the
// ?shot= staging that poses the four screenshots.
import * as THREE from 'three';
import { buildCity, resolveCollisions } from './world.js';
import { buildCarMesh, buildPersonMesh, buildPlaneMesh } from './vehicles.js';
import { spawnTraffic, updateTraffic, spawnParkedCar } from './traffic.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { raiseWanted, updatePolice, ensurePolice } from './police.js';
import { defineMissions, startMission, updateMission, currentStage, buildBeacon } from './missions.js';
import { spawnGuards, fireWeapon, updateCombat } from './combat.js';
import { updateHud } from './hud.js';
import { initAudio } from './audio.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { bindInput, axis } from './input.js';
import { createRenderer, createCamera, updateCamera } from './render.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');

const state = {
  mode: 'menu', time: 0, frozen: false,
  playerPos: new THREE.Vector3(40, 0, 40),
  playerHeading: Math.PI, playerMesh: null,
  inCar: false, currentCar: null, carSpeed: 0, walkSpeed: 0, carName: 'KOMODO GT · SPORTS',
  vehicleCondition: 100,
  cash: 12480, respect: 3900, playerHealth: 72, playerArmour: 55,
  wanted: 0, heat: 100,
  weapon: 1, ammo: { '2': 60, '3': 120, '4': 18 }, lastShot: 0, muzzleFlash: 0,
  missionDefs: defineMissions(), mission: null, completedMissions: [],
  traffic: [], parkedCars: [], peds: [], police: [], heli: null, guards: [],
  tracers: [], nearCar: null,
  location: 'PANTAI BOULEVARD', locationSub: 'Kota Nusa · Coastal District',
  dialogueName: '', dialogueText: '', dialogueFace: '', dialogueUntil: 0,
  audio: null, mouseDown: false, saveTimer: 0,
  camOverride: null,
};
state.camera = null;
state.scene = null;

state.toast = (msg, ms = 1800) => {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(state._toastTimer);
  state._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
};
state.dialogue = (name, text, face) => {
  state.dialogueName = name; state.dialogueText = text; state.dialogueFace = face || name[0];
  state.dialogueUntil = state.time + 7;
};
state.spawnMissionGuards = (count, center) => {
  const g = spawnGuards(state.scene, count, center);
  state.guards.push(...g);
};
state.shoot = () => fireWeapon(state);
state.pauseGame = () => {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  saveGame(state);
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('btn-start').textContent = 'RESUME';
};
state.cycleMission = () => {
  const nextId = ((state.completedMissions.length) % 4) + 1;
  startMission(state, nextId);
};
state.crewSwapPlates = () => {
  if (state.wanted > 0) {
    state.wanted--; state.heat = 100;
    state.toast('SWAP PLATES — HEAT DOWN TO ' + state.wanted + ' STARS', 1800);
    if (state.audio) state.audio.playChime();
  } else state.toast('NO HEAT TO LOSE — PLATES ALREADY CLEAN', 1400);
};
state.crewQuickFix = () => {
  state.vehicleCondition = 100;
  state.toast('QUICK FIX — CAR RESTORED TO 100%', 1600);
  if (state.audio) state.audio.playChime();
};
state.crewEyesOut = () => {
  const near = state.police.map((u) => u.distance ?? 999).sort((a, b) => a - b)[0];
  state.toast(near === undefined || near === 999 ? 'KIKI: ALL CLEAR — NO UNITS NEARBY' : 'KIKI: NEAREST UNIT ' + near + ' m — STAY OFF THE MAIN ROAD', 2000);
};
state.tryEnterCar = () => {
  if (state.inCar) {
    // get out: step to the side of the car
    const side = new THREE.Vector3(Math.cos(state.playerHeading), 0, -Math.sin(state.playerHeading));
    state.playerPos.copy(state.currentCar.mesh.position).add(side.multiplyScalar(2.4));
    state.playerMesh.position.copy(state.playerPos);
    state.playerMesh.visible = true;
    state.inCar = false;
    state.carSpeed = 0;
    return;
  }
  const near = state.nearCar;
  if (!near) return;
  state.currentCar = near;
  state.inCar = true;
  state.playerMesh.visible = false;
  state.carSpeed = 0;
  state.playerHeading = near.heading;
  state.playerPos.copy(near.mesh.position);
  state.carName = near.name;
  state.vehicleCondition = near.condition ?? 100;
  if (near.kind === 'traffic' && !near.stolen) {
    // stealing a stranger's car is a crime; getting back into a car you
    // already stole is not. The car stays enterable after you get out.
    near.stolen = true;
    state.traffic = state.traffic.filter((c) => c !== near);
    state.parkedCars.push(near);
    raiseWanted(state, 1);
    state.toast('CAR STOLEN — THE OWNER CALLED IT IN!', 1800);
    if (state.audio) state.audio.playSiren();
  } else {
    state.toast('IN THE ' + near.name, 1200);
  }
  if (state.audio) state.audio.startEngine();
};

// ---------- boot ----------
let renderer, camera, scene, clock, beacon, colliders, landmarks;
try {
  renderer = createRenderer(document.getElementById('game-canvas'));
  camera = createCamera();
  state.camera = camera;
  scene = new THREE.Scene();
  state.scene = scene;
  clock = new THREE.Clock();
  const built = buildCity(scene);
  colliders = built.colliders;
  landmarks = built.landmarks;
  state.colliders = colliders;

  // player on foot
  state.playerMesh = buildPersonMesh(0xff7a3c, 0xc98a5e, 0x2f6fd0);
  state.playerMesh.position.copy(state.playerPos);
  scene.add(state.playerMesh);

  // the player's orange Komodo GT + a few stealable parked cars
  const komodo = spawnParkedCar(scene, 40, 52, Math.PI, 0xff6a1f, 'sport', 'KOMODO GT · SPORTS');
  komodo.condition = 100;
  state.parkedCars.push(komodo);
  state.parkedCars.push(spawnParkedCar(scene, -24, 8, Math.PI / 2, 0xd23c2e, 'sedan', 'ELANG COUPE · SEDAN'));
  state.parkedCars.push(spawnParkedCar(scene, 52, -52, Math.PI, 0xe8b23c, 'taxi', 'TAKSI NUSA · TAXI'));
  state.parkedCars.push(spawnParkedCar(scene, -148, 26, 0, 0x3c6fd0, 'van', 'KARGO VAN · VAN'));

  // airliner parked on the runway, nose north, fully in the combat frame
  const plane = buildPlaneMesh();
  plane.position.set(-152, 0, -10);
  plane.rotation.y = Math.PI;
  scene.add(plane);

  // extra crates + barriers so the harbour and airport are never empty.
  // Cargo colours vary; crates stay small and OUT of every camera sightline
  // (the airport cluster used to sit between the combat camera and the
  // player, reading as giant brown cubes in the foreground).
  const crateCols = [0x9a7b52, 0x7a8a99, 0x8a6b4a, 0x6b7a5a, 0xa85a3c];
  function propCluster(cx, cz, n) {
    for (let i = 0; i < n; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3),
        new THREE.MeshLambertMaterial({ color: crateCols[i % crateCols.length] }));
      crate.position.set(cx + (i % 3) * 2.0 - 2.0, 0.65, cz + Math.floor(i / 3) * 2.0);
      crate.rotation.y = i * 0.4;
      scene.add(crate);
    }
    const barrierMat = new THREE.MeshLambertMaterial({ color: 0xffd23e });
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.25), barrierMat);
      bar.position.set(cx - 6 + i * 5, 0.45, cz + 7);
      scene.add(bar);
    }
  }
  propCluster(48, -148, 6);
  propCluster(-168, 32, 5);

  state.traffic = spawnTraffic(scene, 14);
  state.peds = spawnPedestrians(scene, 16);
  beacon = buildBeacon(scene);
  state.beacon = beacon;
  state.audio = initAudio();
  bindInput(state);

  // menu buttons
  document.getElementById('btn-start').addEventListener('click', () => startPlaying(false));
  document.getElementById('btn-continue').addEventListener('click', () => startPlaying(true));
  if (!hasSave()) document.getElementById('btn-continue').style.display = 'none';
} catch (err) {
  document.getElementById('loading').textContent = 'COULD NOT START WEBGL — ' + err.message;
  throw err;
}

function startPlaying(fromSave) {
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.add('on');
  state.mode = 'playing';
  if (state.audio) { state.audio.ensure(); state.audio.startMusic(); state.audio.startEngine(); }
  if (fromSave) {
    const s = loadGame();
    if (s) {
      state.cash = s.cash; state.respect = s.respect;
      state.playerHealth = s.playerHealth; state.playerArmour = s.playerArmour;
      state.completedMissions = s.completedMissions || [];
      state.playerPos.set(s.playerPos.x, 0, s.playerPos.z);
      state.playerMesh.position.copy(state.playerPos);
      state.toast('SAVE LOADED — WELCOME BACK, RAKA', 2000);
    }
  }
  if (!state.mission) {
    const nextId = (state.completedMissions.length % 4) + 1;
    startMission(state, nextId);
  }
  saveGame(state);
}

// ---------- location naming ----------
function updateLocation() {
  const { x, z } = state.playerPos;
  if (x < -110) { state.location = 'BANDARA NUSA'; state.locationSub = 'Airport Island · Runway 09'; }
  else if (x > 95) { state.location = 'PANTAI NUSA'; state.locationSub = 'Kota Nusa · Beachfront'; }
  else if (z < -150) { state.location = 'PELABUHAN NUSA'; state.locationSub = 'Kota Nusa · Harbour & Pier'; }
  else if (Math.abs(x) < 70 && Math.abs(z) < 80) { state.location = 'DOWNTOWN NUSA'; state.locationSub = 'Kota Nusa · City Centre'; }
  else { state.location = 'PANTAI BOULEVARD'; state.locationSub = 'Kota Nusa · Coastal District'; }
}

// ---------- driving & walking ----------
function updatePlayer(dt) {
  const keys = state.keys;
  if (state.inCar) {
    const car = state.currentCar;
    const accel = axis(keys, 'KeyS', 'KeyW');
    const steer = axis(keys, 'KeyA', 'KeyD');
    const brake = keys['Space'] ? 1 : 0;
    const top = 32, reverseTop = 10;
    if (accel > 0) state.carSpeed += 14 * dt;
    else if (accel < 0) state.carSpeed -= (state.carSpeed > 0.5 ? 22 : 9) * dt;
    else state.carSpeed -= Math.sign(state.carSpeed) * 4 * dt;
    if (brake) state.carSpeed -= Math.sign(state.carSpeed) * 26 * dt;
    state.carSpeed = THREE.MathUtils.clamp(state.carSpeed, -reverseTop, top);
    if (Math.abs(state.carSpeed) < 0.05 && accel === 0) state.carSpeed = 0;
    const turn = steer * 1.85 * dt * Math.min(1, Math.abs(state.carSpeed) / 6) * Math.sign(state.carSpeed || 1);
    state.playerHeading -= turn;
    car.heading = state.playerHeading;
    car.mesh.position.x += Math.sin(state.playerHeading) * state.carSpeed * dt;
    car.mesh.position.z += Math.cos(state.playerHeading) * state.carSpeed * dt;
    car.mesh.rotation.y = state.playerHeading;
    const before = car.mesh.position.clone();
    resolveCollisions(car.mesh.position, 1.7, colliders);
    if (!car.mesh.position.equals(before)) state.carSpeed *= 0.55;
    // bump traffic cars
    for (const t of state.traffic) {
      const d = Math.hypot(t.mesh.position.x - car.mesh.position.x, t.mesh.position.z - car.mesh.position.z);
      if (d < 3.4) { state.carSpeed *= 0.7; t.speed = Math.max(0, t.speed - 3); }
    }
    // hitting a pedestrian is a crime
    for (const ped of state.peds) {
      if (ped.hit) continue;
      const d = Math.hypot(ped.mesh.position.x - car.mesh.position.x, ped.mesh.position.z - car.mesh.position.z);
      if (d < 1.9 && Math.abs(state.carSpeed) > 4) {
        ped.hit = true;
        ped.mesh.position.x += (ped.mesh.position.x - car.mesh.position.x) * 2;
        ped.mesh.position.z += (ped.mesh.position.z - car.mesh.position.z) * 2;
        raiseWanted(state, 1);
        state.toast('PEDESTRIAN DOWN — WANTED LEVEL UP', 1800);
        if (state.audio) state.audio.playThud();
      }
    }
    state.playerPos.copy(car.mesh.position);
    state.walkSpeed = 0;
    if (state.audio) state.audio.setEngineSpeed(Math.abs(state.carSpeed) / 32);
  } else {
    const fwd = axis(keys, 'KeyS', 'KeyW');
    const turn = axis(keys, 'KeyA', 'KeyD');
    state.playerHeading -= turn * 2.4 * dt;
    const speed = fwd !== 0 ? 5.5 : 0;
    state.walkSpeed = speed;
    state.carSpeed = 0;
    if (speed) {
      state.playerPos.x += Math.sin(state.playerHeading) * speed * dt;
      state.playerPos.z += Math.cos(state.playerHeading) * speed * dt;
      resolveCollisions(state.playerPos, 0.7, colliders);
    }
    state.playerMesh.position.copy(state.playerPos);
    state.playerMesh.rotation.y = state.playerHeading;
    // walk-cycle
    const swing = Math.sin(state.time * 9) * (speed ? 0.55 : 0);
    const legL = state.playerMesh.getObjectByName('legL');
    const legR = state.playerMesh.getObjectByName('legR');
    if (legL) legL.rotation.x = swing;
    if (legR) legR.rotation.x = -swing;
    if (state.mouseDown) state.shoot();
  }
  // nearest stealable car
  state.nearCar = null;
  if (!state.inCar) {
    let best = 6;
    for (const c of [...state.parkedCars, ...state.traffic]) {
      const d = Math.hypot(c.mesh.position.x - state.playerPos.x, c.mesh.position.z - state.playerPos.z);
      if (d < best) { best = d; state.nearCar = c; }
    }
  }
}

// ---------- screenshot staging ----------
function stageShot(kind) {
  state.frozen = true;
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.add('on');
  state.mode = 'playing';
  const place = (car, x, z, heading, speed) => {
    car.mesh.position.set(x, 0, z);
    car.mesh.rotation.y = heading;
    car.heading = heading;
    car.speed = speed || 0;
  };
  if (kind === 'cover') {
    // low close chase cam behind the big orange Komodo GT on the boulevard,
    // camera on the beach side so the lamp row stays out of the frame
    state.camOverride = { dist: 7.2, height: 3.1, side: -3.0 };
    state.camSnap = true;
    const komodo = state.parkedCars[0];
    state.currentCar = komodo; state.inCar = true;
    state.playerMesh.visible = false;
    state.playerHeading = Math.PI;
    state.carSpeed = 31; // 112 km/h on the HUD
    state.carName = 'KOMODO GT · SPORTS';
    state.vehicleCondition = 62;
    place(komodo, 40, 30, Math.PI, 31);
    state.playerPos.copy(komodo.mesh.position);
    // three distinct police relationships, all ahead of the camera:
    // flanking alongside on the left, a leader ahead, one overtaking right
    state.wanted = 4; state.heat = 100;
    ensurePolice(state);
    place(state.police[0], 32.5, 16, Math.PI, 30); state.police[0].role = 'FLANKING';
    place(state.police[1], 40, -22, Math.PI, 28); state.police[1].role = 'PURSUIT';
    place(state.police[2], 48, -8, Math.PI, 30); state.police[2].role = 'RAMMING';
    if (state.police[3]) place(state.police[3], 20, -58, Math.PI / 2, 26);
    if (state.police[4]) place(state.police[4], 60, -58, -Math.PI / 2, 26);
    // ensurePolice already spawned Air One (wanted 4); just move it low and
    // ahead-LEFT of the camera, against open sky — the old spot put it
    // behind the BANK NUSA tower. Spotlight cone on the road.
    state.heli.mesh.position.set(34, 11, -14);
    state.heli.mesh.rotation.y = Math.PI * 0.75;
    // dense street: traffic ahead + fleeing pedestrians on both sidewalks
    place(state.traffic[0], 36, -48, Math.PI, 12);
    place(state.traffic[1], 44, -78, Math.PI, 14);
    place(state.traffic[2], 33, -108, Math.PI, 11);
    place(state.traffic[3], 33, -14, Math.PI, 12);
    place(state.traffic[4], 46, -62, Math.PI, 13);
    for (let i = 0; i < 6; i++) {
      const ped = state.peds[i];
      ped.mesh.position.set(i % 2 ? 30.2 : 49.8, 0, 8 + i * 7);
      ped.fleeing = true;
      ped.mesh.rotation.y = i % 2 ? Math.PI / 2 : -Math.PI / 2;
    }
    state.cash = 18450; state.respect = 3900;
    state.playerHealth = 72; state.playerArmour = 55;
    startMission(state, 3);
    state.mission.stage = 2; state.mission.timer = 149;
    state.dialogue('KIKI', 'Elang-1 is on your tail, Raka. Lose them before the pier!', 'K');
    state.location = 'PANTAI BOULEVARD';
  } else if (kind === 'city') {
    // Downtown on Jalan Merdeka, staged EAST of the two tall towers so the
    // camera is not sandwiched between their walls: the street now has depth
    // — facades with lit shopfronts on both sides, the boulevard crossing
    // ahead with palms, and traffic in both directions.
    state.camOverride = { dist: 9.5, height: 4.2, side: 1.5 };
    state.camSnap = true;
    const coupe = state.parkedCars[1];
    state.currentCar = coupe; state.inCar = true;
    state.playerMesh.visible = false;
    state.playerHeading = Math.PI / 2;
    state.carSpeed = 17.8; // 64 km/h
    state.carName = 'ELANG COUPE · SEDAN';
    state.vehicleCondition = 88;
    place(coupe, 10, 0, Math.PI / 2, 17.8);
    state.playerPos.copy(coupe.mesh.position);
    place(state.traffic[0], 34, 0, Math.PI / 2, 10);
    place(state.traffic[1], 58, 0, Math.PI / 2, 11);
    place(state.traffic[2], 40, -52, Math.PI, 9);
    place(state.traffic[3], 40, 52, 0, 9);
    place(state.traffic[4], 82, 0, Math.PI / 2, 9);
    place(state.traffic[5], 64, -60, Math.PI / 2, 9);
    place(state.traffic[6], 20, 60, -Math.PI / 2, 8);
    for (let i = 0; i < 5; i++) {
      const ped = state.peds[i];
      ped.mesh.position.set(-2 + i * 11, 0, 8.5);
      ped.mesh.rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 3; i++) {
      const ped = state.peds[5 + i];
      ped.mesh.position.set(8 + i * 12, 0, -8.5);
      ped.mesh.rotation.y = -Math.PI / 2;
    }
    state.wanted = 0;
    state.cash = 12480; state.respect = 3200;
    state.playerHealth = 84; state.playerArmour = 40;
    startMission(state, 1);
    state.mission.timer = 168;
    state.dialogue('SINTA', 'The city never sleeps, Raka. Meet me at the pier before dawn.', 'S');
    state.location = 'DOWNTOWN NUSA'; state.locationSub = 'Kota Nusa · City Centre';
  } else if (kind === 'mission') {
    // The heist happens ON the dock: the player stands on the concrete apron
    // between the container rows, the gantry crane, pier and moored boat
    // ahead, guards among the containers, cruisers on the pier itself.
    // Camera pulled back so the crane beam and the boat both fit the frame.
    state.camOverride = { dist: 10.5, height: 4.2, side: 2.0 };
    state.camSnap = true;
    state.playerPos.set(64, 0, -174);
    state.playerHeading = Math.PI;
    state.playerMesh.position.copy(state.playerPos);
    state.playerMesh.rotation.y = Math.PI;
    state.weapon = 2;
    // start the mission first: the heist itself raises the heat to 2 stars,
    // then place the responding cruisers (no helicopter below 3 stars)
    startMission(state, 4);
    state.mission.stage = 1; state.mission.timer = 233; state.mission.guardsDown = 0;
    ensurePolice(state);
    place(state.police[0], 48, -186, Math.PI * 0.75, 0); state.police[0].role = 'PURSUIT';
    place(state.police[1], 80, -188, Math.PI * 1.25, 0); state.police[1].role = 'FLANKING';
    if (state.police[2]) { place(state.police[2], 58, -196, Math.PI * 0.5, 0); state.police[2].role = 'ROADBLOCK'; }
    state.guards[0].mesh.position.set(56, 0, -168);
    state.guards[1].mesh.position.set(70, 0, -172);
    state.guards[2].mesh.position.set(54, 0, -180);
    state.guards[3].mesh.position.set(74, 0, -180);
    state.guards[4].mesh.position.set(62, 0, -186);
    for (let i = 0; i < 4; i++) {
      const ped = state.peds[i];
      ped.mesh.position.set([50, 72, 58, 78][i], 0, [-166, -166, -184, -184][i]);
      ped.fleeing = true;
    }
    state.cash = 24600; state.respect = 4100;
    state.playerHealth = 68; state.playerArmour = 62;
    state.mission.stage = 1; state.mission.timer = 233; state.mission.guardsDown = 0;
    state.dialogue('BAYU', 'Four guards between us and the vault. Take them down!', 'B');
    state.location = 'PELABUHAN NUSA'; state.locationSub = 'Kota Nusa · Harbour & Pier';
  } else if (kind === 'combat') {
    // Airport fight staged south of the runway road so the sightline is
    // clear: plane + tower ahead-left, runway ahead-right, Air One low and
    // fully in frame (never clipped at the top edge).
    state.camOverride = { dist: 8.5, height: 3.8, side: 2.2 };
    state.camSnap = true;
    state.playerPos.set(-140, 0, 20);
    state.playerHeading = Math.PI;
    state.playerMesh.position.copy(state.playerPos);
    state.playerMesh.rotation.y = Math.PI;
    state.weapon = 3;
    state.wanted = 3; state.heat = 100;
    ensurePolice(state);
    place(state.police[0], -128, 6, Math.PI, 0); state.police[0].role = 'PURSUIT';
    place(state.police[1], -132, -14, Math.PI * 0.8, 0); state.police[1].role = 'RAMMING';
    if (state.police[2]) { place(state.police[2], -120, 10, Math.PI * 1.1, 0); state.police[2].role = 'FLANKING'; }
    if (state.police[3]) { place(state.police[3], -124, -26, Math.PI, 0); state.police[3].role = 'ROADBLOCK'; }
    // ensurePolice already spawned Air One (wanted 3); just move it low and
    // fully into the frame, clear of the top edge.
    state.heli.mesh.position.set(-134, 9, -2);
    state.spawnMissionGuards(4, { x: -148, z: 4 });
    state.guards[0].mesh.position.set(-146, 0, 8);
    state.guards[1].mesh.position.set(-152, 0, 12);
    state.guards[2].mesh.position.set(-144, 0, 2);
    state.guards[3].mesh.position.set(-150, 0, 16);
    for (let i = 0; i < 3; i++) {
      const ped = state.peds[i];
      ped.mesh.position.set(-126 + i * 3, 0, [12, 18, 2][i]);
      ped.fleeing = true;
    }
    state.cash = 31320; state.respect = 4500;
    state.playerHealth = 76; state.playerArmour = 58;
    startMission(state, 2);
    state.mission.stage = 1; state.mission.timer = 201; state.mission.guardsDown = 0;
    state.dialogue('SINTA', 'The manifest is in the terminal. Air One is overhead — move!', 'S');
    state.location = 'BANDARA NUSA'; state.locationSub = 'Airport Island · Runway 09';
  }
  // beacon on the current objective; a fight stage marks the guard cluster
  const stage = currentStage(state);
  if (stage && stage.target) {
    beacon.visible = true;
    beacon.position.set(stage.target.x, 0, stage.target.z);
  } else if (stage && stage.kind === 'fight') {
    const alive = state.guards.filter((g) => g.alive);
    if (alive.length) {
      const cx = alive.reduce((s, g) => s + g.mesh.position.x, 0) / alive.length;
      const cz = alive.reduce((s, g) => s + g.mesh.position.z, 0) / alive.length;
      beacon.visible = true;
      beacon.position.set(cx, 0, cz);
    }
  }
}

// ---------- main loop ----------
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;
  if (state.mode === 'menu') {
    // attract orbit behind the translucent menu
    const a = state.time * 0.06;
    camera.position.set(40 + Math.cos(a) * 70, 26, Math.sin(a) * 70);
    camera.lookAt(40, 4, 0);
  } else if (state.frozen) {
    // posed screenshot: spin the rotor, flash beacons, pulse the beacon
    if (state.heli) {
      const rotor = state.heli.mesh.getObjectByName('rotor');
      if (rotor) rotor.rotation.y += dt * 22;
      const cone = state.heli.mesh.getObjectByName('spot-cone');
      if (cone) cone.material.opacity = 0.18 + Math.sin(state.time * 3) * 0.05;
    }
    for (const u of state.police) {
      const on = Math.floor(state.time * 6) % 2 === 0;
      const red = u.mesh.getObjectByName('beacon-red');
      const blue = u.mesh.getObjectByName('beacon-blue');
      if (red) red.material.emissiveIntensity = on ? 2.2 : 0.15;
      if (blue) blue.material.emissiveIntensity = on ? 0.15 : 2.2;
    }
    const diamond = beacon.getObjectByName('diamond');
    if (diamond && beacon.visible) { diamond.rotation.y += dt * 2; diamond.position.y = 3.2 + Math.sin(state.time * 3) * 0.25; }
    updateCameraPose();
  } else if (state.mode === 'playing') {
    updatePlayer(dt);
    updateTraffic(dt, state.traffic, state.playerPos);
    updatePedestrians(dt, state.peds, state.playerPos, state.wanted, state.time);
    updatePolice(dt, state);
    updateMission(dt, state);
    // save the moment a mission is completed, not only on the 8 s timer:
    // a mission that pays out right before a reload must survive it
    if ((state.completedMissions || []).length !== (state._savedMissionCount || 0)) {
      state._savedMissionCount = state.completedMissions.length;
      saveGame(state);
    }
    updateCombat(dt, state);
    updateLocation();
    const stage = currentStage(state);
    let beaconAt = null;
    if (stage && stage.target) beaconAt = stage.target;
    else if (stage && stage.kind === 'fight') {
      const alive = state.guards.filter((g) => g.alive);
      if (alive.length) beaconAt = {
        x: alive.reduce((s, g) => s + g.mesh.position.x, 0) / alive.length,
        z: alive.reduce((s, g) => s + g.mesh.position.z, 0) / alive.length,
      };
    }
    if (beaconAt) {
      beacon.visible = true;
      beacon.position.set(beaconAt.x, 0, beaconAt.z);
      const diamond = beacon.getObjectByName('diamond');
      if (diamond) { diamond.rotation.y += dt * 2; diamond.position.y = 3.2 + Math.sin(state.time * 3) * 0.25; }
    } else {
      beacon.visible = false;
    }
    updateCameraPose();
    state.saveTimer += dt;
    if (state.saveTimer > 8) { state.saveTimer = 0; saveGame(state); }
  } else if (state.mode === 'paused') {
    updateCameraPose();
  }
  if (state.mode !== 'menu') updateHud(state);
  renderer.render(scene, camera);
  if (!window.__ready) { window.__ready = true; document.getElementById('loading').classList.add('hidden'); }
}

function updateCameraPose() {
  if (state.camOverride) {
    const o = state.camOverride;
    const p = state.playerPos;
    const h = state.playerHeading;
    const sideX = Math.cos(h), sideZ = -Math.sin(h);
    const bx = p.x - Math.sin(h) * o.dist + sideX * o.side;
    const bz = p.z - Math.cos(h) * o.dist + sideZ * o.side;
    if (state.camSnap) {
      // posed screenshot: jump straight to the frame, never ease in from origin
      camera.position.set(bx, o.height, bz);
      state.camSnap = false;
    } else {
      const k = 1 - Math.pow(0.001, 0.016);
      camera.position.x += (bx - camera.position.x) * k;
      camera.position.y += (o.height - camera.position.y) * k;
      camera.position.z += (bz - camera.position.z) * k;
    }
    camera.lookAt(p.x + Math.sin(h) * 8, 1.4, p.z + Math.cos(h) * 8);
  } else {
    updateCamera(camera, state, 0.016);
  }
}

if (SHOT) stageShot(SHOT);
window.__game = state;
animate();
