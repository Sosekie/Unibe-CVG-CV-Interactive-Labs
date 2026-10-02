// Two short questions per lab, taken from the simplest parts of the Tutorial 04 worksheet.
export const tutorialQuestions = [
  {
    id: 't04-integration-plane', groupName: 'Normal Integration', difficulty: 'Easy', sortOrder: 1,
    prompt: 'For the plane z = 2x − y + 3, what are p, q and the unit normal n (convention of slide 9)? Why is n₁ negative?',
    answer: 'zₓ = 2 and zᵧ = −1, so p = −zₓ = −2 and q = −zᵧ = 1. N = (−2, 1, 1)ᵀ and n = (−2, 1, 1)ᵀ/√6. The plane rises toward +x, so it faces the −x side: the normal leans opposite to the uphill direction. Check: ∇z = −(n₁/n₃, n₂/n₃) = (2, −1).',
  },
  {
    id: 't04-integration-test', groupName: 'Normal Integration', difficulty: 'Easy', sortOrder: 2,
    prompt: 'Which condition must a slope field (p, q) satisfy to come from a depth map? Test (p, q) = (y, x) and (p, q) = (y, 0).',
    answer: 'Mixed derivatives of a smooth depth map agree, zₓᵧ = zᵧₓ, so pᵧ = qₓ. For (y, x): pᵧ = 1 = qₓ, integrable, with z = −xy + C. For (y, 0): pᵧ = 1 but qₓ = 0, so no depth map has these slopes; integrating from (0, 0) to (1, 1) gives 0 through (1, 0) but −1 through (0, 1).',
  },
  {
    id: 't04-stereo-count', groupName: 'Photometric Stereo', difficulty: 'Easy', sortOrder: 3,
    prompt: 'What is the minimum number of images for photometric stereo? Can the lights (0, 0, 1), (1, 0, 1)/√2 and (−1, 0, 1)/√2 be used?',
    answer: 'Three: g = ρn has three unknown components and each image gives one linear equation Iₖ = Lₖsₖᵀg. The light directions must be linearly independent. These three all have zero y-component, so they lie in the x-z plane and S has rank 2: g + t(0, 1, 0) fits equally well, so n₂ and ρ cannot be recovered.',
  },
  {
    id: 't04-stereo-solve', groupName: 'Photometric Stereo', difficulty: 'Medium', sortOrder: 4,
    prompt: 'With unit-intensity lights s₁ = (0, 0, 1), s₂ = (1, 0, 1)/√2 and s₃ = (0, 1, 1)/√2, a pixel measures I = (1/5, 3√2/10, 3√2/10). What are ρ and n?',
    answer: 'Solve Sg = I row by row: g₃ = 1/5; (g₁ + g₃)/√2 = 3√2/10 gives g₁ = 2/5; likewise g₂ = 2/5. So g = (2/5, 2/5, 1/5), ρ = ‖g‖ = 3/5 and n = g/ρ = (2/3, 2/3, 1/3). The length of g is the albedo, its direction the normal.',
  },
  {
    id: 't04-reflectance-peak', groupName: 'Light & Reflectance', difficulty: 'Easy', sortOrder: 5,
    prompt: 'Under a distant light s ∝ (1, 0, 1) with ρ = L = 1, which orientation (p, q) is brightest, and which orientations are black?',
    answer: 'R(p, q) = (p + 1)/(√2·√(p² + q² + 1)). Since R = cos θᵢ ≤ 1, the maximum R = 1 is at n = s, that is (p, q) = (1, 0) (slide 12). R = 0 on the line p = −1, where the light grazes the surface; orientations with p < −1 face away from the light and are in attached shadow.',
  },
  {
    id: 't04-near-light-peak', groupName: 'Light & Reflectance', difficulty: 'Easy', sortOrder: 6,
    prompt: 'A point light at A = (5, 5, 10) shines on the Lambertian plane z = 0 (ρ = L = 1). With the unit light direction s = (A − X)/‖A − X‖ at each point X, where is the brightest point, and why?',
    answer: 'With n = (0, 0, 1) and X = (x, y, 0), B(x, y) = 10/√((x − 5)² + (y − 5)² + 100). The distance is smallest, 10, at (5, 5), so the brightest point is (5, 5, 0) with B = 1, directly below the light, where s = n.',
  },
] as const;
