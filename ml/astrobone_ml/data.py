from __future__ import annotations

import random
from pathlib import Path

import pandas as pd
import torch
from PIL import Image, ImageFile
from torch.utils.data import Dataset
from torchvision.transforms import InterpolationMode
from torchvision.transforms import functional as TF

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)
ImageFile.LOAD_TRUNCATED_IMAGES = True


class ClassificationCsvDataset(Dataset):
    def __init__(self, csv_path: str | Path, image_size: int = 224, train: bool = False) -> None:
        self.csv_path = Path(csv_path)
        self.frame = pd.read_csv(self.csv_path)
        self.image_size = image_size
        self.train = train
        require_columns(self.frame, ["image_path", "label"], self.csv_path)

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.frame.iloc[index]
        image = Image.open(row["image_path"]).convert("RGB")

        image = TF.resize(image, [self.image_size, self.image_size], InterpolationMode.BILINEAR)
        if self.train:
            if random.random() < 0.5:
                image = TF.hflip(image)
            if random.random() < 0.25:
                angle = random.uniform(-7, 7)
                image = TF.rotate(image, angle, interpolation=InterpolationMode.BILINEAR)

        image_tensor = normalize_image(image)
        label = torch.tensor(int(row["label"]), dtype=torch.long)
        return image_tensor, label


class SegmentationCsvDataset(Dataset):
    def __init__(self, csv_path: str | Path, image_size: int = 256, train: bool = False) -> None:
        self.csv_path = Path(csv_path)
        self.frame = pd.read_csv(self.csv_path)
        self.image_size = image_size
        self.train = train
        require_columns(self.frame, ["image_path", "mask_path"], self.csv_path)

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, index: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.frame.iloc[index]
        image = Image.open(row["image_path"]).convert("RGB")
        mask = Image.open(row["mask_path"]).convert("L")

        image = TF.resize(image, [self.image_size, self.image_size], InterpolationMode.BILINEAR)
        mask = TF.resize(mask, [self.image_size, self.image_size], InterpolationMode.NEAREST)

        if self.train:
            if random.random() < 0.5:
                image = TF.hflip(image)
                mask = TF.hflip(mask)
            if random.random() < 0.25:
                angle = random.uniform(-7, 7)
                image = TF.rotate(image, angle, interpolation=InterpolationMode.BILINEAR)
                mask = TF.rotate(mask, angle, interpolation=InterpolationMode.NEAREST)

        image_tensor = normalize_image(image)
        mask_tensor = TF.to_tensor(mask)
        mask_tensor = (mask_tensor > 0.5).float()
        return image_tensor, mask_tensor


def normalize_image(image: Image.Image) -> torch.Tensor:
    tensor = TF.to_tensor(image)
    return TF.normalize(tensor, IMAGENET_MEAN, IMAGENET_STD)


def require_columns(frame: pd.DataFrame, columns: list[str], csv_path: Path) -> None:
    missing = [column for column in columns if column not in frame.columns]
    if missing:
        raise ValueError(f"{csv_path} is missing required column(s): {', '.join(missing)}")
