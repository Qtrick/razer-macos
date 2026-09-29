import { RazerDeviceAnimation } from './animation';
import { buildKeyMapping } from './keymapping';

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

  /**
   * Ripple needs macOS Accessibility (and often Input Monitoring) so iohook
   * can see key presses. Prompt the user if the process is not trusted yet.
   */
  ensureAccessibilityAccess() {
    try {
      const { systemPreferences, dialog } = require('electron');
      const trusted = systemPreferences.isTrustedAccessibilityClient(false);
      if (!trusted) {
        dialog.showMessageBoxSync({
          type: 'warning',
          title: 'Permission required for Ripple',
          message: 'Ripple needs Accessibility access to detect key presses.',
          detail:
            'Click OK to open the Accessibility prompt, then enable “Razer macOS” (or Electron). ' +
            'Also enable it under Privacy & Security → Input Monitoring if asked. ' +
            'Restart the app afterwards, then select Ripple again.',
        });
        systemPreferences.isTrustedAccessibilityClient(true);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Ripple accessibility check failed:', e);
      return true; // still attempt to start
    }
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

    // Still paint the background even if permissions are missing, so the user
    // sees the dual-color base instead of a silent no-op.
    const canListen = this.ensureAccessibilityAccess();

    try {
      this.ioHook = require('iohook');
      this.onKeyDown = (event) => {
        const mapped = this.handleKey(event.keycode);
        if (!mapped && process.env.DEBUG_RIPPLE) {
          console.log('Ripple unmapped keycode', event.keycode, event);
        }
      };
      this.ioHook.on('keydown', this.onKeyDown);
      this.ioHook.start();
      if (!canListen) {
        console.warn(
          'Ripple started without Accessibility trust — key events will not fire until permission is granted and the app is restarted.',
        );
      } else {
        console.log(
          `Ripple started (${this.nRows}x${this.nCols}, ${Object.keys(this.KEY_MAPPING).length} mapped keys)`,
        );
      }
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
