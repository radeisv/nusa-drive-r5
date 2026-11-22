// input.js — keyboard and mouse input for driving, walking, stealing cars,
// shooting, switching weapons and calling the crew.
export function bindInput(state) {
  const keys = {};
  state.keys = keys;
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (state.mode !== 'playing') return;
    if (e.code === 'KeyE') state.tryEnterCar();
    if (e.code === 'Digit1') state.weapon = 1;
    if (e.code === 'Digit2') state.weapon = 2;
    if (e.code === 'Digit3') state.weapon = 3;
    if (e.code === 'Digit4') state.weapon = 4;
    if (e.code === 'KeyZ') state.crewSwapPlates();
    if (e.code === 'KeyX') state.crewQuickFix();
    if (e.code === 'KeyC') state.crewEyesOut();
    if (e.code === 'KeyM') state.cycleMission();
    if (e.code === 'Escape') state.pauseGame();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousedown', (e) => {
    if (state.mode !== 'playing' || e.button !== 0) return;
    if (e.target.closest && e.target.closest('#menu')) return;
    state.mouseDown = true;
    if (!state.inCar) state.shoot();
  });
  window.addEventListener('mouseup', () => { state.mouseDown = false; });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; state.mouseDown = false; });
  return keys;
}

export function axis(keys, neg, pos) {
  return (keys[pos] ? 1 : 0) - (keys[neg] ? 1 : 0);
}
