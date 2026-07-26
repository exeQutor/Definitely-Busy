const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { mouse, Point } = require('@nut-tree-fork/nut-js');

let mainWindow;
let tray = null;
let intervalHandle = null;
let countdownHandle = null;
let intervalSeconds = 30;
let secondsLeft = 30;
let isRunning = false;

// Set to true right before actually quitting, so the window's
// 'close' handler knows to let it close instead of hiding to tray.
app.isQuitting = false;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Glides the cursor from wherever it is to (targetX, targetY) instead of
// teleporting, using an eased path sampled at ~60fps. Duration scales with
// distance so short hops feel snappy and long hops still feel natural.
async function moveCursorSmoothly(targetX, targetY) {
  const start = await mouse.getPosition();
  const distance = Math.hypot(targetX - start.x, targetY - start.y);
  const duration = Math.min(900, Math.max(250, distance * 1.2));
  const stepTime = 16; // ~60fps
  const steps = Math.max(1, Math.round(duration / stepTime));

  for (let i = 1; i <= steps; i += 1) {
    const t = easeInOutQuad(i / steps);
    const x = Math.round(start.x + (targetX - start.x) * t);
    const y = Math.round(start.y + (targetY - start.y) * t);
    await mouse.setPosition(new Point(x, y));
    if (i < steps) await delay(stepTime);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 350,
    resizable: false,
    frame: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Minimize to tray instead of closing, unless we're actually quitting.
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('Definitely Busy — Idle');

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;

  tray.setToolTip(`Definitely Busy — ${isRunning ? 'Running' : 'Idle'}`);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show window', click: () => mainWindow.show() },
    { type: 'separator' },
    {
      label: 'Start',
      enabled: !isRunning,
      click: () => {
        startMoving(intervalSeconds);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('state-changed', { running: isRunning, interval: intervalSeconds });
        }
      }
    },
    {
      label: 'Stop',
      enabled: isRunning,
      click: () => {
        stopMoving();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('state-changed', { running: isRunning, interval: intervalSeconds });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Picks a random point within the primary display's usable work area
function getRandomPoint() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  const randX = Math.floor(x + Math.random() * width);
  const randY = Math.floor(y + Math.random() * height);
  return { x: randX, y: randY };
}

async function moveCursorRandomly() {
  const { x, y } = getRandomPoint();
  try {
    await moveCursorSmoothly(x, y);
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('cursor-error', err.message);
    }
  }
}

function startCountdown() {
  secondsLeft = intervalSeconds;
  if (countdownHandle) clearInterval(countdownHandle);
  countdownHandle = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) secondsLeft = intervalSeconds;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('countdown-tick', secondsLeft);
    }
  }, 1000);
}

function startMoving(seconds) {
  intervalSeconds = Number(seconds) > 0 ? Number(seconds) : 30;
  stopMoving();
  isRunning = true;
  // Move once immediately, then on the interval
  moveCursorRandomly();
  intervalHandle = setInterval(moveCursorRandomly, intervalSeconds * 1000);
  startCountdown();
  updateTrayMenu();
}

function stopMoving() {
  isRunning = false;
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (countdownHandle) {
    clearInterval(countdownHandle);
    countdownHandle = null;
  }
  updateTrayMenu();
}

ipcMain.handle('start-moving', (event, seconds) => {
  startMoving(seconds);
  return { running: isRunning, interval: intervalSeconds };
});

ipcMain.handle('stop-moving', () => {
  stopMoving();
  return { running: isRunning };
});

ipcMain.handle('get-status', () => {
  return { running: isRunning, interval: intervalSeconds, secondsLeft };
});

ipcMain.handle('hide-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

// Windows close to tray now, so this only fires on an explicit quit
// (tray "Quit" or Cmd+Q on mac), not on the window's close button.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopMoving();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopMoving();
});
