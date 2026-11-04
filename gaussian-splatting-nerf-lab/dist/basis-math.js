// Function approximation with unnormalized Gaussian basis functions. Weights
// may be signed; this is not restricted to probability-mixture coefficients.
export const gaussian1D=(x,g)=>Math.exp(-.5*((x-g.mu)/g.s)**2);
export const sum1D=(x,gs)=>gs.reduce((s,g)=>s+g.a*gaussian1D(x,g),0);
export const sampleX=Array.from({length:401},(_,i)=>-3+6*i/400);
export function target1D(x,kind='bumps'){
  if(kind==='wave')return .65*Math.sin(2.3*x)+.18*Math.cos(5.1*x);
  if(kind==='detail')return .15+.5/(1+Math.exp(-15*(x+.8)))-.5/(1+Math.exp(-15*(x-.7)))+.4*Math.exp(-(((x-1.35)/.16)**2));
  return .12+.82*Math.exp(-.5*((x+.95)/.40)**2)+.58*Math.exp(-.5*((x-.85)/.62)**2);
}
function vanDerCorput(n){let out=0,scale=.5;while(n){out+=(n%2)*scale;n=Math.floor(n/2);scale/=2;}return out;}
export function basis1D(n,width=.48){return Array.from({length:n},(_,i)=>({mu:6*vanDerCorput(i+1)-3,s:width,a:.25}));}

// Column-pivoted Householder QR solves min ||A w - y||². Numerical rank is
// detected relative to the largest initial column norm; redundant coefficients
// are set to zero. No ridge penalty or hidden nonlinear fitting is used.
export function leastSquares(matrix,target){
  const m=matrix.length,n=matrix[0]?.length||0;
  if(!m||!n)return {weights:[],rank:0,sse:target.reduce((s,y)=>s+y*y,0)};
  if(target.length!==m||matrix.some(r=>r.length!==n))throw new Error('Least-squares dimensions must agree.');
  const a=matrix.map(r=>Float64Array.from(r)),b=Float64Array.from(target),permutation=Array.from({length:n},(_,i)=>i);
  let rank=0,scale=0;
  for(let k=0;k<Math.min(m,n);k++){
    let best=k,norm2=-1;
    for(let j=k;j<n;j++){let s=0;for(let i=k;i<m;i++)s+=a[i][j]**2;if(s>norm2){norm2=s;best=j;}}
    const norm=Math.sqrt(norm2);if(k===0)scale=norm;
    if(norm<=Math.max(1e-12,scale*1e-10))break;
    if(best!==k){for(let i=0;i<m;i++)[a[i][k],a[i][best]]=[a[i][best],a[i][k]];[permutation[k],permutation[best]]=[permutation[best],permutation[k]];}
    const alpha=a[k][k]>=0?-norm:norm,v=new Float64Array(m-k);for(let i=k;i<m;i++)v[i-k]=a[i][k];v[0]-=alpha;
    let square=0;for(const x of v)square+=x*x;
    for(let j=k;j<n;j++){let projection=0;for(let i=k;i<m;i++)projection+=v[i-k]*a[i][j];projection*=2/square;for(let i=k;i<m;i++)a[i][j]-=projection*v[i-k];}
    let projection=0;for(let i=k;i<m;i++)projection+=v[i-k]*b[i];projection*=2/square;for(let i=k;i<m;i++)b[i]-=projection*v[i-k];
    a[k][k]=alpha;for(let i=k+1;i<m;i++)a[i][k]=0;rank++;
  }
  const ordered=new Float64Array(n),weights=new Float64Array(n);
  for(let i=rank-1;i>=0;i--){let v=b[i];for(let j=i+1;j<rank;j++)v-=a[i][j]*ordered[j];ordered[i]=v/a[i][i];}
  for(let i=0;i<n;i++)weights[permutation[i]]=ordered[i];
  let sse=0;for(let i=0;i<m;i++){let prediction=0;for(let j=0;j<n;j++)prediction+=matrix[i][j]*weights[j];sse+=(prediction-target[i])**2;}
  return {weights:Array.from(weights),rank,sse};
}
export function fit1D(gs,kind='bumps'){return leastSquares(sampleX.map(x=>gs.map(g=>gaussian1D(x,g))),sampleX.map(x=>target1D(x,kind)));}
export function error1D(gs,kind='bumps'){const sse=sampleX.reduce((s,x)=>s+(sum1D(x,gs)-target1D(x,kind))**2,0);return {sse,rmse:Math.sqrt(sse/sampleX.length)};}
export function gaussian2D(x,y,g){const t=g.angle*Math.PI/180,c=Math.cos(t),s=Math.sin(t),dx=x-g.x,dy=y-g.y;return Math.exp(-.5*(((c*dx+s*dy)/g.sx)**2+((-s*dx+c*dy)/g.sy)**2));}
export const sum2D=(x,y,gs)=>gs.reduce((s,g)=>s+g.a*gaussian2D(x,y,g),0);
export function target2D(x,y){return .04+.9*gaussian2D(x,y,{x:-.8,y:-.55,sx:.60,sy:.24,angle:32})+.65*gaussian2D(x,y,{x:.85,y:.65,sx:.42,sy:.65,angle:-25});}
const sites=[[-.8,-.55],[.85,.65],[0,0],[-1,1],[1,-1],[-1.65,0],[1.65,0],[0,-1.65],[0,1.65],[-1.5,-1.5],[1.5,1.5],[-1.5,1.5],[1.5,-1.5],[-.7,.1],[.65,-.3],[.1,.8]];
export function basis2D(n){return Array.from({length:n},(_,i)=>({x:sites[i][0],y:sites[i][1],sx:.5,sy:.5,angle:0,a:.3}));}
export const sampleXY=Array.from({length:31*31},(_,i)=>[-2+4*(i%31)/30,-2+4*Math.floor(i/31)/30]);
export function fit2D(gs){return leastSquares(sampleXY.map(([x,y])=>gs.map(g=>gaussian2D(x,y,g))),sampleXY.map(([x,y])=>target2D(x,y)));}
export function error2D(gs){return Math.sqrt(sampleXY.reduce((s,[x,y])=>s+(sum2D(x,y,gs)-target2D(x,y))**2,0)/sampleXY.length);}
