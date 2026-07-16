from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageFile
from torchvision.transforms import InterpolationMode
from torchvision.transforms import functional as TF

from ml.astrobone_ml.data import IMAGENET_MEAN, IMAGENET_STD
from ml.astrobone_ml.models import build_densenet121_classifier, build_unetpp
from ml.astrobone_ml.train_utils import get_device, save_json

ImageFile.LOAD_TRUNCATED_IMAGES = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Run AstroBone classifier + segmenter on one X-ray.")
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--classifier", type=Path, default=Path("ml/runs/classifier_densenet121/best_classifier.pt"))
    parser.add_argument("--segmenter", type=Path, default=Path("ml/runs/segmentation_unetpp_densenet121/best_segmenter.pt"))
    parser.add_argument("--out-dir", type=Path, default=Path("ml/inference/latest"))
    parser.add_argument("--classification-threshold", type=float, default=0.5)
    parser.add_argument("--mask-threshold", type=float, default=0.5)
    parser.add_argument("--prefer-cuda", action="store_true", default=True)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    device = get_device(args.prefer_cuda)

    image = Image.open(args.image).convert("RGB")
    classifier = load_classifier(args.classifier, device)
    segmenter = load_segmenter(args.segmenter, device)

    fracture_probability = predict_classifier(classifier, image, device)
    mask_prob = predict_segmenter(segmenter, image, device)
    mask = (mask_prob >= args.mask_threshold).astype(np.uint8)
    mask_area_fraction = float(mask.mean())

    overlay_path = args.out_dir / f"{args.image.stem}_overlay.png"
    mask_path = args.out_dir / f"{args.image.stem}_mask.png"
    json_path = args.out_dir / f"{args.image.stem}_prediction.json"

    save_mask(mask, mask_path)
    save_overlay(image, mask, overlay_path)

    payload = {
        "image": str(args.image.resolve()),
        "classifierCheckpoint": str(args.classifier.resolve()),
        "segmenterCheckpoint": str(args.segmenter.resolve()),
        "fractureProbability": fracture_probability,
        "classificationThreshold": args.classification_threshold,
        "fractureDetected": fracture_probability >= args.classification_threshold,
        "maskThreshold": args.mask_threshold,
        "maskAreaFraction": mask_area_fraction,
        "overlayPath": str(overlay_path.resolve()),
        "maskPath": str(mask_path.resolve()),
        "modelWarning": "Research prototype only. Not a clinical diagnosis.",
    }
    save_json(json_path, payload)

    print(f"fracture_probability={fracture_probability:.4f}")
    print(f"fracture_detected={payload['fractureDetected']}")
    print(f"mask_area_fraction={mask_area_fraction:.4f}")
    print(f"overlay={overlay_path}")
    print(f"json={json_path}")


def load_classifier(path: Path, device: torch.device) -> torch.nn.Module:
    checkpoint = torch.load(path, map_location=device, weights_only=False)
    model = build_densenet121_classifier(num_classes=2, pretrained=False)
    model.load_state_dict(checkpoint["model"])
    model.to(device)
    model.eval()
    return model


def load_segmenter(path: Path, device: torch.device) -> torch.nn.Module:
    checkpoint = torch.load(path, map_location=device, weights_only=False)
    config = checkpoint.get("config", {})
    model = build_unetpp(
        encoder_name=config.get("encoder_name", "densenet121"),
        encoder_weights=None,
        classes=1,
    )
    model.load_state_dict(checkpoint["model"])
    model.to(device)
    model.eval()
    return model


@torch.no_grad()
def predict_classifier(model: torch.nn.Module, image: Image.Image, device: torch.device) -> float:
    tensor = preprocess_image(image, 224).unsqueeze(0).to(device)
    logits = model(tensor)
    return float(torch.softmax(logits, dim=1)[0, 1].detach().cpu())


@torch.no_grad()
def predict_segmenter(model: torch.nn.Module, image: Image.Image, device: torch.device) -> np.ndarray:
    tensor = preprocess_image(image, 256).unsqueeze(0).to(device)
    logits = model(tensor)
    prob = torch.sigmoid(logits)[0, 0].detach().cpu().numpy()
    return prob


def preprocess_image(image: Image.Image, size: int) -> torch.Tensor:
    resized = TF.resize(image, [size, size], InterpolationMode.BILINEAR)
    tensor = TF.to_tensor(resized)
    return TF.normalize(tensor, IMAGENET_MEAN, IMAGENET_STD)


def save_mask(mask: np.ndarray, path: Path) -> None:
    Image.fromarray((mask * 255).astype(np.uint8), mode="L").save(path)


def save_overlay(image: Image.Image, mask: np.ndarray, path: Path) -> None:
    base = image.resize((mask.shape[1], mask.shape[0]), Image.Resampling.BILINEAR).convert("RGBA")
    red = Image.new("RGBA", base.size, (255, 66, 58, 0))
    alpha = Image.fromarray((mask * 135).astype(np.uint8), mode="L")
    red.putalpha(alpha)
    blended = Image.alpha_composite(base, red)
    blended.save(path)


if __name__ == "__main__":
    main()
