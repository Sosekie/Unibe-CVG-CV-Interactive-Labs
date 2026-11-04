import {clamp} from './math.js';

export const NERF_BG=[.94,.965,.985],RAY_PIXELS=33,NERF_VIEWS=[-60,60,180,0],NERF_RESERVED=3;
export const sigmoid=x=>1/(1+Math.exp(-clamp(x,-60,60)));
const softplus=x=>Math.max(x,0)+Math.log1p(Math.exp(-Math.abs(x)));
export function encodedPosition(p){return [...p,...[1,2].flatMap(f=>p.flatMap(x=>[Math.sin(f*Math.PI*x),Math.cos(f*Math.PI*x)]))];}

// A compact coordinate MLP: two 24-unit tanh layers, density from position,
// RGB from shared position features plus direction. It is trained, not a stored field grid.
const I=10,H=24;
const W1=0,B1=W1+H*I,W2=B1+H,B2=W2+H*H,WD=B2+H,BD=WD+H,WC=BD+1,BC=WC+3*(H+2),P=BC+3;
export class TinyRadianceField{
  constructor(){
    this.weights=new Float64Array(P);let seed=17;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296-.5;};
    for(const [offset,count,scale]of [[W1,H*I,2/Math.sqrt(I)],[W2,H*H,2/Math.sqrt(H)],[WD,H,2/Math.sqrt(H)],[WC,3*(H+2),2/Math.sqrt(H)]])for(let j=0;j<count;j++)this.weights[offset+j]=random()*scale;
    this.weights[BD]=-1.5;
  }
  query(p,d=[0,1],cache=false){
    const w=this.weights,x=encodedPosition(p),h1=new Float64Array(H),h2=new Float64Array(H);
    for(let j=0;j<H;j++){let v=w[B1+j];for(let k=0;k<I;k++)v+=w[W1+j*I+k]*x[k];h1[j]=Math.tanh(v);}
    for(let j=0;j<H;j++){let v=w[B2+j];for(let k=0;k<H;k++)v+=w[W2+j*H+k]*h1[k];h2[j]=Math.tanh(v);}
    let rho=w[BD];for(let j=0;j<H;j++)rho+=w[WD+j]*h2[j];
    const color=Array.from({length:3},(_,c)=>{let v=w[BC+c];for(let j=0;j<H;j++)v+=w[WC+c*(H+2)+j]*h2[j];v+=w[WC+c*(H+2)+H]*d[0]+w[WC+c*(H+2)+H+1]*d[1];return sigmoid(v);});
    return {sigma:softplus(rho),color,...(cache?{cache:{x,h1,h2,rho,d}}:{})};
  }
  backward(q,dSigma,dColor,gradient){
    const {x,h1,h2,rho,d}=q.cache,w=this.weights,dh2=new Float64Array(H),dh1=new Float64Array(H),dr=dSigma*sigmoid(rho);
    gradient[BD]+=dr;for(let j=0;j<H;j++){gradient[WD+j]+=dr*h2[j];dh2[j]+=dr*w[WD+j];}
    for(let c=0;c<3;c++){
      const dc=dColor[c]*q.color[c]*(1-q.color[c]);gradient[BC+c]+=dc;
      for(let j=0;j<H;j++){gradient[WC+c*(H+2)+j]+=dc*h2[j];dh2[j]+=dc*w[WC+c*(H+2)+j];}
      gradient[WC+c*(H+2)+H]+=dc*d[0];gradient[WC+c*(H+2)+H+1]+=dc*d[1];
    }
    for(let j=0;j<H;j++){const v=dh2[j]*(1-h2[j]*h2[j]);gradient[B2+j]+=v;for(let k=0;k<H;k++){gradient[W2+j*H+k]+=v*h1[k];dh1[k]+=v*w[W2+j*H+k];}}
    for(let j=0;j<H;j++){const v=dh1[j]*(1-h1[j]*h1[j]);gradient[B1+j]+=v;for(let k=0;k<I;k++)gradient[W1+j*I+k]+=v*x[k];}
  }
}
export function makeRay(yaw,pixel=16){
  const a=yaw*Math.PI/180,s=Math.sin(a),c=Math.cos(a),u=(pixel/(RAY_PIXELS-1)*2-1)*.52,origin=[2.5*s,2.5*c],direction=[-s+u*c,-c-u*s],norm=Math.hypot(...direction);direction.forEach((_,i)=>direction[i]/=norm);
  let near=0,far=Infinity;
  for(let k=0;k<2;k++){
    if(Math.abs(direction[k])<1e-12){if(Math.abs(origin[k])>1)return {origin,direction,near:0,far:0};continue;}
    const a=(-1-origin[k])/direction[k],b=(1-origin[k])/direction[k];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));
  }
  return {origin,direction,near,far:Math.max(near,far)};
}
export function referenceRadiance(p,d){
  const [x,z]=p;let sigma=0,color=[.5,.5,.5];
  if(Math.abs(x+.40)<.28&&Math.abs(z-.10)<.45){sigma=11;color=[.86,.42,.18];}
  if((x-.40)**2+(z+.12)**2<.31**2){sigma=13;color=[.12,.61,.76];}
  if(Math.abs(x-.08)<.035&&Math.abs(z-.62)<.21){sigma=18;color=[.55,.33,.66];}
  // Mild directional colour in the synthetic reference; density never uses d.
  return {sigma,color:color.map(v=>clamp(v+.07*d[0],0,1))};
}
export function integrateSamples(samples,bg=NERF_BG){
  let t=1,color=[0,0,0];const rows=[];
  for(const sample of samples){const alpha=-Math.expm1(-sample.sigma*sample.delta),weight=t*alpha;rows.push({...sample,alpha,t,weight});for(let c=0;c<3;c++)color[c]+=weight*sample.color[c];t*=1-alpha;}
  return {color:color.map((v,c)=>v+t*bg[c]),t,rows};
}
export function marchRay(field,ray,n=32,cache=false){
  const delta=(ray.far-ray.near)/n,samples=[];
  if(delta>0)for(let i=0;i<n;i++){const t=ray.near+(i+.5)*delta,p=ray.origin.map((v,k)=>v+t*ray.direction[k]),q=field(p,ray.direction,cache);samples.push({...q,p,distance:t,delta});}
  return integrateSamples(samples);
}
export function rayLossGradient(model,ray,target,n=32){
  const render=marchRay((p,d)=>model.query(p,d,true),ray,n),residual=render.color.map((v,c)=>v-target[c]),gradient=new Float64Array(model.weights.length),gPixel=residual.map(v=>2*v/3);
  let behind=[...NERF_BG];
  for(let i=render.rows.length-1;i>=0;i--){const q=render.rows[i],dColor=gPixel.map(v=>v*q.weight),dSigma=gPixel.reduce((sum,v,c)=>sum+v*q.t*(1-q.alpha)*q.delta*(q.color[c]-behind[c]),0);model.backward(q,dSigma,dColor,gradient);behind=q.color.map((v,c)=>q.alpha*v+(1-q.alpha)*behind[c]);}
  return {gradient,loss:residual.reduce((s,v)=>s+v*v,0)/3,render};
}
export function makeNerfData(){return NERF_VIEWS.map(yaw=>Array.from({length:RAY_PIXELS},(_,pixel)=>{const ray=makeRay(yaw,pixel);return {ray,target:marchRay(referenceRadiance,ray,256).color};}));}
export class NerfFitter{
  constructor(data=makeNerfData()){this.data=data;this.reset();}
  reset(){this.model=new TinyRadianceField();this.iteration=0;this.m=new Float64Array(this.model.weights.length);this.v=new Float64Array(this.model.weights.length);}
  frames(indices){return [...new Set(indices)].filter(i=>Number.isInteger(i)&&i>=0&&i<this.data.length&&i!==NERF_RESERVED);}
  evaluate(indices,n=32){let sum=0,count=0;for(const index of indices)for(const {ray,target}of this.data[index]){const color=marchRay((p,d)=>this.model.query(p,d),ray,n).color;sum+=color.reduce((s,v,c)=>s+(v-target[c])**2,0)/3;count++;}return count?sum/count:null;}
  step(indices=[0,1,2],n=32){
    const frames=this.frames(indices);if(!frames.length)return false;const rays=frames.flatMap(i=>this.data[i]),gradient=new Float64Array(this.model.weights.length),batch=12;
    for(let j=0;j<batch;j++){const {ray,target}=rays[(this.iteration*batch+j*17)%rays.length],g=rayLossGradient(this.model,ray,target,n).gradient;for(let k=0;k<gradient.length;k++)gradient[k]+=g[k]/batch;}
    this.iteration++;const b1=1-.9**this.iteration,b2=1-.999**this.iteration;
    for(let k=0;k<gradient.length;k++){const g=gradient[k];this.m[k]=.9*this.m[k]+.1*g;this.v[k]=.999*this.v[k]+.001*g*g;this.model.weights[k]-=.015*(this.m[k]/b1)/(Math.sqrt(this.v[k]/b2)+1e-8);}
    return true;
  }
}
