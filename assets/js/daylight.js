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
  var selCity = $("dl-city"), selTime = $("dl-time"), inDate = $("dl-date");
  if (!selCity) return;
  var geoBtn = $("dl-geo"), geoStatus = $("dl-geo-status");
  var SVGNS = "http://www.w3.org/2000/svg";
  var myLoc = null, series = [], drawn = false;
  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function clock(min) {
    min = Math.round(min); var h = Math.floor(min / 60) % 24, mm = ((min % 60) + 60) % 60;
    return ((h + 11) % 12 + 1) + ":" + pad(mm) + (h < 12 ? " AM" : " PM");
  }
  function dur(min) {
    min = Math.max(0, Math.round(min));
    var h = Math.floor(min / 60), m = min % 60;
    return h ? (m ? h + " h " + m + " min" : h + " h") : m + " min";
  }
  function after(v, end) { return v == null ? 0 : Math.max(0, v - end); }
  function todayIn(tz) {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = +x.value; });
    return p.year + "-" + pad(p.month) + "-" + pad(p.day);
  }
  function label(m, d) { return MONTHS[m - 1] + " " + d; }

  CITIES.forEach(function (c) { var o = document.createElement("option"); o.value = c.id; o.textContent = c.name; selCity.appendChild(o); });
  for (var t = 13 * 60 + 30; t <= 16 * 60 + 30; t += 15) {
    var o = document.createElement("option"); o.value = pad(Math.floor(t / 60)) + pad(t % 60); o.textContent = clock(t); selTime.appendChild(o);
  }
  var q = new URLSearchParams(location.search);
  selCity.value = CITIES.some(function (c) { return c.id === q.get("city"); }) ? q.get("city") : "redmond-wa";
  selTime.value = selTime.querySelector('option[value="' + (q.get("time") || "").replace(/\D/g, "") + '"]') ? q.get("time") : "1500";
  inDate.value = /^\d{4}-\d\d-\d\d$/.test(q.get("date") || "") ? q.get("date") : todayIn(cityById(selCity.value).tz);

  function cityById(id) {
    if (id === "here" && myLoc) return myLoc;
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].id === id) return CITIES[i];
    return CITIES[0];
  }
  function endMin() { var v = selTime.value; return +v.slice(0, 2) * 60 + +v.slice(2); }
  function ymd() { var p = inDate.value.split("-").map(Number); return p.length === 3 && p[0] ? p : todayIn("America/Los_Angeles").split("-").map(Number); }
  function fit(el) { // size an inline select to its chosen text
    var s = document.createElement("span"); s.className = "dl-measure"; s.textContent = el.options ? el.options[el.selectedIndex].text : el.value;
    document.body.appendChild(s); el.style.width = (s.offsetWidth + 22) + "px"; s.remove();
  }

  // Sunset by day, cached per place and range. Days run from a UTC start.
  var cache = {};
  function days(city, y0, m0, d0, n) {
    var key = city.id + city.lat + "|" + y0 + "-" + m0 + "-" + d0 + "|" + n;
    if (cache[key]) return cache[key];
    var out = [];
    for (var i = 0; i < n; i++) {
      var dt = new Date(Date.UTC(y0, m0 - 1, d0 + i));
      var y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate(), r = day(city, y, m, d);
      out.push({ y: y, m: m, d: d, dow: dt.getUTCDay(), off: r.off, sunset: r.sunset });
    }
    return (cache[key] = out);
  }
  function yearDays(city, y) { return days(city, y, 1, 1, ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365); }
  function schoolYear(p) { var s = p[1] >= 7 ? p[0] : p[0] - 1; return [s, (Date.UTC(s + 1, 5, 15) - Date.UTC(s, 8, 1)) / 864e5 + 1]; }

  /* Hero: a sky from the bell to well past dusk. */
  function hero(city, end, p) {
    var r = day(city, p[0], p[1], p[2]);
    var a = after(r.sunset, end), u = after(r.dusk, end);
    $("dl-big").textContent = dur(a);
    $("dl-big-sub").textContent = a > 0 ? "of daylight after a " + clock(end) + " bell" : "of daylight. The sun sets before the " + clock(end) + " bell";
    $("dl-usable").textContent = r.dusk != null && u > a ? "Plus " + dur(u - a) + " of soft twilight, " + dur(u) + " of usable light in all." : "";
    var start = end, stop = Math.max(r.dusk || end, end + 60) + 40, span = stop - start;
    var pct = function (v) { return Math.max(0, Math.min(100, (v - start) / span * 100)); };
    var sp = pct(r.sunset), dp = pct(r.dusk);
    var sky = $("dl-sky");
    sky.style.setProperty("--sun", sp + "%");
    sky.style.background = "linear-gradient(90deg," +
      (sp > 0 ? "var(--sky-day) 0%,var(--sky-noon) " + Math.max(0, sp * 0.45) + "%,var(--sky-gold) " + Math.max(0, sp - 14) + "%," : "") +
      "var(--sky-set) " + sp + "%,var(--sky-dusk) " + dp + "%,var(--sky-night) " + Math.min(100, dp + 14) + "%,var(--sky-night) 100%)";
    var marks = [[0, clock(end), "School ends"], [sp, clock(r.sunset), "Sunset"], [dp, clock(r.dusk), "Civil dusk"]];
    $("dl-sky-marks").innerHTML = marks.map(function (m, i) {
      return '<li style="--at:' + m[0] + '%" class="m' + i + (i === 1 && sp < 12 ? " near-start" : "") + (i > 0 && dp - sp < 26 ? " pair" : "") + '"><span>' + m[2] + "</span>" + m[1] + "</li>";
    }).join("");
    $("dl-sun").hidden = r.sunset == null;
    $("dl-sky-label").textContent = city.name + " on " + LONG[p[1] - 1] + " " + p[2] + ", " + p[0] + ": school ends at " + clock(end) +
      ", sunset at " + clock(r.sunset) + ", civil twilight ends at " + clock(r.dusk) + ".";
  }

  /* The daylight river. */
  var W = 760, H = 310, L = 40, RT = 12, T = 44, B = 34;
  function chart(city, end, p) {
    var svgEl = $("dl-chart"), cw = svgEl.clientWidth || 760;
    W = Math.round(Math.max(340, Math.min(760, cw))); H = W < 520 ? 260 : 310;
    svgEl.setAttribute("viewBox", "0 0 " + W + " " + H);
    var s = yearDays(city, p[0]).map(function (x) { return { y: x.y, m: x.m, d: x.d, off: x.off, sunset: x.sunset, v: after(x.sunset, end) }; });
    series = s;
    var max = 60 * Math.max(2, Math.ceil(Math.max.apply(null, s.map(function (x) { return x.v; })) / 60));
    var X = function (i) { return L + i * (W - L - RT) / (s.length - 1); };
    var Y = function (v) { return T + (H - T - B) * (1 - v / max); };
    chart.X = X; chart.Y = Y;
    var g = "";
    for (var h = 60; h <= max; h += 60) g += '<line class="hgrid" x1="' + L + '" x2="' + (W - RT) + '" y1="' + Y(h) + '" y2="' + Y(h) + '"/><text class="tick" x="' + (L - 8) + '" y="' + (Y(h) + 4) + '" text-anchor="end">' + h / 60 + " h</text>";
    s.forEach(function (x, i) { if (x.d === 1) g += '<line class="vgrid" x1="' + X(i) + '" x2="' + X(i) + '" y1="' + T + '" y2="' + (H - B) + '"/><text class="tick" x="' + (X(i) + (W < 520 ? 9 : 13)) + '" y="' + (H - 12) + '" text-anchor="middle">' + (W < 520 ? MONTHS[x.m - 1][0] : MONTHS[x.m - 1]) + "</text>"; });
    var line = "";
    s.forEach(function (x, i) { line += (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(x.v).toFixed(1); });
    var area = line + "L" + X(s.length - 1) + " " + Y(0) + "L" + X(0) + " " + Y(0) + "Z";
    var notes = [], ann = "";
    for (var i = 1; i < s.length; i++) if (s[i].off !== s[i - 1].off) {
      var jump = s[i].off - s[i - 1].off, diff = Math.round(s[i].v - s[i - 1].v), fwd = jump > 0;
      var x = X(i), yTop = Y(Math.max(s[i].v, s[i - 1].v));
      var txt = W < 520 ? (fwd ? "spring forward +1 h" : "fall back \u22121 h") : (fwd ? "clocks spring forward: +1 h" : "clocks fall back: \u22121 h");
      var anchor = fwd ? "start" : "end", dx = anchor === "end" ? -8 : 8;
      ann += '<line class="dst" x1="' + x + '" x2="' + x + '" y1="' + (T - 12) + '" y2="' + Y(0) + '"/><text class="note" x="' + (x + dx) + '" y="' + (T - 14) + '" text-anchor="' + anchor + '">' + txt + "</text>";
      notes.push("On " + label(s[i].m, s[i].d) + " the " + (fwd ? "clocks spring forward and daylight after school jumps " : "clocks fall back and daylight after school drops ") + dur(Math.abs(diff)) + " from the day before.");
    }
    var ti = s.findIndex(function (x) { return x.m === p[1] && x.d === p[2]; });
    var lo = Infinity, hi = -1, li = 0, hiI = 0;
    for (var k = 0; k + 7 <= s.length; k++) {
      var sum = 0; for (var j = k; j < k + 7; j++) sum += s[j].v;
      if (sum < lo) { lo = sum; li = k; } if (sum > hi) { hi = sum; hiI = k; }
    }
    var wk = function (k) { return label(s[k].m, s[k].d) + " to " + label(s[k + 6].m, s[k + 6].d); };
    var svg = $("dl-chart");
    svg.innerHTML = '<title id="dl-chart-title"></title><desc id="dl-chart-desc"></desc>' +
      '<defs><linearGradient id="dl-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="f0"/><stop offset="1" class="f1"/></linearGradient>' +
      '<filter id="dl-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter>' +
      '<clipPath id="dl-clip"><rect id="dl-clip-rect" x="0" y="0" height="' + H + '" width="' + (drawn ? W : 0) + '"/></clipPath></defs>' +
      g + '<g clip-path="url(#dl-clip)"><path class="area" d="' + area + '"/><path class="line" d="' + line + '"/></g>' + ann +
      (ti >= 0 ? '<circle class="glow" cx="' + X(ti) + '" cy="' + Y(s[ti].v) + '" r="9" filter="url(#dl-glow)"/><circle class="today" cx="' + X(ti) + '" cy="' + Y(s[ti].v) + '" r="4.5"/>' +
        '<text class="note today-note" x="' + X(ti) + '" y="' + (Y(s[ti].v) + 24) + '" text-anchor="middle">' + label(p[1], p[2]) + "</text>" : "") +
      '<g id="dl-hover" class="hover" visibility="hidden"><line id="dl-hl" y1="' + T + '" y2="' + Y(0) + '"/><circle id="dl-hc" r="4"/></g>';
    if (!drawn) requestAnimationFrame(function () { requestAnimationFrame(function () { var r = $("dl-clip-rect"); r.style.transition = "width 1.4s cubic-bezier(.3,.7,.2,1)"; r.setAttribute("width", W); drawn = true; }); });
    var findings = ["The darkest week is " + wk(li) + ", with about " + dur(lo / 7) + " a day. The brightest is " + wk(hiI) + ", with about " + dur(hi / 7) + " a day."].concat(notes);
    svg.querySelector("title").textContent = "Daylight after a " + clock(end) + " end time in " + city.name + ", every day of " + p[0];
    svg.querySelector("desc").textContent = findings.join(" ");
    $("dl-findings").innerHTML = findings.map(function (f) { return "<li>" + f + "</li>"; }).join("");
    $("dl-chart-city").textContent = city.name;
    hover(ti >= 0 ? ti : 0, false);
  }
  function hover(i, show) {
    var s = series; if (!s.length) return;
    i = Math.max(0, Math.min(s.length - 1, i)); hover.i = i;
    var x = chart.X(i), y = chart.Y(s[i].v), g = $("dl-hover");
    $("dl-hl").setAttribute("x1", x); $("dl-hl").setAttribute("x2", x);
    $("dl-hc").setAttribute("cx", x); $("dl-hc").setAttribute("cy", y);
    g.setAttribute("visibility", show ? "visible" : "hidden");
    var tip = $("dl-tip");
    tip.innerHTML = "<strong>" + dur(s[i].v) + "</strong> " + LONG[s[i].m - 1] + " " + s[i].d + ", sunset " + clock(s[i].sunset);
    tip.style.left = (x / W * 100) + "%";
    tip.classList.toggle("is-right", x > W * 0.7); tip.classList.toggle("is-left", x < W * 0.3);
    tip.hidden = !show;
  }
  (function () {
    var svg = $("dl-chart");
    function at(e) { var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; return Math.round((x - L) / (W - L - RT) * (series.length - 1)); }
    svg.addEventListener("pointermove", function (e) { hover(at(e), true); });
    svg.addEventListener("pointerdown", function (e) { hover(at(e), true); });
    svg.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") hover(hover.i, false); });
    svg.addEventListener("focus", function () { hover(hover.i, true); });
    svg.addEventListener("blur", function () { hover(hover.i, false); });
    svg.addEventListener("keydown", function (e) {
      var step = { ArrowRight: 1, ArrowLeft: -1, PageUp: 7, PageDown: -7, ArrowUp: 7, ArrowDown: -7 }[e.key];
      if (e.key === "Home") step = -999; if (e.key === "End") step = 999;
      if (!step) return; e.preventDefault(); hover(hover.i + step, true);
    });
  })();

  /* Cities: small multiples of horizontal bars, plus a real table. */
  var metric = "day", showAll = false, rows = [];
  var METRICS = {
    day: { lab: "That day", fmt: function (r) { return dur(r.day); } },
    avg: { lab: "Year average", fmt: function (r) { return dur(r.avg) + " a day"; } },
    school: { lab: "School year", fmt: function (r) { return Math.round(r.school) + " h"; } }
  };
  function computeRows(end, p) {
    var sy = schoolYear(p);
    rows = CITIES.map(function (c) {
      var r = day(c, p[0], p[1], p[2]), yr = yearDays(c, p[0]), tot = 0, sch = 0;
      yr.forEach(function (x) { tot += after(x.sunset, end); });
      days(c, sy[0], 9, 1, sy[1]).forEach(function (x) { if (x.dow > 0 && x.dow < 6) sch += after(x.sunset, end); });
      return { c: c, sunset: r.sunset, day: after(r.sunset, end), avg: tot / yr.length, school: sch / 60 };
    });
    rows.sy = sy[0];
  }
  function bars() {
    var key = metric, list = rows.slice().sort(function (a, b) { return b[key] - a[key] || (a.c.name < b.c.name ? -1 : 1); });
    var max = Math.max.apply(null, list.map(function (r) { return r[key]; })) || 1, cur = selCity.value;
    var html = "", prev = -1;
    list.forEach(function (r, i) {
      if (!(showAll || i < 10 || i >= list.length - 10 || r.c.id === cur)) return;
      if (prev >= 0 && i !== prev + 1) html += '<li class="dl-gap" aria-hidden="true"></li>';
      prev = i;
      html += '<li class="dl-bar' + (r.c.id === cur ? " is-current" : "") + '"><span class="dl-rank">' + (i + 1) + '</span><span class="dl-name">' + r.c.name +
        '</span><span class="dl-track"><span class="dl-fill" style="width:' + (r[key] / max * 100).toFixed(1) + '%"></span></span><span class="dl-val">' + METRICS[key].fmt(r) + "</span></li>";
    });
    $("dl-bars").innerHTML = html;
    $("dl-more").textContent = showAll ? "Show the top and bottom ten" : "Show all " + list.length + " cities";
    $("dl-more").setAttribute("aria-expanded", showAll);
    document.querySelectorAll("[data-metric]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-metric") === metric); });
    var p = ymd();
    $("dl-metric-note").textContent = key === "day" ? "Daylight after the bell on " + LONG[p[1] - 1] + " " + p[2] + "." :
      key === "avg" ? "The average day across all of " + p[0] + "." : "Hours of daylight after the bell on school weekdays, September 1, " + rows.sy + " to June 15, " + (rows.sy + 1) + ".";
    $("dl-tbody").innerHTML = list.map(function (r, i) {
      return "<tr><td>" + (i + 1) + '</td><th scope="row">' + r.c.name + "</th><td>" + clock(r.sunset) + "</td><td>" + dur(r.day) + "</td><td>" + dur(r.avg) + "</td><td>" + Math.round(r.school) + " h</td></tr>";
    }).join("");
    $("dl-table-caption").textContent = "Cities ranked by " + METRICS[key].lab.toLowerCase() + ", school ending at " + clock(endMin()) + ".";
  }
  document.querySelectorAll("[data-metric]").forEach(function (b) { b.addEventListener("click", function () { metric = b.getAttribute("data-metric"); bars(); }); });
  $("dl-more").addEventListener("click", function () { showAll = !showAll; bars(); });

  function render() {
    var city = cityById(selCity.value), end = endMin(), p = ymd();
    [selCity, selTime].forEach(fit);
    hero(city, end, p); chart(city, end, p); computeRows(end, p); bars();
    var params = new URLSearchParams();
    params.set("city", selCity.value === "here" ? "redmond-wa" : selCity.value);
    params.set("time", selTime.value);
    if (inDate.value !== todayIn(city.tz)) params.set("date", inDate.value);
    if (selCity.value !== "here") {
      history.replaceState(null, "", "?" + params.toString());
      var sh = document.querySelector(".post-share"); if (sh) sh.setAttribute("data-url", location.href);
    }
  }

  if (geoBtn && navigator.geolocation) {
    geoBtn.hidden = false;
    geoBtn.addEventListener("click", function () {
      geoStatus.textContent = "Asking for your location...";
      navigator.geolocation.getCurrentPosition(function (pos) {
        myLoc = { id: "here", name: "your location", lat: pos.coords.latitude, lon: pos.coords.longitude,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles" };
        var o = selCity.querySelector('option[value="here"]');
        if (!o) { o = document.createElement("option"); o.value = "here"; o.textContent = "your location"; selCity.insertBefore(o, selCity.firstChild); }
        selCity.value = "here";
        geoStatus.textContent = "Using " + myLoc.lat.toFixed(2) + ", " + myLoc.lon.toFixed(2) + " in " + myLoc.tz + ". It stays in your browser.";
        render();
      }, function () { geoStatus.textContent = "We could not get your location, so pick a city instead."; }, { timeout: 10000 });
    });
  }
  [selCity, selTime, inDate].forEach(function (el) { el.addEventListener("change", render); });
  var rz = 0, lastW = 0;
  addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { var w = $("dl-chart").clientWidth; if (Math.abs(w - lastW) > 30) { lastW = w; chart(cityById(selCity.value), endMin(), ymd()); } }, 150); });

  var cite = $("dl-cite-copy");
  if (cite) cite.addEventListener("click", function () {
    var text = $("dl-cite-text").textContent.trim();
    var done = function () { cite.textContent = "Copied"; setTimeout(function () { cite.textContent = "Copy"; }, 2000); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {}); 
  });
  render();
})(this);
