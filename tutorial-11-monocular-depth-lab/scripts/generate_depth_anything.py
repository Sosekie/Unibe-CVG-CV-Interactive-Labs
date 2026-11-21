"""Generate relative inverse-depth predictions for the three NYU examples."""
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from transformers import AutoImageProcessor, AutoModelForDepthEstimation

assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
checkpoint = 'depth-anything/Depth-Anything-V2-Small-hf'
revision = '5426e4f0f36572d16453bbda7a8389317b1bef99'
processor = AutoImageProcessor.from_pretrained(checkpoint, revision=revision)
model = AutoModelForDepthEstimation.from_pretrained(checkpoint, revision=revision).eval()
for index in range(3):
    image = Image.open(assets / f'nyu{index}-rgb.png').convert('RGB')
    inputs = processor(images=image, return_tensors='pt')
    with torch.no_grad():
        output = model(**inputs).predicted_depth
        output = torch.nn.functional.interpolate(output.unsqueeze(1), size=(image.height, image.width), mode='bicubic', align_corners=False).squeeze().cpu().numpy()
    sampled = np.asarray(Image.fromarray(output, mode='F').resize((160, 120), resample=Image.Resampling.NEAREST), dtype='<f4')
    (assets / f'nyu{index}-da2.f32').write_bytes(sampled.tobytes())
    lo, hi = np.percentile(output, [1, 99])
    display = np.uint8(np.clip((output - lo) / (hi - lo), 0, 1) * 255)
    Image.fromarray(display).save(assets / f'nyu{index}-da2.png', optimize=True)
