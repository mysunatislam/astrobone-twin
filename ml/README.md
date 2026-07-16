# AstroBone Deep Learning Track

This folder contains the training pipeline for the imaging side of AstroBone.

The first supported workflows are:

- DenseNet121 fracture classification
- U-Net++ fracture segmentation with a DenseNet121 encoder
- reproducible train/validation/test splitting
- tiny synthetic dataset generation for smoke tests

The actual medical datasets should live under `data/raw/` and should not be committed to git.

## 1. Create Splits

For a FracAtlas-style folder:

```bash
python -m ml.scripts.prepare_fracatlas \
  --dataset-root data/raw/fracatlas \
  --processed-dir data/processed/fracatlas \
  --split-dir data/splits/fracatlas
```

This creates classification splits and, when COCO polygon annotations are present, rasterizes fracture masks for U-Net++.

For a simple classification folder:

```text
dataset-root/
  Fractured/
  Non-fractured/
```

run:

```bash
python -m ml.scripts.make_splits \
  --dataset-root data/raw/my_dataset \
  --dataset-type folder-classification \
  --out-dir data/splits/my_dataset
```

The splitter writes:

```text
classification_train.csv
classification_val.csv
classification_test.csv
segmentation_train.csv
segmentation_val.csv
segmentation_test.csv
```

Segmentation CSVs are only created when mask files are available.

## 2. Train DenseNet121 Classifier

```bash
python -m ml.scripts.train_classifier \
  --config ml/configs/classifier_densenet121.yaml
```

## 3. Train U-Net++ Segmenter

```bash
python -m ml.scripts.train_segmentation \
  --config ml/configs/segmentation_unetpp_densenet121.yaml
```

## 4. Smoke Test Without A Real Dataset

```bash
python -m ml.scripts.make_synthetic_dataset --out-dir data/synthetic/fracture_demo
python -m ml.scripts.train_classifier --config ml/configs/smoke_classifier.yaml
python -m ml.scripts.train_segmentation --config ml/configs/smoke_segmentation.yaml
```

## 5. Run Inference On One X-Ray

After both real models finish training:

```bash
python -m ml.scripts.predict_image \
  --image path/to/xray.jpg \
  --out-dir ml/inference/demo
```

This writes:

- fracture probability
- binary fracture mask
- red overlay image
- JSON output for the digital twin

## Model Positioning

The imaging model answers:

> Is a fracture pattern visible in the image, and where is it?

The digital twin answers:

> Given impact physics and bone fragility, what is the risk process and why?

Keep these separate. Do not present the model as a clinical diagnosis tool.
