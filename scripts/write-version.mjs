import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

let commit = 'unknown';
let fullCommit = '';
let dirty = false;

try {
  const headFull = run('git rev-parse HEAD');
  const headShort = headFull.slice(0, 8);
  const msg = run('git log -1 --pretty=%s');
  const codeHashMsg = msg.match(/^Update code hash for ([0-9a-f]{8,40})$/i);

  if (codeHashMsg) {
    // If we're on the bot "version file only" commit, map back to the real code commit.
    const sourceFull = run(`git rev-parse ${codeHashMsg[1]}`);
    fullCommit = sourceFull;
    commit = sourceFull.slice(0, 8);
  } else {
    fullCommit = headFull;
    commit = headShort;
  }

  try {
    run('git diff --quiet --ignore-submodules HEAD --');
    dirty = false;
  } catch {
    dirty = true;
  }
} catch {
  // Keep fallback values when git metadata is unavailable.
}

const payload = {
  commit,
  fullCommit,
  dirty
};

const target = resolve(process.cwd(), 'version.json');
const next = JSON.stringify(payload, null, 2) + '\n';
let prev = '';
try { prev = readFileSync(target, 'utf8'); } catch {}
if (prev !== next) {
  writeFileSync(target, next, 'utf8');
}
console.log(`Using code hash ${commit}${dirty ? '+dirty' : ''}`);
