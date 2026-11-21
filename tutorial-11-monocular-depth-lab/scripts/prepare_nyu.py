"""Prepare one explicitly supplied NYU RGB-D HDF5 sample for the tutorial."""
import sys
from pathlib import Path
import h5py
import numpy as np
from PIL import Image

if len(sys.argv) != 3 or sys.argv[2] not in {'0', '1', '2'}:
    raise SystemExit('Usage: python prepare_nyu.py SAMPLE.h5 0|1|2')
assets = Path(__file__).resolve().parent.parent / 'dist' / 'assets'
index = sys.argv[2]
with h5py.File(sys.argv[1], 'r') as source:
    rgb = np.asarray(source['rgb']).transpose(1, 2, 0)
    depth = np.asarray(source['depth'], dtype='float32')
Image.fromarray(rgb).save(assets / f'nyu{index}-rgb.png', optimize=True)
sampled = np.asarray(Image.fromarray(depth, mode='F').resize((160, 120), Image.Resampling.NEAREST), dtype='<f4')
(assets / f'nyu{index}-reference.f32').write_bytes(sampled.tobytes())
