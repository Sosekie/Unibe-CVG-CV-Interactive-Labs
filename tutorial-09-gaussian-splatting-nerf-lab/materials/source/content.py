LAB_URL = 'https://sosekie.github.io/Unibe-CVG-CV-Interactive-Labs/tutorial-09/'
GITHUB_URL = 'https://github.com/Sosekie/Unibe-CVG-CV-Interactive-Labs'
SECTIONS = [
 ('mixture','Approximate a function in 1D','Distinguish amplitude fitting, basis geometry, and identifiability.',[
 'Fit the smooth-bump target with N = 2 and N = 8. Record sample RMSE and basis rank.',
 'Make two kernels identical in mean and width. Predict the rank and possible amplitude solutions before fitting.',
 'Try the signed-oscillation target. Inspect the individual contributions and explain negative coefficients.']),
 ('dimensions','Covariance and a 2D input domain','Read Gaussian geometry from covariance eigenpairs and distinguish scale from normalization.',[
 'Set one Gaussian’s scales to 0.60 and 0.20 and its rotation to 45°. Inspect its covariance.',
 'Make it isotropic and rotate again. Explain which quantities stop changing and why.',
 'Isolate one contribution and double both scales at fixed amplitude. Predict the peak and full-plane integral; account for the finite plot and automatic display scaling.']),
 ('parameters','Fit a 3D scalar function','Separate approximation capacity, initialization, and optimization error.',[
 'Choose the Gaussian-bump target and N = 1. Set amplitude to zero, record geometry, and apply one update. Explain the raw-gradient effect.',
 'Fit the ring target with N = 1 and N = 8 using comparable update budgets. Inspect all three residual slices.',
 'Rotate the inspection view without editing the fit. Explain why the sampled scalar objective stays fixed.']),
 ('colour','Project, composite, and expose ambiguity','Relate visibility to gradients and distinguish rotation from translation.',[
 'Use three-splat overlap. Sample one pixel, vary foreground opacity, and follow the rear colour weights.',
 'Keep one Gaussian. Record its projected axes, move it along the viewing ray with the provided scale change, and compare.',
 'Change camera yaw to expose the 3D difference. Here yaw orbits the camera centre; explain why pure rotation at a fixed centre is different.']),
 ('reconstruction','Recover a scene from images','Design controlled comparisons and distinguish image agreement from geometric evidence.',[
 'Fit one training view with 24 Gaussians for 100 updates. Record training and reserved-view MSE.',
 'Restart with three spread-out views, using the same budget and update count. Compare both errors and residual structure.',
 'Record error and count, apply density refinement once, then fit 25 further updates. Separate the immediate model change from subsequent learning.']),
 ('nerf','NeRF: a neural field along camera rays','Distinguish density, segment opacity, quadrature, and neural-field capacity.',[
 'At yaw 90° and the centre ray, compare density with termination weights. Explain the weak contribution of hidden orange density.',
 'Compare 8 and 64 ray samples with fixed network weights. Track interval length, alpha, and total transmittance.',
 'Fit 50 updates and inspect the reserved 0° view. Compare errors and explain why additional ray samples do not add network parameters.']),
 ('highres','Transfer to the real captured Garden','Evaluate appearance and geometry claims at scene scale.',[
 'Load the Garden when network and WebGL are available. It streams approximately 187 MB and renders Gaussian Splatting.',
 'Inspect thin structures and viewpoints away from the comfortable viewing region. Record two artifacts and competing explanations.',
 'Relate observations to coverage, representation, or appearance; identify evidence needed before using this renderer as collision geometry.'])
]
EQUATIONS = {
 'b1':r'\hat y=(a_1+a_2)\phi,\qquad\operatorname{rank}(\Phi)=1,\qquad\Phi\begin{bmatrix}1\\-1\end{bmatrix}=0',
 'b2':r'\begin{aligned}\text{Unconstrained: }&\min_a\|\Phi a-y\|^2\\\text{Nonnegative: }&\min_{a_i\ge0}\|\Phi a-y\|^2\end{aligned}',
 'm1':r'\begin{aligned}\det(\Sigma-\lambda I)&=(u-\lambda)(w-\lambda)-v^2=0\\\lambda_\pm&=\frac{u+w\pm\sqrt{(u-w)^2+4v^2}}2\\&=\frac{0.40\pm0.32}2=0.36,\ 0.04\\s_i&=\sqrt{\lambda_i}=0.6,\ 0.2\end{aligned}',
 'm2':r'\begin{aligned}\Sigma&=U\operatorname{diag}(\lambda_i)U^\top,\quad s_i=\sqrt{\lambda_i}\\\phi(\mu)&=1,\quad\int a\phi(x)\,dx=a(2\pi)^{d/2}\sqrt{\det\Sigma}\\s_i\mapsto ks_i&\quad\Longrightarrow\quad\text{integral multiplied by }k^d\end{aligned}',
 'v1':r'\begin{aligned}r_j&=\hat y(x_j)-f(x_j),\quad L=\frac1M\sum_jr_j^2\\\frac{\partial L}{\partial a}&=\frac2M\sum_jr_j\phi_j\\\nabla_\mu L&=\frac2M\sum_jr_j a\phi_j\Sigma^{-1}(x_j-\mu)\end{aligned}',
 'v2':r'a\phi(x)=\tau>0\quad\Longrightarrow\quad(x-\mu)^\top\Sigma^{-1}(x-\mu)=2\log(a/\tau)',
 'c1':r'\begin{aligned}C&=\alpha_1c_1+(1-\alpha_1)\alpha_2c_2+(1-\alpha_1)(1-\alpha_2)c_{\rm bg}\\\frac{\partial C}{\partial c_2}&=(1-\alpha_1)\alpha_2 I=0.02\cdot0.6\,I=0.012\,I\end{aligned}',
 'c2':r'\begin{aligned}\mu_{\rm new}&=e+k(\mu-e),\quad\Sigma_{\rm new}=k^2\Sigma,\quad J_{\rm new}=J/k\\J_{\rm new}R^c\Sigma_{\rm new}R^{c\top}J_{\rm new}^\top&=JR^c\Sigma R^{c\top}J^\top\end{aligned}',
 'r1':r'L_{\rm train}(\theta)=\frac1{|\mathcal V|}\sum_{v\in\mathcal V}\|R(\theta,P_v)-I_v\|^2',
 'r2':r'\begin{aligned}\alpha_{\rm old}&=o\phi,\quad o^\prime=1-\sqrt{1-o}\\\alpha_{\rm pair}&=1-(1-o^\prime\phi)^2=2o^\prime\phi-o^{\prime2}\phi^2\\o=0.75,\ \phi=0.5:&\quad\alpha_{\rm old}=0.375,\quad\alpha_{\rm pair}=0.4375\end{aligned}',
 'n1':r'\begin{aligned}\delta&=L/N,\quad\alpha_i=1-e^{-\sigma\delta}\\T_{\rm end}&=\prod_{i=1}^N e^{-\sigma L/N}=e^{-\sigma L}=e^{-2}\approx0.1353\end{aligned}',
 'n2':r'\sigma=\sigma_\theta(x),\quad c=c_\theta(x,d),\qquad\theta\leftarrow\theta-\eta\nabla_\theta L_{\rm pixels}',
 'h1':r'c_i(d)=\sum_{\ell,m}\beta_{i,\ell m}Y_{\ell m}(d)',
 'h2':r'\text{Low image error on observed rays}\quad\not\Rightarrow\quad\text{low surface-distance error}'
}
