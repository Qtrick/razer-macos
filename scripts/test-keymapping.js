/**
 * Unit checks for 60% key mapping used by Huntsman Mini ripple.
 * Run: node --experimental-modules won't work for this CJS-style; use a small assert script.
 */
const assert = require('assert');

// Mirror of buildKeyMapping logic for a quick sanity check without babel.
const FULL = {
  1: [0, 1], // Esc
  59: [0, 3], // F1
  2: [1, 2], // 1
  14: [1, 14], // Backspace
  41: [1, 1], // backtick
  15: [2, 1], // Tab
  16: [2, 2], // Q
  30: [3, 2], // A
  44: [4, 3], // Z
  57: [5, 7], // Space
  29: [5, 1], // LCtrl
  91: [0, 15], // out of Mini cols
};

function buildKeyMapping(rows, cols) {
  const compact = rows > 0 && rows < 6;
  const mapping = {};
  for (const [keycode, position] of Object.entries(FULL)) {
    const kc = Number(keycode);
    let [row, col] = position;
    if (compact) {
      if (row === 0) {
        if (col !== 1) continue;
      } else {
        if (kc === 41) continue;
        row = row - 1;
      }
    }
    if (row < 0 || col < 0 || row >= rows || col >= cols) continue;
    mapping[kc] = [row, col];
  }
  return mapping;
}

const mini = buildKeyMapping(5, 15);
assert.deepStrictEqual(mini[1], [0, 1], 'Esc stays row 0');
assert.deepStrictEqual(mini[2], [0, 2], 'digit 1 moves to row 0');
assert.deepStrictEqual(mini[14], [0, 14], 'Backspace on top row');
assert.deepStrictEqual(mini[15], [1, 1], 'Tab on row 1');
assert.deepStrictEqual(mini[16], [1, 2], 'Q on row 1');
assert.deepStrictEqual(mini[30], [2, 2], 'A on row 2');
assert.deepStrictEqual(mini[44], [3, 3], 'Z on row 3');
assert.deepStrictEqual(mini[57], [4, 7], 'Space on row 4 (was OOB at row 5)');
assert.deepStrictEqual(mini[29], [4, 1], 'LCtrl on row 4');
assert.strictEqual(mini[59], undefined, 'F1 dropped on 60%');
assert.strictEqual(mini[41], undefined, 'backtick dropped (Esc collision)');
assert.strictEqual(mini[91], undefined, 'col 15 dropped');

const full = buildKeyMapping(6, 22);
assert.deepStrictEqual(full[57], [5, 7], 'full-size Space stays row 5');
assert.deepStrictEqual(full[59], [0, 3], 'full-size F1 kept');

console.log('keymapping sanity checks passed');
