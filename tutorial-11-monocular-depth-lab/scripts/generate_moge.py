"""Generate metric axial-depth predictions for the three NYU examples."""
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from huggingface_hub import hf_hub_download
from moge.model.v2 import MoGeModel

assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
checkpoint = hf_hub_download('Ruicheng/moge-2-vits-normal', 'model.pt', revision='26b477f41595707c5db6770294c0d1721e8ed4ed')
model = MoGeModel.from_pretrained(checkpoint).eval()
for index in range(3):
    image = Image.open(assets / f'nyu{index}-rgb.png').convert('RGB').resize((640, 480))
    inputs = torch.from_numpy(np.array(image)).permute(2, 0, 1).float() / 255
    with torch.no_grad():
        prediction = model.infer(inputs, resolution_level=4, use_fp16=False)
    depth = prediction['depth'].cpu().numpy()
    valid = np.isfinite(depth) & (depth > 0)
    metric = np.where(valid, depth, 0).astype('float32')
    sampled = np.asarray(Image.fromarray(metric, mode='F').resize((160, 120), resample=Image.Resampling.NEAREST), dtype='<f4')
    (assets / f'nyu{index}-moge.f32').write_bytes(sampled.tobytes())
