from PIL import Image, ImageDraw
from pathlib import Path

root = Path(__file__).resolve().parents[1]
teal = (63, 163, 169)
navy = (26, 58, 92)
accent = (244, 197, 66)
white = (255, 255, 255)
black = (0, 0, 0)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = max(1, size // 16)

    d.rounded_rectangle(
        [m, m, size - m - 1, size - m - 1],
        radius=max(2, size // 5),
        fill=teal,
        outline=black,
        width=max(1, size // 16),
    )

    pad = max(2, size // 5)
    d.rounded_rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        radius=max(2, size // 8),
        fill=navy,
        outline=white,
        width=max(1, size // 32),
    )

    cx, cy = size // 2, size // 2
    tri_w = max(4, size // 3)
    tri_h = max(6, int(size / 2.6))
    left = cx - tri_w // 3
    pts = [
        (left, cy - tri_h // 2),
        (left, cy + tri_h // 2),
        (left + tri_w, cy),
    ]
    d.polygon(pts, fill=accent, outline=black)

    s = max(1, size // 18)
    d.rectangle(
        [size - pad - s * 3, pad + s, size - pad - s, pad + s * 2],
        fill=white,
    )
    return img


def main() -> None:
    sizes = [16, 32, 48]
    icons = [make_icon(s) for s in sizes]
    ico_path = root / "favicon.ico"
    # Pillow ICO: save largest with sizes= embeds all
    icons[-1].save(
        ico_path,
        format="ICO",
        sizes=[(s, s) for s in sizes],
    )
    png = make_icon(64)
    png.save(root / "favicon.png", format="PNG")
    print("wrote", ico_path, ico_path.stat().st_size, "bytes")
    print("wrote", root / "favicon.png")


if __name__ == "__main__":
    main()
