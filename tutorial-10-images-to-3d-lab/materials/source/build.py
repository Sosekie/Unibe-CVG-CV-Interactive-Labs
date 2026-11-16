from pathlib import Path
import json
import re
import subprocess
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SECTIONS = json.loads((ROOT / 'dist/questions.json').read_text())
OUT = HERE / 'tex'
OUT.mkdir(exist_ok=True)
BUILD = HERE / '.build'
BUILD.mkdir(exist_ok=True)
URL = 'https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-10/'
MATH = {
    '(X, Y, Z) = (-0.65, 0.42, 3.2)': r'(X,Y,Z)=(-0.65,0.42,3.2)',
    '(u, v) = ((X - C)/Z, Y/Z)': r'(u,v)=((X-C)/Z,Y/Z)',
    '4 + w_size (1/h - 2) + w_colour c': r'4+w_{\rm size}(1/h-2)+w_{\rm colour}c',
    'w_size + w_colour = 2': r'w_{\rm size}+w_{\rm colour}=2',
    'w_size - w_colour = 2': r'w_{\rm size}-w_{\rm colour}=2',
    'w_size = 2 and w_colour = 0': r'w_{\rm size}=2,\quad w_{\rm colour}=0',
    '||x_ij - pi(P_i X_j)||²': r'\lVert x_{ij}-\pi(P_iX_j)\rVert^2',
    'dZ/dd = -fB/d²': r'\frac{\mathrm d Z}{\mathrm d d}=-fB/d^2',
    'u1 = fX/Z and u2 = f(X-B)/Z': r'u_1=fX/Z,\quad u_2=f(X-B)/Z',
    'x = fX/Z': r'x=fX/Z',
    'h = fH/Z': r'h=fH/Z',
    'Z = fH/h': r'Z=fH/h',
    'x\' = f(kX)/(kZ) = fX/Z = x': r"x'=f(kX)/(kZ)=fX/Z=x",
    'd = u1 - u2': r'd=u_1-u_2',
    'd = fB/Z and Z = fB/d': r'd=fB/Z,\quad Z=fB/d',
    'X = c + zr': r'X=c+zr',
    '(MC)(C⁻¹S) = MS': r'(MC)(C^{-1}S)=MS',
    'D = MS': r'D=MS',
    'k > 0': r'k>0',
    'f, B and d': r'f,B,\text{ and }d',
    '(X,Y,Z)': r'(X,Y,Z)',
    'P_i and points X_j': r'P_i\text{ and points }X_j',
    'x_ij': r'x_{ij}',
}
pattern = re.compile('|'.join(re.escape(s) for s in sorted(MATH, key=len, reverse=True)))
escapes = {'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_', '{': r'\{', '}': r'\}', '~': r'\textasciitilde{}', '^': r'\textasciicircum{}', '\\': r'\textbackslash{}', '²': r'$^2$'}
def escape(s):
    return ''.join(escapes.get(c,c) for c in str(s))
def rich(s):
    s = re.sub(r'(?<=[.!?]) +(?=[A-Z])', '\n', s)
    result = []
    start = 0
    for match in pattern.finditer(s):
        result.append(escape(s[start:match.start()]))
        result.append('$' + MATH[match.group()] + '$')
        start = match.end()
    result.append(escape(s[start:]))
    return ''.join(result)

PREAMBLE = r'''\documentclass[11pt,a4paper]{article}
\usepackage[margin=25mm]{geometry}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern,amsmath,amssymb,enumitem,xurl,xcolor}
\usepackage[colorlinks=true,linkcolor=black,urlcolor=blue!55!black]{hyperref}
\hypersetup{pdfauthor={Luca Scharr},pdftitle={From Images to 3D}}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.45em}
\setlist{leftmargin=*,itemsep=0.15em,topsep=0.15em}
\emergencystretch=2em
\begin{document}
'''
def question(q):
    return (rich(q['scenario']) + '\n\\begin{enumerate}[label=(\\alph*),nosep]\n'
            + r'\item ' + rich(q['a']) + '\n' + r'\item ' + rich(q['b'])
            + '\n\\end{enumerate}\n')

def make(solution):
    suffix = ' - Worked Solutions' if solution else ''
    body = r'''\begin{center}
{\Large\bfseries Tutorial 10 - From Images to 3D''' + suffix + r'''}\\[2mm]
Luca Scharr\\
Computer Vision 2026\\
University of Bern\\[1mm]
Interactive lab: \href{''' + URL + r'''}{Open Tutorial 10 online}
\end{center}
'''
    if solution:
        body += 'Each question is repeated before its worked answers.\n'
    else:
        body += r'''\section*{Learning objectives}
\begin{itemize}[nosep]
\item Derive projection ambiguity and reason about two-view geometry.
\item Explain fitting, learned priors and generalisation from evidence.
\item Compare 3D representations and choose evaluation protocols for a task.
\end{itemize}
Explain your reasoning and state your assumptions.
Use the interactive experiments to check your predictions.
'''
    group_titles={'ambiguity':'Part 1. One image and more evidence','sfm':'Part 2. Fit a scene','representations':'Part 3. Representations and evaluation'}
    for s in SECTIONS:
        if s['id'] in group_titles:
            body += r'\section*{' + group_titles[s['id']] + '}\n'
        body += r'\subsection*{' + str(s['number']) + '. ' + escape(s['title']) + '}\n'
        if not solution:
            body += r'\noindent\textbf{Objective.} ' + rich(s['objective']) + '\n'
        for i,q in enumerate(s['questions'],1):
            body += '\\par\n\\noindent\n\\begin{minipage}{\\linewidth}\n' + r'\subsubsection*{' + str(s['number']) + '.' + str(i) + '}\n' + question(q)
            if solution:
                body += r'\noindent\textbf{Solution (a).} ' + rich(q['answer_a']) + '\n\n'
                body += r'\noindent\textbf{Solution (b).} ' + rich(q['answer_b']) + '\n'
            body += '\\end{minipage}\n\\par\\medskip\n'
        if not solution:
            body += r'\noindent\textbf{Interactive experiment.}' + '\n\\begin{enumerate}[nosep]\n'
            body += ''.join(r'\item ' + rich(t) + '\n' for t in s['instructions'])
            body += '\\end{enumerate}\n'
            if s['id']=='sfm':
                body += r'\noindent\textbf{Optional SfM factorisation.} Why does centering remove the image translations?'+ '\n'
                body += r'Why does any invertible $3\times 3$ matrix leave the factorisation ambiguous?'+'\n'
        elif s['id']=='sfm':
            body += r'''\subsection*{Optional SfM factorisation}
Why does centering remove the image translations?
Why does any invertible $3\times 3$ matrix leave the factorisation ambiguous?

\noindent\textbf{Solution.} Subtracting the image centroid removes each view's translation and gives $D=MS$, so $\operatorname{rank}(D)\leq 3$.
For any invertible $C$, $(MC)(C^{-1}S)=MS$, so the factors are not unique.
Orthographic camera constraints are needed to reduce this affine ambiguity.
The rank can be smaller in degenerate configurations.
'''
        if s.get('optional_question'):
            q=s['optional_question']
            body += '\\par\n\\noindent\n\\begin{minipage}{\\linewidth}\n' + r'\subsection*{Optional extension: Shortcut learning}' + '\n' + question(q)
            if solution:
                body += r'\noindent\textbf{Solution (a).} ' + rich(q['answer_a']) + '\n\n'
                body += r'\noindent\textbf{Solution (b).} ' + rich(q['answer_b']) + '\n'
            body += '\\end{minipage}\n\\par\\medskip\n'
        body += r'\noindent\href{' + URL + '#' + s['id'] + r'}{Open the interactive experiment.}' + '\n'
    return PREAMBLE + body + '\\end{document}\n'

for name,solution in [('exercises',False),('solutions',True)]:
    path=OUT/(name+'.tex')
    path.write_text(make(solution))
    if '--source-only' not in sys.argv:
        subprocess.run(['pdflatex','-interaction=nonstopmode','-halt-on-error','-output-directory',str(BUILD),str(path)],cwd=HERE,check=True,stdout=subprocess.DEVNULL)
        (ROOT/'dist/materials'/f'{name}.pdf').write_bytes((BUILD/f'{name}.pdf').read_bytes())
        target = 'tutorial_10.pdf' if name == 'exercises' else 'tutorial_10_solution.pdf'
        (ROOT/'materials'/target).write_bytes((BUILD/f'{name}.pdf').read_bytes())
        print(name, 'generated')
