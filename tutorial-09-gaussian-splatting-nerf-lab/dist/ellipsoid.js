import {camera,mv,dot,ellipsoidPoint,imageToWorld,eigen2} from './math.js';

const add=(a,b)=>a.map((x,i)=>x+b[i]);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const times=(v,k)=>v.map(x=>x*k);
const normalize=v=>times(v,1/(Math.hypot(...v)||1));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const TAU=2*Math.PI;

function path(ctx,points,color,width=1,dash=[],close=false,fill=null){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  if(close)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);
}
function label(ctx,text,p,color='#4f6e86',align='left'){
  ctx.font='16px Arial, sans-serif';ctx.textAlign=align;
  ctx.lineWidth=4;ctx.strokeStyle='#f5faff';ctx.strokeText(text,p[0],p[1]);
  ctx.fillStyle=color;ctx.fillText(text,p[0],p[1]);ctx.textAlign='left';
}
function arrow(ctx,a,b,color,width=2){
  path(ctx,[a,b],color,width);const t=Math.atan2(b[1]-a[1],b[0]-a[0]);
  path(ctx,[[b[0]-9*Math.cos(t-.45),b[1]-9*Math.sin(t-.45)],b,[b[0]-9*Math.cos(t+.45),b[1]-9*Math.sin(t+.45)]],color,width);
}
function wireframe(ctx,g,screen,color='#ad773b88',width=1){
  for(let lat=-2;lat<=2;lat++)path(ctx,Array.from({length:65},(_,i)=>screen(ellipsoidPoint(g,TAU*i/64,lat*Math.PI/6))),color,width);
  for(let lon=0;lon<10;lon++)path(ctx,Array.from({length:49},(_,i)=>screen(ellipsoidPoint(g,lon*TAU/10,-Math.PI/2+Math.PI*i/48))),color,width);
}

export function drawEllipsoid(canvas,g,renderCamera,f,projected,observer){
  const ctx=canvas.getContext('2d');canvas.width=720;canvas.height=560;
  ctx.fillStyle='#f5faff';ctx.fillRect(0,0,720,560);
  const inspection=camera(observer.yaw,observer.pitch,8);
  // Orthographic close-up: fixed world-unit scale, centered at the current μ.
  const screen=p=>{const q=mv(inspection.r,sub(p,g.mu));return [360+q[0]*200,182+q[1]*200,q[2]];};
  for(let t=-1.5;t<=1.5;t+=.5){
    path(ctx,[screen(add(g.mu,[-1.5,-1.05,t])),screen(add(g.mu,[1.5,-1.05,t]))],'#e0eaf2');
    path(ctx,[screen(add(g.mu,[t,-1.05,-1.5])),screen(add(g.mu,[t,-1.05,1.5]))],'#e0eaf2');
  }
  // Filled triangles give depth cues; the wireframe identifies the 1σ level set.
  const faces=[];
  for(let j=0;j<14;j++)for(let i=0;i<28;i++){
    const a=ellipsoidPoint(g,i*TAU/28,-Math.PI/2+j*Math.PI/14),b=ellipsoidPoint(g,(i+1)*TAU/28,-Math.PI/2+j*Math.PI/14);
    const c=ellipsoidPoint(g,(i+1)*TAU/28,-Math.PI/2+(j+1)*Math.PI/14),d=ellipsoidPoint(g,i*TAU/28,-Math.PI/2+(j+1)*Math.PI/14);
    for(const vertices of [[a,b,c],[a,c,d]]){
      const points=vertices.map(screen),normal=normalize(cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0])));
      faces.push({points,depth:points.reduce((s,p)=>s+p[2],0)/3,light:.6+.4*Math.abs(dot(normal,normalize([-.4,1,1])))});
    }
  }
  faces.sort((a,b)=>b.depth-a.depth).forEach(face=>{
    const color=g.color.map(v=>Math.round(255*(.55+.45*v*face.light)));
    path(ctx,face.points,'transparent',0,[],true,`rgba(${color.join(',')},0.68)`);
  });
  wireframe(ctx,g,screen,'#95632875',1.2);
  const t=g.angle*Math.PI/180;
  const axes=[[[Math.cos(t),Math.sin(t),0],'sₓ','#b56c39'],[[-Math.sin(t),Math.cos(t),0],'sᵧ','#398c7d'],[[0,0,1],'s_z','#478cb8']];
  axes.forEach(([axis,name,color],i)=>{
    const extent=times(axis,g.s[i]);path(ctx,[screen(sub(g.mu,extent)),screen(add(g.mu,extent))],color,2.6);
    const end=screen(add(g.mu,times(axis,g.s[i]+.14)));label(ctx,name,end,color);
  });
  ctx.fillStyle='#925d28';ctx.beginPath();ctx.arc(...screen(g.mu).slice(0,2),4,0,TAU);ctx.fill();
  const towardCamera=normalize(sub(renderCamera.eye,g.mu));
  // A direction indicator stays legible even when the actual camera is outside
  // the close-up. Its direction is the observer projection of the viewing ray.
  const q=mv(inspection.r,towardCamera),direction=normalize([q[0],q[1],0]);
  arrow(ctx,[608+direction[0]*30,275+direction[1]*30],[608-direction[0]*30,275-direction[1]*30],'#268eb8',2.5);
  label(ctx,'viewing ray',[608,327],'#2585ac','center');
  label(ctx,'1σ ellipsoid · centered on μ',[18,27]);

  // Actual camera rig, at a separate fixed overview scale. All points here use
  // their true world positions. The virtual image plane is at camera z = 1.2.
  ctx.fillStyle='#edf5fb';ctx.fillRect(0,366,720,194);
  path(ctx,[[0,366],[720,366]],'#cfdfec');
  label(ctx,'CAMERA RIG · actual world geometry',[18,390]);
  const rigCenter=times(renderCamera.eye,.45);
  const rig=p=>{const q=mv(inspection.r,sub(p,rigCenter));return [360+q[0]*29,477+q[1]*29,q[2]];};
  for(let i=-3;i<=3;i++){
    path(ctx,[rig([i,-1,-3]),rig([i,-1,3])],'#dae7f0');
    path(ctx,[rig([-3,-1,i]),rig([3,-1,i])],'#dae7f0');
  }
  const eye=rig(renderCamera.eye),plane=[[0,0],[720,0],[720,380],[0,380]].map(([u,v])=>imageToWorld(renderCamera,u,v,f));
  const planeCenter=imageToWorld(renderCamera,360,190,f);
  for(const corner of plane)path(ctx,[eye,rig(corner)],'#529bbe99',1.5);
  path(ctx,plane.map(rig),'#398fb6',1.5,[],true,'#77bcde28');
  arrow(ctx,eye,rig(add(renderCamera.eye,times(renderCamera.r[2],2.1))),'#2c8eb8',1.5);
  path(ctx,[eye,rig(g.mu)],'#bd8b4e',1.3,[4,4]);
  if(projected){
    const e=eigen2(projected.cov),outline=Array.from({length:65},(_,i)=>{
      const a=i*TAU/64,x=e.major*Math.cos(a),y=e.minor*Math.sin(a);
      return rig(imageToWorld(renderCamera,projected.u+x*Math.cos(e.angle)-y*Math.sin(e.angle),projected.v+x*Math.sin(e.angle)+y*Math.cos(e.angle),f));
    });path(ctx,outline,'#b47732',2);
  }
  wireframe(ctx,g,rig,'#aa7137',1.2);
  ctx.fillStyle='#2a8eb9';ctx.beginPath();ctx.arc(eye[0],eye[1],4,0,TAU);ctx.fill();
  path(ctx,[eye,[610,415]],'#82adc5',1);label(ctx,'camera',[690,418],'#287ea4','right');
  const pc=rig(planeCenter);path(ctx,[pc,[592,538]],'#82adc5',1);label(ctx,'image plane',[690,542],'#287ea4','right');
  const mean=rig(g.mu);label(ctx,'μ',[mean[0]-17,mean[1]-10],'#a16b30');
  // Fixed world triad in the close-up, independent of the rendering camera.
  for(const [axis,name,color] of [[[1,0,0],'x','#b5753d'],[[0,1,0],'y','#4c9283'],[[0,0,1],'z','#5a8fbc']]){
    const q=mv(inspection.r,axis),o=[53,300],end=[o[0]+q[0]*31,o[1]+q[1]*31];path(ctx,[o,end],color,2);label(ctx,name,[end[0]+q[0]*13-3,end[1]+q[1]*13+4],color);
  }
  const renderedAt=renderCamera.eye.map(x=>x.toFixed(2)).join(', ');
  canvas.setAttribute('aria-label',`3D 1-sigma ellipsoid with scales ${g.s.map(x=>x.toFixed(2)).join(', ')}, rotation ${g.angle.toFixed(0)} degrees. Camera at (${renderedAt}). Drag or use arrow keys to inspect; this does not move the rendering camera.`);
}
