/**
 * iohook keycode → LED matrix [row, col] mappings for Razer keyboards.
 *
 * Full-size layout matches OpenRazer's KEY_MAPPING (6×22).
 * Compact 60%/mini boards (5 rows) shift the alpha block up by one row:
 * Esc stays on row 0, the number row moves to row 0, and the bottom
 * modifiers land on row 4 (in-bounds) instead of row 5 (out of bounds).
 */

// Full-size / TKL / Blade shared map (iohook keycodes)
export const FULL_SIZE_KEY_MAPPING = {
  1: [0, 1],
  59: [0, 3],
  60: [0, 4],
  61: [0, 5],
  62: [0, 6],
  63: [0, 7],
  64: [0, 8],
  65: [0, 9],
  66: [0, 10],
  67: [0, 11],
  68: [0, 12],
  87: [0, 13],
  88: [0, 14],
  91: [0, 15],
  92: [0, 16],
  93: [0, 17],
  57378: [0, 19],
  57376: [0, 21],
  41: [1, 1],
  2: [1, 2],
  3: [1, 3],
  4: [1, 4],
  5: [1, 5],
  6: [1, 6],
  7: [1, 7],
  8: [1, 8],
  9: [1, 9],
  10: [1, 10],
  11: [1, 11],
  12: [1, 12],
  13: [1, 13],
  14: [1, 14],
  3666: [1, 15],
  3655: [1, 16],
  3657: [1, 17],
  69: [1, 18],
  3637: [1, 19],
  55: [1, 20],
  74: [1, 21],
  15: [2, 1],
  16: [2, 2],
  17: [2, 3],
  18: [2, 4],
  19: [2, 5],
  20: [2, 6],
  21: [2, 7],
  22: [2, 8],
  23: [2, 9],
  24: [2, 10],
  25: [2, 11],
  26: [2, 12],
  27: [2, 13],
  43: [2, 14],
  3667: [2, 15],
  3663: [2, 16],
  3665: [2, 17],
  71: [2, 18],
  72: [2, 19],
  73: [2, 20],
  78: [2, 21],
  58: [3, 1],
  30: [3, 2],
  31: [3, 3],
  32: [3, 4],
  33: [3, 5],
  34: [3, 6],
  35: [3, 7],
  36: [3, 8],
  37: [3, 9],
  38: [3, 10],
  39: [3, 11],
  40: [3, 12],
  28: [3, 14],
  75: [3, 18],
  76: [3, 19],
  77: [3, 20],
  42: [4, 1],
  44: [4, 3],
  45: [4, 4],
  46: [4, 5],
  47: [4, 6],
  48: [4, 7],
  49: [4, 8],
  50: [4, 9],
  51: [4, 10],
  52: [4, 11],
  53: [4, 12],
  54: [4, 14],
  57416: [4, 16],
  79: [4, 18],
  80: [4, 19],
  81: [4, 20],
  3612: [4, 21],
  29: [5, 1],
  3675: [5, 2],
  56: [5, 3],
  57: [5, 7],
  3640: [5, 11],
  0: [5, 13],
  3613: [5, 14],
  57419: [5, 15],
  57424: [5, 16],
  57421: [5, 17],
  82: [5, 19],
  83: [5, 20],
};

/**
 * Build a key→LED map clipped (and for 5-row boards, row-shifted) to the
 * device matrix size.
 *
 * @param {number} rows
 * @param {number} cols
 * @returns {Object.<number, [number, number]>}
 */
export function buildKeyMapping(rows, cols) {
  const compact = rows > 0 && rows < 6;
  const mapping = {};

  for (const [keycode, position] of Object.entries(FULL_SIZE_KEY_MAPPING)) {
    const kc = Number(keycode);
    let [row, col] = position;

    if (compact) {
      // F-row does not exist on 60% boards; keep Esc only (top-left).
      if (row === 0) {
        if (col !== 1) {
          continue;
        }
      } else {
        // Skip backtick — after the row shift it would collide with Esc.
        if (kc === 41) {
          continue;
        }
        row = row - 1;
      }
    }

    if (row < 0 || col < 0 || row >= rows || col >= cols) {
      continue;
    }

    mapping[kc] = [row, col];
  }

  return mapping;
}
