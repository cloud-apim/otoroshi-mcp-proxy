import fs from 'node:fs';

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

function needsStringify(obj) {
  return isObject(obj) || Array.isArray(obj);
}

export function log(level, ...args) {
  fs.appendFile(
    "/Users/mathieuancelin/projects/clever-ai/mpc-test/mcp-otoroshi-proxy/raw.log", 
    `${Date.now()} [${level}] - ${args.map(a => needsStringify(a) ? JSON.stringify(a) : a).join(' ')} \n\n`,
    (err) => ''
  );
}

export function log_info(...args) {
  log('INFO', ...args);
}

export function log_error(...args) {
  log('ERROR', ...args);
  console.error(...args)
}