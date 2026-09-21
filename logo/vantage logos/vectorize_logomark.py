"""Trace the approved Vantage mark into standalone black and white SVG paths.
Potrace ABI reference: https://potrace.sourceforge.net/potracelib.pdf
"""
from pathlib import Path
import ctypes as C
import os, json, subprocess
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/"final/06-vantage-mark-black-transparent.png"
BUILD=ROOT/"svg-validation"
BUILD.mkdir(exist_ok=True)
dll_dir=os.add_dll_directory(r"C:\Program Files\Inkscape\bin")
lib=C.CDLL(r"C:\Program Files\Inkscape\bin\libpotrace-0.dll")
class Point(C.Structure):
    _fields_=[("x",C.c_double),("y",C.c_double)]
class Curve(C.Structure):
    _fields_=[("n",C.c_int),("tag",C.POINTER(C.c_int)),("c",C.POINTER(Point*3))]
class PathRecord(C.Structure): pass
PathRecord._fields_=[("area",C.c_int),("sign",C.c_int),("curve",Curve),("next",C.POINTER(PathRecord)),("childlist",C.POINTER(PathRecord)),("sibling",C.POINTER(PathRecord)),("priv",C.c_void_p)]
class State(C.Structure):
    _fields_=[("status",C.c_int),("plist",C.POINTER(PathRecord)),("priv",C.c_void_p)]
class Bitmap(C.Structure):
    _fields_=[("w",C.c_int),("h",C.c_int),("dy",C.c_int),("map",C.POINTER(C.c_ulong))]
lib.potrace_param_default.restype=C.c_void_p
lib.potrace_trace.argtypes=[C.c_void_p,C.POINTER(Bitmap)]
lib.potrace_trace.restype=C.POINTER(State)
lib.potrace_state_free.argtypes=[C.POINTER(State)]
lib.potrace_param_free.argtypes=[C.c_void_p]
lib.potrace_version.restype=C.c_char_p
source=Image.open(SOURCE).getchannel("A")
mask=np.array(source)>=128
h,w=mask.shape
bits=C.sizeof(C.c_ulong)*8
dy=(w+bits-1)//bits
words=(C.c_ulong*(dy*h))()
for y in range(h):
    for x in np.flatnonzero(mask[y]):
        i=y*dy+int(x)//bits
        words[i] |= 1 << (bits-1-int(x)%bits)
bitmap=Bitmap(w,h,dy,words)
params=lib.potrace_param_default()
state=lib.potrace_trace(params,C.byref(bitmap))
assert state and state.contents.status==0
paths=[]
def coord(p): return f"{p.x:.3f},{p.y:.3f}"
try:
    record=state.contents.plist
    while record:
        curve=record.contents.curve
        assert record.contents.sign==ord("+")
        commands=["M "+coord(curve.c[curve.n-1][2])]
        for i in range(curve.n):
            points=curve.c[i]
            if curve.tag[i]==2:
                commands.append("L "+coord(points[1])+" "+coord(points[2]))
            else:
                assert curve.tag[i]==1
                commands.append("C "+" ".join(coord(points[k]) for k in range(3)))
        commands.append("Z")
        paths.append(" ".join(commands))
        record=record.contents.next
finally:
    lib.potrace_state_free(state);lib.potrace_param_free(params)
assert len(paths)==3, f"Expected three triangles, got {len(paths)}"
reports=[]
for color,fill in [("black","#000000"),("white","#ffffff")]:
    filename=ROOT/f"vantage-logomark-{color}.svg"
    markup=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="{fill}" role="img" aria-labelledby="title">\n  <title id="title">Vantage logo mark</title>\n'
    markup+="".join(f'  <path d="{d}"/>\n' for d in paths)
    markup+="</svg>\n"
    filename.write_text(markup,encoding="utf-8")
    doc=ET.fromstring(markup)
    assert len(doc.findall("{http://www.w3.org/2000/svg}path"))==3
    assert not doc.findall(".//{http://www.w3.org/2000/svg}image")
    rendered=BUILD/f"{color}-render.png"
    subprocess.run([r"C:\Program Files\Inkscape\bin\inkscape.exe",str(filename),"--export-type=png",f"--export-filename={rendered}","--export-width="+str(w),"--export-background-opacity=0"],check=True,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
    im=Image.open(rendered).convert("RGBA")
    a=np.array(im)[:,:,3]
    rendered_mask=a>=128
    iou=float((mask&rendered_mask).sum()/(mask|rendered_mask).sum())
    assert iou>=0.99,iou
    assert a.min()==0 and a.max()==255
    reports.append({"file":filename.name,"paths":3,"bytes":filename.stat().st_size,"silhouette_iou":iou,"transparent":True})
assert np.array_equal(np.array(Image.open(BUILD/"black-render.png"))[:,:,3],np.array(Image.open(BUILD/"white-render.png"))[:,:,3])
preview=Image.new("RGB",(1100,350),"#e5e7eb")
draw=ImageDraw.Draw(preview)
font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf",20)
for i,(label,bg) in enumerate([("white","#16191c"),("black","#ffffff")]):
    draw.text((24+i*550,18),label.capitalize()+" SVG",font=font,fill="#222222")
    tile=Image.new("RGBA",(510,265),bg)
    im=Image.open(BUILD/f"{label}-render.png").convert("RGBA")
    im.thumbnail((480,230),Image.Resampling.LANCZOS)
    tile.alpha_composite(im,((tile.width-im.width)//2,(tile.height-im.height)//2))
    preview.paste(tile.convert("RGB"),(24+i*550,55))
preview.save(BUILD/"svg-preview.png",optimize=True)
report={"source":str(SOURCE.relative_to(ROOT)),"tracer":lib.potrace_version().decode(),"viewBox":[0,0,w,h],"matching_colorway_geometry":True,"assets":reports}
(BUILD/"validation.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report,indent=2))
