from pathlib import Path
from PIL import Image

ASSET = Path("public/assets/walk.png")
FRAME_SIZE = 512
FRAME_COUNT = 6
SCALE = 0.80
TARGET_BOTTOM = 480
SCALED_SIZE = round(FRAME_SIZE * SCALE)

def metrics(frame):
    bbox = frame.getchannel("A").getbbox()
    if bbox is None:
        return None
    left, top, right_exclusive, bottom_exclusive = bbox
    return {
        "left": left,
        "right": right_exclusive - 1,
        "top": top,
        "bottom": bottom_exclusive - 1,
        "width": right_exclusive - left,
        "height": bottom_exclusive - top,
    }

sheet = Image.open(ASSET).convert("RGBA")
expected_size = (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE)
if sheet.size != expected_size:
    raise SystemExit(f"walk.png inesperado: {sheet.size}; esperado {expected_size}")

frames = [
    sheet.crop((i * FRAME_SIZE, 0, (i + 1) * FRAME_SIZE, FRAME_SIZE))
    for i in range(FRAME_COUNT)
]
before = [metrics(frame) for frame in frames]

already_normalized = all(
    m is not None
    and m["bottom"] == TARGET_BOTTOM
    and 397 <= m["height"] <= 410
    for m in before
)

if already_normalized:
    print("WALK já está normalizada; nenhuma alteração necessária.")
    for i, m in enumerate(before):
        print(f"WALK {i}: {m}")
    raise SystemExit(0)

# Proteção contra aplicar 0,80 novamente em uma arte que não seja a versão grande conhecida.
looks_like_large_source = all(
    m is not None
    and m["height"] >= 490
    and m["bottom"] >= 490
    for m in before
)
if not looks_like_large_source:
    raise SystemExit(
        "WALK não corresponde nem à versão normalizada nem à versão grande esperada. "
        "Abortando para evitar redimensionamento indevido."
    )

out_sheet = Image.new("RGBA", expected_size, (0, 0, 0, 0))
after = []

for i, frame in enumerate(frames):
    resized = frame.resize(
        (SCALED_SIZE, SCALED_SIZE),
        Image.Resampling.LANCZOS,
    )

    resized_metrics = metrics(resized)
    if resized_metrics is None:
        raise SystemExit(f"WALK {i} ficou vazio após resize")

    # O canvas inteiro usa o mesmo fator global e permanece centrado em X.
    x = (FRAME_SIZE - SCALED_SIZE) // 2

    # Apenas reposiciona verticalmente o frame inteiro para a base visível terminar em Y=480.
    y = TARGET_BOTTOM - resized_metrics["bottom"]

    canvas = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(resized, dest=(x, y))

    m = metrics(canvas)
    if m is None:
        raise SystemExit(f"WALK {i} ficou vazio no canvas final")

    if m["bottom"] != TARGET_BOTTOM:
        raise SystemExit(f"WALK {i}: bottom={m['bottom']} em vez de {TARGET_BOTTOM}")

    if not 397 <= m["height"] <= 410:
        raise SystemExit(f"WALK {i}: height={m['height']} fora de 397–410")

    after.append(m)
    out_sheet.alpha_composite(canvas, dest=(i * FRAME_SIZE, 0))

out_sheet.save(ASSET, format="PNG", optimize=True)

print(f"WALK normalizada com fator global {SCALE:.2f}")
for i, (old, new) in enumerate(zip(before, after)):
    print(f"WALK {i}: antes={old} depois={new}")
print(f"Arquivo final: {ASSET} {out_sheet.size[0]}x{out_sheet.size[1]}")
