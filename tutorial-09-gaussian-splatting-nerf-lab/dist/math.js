// All colors are linear RGB. World units are arbitrary. Camera depth is positive.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const transpose=a=>a[0].map((_,j)=>a.map(r=>r[j]));
export const multiply=(a,b)=>a.map(row=>transpose(b).map(col=>dot(row,col)));
export const mv=(a,v)=>a.map(r=>dot(r,v));
export function covariance(s,angle=0){
  const t=angle*Math.PI/180,c=Math.cos(t),q=Math.sin(t);
  const r=[[c,-q,0],[q,c,0],[0,0,1]];
  return multiply(multiply(r,s.map((x,i)=>s.map((_,j)=>i===j?x*x:0))),transpose(r));
}
export function camera(yaw=22,pitch=12,distance=6){
  const y=yaw*Math.PI/180,p=pitch*Math.PI/180;
  const eye=[distance*Math.sin(y)*Math.cos(p),distance*Math.sin(p),distance*Math.cos(y)*Math.cos(p)];
  const r=[[Math.cos(y),0,-Math.sin(y)],[Math.sin(y)*Math.sin(p),-Math.cos(p),Math.cos(y)*Math.sin(p)],[-Math.sin(y)*Math.cos(p),-Math.sin(p),-Math.cos(y)*Math.cos(p)]];
  return {eye,r};
}
// A point on a k-sigma Mahalanobis level set, with the same R diag(s) as Σ.
export function ellipsoidPoint(g,longitude,latitude,radius=1){
  const t=g.angle*Math.PI/180,c=Math.cos(t),q=Math.sin(t);
  const x=radius*g.s[0]*Math.cos(latitude)*Math.cos(longitude);
  const y=radius*g.s[1]*Math.sin(latitude);
  const z=radius*g.s[2]*Math.cos(latitude)*Math.sin(longitude);
  return [g.mu[0]+c*x-q*y,g.mu[1]+q*x+c*y,g.mu[2]+z];
}
// Place a reference-image pixel on a virtual plane at positive camera depth d.
export function imageToWorld(cam,u,v,f=500,d=1.2,w=720,h=380){
  const offset=mv(transpose(cam.r),[(u-w/2)*d/f,(v-h/2)*d/f,d]);
  return cam.eye.map((x,i)=>x+offset[i]);
}
export function project(g,cam,f=500,w=720,h=380){
  const p=mv(cam.r,g.mu.map((x,i)=>x-cam.eye[i]));
  if(p[2]<=.15) return null;
  const [x,y,z]=p,j=[[f/z,0,-f*x/(z*z)],[0,f/z,-f*y/(z*z)]];
  const cov=multiply(multiply(cam.r,covariance(g.s,g.angle)),transpose(cam.r));
  const sc=multiply(multiply(j,cov),transpose(j));
  // Small fixed low-pass footprint keeps subpixel Gaussians visible.
  sc[0][0]+=.3;sc[1][1]+=.3;
  return {u:w/2+f*x/z,v:h/2+f*y/z,z,p,cov:sc,g};
}
export function eigen2(c){
  const a=c[0][0],b=c[0][1],d=c[1][1],v=Math.hypot(a-d,2*b);
  return {major:Math.sqrt(Math.max(.00001,(a+d+v)/2)),minor:Math.sqrt(Math.max(.00001,(a+d-v)/2)),angle:.5*Math.atan2(2*b,a-d)};
}
export function footprint(p,u,v){
  const [a,b]=p.cov[0],d=p.cov[1][1],x=u-p.u,y=v-p.v;
  return Math.exp(-.5*(d*x*x-2*b*x*y+a*y*y)/(a*d-b*b));
}
export function composite(layers,bg=[.96,.98,1]){
  let t=1,c=[0,0,0];const rows=[];
  for(const layer of layers){const alpha=clamp(layer.alpha,0,1),weight=t*alpha;rows.push({...layer,alpha,t,weight});c=c.map((x,k)=>x+weight*layer.color[k]);t*=1-alpha;}
  return {color:c.map((x,k)=>x+t*bg[k]),t,rows};
}
export const bell=(x,mu,s)=>Math.exp(-.5*((x-mu)/s)**2);
export const targetMix=[{mu:-.95,s:.36,a:.70},{mu:.85,s:.48,a:.85}];
export const mixture=(x,gs)=>gs.reduce((sum,g)=>sum+g.a*bell(x,g.mu,g.s),0);
export const samples=Array.from({length:161},(_,i)=>-2.5+5*i/160);
export function loss(gs){return samples.reduce((sum,x)=>sum+(mixture(x,gs)-mixture(x,targetMix))**2,0)/samples.length;}
export function gradient(gs){
  return gs.map(g=>{
    let mu=0,ls=0,a=0;
    for(const x of samples){const b=bell(x,g.mu,g.s),v=g.a*b,e=2*(mixture(x,gs)-mixture(x,targetMix))/samples.length;
      mu+=e*v*(x-g.mu)/(g.s*g.s);ls+=e*v*((x-g.mu)/g.s)**2;a+=e*b;}
    return {mu,ls,a};
  });
}
export function optimizeStep(gs,rate,{means=true,scales=true,amplitudes=true}={}){
  const grad=gradient(gs);
  return gs.map((g,i)=>({mu:clamp(g.mu-(means?rate*grad[i].mu:0),-2.5,2.5),s:clamp(g.s*Math.exp(-(scales?rate*grad[i].ls:0)),.08,1.8),a:clamp(g.a-(amplitudes?rate*grad[i].a:0),.01,1.4)}));
}
export function densityAction(gs,threshold=.04,sizeThreshold=.5,opacityThreshold=.08){
  const grads=gradient(gs),next=[],actions=[];
  gs.forEach((g,i)=>{
    if(g.a<opacityThreshold){actions.push(`Pruned G${i+1}: amplitude ${g.a.toFixed(2)} < ${opacityThreshold.toFixed(2)}`);return;}
    const norm=Math.abs(grads[i].mu);
    if(norm>threshold){
      if(g.s>sizeThreshold){next.push({...g,mu:g.mu-.5*g.s,s:g.s/1.6,a:g.a*.65},{...g,mu:g.mu+.5*g.s,s:g.s/1.6,a:g.a*.65});actions.push(`Split G${i+1}: large scale, |∂L/∂μ|=${norm.toFixed(3)}`);}
      else{next.push({...g},{...g,mu:clamp(g.mu-Math.sign(grads[i].mu)*.15,-2.5,2.5),a:g.a*.5});actions.push(`Cloned G${i+1}: small scale, |∂L/∂μ|=${norm.toFixed(3)}`);}
    }else next.push({...g});
  });
  return {gs:next,actions};
}
export function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
export const colorCSS=c=>`rgb(${c.map(x=>Math.round(clamp(x,0,1)*255)).join(',')})`;
