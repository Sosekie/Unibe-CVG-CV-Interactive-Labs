import {referencePrimitives} from './primitives.js';
import {camera,mv,project,eigen2,clamp,colorCSS} from './math.js';
import {SceneFitter,makeSceneData,renderScene,imageMSE,IMAGE_W,IMAGE_H,FOCAL,HELD_OUT} from './reconstruction-math.js';

const STAGES=[
  {name:'Observe',tag:'SITUATION',claim:'We have photographs, not a finished 3D model.',body:'Follow the camera track and inspect the captured views. Choose which images may supervise the fit. The amber view stays reserved for evaluation.',question:'What can one photograph tell us about depth?',why:'A camera pose tells us how to project a 3D point. Its image tells us what the projection should look like. The track alone does not contain scene appearance.'},
  {name:'Fit',tag:'TASK → ACTION',claim:'One shared 3D scene must explain every selected image.',body:'Start from the noisy seed cloud. Render the selected cameras, compare pixels, and update the same Gaussians. Watch position, shape, opacity, and color change together.',question:'Can a scene fit one image and still be wrong elsewhere?',why:'Each update uses only selected training images. The renderer connects 3D parameter changes to image error. More separated views give different constraints on the same parameters.'},
  {name:'Test',tag:'RESULT',claim:'A new viewpoint tests what the scene actually learned.',body:'The reserved image never contributes a gradient. Compare its target and prediction, then leave the captured views and move the virtual camera continuously.',question:'Does a low training error prove the recovered scene is correct?',why:'A good fit to one image can hide depth errors. Held-out rendering gives additional evidence, while unseen or occluded regions can still remain uncertain.'},
  {name:'Explain',tag:'WHY THIS REPRESENTATION?',claim:'Gaussian shape serves both fitting and fast rendering.',body:'Soft footprints provide gradients; oriented scales cover thin and broad structures; explicit 3D primitives can be projected and composited efficiently.',question:'Which design choice solves which part of the problem?',why:'Try round-only versus anisotropic shapes from the same initialization. A Gaussian scene supports novel-view synthesis; its ellipsoids are not an extracted surface mesh.'}
];
const DEFAULT_VIEWS=[0,4,8];
const format=x=>x===null?'—':x.toFixed(5);

export class ReconstructionLab{
  constructor(){this.data=makeSceneData();this.fitter=new SceneFitter(this.data);this.training=[...DEFAULT_VIEWS];this.frame=0;this.stage=0;this.novel=null;this.anisotropic=true;this.initialView=false;this.referenceView=false;this.seedsVisible=true;this.observer={yaw:-34,pitch:25};this.running=false;this.touring=false;this.log='Ready: choose training views, then fit the shared 3D scene.';this.losses=[];this.lastUpdates=[];this.limit=400;this.element=null;}
  unmount(){this.running=false;this.touring=false;cancelAnimationFrame(this.animation);clearTimeout(this.tourTimer);this.element=null;}
  reset(){this.unmount();this.fitter.reset(24);this.training=[...DEFAULT_VIEWS];this.frame=0;this.novel=null;this.stage=0;this.initialView=false;this.referenceView=false;this.anisotropic=true;this.seedsVisible=true;this.observer={yaw:-34,pitch:25};this.losses=[];this.lastUpdates=[];this.limit=400;this.log='Ready: choose training views, then fit the shared 3D scene.';}
  query(s){return this.element.querySelector(s);}
  mount(element,goTo){
    this.element=element;this.goTo=goTo;
    element.innerHTML=`<div class="module-heading"><div><p class="eyebrow">05 / RECONSTRUCT FROM IMAGES</p><h2>How can these images teach us a scene?</h2><p class="description">Fit images of a plane, box, sphere, and thin post. The reference is made of opaque surfaces; the approximation is made of Gaussians. What can it recover, and where does it struggle?</p></div><aside class="model-note"><strong>Browser experiment</strong>Independently ray-traced surfaces · known camera poses · noisy surface seeds. Only images, poses, and seeds enter the fitter; reference geometry is shown for comparison.</aside></div>
      <div class="story-steps" role="group" aria-label="Reconstruction walkthrough">${STAGES.map((s,i)=>`<button data-stage="${i}"><b>0${i+1}</b><span><strong>${s.name}</strong><small>${s.tag}</small></span></button>`).join('')}</div>
      <div class="story-claim"><div><p class="eyebrow" id="story-stage-tag"></p><h3 id="story-claim"></h3><p id="story-description"></p></div><div class="story-question"><span>PREDICT BEFORE YOU TRY</span><p id="story-prediction"></p></div></div>
      <div class="scene-inputs"><span><b>GIVEN</b> 12 images + calibrated cameras + 64 noisy seed points</span><span><b>LEARNED</b> positions · scales · rotation · opacity · RGB</span><span><b>CHECKED</b> reserved frame 10</span></div>
      <div class="reconstruction-grid">
        <div class="scene-world visual"><div class="visual-toolbar"><span>ONE SHARED 3D SCENE + CAPTURE TRACK</span><button id="story-reset" class="text-button">Reset walkthrough ↺</button></div><canvas id="scene-world" width="720" height="520" tabindex="0" aria-label="3D Gaussian estimate and camera capture track. Click a camera to inspect its frame; drag or use arrow keys to inspect in 3D."></canvas><div class="scene-world-controls"><div class="button-row"><button data-model-view="learned" class="active">Current fit</button><button data-model-view="initial">Initial estimate</button><button data-model-view="reference">Reference primitives</button></div><label><input id="story-seeds" type="checkbox" checked> Seed points</label><button id="story-world-reset" class="text-button">Reset 3D view</button></div><p class="scene-legend"><i class="train-dot"></i>Training camera <i class="test-dot"></i>Reserved camera <i class="other-dot"></i>Other capture <span>Drag to inspect · click a camera to view its image</span></p></div>
        <div class="scene-evidence"><div class="evidence-card"><div class="evidence-heading"><b id="target-heading">CAPTURED TARGET</b><span id="target-role"></span></div><canvas id="scene-target" width="80" height="60" aria-label="Ray-traced reference image of geometric primitives at the selected capture pose"></canvas><p id="target-caption"></p></div><div class="evidence-card"><div class="evidence-heading"><b>RENDERED ESTIMATE</b><span id="render-state"></span></div><canvas id="scene-prediction" width="80" height="60" aria-label="Image rendered from the current estimated 3D Gaussians"></canvas><p id="render-caption"></p></div><div class="evidence-card"><div class="evidence-heading"><b>ABSOLUTE PIXEL ERROR</b><span>×3 FOR VISIBILITY</span></div><canvas id="scene-error" width="80" height="60" aria-label="Absolute RGB difference between target and prediction, amplified three times"></canvas><p id="error-caption"></p></div><div class="scene-scorecard"><p class="eyebrow">EVIDENCE / SAME SCENE, DIFFERENT VIEWS</p><dl><div><dt>Training MSE</dt><dd id="story-train-loss">—</dd></div><div><dt>Reserved-view MSE</dt><dd id="story-test-loss">—</dd></div><div><dt>Gaussians / updates</dt><dd id="story-count">—</dd></div></dl><canvas id="story-loss-chart" width="320" height="90" aria-label="Training and reserved-view error history"></canvas><p><i class="train-line"></i>Training <i class="test-line"></i>Reserved · never optimized</p></div></div>
      </div>
      <section class="capture-strip" aria-label="Select captured views"><div class="capture-heading"><div><p class="eyebrow">SITUATION / YOUR OBSERVATIONS</p><h3>Select the images allowed to teach the scene.</h3></div><button id="story-tour" class="small-button">Play captured views ▷</button></div><div class="capture-scrubber"><label for="story-frame">Inspect frame <output id="story-frame-output"></output></label><input id="story-frame" type="range" min="0" max="11" step="1" value="0"><span id="story-frame-role"></span></div><div class="capture-frames">${this.data.cameras.map((_,i)=>`<div class="capture-frame" data-frame-card="${i}"><button data-capture="${i}" aria-label="Inspect frame ${i+1}${i===HELD_OUT?', reserved for evaluation':''}"><canvas id="capture-${i}" width="80" height="60" aria-hidden="true"></canvas><span>${String(i+1).padStart(2,'0')} <small>${-60+i*30}°</small></span></button><label><input data-training="${i}" type="checkbox" ${i===HELD_OUT?'disabled':''}>${i===HELD_OUT?'Reserved':'Train'}</label></div>`).join('')}</div><div class="capture-presets"><span>Compare coverage:</span><button class="small-button" data-coverage="one">One view</button><button class="small-button" data-coverage="nearby">Three nearby</button><button class="small-button" data-coverage="spread">Three spread out</button><small>Changing the training set restarts from the same seed cloud.</small></div></section>
      <section class="scene-learning" aria-label="Fit and evaluate the scene"><div class="learning-actions"><div><p class="eyebrow">ACTION / RENDER → COMPARE → UPDATE</p><h3>Fit the images, then inspect the consequence.</h3><label class="budget-control">Initial Gaussian budget <select id="story-budget"><option>12</option><option selected>24</option><option>48</option><option>64</option></select></label></div><div class="button-row"><button id="story-run" class="primary-button">Run fitting ▷</button><button id="story-step" class="small-button">1 update</button><button id="story-step25" class="small-button">Fit 25 updates</button><button id="story-refine" class="small-button">Refine density</button><button id="story-restart" class="text-button">Restart fit ↺</button></div></div><div id="story-log" role="status" class="story-log"></div><div class="scene-update-readout"><span id="story-update-description"></span><label><input id="story-anisotropic" type="checkbox" checked> Learn anisotropic shapes</label></div><p class="scene-small-note">Budget, coverage, and shape-mode changes restart from the same seed cloud. First fit and inspect the error near sharp box edges, the thin post, and occlusions. After 10 updates, try density refinement: prune low-opacity kernels, otherwise split or clone using image gradients. More capacity needs fitting and does not guarantee lower error.</p></section>
      <div class="novel-view"><div><p class="eyebrow">RESULT / LEAVE THE TRAINING CAMERAS</p><h3>Can the scene explain another viewpoint?</h3><p>Frame 10 is reserved throughout fitting. Use the free camera to explore the model without a target overlay.</p></div><div><button id="story-heldout" class="small-button">Inspect reserved frame 10 →</button><label class="control"><span>Free camera yaw <output id="story-novel-output">captured view</output></span><input id="story-novel" type="range" min="-60" max="270" step="1" value="-60" aria-label="Free camera yaw"></label></div></div>
      <section class="scene-rationale" aria-label="Why Gaussian splats"><div><p class="eyebrow">WHY THIS CHOICE?</p><h3 id="story-why-title"></h3><p id="story-why"></p></div><div class="rationale-grid"><article><b>Coverage</b><p>Separated views constrain a shared 3D scene. Unseen and occluded surfaces remain uncertain even with more Gaussians.</p><button data-mechanism="colour">Revisit one-view ambiguity →</button></article><article><b>Representation capacity</b><p>Soft ellipsoids approximate sharp opaque surfaces. Compare budgets and round-only shapes; inspect the edges and thin post.</p><button data-mechanism="parameters">Revisit 3D function fitting →</button></article><article><b>Fitting + refinement</b><p>Image gradients adjust existing splats. Splitting or cloning adds capacity; further updates must make that capacity useful.</p><button data-mechanism="colour">Revisit projection + blending →</button></article></div><p class="scene-small-note">The full method uses calibrated real photographs, typically starts from SfM points, optimizes a different image loss, and uses spherical harmonics and GPU rasterization. This bounded experiment uses constant RGB, z-axis rotations, and 80 × 60 synthetic images. The reference uses analytic ray intersections, opaque occlusion, Lambertian shading, and shadows. It is not generated by Gaussian splats. Seed points are noisy surface samples standing in for SfM; reference primitive parameters are not given to the optimizer. <a href="https://arxiv.org/html/2308.04079v1#S3" target="_blank" rel="noreferrer">Original method, §§3–6 ↗</a></p></section>
      <div class="bottom-nav"><span>EXPLICIT SPLATS → NEURAL FIELDS</span><button id="story-next" class="text-button">Next: Compare with a neural radiance field →</button></div>`;
    this.query('#story-reset').onclick=()=>{this.reset();this.mount(element,goTo);};
    this.query('#story-world-reset').onclick=()=>{this.observer={yaw:-34,pitch:25};this.drawWorld();};
    element.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>this.setStage(Number(b.dataset.stage)));
    element.querySelectorAll('[data-capture]').forEach(b=>b.onclick=()=>this.inspect(Number(b.dataset.capture)));
    element.querySelectorAll('[data-training]').forEach(input=>input.onchange=()=>{
      const frame=Number(input.dataset.training);if(input.checked)this.training.push(frame);else this.training=this.training.filter(i=>i!==frame);this.restart('Training set changed. Restarted from the same noisy seeds.');
    });
    element.querySelectorAll('[data-coverage]').forEach(b=>b.onclick=()=>{this.training={one:[0],nearby:[0,1,2],spread:[0,4,8]}[b.dataset.coverage];this.restart('Coverage changed. Compare training and reserved-view errors after fitting.');});
    element.querySelectorAll('[data-model-view]').forEach(b=>b.onclick=()=>{this.initialView=b.dataset.modelView==='initial';this.referenceView=b.dataset.modelView==='reference';this.update();});
    element.querySelectorAll('[data-mechanism]').forEach(b=>b.onclick=()=>goTo(b.dataset.mechanism));
    this.query('#story-next').onclick=()=>goTo('nerf');
    this.query('#story-budget').onchange=e=>{this.fitter.budget=Number(e.target.value);this.restart('Changed the initial Gaussian budget. Restarted from the same noisy surface-seed cloud.');};
    this.query('#story-seeds').onchange=e=>{this.seedsVisible=e.target.checked;this.drawWorld();};
    this.query('#story-frame').oninput=e=>this.inspect(Number(e.target.value));
    this.query('#story-tour').onclick=()=>{this.touring=!this.touring;this.query('#story-tour').textContent=this.touring?'Pause camera tour':'Play captured views ▷';if(this.touring)this.tour();else clearTimeout(this.tourTimer);};
    this.query('#story-run').onclick=()=>{cancelAnimationFrame(this.animation);this.running=!this.running;if(this.running){this.stage=1;this.initialView=false;this.referenceView=false;this.log='Fitting selected images. The reserved frame is evaluated without contributing gradients.';this.fitTick();}this.update();};
    this.query('#story-step').onclick=()=>this.takeSteps(1);
    this.query('#story-step25').onclick=()=>this.takeSteps(25);
    this.query('#story-restart').onclick=()=>this.restart('Restarted from the same noisy seed points.');
    this.query('#story-refine').onclick=()=>{this.running=false;this.initialView=false;this.referenceView=false;this.log=this.fitter.refine(this.training);if(this.fitter.iteration>=this.limit)this.limit+=100;this.record();this.update();};
    this.query('#story-anisotropic').onchange=e=>{this.anisotropic=e.target.checked;this.restart(`${this.anisotropic?'Anisotropic':'Round-only'} model: restarted from the same initialization for comparison.`);};
    this.query('#story-heldout').onclick=()=>{this.stage=2;this.inspect(HELD_OUT);};
    this.query('#story-novel').oninput=e=>{this.novel=Number(e.target.value);this.stage=2;this.update();};
    this.attachWorldControls();
    this.data.images.forEach((rgb,i)=>this.drawImage(this.query('#capture-'+i),rgb));
    this.record();this.update();
  }
  restart(message){this.running=false;cancelAnimationFrame(this.animation);this.fitter.reset();this.initialView=false;this.referenceView=false;this.losses=[];this.lastUpdates=[];this.limit=400;this.log=message;this.record();this.update();}
  setStage(i){this.stage=i;this.novel=null;if(i===2)this.frame=HELD_OUT;if(i===1&&this.training.length)this.frame=this.training[0];this.update();}
  inspect(i){this.frame=i;this.novel=null;this.update();}
  tour(){if(!this.touring||!this.element)return;this.inspect((this.frame+1)%12);this.tourTimer=setTimeout(()=>this.tour(),650);}
  record(){
    const train=this.fitter.evaluate(this.training),test=this.fitter.evaluate([HELD_OUT]);
    const entry={iteration:this.fitter.iteration,train,test};
    if(this.losses.at(-1)?.iteration===entry.iteration)this.losses[this.losses.length-1]=entry;else this.losses.push(entry);
    this.scores=entry;
  }
  takeSteps(n,showFitStage=true){
    if(!this.element)return;if(showFitStage)this.stage=1;this.initialView=false;this.referenceView=false;
    if(!this.training.length){this.log='Select at least one training image first. The reserved image is never used for fitting.';this.running=false;this.update();return;}
    const previous=structuredClone(this.fitter.gs);
    for(let i=0;i<n&&this.fitter.iteration<this.limit;i++)this.fitter.step(this.training,this.anisotropic);
    this.lastUpdates=this.fitter.gs.map((g,i)=>({from:previous[i]?.mu,to:g.mu})).filter(g=>g.from&&Math.hypot(...g.to.map((x,k)=>x-g.from[k]))>.001);
    this.log=`Updated the shared scene from ${this.training.length} training ${this.training.length===1?'image':'images'}. Frame 10 remains evaluation only.`;
    if(this.fitter.iteration>=this.limit){this.running=false;this.log=`Reached ${this.limit} updates. Inspect the reserved view, refine density to continue, or restart with different training images.`;}
    this.record();this.update();
  }
  fitTick(){if(!this.running||!this.element)return;this.takeSteps(1,false);this.animation=requestAnimationFrame(()=>this.fitTick());}
  update(){
    if(!this.element)return;const s=STAGES[this.stage];
    this.element.querySelectorAll('[data-stage]').forEach((b,i)=>{b.classList.toggle('active',i===this.stage);b.setAttribute('aria-pressed',String(i===this.stage));});
    this.query('#story-stage-tag').textContent=s.tag;this.query('#story-claim').textContent=s.claim;this.query('#story-description').textContent=s.body;this.query('#story-prediction').textContent=s.question;
    this.query('#story-why-title').textContent=this.stage===3?'Why Gaussians, rather than isolated points?':'What this step establishes';this.query('#story-why').textContent=s.why;
    this.element.querySelectorAll('[data-training]').forEach(input=>input.checked=this.training.includes(Number(input.dataset.training)));
    this.element.querySelectorAll('[data-frame-card]').forEach(card=>{const i=Number(card.dataset.frameCard);card.classList.toggle('is-training',this.training.includes(i));card.classList.toggle('is-heldout',i===HELD_OUT);card.classList.toggle('is-inspected',this.novel===null&&i===this.frame);});
    this.element.querySelectorAll('[data-capture]').forEach(b=>b.setAttribute('aria-pressed',String(this.novel===null&&Number(b.dataset.capture)===this.frame)));
    this.element.querySelectorAll('[data-model-view]').forEach(b=>{const selected=b.dataset.modelView===(this.referenceView?'reference':this.initialView?'initial':'learned');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
    this.query('#story-seeds').checked=this.seedsVisible;this.query('#story-anisotropic').checked=this.anisotropic;
    this.query('#story-frame').value=this.frame;
    this.query('#story-frame-output').textContent=this.novel===null?`${String(this.frame+1).padStart(2,'0')} / 12`:'free camera';
    this.query('#story-frame-role').textContent=this.novel!==null?'Free-camera preview · select a frame for its target':this.frame===HELD_OUT?'Reserved for evaluation':this.training.includes(this.frame)?'Selected for training':'Observed, not selected for training';
    this.query('#story-run').textContent=this.running?'Pause fitting':'Run fitting ▷';
    for(const id of ['story-run','story-step','story-step25'])this.query('#'+id).disabled=!this.training.length||this.fitter.iteration>=this.limit;
    this.query('#story-refine').disabled=!this.training.length||this.running||this.fitter.iteration<10;this.query('#story-budget').value=this.fitter.budget;
    this.query('#story-log').textContent=this.log;
    this.query('#story-count').textContent=`${this.fitter.gs.length} / ${this.fitter.iteration}`;
    this.query('#story-train-loss').textContent=format(this.scores.train);this.query('#story-test-loss').textContent=format(this.scores.test);
    this.query('.scene-scorecard>.eyebrow').textContent=this.initialView?'CURRENT-FIT METRICS · PREVIEW SHOWS INITIAL':'CURRENT-FIT METRICS · TRAIN / RESERVED';
    this.query('#story-update-description').textContent=this.fitter.iteration?`${this.lastUpdates.length} Gaussian centers moved in the last batch. Faint amber segments in 3D show those movements.`:'Initial Gaussian centers come from the given noisy seed cloud. No manual placement is needed during fitting.';
    this.query('#story-novel-output').textContent=this.novel===null?'captured view':`${this.novel}° · free preview`;
    if(this.novel===null)this.query('#story-novel').value=-60+30*this.frame;
    const gs=this.initialView?this.fitter.initial:this.fitter.gs,cam=this.novel===null?this.data.cameras[this.frame]:camera(this.novel,18,6.2);
    const prediction=renderScene(gs,cam),target=this.novel===null?this.data.images[this.frame]:null;
    this.drawImage(this.query('#scene-prediction'),prediction);
    this.query('#render-state').textContent=this.initialView||this.fitter.iteration===0?'INITIAL':'CURRENT';
    this.query('#render-caption').textContent=`${gs.length} Gaussians · ${this.initialView?'before fitting':this.fitter.iteration+' updates'} · same 3D model at every pose`;
    if(target){
      this.drawImage(this.query('#scene-target'),target);
      const difference=prediction.map((x,i)=>Math.min(1,3*Math.abs(x-target[i])));this.drawImage(this.query('#scene-error'),difference);
      this.query('#target-role').textContent=this.frame===HELD_OUT?'RESERVED':this.training.includes(this.frame)?'TRAINING':'UNSELECTED';
      this.query('#target-caption').textContent=`Ray-traced primitive reference ${this.frame+1} · known pose · yaw ${-60+this.frame*30}°`;
      this.query('#error-caption').textContent=`MSE ${format(imageMSE(prediction,target))} · darker means a closer match`;
    }else{
      this.emptyImage(this.query('#scene-target'),'Free-camera preview');this.emptyImage(this.query('#scene-error'),'Select a captured view');
      this.query('#target-role').textContent='FREE CAMERA';this.query('#target-caption').textContent='Only the prediction is shown in free-camera mode. Select a captured frame to show its target.';this.query('#error-caption').textContent='Inspect novel-view behavior; use frame 10 for a measured comparison.';
    }
    this.drawWorld();this.drawLoss();
  }
  drawImage(canvas,rgb){const ctx=canvas.getContext('2d'),image=ctx.createImageData(IMAGE_W,IMAGE_H);for(let i=0;i<IMAGE_W*IMAGE_H;i++){for(let k=0;k<3;k++)image.data[i*4+k]=255*clamp(rgb[i*3+k],0,1);image.data[i*4+3]=255;}ctx.putImageData(image,0,0);}
  emptyImage(canvas,message){const ctx=canvas.getContext('2d');ctx.fillStyle='#edf4f9';ctx.fillRect(0,0,80,60);ctx.fillStyle='#607e94';ctx.font='5px Arial';ctx.textAlign='center';ctx.fillText(message,40,31);ctx.textAlign='left';}
  drawLoss(){const ctx=this.query('#story-loss-chart').getContext('2d');ctx.clearRect(0,0,320,90);const top=Math.max(...this.losses.flatMap(d=>[d.train||0,d.test]),.000001);for(const [key,color]of [['train','#268eb9'],['test','#bd8544']]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();this.losses.forEach((d,i)=>{if(d[key]===null)return;const x=8+304*i/Math.max(1,this.losses.length-1),y=80-70*d[key]/top;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}}
  drawWorld(){
    if(!this.element)return;const canvas=this.query('#scene-world'),ctx=canvas.getContext('2d');ctx.fillStyle='#f3f9fd';ctx.fillRect(0,0,720,520);
    const observer=camera(this.observer.yaw,this.observer.pitch,12),map=p=>{const q=mv(observer.r,p);return [360+q[0]*44,260+q[1]*44,q[2]];};
    const path=(points,color,width=1,dash=[])=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
    for(let i=-6;i<=6;i++){path([map([i,-1.5,-6]),map([i,-1.5,6])],'#dce8f1');path([map([-6,-1.5,i]),map([6,-1.5,i])],'#dce8f1');}
    const track=Array.from({length:97},(_,i)=>map(camera(-60+i*360/96,18,6.2).eye));path(track,'#a9c6d9',1.5,[5,5]);
    if(!this.initialView&&!this.referenceView)for(const move of this.lastUpdates)path([map(move.from),map(move.to)],'#c28e47',2);
    const gs=this.initialView?this.fitter.initial:this.fitter.gs;
    if(this.referenceView)this.drawReference(map,path);
    if(!this.referenceView)gs.map(g=>({g,p:map(g.mu)})).sort((a,b)=>b.p[2]-a.p[2]).forEach(({g,p})=>{
      // Orthographic covariance projection from a distant inspection camera.
      const inspection={...observer,eye:observer.eye.map(x=>x*10000)},o=project(g,inspection,44*120000,720,520);
      if(!o)return;const e=eigen2(o.cov);ctx.save();ctx.translate(p[0],p[1]);ctx.rotate(e.angle);ctx.fillStyle=colorCSS(g.color);ctx.globalAlpha=.22+.45*g.opacity;ctx.beginPath();ctx.ellipse(0,0,Math.max(1,e.major),Math.max(1,e.minor),0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.9;ctx.strokeStyle=colorCSS(g.color.map(x=>x*.7));ctx.lineWidth=1;ctx.stroke();ctx.restore();
    });
    if(this.seedsVisible){ctx.strokeStyle='#408dae';ctx.lineWidth=1;for(const seed of this.data.seeds){const p=map(seed);ctx.beginPath();ctx.arc(p[0],p[1],2.8,0,Math.PI*2);ctx.stroke();}}
    this.cameraHits=[];
    this.data.cameras.forEach((cam,i)=>{
      const p=map(cam.eye),selected=this.novel===null&&i===this.frame,color=i===HELD_OUT?'#be8643':this.training.includes(i)?'#268eb9':'#92a9bc';this.cameraHits.push({x:p[0],y:p[1],frame:i});
      const center=map([0,0,0]),length=Math.hypot(center[0]-p[0],center[1]-p[1]),dx=(center[0]-p[0])/length,dy=(center[1]-p[1])/length;
      path([[p[0]+dx*14,p[1]+dy*14],[p[0]-dy*5,p[1]+dx*5],[p[0]+dy*5,p[1]-dx*5],[p[0]+dx*14,p[1]+dy*14]],color,1.4);
      if(selected){path([p,map([0,0,0])],color,1.6,[4,4]);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],14,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle=color;ctx.beginPath();ctx.arc(p[0],p[1],selected?7:5,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.font='15px ui-monospace, monospace';ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),p[0],p[1]-19);
    });ctx.textAlign='left';
    if(this.novel!==null){const p=map(camera(this.novel,18,6.2).eye);ctx.fillStyle='#9a78bc';ctx.beginPath();ctx.arc(p[0],p[1],9,0,Math.PI*2);ctx.fill();path([p,map([0,0,0])],'#9a78bc',1.6,[5,4]);}
    const initial=this.initialView||this.fitter.iteration===0;
    ctx.fillStyle='#56768f';ctx.font='14px ui-monospace, monospace';ctx.fillText(this.referenceView?'REFERENCE / OPAQUE GEOMETRIC PRIMITIVES':initial?'INITIAL ESTIMATE / GIVEN NOISY SEED CLOUD':'CURRENT ESTIMATE / LEARNED FROM SELECTED IMAGES',20,28);
    ctx.font='14px Arial';ctx.fillText(this.referenceView?'Plane + box + sphere + thin cylinder; no Gaussian reference kernels':`64 given seed points → ${this.fitter.budget} initial → ${gs.length} current Gaussians`,20,497);
    ctx.font='13px Arial';ctx.fillStyle='#94703f';ctx.fillText('10 = reserved image (never used for updates)',20,474);
  }
  drawReference(map,path){
    for(const p of referencePrimitives()){
      const color=colorCSS(p.color.map(v=>v*.8)),line=ps=>path(ps.map(map),color,1.8);
      if(p.type==='plane'){const [x,z]=p.extent;line([[-x,p.y,-z],[x,p.y,-z],[x,p.y,z],[-x,p.y,z],[-x,p.y,-z]]);for(let k=-1;k<=1;k+=.25){line([[-x,p.y,k*z],[x,p.y,k*z]]);line([[k*x,p.y,-z],[k*x,p.y,z]]);}}
      if(p.type==='box'){const corners=Array.from({length:8},(_,i)=>p.center.map((v,k)=>v+((i>>k)&1?1:-1)*p.half[k]));for(let i=0;i<8;i++)for(let k=0;k<3;k++){const j=i^(1<<k);if(j>i)line([corners[i],corners[j]]);}}
      if(p.type==='sphere'){for(let axis=0;axis<3;axis++)for(const lat of [-.6,0,.6]){const r=p.radius*Math.sqrt(1-lat*lat);line(Array.from({length:49},(_,i)=>p.center.map((v,k)=>v+(k===axis?p.radius*lat:k===(axis+1)%3?r*Math.cos(i*Math.PI/24):r*Math.sin(i*Math.PI/24)))));}}
      if(p.type==='cylinder'){for(const y of [p.bottom,p.top])line(Array.from({length:33},(_,i)=>[p.center[0]+p.radius*Math.cos(i*Math.PI/16),y,p.center[2]+p.radius*Math.sin(i*Math.PI/16)]));for(let i=0;i<8;i++){const x=p.center[0]+p.radius*Math.cos(i*Math.PI/4),z=p.center[2]+p.radius*Math.sin(i*Math.PI/4);line([[x,p.bottom,z],[x,p.top,z]]);}}
    }
  }
  attachWorldControls(){const canvas=this.query('#scene-world');let drag=null,moved=false;
    canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,...this.observer};moved=false;canvas.setPointerCapture(e.pointerId);};
    canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)moved=true;this.observer.yaw=drag.yaw+dx*.4;this.observer.pitch=clamp(drag.pitch+dy*.3,-50,65);this.drawWorld();};
    canvas.onpointerup=e=>{if(!moved){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.x)*720/b.width,y=(e.clientY-b.y)*520/b.height;const hit=this.cameraHits.find(c=>Math.hypot(c.x-x,c.y-y)<20);if(hit)this.inspect(hit.frame);}drag=null;};canvas.onpointercancel=()=>drag=null;
    canvas.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();this.observer.yaw+=({'ArrowLeft':-4,'ArrowRight':4}[e.key]||0);this.observer.pitch=clamp(this.observer.pitch+({'ArrowUp':-4,'ArrowDown':4}[e.key]||0),-50,65);this.drawWorld();};
  }
}
