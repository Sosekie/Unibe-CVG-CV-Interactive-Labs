// Each question connects a model assumption to a prediction, a derivation, and a controlled experiment.
// Revise ANSWER_STORAGE_KEY when changing the meaning or order of answer choices.
export const ANSWER_STORAGE_KEY='gsplat-answers-masters-v2';
export const questions={
  mixture:[
    {
      id:'b1',level:'IDENTIFIABILITY · LINEAR FITTING',
      scenario:'You fit two 1D Gaussian basis functions with exactly the same mean and width. Only their amplitudes are free. The target samples are fixed.',
      title:'What can least squares determine about the two amplitudes?',
      options:['A unique pair, provided there are more samples than unknown amplitudes.','Their sum can be determined, but the individual amplitudes are not identifiable.','Both amplitudes must be equal because the two kernels have the same shape.'],correct:1,
      hint:'Write the two columns of the design matrix. Can a change in one coefficient be cancelled by a change in the other?',
      explanation:[
        'The two design-matrix columns are identical: Φ = [φ φ]. Every prediction depends on a₁ + a₂. Adding δ to one amplitude and subtracting δ from the other changes neither the prediction nor its loss.',
        'There are infinitely many coefficient pairs at the optimum. A numerical solver can return one representative, but that does not make the parameters identifiable. More samples cannot distinguish two exactly identical columns. Nearly identical kernels instead make the coefficients sensitive to small perturbations.'
      ],
      equation:'ŷ = (a₁ + a₂)φ\nΦ(a + δ[1,−1]ᵀ) = Φa; rank(Φ) = 1',
      extension:'Would adding a penalty λ‖a‖² make the amplitudes identifiable from the observations?',
      extensionAnswer:'A positive quadratic penalty selects a unique minimum-norm pair (here equal amplitudes), but this uniqueness comes from the added preference. The observations still constrain only the sum.',
      experiment:'Set N = 2. Give both kernels the same mean and width, then fit amplitudes. Inspect the reported basis rank. Move one mean slightly and compare rank and coefficients.',
      takeaway:'A good function fit need not identify its individual Gaussian components.',
      feedback:['An overdetermined system can still be rank-deficient. Extra samples do not separate identical columns.','Yes: the prediction depends on the sum. Explain why the coefficient pair is not unique.','Symmetry permits equal amplitudes but does not require them; infinitely many unequal pairs give the same sum.']
    },
    {
      id:'b2',level:'MODEL ASSUMPTIONS · SIGNED WEIGHTS',
      scenario:'After an unconstrained amplitude fit, a nonnegative target is approximated using both positive and negative Gaussian coefficients. Small regions of the approximation fall below zero.',
      title:'Which interpretation is consistent with the model used in this lab?',
      options:['The negative coefficients are invalid because every Gaussian expansion is a probability mixture.','The negative coefficients show that least squares has failed to reach its optimum.','Signed coefficients are valid for function approximation; nonnegativity would require a different constrained fit.'],correct:2,
      hint:'Distinguish a weighted basis expansion from a mixture of normalized probability densities. Which constraints does the objective actually impose?',
      explanation:[
        'Here φᵢ is an unnormalized basis function and ŷ = Σᵢ aᵢφᵢ is a scalar function. Unconstrained least squares allows cancellation: a broad positive contribution can be corrected by a narrower negative contribution. Neither nonnegative predictions nor coefficients summing to one are required.',
        'A probability mixture instead uses normalized component densities and nonnegative weights summing to one. Nonnegative least squares would impose aᵢ ≥ 0 and change the feasible predictions. Its optimum cannot have a smaller sample SSE than the unconstrained optimum using the same basis.'
      ],
      equation:'Unconstrained: minₐ ‖Φa−y‖²\nNonnegative: min over aᵢ ≥ 0 of ‖Φa−y‖²',
      extension:'Why can a low sample error coexist with large, unstable positive and negative coefficients?',
      extensionAnswer:'Nearly dependent basis columns allow large contributions to cancel. The sampled sum can remain accurate while individual coefficients are sensitive to perturbations. Rank, conditioning, off-sample behavior, and coefficient size tell us more than training error alone.',
      experiment:'Use the plateau + sharp-detail target with several kernels and fit amplitudes. Inspect individual contributions and the residual. If a coefficient is negative, set it to zero manually and compare sample error before refitting.',
      takeaway:'Function weights, probability-mixture weights, and rendering opacities have different meanings and constraints.',
      feedback:['Probability-mixture constraints are additional assumptions. The lab fits a scalar basis expansion.','A signed solution can be the exact unconstrained least-squares optimum. Check the objective before judging the coefficient.','Yes. Explain what changes when nonnegativity is added to the feasible set.']
    }
  ],
  dimensions:[
    {
      id:'m1',level:'COVARIANCE · PRINCIPAL AXES',
      scenario:'A 2D Gaussian has Σ = [[0.20, 0.16], [0.16, 0.20]]. The diagonal entries are equal.',
      title:'What shape does this covariance describe?',
      options:['An elongated Gaussian, with standard deviations 0.6 and 0.2 along axes rotated by 45°.','An isotropic Gaussian with standard deviation √0.20 in every direction.','An elongated Gaussian aligned with the x and y axes, with scales 0.20 and 0.16.'],correct:0,
      hint:'Find the eigenvectors [1,1]ᵀ and [1,−1]ᵀ. A diagonal entry is not generally an eigenvalue.',
      explanation:[
        'Eigenvalues solve the characteristic equation det(Σ − λI) = 0. For a symmetric 2×2 matrix Σ = [[u,v],[v,w]], expand the determinant to obtain λ² − (u+w)λ + uw − v² = 0. The quadratic formula gives λ± = (u+w ± √((u−w)² + 4v²))/2.',
        'Here u = w = 0.20 and v = 0.16. With equal diagonal entries d, the eigenvalues simplify to d+v and d−v, associated with directions (1,1) and (1,−1). Thus λ = 0.36 and 0.04. Taking square roots gives principal standard deviations 0.6 and 0.2. Unit eigenvectors are (1,1)/√2 and (1,−1)/√2, so the long axis is at 45°.',
        'Equal marginal variances do not imply rotational symmetry. Isotropy requires Σ = σ²I, including zero off-diagonal entries. Conversely, an isotropic Gaussian is unchanged by rotation: its angle cannot be recovered from its function values.'
      ],
      equation:'det(Σ−λI) = (u−λ)(w−λ)−v² = 0\nλ± = (u+w ± √((u−w)²+4v²))/2\nHere: λ± = (0.40 ± 0.32)/2 = 0.36, 0.04\nΣ = R(45°) diag(0.6², 0.2²) R(45°)ᵀ',
      extension:'What happens to the usefulness of a rotation gradient as the two principal scales become equal?',
      extensionAnswer:'The function becomes independent of angle at exact isotropy, so the angle derivative vanishes. Near isotropy, orientation has little effect and can be weakly constrained. A rotation parameter is not always an observable property.',
      experiment:'Select one 2D Gaussian, set scales to 0.60 and 0.20 and rotation to 45°, then inspect its covariance. Make it isotropic and rotate again; predict which visual and numerical quantities should stay fixed.',
      takeaway:'Read Gaussian shape from covariance eigenpairs, and distinguish parameters from observable effects.',
      feedback:['Yes. Derive the eigenvalues and explain why equal diagonal entries do not imply isotropy.','The off-diagonal covariance changes directional spread. Isotropy requires a scalar multiple of the identity.','Covariance entries are not principal scales. Diagonalize first, then take square roots of the eigenvalues.']
    },
    {
      id:'m2',level:'GAUSSIAN BEHAVIOR · NORMALIZATION',
      scenario:'Consider one unnormalized 2D kernel a exp(−½(x−μ)ᵀΣ⁻¹(x−μ)). Double both principal scales while keeping its amplitude a fixed.',
      title:'What happens to its peak value and its integral over the whole plane?',
      options:['The peak becomes one quarter as large and the integral stays fixed.','The peak stays fixed and the integral becomes four times as large.','The peak stays fixed and the integral becomes twice as large.'],correct:1,
      hint:'Evaluate the kernel at μ, then change variables from x to standardized principal-axis coordinates in the integral.',
      explanation:[
        'The principal scales have a direct PCA interpretation. For samples from one normalized Gaussian N(μ,Σ), PCA of the centred samples estimates the eigendecomposition Σ = U diag(λᵢ) Uᵀ. The columns of U are the principal directions, λᵢ are the variances along them, and the Gaussian scales sᵢ = √λᵢ are the corresponding standard deviations. Finite samples give estimates; eigenvector signs are arbitrary, and repeated eigenvalues do not define unique directions within their eigenspace.',
        'At the mean, the exponent is zero, so the value remains a. The integral of this unnormalized 2D kernel is a·2π·√det(Σ). Doubling both scales multiplies each covariance eigenvalue by four, and √det(Σ) by four.',
        'A normalized probability density includes the inverse determinant factor and would instead keep unit integral while lowering the peak. The lab does not include that normalization. A larger Gaussian therefore changes how much of the domain it covers, even when its peak is unchanged.',
        'This PCA interpretation applies to each Gaussian component. PCA of a complete probability mixture also reflects variation between component means, so its principal axes can differ from those of the individual Gaussians. The signed function expansion in this lab is not automatically a probability distribution.'
      ],
      equation:'PCA: Σ = U diag(λᵢ) Uᵀ; Gaussian scales sᵢ = √λᵢ\nsᵢ → 2sᵢ ⇒ λᵢ → 4λᵢ; principal directions stay fixed\nφ(μ) = 1; ∫ aφ(x) dx = a(2π)^(d/2)√det(Σ)\nsᵢ → ksᵢ in d dimensions ⇒ integral × kᵈ',
      extension:'Does the fourfold integral increase imply fourfold image brightness after projecting and alpha-compositing a 3D splat?',
      extensionAnswer:'No. The scalar-field integral is not the image-formation model. Projection, camera pose, opacity saturation, overlap, and transmittance determine pixel contributions. The peak opacity of an unnormalized splat stays fixed at its projected mean.',
      experiment:'In 2D, isolate a contribution by setting other amplitudes to zero. Change scales from 0.25 to 0.50 while keeping amplitude fixed. Compare peak value, footprint, and residual; account for the finite plotted domain.',
      takeaway:'Scaling a Gaussian changes coverage; its peak behavior depends on whether the kernel is normalized.',
      feedback:['That is the behavior of a normalized probability density. This kernel has no inverse determinant normalization.','Yes. Explain the determinant scaling and why it does not directly predict rendered brightness.','There are two independent scaled dimensions, so the area factor is 2 × 2.']
    }
  ],
  parameters:[
    {
      id:'v1',level:'OPTIMIZATION · GRADIENT FLOW',
      scenario:'The 3D model is ŷ(x) = aφ(x;μ,Σ), fitted by mean squared error to sampled target values. Consider the raw gradient at a = 0, with positive scales.',
      title:'Which parameters can receive a nonzero loss gradient at that instant?',
      options:['The mean and covariance can receive nonzero gradients, while amplitude cannot.','All parameter gradients must be zero because the prediction is zero.','Amplitude can receive a nonzero gradient, while the mean and covariance gradients are zero.'],correct:2,
      hint:'Apply the chain rule to aφ. Which derivatives include the factor a, and which do not?',
      explanation:[
        'The derivative with respect to amplitude is φ. The mean derivative is aφΣ⁻¹(x−μ); covariance and scale derivatives also contain a. At a = 0, the current loss is locally insensitive to geometry, even if prediction error is large. The amplitude derivative can remain nonzero.',
        'Once amplitude changes, geometry gradients can become nonzero. Initialization matters in another way: if a narrow kernel lies far from all informative samples, φ is tiny there and even the amplitude gradient can be weak. Large residuals alone do not guarantee useful parameter gradients.'
      ],
      equation:'rⱼ = ŷ(xⱼ)−f(xⱼ); L = (1/M)Σⱼ rⱼ²\n∂L/∂a = (2/M)Σⱼ rⱼφⱼ\n∇μL = (2/M)Σⱼ rⱼ aφⱼΣ⁻¹(xⱼ−μ)',
      extension:'Can Adam momentum move a mean when its current raw gradient is zero?',
      extensionAnswer:'Yes, if its stored first moment is nonzero from previous updates. A zero current gradient is not the same as a zero optimizer update. For the proposed lab experiment, editing an amplitude clears optimizer moments, so the first update isolates the raw-gradient effect.',
      experiment:'Choose the Gaussian-bump target and N = 1. Set amplitude to exactly zero; note the mean and scales. Apply one update and inspect what changed. Apply more updates, then compare with a narrow kernel placed far from the target.',
      takeaway:'To diagnose fitting, reason about the Jacobian of the prediction as well as the residual.',
      feedback:['Mean and covariance derivatives are multiplied by amplitude. At a = 0 those raw gradients vanish.','A zero prediction can have a nonzero derivative with respect to its amplitude.','Yes. Derive the chain rule, then distinguish the current gradient from an optimizer with momentum.']
    },
    {
      id:'v2',level:'APPROXIMATION · CAPACITY VS OPTIMIZATION',
      scenario:'One Gaussian fits the ring-shaped 3D target poorly after many updates. Its slices fill the hole or miss much of the ring.',
      title:'What can be concluded from the Gaussian model itself, without assuming the optimizer found a global minimum?',
      options:['One Gaussian cannot represent the target exactly; more optimization may help, but cannot remove this representation mismatch.','The remaining error proves that Adam is stuck at a local minimum.','A sufficiently small learning rate guarantees that one Gaussian will reproduce the ring.'],correct:0,
      hint:'Compare the positive level sets of one Gaussian with those of a ring-shaped field. What can changing its parameters alter?',
      explanation:[
        'For a positive amplitude, every nonempty positive level set of a Gaussian is an ellipsoid enclosing one maximum. Changing mean, covariance, or amplitude cannot create the ring’s hole. A nonpositive amplitude cannot reproduce its positive values either. Exact representation is therefore unavailable with one kernel.',
        'This does not tell us whether the current parameters are optimal within that restricted family. There may be both approximation error and optimization error. Several kernels can cover different parts of the ring, but their nonlinear fit can still depend on initialization and the update budget.'
      ],
      equation:'aφ(x) = τ > 0 ⇒ (x−μ)ᵀΣ⁻¹(x−μ) = 2 log(a/τ)\nOne kernel: ellipsoidal level sets; a sum permits more complex topology.',
      extension:'If the displayed volume RMSE is small, could a visually important part of the ring still be poorly fitted?',
      extensionAnswer:'Yes. Uniform volume MSE averages over many nearly empty samples. A localized structure can contribute little to the global average while being badly approximated. Check multiple slices, residual location, and sampling density; consider a region-weighted diagnostic before declaring success.',
      experiment:'Fit the ring with N = 1 and N = 8 using comparable update budgets. Compare volume RMSE and all three slices. Separate evidence of increased capacity from evidence that a particular run reached a better solution.',
      takeaway:'A loss plateau does not by itself diagnose a local minimum; model capacity and the measurement distribution also matter.',
      feedback:['Yes. Explain the structural limitation, and why it does not establish that the current one-kernel fit is optimal.','A plateau alone cannot separate limited capacity, weak gradients, local minima, and other optimization effects.','Learning-rate choice cannot make an ellipsoidal level set acquire a hole.']
    }
  ],
  colour:[
    {
      id:'c1',level:'VISIBILITY · PHOTOMETRIC GRADIENTS',
      scenario:'At one pixel, a foreground splat has α₁ = 0.98 and a rear splat has α₂ = 0.6. Hold geometry and opacity fixed while differentiating the pixel colour with respect to the rear RGB.',
      title:'What is ∂C/∂c₂ for each RGB channel, and what does it imply for fitting?',
      options:['0.6: the rear splat receives its full opacity weight regardless of foreground visibility.','0.012: foreground transmittance strongly attenuates the rear colour gradient at this pixel.','0: any foreground alpha greater than zero completely blocks the rear colour gradient.'],correct:1,
      hint:'The colour coefficient is T₂α₂. Start with transmittance one and account for the first splat.',
      explanation:[
        'The foreground leaves T₂ = 1 − 0.98 = 0.02. The rear contribution is T₂α₂c₂, so the per-channel derivative is 0.02 × 0.6 = 0.012. A photometric loss gradient contains this factor multiplied by its pixel residual derivative.',
        'A large pixel residual can therefore give little signal to a nearly hidden splat. With α₁ exactly one, this colour gradient would be zero at this pixel. Other pixels and camera views may expose the rear splat. Visibility influences which parameters can actually learn from each observation.'
      ],
      equation:'C = α₁c₁ + (1−α₁)α₂c₂ + (1−α₁)(1−α₂)c_bg\n∂C/∂c₂ = (1−α₁)α₂ I = 0.012 I',
      extension:'Would directly adding the two coloured kernels give the same learning behavior?',
      extensionAnswer:'No. In an additive colour sum, the rear colour derivative would lack the foreground transmittance factor. Alpha compositing couples visibility and parameter influence; it is not just the scalar basis expansion with RGB outputs.',
      experiment:'Use three-splat overlap and sample an overlap pixel. Raise the nearest splat’s opacity and track the rear weights in the table. Orbit to another view. The displayed alpha includes spatial falloff, so use the measured alpha values rather than just the opacity sliders.',
      takeaway:'Image fitting learns through visibility, not equally from every Gaussian at every pixel.',
      feedback:['The rear contribution is attenuated by all preceding transmittances. Its opacity alone is not its colour weight.','Yes. Connect this derivative to the loss gradient and explain why another camera can supply information.','Partial transparency attenuates the derivative continuously; complete blockage requires transmittance zero.']
    },
    {
      id:'c2',level:'MULTI-VIEW GEOMETRY · AMBIGUITY',
      scenario:'For an isolated Gaussian and a fixed pinhole camera, multiply its camera-relative mean and all spatial scales by k > 0. Keep RGB and opacity fixed, and keep it in front of the near plane. Its locally projected footprint is unchanged.',
      title:'Which extra observation generally constrains this depth–scale ambiguity?',
      options:['A second image obtained by rotating the camera about the same optical centre.','The same camera image rendered at a higher pixel resolution.','A calibrated image from a different camera centre, with parallax and visibility of the Gaussian.'],correct:2,
      hint:'Which change supplies a second spatial origin for a viewing ray? Distinguish rotation from translation.',
      explanation:[
        'Scaling camera-relative position preserves x/z and y/z, hence the projected mean. The pinhole Jacobian scales by 1/k while 3D covariance scales by k², preserving the locally projected covariance. The fixed pixel filter is also unchanged. The single image cannot distinguish this family of 3D explanations.',
        'Pure rotation about the same optical centre keeps this radial scaling ambiguity. A translated camera supplies another ray origin and generally makes the two candidate means project differently. Useful baseline and visibility matter; a second image is not an unconditional guarantee of accurate or unique reconstruction.'
      ],
      equation:'μ_new = e + k(μ−e); Σ_new = k²Σ\nJ_new = J/k ⇒ J_new RᶜΣ_new RᶜᵀJ_newᵀ = J RᶜΣRᶜᵀJᵀ',
      extension:'Why can three nearby training views provide less useful depth information than three spread-out views?',
      extensionAnswer:'With a small translation baseline, viewing rays can be nearly parallel and triangulation becomes sensitive to image error. A wider baseline can supply stronger depth constraints, while also changing visibility. More separated views still cannot constrain surfaces they never observe.',
      experiment:'Keep one Gaussian, note its projected axes, and move it farther along the viewing ray. Then change camera yaw. In this lab yaw orbits the camera centre around the scene; it is not pure rotation at a fixed optical centre.',
      takeaway:'Multiple images help when their geometry adds independent constraints, not simply because there are more pixels.',
      feedback:['Pure rotation changes ray directions but supplies no new optical centre; radial depth–scale ambiguity remains.','More pixels in the same projection do not remove an ambiguity of that projection model.','Yes. Explain the role of translation, visibility, and baseline rather than merely counting images.']
    }
  ],
  reconstruction:[
    {
      id:'r1',level:'EXPERIMENT DESIGN · GENERALIZATION',
      scenario:'A fit from one selected camera has low training MSE but a much larger reserved-view MSE. You want to test whether limited view coverage is contributing to the failure.',
      title:'Which comparison provides the most relevant controlled evidence?',
      options:['Fit one view and three spread-out views from the same seeds, Gaussian budget, shape mode, and update budget; evaluate both at the reserved pose.','Give the one-view run many more Gaussians and a longer update budget, then compare its training error with the previous reserved error.','Use the reserved image as another training view and report its lower error as evidence of generalization.'],correct:0,
      hint:'Change the suspected cause while keeping competing explanations controlled. Keep the evaluation image independent of fitting.',
      explanation:[
        'The controlled comparison varies view coverage while holding the initialization and model family fixed. If the additional views improve reserved-view error, that supports the claim that they supply useful constraints for this fixture. Compare both training and reserved behavior rather than swapping the metric between runs.',
        'This is evidence, not a universal proof of geometry recovery. Additional views also change the nonlinear objective, occlusions, and convergence behavior. Equal update counts here average over each selected set; the multi-view run performs more rendering work per update. A computation-matched study would control that too.'
      ],
      equation:'L_train(θ) = mean over v in training of ‖R(θ,Pᵥ)−Iᵥ‖²\nL_eval(θ) uses reserved views that do not contribute gradients.',
      extension:'If you repeatedly choose budgets and stop times using frame 10, is it still an untouched final test?',
      extensionAnswer:'No. It remains excluded from gradients, but it has become a validation view used for model selection. An unbiased final performance estimate needs additional untouched views. This tutorial uses frame 10 as a diagnostic reserved view, not as a benchmark claim.',
      experiment:'Restart with one view, 24 Gaussians, and 100 updates; record training and reserved errors. Repeat with three spread-out views and the same settings. Inspect the reserved image and residual structure as well as the two scalar scores.',
      takeaway:'Design comparisons to separate view constraints, model capacity, optimization, and evaluation leakage.',
      feedback:['Yes. Explain what is controlled and what this comparison can and cannot establish.','Budget, optimization time, training set, and evaluation metric would all differ, so this does not isolate view coverage.','Once a view supervises fitting, its error measures training agreement rather than independent generalization.']
    },
    {
      id:'r2',level:'DENSITY CONTROL · MODEL CHANGES',
      scenario:'Consider one isolated coloured splat with opacity o. Replace it by two coincident splats with identical shape and colour, each with opacity o′ = 1 − √(1−o). Let φ be their shared projected Gaussian value at a pixel.',
      title:'Does this opacity adjustment preserve the rendered image everywhere?',
      options:['Yes: matching opacity at the centre preserves the whole Gaussian footprint.','Yes: two coincident Gaussian contributions add linearly under alpha compositing.','No: it matches alpha at φ = 1, but the composited falloff generally differs elsewhere.'],correct:2,
      hint:'Compare the original alpha oφ with the combined alpha 1 − (1−o′φ)². Do not replace φ by one everywhere.',
      explanation:[
        'At the projected centre, φ = 1 and 1 − (1−o′)² = o by construction. Away from the centre, the combined alpha is 2o′φ − o′²φ². That quadratic dependence on φ is generally different from the original oφ. The trivial zero-opacity case is unchanged.',
        'Density refinement in the lab also offsets means and may reduce scales, so it changes the forward model further. More kernels create additional fitting capacity; a heuristic initialization does not preserve the current image or guarantee an immediate decrease in error. Subsequent optimization must make the new capacity useful.'
      ],
      equation:'α_old = oφ\nα_pair = 1−(1−o′φ)² = 2o′φ−o′²φ²\nFor o = 0.75: o′ = 0.5; at φ = 0.5, α_old = 0.375 but α_pair = 0.4375.',
      extension:'For an additive scalar field, would two coincident copies with amplitudes a/2 preserve the function?',
      extensionAnswer:'Yes, if their geometry stays identical: (a/2)φ + (a/2)φ = aφ exactly. This distinction is why arguments about additive basis expansion cannot be transferred unchanged to alpha-composited image fitting.',
      experiment:'Fit the primitive scene for at least 25 updates. Record error and Gaussian count, apply one density refinement, and inspect the immediate change. Fit another 25 updates and distinguish the representation change from the benefit of subsequent learning.',
      takeaway:'Adding capacity and finding a better prediction are separate operations.',
      feedback:['The centre is only one pixel. Compare the full dependence on the Gaussian value φ.','Alpha compositing introduces a product of transmittances, so it is not an additive basis sum.','Yes. Derive the quadratic term and connect it to the need to fit after refinement.']
    }
  ],
  nerf:[
    {
      id:'n1',level:'VOLUME RENDERING · OPTICAL THICKNESS',
      scenario:'A ray crosses a homogeneous slab of length L = 1 with density σ = 2 and constant RGB. You approximate it with N equal intervals of length δ = L/N, using αᵢ = 1 − exp(−σδ).',
      title:'What happens to total transmittance if you change N from 10 to 100?',
      options:['It decreases by a factor of ten because the ray encounters ten times as many samples.','It stays exp(−2); each smaller interval has proportionally less optical thickness.','It becomes zero because enough samples make any positive density fully opaque.'],correct:1,
      hint:'Multiply the interval transmittances. Keep the total physical path length fixed when changing the sample count.',
      explanation:[
        'Each interval transmits exp(−σL/N). Multiplying N such factors gives exp(−σL), independent of N. Here T_end = exp(−2), approximately 0.1353. With constant colour, the slab contribution is (1−exp(−2))c, plus the remaining background.',
        'Density has units of inverse distance; alpha is dimensionless and depends on interval length. Holding alpha fixed while increasing N would change the modeled optical thickness. For a spatially varying field, additional samples can improve the numerical integral when they resolve its variation; the homogeneous example is exactly integrated by this rule.'
      ],
      equation:'δ = L/N; 1−αᵢ = exp(−σL/N)\nT_end = ∏ᵢ exp(−σL/N) = exp(−σL)\nN=10: α≈0.1813; N=100: α≈0.0198; both give T_end≈0.1353.',
      extension:'If a thin high-density feature lies entirely between the sample points, does a low sampled density prove the ray is empty?',
      extensionAnswer:'No. Midpoint samples can miss a thin feature. Increasing or redistributing samples addresses integration error of the current field. It does not by itself add observations, learn the missing structure, or guarantee a correct field. Distinguish field approximation from quadrature error.',
      experiment:'In the NeRF section, inspect the reference field at yaw 90° and the centre ray. Compare 8 and 64 samples, their interval lengths, alpha values, and T_end. This field is nonuniform, so equality is not expected; explain changes through where samples fall and the σδ products.',
      takeaway:'NeRF density is not a per-sample opacity. Sampling and physical optical thickness must be kept distinct.',
      feedback:['The number of samples increases while their physical interval length decreases. Account for both changes.','Yes. Derive the product of interval transmittances and explain why a nonuniform field can behave differently numerically.','Finite total optical thickness leaves positive transmittance, regardless of how finely this constant slab is subdivided.']
    },
    {
      id:'n2',level:'NEURAL FIELDS · MULTI-VIEW CONSISTENCY',
      scenario:'In a classical NeRF-style model, density is σθ(x), while RGB is cθ(x,d). A proposed variant also lets density depend freely on viewing direction: σθ(x,d).',
      title:'Why is position-only density a useful constraint for reconstructing a static scene?',
      options:['It makes all colour independent of camera direction and therefore guarantees Lambertian appearance.','It guarantees unique geometry whenever training pixel error is small.','It makes different cameras query the same spatial extinction field, while allowing directional appearance in the RGB branch.'],correct:2,
      hint:'Ask which quantity represents shared spatial structure and which quantity may legitimately vary with viewing direction.',
      explanation:[
        'A static spatial density field should supply consistent extinction at the same location across views. Restricting density to position encourages the cameras to explain images using shared structure. Colour can still depend on direction, allowing view-related appearance changes without directly changing the density at that position.',
        'The network weights are adjusted through a differentiable pixel loss. The network is not given a target density at every sample. Direction-dependent density could make independent per-view explanations easier, while position-only density still does not remove all image-based ambiguities. Coverage, initialization, architecture, and optimization continue to matter.'
      ],
      equation:'σ = σθ(x); c = cθ(x,d)\nθ ← θ − η∇θ mean over training rays of ‖Cθ(r)−C_target(r)‖²',
      extension:'Is increasing the number of samples per ray the NeRF equivalent of adding more Gaussian primitives?',
      extensionAnswer:'No. More ray samples change where and how accurately a fixed field is evaluated; network parameter count stays fixed. Adding Gaussians changes the explicit scene parameterization. Sampling also changes the numerical gradients used during subsequent fitting, so it can affect learning even though it does not increase neural-field capacity.',
      experiment:'Fit 50 updates and note the weight count. Change samples per ray and inspect the changed rendering while weights and update count remain fixed. Then continue fitting. Compare training and reserved-view errors, and connect the distinction between sampling and capacity to Gaussian density refinement.',
      takeaway:'Shared scene structure, directional appearance, quadrature, and model capacity are separate design choices.',
      feedback:['The RGB branch can still depend on viewing direction. Only density is restricted to position.','Position-only density adds a consistency constraint; it does not make inverse rendering uniquely solvable.','Yes. Explain which part of the model is shared across cameras, then distinguish additional samples from additional parameters.']
    }
  ],
  highres:[
    {
      id:'h1',level:'APPEARANCE · REPRESENTATION CHOICE',
      scenario:'Suppose a glossy leaf changes brightness with viewing direction in the captured photographs, but a reconstruction represents each Gaussian with one fixed RGB value. Even with good spatial coverage, a highlight appears painted onto the surface.',
      title:'Which model change directly addresses this missing behavior?',
      options:['Increase the image resolution while keeping the same trained constant-RGB splats.','Let each Gaussian’s emitted colour depend on viewing direction, for example through spherical harmonics.','Normalize every spatial Gaussian to integrate to one.'],correct:1,
      hint:'Separate where the primitive contributes from how its appearance varies with the outgoing viewing direction.',
      explanation:[
        'The spatial Gaussian specifies local support; the appearance model specifies colour. A fixed RGB value cannot directly express a view-dependent highlight. Direction-dependent colour coefficients add that degree of freedom. Full 3DGS uses spherical harmonics for this purpose; the compact Garden viewer used here displays RGB appearance.',
        'Additional spatial splats may partly compensate for an inadequate appearance model, but that can entangle geometry and colour rather than model the directional effect directly. Higher output resolution changes sampling, not the trained appearance parameters. A richer appearance model also needs observations that constrain it.'
      ],
      equation:'Constant appearance: cᵢ\nDirectional appearance: cᵢ(d) = Σ over ℓ,m of βᵢ,ℓm Yℓm(d)',
      extension:'Could a low photometric error prove that positions and covariances are correct when colour is very flexible?',
      extensionAnswer:'No. Geometry and appearance can compensate for each other under finite observations. Evaluate new viewing directions and, when geometry matters, use independent geometric evidence. Directional colour increases expressiveness; it is not a uniqueness guarantee.',
      experiment:'In section 4, isolate one Gaussian and orbit it. Its footprint changes while its assigned RGB remains fixed. In the Garden, look for view-related appearance changes or limitations, but do not infer the model’s training loss from the viewer alone.',
      takeaway:'Choose spatial and appearance parameterizations to match the phenomenon being fitted.',
      feedback:['Resolution alone cannot add directional dependence to a stored RGB parameter.','Yes. Explain which part of the forward model changes and why it requires informative views.','Probability normalization changes spatial amplitude, not its dependence on the viewing direction.']
    },
    {
      id:'h2',level:'TRANSFER · RENDERING VS GEOMETRY',
      scenario:'The garden looks sharp from several viewpoints. A colleague wants to treat the visible Gaussian ellipsoids as a reliable surface model for collision detection.',
      title:'What does the rendering evidence justify?',
      options:['It supports appearance quality from those views; reliable collision geometry needs additional geometric validation and a defined surface representation.','Sharp novel views establish that every 1σ ellipsoid lies on the true surface.','Enough high-opacity Gaussians guarantee a watertight boundary, even in unobserved regions.'],correct:0,
      hint:'What did the fitting objective compare? Does a Gaussian’s chosen level set have to coincide with a physical surface?',
      explanation:[
        'A photometric objective constrains rendered rays. It does not directly supervise a watertight boundary, distances, or normals. Gaussian ellipsoids describe spatial kernels; a 1σ contour is a visualization convention, not a measured surface. Overlapping, partially transparent primitives can explain images without defining unique collision geometry.',
        'For a geometry-dependent application, define how a surface is obtained and validate it against independent depth, geometry, or task-relevant measurements, including previously occluded regions. An accurate renderer can be valuable for novel-view synthesis while remaining insufficient evidence for a different task.'
      ],
      equation:'Low image error on observed rays does not imply low surface-distance error.\nA Gaussian level set is not automatically a physical boundary.',
      extension:'If rendering at twice the resolution reveals smaller floaters, has the underlying geometry become worse?',
      extensionAnswer:'No. Changing output resolution can expose existing artifacts without changing the stored model. Distinguish representation quality, observation coverage, and display sampling when explaining what you see.',
      experiment:'Explore viewpoints away from the garden’s comfortable viewing region. Inspect thin structures, gaps, and floaters. Return to the primitive experiment and compare its reference surfaces with the learned kernels: ask what is measured, what is fitted, and what remains unsupported.',
      takeaway:'Evaluate a learned representation against the intended task, not only the visual plausibility of its renders.',
      feedback:['Yes. State the extra evidence and surface definition needed for the proposed use.','A standard-deviation ellipsoid is a kernel level set. It was not constrained to lie on a physical boundary.','High opacity does not impose surface topology, watertightness, or correct geometry in unobserved areas.']
    }
  ]
};
