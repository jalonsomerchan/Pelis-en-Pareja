"""Rasterize the code-native app mark for PWA and iOS. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw
from math import sin, cos, pi
root=Path(__file__).resolve().parents[1]/'public'/'icons'
for size,name,maskable in [(192,'icon-192.png',False),(512,'icon-512.png',False),(512,'icon-maskable.png',True)]:
 scale=4; n=size*scale
 image=Image.new('RGB',(n,n),'#e6ff72')
 draw=ImageDraw.Draw(image)
 heart=[]
 factor=n*(.018 if maskable else .021)
 for step in range(401):
  t=2*pi*step/400
  x=16*sin(t)**3
  y=13*cos(t)-5*cos(2*t)-2*cos(3*t)-cos(4*t)
  heart.append((n/2+x*factor,n*.49-y*factor))
 draw.polygon(heart,fill='#141510')
 draw.polygon([(n*.46,n*.40),(n*.60,n*.49),(n*.46,n*.58)],fill='#e6ff72')
 image.resize((size,size),Image.Resampling.LANCZOS).save(root/name)
print('PWA icons: 192px, 512px, maskable 512px')
