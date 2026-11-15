import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(readFileSync('dist/questions.json','utf8'));
const app=readFileSync('dist/app.js','utf8');
function runInLab(expression){
  const elements={};
  const el=id=>elements[id]??=( {innerHTML:'',textContent:'',value:'',checked:false,style:{},addEventListener(){},querySelectorAll(){return []}} );
  const context={document:{querySelector:s=>el(s.replace(/^#/,'')),getElementById:el},window:{addEventListener(){}},history:{replaceState(){}},location:{hash:''}};
  const source=app.replace(/^const sections = .*?;\n/,`const sections = ${JSON.stringify(data)};\n`).replace(/restoreHash\(\);\s*$/,'');
  vm.runInNewContext(source+'\n'+expression,context);
}

test('handouts and webpage cover the same five stages',()=>{
  assert.deepEqual(data.map(x=>x.id),['ambiguity','learning','sfm','representations','evaluation']);
  for(const section of data){assert.ok(section.questions.length>=2);for(const q of section.questions)assert.ok(q.scenario&&q.a&&q.b&&q.answer_a&&q.answer_b);}
  for(const name of ['exercises.pdf','solutions.pdf'])assert.ok(existsSync('dist/materials/'+name));
  assert.ok(data.find(x=>x.id==='learning').optional_question);
});

test('representation queries describe all four scene locations',()=>{
  runInLab(`current=sections.find(s=>s.id==='representations');representations();for(const mode of ['depth','points','occupancy','gaussian'])for(const query of ['front','rear','empty','wall']){document.querySelector('#rmode').value=mode;document.querySelector('#rquery').value=query;document.querySelector('#rmode').onchange();if(!document.querySelector('#r-answer').textContent)throw Error(mode+': '+query);}`);
});

test('scale alignment and region averages update independently',()=>{
  runInLab(`current=sections.find(s=>s.id==='evaluation');document.querySelector('#scale-slider').value='1';document.querySelector('#pole-slider').value='6';evaluation();if(!document.querySelector('#scale-mse').innerHTML.includes('33.867'))throw Error('initial MSE');if(!document.querySelector('#pole-calc').innerHTML.includes('16.000')||!document.querySelector('#whole-calc').innerHTML.includes('1.067'))throw Error('pole errors');document.querySelector('#scale-fit').onclick();if(!document.querySelector('#scale-mse').innerHTML.includes('0.000'))throw Error('fitted MSE');document.querySelector('#scale-reset').onclick();if(!document.querySelector('#scale-mse').innerHTML.includes('33.867'))throw Error('reset MSE');document.querySelector('#pole-correct').onclick();if(!document.querySelector('#whole-calc').innerHTML.includes('0.000'))throw Error('correct pole');`);
});
