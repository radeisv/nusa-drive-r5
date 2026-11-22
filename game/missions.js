// missions.js — the four-chapter story of Raka in Kota Nusa. Each mission is
// a chain of stages (go to a place, fight guards, race checkpoints, grab the
// score) with a timer, dialogue and a cash payout. The beacon is a small
// ground ring plus a floating diamond — never a giant pillar.
import * as THREE from 'three';
import { raiseWanted } from './police.js';

export function defineMissions() {
  return [
    {
      id: 1, chapter: 'CHAPTER 1 · FIRST LIGHT', title: 'MEET SINTA AT THE PIER',
      reward: 500, timeLimit: 180, speaker: 'SINTA', face: 'S',
      line: 'Raka! The boat leaves at dawn. Meet me at the pier — and don\'t bring the heat.',
      stages: [
        { text: 'Drive to the pier at the north end of the boulevard.', next: 'Reach the pier marker', kind: 'goto', target: { x: 74, z: -184, r: 9 } },
        { text: 'Talk to Sinta at the pier.', next: 'Meet Sinta', kind: 'goto', target: { x: 70, z: -188, r: 5 } },
      ],
    },
    {
      id: 2, chapter: 'CHAPTER 2 · THE AIRPORT RUN', title: 'GRAB THE MANIFEST',
      reward: 1200, timeLimit: 240, speaker: 'SINTA', face: 'S',
      line: 'The cargo manifest is in the terminal office. Guards everywhere — stay low, move fast.',
      stages: [
        { text: 'Drive across the bridge to Bandara Nusa airport.', next: 'Reach the airport', kind: 'goto', target: { x: -140, z: 0, r: 12 } },
        { text: 'Fight through the airport guards.', next: 'Guards down: 0/4', kind: 'fight', count: 4 },
        { text: 'Grab the manifest case from the terminal.', next: 'Take the case', kind: 'goto', target: { x: -150, z: 36, r: 5 } },
      ],
    },
    {
      id: 3, chapter: 'CHAPTER 3 · STREET HEAT', title: 'THE BEACH RACE',
      reward: 2000, timeLimit: 150, speaker: 'KIKI', face: 'K',
      line: 'Elang-1 is on your tail, Raka. Lose them before the pier — and win the race!',
      stages: [
        { text: 'Race down Pantai Boulevard — hit the first checkpoint.', next: 'Checkpoint 1/3', kind: 'goto', target: { x: 40, z: -60, r: 8 } },
        { text: 'Second checkpoint, past the market.', next: 'Checkpoint 2/3', kind: 'goto', target: { x: 40, z: -120, r: 8 } },
        { text: 'Cross the finish line at the pier.', next: 'Cross the finish', kind: 'goto', target: { x: 55, z: -180, r: 9 } },
      ],
    },
    {
      id: 4, chapter: 'CHAPTER 4 · THE BIG ONE', title: 'THE HARBOUR HEIST',
      reward: 3500, timeLimit: 300, speaker: 'BAYU', face: 'B',
      line: 'The harbour vault is ours tonight. Four guards, one vault, no mistakes.',
      stages: [
        { text: 'Reach the harbour containers.', next: 'Reach the harbour', kind: 'goto', target: { x: 60, z: -166, r: 10 } },
        { text: 'Fight through the harbour guards.', next: 'Guards down: 0/5', kind: 'fight', count: 5 },
        { text: 'Crack the vault and grab the cash.', next: 'Take the cash', kind: 'goto', target: { x: 52, z: -170, r: 5 } },
        { text: 'Escape the harbour with the score.', next: 'Lose the heat', kind: 'escape', target: { x: 40, z: -60, r: 12 } },
      ],
    },
  ];
}

export function startMission(state, id) {
  const def = state.missionDefs.find((m) => m.id === id);
  if (!def) return false;
  state.mission = {
    def, stage: 0, timer: def.timeLimit, active: true,
    guardsDown: 0, done: false,
  };
  state.dialogue(def.speaker, def.line, def.face);
  state.toast(def.chapter + ' — ' + def.title, 2200);
  if (def.id === 4) raiseWanted(state, 2);
  if (def.id === 2) state.spawnMissionGuards(4, { x: -150, z: 20 });
  if (def.id === 4) state.spawnMissionGuards(5, { x: 60, z: -166 });
  return true;
}

// Small ground ring + floating diamond marker at the current objective.
export function buildBeacon(scene) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  g.add(ring);
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.7),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  diamond.position.y = 3.2;
  diamond.name = 'diamond';
  g.add(diamond);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.35 }));
  beam.position.y = 1.6;
  g.add(beam);
  g.visible = false;
  scene.add(g);
  return g;
}

export function currentStage(state) {
  if (!state.mission || !state.mission.active) return null;
  return state.mission.def.stages[state.mission.stage] ?? null;
}

export function updateMission(dt, state) {
  const m = state.mission;
  if (!m || !m.active) return;
  m.timer -= dt;
  if (m.timer <= 0) {
    m.active = false;
    state.toast('MISSION FAILED — TIME UP', 2200);
    state.dialogue('KIKI', 'Too slow, Raka. The job is gone — take the next one.', 'K');
    state.mission = null;
    return;
  }
  const stage = currentStage(state);
  if (!stage) return;
  const p = state.playerPos;
  if (stage.kind === 'goto' || stage.kind === 'escape') {
    const d = Math.hypot(p.x - stage.target.x, p.z - stage.target.z);
    if (d < stage.target.r) advanceStage(state);
  } else if (stage.kind === 'fight') {
    if (m.guardsDown >= stage.count) advanceStage(state);
  }
}

function advanceStage(state) {
  const m = state.mission;
  m.stage++;
  if (state.audio) state.audio.playChime();
  if (m.stage >= m.def.stages.length) {
    m.active = false;
    m.done = true;
    state.cash += m.def.reward;
    state.respect += 650;
    state.toast('MISSION COMPLETE — +$' + m.def.reward.toLocaleString(), 2600);
    state.dialogue(m.def.speaker, 'Clean job, Raka. $' + m.def.reward.toLocaleString() + ' in the pocket.', m.def.face);
    state.completedMissions = state.completedMissions || [];
    state.completedMissions.push(m.def.id);
    const next = state.missionDefs.find((d) => d.id === m.def.id + 1);
    if (next) {
      state.mission = null;
      startMission(state, next.id);
    } else {
      state.mission = null;
      state.toast('ALL FOUR JOBS DONE — KOTA NUSA IS YOURS', 3000);
    }
  } else {
    const stage = currentStage(state);
    state.toast('STAGE ' + (m.stage + 1) + '/' + m.def.stages.length + ' — ' + stage.next, 1800);
  }
}
