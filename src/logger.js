const fs = require("fs");

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

function needsStringify(obj) {
  return isObject(obj) || Array.isArray(obj);
}

function log(level, ...args) {
  fs.appendFile(
    "/Users/mathieuancelin/projects/clever-ai/mpc-test/mcp-otoroshi-proxy/raw.log", 
    `${Date.now()} [${level}] - ${args.map(a => needsStringify(a) ? JSON.stringify(a) : a).join(' ')} \n\n`,
    (err) => ''
  );
}

function log_info(...args) {
  log('INFO', ...args);
}

function log_error(...args) {
  log('ERROR', ...args);
  console.error(...args)
}

exports.log = log;
exports.log_info = log_info;
exports.log_error = log_error;