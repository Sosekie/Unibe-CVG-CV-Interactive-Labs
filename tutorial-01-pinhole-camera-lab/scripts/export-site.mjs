// Collects the static export into out/: the pages built under LABS_BASE_PATH plus
// the files in public/. out/ is what the course site serves at that path.
import { cpSync, existsSync, rmSync } from 'node:fs';

const base = (process.env.LABS_BASE_PATH ?? '').replace(/^\/+|\/+$/g, '');
const pages = base ? `dist/client/${base}` : 'dist/client';
if (!existsSync(`${pages}/index.html`)) throw new Error(`No exported index.html in ${pages}.`);

rmSync('out', { recursive: true, force: true });
cpSync(pages, 'out', { recursive: true });
if (existsSync('public')) cpSync('public', 'out', { recursive: true });
rmSync('out/.vite', { recursive: true, force: true });
console.log(`Static site written to out/ for ${base ? '/' + base + '/' : 'the site root'}.`);
