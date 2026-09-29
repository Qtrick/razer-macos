import { app, dialog, shell, systemPreferences } from 'electron';
import { RazerDeviceAnimation } from './animation';
import { buildKeyMapping } from './keymapping';

let permissionHintShownThisSession = false;

function openMacPrivacyPane(pane) {
  const urls = [
    // macOS 13+ System Settings
    `x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?${pane}`,
    // Older System Preferences
    `x-apple.systempreferences:com.apple.preference.security?${pane}`,
  ];
  for (const url of urls) {
    try {
      shell.openExternal(url);
      return;
    } catch (e) {
      // try next URL form
    }
  }
}

function maybeGuidePermissions() {
  if (permissionHintShownThisSession) {
    return;
  }
  permissionHintShownThisSession = true;

  // Never call isTrustedAccessibilityClient(true) — that re-opens the system
  // dialog every time for ad-hoc signed builds.
  let trusted = true;
  try {
    trusted = systemPreferences.isTrustedAccessibilityClient(false);
  } catch (e) {
    trusted = false;
  }

  // Yarn-dev and the packaged app are different binaries under TCC. Always
  // remind once in release builds — Input Monitoring grants for Electron do
  // not apply to /Applications/Razer macOS.app.
  const packaged = (() => {
    try {
      return app.isPackaged;
    } catch (e) {
      return false;
    }
  })();

  if (trusted && !packaged) {
    return;
  }

  dialog
    .showMessageBox({
      type: 'info',
      buttons: ['Open Input Monitoring', 'Open Accessibility', 'OK'],
      defaultId: 0,
      cancelId: 2,
      title: 'Ripple keyboard access',
      message: 'Ripple needs keyboard permissions for this app.',
      detail:
        'Enable “Razer macOS” (not Electron) under System Settings → Privacy & Security → Input Monitoring and Accessibility.\n\n' +
        'Then fully quit Razer macOS and open it again. Dev (yarn) and the release app each need their own toggle.',
    })
    .then((result) => {
      if (result.response === 0) {
        openMacPrivacyPane('Privacy_ListenEvent');
      } else if (result.response === 1) {
        openMacPrivacyPane('Privacy_Accessibility');
      }
    })
    .catch(() => {});
}

export class RazerAnimationRipple extends RazerDeviceAnimation {
  constructor(device, featureConfiguration, color, backgroundColor = [0, 0, 0]) {
    super();

    this.device = device;
    this.color = color;
    this.backgroundColor = backgroundColor != null ? backgroundColor : [0, 0, 0];

    this.nRows = featureConfiguration.rows;
    this.nCols = featureConfiguration.cols;
    this.KEY_MAPPING = buildKeyMapping(this.nRows, this.nCols);

    this.rippleEffectInterval = null;
    this.keyEvents = [];
    this.ioHook = null;
    this.onKeyDown = null;
  }

  paintFrame(matrix) {
    for (let i = 0; i < this.nRows; i++) {
      const row = [i, 0, this.nCols - 1, ...matrix[i].flat()];
      this.device.setCustomFrame(new Uint8Array(row));
    }
    this.device.setModeCustom();
  }

  createBackgroundMatrix() {
    return Array(this.nRows)
      .fill()
      .map(() => Array(this.nCols).fill(this.backgroundColor));
  }

  /** Used by tests to inject a key press without iohook. */
  handleKey(keycode) {
    if (!(keycode in this.KEY_MAPPING)) {
      return false;
    }
    const [rowIdx, colIdx] = this.KEY_MAPPING[keycode];
    if (rowIdx < 0 || colIdx < 0 || rowIdx >= this.nRows || colIdx >= this.nCols) {
      return false;
    }
    this.keyEvents.push({
      rowIdx,
      colIdx,
      startTime: Date.now() / 1000,
    });
    return true;
  }

  render(eventDuration, speed, width) {
    const now = Date.now() / 1000;
    this.keyEvents = this.keyEvents.filter((event) => event.startTime + eventDuration > now);

    const matrix = this.createBackgroundMatrix();

    for (let i = 0; i < this.nRows; i++) {
      for (let j = 0; j < this.nCols; j++) {
        for (const event of this.keyEvents) {
          const radius = (now - event.startTime) * speed;
          const distance = Math.sqrt(
            Math.pow(event.rowIdx - i, 2) + Math.pow(event.colIdx - j, 2),
          );
          if (radius - width <= distance && distance <= radius) {
            matrix[i][j] = this.color;
            break;
          }
        }
      }
    }

    this.paintFrame(matrix);
  }

  start() {
    const refreshRateSeconds = 0.05;
    const eventDuration = 1;
    const speed = 20;
    const width = 2;

    this.keyEvents = [];
    this.paintFrame(this.createBackgroundMatrix());

    maybeGuidePermissions();

    try {
      this.ioHook = require('iohook');
      this.onKeyDown = (event) => {
        const mapped = this.handleKey(event.keycode);
        if (!mapped && process.env.DEBUG_RIPPLE) {
          console.log('Ripple unmapped keycode', event.keycode, event);
        }
      };
      this.ioHook.on('keydown', this.onKeyDown);
      // Starting the hook creates the CGEventTap, which re-registers the app
      // under Input Monitoring after a TCC reset.
      this.ioHook.start();
      console.log(
        `Ripple started (${this.nRows}x${this.nCols}, ${Object.keys(this.KEY_MAPPING).length} mapped keys)`,
      );
    } catch (e) {
      console.error('Failed to start iohook for Ripple:', e);
    }

    this.rippleEffectInterval = setInterval(() => {
      this.render(eventDuration, speed, width);
    }, refreshRateSeconds * 1000);
  }

  stop() {
    if (this.rippleEffectInterval != null) {
      clearInterval(this.rippleEffectInterval);
      this.rippleEffectInterval = null;
    }

    if (this.ioHook != null && this.onKeyDown != null) {
      this.ioHook.removeListener('keydown', this.onKeyDown);
      this.onKeyDown = null;
      try {
        this.ioHook.stop();
      } catch (e) {
        // iohook may already be stopped
      }
    }

    this.keyEvents = [];
  }

  destroy() {
    this.stop();
    // Do not unload the shared iohook module — that permanently breaks
    // subsequent ripple starts until the process restarts.
  }
}
