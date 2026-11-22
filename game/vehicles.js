// vehicles.js — every vehicle mesh is built from primitives here: player
// sports cars, traffic cars, police cruisers, the police helicopter and the
// airport plane. Bright, readable silhouettes at 300px.
import * as THREE from 'three';

function wheel() {
  const w = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14),
    new THREE.MeshLambertMaterial({ color: 0x14161a }));
  tyre.rotation.z = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10),
    new THREE.MeshLambertMaterial({ color: 0xc8ccd4 }));
  hub.rotation.z = Math.PI / 2;
  w.add(tyre, hub);
  return w;
}

// kind: 'sport' | 'sedan' | 'taxi' | 'van' | 'police'
export function buildCarMesh(color, kind = 'sedan') {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x10151f });
  const isSport = kind === 'sport';
  const bodyLen = kind === 'van' ? 5.2 : 4.4;
  const bodyH = isSport ? 0.62 : 0.85;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, bodyH, bodyLen), bodyMat);
  body.position.y = 0.62;
  car.add(body);
  // cabin with dark glass
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.62, kind === 'van' ? 3.4 : 2.1), glassMat);
  cabin.position.set(0, bodyH + 0.55, kind === 'van' ? 0.2 : -0.2);
  car.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.1, kind === 'van' ? 3.4 : 2.0),
    new THREE.MeshLambertMaterial({ color }));
  roof.position.set(0, bodyH + 0.88, kind === 'van' ? 0.2 : -0.2);
  car.add(roof);
  // headlights + taillights
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffedb0, emissiveIntensity: 0.7 });
  for (const s of [-0.65, 0.65]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.08), lightMat);
    hl.position.set(s, 0.72, bodyLen / 2 + 0.01);
    car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08),
      new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0xaa0000, emissiveIntensity: 0.6 }));
    tl.position.set(s, 0.72, -bodyLen / 2 - 0.01);
    car.add(tl);
  }
  // wheels
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wh = wheel();
    wh.position.set(wx, 0.42, wz);
    car.add(wh);
  }
  if (isSport) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.45), bodyMat);
    spoiler.position.set(0, 1.04, -2.0);
    car.add(spoiler);
    for (const s of [-0.65, 0.65]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.08), bodyMat);
      strut.position.set(s, 0.92, -2.0);
      car.add(strut);
    }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, bodyLen - 0.4),
      new THREE.MeshLambertMaterial({ color: 0x14161d }));
    stripe.position.set(0, bodyH + 0.32, 0);
    car.add(stripe);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.4),
      new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0xcc9900, emissiveIntensity: 0.5 }));
    sign.position.set(0, bodyH + 1.0, -0.2);
    car.add(sign);
  }
  if (kind === 'police') {
    // blue side stripe + light bar with flashing red/blue beacons
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 3.6),
      new THREE.MeshLambertMaterial({ color: 0x1c4fd0 }));
    stripe.position.set(0, 0.75, 0);
    car.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, bodyH + 0.95, -0.2);
    car.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.26),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.4 }));
    red.position.set(-0.28, bodyH + 1.05, -0.2);
    red.name = 'beacon-red';
    car.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.26),
      new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x0044ff, emissiveIntensity: 1.4 }));
    blue.position.set(0.28, bodyH + 1.05, -0.2);
    blue.name = 'beacon-blue';
    car.add(blue);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    door.position.set(-1.01, 0.72, 0); door.rotation.y = -Math.PI / 2;
    car.add(door);
  }
  car.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return car;
}

// Big bright police helicopter, built to read as a helicopter at 300px:
// a long white-and-orange body with a glass cockpit, a slim tail boom with
// fin and tail rotor, a four-blade main rotor under a spinning blur disc,
// strut skids, and a searchlight cone that reaches the road.
export function buildHelicopterMesh() {
  const heli = new THREE.Group();
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xf2f4f6 });
  const orangeMat = new THREE.MeshLambertMaterial({ color: 0xff7a1f });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x18324e, emissive: 0x2a5a8a, emissiveIntensity: 0.55 });
  // body: a horizontal capsule — cylinder with rounded nose and tail caps
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.05, 3.4, 12), whiteMat);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0;
  heli.add(body);
  const noseCap = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), whiteMat);
  noseCap.scale.set(1, 1, 0.9);
  noseCap.position.set(0, 0, 1.7);
  heli.add(noseCap);
  const tailCap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 12, 10), whiteMat);
  tailCap.scale.set(1, 1, 0.8);
  tailCap.position.set(0, 0.05, -1.7);
  heli.add(tailCap);
  // orange belly stripe along the body
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.5, 3.2), orangeMat);
  stripe.position.set(0, -0.55, 0.1);
  heli.add(stripe);
  // cockpit glass: a bubble proud of the nose so it reads from every angle
  const windshield = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 10), glassMat);
  windshield.scale.set(0.95, 0.6, 0.55);
  windshield.position.set(0, 0.5, 2.3);
  heli.add(windshield);
  for (const s of [-1, 1]) {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.1), glassMat);
    sideGlass.position.set(s * 1.12, 0.32, 0.9);
    heli.add(sideGlass);
  }
  // POLISI side decals
  const decalTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#1c2733'; g.fillRect(0, 0, 256, 64);
    g.fillStyle = '#ffd23e'; g.font = 'bold 40px Arial'; g.textAlign = 'center';
    g.fillText('POLISI', 128, 46);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  for (const s of [-1, 1]) {
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6),
      new THREE.MeshBasicMaterial({ map: decalTex }));
    decal.position.set(s * 1.18, 0.15, -0.4);
    decal.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    heli.add(decal);
  }
  // tail boom: slim, tapering, with a vertical fin and a horizontal stabiliser
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 5.6, 8), whiteMat);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 0.35, -4.6);
  heli.add(boom);
  const boomStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 1.2, 8), orangeMat);
  boomStripe.rotation.x = Math.PI / 2;
  boomStripe.position.set(0, 0.35, -5.6);
  heli.add(boomStripe);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.2), orangeMat);
  fin.position.set(0, 1.15, -7.2);
  heli.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.7), whiteMat);
  stab.position.set(0, 0.5, -6.6);
  heli.add(stab);
  // tail rotor on the left side of the fin
  const tailRotor = new THREE.Group();
  tailRotor.name = 'tail-rotor';
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.0, 0.16), darkMat);
    blade.rotation.z = a;
    tailRotor.add(blade);
  }
  tailRotor.position.set(-0.28, 0.9, -7.2);
  tailRotor.rotation.y = Math.PI / 2;
  heli.add(tailRotor);
  // mast + four-blade main rotor + a faint spinning blur disc
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 8), darkMat);
  mast.position.set(0, 1.45, 0);
  heli.add(mast);
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 4.9), darkMat);
    blade.position.z = 0;
    const holder = new THREE.Group();
    holder.rotation.y = (i / 4) * Math.PI * 2;
    blade.position.set(0, 0, 2.45);
    holder.add(blade);
    rotor.add(holder);
  }
  rotor.position.y = 1.95;
  heli.add(rotor);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.9, 28),
    new THREE.MeshBasicMaterial({ color: 0xdfe8f0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 1.9;
  disc.name = 'rotor-disc';
  heli.add(disc);
  // skids on four struts
  for (const s of [-1.05, 1.05]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 3.8), darkMat);
    skid.position.set(s, -1.5, 0.3);
    heli.add(skid);
    for (const sz of [-1.0, 1.2]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), darkMat);
      strut.position.set(s, -1.1, sz);
      strut.rotation.z = s > 0 ? -0.35 : 0.35;
      heli.add(strut);
    }
  }
  // searchlight under the nose + the spotlight cone to the ground
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  lamp.position.set(0, -1.25, 1.9);
  heli.add(lamp);
  const lampHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, 0.4, 10), darkMat);
  lampHousing.position.set(0, -1.05, 1.9);
  heli.add(lampHousing);
  const coneGeo = new THREE.ConeGeometry(3.8, 14, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.22,
    side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.name = 'spot-cone';
  cone.position.set(0, -8, 2.0);
  cone.rotation.x = 0.22;
  heli.add(cone);
  return heli;
}

// Parked airliner on the runway: fuselage, wings, tail, red nose stripe.
export function buildPlaneMesh() {
  const plane = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xe8ecf0 });
  const red = new THREE.MeshLambertMaterial({ color: 0xd23c2e });
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 26, 14), white);
  fus.rotation.x = Math.PI / 2;
  fus.position.y = 3.4;
  plane.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.2, 14, 10), red);
  nose.scale.set(1, 1, 1.4);
  nose.position.set(0, 3.4, 13.6);
  plane.add(nose);
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5, 14), white);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, 3.4, -15);
  plane.add(tailCone);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(30, 0.35, 5), white);
  wing.position.set(0, 3.0, 1);
  plane.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 4.5), red);
  fin.position.set(0, 7.5, -13.5);
  plane.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 3), white);
  stab.position.set(0, 5.6, -13.5);
  plane.add(stab);
  for (const s of [-6, 6]) {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 3.4, 10), red);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(s, 2.2, 2.5);
    plane.add(eng);
  }
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.45, 0.5, 24),
    new THREE.MeshLambertMaterial({ color: 0x2f6fd0 }));
  stripe.position.set(0, 3.4, 0);
  plane.add(stripe);
  // cockpit windows: a dark band across the nose so the front reads as a
  // flight deck, not a plain capsule
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.7, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x10151f }));
  cockpit.position.set(0, 4.1, 12.6);
  plane.add(cockpit);
  // red winglets at the wingtips
  for (const s of [-15, 15]) {
    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 1.2), red);
    winglet.position.set(s, 4.0, 1);
    plane.add(winglet);
  }
  return plane;
}

// On-foot character: jacket body, head with cap, swinging legs and arms.
export function buildPersonMesh(jacket, skin = 0xc98a5e, cap = 0x2f6fd0) {
  const p = new THREE.Group();
  const jacketMat = new THREE.MeshLambertMaterial({ color: jacket });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2a2d36 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.36), jacketMat);
  body.position.y = 1.18;
  body.name = 'body';
  p.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skinMat);
  head.position.y = 1.82;
  p.add(head);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.28, 0.12, 12),
    new THREE.MeshLambertMaterial({ color: cap }));
  capTop.position.y = 2.0;
  p.add(capTop);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.26),
    new THREE.MeshLambertMaterial({ color: cap }));
  brim.position.set(0, 1.96, 0.3);
  p.add(brim);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.26), pantsMat);
    leg.position.set(s * 0.16, 0.4, 0);
    leg.name = s < 0 ? 'legL' : 'legR';
    p.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), jacketMat);
    arm.position.set(s * 0.4, 1.18, 0);
    arm.name = s < 0 ? 'armL' : 'armR';
    p.add(arm);
  }
  return p;
}
