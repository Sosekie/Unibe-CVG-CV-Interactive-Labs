import {questions,ANSWER_STORAGE_KEY} from './questions.js';
import {MixtureLab,DimensionsLab,mountHighResolution} from './foundations.js';
import {VolumeLab} from './volume.js';
import {ColourLab} from './colour.js';
import {NerfLab} from './nerf.js';
import {ReconstructionLab} from './reconstruction.js';
const $=s=>document.querySelector(s);
const modules=[
  {id:'mixture',title:'Approximate in 1D',detail:'Place kernels · fit amplitudes'},
  {id:'dimensions',title:'Extend to 2D',detail:'Mean vectors · covariance'},
  {id:'parameters',title:'Fit a 3D function',detail:'Volumes · slices · field error'},
  {id:'colour',title:'Add colour + opacity',detail:'Projection · blending · ambiguity'},
  {id:'reconstruction',title:'Reconstruct from images',detail:'Primitive scene · limits · density'},
  {id:'nerf',title:'Compare with NeRF',detail:'Neural field · rays · learning'},
  {id:'highres',title:'Explore a real garden',detail:'Captured scene · fine detail'}
];
const mixtureLab=new MixtureLab(),dimensions=new DimensionsLab(),volume=new VolumeLab(),colour=new ColourLab(),reconstruction=new ReconstructionLab(),nerf=new NerfLab();
const controllers=[mixtureLab,dimensions,volume,colour,reconstruction,nerf];
const aliases={projection:'colour',compositing:'colour',density:'reconstruction',optimization:'parameters'};
const route=id=>aliases[id]|| (modules.some(m=>m.id===id)?id:'mixture');
let active=route(location.hash.slice(1)),checked={};
try{checked=JSON.parse(sessionStorage.getItem(ANSWER_STORAGE_KEY)||'{}');if(!checked||typeof checked!=='object')checked={};}catch{}
function activate(id){controllers.forEach(c=>c.unmount());active=route(id);history.replaceState(null,'','#'+active);render();$('#module-nav').scrollIntoView({behavior:'instant',block:'start'});}
function render(){
  $('#module-nav').innerHTML=modules.map((m,i)=>`<button role="tab" id="tab-${m.id}" aria-controls="workspace" aria-selected="${active===m.id}" tabindex="${active===m.id?0:-1}" class="${active===m.id?'active':''}" data-module="${m.id}"><span class="tab-number">0${i+1}</span><span><strong>${m.title}</strong><small>${m.detail}</small></span></button>`).join('');
  $('#module-nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{activate(b.dataset.module);$('#tab-'+active).focus({preventScroll:true});});$('#workspace').setAttribute('aria-labelledby','tab-'+active);
  const el=$('#workspace');
  if(active==='mixture')mixtureLab.mount(el,()=>activate('dimensions'));
  if(active==='dimensions')dimensions.mount(el,()=>activate('parameters'));
  if(active==='parameters')volume.mount(el,gs=>{colour.setGeometry(gs);activate('colour');});
  if(active==='colour')colour.mount(el,()=>activate('reconstruction'));
  if(active==='reconstruction')reconstruction.mount(el,activate);
  if(active==='nerf')nerf.mount(el,()=>activate('highres'),()=>activate('reconstruction'));
  if(active==='highres')mountHighResolution(el,()=>activate('nerf'));
  renderQuestions();
}
function renderQuestions(){
  const group=questions[active],total=Object.values(questions).reduce((sum,q)=>sum+q.length,0);
  $('#questions').innerHTML=`<div class="questions-heading"><div><p class="eyebrow">PREDICT · DERIVE · TEST</p><h2>Reason about the model.</h2><p>Commit to a prediction and explain your assumptions. Use the hint if needed, then compare your reasoning with the worked solution and test it above.</p></div><span class="question-progress">${Object.keys(checked).length} / ${total} checked</span></div><div class="question-list">${group.map((q,i)=>`<article class="question" id="question-${q.id}"><div class="question-topline"><b>Q${modules.findIndex(m=>m.id===active)*2+i+1} / ${q.level}</b><span>SECTION 0${modules.findIndex(m=>m.id===active)+1}</span></div><p class="question-scenario">${q.scenario}</p><h3 id="prompt-${q.id}">${q.title}</h3><div class="answers" role="radiogroup" aria-labelledby="prompt-${q.id}">${q.options.map((o,j)=>`<label class="answer-option"><input type="radio" name="${q.id}" value="${j}" ${checked[q.id]===j?'checked':''}><span>${String.fromCharCode(65+j)} · ${o}</span></label>`).join('')}</div><details class="question-hint"><summary>Show a reasoning hint</summary><p>${q.hint}</p></details><button class="small-button" data-check="${q.id}">Check prediction</button><div id="feedback-${q.id}" aria-live="polite">${feedback(q)}</div><div class="question-extension"><b>EXPLAIN FURTHER</b><p>${q.extension}</p></div><details class="worked"><summary>Show worked reasoning + lab experiment</summary>${q.explanation.map(p=>`<p>${p}</p>`).join('')}<p class="equation">${q.equation.replaceAll('\n','<br>')}</p><h4>Follow-up reasoning</h4><p>${q.extensionAnswer}</p><h4>Test it in the lab</h4><p>${q.experiment}</p><p class="takeaway">${q.takeaway}</p></details></article>`).join('')}</div>`;
  document.querySelectorAll('[data-check]').forEach(b=>b.onclick=()=>{
    const q=group.find(q=>q.id===b.dataset.check),chosen=document.querySelector(`input[name="${q.id}"]:checked`);
    if(!chosen){$('#feedback-'+q.id).innerHTML='<p class="feedback incorrect">Choose a prediction first, and be ready to justify it.</p>';return;}
    checked[q.id]=Number(chosen.value);try{sessionStorage.setItem(ANSWER_STORAGE_KEY,JSON.stringify(checked));}catch{}
    $('#feedback-'+q.id).innerHTML=feedback(q);$('.question-progress').textContent=Object.keys(checked).length+' / '+total+' checked';
  });
}
function feedback(q){
  if(checked[q.id]===undefined)return '';
  const correct=checked[q.id]===q.correct;
  return `<p class="feedback${correct?'':' incorrect'}">${correct?'Correct.':'Reconsider.'} ${q.feedback[checked[q.id]]}</p>`;
}

const validQuestions=Object.values(questions).flat();checked=Object.fromEntries(Object.entries(checked).filter(([id,v])=>validQuestions.some(q=>q.id===id&&Number.isInteger(v)&&v>=0&&v<q.options.length)));
$('#module-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...$('#module-nav').querySelectorAll('button')],focused=buttons.indexOf(e.target.closest('button')),i=focused>=0?focused:modules.findIndex(m=>m.id===active),n=modules.length,next=e.key==='Home'?0:e.key==='End'?n-1:(i+(e.key==='ArrowRight'?1:n-1))%n;activate(modules[next].id);$('#tab-'+active).focus({preventScroll:true});});
$('#reset-all').onclick=()=>{controllers.forEach(c=>c.reset());checked={};try{sessionStorage.removeItem(ANSWER_STORAGE_KEY);}catch{}render();};
// In-page study links retain the current experiment and its question group.
for(const anchor of document.querySelectorAll('a[href="#questions"],a[href="#workspace"]'))anchor.addEventListener('click',e=>{
  e.preventDefault();const target=$(anchor.getAttribute('href'));target.tabIndex=-1;target.scrollIntoView({block:'start'});target.focus({preventScroll:true});
});
window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
render();
