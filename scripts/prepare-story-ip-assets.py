"""Package generated originals without repainting, cropping or removing alpha.

Usage: python scripts/prepare-story-ip-assets.py <generated-dir>
Only deterministic resizing / WebP encoding happens here; artwork is generated
with the built-in image tool and the original references, never reconstructed.
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / "docs/baselines/story-ip-assets.json"
generated_dir = Path(sys.argv[1]).resolve()
record = json.loads(RECORD.read_text(encoding="utf-8"))
for asset in record["assets"]:
    if len(sys.argv) > 2 and asset["batch"] != sys.argv[2]:
        continue
    original = generated_dir / asset["generatedFile"]
    master = ROOT / asset["master"]
    destination = ROOT / "apps/web/public/assets" / asset["path"]
    if master.exists() and destination.exists():
        if master.read_bytes() != original.read_bytes():
            raise FileExistsError(f"Existing master differs: {asset['id']}")
        print(json.dumps({"id": asset["id"], "status": "retained-existing-version"}))
        continue
    if master.exists() or destination.exists():
        raise FileExistsError(f"Incomplete versioned asset: {asset['id']}")
    with Image.open(original) as source:
        image = source.convert("RGBA" if asset["transparent"] else "RGB")
        if asset["transparent"]:
            assert image.getchannel("A").getextrema() == (0, 255), asset["id"]
        image.thumbnail(tuple(asset["maxSize"]), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        master.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(original, master)
        image.save(destination, "WEBP", quality=90, method=6, exact=True)
        with Image.open(destination) as encoded:
            if asset["transparent"]:
                assert encoded.mode == "RGBA" and encoded.getchannel("A").getextrema() == (0, 255)
                alpha_bounds = encoded.getchannel("A").point(lambda value: 255 if value >= 16 else 0).getbbox()
            else:
                alpha_bounds = None
            print(json.dumps({"id": asset["id"], "size": encoded.size, "bytes": destination.stat().st_size, "alphaBounds": alpha_bounds}))
