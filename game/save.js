// save.js — save and load the player's progress (cash, respect, health,
// completed missions, position) in this browser's local storage.
const SAVE_KEY = 'nusa-drive-save-v5';

export function saveGame(state) {
  try {
    const data = {
      version: 5,
      cash: state.cash,
      respect: state.respect,
      playerHealth: state.playerHealth,
      playerArmour: state.playerArmour,
      completedMissions: state.completedMissions || [],
      lastMission: state.mission ? state.mission.def.id : (state.completedMissions || []).length + 1,
      playerPos: { x: state.playerPos.x, z: state.playerPos.z },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 5) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}
