"""
Cut separate objects out of an asset sheet drawn on a plain paper background.

    python3 scripts/cut-sheet.py sheet.png out_dir name:x0,y0,x1,y1[:glass] ...

Each box is a rough crop around one object. The object is found as everything that
differs from the background colour, holes filled. With `:glass`, pale areas *inside*
the object (lamp chimney, lens) fade towards transparent instead of staying paper-white.
With `:holes`, enclosed patches that are plain background (a handle's ring) are cleared.
Needs Pillow, numpy, scipy (dev tool only, not part of the app).
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out_dir, *specs = sys.argv[1:]
rgb = np.asarray(Image.open(src).convert('RGB')).astype(float)
# Background: the most common light colour in the sheet.
light = rgb[(rgb.sum(-1) > 600)]
bg = np.median(light, axis=0)

for spec in specs:
    parts = spec.split(':')
    name, box = parts[0], [int(v) for v in parts[1].split(',')]
    glass = 'glass' in parts[2:]
    holes = 'holes' in parts[2:]
    x0, y0, x1, y1 = box
    pad = 8
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(rgb.shape[1], x1 + pad), min(rgb.shape[0], y1 + pad)
    crop = rgb[y0:y1, x0:x1]
    dist = np.sqrt(((crop - bg) ** 2).sum(-1))
    solid = dist > 30
    solid = ndimage.binary_closing(solid, iterations=2)
    filled = ndimage.binary_fill_holes(solid)
    # Keep only the biggest piece: stray specks of the sheet are not the object.
    lab, n = ndimage.label(filled)
    if n > 1:
        sizes = ndimage.sum(filled, lab, range(1, n + 1))
        filled = lab == (1 + int(np.argmax(sizes)))
    if holes:
        hole_lab, hn = ndimage.label(filled & ~solid)
        for h in range(1, hn + 1):
            region = hole_lab == h
            if region.sum() > 20 and dist[region].mean() < 14:
                filled &= ~ndimage.binary_dilation(region, iterations=1)
    core = ndimage.binary_erosion(filled, iterations=1)
    alpha = ndimage.gaussian_filter(core.astype(float), 0.8)
    if glass:
        # Inside the outline, paper-coloured means "see-through glass".
        see_through = np.clip((dist - 8) / 55, 0.0, 1.0)
        inner = ndimage.binary_erosion(filled, iterations=4)
        alpha = np.where(inner, np.minimum(alpha, see_through), alpha)
    rgba = np.dstack([crop, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(f'{out_dir}/{name}.png')
    print(f'{name}: {x1 - x0}x{y1 - y0}')
