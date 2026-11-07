"""Export the original arm's moving silhouettes for the Canvas 2D title film."""
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

spec = importlib.util.spec_from_file_location('engraving', Path(__file__).with_name('render-grasp.py'))
engraving = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engraving)

FPS, COLS, WIDTH, HEIGHT = 12, 11, 256, 114
COUNT = engraving.SECONDS * FPS + 1
atlas = Image.new('L', (COLS * WIDTH, ((COUNT + COLS - 1) // COLS) * HEIGHT))
for i in range(COUNT):
    plate, _, _ = engraving.arm_plate(min(i / FPS, engraving.SECONDS - 1 / engraving.FPS))
    tile = Image.fromarray(np.clip(plate * 1.65 * 255, 0, 255).astype('uint8'))
    tile = tile.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.35))
    atlas.paste(tile, ((i % COLS) * WIDTH, (i // COLS) * HEIGHT))
atlas.save(engraving.OUT / 'grasp-silhouettes.webp', 'WEBP', quality=88, method=6)
path = engraving.OUT / 'grasp-ink.json'
data = json.loads(path.read_text(encoding='utf-8'))
data['atlas'] = dict(file='grasp-silhouettes.webp?v=engraved-cuts-1', fps=FPS, columns=COLS,
                     width=WIDTH, height=HEIGHT, frames=COUNT)
path.write_text(json.dumps(data, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Exported {COUNT} original silhouettes; {(engraving.OUT / "grasp-silhouettes.webp").stat().st_size:,} bytes')
