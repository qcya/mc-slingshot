from pathlib import Path
from PIL import Image

root = Path(__file__).parent
cover = Image.open(root / 'cover-original.png').convert('RGB')
cover.resize((1200, 900), Image.Resampling.LANCZOS).save(root / 'toy-cover.jpg', quality=94, optimize=True, subsampling=0)
icon = Image.open(root / 'icon-original.png').convert('RGB')
icon.resize((512, 512), Image.Resampling.LANCZOS).save(root / 'toy-icon.png', optimize=True)
for name in ['toy-cover.jpg', 'toy-icon.png']:
    path = root / name
    with Image.open(path) as im:
        print(f'{name}: {im.size}, {path.stat().st_size} bytes')
