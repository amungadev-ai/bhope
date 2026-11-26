// Passenger-compatible startup entry point. Diagnostics stay outside public/.
const { appendFileSync, chmodSync } = require('node:fs');
const { join } = require('node:path');
const logPath = join(__dirname, 'startup.log');

function startupLog(code, message, fatal = false) {
  let detail = `[${code}] ${message}`;
  for (const [key, value] of Object.entries(process.env))
    if (value && /PASSWORD|PASSKEY|SECRET|TOKEN|KEY$/i.test(key))
      detail = detail.split(value).join('[redacted]');
  detail = detail.replace(/[\r\n]+/g, ' ').slice(0, 3000);
  const line = `${new Date().toISOString()} ${detail}\n`;
  if (fatal) console.error(line.trimEnd());
  else console.log(line.trimEnd());
  try {
    appendFileSync(logPath, line, { encoding: 'utf8', mode: 0o600 });
    chmodSync(logPath, 0o600);
  } catch {
    console.error('Could not write startup.log. Check the Node.js application error log.');
  }
}

function fatalStartup(error) {
  const code = typeof error?.code === 'string' ? error.code : 'STARTUP_ERROR';
  const message = typeof error?.message === 'string' ? error.message : 'Unknown fatal error.';
  startupLog(code, message, true);
  process.exit(1);
}

process.once('uncaughtException', fatalStartup);
process.once('unhandledRejection', fatalStartup);
startupLog('BOOT', `Startup entry executed with Node.js ${process.version}.`);
import('./dist/index.js')
  .then(() => startupLog('MODULE_LOADED', 'API startup module loaded.'))
  .catch(fatalStartup);
