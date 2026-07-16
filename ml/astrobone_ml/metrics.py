from __future__ import annotations

import torch


def segmentation_scores(logits: torch.Tensor, targets: torch.Tensor, threshold: float = 0.5) -> dict[str, float]:
    probs = torch.sigmoid(logits)
    preds = (probs >= threshold).float()
    targets = (targets >= 0.5).float()

    dims = tuple(range(1, preds.ndim))
    intersection = (preds * targets).sum(dim=dims)
    pred_sum = preds.sum(dim=dims)
    target_sum = targets.sum(dim=dims)
    union = pred_sum + target_sum - intersection

    dice = ((2 * intersection + 1e-7) / (pred_sum + target_sum + 1e-7)).mean()
    iou = ((intersection + 1e-7) / (union + 1e-7)).mean()
    return {"dice": float(dice.detach().cpu()), "iou": float(iou.detach().cpu())}


def classification_accuracy(logits: torch.Tensor, targets: torch.Tensor) -> float:
    preds = logits.argmax(dim=1)
    return float((preds == targets).float().mean().detach().cpu())
