import {chromium} from 'playwright';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true});
try{
  for(const filename of process.argv.slice(2)){
    const page=await browser.newPage();await page.goto(pathToFileURL(path.resolve(filename)).href);await page.emulateMedia({media:'print'});await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.locator('.equation').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.textContent));
    if(overflow.length)throw new Error('Equation overflow: '+overflow.join('; '));
    const output=path.resolve('..',path.basename(filename,'.html')+'.pdf');
    await page.pdf({path:output,format:'A4',printBackground:true,margin:{top:'18mm',right:'18mm',bottom:'18mm',left:'18mm'},displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="width:100%;text-align:center;font:9px serif;color:#333"><span class="pageNumber"></span></div>',tagged:true,outline:true});
    await page.close();console.log(output);
  }
}finally{await browser.close();}
