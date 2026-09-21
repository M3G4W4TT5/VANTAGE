from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import json
from collections import deque
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT.parent / "vantage logos/final/09-vantage-text-white-transparent.png"
alpha = np.array(Image.open(SOURCE).getchannel("A"))
seen = np.zeros(alpha.shape, dtype=bool)
components = []
for y, x in zip(*np.where(alpha > 0)):
    if seen[y,x]: continue
    q=deque([(int(y),int(x))]); seen[y,x]=True; points=[]
    while q:
        yy,xx=q.popleft(); points.append((yy,xx))
        for ny,nx in ((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)):
            if 0 <= ny < alpha.shape[0] and 0 <= nx < alpha.shape[1] and not seen[ny,nx] and alpha[ny,nx]>0:
                seen[ny,nx]=True; q.append((ny,nx))
    if len(points) > 100:
        ys,xs=zip(*points); box=(min(xs),min(ys),max(xs)+1,max(ys)+1)
        a=np.zeros_like(alpha)
        a[tuple(np.array(points).T)] = alpha[tuple(np.array(points).T)]
        components.append((box,Image.fromarray(a).crop(box)))
components.sort(key=lambda c:c[0][0])
assert len(components)==7
glyphs=dict(zip("Vantage",components))
# Repeated a dictionary resolves to second a, a direct original glyph.
print("GLYPHS",[(ch,box) for ch,(box,im) in zip("Vantage",components)])
font_names=["arial.ttf","arialbd.ttf","segoeui.ttf","seguisb.ttf","segoeuib.ttf","calibri.ttf","calibrib.ttf","tahoma.ttf","tahomabd.ttf","verdana.ttf","verdanab.ttf"]
results=[]
for name in font_names:
    path=Path("C:/Windows/Fonts")/name
    if not path.exists(): continue
    font=ImageFont.truetype(str(path),300)
    for stroke in [0,1,2,3,4]:
        scores=[]
        for ch in "ate":
            target=glyphs[ch][1]
            rendered=Image.new("L",(600,500),0)
            ImageDraw.Draw(rendered).text((50,10),ch,font=font,fill=255,stroke_width=stroke)
            rendered=rendered.crop(rendered.getbbox()).resize(target.size,Image.Resampling.LANCZOS)
            p=np.array(rendered)>127; t=np.array(target)>127
            scores.append(float(np.logical_and(p,t).sum()/np.logical_or(p,t).sum()))
        results.append((sum(scores)/len(scores),name,stroke))
results.sort(reverse=True)
print("MATCHES",results[:12])
ROOT.mkdir(exist_ok=True)
# Store exact crops for composition; internal build assets.
work=ROOT / "_build"
work.mkdir(exist_ok=True)
for ch in "Vta":
    glyphs[ch][1].save(work/f"{ch}-alpha.png")
(work/"glyphs.json").write_text(json.dumps({ch:{"bbox":box,"size":list(im.size)} for ch,(box,im) in glyphs.items()},indent=2))
(work/"font-matches.json").write_text(json.dumps(results[:12],indent=2))

