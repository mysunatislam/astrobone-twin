from __future__ import annotations

import argparse
import random
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFilter


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a tiny synthetic fracture-like dataset.")
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--count", type=int, default=48)
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    image_dir = args.out_dir / "images"
    mask_dir = args.out_dir / "masks"
    split_dir = args.out_dir / "splits"
    image_dir.mkdir(parents=True, exist_ok=True)
    mask_dir.mkdir(parents=True, exist_ok=True)
    split_dir.mkdir(parents=True, exist_ok=True)

    rows_cls = []
    rows_seg = []
    for index in range(args.count):
        label = int(index % 2 == 0)
        image, mask = make_image(args.image_size, label)
        image_path = image_dir / f"synthetic_{index:04d}.png"
        mask_path = mask_dir / f"synthetic_{index:04d}.png"
        image.save(image_path)
        mask.save(mask_path)
        rows_cls.append({"image_path": str(image_path.resolve()), "label": label, "group_id": f"synthetic-{index:04d}"})
        if label == 1:
            rows_seg.append({"image_path": str(image_path.resolve()), "mask_path": str(mask_path.resolve()), "group_id": f"synthetic-{index:04d}"})

    write_fixed_splits(pd.DataFrame(rows_cls), split_dir, "classification")
    write_fixed_splits(pd.DataFrame(rows_seg), split_dir, "segmentation")
    print(f"Wrote synthetic dataset to {args.out_dir}")


def make_image(size: int, fracture: int) -> tuple[Image.Image, Image.Image]:
    base = Image.new("L", (size, size), 22)
    draw = ImageDraw.Draw(base)
    cx = size // 2 + random.randint(-6, 6)
    draw.rounded_rectangle(
        [cx - 16, 12, cx + 16, size - 12],
        radius=18,
        fill=180,
        outline=220,
        width=2,
    )
    for _ in range(260):
        x = random.randrange(size)
        y = random.randrange(size)
        value = int(np.clip(np.random.normal(32, 20), 0, 255))
        base.putpixel((x, y), value)

    mask = Image.new("L", (size, size), 0)
    if fracture:
        mask_draw = ImageDraw.Draw(mask)
        image_draw = ImageDraw.Draw(base)
        y0 = random.randint(size // 3, size // 2)
        points = [
            (cx - 12, y0),
            (cx - 2, y0 + 9),
            (cx - 7, y0 + 19),
            (cx + 13, y0 + 31),
        ]
        image_draw.line(points, fill=20, width=3)
        image_draw.line(points, fill=245, width=1)
        mask_draw.line(points, fill=255, width=5)

    base = base.filter(ImageFilter.GaussianBlur(radius=0.25))
    return base.convert("RGB"), mask


def write_fixed_splits(frame: pd.DataFrame, out_dir: Path, prefix: str) -> None:
    frame = frame.sample(frac=1, random_state=11).reset_index(drop=True)
    n = len(frame)
    train_end = max(1, int(n * 0.7))
    val_end = max(train_end + 1, int(n * 0.85))
    frame.iloc[:train_end].to_csv(out_dir / f"{prefix}_train.csv", index=False)
    frame.iloc[train_end:val_end].to_csv(out_dir / f"{prefix}_val.csv", index=False)
    frame.iloc[val_end:].to_csv(out_dir / f"{prefix}_test.csv", index=False)


if __name__ == "__main__":
    main()
