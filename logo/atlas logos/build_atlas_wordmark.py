from pathlib import Path
import json, hashlib, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
BUILD=ROOT/"_build"
OUT=ROOT/"final"
OUT.mkdir(exist_ok=True)
V=Image.open(BUILD/"V-alpha.png").convert("L")
A=V.transpose(Image.Transpose.ROTATE_180)
t=Image.open(BUILD/"t-alpha.png").convert("L")
a=Image.open(BUILD/"a-alpha.png").convert("L")
metadata=json.loads((BUILD/"glyphs.json").read_text())
font_path=Path("C:/Windows/Fonts/seguisb.ttf")
font=ImageFont.truetype(str(font_path),1200)
def render(ch,width,height):
    canvas=Image.new("L",(1800,1800),0)
    ImageDraw.Draw(canvas).text((100,100),ch,font=font,fill=255,stroke_width=12)
    return canvas.crop(canvas.getbbox()).resize((width,height),Image.Resampling.LANCZOS)
# Match the original lowercase stroke and x-height.
l=render("l",38,V.height)
s=render("s",132,a.height)
positions=[
    ("A",A,32,32),
    ("t",t,32+A.width-19,48),
]
tx=positions[-1][2]
lx=tx+t.width+17
ax=lx+l.width+17
sx=ax+a.width+14
positions += [("l",l,lx,32),("a",a,ax,88),("s",s,sx,88)]
width=sx+s.width+32
height=max(y+im.height for _,im,x,y in positions)+32
alpha=Image.new("L",(width,height),0)
for _,im,x,y in positions:
    # Components never overlap; check to prevent unwanted joins.
    existing=np.array(alpha.crop((x,y,x+im.width,y+im.height)))
    assert not np.any((existing>0)&(np.array(im)>0))
    alpha.paste(Image.fromarray(np.maximum(existing,np.array(im))),(x,y))
assert np.array_equal(np.array(A),np.array(V)[::-1,::-1]),"A is not the exact rotated V"
placed_A=np.array(alpha.crop((32,32,32+A.width,32+A.height)))
assert np.array_equal(placed_A[np.array(A)>0],np.array(A)[np.array(A)>0]),"Composition altered A pixels"
files=[]
for label,color in [("white",255),("black",0)]:
    im=Image.new("RGBA",alpha.size,(color,color,color,255)); im.putalpha(alpha)
    path=OUT/f"atlas-text-{label}-transparent.png"
    im.save(path,optimize=True)
    read=np.array(Image.open(path))
    assert np.array_equal(read[:,:,3],np.array(alpha))
    assert np.all(read[:,:,:3]==color)
    assert read[:,:,3].min()==0 and read[:,:,3].max()==255
    files.append({"file":path.name,"size":list(im.size),"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
manifest={"source":"../../vantage logos/final/09-vantage-text-white-transparent.png","A":"Exact original V alpha mask rotated 180 degrees, no resampling and no crossbar.","t_and_a":"Direct original Vantage glyphs, unchanged.","l_and_s":"Segoe UI Semibold with adjusted weight/proportions to match Vantage lettering.","colorways":"Pure white and pure black RGB with identical alpha masks.","checks":{"exact_rotated_V":True,"identical_colorway_geometry":True,"real_alpha_transparency":True},"assets":files}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
(OUT/"README.md").write_text("# Atlas wordmark\n\nWhite and black PNGs with true alpha transparency.\n\nThe initial A is the exact Vantage V rotated 180 degrees, with no crossbar.\nThe t and a are reused directly from Vantage. The l and s are matched to the existing lettering.\n\nDimensions: "+str(width)+" x "+str(height)+" pixels. Includes 32 px clear margins.\n",encoding="utf-8")
# A separate review sheet; the exported PNGs themselves remain transparent.
preview=Image.new("RGB",(1200,680),"#e9ebed")
d=ImageDraw.Draw(preview); title=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",25); small=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",18)
d.text((35,22),"Atlas / Vantage framework",font=title,fill="#17191a")
for row,(label,bg) in enumerate([("white","#17191a"),("black","#ffffff")]):
    tile=Image.new("RGBA",(1130,245),bg)
    logo=Image.open(OUT/f"atlas-text-{label}-transparent.png")
    logo.thumbnail((1000,205),Image.Resampling.LANCZOS)
    tile.alpha_composite(logo,((tile.width-logo.width)//2,(tile.height-logo.height)//2))
    y=72+row*300
    preview.paste(tile.convert("RGB"),(35,y))
    d.text((35,y+255),f"{label.capitalize()} wordmark / transparent PNG",font=small,fill="#33383d")
preview.save(ROOT/"atlas-wordmark-preview.png",optimize=True)
with zipfile.ZipFile(ROOT/"atlas-wordmark-assets.zip","w",zipfile.ZIP_DEFLATED) as z:
    for p in OUT.iterdir():
        if p.is_file(): z.write(p,p.name)
print(json.dumps(manifest,indent=2))
