from pathlib import Path
import json, re, subprocess, sys
from content import SECTIONS, EQUATIONS, LAB_URL, GITHUB_URL

HERE = Path(__file__).resolve().parent
OUT = HERE / '.generated'
OUT.mkdir(exist_ok=True)
TEX = HERE / 'tex'
TEX.mkdir(exist_ok=True)
questions = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {questions} from '../../dist/questions.js';console.log(JSON.stringify(questions));"], cwd=HERE, text=True))

# Render selected multi-character expressions as proper mathematical notation.
INLINE = {
 'Σ = [[0.20, 0.16], [0.16, 0.20]]': r'\Sigma=\begin{bmatrix}0.20&0.16\\0.16&0.20\end{bmatrix}',
 'a exp(−½(x−μ)ᵀΣ⁻¹(x−μ))': r'a\exp(-\frac12(x-\mu)^\top\Sigma^{-1}(x-\mu))',
 'αᵢ = 1 − exp(−σδ)': r'\alpha_i=1-\exp(-\sigma\delta)',
 'o′ = 1 − √(1−o)': r'o^\prime=1-\sqrt{1-o}',
 'σθ(x,d)': r'\sigma_\theta(x,d)', 'cθ(x,d)': r'c_\theta(x,d)',
 'σθ(x)': r'\sigma_\theta(x)', 'aφ(x;μ,Σ)': r'a\phi(x;\mu,\Sigma)',
 'N(μ,Σ)': r'\mathcal N(\mu,\Sigma)', 'Σ = σ²I': r'\Sigma=\sigma^2 I',
 'sᵢ = √λᵢ': r's_i=\sqrt{\lambda_i}', 'δ = L/N': r'\delta=L/N',
 'λ‖a‖²': r'\lambda\|a\|^2', 'α₁ = 0.98': r'\alpha_1=0.98',
 'α₂ = 0.6': r'\alpha_2=0.6', 'L = 1': r'L=1', 'σ = 2': r'\sigma=2',
 '√((u−w)² + 4v²)': r'\sqrt{(u-w)^2+4v^2}',
 '√det(Σ)': r'\sqrt{\det(\Sigma)}', '√λᵢ': r'\sqrt{\lambda_i}',
 '√0.20': r'\sqrt{0.20}', '√2': r'\sqrt{2}', '√(1−o)': r'\sqrt{1-o}',
 'ŷ = Σᵢ aᵢφᵢ': r'\hat y=\sum_i a_i\phi_i'
}
MAP = {'Σ':r'\Sigma','Φ':r'\Phi','α':r'\alpha','β':r'\beta','δ':r'\delta','η':r'\eta','θ':r'\theta','λ':r'\lambda','μ':r'\mu','π':r'\pi','σ':r'\sigma','τ':r'\tau','φ':r'\phi','ŷ':r'\hat{y}','∂':r'\partial','∇':r'\nabla','∏':r'\prod','∫':r'\int','√':r'\sqrt{\vphantom{x}}','≈':r'\approx','≥':r'\ge','±':r'\pm','×':r'\times','−':'-', '←':r'\leftarrow','→':r'\rightarrow','⇒':r'\Rightarrow','‖':r'\Vert','ℓ':r'\ell','′':r'\prime','¹':r'{}^1','²':r'{}^2','⁻':r'{}^{-}','ᵀ':r'{}^\top','ᵈ':r'{}^d','ᵢ':r'{}_i','ᵥ':r'{}_v','ᶜ':r'{}^c','₁':r'{}_1','₂':r'{}_2','ₐ':r'{}_a','ⱼ':r'{}_j','½':r'\frac12','°':r'{}^\circ','·':r'\cdot'}
ESC = {'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','~':r'\textasciitilde{}','^':r'\textasciicircum{}','\\':r'\textbackslash{}'}
pattern = re.compile('|'.join(re.escape(k) for k in sorted(INLINE, key=len, reverse=True)))
def plain(s):
    return ''.join(('$'+MAP[c]+'$') if c in MAP else ESC.get(c,c) for c in str(s).replace('—','-').replace('–','-'))
def rich(s):
    # Newlines separate sentences in the LaTeX source but remain spaces in print.
    s=re.sub(r'(?<=[.!?]) +(?=[A-Z])', '\n', str(s)); parts=[]; start=0
    for match in pattern.finditer(s):
        parts += [plain(s[start:match.start()]), '$'+INLINE[match.group()]+'$']; start=match.end()
    return ''.join(parts)+plain(s[start:])

def cover(solution):
    suffix = ' - Worked Solutions' if solution else ''
    output = r'''\begin{center}
{\Large\bfseries Tutorial 9. Gaussian Splatting and NeRF''' + suffix + r'''}\\[2mm]
Luca Scharr\\
Computer Vision 2026\\
University of Bern\\[1mm]
Interactive lab: \href{''' + LAB_URL + r'''}{\nolinkurl{sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-09/}}\\
Source code: \href{''' + GITHUB_URL + r'''}{\nolinkurl{github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs}}
\end{center}
'''
    if solution:
        return output + '\nThese worked solutions follow the numbered exercises in the problem sheet.\nThe interactive experiments illustrate the derivations and assumptions.\n'
    return output + r'''
\section*{Learning objectives}
\begin{itemize}[nosep]
\item Relate Gaussian shape to covariance, PCA, and function approximation.
\item Derive projection, compositing, and fitting behaviour from the underlying models.
\item Compare Gaussian Splatting and NeRF and evaluate reconstruction evidence.
\end{itemize}
\noindent\textbf{Key concepts.} Least squares, covariance, gradient descent, alpha compositing, multi-view geometry, volume rendering, and neural radiance fields.

Explain your reasoning and show relevant derivations.
The interactive lab provides experiments for each exercise.
Lecture-slide references will be added after alignment.
'''

def heading(i,j,q):
    return r'\subsection*{' + str(i+1)+'.'+str(j+1)+' '+plain(q['level'].title().replace(' · ',' - ')) + '}\n'

def question(q):
    result=rich(q['scenario'])+'\n\\begin{enumerate}[label=(\\alph*),nosep]\n'
    result+=r'\item '+rich(q['title'])+'\nJustify your answer.\n'
    return result+r'\item '+rich(q['extension'])+'\n\\end{enumerate}\n'

def exercise(section,i):
    key,title,aim,tasks=section
    result=r'\section*{'+str(i+1)+'. '+plain(title)+'}\n'+r'\noindent\textbf{Objective.} '+rich(aim)+'\n'
    for j,q in enumerate(questions[key]):
        result+=heading(i,j,q)+question(q)
    result+=r'\noindent\textbf{Interactive experiment '+str(i+1)+r'.}\begin{enumerate}[nosep]'+'\n'
    result+=''.join(r'\item '+rich(t)+'\n' for t in tasks)
    result+=r'\end{enumerate}'+'\nRecord settings, numerical results, and observations.\n'
    result+=r'\href{'+LAB_URL+'#'+key+r'}{Open the corresponding experiment.}\par'+'\n'
    return result

FIGURE = r'''\begin{center}
\begin{tikzpicture}[scale=0.8]
\draw[gray!55] (-2,0)--(2,0) node[right] {$x$};
\draw[gray!55] (0,-1.6)--(0,1.6) node[above] {$y$};
\draw[fill=black!6,rotate=45] (0,0) ellipse (1.5 and .5);
\draw[->,thick] (0,0)--(1.06,1.06) node[above right] {$s_1=0.6$};
\draw[->,thick] (0,0)--(.35,-.35) node[below right] {$s_2=0.2$};
\end{tikzpicture}\\
{\small The $1\sigma$ ellipse.
Principal axes have standard deviations 0.6 and 0.2.}
\end{center}
'''

def solution(section,i):
    key,title,_,_=section
    result=r'\section*{'+str(i+1)+'. '+plain(title)+'}\n'
    for j,q in enumerate(questions[key]):
        result+=heading(i,j,q)+question(q)+r'\noindent\textbf{Solution (a).} '+rich(q['options'][q['correct']])+'\n\n'
        result+='\n\n'.join(rich(p) for p in q['explanation'])+'\n'
        result+='\\[\n'+EQUATIONS[q['id']]+'\n\\]\n'
        if q['id']=='m1': result+=FIGURE
        result+=r'\noindent\textbf{Solution (b).} '+rich(q['extensionAnswer'])+'\n'
    return result+r'\noindent\href{'+LAB_URL+'#'+key+r'}{Interactive experiment.}'+'\n'

PREAMBLE = r'''\documentclass[11pt,a4paper]{article}
\usepackage[margin=25mm]{geometry}
\usepackage{amsmath,amssymb}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern}
\usepackage{enumitem}
\usepackage{tikz}
\usepackage{xurl}
\usepackage[colorlinks=true,linkcolor=black,urlcolor=blue!55!black]{hyperref}
\hypersetup{pdfauthor={Luca Scharr},pdftitle={Tutorial 09 - Gaussian Splatting and NeRF}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.45em}
\setlist{leftmargin=*,itemsep=0.15em,topsep=0.15em}
\emergencystretch=2em
\begin{document}
'''
for name,is_solution in [('tutorial_09',False),('tutorial_09_solution',True)]:
    selected = [arg for arg in sys.argv[1:] if arg != '--source-only']
    if selected and name not in selected:
        continue
    body=cover(is_solution)+''.join((solution if is_solution else exercise)(s,i) for i,s in enumerate(SECTIONS))
    tex=TEX/(name+'.tex'); tex.write_text(PREAMBLE+body+'\\end{document}\n',encoding='utf-8')
    if '--source-only' in sys.argv[1:]:
        continue
    subprocess.run(['pdflatex','-interaction=nonstopmode','-halt-on-error','-output-directory',str(OUT),str(tex)],cwd=HERE,check=True,stdout=subprocess.DEVNULL)
    (HERE.parent/(name+'.pdf')).write_bytes((OUT/(name+'.pdf')).read_bytes())
    print(HERE.parent/(name+'.pdf'))
