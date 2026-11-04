import {camera,project,clamp} from './math.js';
import {renderPrimitives,primitiveSeeds} from './primitives.js';

export const IMAGE_W=80,IMAGE_H=60,FOCAL=84,HELD_OUT=9;
export const BACKGROUND=[.94,.965,.985];
const PIXELS=IMAGE_W*IMAGE_H,PARAMS=11;
const clone=gs=>structuredClone(gs);

function projected(gs,cam){return gs.map((g,i)=>{const p=project(g,cam,FOCAL,IMAGE_W,IMAGE_H);return p?{...p,index:i}:null;}).filter(Boolean).sort((a,b)=>a.z-b.z);}
function tile(p){
  const a=p.cov[0][0],b=p.cov[0][1],d=p.cov[1][1],det=a*d-b*b;
  return {a,b,d,det,x0:Math.max(0,Math.floor(p.u-4*Math.sqrt(a))),x1:Math.min(IMAGE_W-1,Math.ceil(p.u+4*Math.sqrt(a))),y0:Math.max(0,Math.floor(p.v-4*Math.sqrt(d))),y1:Math.min(IMAGE_H-1,Math.ceil(p.v+4*Math.sqrt(d)))};
}
function eachPixel(p,fn){
  const t=tile(p);
  for(let y=t.y0;y<=t.y1;y++)for(let x=t.x0;x<=t.x1;x++){
    const dx=x-p.u,dy=y-p.v,rx=(t.d*dx-t.b*dy)/t.det,ry=(t.a*dy-t.b*dx)/t.det,q=dx*rx+dy*ry;
    if(q>16)continue;
    fn(y*IMAGE_W+x,p.g.opacity*Math.exp(-.5*q),rx,ry);
  }
}
function rasterize(gs,cam,cache=false){
  const ps=projected(gs,cam),rgb=new Float64Array(PIXELS*3),trans=new Float64Array(PIXELS).fill(1),saved=[];
  for(const p of ps){
    const before=cache?new Float64Array(PIXELS):null;
    eachPixel(p,(pixel,a)=>{
      const t=trans[pixel],w=t*a;
      if(cache)before[pixel]=t;
      for(let k=0;k<3;k++)rgb[pixel*3+k]+=w*p.g.color[k];
      trans[pixel]*=1-a;
    });
    if(cache)saved.push({p,before});
  }
  for(let i=0;i<PIXELS;i++)for(let k=0;k<3;k++)rgb[3*i+k]+=trans[i]*BACKGROUND[k];
  return {rgb,saved};
}
export function renderScene(gs,cam){return rasterize(gs,cam).rgb;}
export function imageMSE(a,b){let s=0;for(let i=0;i<a.length;i++)s+=(a[i]-b[i])**2;return s/a.length;}

// Projection derivatives are inexpensive central differences of only the 3D
// primitive; the image gradient below differentiates the compositing recurrence.
function perturb(g,k,amount){
  const n={...g,mu:[...g.mu],s:[...g.s]};
  if(k<3)n.mu[k]+=amount;else if(k<6)n.s[k-3]*=Math.exp(amount);else n.angle+=amount;
  return n;
}
function projectionJacobian(g,cam){
  return Array.from({length:7},(_,k)=>{
    const eps=k===6?.02:.0005,a=project(perturb(g,k,eps),cam,FOCAL,IMAGE_W,IMAGE_H),b=project(perturb(g,k,-eps),cam,FOCAL,IMAGE_W,IMAGE_H);
    if(!a||!b)return [0,0,0,0,0];
    return [a.u-b.u,a.v-b.v,a.cov[0][0]-b.cov[0][0],a.cov[0][1]-b.cov[0][1],a.cov[1][1]-b.cov[1][1]].map(x=>x/(2*eps));
  });
}
export function sceneGradient(gs,cam,target){
  const {rgb,saved}=rasterize(gs,cam,true),gradient=gs.map(()=>new Float64Array(PARAMS)),behind=new Float64Array(PIXELS*3);
  for(let i=0;i<PIXELS;i++)behind.set(BACKGROUND,i*3);
  for(let j=saved.length-1;j>=0;j--){
    const {p,before}=saved[j],screen=new Float64Array(5),grad=gradient[p.index];
    eachPixel(p,(pixel,a,rx,ry)=>{
      let da=0;const t=before[pixel];
      for(let k=0;k<3;k++){
        const index=3*pixel+k,dC=2*(rgb[index]-target[index])/(PIXELS*3);
        da+=dC*t*(p.g.color[k]-behind[index]);
        grad[8+k]+=dC*t*a;
        behind[index]=a*p.g.color[k]+(1-a)*behind[index];
      }
      const v=da*a;
      screen[0]+=v*rx;screen[1]+=v*ry;
      screen[2]+=.5*v*rx*rx;screen[3]+=v*rx*ry;screen[4]+=.5*v*ry*ry;
      grad[7]+=v*(1-p.g.opacity); // logit opacity
    });
    const jac=projectionJacobian(p.g,cam);
    for(let k=0;k<7;k++)for(let q=0;q<5;q++)grad[k]+=jac[k][q]*screen[q];
  }
  return {loss:imageMSE(rgb,target),gradient,rgb};
}

export function makeSceneData(){
  const cameras=Array.from({length:12},(_,i)=>camera(-60+i*30,18,6.2));
  // Targets are opaque ray-traced surfaces, independent of Gaussian rendering.
  const images=cameras.map(cam=>renderPrimitives(cam,IMAGE_W,IMAGE_H,FOCAL));
  const seeds=primitiveSeeds(64);
  return {cameras,images,seeds};
}
export function initializeScene(seeds){return seeds.map(mu=>({mu:[...mu],s:[.22,.22,.22],angle:0,opacity:.60,color:[.45,.48,.50]}));}
const logit=x=>Math.log(x/(1-x));
const sigmoid=x=>1/(1+Math.exp(-x));
export class SceneFitter{
  constructor(data){this.data=data;this.reset();}
  reset(count=this.budget||24){this.budget=count;this.gs=initializeScene(this.data.seeds.slice(0,count));this.initial=clone(this.gs);this.iteration=0;this.adamTime=0;this.lastGradient=null;this.clearMoments();}
  clearMoments(){this.m=this.gs.map(()=>new Float64Array(PARAMS));this.v=this.gs.map(()=>new Float64Array(PARAMS));this.adamTime=0;}
  trainingFrames(indices){return [...new Set(indices)].filter(i=>Number.isInteger(i)&&i>=0&&i<this.data.images.length&&i!==HELD_OUT);}
  evaluate(indices,gs=this.gs){const frames=[...new Set(indices)];return frames.length?frames.reduce((s,i)=>s+imageMSE(renderScene(gs,this.data.cameras[i]),this.data.images[i]),0)/frames.length:null;}
  step(indices,anisotropic=true){
    const frames=this.trainingFrames(indices);if(!frames.length)return false;
    const gradients=this.gs.map(()=>new Float64Array(PARAMS));
    for(const i of frames){const result=sceneGradient(this.gs,this.data.cameras[i],this.data.images[i]);for(let j=0;j<this.gs.length;j++)for(let k=0;k<PARAMS;k++)gradients[j][k]+=result.gradient[j][k]/frames.length;}
    this.lastGradient=gradients;this.adamTime++;this.iteration++;
    const rates=[.025,.025,.025,.025,.025,.025,1.1,.04,.025,.025,.025];
    this.gs.forEach((g,j)=>{
      const values=[...g.mu,...g.s.map(Math.log),g.angle,logit(g.opacity),...g.color];
      if(!anisotropic){const common=gradients[j][3]+gradients[j][4]+gradients[j][5];for(let k=3;k<6;k++)gradients[j][k]=common;gradients[j][6]=0;}
      for(let k=0;k<PARAMS;k++){
        const grad=gradients[j][k];this.m[j][k]=.9*this.m[j][k]+.1*grad;this.v[j][k]=.999*this.v[j][k]+.001*grad*grad;
        values[k]-=rates[k]*(this.m[j][k]/(1-.9**this.adamTime))/(Math.sqrt(this.v[j][k]/(1-.999**this.adamTime))+1e-8);
      }
      g.mu=values.slice(0,3).map(x=>clamp(x,-2,2));g.s=values.slice(3,6).map(x=>clamp(Math.exp(x),.045,1.6));g.angle=clamp(values[6],-90,90);g.opacity=clamp(sigmoid(values[7]),.015,.985);g.color=values.slice(8).map(x=>clamp(x,.025,.98));
    });
    return true;
  }
  refine(indices){
    if(!this.lastGradient){const frames=this.trainingFrames(indices);if(!frames.length)return 'Select a training frame before refining.';this.lastGradient=sceneGradient(this.gs,this.data.cameras[frames[0]],this.data.images[frames[0]]).gradient;}
    const low=this.gs.findIndex(g=>g.opacity<.05);
    if(low>=0){this.gs.splice(low,1);this.clearMoments();this.lastGradient=null;return `Pruned G${low+1}: its opacity fell below 0.05. Continue fitting.`;}
    if(this.gs.length>=64)return 'The teaching scene is limited to 64 Gaussians. Continue fitting the current representation.';
    let chosen=0,score=-1;
    this.lastGradient.forEach((grad,i)=>{const s=Math.hypot(...grad.slice(0,3))+.2*Math.hypot(...grad.slice(3,6));if(s>score){score=s;chosen=i;}});
    const g=this.gs[chosen],child=structuredClone(g),largest=Math.max(...g.s),axis=g.s.indexOf(largest),split=largest>.25,t=g.angle*Math.PI/180;
    const direction=axis===0?[Math.cos(t),Math.sin(t),0]:axis===1?[-Math.sin(t),Math.cos(t),0]:[0,0,1];
    const offset=split?largest*.35:.10;
    child.mu=child.mu.map((x,k)=>x+direction[k]*offset);g.mu=g.mu.map((x,k)=>x-direction[k]*offset);
    if(split){child.s=child.s.map(x=>x/1.5);g.s=g.s.map(x=>x/1.5);}
    g.opacity=child.opacity=1-Math.sqrt(1-g.opacity);this.gs.push(child);this.clearMoments();this.lastGradient=null;
    return `${split?'Split':'Cloned'} G${chosen+1}, chosen from training-image gradients. ${this.gs.length} Gaussians now; fit again to adjust the new kernels.`;
  }
}
