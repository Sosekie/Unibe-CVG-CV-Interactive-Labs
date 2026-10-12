// CI only: finds the D1 database "cv-labs" in the Cloudflare account (creating
// it on the first deployment) and writes wrangler.ci.json with its real id.
// Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const apiDir = fileURLToPath(new URL('..', import.meta.url));
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const config = JSON.parse(readFileSync(new URL('../wrangler.json', import.meta.url), 'utf8'));
const database = config.d1_databases[0];

function run(...args) {
  return execFileSync(process.execPath, [wrangler, ...args], { cwd: apiDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function findDatabase() {
  const list = JSON.parse(run('d1', 'list', '--json'));
  return list.find((entry) => entry.name === database.database_name);
}

let found = findDatabase();
if (!found) {
  console.log(`Creating the D1 database ${database.database_name}.`);
  run('d1', 'create', database.database_name);
  found = findDatabase();
}
const id = found?.uuid ?? found?.database_id;
if (!id) throw new Error(`Could not find the D1 database ${database.database_name}.`);

database.database_id = id;
writeFileSync(new URL('../wrangler.ci.json', import.meta.url), JSON.stringify(config, null, 2) + '\n');
console.log(`Using D1 database ${database.database_name} (${id}).`);
