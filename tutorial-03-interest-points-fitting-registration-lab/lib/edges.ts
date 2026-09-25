export type EdgeProfileSample = {
  x: number;
  intensity: number;
  gradient: number;
};

function erf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - polynomial * Math.exp(-x * x));
}

export function gaussianStepProfile(edgePosition: number, contrast: number, sigma: number, sampleCount = 101): EdgeProfileSample[] {
  const safeSigma = Math.max(0.01, sigma);
  const normalizer = contrast / (Math.sqrt(2 * Math.PI) * safeSigma);
  return Array.from({ length: sampleCount }, (_, index) => {
    const x = index * 100 / (sampleCount - 1);
    const distance = x - edgePosition;
    return {
      x,
      intensity: 0.1 + contrast * 0.5 * (1 + erf(distance / (Math.sqrt(2) * safeSigma))),
      gradient: normalizer * Math.exp(-(distance * distance) / (2 * safeSigma * safeSigma)),
    };
  });
}

export function edgeDetectionInterval(edgePosition: number, contrast: number, sigma: number, threshold: number) {
  const peak = contrast / (Math.sqrt(2 * Math.PI) * sigma);
  if (threshold <= 0 || threshold > peak) return { peak, interval: null as [number, number] | null };
  const radius = sigma * Math.sqrt(2 * Math.log(peak / threshold));
  return { peak, interval: [Math.max(0, edgePosition - radius), Math.min(100, edgePosition + radius)] as [number, number] };
}
