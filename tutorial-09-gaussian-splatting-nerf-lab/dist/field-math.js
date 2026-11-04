import {clamp} from './math.js';
import {leastSquares} from './basis-math.js';

export function fieldKernel(p,g){const t=g.angle*Math.PI/180,c=Math.cos(t),s=Math.sin(t),dx=p[0]-g.mu[0],dy=p[1]-g.mu[1],dz=p[2]-g.mu[2],q=[c*dx+s*dy,-s*dx+c*dy,dz];return Math.exp(-.5*q.reduce((v,x,i)=>v+(x/g.s[i])**2,0));}
export const fieldValue=(p,gs)=>gs.reduce((v,g)=>v+g.a*fieldKernel(p,g),0);
export function targetField(p,kind='box'){
  if(kind==='ring'){const r=Math.hypot(p[0],p[2]);return Math.exp(-.5*(((r-.75)/.18)**2+(p[1]/.24)**2));}
  const t=25*Math.PI/180,c=Math.cos(t),s=Math.sin(t),x=p[0]-.18,y=p[1]+.12,z=p[2]-.1,q=[(c*x+s*y)/.62,(-s*x+c*y)/.30,z/.43];
  return Math.exp(-.5*q.reduce((v,x)=>v+(kind==='bump'?x*x:x**6),0));
}
export const volumeSamples=Array.from({length:15**3},(_,i)=>[-1.5+3*(i%15)/14,-1.5+3*(Math.floor(i/15)%15)/14,-1.5+3*Math.floor(i/225)/14]);
export function initialField(n=1){const centers=[[-.4,.35,-.3],[.5,-.3,.4],[-.5,-.3,.4],[.5,.3,-.4],[-.5,-.3,-.4],[.5,.3,.4],[-.5,.3,.4],[.5,-.3,-.4]];return centers.slice(0,n).map(mu=>({mu:[...mu],s:[.48,.48,.48],angle:0,a:n===1?.7:.3}));}
export function fieldLoss(gs,kind='box'){return volumeSamples.reduce((loss,p)=>loss+(fieldValue(p,gs)-targetField(p,kind))**2,0)/volumeSamples.length;}
export function fieldGradient(gs,kind='box'){
  const grads=gs.map(()=>Array(8).fill(0));
  for(const p of volumeSamples){const residual=2*(fieldValue(p,gs)-targetField(p,kind))/volumeSamples.length;
    gs.forEach((g,i)=>{const t=g.angle*Math.PI/180,c=Math.cos(t),s=Math.sin(t),dx=p[0]-g.mu[0],dy=p[1]-g.mu[1],qx=c*dx+s*dy,qy=-s*dx+c*dy,qz=p[2]-g.mu[2],k=fieldKernel(p,g),v=g.a*k*residual,ix=qx/g.s[0]**2,iy=qy/g.s[1]**2;
      const d=[c*ix-s*iy,s*ix+c*iy,qz/g.s[2]**2,(qx/g.s[0])**2,(qy/g.s[1])**2,(qz/g.s[2])**2,-qx*qy*(1/g.s[0]**2-1/g.s[1]**2)*Math.PI/180];
      for(let j=0;j<7;j++)grads[i][j]+=v*d[j];grads[i][7]+=residual*k;
    });
  }
  return grads;
}
export class FieldFitter{
  constructor(n=1,kind='box'){this.reset(n,kind);}
  reset(n=this.gs?.length||1,kind=this.kind||'box'){this.gs=initialField(n);this.kind=kind;this.iteration=0;this.clearMoments();}
  clearMoments(){this.time=0;this.m=this.gs.map(()=>Array(8).fill(0));this.v=this.gs.map(()=>Array(8).fill(0));}
  fitAmplitudes(){const result=leastSquares(volumeSamples.map(p=>this.gs.map(g=>fieldKernel(p,g))),volumeSamples.map(p=>targetField(p,this.kind)));this.gs.forEach((g,i)=>g.a=result.weights[i]);this.clearMoments();return result;}
  step(){const gradient=fieldGradient(this.gs,this.kind);this.time++;this.iteration++;const rates=[.03,.03,.03,.025,.025,.025,1.6,.035];
    this.gs.forEach((g,i)=>{const theta=[...g.mu,...g.s.map(Math.log),g.angle,g.a];theta.forEach((_,j)=>{const d=gradient[i][j];this.m[i][j]=.9*this.m[i][j]+.1*d;this.v[i][j]=.999*this.v[i][j]+.001*d*d;theta[j]-=rates[j]*(this.m[i][j]/(1-.9**this.time))/(Math.sqrt(this.v[i][j]/(1-.999**this.time))+1e-8);});g.mu=theta.slice(0,3).map(x=>clamp(x,-1.5,1.5));g.s=theta.slice(3,6).map(x=>clamp(Math.exp(x),.08,1.2));g.angle=clamp(theta[6],-90,90);g.a=clamp(theta[7],-2,2);});
  }
}

// Shared-level isosurfaces of either scalar field, using marching tetrahedra.
export function isoMesh(fn,level=.35,n=16){
  const values=[],points=[],size=n+1,index=(x,y,z)=>z*size*size+y*size+x;
  for(let z=0;z<=n;z++)for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const p=[-1.5+3*x/n,-1.5+3*y/n,-1.5+3*z/n];points.push(p);values.push(fn(p));}
  const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],edges=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],triangles=[];
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const ids=[index(x,y,z),index(x+1,y,z),index(x+1,y+1,z),index(x,y+1,z),index(x,y,z+1),index(x+1,y,z+1),index(x+1,y+1,z+1),index(x,y+1,z+1)];
    for(const tet of tets){const cross=[];for(const [a,b]of edges){const i=ids[tet[a]],j=ids[tet[b]],va=values[i],vb=values[j];if((va<level)===(vb<level))continue;const t=(level-va)/(vb-va);cross.push(points[i].map((v,k)=>v+t*(points[j][k]-v)));}
      if(cross.length===3)triangles.push(cross);
      else if(cross.length===4){
        const center=cross[0].map((_,k)=>cross.reduce((s,p)=>s+p[k],0)/4),u=cross[0].map((v,k)=>v-center[k]),v=cross[1].map((v,k)=>v-center[k]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],side=[normal[1]*u[2]-normal[2]*u[1],normal[2]*u[0]-normal[0]*u[2],normal[0]*u[1]-normal[1]*u[0]],ul=Math.hypot(...u)||1,sl=Math.hypot(...side)||1;
        cross.sort((a,b)=>{const angle=p=>Math.atan2(p.reduce((s,x,k)=>s+(x-center[k])*side[k]/sl,0),p.reduce((s,x,k)=>s+(x-center[k])*u[k]/ul,0));return angle(a)-angle(b);});triangles.push([cross[0],cross[1],cross[2]],[cross[0],cross[2],cross[3]]);
      }
    }
  }
  return triangles;
}
