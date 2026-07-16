from __future__ import annotations

import segmentation_models_pytorch as smp
import torch.nn as nn
from torchvision.models import DenseNet121_Weights, densenet121


def build_densenet121_classifier(num_classes: int = 2, pretrained: bool = True) -> nn.Module:
    weights = DenseNet121_Weights.IMAGENET1K_V1 if pretrained else None
    model = densenet121(weights=weights)
    model.classifier = nn.Linear(model.classifier.in_features, num_classes)
    return model


def build_unetpp(
    encoder_name: str = "densenet121",
    encoder_weights: str | None = "imagenet",
    in_channels: int = 3,
    classes: int = 1,
) -> nn.Module:
    return smp.UnetPlusPlus(
        encoder_name=encoder_name,
        encoder_weights=encoder_weights,
        in_channels=in_channels,
        classes=classes,
        activation=None,
    )
