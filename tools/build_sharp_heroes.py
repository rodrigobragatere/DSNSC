"""Gera atlases nítidos (nearest-neighbor) a partir das folhas limpas."""
from PIL import Image
import os

base = r"c:\Users\LATITUDE 3420\Desktop\lpp\projetos\Jogos\DSNSC\assets"
out = os.path.join(base, "sprites")
os.makedirs(out, exist_ok=True)
FS = 128  # 2x para nitidez em telas HiDPI


def is_ink(r, g, b, a, thr=28):
    if a < 8:
        return False
    if r < 22 and g < 22 and b < 22:
        return False
    return (r + g + b) > thr


def content_x_range(im, y0, y1):
    px = im.load()
    left, right = im.width, 0
    found = False
    for y in range(y0, y1):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if is_ink(r, g, b, a):
                found = True
                left = min(left, x)
                right = max(right, x)
    if not found:
        return 0, im.width - 1
    return left, right


def pack_cell(im, L, T, R, B, size=FS):
    L, T, R, B = map(int, (max(0, L), max(0, T), min(im.width, R), min(im.height, B)))
    crop = im.crop((L, T, R, B)).convert("RGBA")
    px = crop.load()
    minx, miny, maxx, maxy = crop.width, crop.height, -1, -1
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = px[x, y]
            if r < 22 and g < 22 and b < 22:
                px[x, y] = (0, 0, 0, 0)
                continue
            if is_ink(r, g, b, a):
                minx = min(minx, x)
                miny = min(miny, y)
                maxx = max(maxx, x)
                maxy = max(maxy, y)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if maxx < 0:
        return canvas
    sp = crop.crop((minx, miny, maxx + 1, maxy + 1))
    # escala inteira nearest: cresce para caber em size-8
    sw, sh = sp.size
    target = size - 8
    scale = min(target / sw, target / sh)
    # força múltiplo próximo de inteiro se possível
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    sp = sp.resize((nw, nh), Image.NEAREST)
    canvas.paste(sp, ((size - nw) // 2, size - nh - 4), sp)
    return canvas


def process(path, tag):
    im = Image.open(path).convert("RGBA")
    h = im.size[1]
    row_h = h / 5.0
    specs = [("idle", 4), ("walk", 6), ("walk_l", 6), ("jump", 6), ("shoot", 6)]
    master = {}

    for ri, (anim, n) in enumerate(specs):
        y0 = int(round(ri * row_h))
        y1 = int(round((ri + 1) * row_h))
        left, right = content_x_range(im, y0, y1)
        left = max(0, left - 2)
        right = min(im.width - 1, right + 2)
        cell_w = (right - left + 1) / float(n)
        frames = []
        atlas = Image.new("RGBA", (FS * n, FS), (0, 0, 0, 0))
        for fi in range(n):
            cx0 = left + fi * cell_w
            cx1 = left + (fi + 1) * cell_w
            inset = cell_w * 0.04
            cell = pack_cell(im, cx0 + inset, y0 + 1, cx1 - inset, y1 - 1)
            cell.save(os.path.join(out, f"{tag}_{anim}_{fi}.png"))
            atlas.paste(cell, (fi * FS, 0), cell)
            frames.append(cell)
        atlas.save(os.path.join(out, f"{tag}_{anim}.png"))
        master[anim] = frames
        print(tag, anim, n, "ok")

    sheet = Image.new("RGBA", (FS * 6, FS * 4), (0, 0, 0, 0))
    for ri, anim in enumerate(["idle", "walk", "jump", "shoot"]):
        frs = master[anim][:]
        need = 4 if anim == "idle" else 6
        while len(frs) < need:
            frs.append(frs[-1].copy())
        for fi, cell in enumerate(frs[:need]):
            sheet.paste(cell, (fi * FS, ri * FS), cell)
    sheet.save(os.path.join(out, f"{tag}_sheet.png"))

    # preview nítido 256px
    preview = master["idle"][0].resize((256, 256), Image.NEAREST)
    preview.save(os.path.join(out, f"{tag}_preview.png"))
    print("sheet+preview", tag, sheet.size)


process(os.path.join(base, "sprite-vestibulando-clean.png"), "boy")
process(os.path.join(base, "sprite-vestibulanda-clean.png"), "girl")
print("OK FS=", FS)
