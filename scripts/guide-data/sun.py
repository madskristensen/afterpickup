# Builds _data/guide_cities.json (monthly average sunset via NOAA solar equations + climate.json from build.py).
import os
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(os.path.dirname(HERE))
import json,math,re,datetime as dt
from zoneinfo import ZoneInfo
R=math.pi/180
src=open(os.path.join(ROOT,'daylight-after-school.html')).read()
C=[dict(id=m[0],name=m[1],lat=float(m[2]),lon=float(m[3]),tz=m[4]) for m in re.findall(r'\["([^"]+)","([^"]+)",([-\d.]+),([-\d.]+),"([^"]+)"\]',src)]
clim={c['id']:c for c in json.load(open(os.path.join(HERE,'cache','climate.json')))}
def solar(jd):
    T=(jd-2451545)/36525;L0=(280.46646+T*(36000.76983+T*0.0003032))%360;M=357.52911+T*(35999.05029-0.0001537*T)
    e=0.016708634-T*(0.000042037+0.0000001267*T)
    Cc=math.sin(M*R)*(1.914602-T*(0.004817+0.000014*T))+math.sin(2*M*R)*(0.019993-0.000101*T)+math.sin(3*M*R)*0.000289
    om=125.04-1934.136*T;lam=L0+Cc-0.00569-0.00478*math.sin(om*R)
    eps0=23+(26+(21.448-T*(46.815+T*(0.00059-T*0.001813)))/60)/60;eps=eps0+0.00256*math.cos(om*R)
    decl=math.asin(math.sin(eps*R)*math.sin(lam*R))/R;y=math.tan(eps/2*R)**2
    eot=4/R*(y*math.sin(2*L0*R)-2*e*math.sin(M*R)+4*e*y*math.sin(M*R)*math.cos(2*L0*R)-0.5*y*y*math.sin(4*L0*R)-1.25*e*e*math.sin(2*M*R))
    return decl,eot
def sunset_utc(d,lat,lon):
    jd=d.toordinal()+1721424.5
    t=720-4*lon
    for _ in range(3):
        decl,eot=solar(jd+t/1440)
        x=math.cos(90.833*R)/(math.cos(lat*R)*math.cos(decl*R))-math.tan(lat*R)*math.tan(decl*R)
        ha=math.acos(max(-1,min(1,x)))/R
        t=720-4*(lon-ha)-eot
    return t
out=[];wk=[0]*12
days=[dt.date(2026,1,1)+dt.timedelta(i) for i in range(365)]
for d in days:
    if d.weekday()<5: wk[d.month-1]+=1
for c in C:
    s=[[] for _ in range(12)]
    for d in days:
        u=dt.datetime(d.year,d.month,d.day,tzinfo=dt.timezone.utc)+dt.timedelta(minutes=sunset_utc(d,c['lat'],c['lon']))
        l=u.astimezone(ZoneInfo(c['tz']))
        s[d.month-1].append((l-l.replace(hour=0,minute=0,second=0,microsecond=0)).total_seconds()/60)
    k=clim[c['id']]
    out.append(dict(id=c['id'],name=c['name'],lat=c['lat'],lon=c['lon'],tz=c['tz'],station=k['station'],stationName=k['sname'].title(),km=k['km'],
      tmax=[round(v,1) for v in k['tmax']],pdays=[round(v,1) for v in k['pdays']],sunset=[round(sum(v)/len(v)) for v in s]))
# school weekdays, Sep 2026 - Jun 2027
sd=[0]*12;d=dt.date(2026,9,1)
while d<=dt.date(2027,6,30):
    if d.weekday()<5: sd[d.month-1]+=1
    d+=dt.timedelta(1)
json.dump(dict(weekdays=sd,cities=out),open(os.path.join(ROOT,'_data/guide_cities.json'),'w'),separators=(',',':'))
r=[c for c in out if c['id']=='redmond-wa'][0];print(r, sd)
