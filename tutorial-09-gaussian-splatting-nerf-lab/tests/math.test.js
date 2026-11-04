import test from 'node:test';
import assert from 'node:assert/strict';
import {covariance,camera,project,eigen2,composite,loss,gradient,optimizeStep,densityAction,ellipsoidPoint,imageToWorld} from '../dist/math.js';
const near=(a,b,eps=1e-8)=>assert.ok(Math.abs(a-b)<eps,`${a} ≠ ${b}`);

test('covariance squares scales and rotation preserves eigenvalues',()=>{
  assert.deepEqual(covariance([.2,.5,.1]),[[.04000000000000001,0,0],[0,.25,0],[0,0,.010000000000000002]]);
  const c=covariance([.2,.5,.1],57),e=eigen2([c[0].slice(0,2),c[1].slice(0,2)]);
  near(e.major,.5);near(e.minor,.2);near(c[0][1],c[1][0]);
});
test('pinhole projection respects camera axes and near-plane culling',()=>{
  const g={mu:[.4,-.2,0],s:[.2,.3,.1],angle:0};
  const p=project(g,camera(0,0,4),500);
  near(p.u,410);near(p.v,215);near(p.z,4);
  assert.equal(project({...g,mu:[0,0,5]},camera(0,0,4),500),null);
});
test('on-axis covariance falls by four at twice the depth, excluding pixel filter',()=>{
  const g={mu:[0,0,0],s:[.2,.3,.1],angle:25};
  const a=project(g,camera(0,0,4)),b=project(g,camera(0,0,8));
  near((a.cov[0][0]-.3)/4,b.cov[0][0]-.3);
  near(a.cov[0][1]/4,b.cov[0][1]);
});
test('orbit produces an orthonormal camera frame',()=>{
  const {r,eye}=camera(53,-22,6);
  r.forEach((row,i)=>r.forEach((col,j)=>near(row.reduce((s,x,k)=>s+x*col[k],0),i===j?1:0)));
  near(Math.hypot(...eye),6);
});
test('3D ellipsoid surface has the same Mahalanobis level set as the Gaussian covariance',()=>{
  const g={mu:[.55,.3,-.2],s:[.7,.12,.22],angle:57};
  const c=covariance(g.s,g.angle),det=c[0][0]*c[1][1]-c[0][1]*c[1][0];
  for(let i=0;i<12;i++)for(let j=0;j<9;j++){
    const p=ellipsoidPoint(g,i*Math.PI/6,-Math.PI/2+j*Math.PI/8,2),[x,y,z]=p.map((v,k)=>v-g.mu[k]);
    near((c[1][1]*x*x-2*c[0][1]*x*y+c[0][0]*y*y)/det+z*z/c[2][2],4);
  }
  const ends=[ellipsoidPoint(g,0,0),ellipsoidPoint(g,0,Math.PI/2),ellipsoidPoint(g,Math.PI/2,0)];
  ends.forEach((p,i)=>near(Math.hypot(...p.map((v,k)=>v-g.mu[k])),g.s[i]));
});
test('virtual image plane maps back to the same pixel for different camera poses and focal lengths',()=>{
  for(const [yaw,pitch,distance,f] of [[0,0,6,500],[65,30,9,180],[-80,-50,3.5,800]]){
    const cam=camera(yaw,pitch,distance);
    for(const [u,v] of [[0,0],[360,190],[720,380],[465,222]]){
      const world=imageToWorld(cam,u,v,f),g={mu:world,s:[.1,.2,.3],angle:0},p=project(g,cam,f);
      near(p.u,u);near(p.v,v);near(p.z,1.2);
    }
  }
});
test('front-to-back weights include residual background and order changes only color',()=>{
  const red={alpha:.5,color:[1,0,0]},blue={alpha:.5,color:[0,0,1]};
  const a=composite([red,blue],[0,0,0]),b=composite([blue,red],[0,0,0]);
  assert.deepEqual(a.color,[.5,0,.25]);assert.deepEqual(b.color,[.25,0,.5]);near(a.t,b.t);near(a.t,.25);
  const c=composite([red,blue,red],[1,1,1]);near(c.t,.125);near(c.rows.reduce((s,r)=>s+r.weight,0)+c.t,1);
  assert.deepEqual(composite([],[.2,.4,.6]).color,[.2,.4,.6]);
});
test('analytic mean, log-scale, and amplitude gradients match finite differences',()=>{
  const gs=[{mu:-.3,s:.7,a:.55},{mu:.5,s:.4,a:.75}],grad=gradient(gs),eps=1e-5;
  for(let i=0;i<gs.length;i++)for(const param of ['mu','ls','a']){
    const plus=structuredClone(gs),minus=structuredClone(gs);
    if(param==='ls'){plus[i].s*=Math.exp(eps);minus[i].s*=Math.exp(-eps);}else{plus[i][param]+=eps;minus[i][param]-=eps;}
    near(grad[i][param],(loss(plus)-loss(minus))/(2*eps),1e-7);
  }
});
test('toy optimizer converges and frozen groups remain fixed',()=>{
  let gs=[{mu:-.25,s:.7,a:.45},{mu:.35,s:.72,a:.45}];const before=loss(gs);
  assert.deepEqual(optimizeStep(gs,.8,{means:false,scales:false,amplitudes:false}),gs);
  for(let i=0;i<300;i++)gs=optimizeStep(gs,.8);
  assert.ok(loss(gs)<before*1e-6);assert.ok(gs.every(g=>g.s>0));
});
test('density controls split, clone, prune, keep and strict thresholds',()=>{
  const candidates=[{mu:-.25,s:.9,a:.65},{mu:.2,s:.22,a:.32},{mu:1.8,s:.18,a:.03}];
  const pass=densityAction(candidates,.025,.5,.08);
  assert.equal(pass.gs.length,4);assert.ok(pass.actions.some(a=>a.startsWith('Split')));assert.ok(pass.actions.some(a=>a.startsWith('Cloned')));assert.ok(pass.actions.some(a=>a.startsWith('Pruned')));
  assert.deepEqual(densityAction(candidates,1,.5,0).gs,candidates);
  assert.equal(densityAction(candidates,1,.5,1).gs.length,0);
  const one=[candidates[1]],g=Math.abs(gradient(one)[0].mu);
  assert.equal(densityAction(one,g,.5,0).actions.length,0);
});
