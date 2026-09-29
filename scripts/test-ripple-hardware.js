/**
 * Hardware smoke test: paint a software ripple on the connected Huntsman Mini
 * using the native addon (no Electron / iohook).
 *
 *   yarn install && yarn rebuild
 *   node scripts/test-ripple-hardware.js
 */
const path = require('path');

const ROWS = 5;
const COLS = 15;
const HUNTSMAN_MINI = 0x0257;
const COLOR = [0, 255, 0];
const BG = [8, 8, 16];

// Compact 60% positions matching production keymapping.js for these keys
const SIMULATED = [
  { name: 'Space', row: 4, col: 7, at: 0.0 },
  { name: 'Q', row: 1, col: 2, at: 0.2 },
  { name: 'A', row: 2, col: 2, at: 0.4 },
  { name: '1', row: 0, col: 2, at: 0.6 },
  { name: 'Esc', row: 0, col: 1, at: 0.8 },
  { name: 'Z', row: 3, col: 3, at: 1.0 },
];

function paint(addon, deviceId, matrix) {
  for (let i = 0; i < ROWS; i++) {
    const row = [i, 0, COLS - 1, ...matrix[i].flat()];
    addon.kbdSetCustomFrame(deviceId, new Uint8Array(row));
  }
  addon.kbdSetModeCustom(deviceId);
}

function main() {
  let addon;
  try {
    addon = require(path.join(__dirname, '..', 'build', 'Release', 'addon.node'));
  } catch (err) {
    console.error('Failed to load addon.node — run `yarn rebuild` first.');
    console.error(err.message);
    process.exit(1);
  }

  const devices = addon.getAllDevices();
  console.log(
    'Devices:',
    devices.map((d) => `0x${d.productId.toString(16)} id=${d.internalDeviceId}`).join(', ') || '(none)',
  );

  const mini = [...devices].find((d) => d.productId === HUNTSMAN_MINI);
  if (!mini) {
    console.error('Huntsman Mini (0x0257) not found. Plug it in and retry.');
    addon.closeAllDevices();
    process.exit(1);
  }

  const deviceId = mini.internalDeviceId;
  console.log(`Using Huntsman Mini internalDeviceId=${deviceId}`);
  addon.KbdSetBrightness(deviceId, 100);

  const t0 = Date.now() / 1000;
  console.log('Painting green ripples from Space/Q/A/1/Esc/Z for ~3s...');

  const endAt = Date.now() + 3000;
  const timer = setInterval(() => {
    const now = Date.now() / 1000;
    const events = SIMULATED.filter((e) => t0 + e.at <= now && t0 + e.at + 1.2 > now).map((e) => ({
      rowIdx: e.row,
      colIdx: e.col,
      startTime: t0 + e.at,
    }));

    const matrix = Array(ROWS)
      .fill()
      .map(() => Array(COLS).fill(BG));

    const speed = 20;
    const width = 2;
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        for (const event of events) {
          const radius = (now - event.startTime) * speed;
          const distance = Math.sqrt((event.rowIdx - i) ** 2 + (event.colIdx - j) ** 2);
          if (radius - width <= distance && distance <= radius) {
            matrix[i][j] = COLOR;
            break;
          }
        }
      }
    }

    paint(addon, deviceId, matrix);

    if (Date.now() >= endAt) {
      clearInterval(timer);
      // Finish on a calm static green so we know custom frames still work
      paint(
        addon,
        deviceId,
        Array(ROWS)
          .fill()
          .map(() => Array(COLS).fill([0, 80, 0])),
      );
      console.log('Done. You should have seen expanding green waves across the Mini.');
      addon.closeAllDevices();
      process.exit(0);
    }
  }, 50);
}

main();
