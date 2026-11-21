# RGB-D examples and model predictions

The tutorial uses three RGB-D examples from [NYU Depth V2](https://cs.nyu.edu/~fergus/datasets/nyu_depth_v2.html), via the [sayakpaul dataset mirror](https://huggingface.co/datasets/sayakpaul/nyu_depth_v2): `val/official/00001.h5`, `00002.h5` and `00009.h5` in `data/val-000000.tar`. They are identified in the tutorial as A, B and C. The reference depth is processed RGB-D sensor data, not perfect ground truth; it may contain filled or uncertain values. These examples are intended for visual exploration, not a benchmark; the pretrained models may have encountered related images during training.

`prepare_nyu.py` extracts the RGB image and reference depth from a supplied `.h5` sample. Depth is sampled to 160 × 120 using nearest-neighbour sampling and stored as little-endian float32. The raw sensor reference and model output are used only under the crop and validity mask specified in the page.

`generate_depth_anything.py` computes the relative output for A, B and C from `depth-anything/Depth-Anything-V2-Small-hf`, revision `5426e4f0f36572d16453bbda7a8389317b1bef99`, using PyTorch 2.9.0 and Transformers 5.7.0. The checkpoint processor's default resize and normalisation are used. Each output is bicubically resized to 640 × 480 and sampled to 160 × 120 in little-endian float32. The tutorial displays the sampled scores using per-image 1st-99th percentile scaling, inverted so that dark represents near. No metric interpretation or calibration is applied.

`generate_moge.py` computes the predictions for A, B and C using `Ruicheng/moge-2-vits-normal`, revision `26b477f41595707c5db6770294c0d1721e8ed4ed`, with MoGe source revision `74fbce054ebed49800de42d0ad0e83495065719a` and utils3d-moge revision `62f09d58509485564e24d5d9f6aac9ee9ebc0c37`. Inputs are 640 × 480 RGB; inference uses resolution level 4 with focal length inferred, float32 on CPU. Positive finite predicted axial depths are sampled to 160 × 120 by nearest-neighbour sampling, with zero for invalid pixels.

`generate_moge_pointmaps.py` saves the actual metric point map and valid mask produced by MoGe-2 for each image, sampled at pixel centres to 160 x 120. The MoGe-2 point-cloud view displays these predicted XYZ coordinates directly. The comparison view back-projects the sensor reference using fixed, commonly used NYU RGB-camera intrinsics. The scripts require the corresponding model packages, checkpoints and dataset files. They are not needed to use the page, and runtime version differences can affect exact output.

The original street-image predictions from the previous draft remain in `dist/assets` for reference; they are not used by the current tutorial.

## Depth Pro paper figures

The `paper-dis-*` and `paper-am-*` images are the input photographs and the Depth Pro and Depth Anything V2 visualisations from Figure 1 of [Depth Pro](https://arxiv.org/html/2410.02073#S1.F1), Bochkovskii et al.
The original photographs are sourced in the paper from DIS-5K and AM-2K.
The images are provided as visualisations, not raw metric data.
They use independent display scales and are not a controlled architectural ablation.
The local tutorial cites the source beside the images.

## MoGe-2 paper figures

`moge-paper-refinement.png` and `moge-paper-ablation.png` reproduce Figures 4 and 7 from [MoGe-2](https://arxiv.org/html/2507.02546v1), Wang et al.
The former shows ScanNet++ and Argoverse2 examples; the tutorial displays the ScanNet++ row.
The raw, filtered and completed visualisations are the paper's displayed training annotations, while Figure 7 shows predictions from differently trained models.
