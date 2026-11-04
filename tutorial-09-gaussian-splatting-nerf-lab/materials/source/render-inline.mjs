import katex from 'katex';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(Object.fromEntries(Object.entries(input).map(([key,tex])=>[key,katex.renderToString(tex,{displayMode:false,throwOnError:true,output:'htmlAndMathml'})]))));
