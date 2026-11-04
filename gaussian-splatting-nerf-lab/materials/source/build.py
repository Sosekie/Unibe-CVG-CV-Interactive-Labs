from pathlib import Path
from html import escape as e
import json,subprocess
from content import SECTIONS,EQUATIONS,LAB_URL,GITHUB_URL
HERE=Path(__file__).resolve().parent
OUT=HERE/'.generated';OUT.mkdir(exist_ok=True)
qs=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {questions} from '../../dist/questions.js';console.log(JSON.stringify(questions));"],cwd=HERE,text=True))
math=json.loads(subprocess.check_output(['node','render-math.mjs'],input=json.dumps(EQUATIONS),cwd=HERE,text=True))
def links():
    return f'<div class="links"><div><b>Interactive lab:</b> <a href="{LAB_URL}">sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/gaussian-splatting-nerf/</a></div><div><b>Source code:</b> <a href="{GITHUB_URL}">github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs</a></div></div>'
def cover(solution):
    rows=''.join(f'<tr><td>{i+1}</td><td>{e(s[1])}</td><td>{i+1}.1 and {i+1}.2</td></tr>' for i,s in enumerate(SECTIONS))
    use='Compare each worked derivation with your own reasoning, then test the prediction in the lab. Distinguish evidence for one experiment from a general guarantee.' if solution else 'Make a prediction, try each guided experiment, and record observations. Choose an answer to each question and justify it; the explanation and follow-up matter more than the letter. Consult the separate solutions after your attempt.'
    title='Worked solutions' if solution else 'Supplementary tutorial'
    return f'''<section class="page"><h1>Gaussian Splatting and NeRF<br>{title}</h1><p class="meta">Computer Vision 2026<br>University of Bern · Computer Vision Group</p>{links()}<h2>Learning objectives</h2><ul class="tasks"><li>Connect Gaussian shape to covariance eigenvectors, variances, and normalization.</li><li>Distinguish coefficient fitting, geometry fitting, and image-based inverse rendering.</li><li>Explain projection, visibility, optical thickness, and pixel gradients.</li><li>Compare Gaussian primitives with neural fields and design controlled evaluation.</li></ul><p><b>Key concepts:</b> identifiability, conditioning, covariance, gradient flow, compositing, multi-view geometry, density control, ray integration, and generalization.</p><table class="cover-table"><thead><tr><th>Section</th><th>Experiment</th><th>Questions</th></tr></thead><tbody>{rows}</tbody></table><h3>Working with the tutorial</h3><p>{use}</p><p class="note">This handout follows the reviewed interactive tutorial. Lecture-slide references and a numbered course worksheet assignment remain pending. The NeRF experiment trains a small 2D cross-section; the final Garden renders a pretrained Gaussian Splatting model.</p><div class="summary">Local use: serve the lab’s <b>dist/</b> directory with Python 3. Sections 1–6 use no remote assets. The optional Garden requires network access and WebGL and streams approximately 187 MB.</div><p class="reference"><b>References:</b> <a href="https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/">Kerbl et al., 3D Gaussian Splatting (2023)</a>; <a href="https://www.matthewtancik.com/nerf">Mildenhall et al., NeRF (2020)</a>. See the lab README for conventions and teaching limits.</p></section>'''
def exercise(s,i):
    key,title,aim,tasks=s
    tasks=''.join(f'<li>{e(t)}</li>' for t in tasks)
    body=''
    for j,q in enumerate(qs[key]):
        options=''.join(f'<li>{e(o)}</li>' for o in q['options'])
        body+=f'''<article class="question"><h3>{i+1}.{j+1} · {e(q['level'])}</h3><p class="scenario">{e(q['scenario'])}</p><p class="prompt">{e(q['title'])}</p><ol class="options" type="A">{options}</ol><p><b>Explain further:</b> {e(q['extension'])}</p></article>'''
    return f'''<section class="page"><span class="page-id">Supplementary tutorial · {i+1}/7</span><h2>{i+1}. {e(title)}</h2><p class="section-link"><a href="{LAB_URL}#{key}">Open this experiment in the interactive lab ↗</a></p><p><b>Learning objective:</b> {e(aim)}</p><h3>Guided experiment</h3><ol class="tasks">{tasks}</ol><p class="observation"><b>Observations:</b> Record settings, numerical results, visible effects, and your explanation.</p><div class="writing-lines"></div>{body}</section>'''
DIAGRAM='''<svg class="cov-figure" viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg" aria-label="Gaussian principal axes"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#333"/></marker></defs><path d="M40 100H285M160 175V15" stroke="#aaa"/><ellipse cx="160" cy="100" rx="84" ry="28" transform="rotate(-45 160 100)" fill="#eee" stroke="#333"/><path d="M160 100L219.4 40.6M160 100L179.8 119.8" stroke="#333" marker-end="url(#arrow)"/><g font-family="serif" font-size="12"><text x="221" y="35">s₁ = 0.6</text><text x="184" y="135">s₂ = 0.2</text><text x="286" y="103">x</text><text x="165" y="17">y</text></g></svg><p class="caption">The 1σ ellipse: axes at ±45°, with semiaxes 0.6 and 0.2.</p>'''
def solution(s,i,q,j):
    paragraphs=''.join(f'<p>{e(p)}</p>' for p in q['explanation'])
    figure=DIAGRAM if q['id']=='m1' else ''
    return f'''<section class="page solution-page"><p class="kicker">{e(s[1])} · Question {i+1}.{j+1}</p><h2>{i+1}.{j+1} · {e(q['level'])}</h2><p class="section-link"><a href="{LAB_URL}#{s[0]}">Interactive experiment</a> · <a href="{GITHUB_URL}/tree/main/gaussian-splatting-nerf-lab">Source code</a></p><p class="scenario">{e(q['scenario'])}</p><p class="prompt">{e(q['title'])}</p><div class="correct"><b>Answer {chr(65+q['correct'])}.</b> {e(q['options'][q['correct']])}</div>{paragraphs}<div class="equation">{math[q['id']]}</div>{figure}<h3>Follow-up</h3><p><b>{e(q['extension'])}</b></p><p>{e(q['extensionAnswer'])}</p><h3>Test it in the lab</h3><p>{e(q['experiment'])}</p><p class="takeaway">{e(q['takeaway'])}</p></section>'''
style=(HERE/'print.css').read_text()
def doc(title,body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(title)}</title><link rel="stylesheet" href="../node_modules/katex/dist/katex.min.css"><style>{style}</style></head><body>{body}</body></html>'
docs=[
 ('gaussian_splatting_nerf_tutorial',cover(False)+''.join(exercise(s,i) for i,s in enumerate(SECTIONS))),
 ('gaussian_splatting_nerf_solution',cover(True)+''.join(solution(s,i,q,j) for i,s in enumerate(SECTIONS) for j,q in enumerate(qs[s[0]])))
]
files=[]
for name,body in docs:
    p=OUT/(name+'.html');p.write_text(doc(name.replace('_',' '),body));files.append(str(p))
subprocess.run(['node','print.mjs',*files],cwd=HERE,check=True)
