import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

let commit = 'unknown';
let fullCommit = '';
let dirty = false;

try {
  commit = run('git rev-parse --short=8 HEAD');
  fullCommit = run('git rev-parse HEAD');
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
  dirty,
  generatedAt: new Date().toISOString()
};

const target = resolve(process.cwd(), 'version.json');
writeFileSync(target, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${target}: ${commit}${dirty ? '+dirty' : ''}`);
