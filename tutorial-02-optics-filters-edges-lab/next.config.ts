import type { NextConfig } from 'next';

// Static export for GitHub Pages. LABS_BASE_PATH is this lab's folder on the
// course site, e.g. /Unibe-CVG-CV-Interactive-Labs/tutorial-04; local previews leave it empty.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: process.env.LABS_BASE_PATH ?? '',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
