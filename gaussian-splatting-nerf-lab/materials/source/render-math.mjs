import katex from 'katex';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const output=Object.fromEntries(Object.entries(input).map(([id,tex])=>[id,katex.renderToString(tex,{displayMode:true,throwOnError:true,output:'htmlAndMathml'})]));
process.stdout.write(JSON.stringify(output));
