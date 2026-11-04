import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldFitter,fieldLoss,fieldGradient,fieldValue,fieldKernel,isoMesh,targetField} from '../dist/field-math.js';
import {moveAlongRay} from '../dist/colour.js';
import {camera,project} from '../dist/math.js';

test('3D scalar-field derivatives agree with numerical mean, scale, rotation and amplitude derivatives',()=>{
  const f=new FieldFitter(2);f.gs[0].s=[.53,.29,.41];f.gs[0].angle=17;
  const gradient=fieldGradient(f.gs);
  for(let k=0;k<8;k++){
    const a=structuredClone(f.gs),b=structuredClone(f.gs),eps=k===6?.001:1e-5;
    if(k<3){a[0].mu[k]+=eps;b[0].mu[k]-=eps;}
    else if(k<6){a[0].s[k-3]*=Math.exp(eps);b[0].s[k-3]*=Math.exp(-eps);}
    else{const key=k===6?'angle':'a';a[0][key]+=eps;b[0][key]-=eps;}
    const numeric=(fieldLoss(a)-fieldLoss(b))/(2*eps);
    assert.ok(Math.abs(gradient[0][k]-numeric)<1e-8,`${k}: ${gradient[0][k]} vs ${numeric}`);
  }
});
test('3D amplitude LSE preserves every geometric parameter and cannot worsen sample loss',()=>{
  const f=new FieldFitter(8),before=fieldLoss(f.gs),geometry=f.gs.map(({a,...g})=>g);f.fitAmplitudes();
  assert.deepEqual(f.gs.map(({a,...g})=>g),geometry);assert.ok(fieldLoss(f.gs)<=before+1e-12);
  for(const g of f.gs)assert.equal(fieldKernel(g.mu,g),1);
});
test('fitting recovers a Gaussian field and exposes the limits of a single kernel on a ring',()=>{
  const bump=new FieldFitter(1,'bump'),one=new FieldFitter(1,'ring'),many=new FieldFitter(8,'ring');
  for(let i=0;i<160;i++){bump.step();one.step();many.step();}
  assert.ok(fieldLoss(bump.gs,'bump')<1e-7);
  assert.ok(fieldLoss(many.gs,'ring')<fieldLoss(one.gs,'ring')*.3);
  assert.ok(targetField([0,0,0],'ring')<.001);assert.ok(targetField([.75,0,0],'ring')>.99);
  assert.ok(fieldValue([.75,0,0],many.gs)>fieldValue([0,0,0],many.gs));
});
test('isosurface extraction interpolates the chosen level in 3D, with no mesh outside the field range',()=>{
  const tris=isoMesh(p=>p[0],.23,5);assert.ok(tris.length>0);
  for(const tri of tris)for(const p of tri){assert.ok(Math.abs(p[0]-.23)<1e-12);assert.ok(p.every(v=>v>=-1.5&&v<=1.5));}
  assert.deepEqual(isoMesh(()=>0,.5,4),[]);
});
test('single-camera ambiguity experiment preserves projected mean and covariance but changes 3D geometry',()=>{
  const cam=camera(27,13,5),g={mu:[.3,.1,-.2],s:[.4,.2,.3],angle:31,color:[.2,.6,.8],opacity:.7},moved=moveAlongRay(g,cam),a=project(g,cam,600),b=project(moved,cam,600);
  for(const key of ['u','v'])assert.ok(Math.abs(a[key]-b[key])<1e-10);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)assert.ok(Math.abs(a.cov[i][j]-b.cov[i][j])<1e-9);
  assert.notDeepEqual(g.mu,moved.mu);assert.deepEqual(g.color,moved.color);assert.equal(g.opacity,moved.opacity);
  const other=camera(-30,13,5);assert.ok(Math.abs(project(g,other,600).u-project(moved,other,600).u)>5);
});
