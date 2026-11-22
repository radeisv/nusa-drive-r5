// world.js — builds the whole island city of Kota Nusa: ground, sea, beach,
// roads, shopfront buildings, curved-frond palms, bridge, airport, harbour
// and street props. Returns colliders and named landmarks for the other systems.
import * as THREE from 'three';

export function makeCanvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Golden-hour sky dome: a vertical gradient painted on a big sphere, so the
// sunset reads from every camera angle, not just as a flat screen backdrop.
// Canvas top (y=0) is the zenith; the horizon sits at the middle of the
// canvas (v=0.5), so the whole top half is sky: deep violet overhead,
// magenta, then orange-red and gold at the horizon.
function skyDomeTexture() {
  return makeCanvasTexture(16, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.00, '#20144a'); // zenith: deep violet
    grad.addColorStop(0.14, '#542a68'); // violet
    grad.addColorStop(0.26, '#93395f'); // magenta
    grad.addColorStop(0.36, '#d95a3d'); // orange-red
    grad.addColorStop(0.44, '#ff8c42'); // orange
    grad.addColorStop(0.50, '#ffc27a'); // gold at the horizon
    grad.addColorStop(0.58, '#b06a5e'); // dusk haze below the horizon
    grad.addColorStop(1.00, '#241a30'); // below the horizon: dark
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

// Soft radial glow for the low sun: bright warm core fading to transparent.
function sunGlowTexture() {
  return makeCanvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grad.addColorStop(0.0, 'rgba(255,244,200,0.95)');
    grad.addColorStop(0.25, 'rgba(255,190,110,0.55)');
    grad.addColorStop(0.6, 'rgba(255,120,70,0.22)');
    grad.addColorStop(1.0, 'rgba(255,120,70,0)');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
}

// Ribbed shipping-container face: vertical corrugation, corner posts and a
// stencilled line name — never a flat coloured box.
function containerTexture(hex) {
  return makeCanvasTexture(128, 64, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 10) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, 0, 3, h); }
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(0, 0, w, 4); g.fillRect(0, h - 4, w, 4);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
    g.fillText('NUSA LINES', w / 2, h / 2 + 5);
  });
}

// Concrete dock apron: worn grey with painted container slots and a yellow
// quay edge line.
function dockTexture() {
  return makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#8a8578'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    g.fillStyle = 'rgba(255,255,255,0.14)';
    for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 2);
    g.fillStyle = '#ffd23e'; g.fillRect(0, 6, w, 5);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (let x = 20; x < w; x += 52) g.fillRect(x, 40, 4, 26);
  });
}

function buildingTexture(base, floors, shop, accent) {
  return makeCanvasTexture(256, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // subtle vertical shading panels
    for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(x, 0, 2, h); }
    // windows, floors 1..floors
    for (let f = 1; f <= floors; f++) {
      const y = 30 + f * 62;
      for (let x = 18; x < w - 30; x += 52) {
        g.fillStyle = '#20242e'; g.fillRect(x, y, 34, 44);
        g.fillStyle = (x + f) % 3 === 0 ? '#ffd97a' : '#9fd0ff';
        g.fillRect(x + 3, y + 3, 28, 38);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + 3, y + 3, 28, 8);
      }
    }
    // ground-floor shopfront
    g.fillStyle = '#1b1e26'; g.fillRect(0, h - 128, w, 128);
    g.fillStyle = accent; g.fillRect(0, h - 132, w, 8);
    g.fillStyle = '#ffe9b0'; g.fillRect(14, h - 112, 100, 62);
    g.fillStyle = '#7de3ff'; g.fillRect(128, h - 112, 114, 62);
    g.fillStyle = '#1b1e26'; g.font = 'bold 26px Arial'; g.textAlign = 'center';
    g.fillText('★', 64, h - 66); g.fillText('OPEN', 185, h - 66);
    // sign board with the shop name
    g.fillStyle = '#f5f0dc'; g.fillRect(0, h - 168, w, 36);
    g.fillStyle = '#14161d'; g.font = 'bold 21px Arial';
    g.fillText(shop, w / 2, h - 142);
    // striped awning
    for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? accent : '#f5f0dc'; g.fillRect(x, h - 96, 32, 14); }
  });
}

function roofTexture(color) {
  return makeCanvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(8, 8, w - 16, 20);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(20, 44, 34, 26); g.fillRect(74, 60, 30, 30);
    g.fillStyle = '#c8ccd4'; g.fillRect(88, 20, 18, 18);
  });
}

// A palm with a leaning trunk and curved drooping fronds — never green spikes.
export function buildPalm(height = 7) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6b4a });
  let y = 0, x = 0, lean = 0.05;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.02, 0.22 - i * 0.02, height / 4, 7), trunkMat);
    seg.position.set(x, y + height / 8, 0);
    seg.rotation.z = -lean * i;
    palm.add(seg);
    y += height / 4 - 0.05; x += lean * height / 4 * i * 0.4;
  }
  const topX = x, topY = y;
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2fae5f, side: THREE.DoubleSide });
  const frondMat2 = new THREE.MeshLambertMaterial({ color: 0x3ecf72, side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2;
    // curved frond: a tapered plane bent downward along its length
    const geo = new THREE.PlaneGeometry(0.55, 3.4, 1, 6);
    const pos = geo.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const ly = pos.getY(v);
      const t = (ly + 1.7) / 3.4; // 0 at tip, 1 at base
      pos.setX(v, pos.getX(v) * (0.25 + 0.75 * t));
      pos.setZ(v, -Math.pow(1 - t, 2) * 1.5);
    }
    geo.computeVertexNormals();
    const frond = new THREE.Mesh(geo, i % 2 ? frondMat : frondMat2);
    frond.position.set(topX, topY + 0.1, 0);
    frond.rotation.set(Math.PI / 2 - 0.55, 0, ang, 'YXZ');
    frond.rotation.y = ang;
    frond.rotation.x = -0.5;
    palm.add(frond);
  }
  const nutMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), nutMat);
    nut.position.set(topX + Math.cos(i * 2.1) * 0.3, topY - 0.15, Math.sin(i * 2.1) * 0.3);
    palm.add(nut);
  }
  return palm;
}

const SHOPS = [
  ['WARUNG KOPI', '#e2603c', '#c96a3a'], ['TOKO BUAH SEGAR', '#3cae5f', '#e8b23c'],
  ['BENGKEL JAYA', '#4a6fa5', '#5a6b7a'], ['PASAR NUSA', '#c94a6b', '#e2603c'],
  ['HOTEL MERDEKA', '#7a5fc0', '#8a6b4a'], ['KAFE SENJA', '#3cae9d', '#c96a3a'],
  ['APOTEK SEHAT', '#4aa8ff', '#3cae5f'], ['BANK NUSA', '#5a6b7a', '#e8b23c'],
  ['TOKO ROKOK', '#c94a6b', '#5a6b7a'], ['RESTO LAUT', '#3cae9d', '#4aa8ff'],
  ['SALON CANTIK', '#e260a0', '#7a5fc0'], ['BAKSO 88', '#e8b23c', '#c94a6b'],
];

export function buildCity(scene) {
  const colliders = [];
  const landmarks = {};
  const addCollider = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // --- sky, sun, fog, lights: low golden-hour sun over the coast.
  // The dome carries the sunset gradient; a solid violet is only the fallback
  // behind it. The sun sits low in the north so it reads in the cover and in
  // the harbour/airport frames, which all look north.
  scene.background = new THREE.Color(0x2a1a4a);
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(430, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyDomeTexture(), side: THREE.BackSide, fog: false }));
  scene.add(skyDome);
  scene.fog = new THREE.Fog(0xe88a5a, 160, 480);
  const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
  sun.position.set(-60, 42, -380);
  scene.add(sun);
  // warm bounce from the south-east so the facades the camera sees (which
  // face away from the low northern sun) stay readable, not black
  const bounce = new THREE.DirectionalLight(0xff9a6b, 0.9);
  bounce.position.set(140, 70, 220);
  scene.add(bounce);
  scene.add(new THREE.HemisphereLight(0xff9a7a, 0x6b4a3a, 1.7));
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
  sunDisc.position.set(-60, 38, -380); sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(new THREE.PlaneGeometry(150, 150),
    new THREE.MeshBasicMaterial({ map: sunGlowTexture(), transparent: true, depthWrite: false, fog: false }));
  sunGlow.position.set(-60, 38, -378); sunGlow.lookAt(0, 20, 0);
  scene.add(sunGlow);

  // --- ground: warm dusk grass, sand beach, deep dusk-blue sea
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(420, 420),
    new THREE.MeshLambertMaterial({ color: 0x55803c }));
  grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true;
  scene.add(grass);
  const sandTex = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#e8d29a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(180,150,90,0.5)';
    for (let i = 0; i < 400; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  });
  sandTex.wrapS = sandTex.wrapT = THREE.RepeatWrapping; sandTex.repeat.set(6, 12);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(46, 420), new THREE.MeshLambertMaterial({ map: sandTex }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(118, 0.05, 0);
  scene.add(sand);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 460),
    new THREE.MeshLambertMaterial({ color: 0x39568c }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(285, -0.4, 0);
  scene.add(sea);
  // gentle surf line
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(4, 420),
    new THREE.MeshLambertMaterial({ color: 0xdff2ff }));
  surf.rotation.x = -Math.PI / 2; surf.position.set(141, 0.08, 0);
  scene.add(surf);

  // --- roads: coastal boulevard (x=40, north-south) + cross streets + airport road
  const roadTex = makeCanvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#33363e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23e'; g.fillRect(w / 2 - 3, 0, 6, h);
    g.fillStyle = '#e8e8e8';
    for (let y = 0; y < h; y += 64) { g.fillRect(20, y, 5, 34); g.fillRect(w - 25, y, 5, 34); }
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 60; i++) g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  function road(x, z, w, len, alongZ) {
    const tex = roadTex.clone(); tex.needsUpdate = true;
    let geo;
    if (alongZ) {
      tex.repeat.set(1, len / 30);
      geo = new THREE.PlaneGeometry(w, len);
    } else {
      tex.repeat.set(len / 30, 1);
      geo = new THREE.PlaneGeometry(len, w);
    }
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.1, z);
    scene.add(m);
  }
  road(40, 0, 16, 420, true);            // Pantai Boulevard (coastal)
  road(0, -60, 16, 300, false);          // cross street north
  road(0, 0, 16, 300, false);            // cross street middle (Jalan Merdeka)
  road(0, 60, 16, 300, false);           // cross street south
  road(-70, 0, 12, 120, false);           // airport link road
  road(-130, 0, 14, 130, true);           // airport runway road
  // sidewalks along the boulevard
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb9b3a4 });
  for (const sx of [30.5, 49.5]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(3, 420), walkMat);
    walk.rotation.x = -Math.PI / 2; walk.position.set(sx, 0.12, 0);
    scene.add(walk);
  }

  // --- buildings: blocks on both sides of the cross streets, shopfronts facing roads
  const buildingDefs = [];
  let shopIdx = 0;
  for (const bz of [-95, -30, 30, 95]) {
    for (const bx of [-95, -55, 75, 100]) {
      if (Math.abs(bx - 40) < 24) continue;
      const w = 16 + ((shopIdx * 7) % 8), d = 14 + ((shopIdx * 5) % 6), hgt = 14 + ((shopIdx * 11) % 26);
      const shop = SHOPS[shopIdx % SHOPS.length];
      buildingDefs.push({ x: bx, z: bz, w, d, h: hgt, shop: shop[0], accent: shop[1], base: shop[2] });
      shopIdx++;
    }
  }
  // downtown towers near the middle cross street
  buildingDefs.push({ x: -30, z: -18, w: 22, d: 18, h: 52, shop: 'HOTEL MERDEKA', accent: '#7a5fc0', base: '#5a6b7a' });
  buildingDefs.push({ x: 78, z: -18, w: 20, d: 18, h: 44, shop: 'BANK NUSA', accent: '#5a6b7a', base: '#4a6fa5' });
  buildingDefs.push({ x: -30, z: 18, w: 20, d: 18, h: 38, shop: 'PASAR NUSA', accent: '#c94a6b', base: '#c96a3a' });
  for (const b of buildingDefs) {
    const floors = Math.max(2, Math.round(b.h / 9));
    const tex = buildingTexture(b.base, floors, b.shop, b.accent);
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    // BoxGeometry material groups run [+x, -x, +y, -y, +z, -z]: the four
    // walls get the shopfront texture, the TOP gets the roof, the BOTTOM is
    // dark. (The old order put the roof on the +z wall and a flat dark slab
    // on the -z wall, which read as giant black/beige walls from the street.)
    const mats = [
      new THREE.MeshLambertMaterial({ map: tex }),
      new THREE.MeshLambertMaterial({ map: tex }),
      new THREE.MeshLambertMaterial({ map: roofTexture(b.accent) }),
      new THREE.MeshLambertMaterial({ color: 0x2a2d36 }),
      new THREE.MeshLambertMaterial({ map: tex }),
      new THREE.MeshLambertMaterial({ map: tex }),
    ];
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(b.x, b.h / 2, b.z);
    scene.add(mesh);
    // roof parapet + AC boxes so roofs are not flat slabs
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.9, 1.2, b.d * 0.9),
      new THREE.MeshLambertMaterial({ color: 0x3a3d46 }));
    roof.position.set(b.x, b.h + 0.6, b.z);
    scene.add(roof);
    addCollider(b.x, b.z, b.w, b.d);
  }

  // --- palms: rows along the beach and the boulevard (curved fronds)
  const palmSpots = [];
  for (let z = -180; z <= 180; z += 26) palmSpots.push([96, z]);
  for (let z = -170; z <= 170; z += 34) palmSpots.push([56, z]);
  for (let z = -160; z <= 160; z += 44) palmSpots.push([24, z]);
  for (const [px, pz] of palmSpots) {
    const palm = buildPalm(6 + ((Math.abs(px * 7 + pz * 3) % 40) / 10));
    palm.position.set(px, 0, pz);
    palm.rotation.y = (px + pz) % 6;
    scene.add(palm);
  }
  // beach umbrellas + loungers
  const umbCols = [0xff5d5d, 0x4aa8ff, 0xffd23e, 0x3cae5f];
  for (let i = 0; i < 10; i++) {
    const z = -160 + i * 36;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    pole.position.set(108, 1.2, z); scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.0, 8),
      new THREE.MeshLambertMaterial({ color: umbCols[i % 4] }));
    top.position.set(108, 2.8, z); scene.add(top);
  }

  // --- bridge to the airport island (west) + runway + tower + plane
  const bridge = new THREE.Mesh(new THREE.PlaneGeometry(120, 12),
    new THREE.MeshLambertMaterial({ color: 0x55585f }));
  bridge.rotation.x = -Math.PI / 2; bridge.position.set(-100, 0.15, 0);
  scene.add(bridge);
  const railMat = new THREE.MeshLambertMaterial({ color: 0xffd23e });
  for (const rz of [-6, 6]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(120, 0.8, 0.4), railMat);
    rail.position.set(-100, 0.6, rz); scene.add(rail);
  }
  const runwayTex = makeCanvasTexture(128, 512, (g, w, h) => {
    g.fillStyle = '#2e3138'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    for (let y = 20; y < h; y += 64) g.fillRect(w / 2 - 3, y, 6, 34);
    g.fillStyle = '#ffd23e'; g.fillRect(6, 0, 4, h); g.fillRect(w - 10, 0, 4, h);
  });
  const runway = new THREE.Mesh(new THREE.PlaneGeometry(24, 130),
    new THREE.MeshLambertMaterial({ map: runwayTex }));
  runway.rotation.x = -Math.PI / 2; runway.position.set(-150, 0.12, 0);
  scene.add(runway);
  // runway edge lights: small warm posts so the strip reads at dusk
  const edgeLightMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffc23e, emissiveIntensity: 1.4 });
  const edgePostMat = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  for (let z = -60; z <= 60; z += 15) {
    for (const ex of [-162, -138]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 6), edgePostMat);
      post.position.set(ex, 0.35, z); scene.add(post);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), edgeLightMat);
      bulb.position.set(ex, 0.75, z); scene.add(bulb);
    }
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 22, 10),
    new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }));
  tower.position.set(-150, 11, -42); scene.add(tower);
  const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(5, 4, 5, 10),
    new THREE.MeshLambertMaterial({ color: 0x7fb2e8 }));
  towerTop.position.set(-150, 24, -42); scene.add(towerTop);
  addCollider(-150, -42, 8, 8);
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(26, 8, 12),
    new THREE.MeshLambertMaterial({ map: buildingTexture('#8a97a8', 1, 'BANDARA NUSA', '#2f6fd0') }));
  terminal.position.set(-150, 4, 42); scene.add(terminal);
  addCollider(-150, 42, 26, 12);

  // --- harbour + pier (north end of the boulevard): a real working dock.
  // Concrete apron, harbour basin with a moored boat, a gantry crane over the
  // pier, and ribbed containers stacked in two rows. The centre lane
  // (x 56..84) and the pier lane (x 70..80, north to the pier) stay open so
  // cars can still drive the mission-1 route up the pier.
  const dockTex = dockTexture();
  dockTex.wrapS = dockTex.wrapT = THREE.RepeatWrapping; dockTex.repeat.set(3, 2);
  const dock = new THREE.Mesh(new THREE.PlaneGeometry(80, 65),
    new THREE.MeshLambertMaterial({ map: dockTex }));
  dock.rotation.x = -Math.PI / 2; dock.position.set(68, 0.13, -177);
  scene.add(dock);
  // harbour basin: open water north of the quay edge (z=-210)
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(150, 72),
    new THREE.MeshLambertMaterial({ color: 0x3a5a8c }));
  basin.rotation.x = -Math.PI / 2; basin.position.set(100, -0.3, -244);
  scene.add(basin);
  // wooden pier deck at the north edge of the apron
  const pierTex = makeCanvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#9a7b52'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h);
    g.fillStyle = '#ffd23e'; g.fillRect(0, 2, w, 4);
  });
  pierTex.wrapS = THREE.RepeatWrapping; pierTex.repeat.set(4, 1);
  const pier = new THREE.Mesh(new THREE.PlaneGeometry(60, 14),
    new THREE.MeshLambertMaterial({ map: pierTex }));
  pier.rotation.x = -Math.PI / 2; pier.position.set(70, 0.16, -185);
  scene.add(pier);
  // bollards along the pier's north edge
  const bollardMat = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  for (let bx = 44; bx <= 96; bx += 8) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8), bollardMat);
    b.position.set(bx, 0.45, -191.5);
    scene.add(b);
  }
  // gantry crane over the pier: two legs, a top beam, trolley + cable and a
  // container hanging over the pier lane. Kept to 15 m so the whole crane —
  // beam included — fits inside the mission frame.
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xe8b23c });
  const craneDark = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  for (const lx of [56, 92]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.6, 15, 1.6), craneMat);
    leg.position.set(lx, 7.5, -193);
    scene.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1, 3.4), craneDark);
    foot.position.set(lx, 0.5, -193);
    scene.add(foot);
    addCollider(lx, -193, 3.4, 3.4);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(42, 1.8, 2.2), craneMat);
  beam.position.set(74, 15.5, -193);
  scene.add(beam);
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), craneDark);
  trolley.position.set(72, 14, -193);
  scene.add(trolley);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 9, 6), craneDark);
  cable.position.set(72, 10, -193);
  scene.add(cable);
  const hangCont = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.6),
    new THREE.MeshLambertMaterial({ map: containerTexture('#c94a6b') }));
  hangCont.position.set(72, 4.2, -193);
  scene.add(hangCont);
  // moored boat in the basin, bow toward the pier
  const boat = new THREE.Group();
  const hullMat = new THREE.MeshLambertMaterial({ color: 0x2f6fd0 });
  const hull = new THREE.Mesh(new THREE.BoxGeometry(16, 2.2, 5), hullMat);
  hull.position.y = 0.6; boat.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4, 4), hullMat);
  bow.rotation.z = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 2);
  bow.position.set(10, 0.6, 0); boat.add(bow);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 3.6),
    new THREE.MeshLambertMaterial({ color: 0xf5f0dc }));
  cabin.position.set(-1, 2.9, 0); boat.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 7, 6), craneDark);
  mast.position.set(3, 6, 0); boat.add(mast);
  const boatLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0xffb300, emissiveIntensity: 1.2 }));
  boatLight.position.set(3, 9.6, 0); boat.add(boatLight);
  // moored in open water east of the crane, clear of the hanging container
  boat.position.set(88, -0.3, -212);
  boat.rotation.y = 0.12;
  scene.add(boat);
  // warehouse shed on the west end of the dock
  const shed = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 9),
    new THREE.MeshLambertMaterial({ map: buildingTexture('#7a6a5a', 1, 'GUDANG NUSA', '#e8b23c') }));
  shed.position.set(36, 3, -196);
  scene.add(shed);
  addCollider(36, -196, 13, 9);
  // containers in two rows, some stacked two-high, clear of the centre lane
  const contCols = ['#c94a6b', '#3cae5f', '#4aa8ff', '#e8b23c'];
  const contSpots = [
    [40, -176, 0], [40, -176, 1], [48, -184, 0], [38, -184, 0],
    [90, -176, 0], [98, -176, 0], [98, -176, 1], [92, -184, 0],
  ];
  contSpots.forEach(([cx, cz, level], i) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 2.6),
      new THREE.MeshLambertMaterial({ map: containerTexture(contCols[i % 4]) }));
    c.position.set(cx, 1.3 + level * 2.7, cz);
    c.rotation.y = (i % 3) * 0.04;
    scene.add(c);
    if (level === 0) addCollider(cx, cz, 6, 3);
  });
  landmarks.pier = new THREE.Vector3(70, 0, -185);
  landmarks.harbour = new THREE.Vector3(60, 0, -168);
  landmarks.airport = new THREE.Vector3(-150, 0, 0);
  landmarks.beach = new THREE.Vector3(108, 0, 0);
  landmarks.downtown = new THREE.Vector3(0, 0, 0);
  landmarks.boulevard = new THREE.Vector3(40, 0, 0);

  // --- street lamps along the boulevard
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  const lampGlow = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd23e, emissiveIntensity: 0.9 });
  for (let z = -180; z <= 180; z += 40) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6, 6), lampMat);
    pole.position.set(31, 3, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlow);
    head.position.set(31, 6.2, z); scene.add(head);
  }

  return { colliders, landmarks };
}

// Keep a point out of building colliders (simple AABB push-out).
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    if (pos.x > c.minX - radius && pos.x < c.maxX + radius && pos.z > c.minZ - radius && pos.z < c.maxZ + radius) {
      const dxl = pos.x - (c.minX - radius), dxr = (c.maxX + radius) - pos.x;
      const dzl = pos.z - (c.minZ - radius), dzr = (c.maxZ + radius) - pos.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) pos.x = c.minX - radius;
      else if (m === dxr) pos.x = c.maxX + radius;
      else if (m === dzl) pos.z = c.minZ - radius;
      else pos.z = c.maxZ + radius;
    }
  }
}
