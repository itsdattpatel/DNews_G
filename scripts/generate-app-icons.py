"""
scripts/generate-app-icons.py
Generates the official DNews Windows App icons (PRD E Category 6).
Output:
- assets/icon.png (512x512 master app icon on cream #FAF7F0 background)
- assets/icon.ico (Windows multi-resolution ICO: 256, 128, 64, 48, 32, 24, 16)
- assets/icon-tray.png (32x32 high-contrast system tray icon)
"""
import os
import math
from PIL import Image, ImageDraw

ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))
os.makedirs(ASSETS_DIR, exist_ok=True)

# Colors matching the Broadsheet Newspaper Design System
COLOR_CREAM = (250, 247, 240, 255)       # #FAF7F0
COLOR_INK = (26, 18, 8, 255)             # #1A1208
COLOR_GOLD = (196, 151, 58, 255)         # #C4973A
COLOR_BORDER = (217, 208, 190, 255)      # #D9D0BE
COLOR_CRIMSON = (192, 57, 43, 255)       # #C0392B
COLOR_PAPER_LIGHT = (242, 237, 226, 255) # #F2EDE2

def draw_bat_emblem(draw, center_x, center_y, scale):
    """Draws Victorian anatomical bat and globe emblem centered at (center_x, center_y)."""
    # 1. Stylized Globe Meridian Ellipses below bat
    globe_r = int(58 * scale)
    globe_y = center_y + int(48 * scale)
    # Outer circle
    draw.ellipse(
        [center_x - globe_r, globe_y - globe_r, center_x + globe_r, globe_y + globe_r],
        outline=COLOR_GOLD,
        width=max(1, int(3 * scale))
    )
    # Latitude lines
    draw.arc(
        [center_x - globe_r, globe_y - int(globe_r * 0.5), center_x + globe_r, globe_y + int(globe_r * 0.5)],
        start=0, end=360, fill=COLOR_GOLD, width=max(1, int(2 * scale))
    )
    # Longitude meridian
    draw.ellipse(
        [center_x - int(globe_r * 0.45), globe_y - globe_r, center_x + int(globe_r * 0.45), globe_y + globe_r],
        outline=COLOR_GOLD,
        width=max(1, int(2 * scale))
    )
    draw.line([center_x, globe_y - globe_r, center_x, globe_y + globe_r], fill=COLOR_GOLD, width=max(1, int(2 * scale)))

    # 2. Left Wing Polygon
    lw_poly = [
        (center_x, center_y),
        (center_x - int(38 * scale), center_y - int(95 * scale)),
        (center_x - int(120 * scale), center_y - int(110 * scale)),
        (center_x - int(185 * scale), center_y - int(72 * scale)),
        (center_x - int(210 * scale), center_y - int(30 * scale)),
        (center_x - int(195 * scale), center_y + int(45 * scale)),
        (center_x - int(140 * scale), center_y + int(60 * scale)),
        (center_x - int(95 * scale), center_y + int(35 * scale)),
        (center_x - int(55 * scale), center_y + int(28 * scale)),
        (center_x, center_y)
    ]
    draw.polygon(lw_poly, fill=COLOR_INK)

    # 3. Right Wing Polygon (Symmetrical)
    rw_poly = [
        (center_x, center_y),
        (center_x + int(38 * scale), center_y - int(95 * scale)),
        (center_x + int(120 * scale), center_y - int(110 * scale)),
        (center_x + int(185 * scale), center_y - int(72 * scale)),
        (center_x + int(210 * scale), center_y - int(30 * scale)),
        (center_x + int(195 * scale), center_y + int(45 * scale)),
        (center_x + int(140 * scale), center_y + int(60 * scale)),
        (center_x + int(95 * scale), center_y + int(35 * scale)),
        (center_x + int(55 * scale), center_y + int(28 * scale)),
        (center_x, center_y)
    ]
    draw.polygon(rw_poly, fill=COLOR_INK)

    # Wing rib bones (fine lines in gold/paper)
    rib_width = max(1, int(2 * scale))
    draw.line([(center_x, center_y), (center_x - int(185 * scale), center_y - int(72 * scale))], fill=COLOR_GOLD, width=rib_width)
    draw.line([(center_x, center_y), (center_x - int(140 * scale), center_y + int(60 * scale))], fill=COLOR_GOLD, width=rib_width)
    draw.line([(center_x, center_y), (center_x - int(95 * scale), center_y + int(35 * scale))], fill=COLOR_GOLD, width=rib_width)

    draw.line([(center_x, center_y), (center_x + int(185 * scale), center_y - int(72 * scale))], fill=COLOR_GOLD, width=rib_width)
    draw.line([(center_x, center_y), (center_x + int(140 * scale), center_y + int(60 * scale))], fill=COLOR_GOLD, width=rib_width)
    draw.line([(center_x, center_y), (center_x + int(95 * scale), center_y + int(35 * scale))], fill=COLOR_GOLD, width=rib_width)

    # 4. Bat Torso & Head
    torso_w = int(24 * scale)
    torso_h = int(72 * scale)
    draw.ellipse(
        [center_x - torso_w, center_y - int(35 * scale), center_x + torso_w, center_y - int(35 * scale) + torso_h],
        fill=COLOR_INK
    )

    # Head
    head_r = int(24 * scale)
    head_y = center_y - int(45 * scale)
    draw.ellipse([center_x - head_r, head_y - head_r, center_x + head_r, head_y + head_r], fill=COLOR_INK)

    # Pointed Ears
    left_ear = [
        (center_x - int(22 * scale), head_y - int(5 * scale)),
        (center_x - int(32 * scale), head_y - int(45 * scale)),
        (center_x - int(10 * scale), head_y - int(20 * scale))
    ]
    right_ear = [
        (center_x + int(22 * scale), head_y - int(5 * scale)),
        (center_x + int(32 * scale), head_y - int(45 * scale)),
        (center_x + int(10 * scale), head_y - int(20 * scale))
    ]
    draw.polygon(left_ear, fill=COLOR_INK)
    draw.polygon(right_ear, fill=COLOR_INK)

    # Ear inner highlights (gold)
    draw.polygon([
        (center_x - int(20 * scale), head_y - int(8 * scale)),
        (center_x - int(28 * scale), head_y - int(38 * scale)),
        (center_x - int(12 * scale), head_y - int(18 * scale))
    ], fill=COLOR_GOLD)
    draw.polygon([
        (center_x + int(20 * scale), head_y - int(8 * scale)),
        (center_x + int(28 * scale), head_y - int(38 * scale)),
        (center_x + int(12 * scale), head_y - int(18 * scale))
    ], fill=COLOR_GOLD)

    # Crimson Alert Eyes
    eye_r = max(2, int(5 * scale))
    draw.ellipse(
        [center_x - int(13 * scale) - eye_r, head_y - int(2 * scale) - eye_r, center_x - int(13 * scale) + eye_r, head_y - int(2 * scale) + eye_r],
        fill=COLOR_CRIMSON
    )
    draw.ellipse(
        [center_x + int(13 * scale) - eye_r, head_y - int(2 * scale) - eye_r, center_x + int(13 * scale) + eye_r, head_y - int(2 * scale) + eye_r],
        fill=COLOR_CRIMSON
    )

def create_master_icon(size=512):
    """Creates a high-resolution 512x512 app icon on warm cream background with newspaper borders."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    margin = 16
    corner_radius = 96

    # Draw rounded cream plaque
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=corner_radius,
        fill=COLOR_CREAM,
        outline=COLOR_BORDER,
        width=4
    )

    # Inner decorative gold hairline border
    inner_m = margin + 12
    draw.rounded_rectangle(
        [inner_m, inner_m, size - inner_m, size - inner_m],
        radius=corner_radius - 10,
        outline=COLOR_GOLD,
        width=2
    )

    # Draw Victorian bat & globe emblem
    center = size // 2
    scale = size / 512.0
    draw_bat_emblem(draw, center, center + int(12 * scale), scale * 1.05)

    return img

def create_tray_icon(size=32):
    """Creates a clean 32x32 high-contrast tray icon."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Clean circular silhouette
    draw.ellipse([2, 2, size - 2, size - 2], fill=COLOR_CREAM, outline=COLOR_INK, width=1)

    scale = size / 512.0
    draw_bat_emblem(draw, size // 2, size // 2 + 1, scale * 0.95)
    return img

def main():
    print("Generating DNews Desktop App Icons...")

    # 1. 512x512 Master PNG
    master_img = create_master_icon(512)
    png_path = os.path.join(ASSETS_DIR, 'icon.png')
    master_img.save(png_path, format='PNG')
    print(f"Saved: {png_path} ({os.path.getsize(png_path)} bytes)")

    # 2. 32x32 Tray Icon
    tray_img = create_tray_icon(32)
    tray_path = os.path.join(ASSETS_DIR, 'icon-tray.png')
    tray_img.save(tray_path, format='PNG')
    print(f"Saved: {tray_path} ({os.path.getsize(tray_path)} bytes)")

    # 3. Multi-layer Windows ICO (256, 128, 64, 48, 32, 24, 16)
    ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)]
    ico_layers = [master_img.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]

    ico_path = os.path.join(ASSETS_DIR, 'icon.ico')
    ico_layers[0].save(
        ico_path,
        format='ICO',
        sizes=ico_sizes,
        append_images=ico_layers[1:]
    )
    print(f"Saved: {ico_path} ({os.path.getsize(ico_path)} bytes with {len(ico_sizes)} layers)")
    print("App icon generation complete!")

if __name__ == '__main__':
    main()
