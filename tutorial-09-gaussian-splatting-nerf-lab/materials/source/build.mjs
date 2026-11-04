import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
execFileSync('python3',['build.py'],{cwd:fileURLToPath(new URL('.',import.meta.url)),stdio:'inherit'});
