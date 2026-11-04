import {mv,transpose,dot} from './math.js';

export const referencePrimitives=()=>[
  {type:'plane',y:-.75,extent:[1.65,1.25],color:[.72,.78,.80]},
  {type:'box',center:[-.65,-.25,0],half:[.43,.50,.40],color:[.88,.49,.22]},
  {type:'sphere',center:[.56,-.25,.12],radius:.5,color:[.16,.61,.72]},
  {type:'cylinder',center:[.15,0,-.62],radius:.055,bottom:-.75,top:.95,color:[.54,.36,.66]}
];
const normalize=v=>{const d=Math.hypot(...v);return v.map(x=>x/d);};
export function intersectPrimitive(origin,direction,primitive){
  const p=primitive,epsilon=1e-5;
  if(p.type==='plane'){
    if(Math.abs(direction[1])<1e-10)return null;const t=(p.y-origin[1])/direction[1],point=origin.map((v,i)=>v+t*direction[i]);
    return t>epsilon&&Math.abs(point[0])<=p.extent[0]&&Math.abs(point[2])<=p.extent[1]?{t,point,normal:[0,1,0],primitive:p}:null;
  }
  if(p.type==='sphere'){
    const o=origin.map((v,i)=>v-p.center[i]),b=dot(o,direction),c=dot(o,o)-p.radius*p.radius,disc=b*b-c;if(disc<0)return null;
    let t=-b-Math.sqrt(disc);if(t<=epsilon)t=-b+Math.sqrt(disc);if(t<=epsilon)return null;const point=origin.map((v,i)=>v+t*direction[i]);return {t,point,normal:point.map((v,i)=>(v-p.center[i])/p.radius),primitive:p};
  }
  if(p.type==='box'){
    let enter=-Infinity,exit=Infinity,axis=0,sign=1;
    for(let k=0;k<3;k++){
      const lo=p.center[k]-p.half[k],hi=p.center[k]+p.half[k];
      if(Math.abs(direction[k])<1e-10){if(origin[k]<lo||origin[k]>hi)return null;continue;}
      const a=(lo-origin[k])/direction[k],b=(hi-origin[k])/direction[k],near=Math.min(a,b),far=Math.max(a,b);
      if(near>enter){enter=near;axis=k;sign=a<b?-1:1;}exit=Math.min(exit,far);if(enter>exit)return null;
    }
    if(enter<=epsilon||exit<=epsilon)return null;const normal=[0,0,0];normal[axis]=sign;return {t:enter,point:origin.map((v,i)=>v+enter*direction[i]),normal,primitive:p};
  }
  if(p.type==='cylinder'){
    const ox=origin[0]-p.center[0],oz=origin[2]-p.center[2],a=direction[0]**2+direction[2]**2,b=ox*direction[0]+oz*direction[2],c=ox*ox+oz*oz-p.radius**2,candidates=[];
    if(a>1e-12){const disc=b*b-a*c;if(disc>=0)for(const t of [(-b-Math.sqrt(disc))/a,(-b+Math.sqrt(disc))/a]){const point=origin.map((v,i)=>v+t*direction[i]);if(t>epsilon&&point[1]>=p.bottom&&point[1]<=p.top)candidates.push({t,point,normal:[(point[0]-p.center[0])/p.radius,0,(point[2]-p.center[2])/p.radius],primitive:p});}}
    if(Math.abs(direction[1])>1e-10)for(const [y,sign]of [[p.bottom,-1],[p.top,1]]){const t=(y-origin[1])/direction[1],point=origin.map((v,i)=>v+t*direction[i]);if(t>epsilon&&(point[0]-p.center[0])**2+(point[2]-p.center[2])**2<=p.radius**2)candidates.push({t,point,normal:[0,sign,0],primitive:p});}
    return candidates.sort((a,b)=>a.t-b.t)[0]||null;
  }
  return null;
}
export function tracePrimitives(origin,direction,primitives=referencePrimitives()){
  let nearest=null;for(const p of primitives){const hit=intersectPrimitive(origin,direction,p);if(hit&&(!nearest||hit.t<nearest.t))nearest=hit;}return nearest;
}
export function renderPrimitives(cam,w=80,h=60,f=84){
  const rgb=new Float64Array(w*h*3),primitives=referencePrimitives(),light=normalize([-.45,1,.65]),world=transpose(cam.r),background=[.94,.965,.985];
  // Four subpixel rays per pixel for independent, opaque surface rendering.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(const [sx,sy]of [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]]){
    const direction=normalize(mv(world,[(x+sx-w/2)/f,(y+sy-h/2)/f,1])),hit=tracePrimitives(cam.eye,direction,primitives);let color=background;
    if(hit){let shade=.35+.65*Math.max(0,dot(hit.normal,light));const shadowOrigin=hit.point.map((v,i)=>v+hit.normal[i]*.001),shadow=tracePrimitives(shadowOrigin,light,primitives);if(shadow)shade*=.65;color=hit.primitive.color.map(v=>v*shade);}
    for(let k=0;k<3;k++)rgb[(y*w+x)*3+k]+=color[k]/4;
  }
  return rgb;
}
export function primitiveSeeds(count=64){
  const pools=[[],[],[],[]],primitives=referencePrimitives(),box=primitives[1],sphere=primitives[2],cylinder=primitives[3];
  for(let i=0;i<32;i++){
    const u=((i*7)%17)/16,v=((i*11)%19)/18;pools[0].push([-1.5+3*u,-.75,-1.1+2.2*v]);
    const axis=i%3,side=i%2?1:-1,p=box.center.map((x,k)=>x+(k===axis?side*box.half[k]:(k===(axis+1)%3?2*u-1:2*v-1)*box.half[k]));pools[1].push(p);
    const yy=1-2*(i+.5)/32,r=Math.sqrt(1-yy*yy),angle=i*2.39996323;pools[2].push(sphere.center.map((x,k)=>x+sphere.radius*[r*Math.cos(angle),yy,r*Math.sin(angle)][k]));
    const t=i*Math.PI*.75;pools[3].push([cylinder.center[0]+cylinder.radius*Math.cos(t),cylinder.bottom+(cylinder.top-cylinder.bottom)*u,cylinder.center[2]+cylinder.radius*Math.sin(t)]);
  }
  return Array.from({length:count},(_,i)=>pools[i%4][Math.floor(i/4)].map((v,k)=>v+.045*Math.sin(i*2.43+k*1.71+.4)));
}
