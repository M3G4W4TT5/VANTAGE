"""Export the ten approved Vantage raster assets from one shared alpha mask."""
from pathlib import Path
import hashlib
import json
import zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "vantage-logo-concept-02-aligned-v.png"
OUT = ROOT / "final"
PAD = 32
SPLIT_X = 709
SPECS = [
    ("01-vantage-full-white-transparent.png", "full", 255, None),
    ("02-vantage-full-black-transparent.png", "full", 0, None),
    ("03-vantage-full-white-on-black.png", "full", 255, 0),
    ("04-vantage-full-black-on-white.png", "full", 0, 255),
    ("05-vantage-mark-white-transparent.png", "mark", 255, None),
    ("06-vantage-mark-black-transparent.png", "mark", 0, None),
    ("07-vantage-mark-white-on-black.png", "mark", 255, 0),
    ("08-vantage-mark-black-on-white.png", "mark", 0, 255),
    ("09-vantage-text-white-transparent.png", "text", 255, None),
    ("10-vantage-text-black-transparent.png", "text", 0, None),
]

def export():
    OUT.mkdir(exist_ok=True)
    for name, *_ in SPECS:
        if (OUT / name).exists():
            raise FileExistsError(f"Refusing to overwrite {OUT / name}")
    original = Image.open(SOURCE).convert("L")
    raw = np.array(original)
    solid = Image.fromarray(np.where(raw >= 128, 255, 0).astype(np.uint8))
    # Preserve the existing outline and antialiasing. Normalize solid interiors
    # and remove background texture away from the edge; no tracing or retyping.
    interior = np.array(solid.filter(ImageFilter.MinFilter(3))) == 255
    near_shape = np.array(solid.filter(ImageFilter.MaxFilter(3))) > 0
    alpha = raw.copy()
    alpha[interior] = 255
    alpha[~near_shape] = 0
    assert np.array_equal(alpha >= 128, raw >= 128), "The approved outline changed."
    parts = {"full": alpha.copy(), "mark": alpha.copy(), "text": alpha.copy()}
    parts["mark"][:, SPLIT_X:] = 0
    parts["text"][:, :SPLIT_X] = 0
    assert np.array_equal(np.maximum(parts["mark"], parts["text"]), parts["full"])
    masks = {}
    metadata = {}
    for part, values in parts.items():
        image = Image.fromarray(values)
        bbox = image.getbbox()
        crop = image.crop(bbox)
        padded = Image.new("L", (crop.width + 2 * PAD, crop.height + 2 * PAD), 0)
        padded.paste(crop, (PAD, PAD))
        masks[part] = padded
        metadata[part] = {"source_crop": list(bbox), "size": list(padded.size), "padding_px": PAD}
    records = []
    for name, part, fg, bg in SPECS:
        mask = masks[part]
        artwork = Image.new("RGBA", mask.size, (fg, fg, fg, 255))
        artwork.putalpha(mask)
        if bg is None:
            result = artwork
        else:
            result = Image.alpha_composite(Image.new("RGBA", mask.size, (bg, bg, bg, 255)), artwork).convert("RGB")
        result.save(OUT / name, optimize=True)
        readback = Image.open(OUT / name)
        if bg is None:
            assert readback.mode == "RGBA"
            pixels = np.array(readback)
            assert np.array_equal(pixels[:, :, 3], np.array(mask))
            assert np.all(pixels[:, :, :3] == fg)
            assert pixels[:, :, 3].min() == 0 and pixels[:, :, 3].max() == 255
            assert np.any((pixels[:, :, 3] > 0) & (pixels[:, :, 3] < 255))
            assert np.all(pixels[0, :, 3] == 0) and np.all(pixels[-1, :, 3] == 0)
        else:
            assert readback.mode == "RGB"
            assert readback.getpixel((0, 0)) == (bg, bg, bg)
            # Opaque and transparent exports must render identically.
            expected = Image.alpha_composite(Image.new("RGBA", mask.size, (bg, bg, bg, 255)), artwork).convert("RGB")
            assert np.array_equal(np.array(readback), np.array(expected))
        records.append({"filename": name, "part": part, "foreground": "white" if fg else "black", "background": "transparent" if bg is None else ("white" if bg else "black"), "width": result.width, "height": result.height, "mode": result.mode, "sha256": hashlib.sha256((OUT / name).read_bytes()).hexdigest()})
    manifest = {"source": SOURCE.name, "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(), "method": "Approved clean raster source; shared alpha mask; unchanged 50-percent outline; normalized flat interiors; original antialiasing; no resampling.", "parts": metadata, "validation": {"approved_outline_preserved": True, "part_masks_reconstruct_full": True, "six_real_alpha_exports": True, "opaque_exports_match_alpha_compositing": True}, "assets": records}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    lines = ["# Vantage final logo assets", "", "Ten PNG assets derived directly from the approved clean logo.", "The wide V and triangle geometry are preserved. No glow.", "", "Transparent files use real alpha transparency; opaque versions use pure black or white backgrounds.", "Each group uses identical dimensions and a 32 px clear margin. Assets retain their native raster scale.", "", "| File | Dimensions |", "| --- | --- |"]
    lines.extend(f"| {r['filename']} | {r['width']} x {r['height']} px |" for r in records)
    lines += ["", "The source is raster artwork, not a vector master.", "manifest.json records the source, geometry checks, and output hashes.", ""]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    make_preview(records)
    archive = ROOT / "vantage-final-logo-assets.zip"
    if archive.exists():
        raise FileExistsError(f"Refusing to overwrite {archive}")
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as z:
        for record in records:
            z.write(OUT / record["filename"], record["filename"])
        for name in ["README.md", "manifest.json"]:
            z.write(OUT / name, name)
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert len([p for p in z.namelist() if p.endswith(".png")]) == 10
    print(json.dumps({"archive": str(archive), "preview": str(ROOT / "vantage-final-logo-preview.png"), "assets": records, "checks": manifest["validation"]}, indent=2))

def make_preview(records):
    width, cell_h, gutter = 1400, 245, 24
    preview = Image.new("RGB", (width, 5 * cell_h + 76), "#e7e9eb")
    draw = ImageDraw.Draw(preview)
    font_path = Path("C:/Windows/Fonts/arial.ttf")
    font = ImageFont.truetype(str(font_path), 19)
    title_font = ImageFont.truetype(str(font_path), 26)
    draw.text((24, 20), "Vantage / Final logo assets", fill="#17191a", font=title_font)
    for i, record in enumerate(records):
        col, row = i % 2, i // 2
        x = gutter + col * (width // 2)
        y = 70 + row * cell_h
        box_w, box_h = width // 2 - 2 * gutter, 182
        label = record["filename"].replace(".png", "").replace("-", " ")
        draw.text((x, y), label, fill="#17191a", font=font)
        tile = Image.new("RGBA", (box_w, box_h), "white")
        if record["background"] == "transparent":
            a, b = ("#7b8289", "#9299a0") if record["foreground"] == "white" else ("#e3e7eb", "#f4f6f8")
            tile_draw = ImageDraw.Draw(tile)
            step = 16
            for cy in range(0, box_h, step):
                for cx in range(0, box_w, step):
                    tile_draw.rectangle((cx, cy, cx + step - 1, cy + step - 1), fill=a if (cx // step + cy // step) % 2 == 0 else b)
        else:
            tile.paste("black" if record["background"] == "black" else "white", (0, 0, box_w, box_h))
        image = Image.open(OUT / record["filename"]).convert("RGBA")
        image.thumbnail((box_w - 30, box_h - 22), Image.Resampling.LANCZOS)
        tile.alpha_composite(image, ((box_w - image.width) // 2, (box_h - image.height) // 2))
        preview.paste(tile.convert("RGB"), (x, y + 31))
    preview.save(ROOT / "vantage-final-logo-preview.png", optimize=True)

if __name__ == "__main__":
    export()

