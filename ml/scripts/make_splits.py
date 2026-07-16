from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, train_test_split

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Create train/val/test CSV manifests.")
    parser.add_argument("--dataset-root", required=True, type=Path)
    parser.add_argument("--dataset-type", choices=["fracatlas", "folder-classification"], required=True)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--train", type=float, default=0.7)
    parser.add_argument("--val", type=float, default=0.15)
    parser.add_argument("--test", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    validate_ratios(args.train, args.val, args.test)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    if args.dataset_type == "folder-classification":
        classification = collect_folder_classification(args.dataset_root)
    else:
        classification = collect_fracatlas_classification(args.dataset_root)
        segmentation = collect_mask_pairs(args.dataset_root)
        if not segmentation.empty:
            write_split_csvs(segmentation, args.out_dir, "segmentation", args)

    if classification.empty:
        raise SystemExit(f"No classification images found under {args.dataset_root}")

    write_split_csvs(classification, args.out_dir, "classification", args)
    write_summary(args.out_dir, args)


def collect_folder_classification(root: Path) -> pd.DataFrame:
    rows = []
    class_map = {
        "non-fractured": 0,
        "non_fractured": 0,
        "normal": 0,
        "negative": 0,
        "fractured": 1,
        "fracture": 1,
        "positive": 1,
    }

    for image_path in find_images(root):
        parent = normalize_name(image_path.parent.name)
        if parent not in class_map:
            continue
        rows.append({
            "image_path": str(image_path.resolve()),
            "label": class_map[parent],
            "group_id": infer_group_id(image_path),
        })
    return pd.DataFrame(rows)


def collect_fracatlas_classification(root: Path) -> pd.DataFrame:
    image_root = root / "images"
    if not image_root.exists():
        image_root = root / "Images"
    if not image_root.exists():
        image_root = root
    return collect_folder_classification(image_root)


def collect_mask_pairs(root: Path) -> pd.DataFrame:
    image_by_stem = {path.stem: path for path in find_images(root)}
    mask_candidates = []
    for folder_name in ["masks", "Masks", "mask", "Mask"]:
        mask_root = root / folder_name
        if mask_root.exists():
            mask_candidates.extend(find_images(mask_root))

    rows = []
    for mask_path in mask_candidates:
        image_path = image_by_stem.get(mask_path.stem)
        if image_path is None:
            continue
        rows.append({
            "image_path": str(image_path.resolve()),
            "mask_path": str(mask_path.resolve()),
            "group_id": infer_group_id(image_path),
        })
    return pd.DataFrame(rows)


def write_split_csvs(frame: pd.DataFrame, out_dir: Path, prefix: str, args: argparse.Namespace) -> None:
    train_df, val_df, test_df = split_frame(frame, args.train, args.val, args.test, args.seed)
    train_df.to_csv(out_dir / f"{prefix}_train.csv", index=False)
    val_df.to_csv(out_dir / f"{prefix}_val.csv", index=False)
    test_df.to_csv(out_dir / f"{prefix}_test.csv", index=False)
    print(f"{prefix}: train={len(train_df)} val={len(val_df)} test={len(test_df)}")


def split_frame(
    frame: pd.DataFrame,
    train_ratio: float,
    val_ratio: float,
    test_ratio: float,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    frame = frame.sample(frac=1, random_state=seed).reset_index(drop=True)
    if "group_id" in frame.columns and frame["group_id"].nunique() >= 3:
        return split_frame_by_group(frame, train_ratio, val_ratio, test_ratio, seed)

    stratify = frame["label"] if "label" in frame.columns and frame["label"].nunique() > 1 else None
    train_df, temp_df = train_test_split(
        frame,
        train_size=train_ratio,
        random_state=seed,
        stratify=stratify,
    )
    relative_val = val_ratio / (val_ratio + test_ratio)
    temp_stratify = temp_df["label"] if "label" in temp_df.columns and temp_df["label"].nunique() > 1 else None
    val_df, test_df = train_test_split(
        temp_df,
        train_size=relative_val,
        random_state=seed,
        stratify=temp_stratify,
    )
    return train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True)


def split_frame_by_group(
    frame: pd.DataFrame,
    train_ratio: float,
    val_ratio: float,
    test_ratio: float,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    groups = frame["group_id"].astype(str)
    splitter = GroupShuffleSplit(n_splits=1, train_size=train_ratio, random_state=seed)
    train_idx, temp_idx = next(splitter.split(frame, groups=groups))
    train_df = frame.iloc[train_idx].reset_index(drop=True)
    temp_df = frame.iloc[temp_idx].reset_index(drop=True)

    relative_val = val_ratio / (val_ratio + test_ratio)
    temp_groups = temp_df["group_id"].astype(str)
    temp_splitter = GroupShuffleSplit(n_splits=1, train_size=relative_val, random_state=seed + 1)
    val_idx, test_idx = next(temp_splitter.split(temp_df, groups=temp_groups))
    val_df = temp_df.iloc[val_idx].reset_index(drop=True)
    test_df = temp_df.iloc[test_idx].reset_index(drop=True)
    return train_df, val_df, test_df


def write_summary(out_dir: Path, args: argparse.Namespace) -> None:
    summary = {
        "dataset_root": str(args.dataset_root.resolve()),
        "dataset_type": args.dataset_type,
        "ratios": {"train": args.train, "val": args.val, "test": args.test},
        "seed": args.seed,
    }
    with (out_dir / "split_summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, indent=2)


def find_images(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(path for path in root.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS)


def infer_group_id(path: Path) -> str:
    name = path.stem
    separators = ["__", "_", "-"]
    for separator in separators:
        if separator in name:
            return name.split(separator)[0]
    return name


def normalize_name(name: str) -> str:
    return name.strip().lower().replace(" ", "_")


def validate_ratios(train: float, val: float, test: float) -> None:
    total = train + val + test
    if abs(total - 1.0) > 1e-6:
        raise SystemExit(f"Split ratios must sum to 1.0, got {total}")
    if min(train, val, test) <= 0:
        raise SystemExit("Split ratios must be positive")


if __name__ == "__main__":
    random.seed(42)
    main()
