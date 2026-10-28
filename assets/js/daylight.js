/* Daylight after school. Page-only script for /daylight-after-school/.
   NOAA solar position math, time zones through Intl, no network calls. */
(function (root) {
  "use strict";
  var CITIES = [
    ["redmond-wa","Redmond, WA",47.674,-122.1215,"America/Los_Angeles"],
    ["new-york-ny","New York, NY",40.7128,-74.006,"America/New_York"],
    ["los-angeles-ca","Los Angeles, CA",34.0522,-118.2437,"America/Los_Angeles"],
    ["chicago-il","Chicago, IL",41.8781,-87.6298,"America/Chicago"],
    ["houston-tx","Houston, TX",29.7604,-95.3698,"America/Chicago"],
    ["phoenix-az","Phoenix, AZ",33.4484,-112.074,"America/Phoenix"],
    ["philadelphia-pa","Philadelphia, PA",39.9526,-75.1652,"America/New_York"],
    ["san-antonio-tx","San Antonio, TX",29.4241,-98.4936,"America/Chicago"],
    ["san-diego-ca","San Diego, CA",32.7157,-117.1611,"America/Los_Angeles"],
    ["dallas-tx","Dallas, TX",32.7767,-96.797,"America/Chicago"],
    ["jacksonville-fl","Jacksonville, FL",30.3322,-81.6557,"America/New_York"],
    ["austin-tx","Austin, TX",30.2672,-97.7431,"America/Chicago"],
    ["fort-worth-tx","Fort Worth, TX",32.7555,-97.3308,"America/Chicago"],
    ["san-jose-ca","San Jose, CA",37.3382,-121.8863,"America/Los_Angeles"],
    ["columbus-oh","Columbus, OH",39.9612,-82.9988,"America/New_York"],
    ["charlotte-nc","Charlotte, NC",35.2271,-80.8431,"America/New_York"],
    ["indianapolis-in","Indianapolis, IN",39.7684,-86.1581,"America/Indiana/Indianapolis"],
    ["san-francisco-ca","San Francisco, CA",37.7749,-122.4194,"America/Los_Angeles"],
    ["seattle-wa","Seattle, WA",47.6062,-122.3321,"America/Los_Angeles"],
    ["denver-co","Denver, CO",39.7392,-104.9903,"America/Denver"],
    ["oklahoma-city-ok","Oklahoma City, OK",35.4676,-97.5164,"America/Chicago"],
    ["nashville-tn","Nashville, TN",36.1627,-86.7816,"America/Chicago"],
    ["washington-dc","Washington, DC",38.9072,-77.0369,"America/New_York"],
    ["el-paso-tx","El Paso, TX",31.7619,-106.485,"America/Denver"],
    ["las-vegas-nv","Las Vegas, NV",36.1699,-115.1398,"America/Los_Angeles"],
    ["boston-ma","Boston, MA",42.3601,-71.0589,"America/New_York"],
    ["detroit-mi","Detroit, MI",42.3314,-83.0458,"America/Detroit"],
    ["portland-or","Portland, OR",45.5152,-122.6784,"America/Los_Angeles"],
    ["louisville-ky","Louisville, KY",38.2527,-85.7585,"America/Kentucky/Louisville"],
    ["memphis-tn","Memphis, TN",35.1495,-90.049,"America/Chicago"],
    ["baltimore-md","Baltimore, MD",39.2904,-76.6122,"America/New_York"],
    ["milwaukee-wi","Milwaukee, WI",43.0389,-87.9065,"America/Chicago"],
    ["albuquerque-nm","Albuquerque, NM",35.0844,-106.6504,"America/Denver"],
    ["tucson-az","Tucson, AZ",32.2226,-110.9747,"America/Phoenix"],
    ["fresno-ca","Fresno, CA",36.7378,-119.7871,"America/Los_Angeles"],
    ["sacramento-ca","Sacramento, CA",38.5816,-121.4944,"America/Los_Angeles"],
    ["mesa-az","Mesa, AZ",33.4152,-111.8315,"America/Phoenix"],
    ["atlanta-ga","Atlanta, GA",33.749,-84.388,"America/New_York"],
    ["kansas-city-mo","Kansas City, MO",39.0997,-94.5786,"America/Chicago"],
    ["colorado-springs-co","Colorado Springs, CO",38.8339,-104.8214,"America/Denver"],
    ["omaha-ne","Omaha, NE",41.2565,-95.9345,"America/Chicago"],
    ["raleigh-nc","Raleigh, NC",35.7796,-78.6382,"America/New_York"],
    ["miami-fl","Miami, FL",25.7617,-80.1918,"America/New_York"],
    ["virginia-beach-va","Virginia Beach, VA",36.8529,-75.978,"America/New_York"],
    ["long-beach-ca","Long Beach, CA",33.7701,-118.1937,"America/Los_Angeles"],
    ["oakland-ca","Oakland, CA",37.8044,-122.2712,"America/Los_Angeles"],
    ["minneapolis-mn","Minneapolis, MN",44.9778,-93.265,"America/Chicago"],
    ["bakersfield-ca","Bakersfield, CA",35.3733,-119.0187,"America/Los_Angeles"],
    ["tulsa-ok","Tulsa, OK",36.154,-95.9928,"America/Chicago"],
    ["tampa-fl","Tampa, FL",27.9506,-82.4572,"America/New_York"],
    ["arlington-tx","Arlington, TX",32.7357,-97.1081,"America/Chicago"]
  ].map(function (c) { return { id: c[0], name: c[1], lat: c[2], lon: c[3], tz: c[4] }; });

  var R = Math.PI / 180;
  function sin(d) { return Math.sin(d * R); }
  function cos(d) { return Math.cos(d * R); }

  // NOAA: declination and equation of time (minutes) for a Julian day.
  function solar(jd) {
    var T = (jd - 2451545) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289;
    var om = 125.04 - 1934.136 * T;
    var lam = L0 + C - 0.00569 - 0.00478 * sin(om);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * cos(om);
    var decl = Math.asin(sin(eps) * sin(lam)) / R;
    var y = Math.pow(Math.tan(eps / 2 * R), 2);
    var eot = 4 / R * (y * sin(2 * L0) - 2 * e * sin(M) + 4 * e * y * sin(M) * cos(2 * L0) - 0.5 * y * y * sin(4 * L0) - 1.25 * e * e * sin(2 * M));
    return { decl: decl, eot: eot };
  }

  // Minutes after 00:00 UTC on the given civil date when the sun sets to
  // the given zenith (90.833 = sunset, 96 = end of civil twilight).
  function setUTC(y, m, d, lat, lon, zenith) {
    var jd0 = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
    var t = 720 - 4 * lon; // first guess near local solar noon + offset
    for (var i = 0; i < 3; i++) {
      var s = solar(jd0 + t / 1440);
      var x = cos(zenith) / (cos(lat) * cos(s.decl)) - Math.tan(lat * R) * Math.tan(s.decl * R);
      if (x > 1 || x < -1) return null;
      var ha = Math.acos(x) / R;
      t = 720 - 4 * (lon - ha) - s.eot;
    }
    return t;
  }

  var fmtCache = {};
  function offsetMin(tz, ms) {
    var f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric"
    }));
    var p = {};
    f.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    var asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute);
    return Math.round((asUTC - Math.floor(ms / 60000) * 60000) / 60000);
  }

  // Local clock minutes after midnight for sunset and civil dusk.
  function day(city, y, m, d) {
    var noonUTC = Date.UTC(y, m - 1, d, 12) - city.lon / 15 * 3600000;
    var off = offsetMin(city.tz, noonUTC);
    var s = setUTC(y, m, d, city.lat, city.lon, 90.833);
    var c = setUTC(y, m, d, city.lat, city.lon, 96);
    return { off: off, sunset: s == null ? null : s + off, dusk: c == null ? null : c + off };
  }

  var api = { CITIES: CITIES, day: day, setUTC: setUTC, offsetMin: offsetMin };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }
  if (typeof document === "undefined") return;

  /* ---------------- UI ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var form = $("dl-form"); if (!form) return;
  var selCity = $("dl-city"), selTime = $("dl-time"), inDate = $("dl-date"), geoBtn = $("dl-geo"), geoStatus = $("dl-geo-status");
  var myLoc = null;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(min) {
    min = Math.round(min); var h = Math.floor(min / 60) % 24, mm = min % 60;
    return ((h + 11) % 12 + 1) + ":" + pad(mm) + (h < 12 ? " AM" : " PM");
  }
  function dur(min) {
    min = Math.max(0, Math.round(min));
    var h = Math.floor(min / 60), m = min % 60;
    return h ? h + " h " + m + " min" : m + " min";
  }
  function after(v, end) { return v == null ? 0 : Math.max(0, v - end); }
  function todayIn(tz) {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
    return p.year + "-" + pad(p.month) + "-" + pad(p.day);
  }
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function label(y, m, d) { return MONTHS[m - 1] + " " + d; }

  CITIES.forEach(function (c) { var o = document.createElement("option"); o.value = c.id; o.textContent = c.name; selCity.appendChild(o); });
  for (var t = 13 * 60 + 30; t <= 16 * 60 + 30; t += 15) {
    var o = document.createElement("option"); o.value = pad(Math.floor(t / 60)) + pad(t % 60); o.textContent = clock(t); selTime.appendChild(o);
  }

  var q = new URLSearchParams(location.search);
  selCity.value = CITIES.some(function (c) { return c.id === q.get("city"); }) ? q.get("city") : "redmond-wa";
  selTime.value = /^\d{4}$/.test(q.get("time") || "") && selTime.querySelector('option[value="' + q.get("time") + '"]') ? q.get("time") : "1500";
  inDate.value = /^\d{4}-\d\d-\d\d$/.test(q.get("date") || "") ? q.get("date") : todayIn(cityById(selCity.value).tz);

  function cityById(id) {
    if (id === "here" && myLoc) return myLoc;
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i];
    return CITIES[0];
  }
  function endMin() { var v = selTime.value; return +v.slice(0, 2) * 60 + +v.slice(2); }
  function ymd() { var p = inDate.value.split("-").map(Number); return p.length === 3 && p[0] ? p : todayIn("America/Los_Angeles").split("-").map(Number); }

  function yearSeries(city, year, end) {
    var out = [], n = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
    for (var i = 0; i < n; i++) {
      var dt = new Date(Date.UTC(year, 0, 1 + i));
      var y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
      var r = day(city, y, m, d);
      out.push({ y: y, m: m, d: d, dow: dt.getUTCDay(), off: r.off, v: after(r.sunset, end), sunset: r.sunset });
    }
    return out;
  }

  function render() {
    var city = cityById(selCity.value), end = endMin(), p = ymd();
    var r = day(city, p[0], p[1], p[2]);
    var a = after(r.sunset, end), u = after(r.dusk, end);
    $("dl-headline").textContent = dur(a) + " of daylight after a " + clock(end) + " end time";
    $("dl-detail").textContent = r.sunset == null ? "No sunset on this date at this latitude." :
      city.name + ", " + label(p[0], p[1], p[2]) + ". Sunset at " + clock(r.sunset) +
      (r.dusk != null ? ", civil twilight ends at " + clock(r.dusk) + ", so about " + dur(u) + " of usable light." : ".") +
      (a === 0 ? " The sun is down before school lets out." : "");

    var s = yearSeries(city, p[0], end);
    chart(s, city, end, p);
    table(end, p);
    var params = new URLSearchParams();
    params.set("city", selCity.value === "here" ? "redmond-wa" : selCity.value);
    params.set("time", selTime.value);
    if (inDate.value !== todayIn(city.tz)) params.set("date", inDate.value);
    if (selCity.value !== "here") history.replaceState(null, "", "?" + params.toString());
  }

  function chart(s, city, end, p) {
    var W = 720, H = 280, L = 44, Rt = 10, T = 14, B = 30;
    var max = 60 * Math.max(1, Math.ceil(Math.max.apply(null, s.map(function (x) { return x.v; })) / 60));
    var X = function (i) { return L + i * (W - L - Rt) / (s.length - 1); };
    var Y = function (v) { return T + (H - T - B) * (1 - v / max); };
    var svg = '<title id="dl-chart-title">Daylight after school through ' + p[0] + '</title><desc id="dl-chart-desc"></desc>';
    for (var g = 0; g <= max; g += 60) {
      svg += '<line class="grid" x1="' + L + '" x2="' + (W - Rt) + '" y1="' + Y(g) + '" y2="' + Y(g) + '"/>' +
        '<text class="tick" x="' + (L - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end">' + (g / 60) + ' h</text>';
    }
    s.forEach(function (x, i) { if (x.d === 1) svg += '<text class="tick" x="' + (X(i) + 2) + '" y="' + (H - 10) + '">' + MONTHS[x.m - 1] + '</text>'; });
    var d = "M" + X(0) + " " + Y(0);
    s.forEach(function (x, i) { d += "L" + X(i).toFixed(1) + " " + Y(x.v).toFixed(1); });
    d += "L" + X(s.length - 1) + " " + Y(0) + "Z";
    svg += '<path class="area" d="' + d + '"/>';
    var findings = [];
    for (var i = 1; i < s.length; i++) if (s[i].off !== s[i - 1].off) {
      var diff = Math.round(s[i].v - s[i - 1].v);
      svg += '<line class="dst" x1="' + X(i) + '" x2="' + X(i) + '" y1="' + T + '" y2="' + (H - B) + '"/>' +
        '<text class="tick dst-label" x="' + (X(i) + 4) + '" y="' + (T + 10) + '">DST</text>';
      findings.push("On " + label(s[i].y, s[i].m, s[i].d) + " the clocks change and daylight after school " +
        (diff >= 0 ? "jumps by " + dur(diff) : "drops by " + dur(-diff)) + " overnight.");
    }
    var ti = s.findIndex(function (x) { return x.m === p[1] && x.d === p[2]; });
    if (ti >= 0) svg += '<circle class="today" cx="' + X(ti) + '" cy="' + Y(s[ti].v) + '" r="5"/>';
    // Darkest and brightest 7-day stretch.
    var lo = Infinity, hi = -1, li = 0, hiI = 0;
    for (var k = 0; k + 7 <= s.length; k++) {
      var sum = 0; for (var j = k; j < k + 7; j++) sum += s[j].v;
      if (sum < lo) { lo = sum; li = k; } if (sum > hi) { hi = sum; hiI = k; }
    }
    var wk = function (k) { return label(s[k].y, s[k].m, s[k].d) + " to " + label(s[k + 6].y, s[k + 6].m, s[k + 6].d); };
    findings.unshift("Darkest week: " + wk(li) + ", about " + dur(lo / 7) + " a day. Brightest week: " + wk(hiI) + ", about " + dur(hi / 7) + " a day.");
    var el = $("dl-chart");
    el.innerHTML = svg;
    var summary = "Chart of minutes of daylight after a " + clock(end) + " end time in " + city.name + " for every day of " + p[0] + ". " + findings.join(" ");
    el.querySelector("desc").textContent = summary;
    $("dl-findings").innerHTML = findings.map(function (f) { return "<li>" + f + "</li>"; }).join("");
  }

  var sortKey = "today", sortDir = -1;
  function table(end, p) {
    var rows = CITIES.map(function (c) {
      var r = day(c, p[0], p[1], p[2]);
      var s = yearSeries(c, p[0], end), tot = 0, wd = 0;
      s.forEach(function (x) { tot += x.v; if (x.dow > 0 && x.dow < 6) wd += x.v; });
      return { c: c, today: after(r.sunset, end), sunset: r.sunset, avg: tot / s.length, hours: wd / 60 };
    });
    rows.sort(function (a, b) {
      if (sortKey === "name") return sortDir * (a.c.name < b.c.name ? -1 : 1);
      return sortDir * (a[sortKey] - b[sortKey]) || (a.c.name < b.c.name ? -1 : 1);
    });
    $("dl-table-caption").textContent = "Daylight after a " + clock(end) + " end time on " + label(p[0], p[1], p[2]) + ", and across all of " + p[0] + ".";
    $("dl-tbody").innerHTML = rows.map(function (r, i) {
      var me = r.c.id === selCity.value ? ' class="is-current"' : "";
      return "<tr" + me + "><td>" + (i + 1) + "</td><th scope=\"row\">" + r.c.name + "</th><td>" + (r.sunset == null ? "" : clock(r.sunset)) +
        "</td><td>" + dur(r.today) + "</td><td>" + dur(r.avg) + "</td><td>" + Math.round(r.hours) + " h</td></tr>";
    }).join("");
    document.querySelectorAll("#dl-table th[data-sort]").forEach(function (th) {
      th.setAttribute("aria-sort", th.getAttribute("data-sort") === sortKey ? (sortDir > 0 ? "ascending" : "descending") : "none");
    });
  }
  document.querySelectorAll("#dl-table th[data-sort] button").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.parentNode.getAttribute("data-sort");
      if (k === sortKey) sortDir = -sortDir; else { sortKey = k; sortDir = k === "name" ? 1 : -1; }
      render();
    });
  });

  if (geoBtn && navigator.geolocation) {
    geoBtn.hidden = false;
    geoBtn.addEventListener("click", function () {
      geoStatus.textContent = "Asking for your location...";
      navigator.geolocation.getCurrentPosition(function (pos) {
        myLoc = { id: "here", name: "Your location", lat: pos.coords.latitude, lon: pos.coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles" };
        var o = selCity.querySelector('option[value="here"]');
        if (!o) { o = document.createElement("option"); o.value = "here"; o.textContent = "Your location"; selCity.insertBefore(o, selCity.firstChild); }
        selCity.value = "here";
        geoStatus.textContent = "Using your location (" + myLoc.lat.toFixed(2) + ", " + myLoc.lon.toFixed(2) + ", " + myLoc.tz + "). It stays in your browser.";
        render();
      }, function () { geoStatus.textContent = "We could not get your location, so pick a city instead."; }, { timeout: 10000 });
    });
  }
  form.addEventListener("change", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
  render();
})(this);
