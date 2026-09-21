"""Vector SVG exports based on approved Vantage/Atlas artwork.
Uses installed Potrace; ABI reference https://potrace.sourceforge.net/potracelib.pdf.
"""
from pathlib import Path
import ctypes as C
import os,json,subprocess,zipfile
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
VDIR=ROOT/"vantage logos"; ADIR=ROOT/"atlas logos"
BUILD=ROOT/"svg-validation"; BUILD.mkdir(exist_ok=True)
DLL_DIRECTORY=os.add_dll_directory(r"C:\Program Files\Inkscape\bin")
lib=C.CDLL(r"C:\Program Files\Inkscape\bin\libpotrace-0.dll")
class Point(C.Structure): _fields_=[("x",C.c_double),("y",C.c_double)]
class Curve(C.Structure): _fields_=[("n",C.c_int),("tag",C.POINTER(C.c_int)),("c",C.POINTER(Point*3))]
class PathRecord(C.Structure): pass
PathRecord._fields_=[("area",C.c_int),("sign",C.c_int),("curve",Curve),("next",C.POINTER(PathRecord)),("childlist",C.POINTER(PathRecord)),("sibling",C.POINTER(PathRecord)),("priv",C.c_void_p)]
class State(C.Structure): _fields_=[("status",C.c_int),("plist",C.POINTER(PathRecord)),("priv",C.c_void_p)]
class Bitmap(C.Structure): _fields_=[("w",C.c_int),("h",C.c_int),("dy",C.c_int),("map",C.POINTER(C.c_ulong))]
lib.potrace_param_default.restype=C.c_void_p
lib.potrace_trace.argtypes=[C.c_void_p,C.POINTER(Bitmap)]
lib.potrace_trace.restype=C.POINTER(State)
lib.potrace_state_free.argtypes=[C.POINTER(State)]
lib.potrace_param_free.argtypes=[C.c_void_p]
def trace(alpha):
    mask=alpha>=128; h,w=mask.shape; bits=C.sizeof(C.c_ulong)*8; dy=(w+bits-1)//bits
    words=(C.c_ulong*(dy*h))()
    for y in range(h):
        for xx in np.flatnonzero(mask[y]):
            x=int(xx); words[y*dy+x//bits] |= 1 << (bits-1-x%bits)
    params=lib.potrace_param_default(); state=lib.potrace_trace(params,C.byref(Bitmap(w,h,dy,words)))
    assert state and state.contents.status==0
    paths=[]
    def xy(p): return f"{p.x:.3f},{p.y:.3f}"
    try:
        r=state.contents.plist
        while r:
            c=r.contents.curve; commands=["M "+xy(c.c[c.n-1][2])]
            for i in range(c.n):
                p=c.c[i]
                if c.tag[i]==2: commands.append("L "+xy(p[1])+" "+xy(p[2]))
                else:
                    assert c.tag[i]==1
                    commands.append("C "+" ".join(xy(p[j]) for j in range(3)))
            commands.append("Z"); paths.append(" ".join(commands)); r=r.contents.next
    finally:
        lib.potrace_state_free(state);lib.potrace_param_free(params)
    return " ".join(paths)

def alpha(path): return np.array(Image.open(path).getchannel("A"))
v=np.array(Image.open(ADIR/"_build/V-alpha.png"))
vh,vw=v.shape; vpath=trace(v)
vtext=alpha(VDIR/"final/09-vantage-text-white-transparent.png")
atext=alpha(ADIR/"final/atlas-text-white-transparent.png")
rest_v=vtext.copy(); rest_a=atext.copy()
assert np.array_equal(rest_v[32:32+vh,32:32+vw][v>0],v[v>0])
rest_v[32:32+vh,32:32+vw][v>0]=0
rotated=v[::-1,::-1]
assert np.array_equal(rest_a[32:32+vh,32:32+vw][rotated>0],rotated[rotated>0])
rest_a[32:32+vh,32:32+vw][rotated>0]=0
amark=np.zeros((vh+64,vw+64),dtype=np.uint8); amark[32:32+vh,32:32+vw]=rotated
a_transform=f"matrix(-1 0 0 -1 {vw+32} {vh+32})"
v_element=f'<path id="initial-v" transform="translate(32 32)" d="{vpath}"/>'
a_element=f'<path id="initial-a" transform="{a_transform}" d="{vpath}"/>'
specs=[
    (VDIR,"vantage-wordmark","Vantage wordmark",vtext,v_element+f'\n  <path d="{trace(rest_v)}"/>'),
    (ADIR,"atlas-wordmark","Atlas wordmark",atext,a_element+f'\n  <path d="{trace(rest_a)}"/>'),
    (ADIR,"atlas-logomark","Atlas logo mark",amark,a_element),
]
assets=[]
for directory,stem,title,ref,body in specs:
    h,w=ref.shape
    for color,fill in [("white","#ffffff"),("black","#000000")]:
        path=directory/f"{stem}-{color}.svg"
        if path.exists(): raise FileExistsError(path)
        markup=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="{fill}" fill-rule="evenodd" role="img" aria-labelledby="title">\n  <title id="title">{title}</title>\n  {body}\n</svg>\n'
        path.write_text(markup,encoding="utf-8")
        assets.append((stem,color,path,ref))
# Include the existing approved triangle mark without changing it.
mark=alpha(VDIR/"final/06-vantage-mark-black-transparent.png")
for color in ["white","black"]:
    assets.append(("vantage-logomark",color,VDIR/f"vantage-logomark-{color}.svg",mark))

def validate(item):
    stem,color,path,ref=item
    doc=ET.parse(path).getroot()
    assert not doc.findall(".//{http://www.w3.org/2000/svg}image")
    assert not doc.findall(".//{http://www.w3.org/2000/svg}text")
    output=BUILD/f"{stem}-{color}.png"
    subprocess.run([r"C:\Program Files\Inkscape\bin\inkscape.exe",str(path),"--export-type=png",f"--export-filename={output}",f"--export-width={ref.shape[1]}","--export-background-opacity=0"],check=True,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
    rendered=np.array(Image.open(output).convert("RGBA"))[:,:,3]
    m=ref>=128; n=rendered>=128
    iou=float((m&n).sum()/(m|n).sum())
    assert iou>=0.99,(stem,iou)
    assert rendered.min()==0 and rendered.max()==255
    return {"file":str(path.relative_to(ROOT)),"silhouette_iou":iou,"pure_vector_paths":True,"transparent":True}
with ThreadPoolExecutor(max_workers=4) as pool:
    reports=list(pool.map(validate,assets))
for stem in ["vantage-logomark","atlas-logomark","vantage-wordmark","atlas-wordmark"]:
    assert np.array_equal(alpha(BUILD/f"{stem}-white.png"),alpha(BUILD/f"{stem}-black.png"))
ns={"s":"http://www.w3.org/2000/svg"}
vp=ET.parse(VDIR/"vantage-wordmark-black.svg").find(".//s:path[@id='initial-v']",ns)
ap=ET.parse(ADIR/"atlas-logomark-black.svg").find(".//s:path[@id='initial-a']",ns)
atp=ET.parse(ADIR/"atlas-wordmark-black.svg").find(".//s:path[@id='initial-a']",ns)
assert vp.get("d")==ap.get("d")==atp.get("d")
assert ap.get("transform")==atp.get("transform")==a_transform
report={"assets":reports,"white_black_geometry_identical":True,"atlas_a_uses_exact_vantage_v_path_rotated_180":True}
(BUILD/"validation.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
# A neutral preview sheet; all SVG files themselves have no background.
preview=Image.new("RGB",(1280,1050),"#e6e9ec"); draw=ImageDraw.Draw(preview)
font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",20)
for row,stem in enumerate(["vantage-logomark","vantage-wordmark","atlas-logomark","atlas-wordmark"]):
    for col,color in enumerate(["white","black"]):
        x=24+col*640; y=18+row*260
        draw.text((x,y),stem.replace("-"," ").title()+" / "+color,font=font,fill="#22262a")
        tile=Image.new("RGBA",(592,210),"#17191c" if color=="white" else "#ffffff")
        im=Image.open(BUILD/f"{stem}-{color}.png").convert("RGBA")
        im.thumbnail((550,178),Image.Resampling.LANCZOS)
        tile.alpha_composite(im,((tile.width-im.width)//2,(tile.height-im.height)//2))
        preview.paste(tile.convert("RGB"),(x,y+32))
preview.save(ROOT/"vantage-atlas-svg-preview.png",optimize=True)
archive=ROOT/"vantage-atlas-svg-assets.zip"
with zipfile.ZipFile(archive,"w",zipfile.ZIP_DEFLATED) as z:
    for _,_,path,_ in assets: z.write(path,path.relative_to(ROOT))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None and len(z.namelist())==8
print(json.dumps(report,indent=2))

