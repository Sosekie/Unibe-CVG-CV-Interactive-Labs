from pathlib import Path
from html import escape as e
import json,subprocess,re
from content import SECTIONS,EQUATIONS,LAB_URL,GITHUB_URL
HERE=Path(__file__).resolve().parent
OUT=HERE/'.generated';OUT.mkdir(exist_ok=True)
qs=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {questions} from '../../dist/questions.js';console.log(JSON.stringify(questions));"],cwd=HERE,text=True))
math=json.loads(subprocess.check_output(['node','render-math.mjs'],input=json.dumps(EQUATIONS),cwd=HERE,text=True))
INLINE={
 'Σ = [[0.20, 0.16], [0.16, 0.20]]':r'\Sigma=\begin{bmatrix}0.20&0.16\\0.16&0.20\end{bmatrix}',
 'a exp(−½(x−μ)ᵀΣ⁻¹(x−μ))':r'a\exp(-\frac12(x-\mu)^\top\Sigma^{-1}(x-\mu))',
 'αᵢ = 1 − exp(−σδ)':r'\alpha_i=1-\exp(-\sigma\delta)',
 'o′ = 1 − √(1−o)':r'o^\prime=1-\sqrt{1-o}',
 'σθ(x,d)':r'\sigma_\theta(x,d)', 'cθ(x,d)':r'c_\theta(x,d)',
 'σθ(x)':r'\sigma_\theta(x)', 'aφ(x;μ,Σ)':r'a\phi(x;\mu,\Sigma)',
 'N(μ,Σ)':r'\mathcal N(\mu,\Sigma)', 'Σ = σ²I':r'\Sigma=\sigma^2 I',
 'sᵢ = √λᵢ':r's_i=\sqrt{\lambda_i}', 'δ = L/N':r'\delta=L/N',
 'λ‖a‖²':r'\lambda\|a\|^2', 'α₁ = 0.98':r'\alpha_1=0.98',
 'α₂ = 0.6':r'\alpha_2=0.6', 'L = 1':r'L=1', 'σ = 2':r'\sigma=2'
}
inline=json.loads(subprocess.check_output(['node','render-inline.mjs'],input=json.dumps(INLINE),cwd=HERE,text=True))
matcher=re.compile('|'.join(re.escape(k) for k in sorted(INLINE,key=len,reverse=True)))
def rich(value):
    value=str(value);out=[];start=0
    for hit in matcher.finditer(value):
        out.append(e(value[start:hit.start()]));out.append(inline[hit.group()]);start=hit.end()
    out.append(e(value[start:]));return ''.join(out)

def links():
    return f'<div class="links"><div><b>Interactive lab:</b> <a href="{LAB_URL}">sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-09/</a></div><div><b>Source code:</b> <a href="{GITHUB_URL}">github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs</a></div></div>'
def cover(solution):
    title=' — Worked Solutions' if solution else ''
    header=f'''<header><h1>Tutorial 9. Gaussian Splatting and NeRF{title}</h1><p class="meta">Computer Vision 2026<br>University of Bern · Computer Vision Group</p>{links()}</header>'''
    if solution:
        return header+'<p class="lead">These worked solutions follow the numbered exercises in the problem sheet. The interactive experiments illustrate the derivations and assumptions.</p>'
    return header+'''<h2>Learning objectives</h2><ul class="objectives"><li>Relate Gaussian shape to covariance, PCA, and function approximation.</li><li>Derive projection, compositing, and fitting behaviour from the underlying models.</li><li>Compare Gaussian Splatting and NeRF and evaluate reconstruction evidence.</li></ul><p><b>Key concepts:</b> least squares, covariance, gradient descent, alpha compositing, multi-view geometry, volume rendering, and neural radiance fields.</p><p>Explain your reasoning and show relevant derivations. The interactive lab provides experiments for each exercise. Lecture-slide references will be added after alignment.</p>'''
def exercise(section,i):
    key,title,aim,tasks=section
    out=f'<section class="exercise"><div class="exercise-intro"><h2>{i+1}. {e(title)}</h2><p class="learning"><b>Objective:</b> {e(aim)}</p>'
    for j,q in enumerate(qs[key]):
        out+=f'''<article class="subproblem"><h3>{i+1}.{j+1} {e(q['level'].title().replace(' · ',' — '))}</h3><p>{rich(q['scenario'])}</p><ol class="subparts" type="a"><li>{rich(q['title'])} Justify your answer.</li><li>{rich(q['extension'])}</li></ol></article>'''
        if j==0:out+='</div>'
    out+='<div class="lab-task"><b>Interactive experiment '+str(i+1)+'.</b><ol>'+''.join('<li>'+e(t)+'</li>' for t in tasks)+'</ol><p>Record settings, numerical results, and observations.</p></div>'
    return out+f'<p class="section-link"><a href="{LAB_URL}#{key}">Open the corresponding experiment ↗</a></p></section>'
DIAGRAM='''<figure class="figure"><svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" aria-label="Gaussian principal axes"><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="none" stroke="#333"/></marker></defs><path d="M40 95H285M160 165V10" stroke="#aaa"/><ellipse cx="160" cy="95" rx="84" ry="28" transform="rotate(-45 160 95)" fill="#eee" stroke="#333"/><path d="M160 95L219.4 35.6M160 95L179.8 114.8" stroke="#333" marker-end="url(#arrow)"/><g font-family="serif" font-size="12"><text x="221" y="31">s₁ = 0.6</text><text x="184" y="130">s₂ = 0.2</text><text x="286" y="98">x</text><text x="165" y="12">y</text></g></svg><figcaption>The 1σ ellipse. Principal axes have standard deviations 0.6 and 0.2.</figcaption></figure>'''
def solution(section,i,q,j):
    paragraphs=''.join(f'<p>{rich(p)}</p>' for p in q['explanation'])
    figure=DIAGRAM if q['id']=='m1' else ''
    return f'''<article class="worked"><h3>{i+1}.{j+1} {e(q['level'].title().replace(' · ',' — '))}</h3><p class="result"><b>Result.</b> {rich(q['options'][q['correct']])}</p>{paragraphs}<div class="equation">{math[q['id']]}</div>{figure}<p><b>Follow-up.</b> {rich(q['extensionAnswer'])}</p></article>'''
def solution_section(section,i):
    key,title,_,_=section
    return f'<section class="exercise solution"><h2>{i+1}. {e(title)}</h2>'+''.join(solution(section,i,q,j) for j,q in enumerate(qs[key]))+f'<p class="section-link"><a href="{LAB_URL}#{key}">Interactive experiment ↗</a></p></section>'
style=(HERE/'print.css').read_text()
def doc(title,body):
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{e(title)}</title><link rel="stylesheet" href="../node_modules/katex/dist/katex.min.css"><style>{style}</style></head><body>{body}</body></html>'
docs=[
 ('tutorial_09',cover(False)+''.join(exercise(s,i) for i,s in enumerate(SECTIONS))),
 ('tutorial_09_solution',cover(True)+''.join(solution_section(s,i) for i,s in enumerate(SECTIONS)))
]
files=[]
for name,body in docs:
    p=OUT/(name+'.html');p.write_text(doc(name.replace('_',' '),body));files.append(str(p))
subprocess.run(['node','print.mjs',*files],cwd=HERE,check=True)
