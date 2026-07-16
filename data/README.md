# Data Directory

Place downloaded datasets here, but do not commit them to git.

Recommended structure:

```text
data/
  raw/
    grazpedwri-dx/
    fracatlas/
    mura/
    rsna-cspine/
  processed/
    grazpedwri-yolo/
    fracatlas-coco/
  splits/
  reports/
```

Start with:

1. GRAZPEDWRI-DX for fracture object detection.
2. FracAtlas for multi-region classification/localization/segmentation.

See `docs/dataset-plan.md` for links and rationale.
