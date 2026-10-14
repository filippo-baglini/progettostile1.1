import io

import torch
import numpy as np
from PIL import Image


def get_text_embedding_vector(MODEL, PROC, DEVICE, text: str) -> np.ndarray:
    """Normalized FashionCLIP text embedding (the same space as the image ones), from the text half of the model only."""
    inputs = PROC(text=[text], return_tensors="pt", padding=True, max_length=77, truncation=True)
    with torch.no_grad():
        feats = MODEL.get_text_features(**{k: v.to(DEVICE) for k, v in inputs.items()})
    return torch.nn.functional.normalize(feats, dim=-1)[0].cpu().numpy()


def get_image_embedding_vector(MODEL, PROC, DEVICE, image_bytes: bytes) -> np.ndarray:
    """Normalized FashionCLIP image embedding: the same space as product_data.img_embedding (see import_ebay.py)."""
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    with torch.no_grad():
        feats = MODEL.get_image_features(**{k: v.to(DEVICE) for k, v in PROC(images=[image], return_tensors="pt").items()})
    return torch.nn.functional.normalize(feats, dim=-1)[0].cpu().numpy()
