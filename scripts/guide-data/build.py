# Builds climate.json: nearest NOAA first-order (USW) station with 1991-2020 monthly normals
# (MLY-TMAX-NORMAL, MLY-PRCP-AVGNDS-GE001HI) for each guide city in assets/js/daylight.js.
# Run from repo root: python3 scripts/guide-data/build.py && python3 scripts/guide-data/sun.py
# Downloads go to scripts/guide-data/cache/ (git-ignored). No API keys needed.
import os
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(HERE))
CACHE=os.path.join(HERE,'cache'); os.makedirs(CACHE,exist_ok=True)
import re,math,csv,io,json,urllib.request,os,sys
src=open(os.path.join(ROOT,'assets/js/daylight.js')).read()
C=[dict(id=m[0],name=m[1],lat=float(m[2]),lon=float(m[3]),tz=m[4]) for m in re.findall(r'\["([^"]+)","([^"]+)",([-\d.]+),([-\d.]+),"([^"]+)"\]',src)]
INV=os.path.join(CACHE,'inventory_30yr.txt')
if not os.path.exists(INV): urllib.request.urlretrieve('https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/doc/inventory_30yr.txt',INV)
st=[]
for l in open(INV):
    p=l.split()
    if p[0].startswith('USW'): st.append((p[0],float(p[1]),float(p[2]),l[41:71].strip()))
def d(a,b,c,e):
    return 6371*math.acos(min(1,math.sin(math.radians(a))*math.sin(math.radians(c))+math.cos(math.radians(a))*math.cos(math.radians(c))*math.cos(math.radians(b-e))))
def get(s):
    f=os.path.join(CACHE,s+'.csv')
    if not os.path.exists(f):
        try: urllib.request.urlretrieve('https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/access/'+s+'.csv',f)
        except Exception: return None
    rows=list(csv.DictReader(open(f)))
    try:
        t=[float(r['MLY-TMAX-NORMAL']) for r in rows]; p=[float(r['MLY-PRCP-AVGNDS-GE001HI']) for r in rows]
        if len(t)!=12 or min(p)<0 or min(t)<-100: return None
        return t,p
    except Exception: return None
out=[]
for c in C:
    for s in sorted(st,key=lambda s:d(c['lat'],c['lon'],s[1],s[2]))[:6]:
        r=get(s[0])
        if r: break
    km=d(c['lat'],c['lon'],s[1],s[2])
    out.append(dict(id=c['id'],station=s[0],sname=s[3],km=round(km),tmax=r[0],pdays=r[1]))
    print(c['name'],s[0],s[3],round(km),r[0][0],r[1][0],file=sys.stderr)
json.dump(out,open(os.path.join(CACHE,'climate.json'),'w'))
