from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

import pandas as pd
from PIL import Image, ImageDraw

from ml.scripts.make_splits import collect_fracatlas_classification, split_frame, write_summary

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare FracAtlas classification and segmentation manifests.")
    parser.add_argument("--dataset-root", type=Path, required=True)
    parser.add_argument("--processed-dir", type=Path, default=Path("data/processed/fracatlas"))
    parser.add_argument("--split-dir", type=Path, default=Path("data/splits/fracatlas"))
    parser.add_argument("--train", type=float, default=0.7)
    parser.add_argument("--val", type=float, default=0.15)
    parser.add_argument("--test", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    args.processed_dir.mkdir(parents=True, exist_ok=True)
    args.split_dir.mkdir(parents=True, exist_ok=True)

    classification = collect_fracatlas_classification(args.dataset_root)
    if classification.empty:
        raise SystemExit(f"No FracAtlas classification images found under {args.dataset_root}")
    write_splits(classification, args.split_dir, "classification", args)

    coco_json = find_coco_json(args.dataset_root)
    if coco_json is None:
        print("No COCO JSON found. Classification splits were created, segmentation splits were skipped.")
        write_summary(args.split_dir, argparse.Namespace(**vars(args), dataset_type="fracatlas"))
        return

    segmentation = rasterize_coco_masks(args.dataset_root, coco_json, args.processed_dir / "masks")
    if segmentation.empty:
        print("COCO JSON was found, but no polygon masks were generated.")
    else:
        write_splits(segmentation, args.split_dir, "segmentation", args)
    write_summary(args.split_dir, argparse.Namespace(**vars(args), dataset_type="fracatlas"))


def find_coco_json(root: Path) -> Path | None:
    candidates = []
    for path in root.rglob("*.json"):
        try:
            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(payload, dict) and "images" in payload and "annotations" in payload:
            candidates.append(path)
    if not candidates:
        return None
    candidates.sort(key=lambda item: ("coco" not in str(item).lower(), len(str(item))))
    return candidates[0]


def rasterize_coco_masks(root: Path, coco_json: Path, mask_dir: Path) -> pd.DataFrame:
    mask_dir.mkdir(parents=True, exist_ok=True)
    with coco_json.open("r", encoding="utf-8") as handle:
        coco = json.load(handle)

    images = {int(item["id"]): item for item in coco.get("images", [])}
    annotations_by_image: dict[int, list[dict]] = defaultdict(list)
    for annotation in coco.get("annotations", []):
        annotations_by_image[int(annotation["image_id"])].append(annotation)

    image_lookup = build_image_lookup(root)
    rows = []
    skipped_rle = 0
    for image_id, image_info in images.items():
        file_name = image_info.get("file_name") or image_info.get("path")
        image_path = resolve_image_path(root, image_lookup, file_name)
        if image_path is None:
            continue

        width = int(image_info.get("width") or Image.open(image_path).width)
        height = int(image_info.get("height") or Image.open(image_path).height)
        mask = Image.new("L", (width, height), 0)
        draw = ImageDraw.Draw(mask)
        wrote_polygon = False

        for annotation in annotations_by_image.get(image_id, []):
            segmentation = annotation.get("segmentation")
            if isinstance(segmentation, list):
                for polygon in segmentation:
                    if len(polygon) < 6:
                        continue
                    points = list(zip(polygon[0::2], polygon[1::2]))
                    draw.polygon(points, fill=255)
                    wrote_polygon = True
            elif segmentation:
                skipped_rle += 1

        if not wrote_polygon:
            continue

        mask_path = mask_dir / f"{image_path.stem}.png"
        mask.save(mask_path)
        rows.append({
            "image_path": str(image_path.resolve()),
            "mask_path": str(mask_path.resolve()),
            "group_id": infer_group_id(image_path),
        })

    if skipped_rle:
        print(f"Skipped {skipped_rle} RLE annotation(s); polygon masks were generated where possible.")
    print(f"Generated {len(rows)} segmentation mask(s) from {coco_json}")
    return pd.DataFrame(rows)


def build_image_lookup(root: Path) -> dict[str, Path]:
    lookup = {}
    for path in root.rglob("*"):
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        lookup[path.name] = path
        lookup[path.stem] = path
        lookup[str(path.relative_to(root)).replace("\\", "/")] = path
    return lookup


def resolve_image_path(root: Path, lookup: dict[str, Path], file_name: str | None) -> Path | None:
    if not file_name:
        return None
    normalized = file_name.replace("\\", "/")
    direct = root / normalized
    if direct.exists():
        return direct
    return lookup.get(normalized) or lookup.get(Path(file_name).name) or lookup.get(Path(file_name).stem)


def write_splits(frame: pd.DataFrame, out_dir: Path, prefix: str, args: argparse.Namespace) -> None:
    train_df, val_df, test_df = split_frame(frame, args.train, args.val, args.test, args.seed)
    train_df.to_csv(out_dir / f"{prefix}_train.csv", index=False)
    val_df.to_csv(out_dir / f"{prefix}_val.csv", index=False)
    test_df.to_csv(out_dir / f"{prefix}_test.csv", index=False)
    print(f"{prefix}: train={len(train_df)} val={len(val_df)} test={len(test_df)}")


def infer_group_id(path: Path) -> str:
    name = path.stem
    for separator in ["__", "_", "-"]:
        if separator in name:
            return name.split(separator)[0]
    return name


if __name__ == "__main__":
    main()
