// Minimal terminal styling with no runtime dependencies.
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (s) => (useColor ? `[${code}m${s}[0m` : String(s));

export const c = {
  bold: wrap('1'),
  dim: wrap('2'),
  green: wrap('32'),
  yellow: wrap('33'),
  cyan: wrap('36'),
  red: wrap('31'),
  gray: wrap('90'),
};

export const log = (...a) => console.log(...a);
export const info = (msg) => console.log(`${c.cyan('›')} ${msg}`);
export const ok = (msg) => console.log(`${c.green('✓')} ${msg}`);
export const warn = (msg) => console.log(`${c.yellow('!')} ${msg}`);
export const err = (msg) => console.error(`${c.red('✗')} ${msg}`);
export const step = (msg) => console.log(`\n${c.bold(msg)}`);
