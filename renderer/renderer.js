const intervalInput = document.getElementById('interval');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const countdownEl = document.getElementById('countdown');
const errorEl = document.getElementById('error');
const closeBtn = document.getElementById('closeBtn');

function setRunningUI(running) {
  startBtn.disabled = running;
  stopBtn.disabled = !running;
  intervalInput.disabled = running;
  statusDot.classList.toggle('running', running);
  statusDot.classList.toggle('idle', !running);
  statusText.textContent = running ? 'Running' : 'Idle';
  if (!running) countdownEl.textContent = '';
}

startBtn.addEventListener('click', async () => {
  const seconds = parseInt(intervalInput.value, 10) || 30;
  const result = await window.cursorAPI.start(seconds);
  setRunningUI(result.running);
});

stopBtn.addEventListener('click', async () => {
  const result = await window.cursorAPI.stop();
  setRunningUI(result.running);
});

closeBtn.addEventListener('click', () => {
  window.cursorAPI.hideWindow();
});

window.cursorAPI.onCursorError((message) => {
  errorEl.textContent = `Error: ${message}`;
});

window.cursorAPI.onCountdownTick((secondsLeft) => {
  countdownEl.textContent = `Next move in ${secondsLeft}s`;
});

// Keep the window UI in sync if Start/Stop was triggered from the tray menu
window.cursorAPI.onStateChanged(({ running, interval }) => {
  intervalInput.value = interval;
  setRunningUI(running);
});

// Sync UI with actual main-process state on load
(async () => {
  const status = await window.cursorAPI.getStatus();
  intervalInput.value = status.interval;
  setRunningUI(status.running);
})();
