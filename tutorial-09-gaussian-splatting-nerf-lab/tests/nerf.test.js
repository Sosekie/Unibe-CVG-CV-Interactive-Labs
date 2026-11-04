import test from 'node:test';
import assert from 'node:assert/strict';
import {TinyRadianceField,NerfFitter,integrateSamples,makeRay,marchRay,rayLossGradient,makeNerfData,NERF_RESERVED} from '../dist/nerf-math.js';

test('homogeneous ray integration preserves optical thickness under subdivision',()=>{
  const bg=[.9,.8,.7],color=[.1,.3,.6],expectedT=Math.exp(-2),expected=color.map((c,i)=>(1-expectedT)*c+expectedT*bg[i]);
  for(const n of [1,10,100]){
    const result=integrateSamples(Array.from({length:n},()=>({sigma:2,delta:1/n,color})),bg);
    assert.ok(Math.abs(result.t-expectedT)<1e-12);result.color.forEach((v,c)=>assert.ok(Math.abs(v-expected[c])<1e-12));
    assert.ok(Math.abs(result.rows.reduce((s,r)=>s+r.weight,0)+result.t-1)<1e-12);
  }
});
test('MLP density is direction-independent while RGB is direction-dependent; outputs are valid',()=>{
  const field=new TinyRadianceField(),a=field.query([.2,-.1],[0,1]),b=field.query([.2,-.1],[1,0]);
  assert.equal(a.sigma,b.sigma);assert.ok(a.sigma>=0);assert.notDeepEqual(a.color,b.color);assert.ok(a.color.every(v=>v>0&&v<1));
  const f=new NerfFitter(),weights=Array.from(f.model.weights),ray=makeRay(90);
  marchRay((p,d)=>f.model.query(p,d),ray,8);marchRay((p,d)=>f.model.query(p,d),ray,64);
  assert.deepEqual(Array.from(f.model.weights),weights);
});
test('analytic backpropagation through the MLP and ray transmittance matches finite differences',()=>{
  const field=new TinyRadianceField(),ray=makeRay(35,13),target=[.2,.4,.6],gradient=rayLossGradient(field,ray,target,16).gradient,eps=1e-5;
  for(const k of [0,12,240,322,847,864,888,900,967,969]){
    const old=field.weights[k];field.weights[k]=old+eps;const a=rayLossGradient(field,ray,target,16).loss;field.weights[k]=old-eps;const b=rayLossGradient(field,ray,target,16).loss;field.weights[k]=old;
    const numeric=(a-b)/(2*eps);assert.ok(Math.abs(gradient[k]-numeric)<1e-8,`${k}: ${gradient[k]} vs ${numeric}`);
  }
});
test('pixel-only training reduces error, and reserved camera targets cannot influence updates',()=>{
  const data=makeNerfData(),f=new NerfFitter(data),start=f.evaluate([0,1,2]);
  for(let i=0;i<100;i++)f.step();assert.ok(f.evaluate([0,1,2])<start*.15);assert.equal(f.iteration,100);
  const altered=data.map((row,i)=>i===NERF_RESERVED?row.map(r=>({...r,target:[0,0,0]})):row),a=new NerfFitter(data),b=new NerfFitter(altered);
  for(let i=0;i<3;i++){a.step([0,NERF_RESERVED]);b.step([0]);}
  assert.deepEqual(a.model.weights,b.model.weights);assert.equal(a.step([NERF_RESERVED]),false);
  assert.deepEqual(a.frames([0,0,1,3,-1,9,.2]),[0,1]);
  f.reset();assert.equal(f.iteration,0);assert.deepEqual(f.model.weights,new TinyRadianceField().weights);
});
