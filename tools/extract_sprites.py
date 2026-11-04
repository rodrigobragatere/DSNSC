"""Gera atlases limpos 64x64 a partir das folhas Vestibulando / Vestibulanda."""
from PIL import Image
import os, json

base = r"c:\Users\LATITUDE 3420\Desktop\lpp\projetos\Jogos\DSNSC\assets"
out_dir = os.path.join(base, "sprites")
os.makedirs(out_dir, exist_ok=True)
FS = 64


def content_bbox(im, box, threshold=38):
    """Ajusta o crop ao conteúdo não-preto dentro de uma célula."""
    L, T, R, B = box
    L = max(0, L)
    T = max(0, T)
    R = min(im.width, R)
    B = min(im.height, B)
    crop = im.crop((L, T, R, B))
    px = crop.load()
    minx, miny, maxx, maxy = crop.width, crop.height, 0, 0
    found = False
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            if r < threshold and g < threshold and b < threshold:
                continue
            found = True
            if x < minx:
                minx = x
            if y < miny:
                miny = y
            if x > maxx:
                maxx = x
            if y > maxy:
                maxy = y
    if not found:
        return None
    # margem
    minx = max(0, minx - 2)
    miny = max(0, miny - 2)
    maxx = min(crop.width - 1, maxx + 2)
    maxy = min(crop.height - 1, maxy + 2)
    return crop.crop((minx, miny, maxx + 1, maxy + 1))


def to_cell(sprite, size=FS):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if sprite is None:
        return canvas
    sw, sh = sprite.size
    scale = min((size - 2) / sw, (size - 2) / sh)
    # pixel art: prefer nearest, allow slight upscale for tiny frames
    nw = max(1, int(round(sw * scale)))
    nh = max(1, int(round(sh * scale)))
    sprite = sprite.resize((nw, nh), Image.NEAREST)
    ox = (size - nw) // 2
    oy = size - nh - 1
    canvas.paste(sprite, (ox, oy), sprite)
    return canvas


def build_atlas(im, tag, animations):
    """animations: {name: [(x,y,w,h), ...]}"""
    meta = {}
    for anim, cells in animations.items():
        frames = []
        atlas = Image.new("RGBA", (FS * len(cells), FS), (0, 0, 0, 0))
        for i, (x, y, w, h) in enumerate(cells):
            sp = content_bbox(im, (x, y, x + w, y + h))
            cell = to_cell(sp)
            fname = f"{tag}_{anim}_{i}.png"
            cell.save(os.path.join(out_dir, fname))
            atlas.paste(cell, (i * FS, 0), cell)
            frames.append(fname)
        atlas_name = f"{tag}_{anim}.png"
        atlas.save(os.path.join(out_dir, atlas_name))
        meta[anim] = {"atlas": f"assets/sprites/{atlas_name}", "frames": len(cells), "fw": FS, "fh": FS}
        print(tag, anim, len(cells), "frames")
    return meta


def grid(x0, y0, n, cell_w, cell_h, gap=0):
    return [(x0 + i * (cell_w + gap), y0, cell_w, cell_h) for i in range(n)]


# --- Boy 819x545: frames ~ medidos a partir das faixas ---
boy = Image.open(os.path.join(base, "sprite-vestibulando.png")).convert("RGBA")
boy_anims = {
    # idle 4 frames
    "idle": grid(155, 68, 4, 72, 78, gap=4),
    # walk right — 6 frames (pula o rótulo à esquerda)
    "walk": grid(155, 155, 6, 70, 78, gap=8),
    # walk left já vem na folha; usamos walk + flip no jogo se precisar
    "walk_l": grid(155, 242, 6, 70, 78, gap=8),
    "jump": grid(155, 328, 6, 70, 82, gap=8),
    "shoot": grid(155, 425, 6, 70, 82, gap=8),
}

# --- Girl 1024x682 ---
girl = Image.open(os.path.join(base, "sprite-vestibulanda.jpg")).convert("RGBA")
girl_anims = {
    "idle": grid(190, 82, 4, 90, 100, gap=8),
    "walk": grid(190, 195, 6, 88, 100, gap=10),
    "walk_l": grid(190, 300, 6, 88, 100, gap=10),
    "jump": grid(190, 408, 6, 88, 100, gap=10),
    "shoot": grid(190, 530, 6, 88, 105, gap=10),
}

meta = {
    "boy": build_atlas(boy, "boy", boy_anims),
    "girl": build_atlas(girl, "girl", girl_anims),
}

# também extrai itens do canto (estrela, moeda, capelo, livros, coração) se possível
# preview heroes
for tag, im, box in [
    ("boy", boy, (560, 70, 780, 340)),
    ("girl", girl, (700, 80, 980, 420)),
]:
    sp = content_bbox(im, box, threshold=30)
    if sp:
        # save larger preview for UI selection
        preview = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        sw, sh = sp.size
        scale = min(94 / sw, 94 / sh)
        sp2 = sp.resize((max(1, int(sw * scale)), max(1, int(sh * scale))), Image.NEAREST)
        preview.paste(sp2, ((96 - sp2.size[0]) // 2, 96 - sp2.size[1] - 1), sp2)
        preview.save(os.path.join(out_dir, f"{tag}_preview.png"))
        meta[tag]["preview"] = f"assets/sprites/{tag}_preview.png"

with open(os.path.join(out_dir, "meta.json"), "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

# combined master atlas per hero: rows idle/walk/jump/shoot
for tag, anims in (("boy", boy_anims), ("girl", girl_anims)):
    rows = ["idle", "walk", "jump", "shoot"]
    max_f = max(len(anims[a]) for a in rows)
    master = Image.new("RGBA", (FS * max_f, FS * len(rows)), (0, 0, 0, 0))
    im = boy if tag == "boy" else girl
    for ri, anim in enumerate(rows):
        for i, cell in enumerate(anims[anim]):
            sp = content_bbox(im, (cell[0], cell[1], cell[0] + cell[2], cell[1] + cell[3]))
            fr = to_cell(sp)
            master.paste(fr, (i * FS, ri * FS), fr)
    master.save(os.path.join(out_dir, f"{tag}_sheet.png"))
    print("master", tag, master.size)

print("OK", out_dir)
