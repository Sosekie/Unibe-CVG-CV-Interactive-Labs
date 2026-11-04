import test from 'node:test';
import assert from 'node:assert/strict';
import {referencePrimitives,intersectPrimitive,tracePrimitives,renderPrimitives,primitiveSeeds} from '../dist/primitives.js';
import {camera} from '../dist/math.js';
import {readFileSync} from 'node:fs';

test('opaque reference rays hit the analytic plane, box, sphere and thin cylinder',()=>{
  const [plane,box,sphere,cylinder]=referencePrimitives();
  assert.equal(intersectPrimitive([0,2,0],[0,-1,0],plane).t,2.75);
  assert.ok(Math.abs(intersectPrimitive([-.65,-.25,2],[0,0,-1],box).t-1.6)<1e-12);
  assert.ok(Math.abs(intersectPrimitive([.56,-.25,2],[0,0,-1],sphere).t-1.38)<1e-12);
  assert.ok(Math.abs(intersectPrimitive([.15,0,2],[0,0,-1],cylinder).t-2.565)<1e-12);
  assert.equal(intersectPrimitive([5,2,0],[0,-1,0],plane),null);
  assert.equal(tracePrimitives([0,3,0],[0,1,0]),null);
  const near={type:'sphere',center:[0,0,0],radius:1,color:[1,0,0]},far={...near,center:[0,0,-4]};
  assert.equal(tracePrimitives([0,0,3],[0,0,-1],[far,near]).primitive,near);
});
test('reference images use independent surface rendering with no Gaussian renderer dependency',()=>{
  const source=readFileSync(new URL('../dist/primitives.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/reconstruction-math|renderScene|footprint|project\(/);
  const a=renderPrimitives(camera(0,18,6.2)),b=renderPrimitives(camera(90,18,6.2));assert.notDeepEqual(a,b);assert.equal(a.length,80*60*3);
  assert.ok(a.some(v=>v<.3));assert.ok(a.every(v=>v>=0&&v<=1));
  const seeds=primitiveSeeds();assert.equal(seeds.length,64);assert.ok(seeds.every(p=>p.length===3&&p.every(Number.isFinite)));
});
