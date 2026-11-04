import test from 'node:test';
import assert from 'node:assert/strict';
import {leastSquares,basis1D,basis2D,gaussian1D,gaussian2D,sum1D,target1D,fit1D,fit2D,error1D,error2D,sampleX} from '../dist/basis-math.js';
const close=(a,b,tolerance=1e-8)=>assert.ok(Math.abs(a-b)<tolerance,`${a} vs ${b}`);

test('QR least squares recovers known signed coefficients in an overdetermined Gaussian basis',()=>{
  const gs=basis1D(8),weights=[.4,-.2,.7,1.1,-.3,.05,.12,-.08],a=sampleX.map(x=>gs.map(g=>gaussian1D(x,g))),y=a.map(row=>row.reduce((s,v,i)=>s+v*weights[i],0));
  const result=leastSquares(a,y);assert.equal(result.rank,8);result.weights.forEach((w,i)=>close(w,weights[i]));assert.ok(result.sse<1e-20);
});
test('redundant columns return a finite optimal fit and a reduced numerical rank',()=>{
  const result=leastSquares([[1,1],[2,2],[3,3]],[2,4,6]);assert.equal(result.rank,1);close(result.weights[0]+result.weights[1],2);assert.ok(result.sse<1e-20);
  const zero=leastSquares([[0,0],[0,0]],[1,2]);assert.equal(zero.rank,0);assert.equal(zero.sse,5);
});
test('the least-squares residual is orthogonal to each fixed Gaussian column',()=>{
  const gs=basis1D(12),result=fit1D(gs,'detail');gs.forEach((g,i)=>g.a=result.weights[i]);
  for(const g of gs){const inner=sampleX.reduce((s,x)=>s+gaussian1D(x,g)*(sum1D(x,gs)-target1D(x,'detail')),0);close(inner,0,1e-8);}
  close(error1D(gs,'detail').sse,result.sse);
});
test('adding nested basis functions cannot increase the optimal sampled SSE',()=>{
  for(const kind of ['bumps','wave','detail']){let previous=Infinity;for(let n=1;n<=18;n++){const result=fit1D(basis1D(n),kind);assert.ok(result.sse<=previous+1e-9);previous=result.sse;}}
  const gs=basis1D(18),fit=fit1D(gs);assert.ok(Math.sqrt(fit.sse/401)<.002);
});
test('2D kernels have peak one, respect rotated axes, and support the same LSE solve',()=>{
  const g={x:.2,y:-.3,sx:.7,sy:.2,angle:37,a:1},t=g.angle*Math.PI/180;
  close(gaussian2D(g.x,g.y,g),1);close(gaussian2D(g.x+g.sx*Math.cos(t),g.y+g.sx*Math.sin(t),g),Math.exp(-.5));
  const gs=basis2D(8),before=error2D(gs),result=fit2D(gs);gs.forEach((g,i)=>g.a=result.weights[i]);assert.ok(error2D(gs)<before*.5);assert.equal(result.rank,8);
});
