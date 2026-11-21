"""Generate sampled MoGe-2 point maps for the tutorial's three NYU images."""
from pathlib import Path
import numpy as np
from PIL import Image
import torch
from huggingface_hub import hf_hub_download
from moge.model.v2 import MoGeModel

torch.set_num_threads(4)
assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
checkpoint = hf_hub_download('Ruicheng/moge-2-vits-normal', 'model.pt', revision='26b477f41595707c5db6770294c0d1721e8ed4ed')
model = MoGeModel.from_pretrained(checkpoint).eval()
for index in range(3):
    image = Image.open(assets / f'nyu{index}-rgb.png').convert('RGB').resize((640, 480))
    inputs = torch.from_numpy(np.array(image)).permute(2, 0, 1).float() / 255
    with torch.no_grad():
        result = model.infer(inputs, resolution_level=4, use_fp16=False)
    points = result['points'].cpu().numpy()
    mask = result['mask'].cpu().numpy().astype(bool)
    sample = points[2::4, 2::4].astype('<f4')
    valid = mask[2::4, 2::4] & np.isfinite(sample).all(axis=-1)
    sample[~valid] = 0
    (assets / f'nyu{index}-moge-xyz.f32').write_bytes(sample.tobytes())
    print(f'point map {index}: {valid.sum()} valid points', flush=True)
