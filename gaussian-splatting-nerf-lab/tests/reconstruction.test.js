import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSceneData,SceneFitter,sceneGradient,renderScene,imageMSE,HELD_OUT,IMAGE_W,IMAGE_H} from '../dist/reconstruction-math.js';
const data=makeSceneData();

test('observations expose only images, calibrated cameras, and a noisy seed cloud',()=>{
  assert.deepEqual(Object.keys(data).sort(),['cameras','images','seeds']);
  assert.equal(data.images.length,12);assert.equal(data.seeds.length,64);
  for(const image of data.images){assert.equal(image.length,IMAGE_W*IMAGE_H*3);assert.ok(image.every(v=>Number.isFinite(v)&&v>=0&&v<=1));}
  assert.notDeepEqual(data.images[0],data.images[4]);
});
test('image-based gradients agree with numerical loss derivatives through visibility and projection',()=>{
  const fitter=new SceneFitter(data),gs=fitter.gs;gs[5].s=[.3,.17,.21];gs[5].angle=17;
  const gradient=sceneGradient(gs,data.cameras[0],data.images[0]).gradient;
  for(const k of [0,1,2,3,4,5,6,7,8,9,10]){
    // Keep the finite-difference probe local to avoid crossing the renderer's
    // negligible 4σ truncation boundary while testing a smooth derivative.
    const a=structuredClone(gs),b=structuredClone(gs),eps=k===6?.002:.00001;
    if(k<3){a[5].mu[k]+=eps;b[5].mu[k]-=eps;}
    else if(k<6){a[5].s[k-3]*=Math.exp(eps);b[5].s[k-3]*=Math.exp(-eps);}
    else if(k===6){a[5].angle+=eps;b[5].angle-=eps;}
    else if(k===7){const l=Math.log(gs[5].opacity/(1-gs[5].opacity));a[5].opacity=1/(1+Math.exp(-l-eps));b[5].opacity=1/(1+Math.exp(-l+eps));}
    else{a[5].color[k-8]+=eps;b[5].color[k-8]-=eps;}
    const numerical=(imageMSE(renderScene(a,data.cameras[0]),data.images[0])-imageMSE(renderScene(b,data.cameras[0]),data.images[0]))/(2*eps);
    assert.ok(Math.abs(gradient[5][k]-numerical)<2e-7,`parameter ${k}: ${gradient[5][k]} vs ${numerical}`);
  }
});
test('held-out images never influence fitting, even if their index is requested',()=>{
  const a=new SceneFitter(data),b=new SceneFitter(data);
  assert.deepEqual(a.trainingFrames([0,0,4,HELD_OUT,-1,99,1.2]),[0,4]);
  for(let i=0;i<4;i++){a.step([0,4,HELD_OUT]);b.step([0,4]);}
  assert.deepEqual(a.gs,b.gs);
  const changed={...data,images:data.images.map((im,i)=>i===HELD_OUT?new Float64Array(im.length):im)},c=new SceneFitter(changed);
  for(let i=0;i<4;i++)c.step([0,4]);
  assert.deepEqual(c.gs,b.gs);
  assert.equal(new SceneFitter(data).step([HELD_OUT]),false);
});
test('fitting selected images improves the render; separated views improve this fixture at an unseen pose',()=>{
  const one=new SceneFitter(data),spread=new SceneFitter(data),before=spread.evaluate([0,4,8]);
  for(let i=0;i<100;i++){one.step([0]);spread.step([0,4,8]);}
  assert.ok(one.evaluate([0])<.003);
  assert.ok(spread.evaluate([0,4,8])<before*.2);
  assert.ok(spread.evaluate([HELD_OUT])<one.evaluate([HELD_OUT])*.6);
  assert.ok(spread.evaluate([HELD_OUT])<.01);
});
test('round-only mode preserves isotropy and refinement changes capacity without accessing reference geometry',()=>{
  const fitter=new SceneFitter(data);
  for(let i=0;i<8;i++)fitter.step([0,4,8],false);
  for(const g of fitter.gs){assert.equal(g.s[0],g.s[1]);assert.equal(g.s[1],g.s[2]);assert.equal(g.angle,0);}
  const count=fitter.gs.length,iteration=fitter.iteration,message=fitter.refine([0,4,8]);
  assert.equal(fitter.gs.length,count+1);assert.match(message,/Split|Cloned/);assert.equal(fitter.iteration,iteration);
  assert.equal(fitter.step([0,4,8],false),true);
  assert.ok(fitter.gs.every(g=>g.mu.every(Number.isFinite)&&g.s.every(v=>v>0)&&g.opacity>0&&g.opacity<1));
  fitter.reset();assert.equal(fitter.gs.length,24);assert.equal(fitter.iteration,0);
});

test('initial budget uses a common prefix of the same noisy surface cloud',()=>{
  const small=new SceneFitter(data),large=new SceneFitter(data);small.reset(12);large.reset(48);
  assert.equal(small.gs.length,12);assert.equal(large.gs.length,48);assert.deepEqual(small.gs,large.gs.slice(0,12));
  for(let i=0;i<3;i++)large.step([0,4,8]);large.reset();assert.equal(large.gs.length,48);assert.equal(large.iteration,0);
});

test('density capacity limit still allows pruning low-opacity kernels',()=>{
  const fitter=new SceneFitter(data);fitter.reset(64);assert.match(fitter.refine([0]),/limited to 64/);assert.equal(fitter.gs.length,64);
  fitter.gs[3].opacity=.01;assert.match(fitter.refine([0]),/Pruned/);assert.equal(fitter.gs.length,63);
});
