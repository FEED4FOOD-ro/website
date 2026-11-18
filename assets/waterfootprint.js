/* FEED4FOOD România — calculator de amprentă de apă a culturilor („în stilul” amprentei de carbon).
   Metoda: necesarul de apă al culturii ETc = Kc × ET0 (FAO-56, Allen et al. 1998), apa verde / albastră / cenușie după
   Manualul Water Footprint Network (Hoekstra et al. 2011). Datele de intrare vin din assets/dashboard/wf.json
   (clima: Open-Meteo, medii 1991–2020; randamente: INS TEMPO). Rezultatele sunt orientative. */
(function () {
  'use strict';
  const root = document.getElementById('wf');
  if (!root) return;
  const BASE = new URL('dashboard/', document.currentScript.src);
  const EN = document.documentElement.lang === 'en';
  const lg = EN ? 'en' : 'ro', loc = EN ? 'en-US' : 'ro-RO';
  const $ = s => root.querySelector(s);
  const fmt = (n, d) => n == null || isNaN(n) ? '–' : n.toLocaleString(loc, { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: 0 });
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));

  /* FAO-56 Tabelul 12 (Kc ini / mid / end) și Tabelul 11 (durata fazelor, zile: inițială, dezvoltare, mijloc, final).
     Alegeri: tomate (Mediterana, aprilie–mai), cartof (climat continental, mai), ardei (Europa), ceapă uscată (Mediterana),
     floarea-soarelui (Mediterana), grâu de toamnă (sol înghețat, Mediterana), porumb (Spania) etc.; unde FAO dă un interval
     (Kc end) se folosește mijlocul lui. start = [lună, zi] implicit; n = azot (kg N/ha), valoare ilustrativă. */
  const CROPS = {
    wheat:     { ro: 'Grâu de toamnă', en: 'Winter wheat', kc: [0.40, 1.15, 0.30], L: [30, 140, 40, 30], start: [10, 15], n: 120 },
    maize:     { ro: 'Porumb boabe', en: 'Grain maize', kc: [0.30, 1.20, 0.45], L: [30, 40, 50, 30], start: [4, 25], n: 130 },
    sunflower: { ro: 'Floarea-soarelui', en: 'Sunflower', kc: [0.35, 1.075, 0.35], L: [25, 35, 45, 25], start: [4, 20], n: 60 },
    potato:    { ro: 'Cartof', en: 'Potato', kc: [0.50, 1.15, 0.75], L: [25, 30, 45, 30], start: [5, 1], n: 130 },
    tomato:    { ro: 'Roșii', en: 'Tomato', kc: [0.60, 1.15, 0.80], L: [30, 40, 45, 30], start: [5, 1], n: 150 },
    onion:     { ro: 'Ceapă uscată', en: 'Dry onion', kc: [0.70, 1.05, 0.75], L: [15, 25, 70, 40], start: [4, 1], n: 100 },
    cabbage:   { ro: 'Varză albă', en: 'White cabbage', kc: [0.70, 1.05, 0.95], L: [40, 60, 50, 15], start: [5, 15], n: 150 },
    pepper:    { ro: 'Ardei', en: 'Sweet pepper', kc: [0.60, 1.05, 0.90], L: [30, 35, 40, 20], start: [5, 10], n: 130 }
  };
  const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const MONTHS = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                    : ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const MS = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ALPHA = 0.1, CMAX = 0.010;   /* fracție de azot pierdută 10%; concentrație maximă admisă 10 mg N/L = 0,010 kg/m³; fond natural 0 */
  const T = EN
    ? { green: 'Green', blue: 'Blue', grey: 'Grey', total: 'Total', perKg: 'L per kg', perHa: 'm³ per ha', season: 'Growing season', days: 'days',
        et: 'Crop water need (ETc)', pe: 'Effective rain', month: 'Month', sheet: 'Water footprint', cmp: 'Water footprint per kg, all crops', file: 'water-footprint',
        yieldHint: 'INS Bucharest–Ilfov average, ', yieldRef: 'Romanian reference (INS Bucharest–Ilfov, ', yieldRef2: '): enter your local yield', yieldNone: 'No INS value; enter your own yield', mm: 'mm', crop: 'Crop', loc: 'Region', irr: 'Irrigated', rain: 'Rain-fed',
        each: 'About', per100: 'per 100 g', dry: 'Rain does not cover the crop water need: rain-fed yields here would be water-limited.' }
    : { green: 'Verde', blue: 'Albastră', grey: 'Cenușie', total: 'Total', perKg: 'L pe kg', perHa: 'm³ pe ha', season: 'Sezonul de vegetație', days: 'zile',
        et: 'Necesar de apă al culturii (ETc)', pe: 'Ploaie efectivă', month: 'Luna', sheet: 'Amprenta de apă', cmp: 'Amprenta de apă pe kg, toate culturile', file: 'amprenta-de-apa',
        yieldHint: 'Media INS București–Ilfov, ', yieldRef: 'Referință din România (INS București–Ilfov, ', yieldRef2: '): introdu randamentul local', yieldNone: 'Nu există valoare INS; introdu randamentul tău', mm: 'mm', crop: 'Cultura', loc: 'Regiunea', irr: 'Irigat', rain: 'Neirigat',
        each: 'Aproximativ', per100: 'la 100 g', dry: 'Ploaia nu acoperă necesarul de apă al culturii: fără irigare, randamentele de aici ar fi limitate de apă.' };

  /* ploaie efectivă lunară, metoda USDA SCS (folosită și de CROPWAT) */
  const peff = p => p <= 250 ? p * (125 - 0.2 * p) / 125 : 125 + 0.1 * p;

  /* Calculează amprenta unei culturi. Returnează valori pe lună și totaluri.
     o = { loc: {et0:[12], p:[12]}, crop, start:[lună, zi], irrigated, yieldT (t/ha), n (kg N/ha) } */
  function compute(o) {
    const c = CROPS[o.crop], tot = c.L[0] + c.L[1] + c.L[2] + c.L[3];
    const et = Array(12).fill(0), days = Array(12).fill(0);
    let m = o.start[0] - 1, d = o.start[1] - 1;
    for (let i = 0; i < tot; i++) {
      let kc;
      if (i < c.L[0]) kc = c.kc[0];
      else if (i < c.L[0] + c.L[1]) kc = c.kc[0] + (c.kc[1] - c.kc[0]) * (i - c.L[0]) / c.L[1];
      else if (i < c.L[0] + c.L[1] + c.L[2]) kc = c.kc[1];
      else kc = c.kc[1] + (c.kc[2] - c.kc[1]) * (i - c.L[0] - c.L[1] - c.L[2]) / c.L[3];
      et[m] += kc * o.loc.et0[m] / DIM[m];
      days[m]++;
      if (++d >= DIM[m]) { d = 0; m = (m + 1) % 12; }
    }
    const pe = [], green = [], blue = [];
    for (let k = 0; k < 12; k++) {
      const share = days[k] / DIM[k];
      pe.push(peff(o.loc.p[k]) * share);
      const g = Math.min(et[k], pe[k]);
      green.push(g);
      blue.push(o.irrigated ? et[k] - g : 0);
    }
    const sum = a => a.reduce((x, y) => x + y, 0);
    const cwuG = 10 * sum(green), cwuB = 10 * sum(blue);         /* m³/ha */
    const cwuY = ALPHA * o.n / CMAX;                            /* apa cenușie, m³/ha */
    const Y = o.yieldT;
    return { et, pe, green, blue, days, etTotal: sum(et), peTotal: sum(pe), cwu: { green: cwuG, blue: cwuB, grey: cwuY },
      wf: { green: cwuG / Y, blue: cwuB / Y, grey: cwuY / Y, total: (cwuG + cwuB + cwuY) / Y }, length: tot };
  }
  window.F4FWF = { compute, CROPS, peff };

  let D = null, last = null;
  const chartEls = { cmp: $('#wf-cmp'), mon: $('#wf-mon') };
  const charts = {};
  const chartOf = k => (window.echarts && chartEls[k].offsetWidth) ? (charts[k] || (charts[k] = echarts.init(chartEls[k]))) : null;
  const ff = () => getComputedStyle(document.body).fontFamily;
  const COLORS = { green: '#1f9d55', blue: '#1d4f9c', grey: '#8a949a' };
  const optn = (v, l) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; };
  const yieldOf = k => D.yields[k] ? D.yields[k].kg_ha / 1000 : null;

  function read() {
    const locObj = D.locations.find(l => l.id === $('#wf-loc').value), crop = $('#wf-crop').value;
    return { loc: locObj, crop, start: [Number($('#wf-month').value), Math.min(DIM[Number($('#wf-month').value) - 1], Math.max(1, Number($('#wf-day').value) || 1))],
      irrigated: $('#wf-irr').value === '1', yieldT: Number($('#wf-yield').value) || 0, n: Math.max(0, Number($('#wf-n').value) || 0) };
  }

  function setDefaults() {
    const k = $('#wf-crop').value, c = CROPS[k], y = yieldOf(k);
    $('#wf-month').value = c.start[0]; $('#wf-day').value = c.start[1];
    $('#wf-yield').value = y == null ? '' : Math.round(y * 10) / 10;
    $('#wf-n').value = c.n;
    hints();
  }

  /* explicații sub câmpuri: baza climei pentru țara aleasă și sursa randamentului implicit */
  function hints() {
    const l = D.locations.find(x => x.id === $('#wf-loc').value), k = $('#wf-crop').value, y = yieldOf(k);
    $('#wf-loc-hint').textContent = l ? l.basis[lg] : '';
    $('#wf-yield-hint').textContent = y == null ? T.yieldNone
      : (l && l.id !== 'romania' ? T.yieldRef + D.yields[k].years + ': ' + fmt(y, 1) + ' t/ha' + T.yieldRef2 : T.yieldHint + D.yields[k].years + ': ' + fmt(y, 1) + ' t/ha');
  }

  function render() {
    const o = read();
    if (!o.yieldT) { $('#wf-out').hidden = true; return; }
    $('#wf-out').hidden = false;
    const r = compute(o); last = { o, r };
    $('#wf-total').textContent = fmt(r.wf.total);
    $('#wf-g').textContent = fmt(r.wf.green); $('#wf-b').textContent = fmt(r.wf.blue); $('#wf-y').textContent = fmt(r.wf.grey);
    $('#wf-100').textContent = T.each + ' ' + fmt(r.wf.total / 10, 0) + ' L ' + T.per100;
    const end = new Date(2001, o.start[0] - 1, o.start[1] + r.length - 1);
    $('#wf-season').textContent = T.season + ': ' + o.start[1] + ' ' + MONTHS[o.start[0] - 1] + ' – ' + end.getDate() + ' ' + MONTHS[end.getMonth()] + ' (' + r.length + ' ' + T.days + ')';
    const dry = r.peTotal < r.etTotal;
    $('#wf-note').textContent = !o.irrigated && dry ? T.dry : '';
    $('#wf-note').hidden = !( !o.irrigated && dry);
    $('#wf-ha').textContent = T.perHa + ': ' + T.green.toLowerCase() + ' ' + fmt(r.cwu.green) + ' · ' + T.blue.toLowerCase() + ' ' + fmt(r.cwu.blue) + ' · ' + T.grey.toLowerCase() + ' ' + fmt(r.cwu.grey);

    /* monthly chart */
    const mon = chartOf('mon');
    const shown = r.days.map((d, i) => d ? i : -1).filter(i => i >= 0);
    const order = []; { let m = o.start[0] - 1; for (let i = 0; i < 13 && order.length < shown.length; i++) { if (r.days[m]) order.push(m); m = (m + 1) % 12; } }
    if (mon) mon.setOption({
      animationDuration: 400, textStyle: { fontFamily: ff() }, color: [COLORS.green, COLORS.blue],
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      legend: { top: 0, data: [T.green, T.blue, T.et], textStyle: { color: '#55686d', fontFamily: ff() } },
      tooltip: { trigger: 'axis', valueFormatter: v => fmt(v, 0) + ' ' + T.mm },
      xAxis: { type: 'category', data: order.map(i => MS[i]), axisLabel: { color: '#55686d' }, axisLine: { lineStyle: { color: '#dfe6e3' } } },
      yAxis: { type: 'value', name: T.mm, nameTextStyle: { color: '#55686d' }, axisLabel: { color: '#55686d' }, splitLine: { lineStyle: { color: '#dfe6e3' } } },
      series: [
        { name: T.green, type: 'bar', stack: 'w', data: order.map(i => Math.round(r.green[i])) },
        { name: T.blue, type: 'bar', stack: 'w', data: order.map(i => Math.round(r.blue[i])) },
        { name: T.et, type: 'line', data: order.map(i => Math.round(r.et[i])), color: '#d9730d', symbolSize: 6, lineStyle: { width: 2 } }
      ]
    }, true);

    /* comparison chart: every crop, same region and irrigation, default dates and N, regional yield */
    const keys = Object.keys(CROPS).filter(k => yieldOf(k) != null || k === o.crop);
    const rows = keys.map(k => {
      const sel = k === o.crop;
      const res = compute({ loc: o.loc, crop: k, start: sel ? o.start : CROPS[k].start, irrigated: o.irrigated, yieldT: sel ? o.yieldT : yieldOf(k), n: sel ? o.n : CROPS[k].n });
      return { k, name: CROPS[k][lg], wf: res.wf };
    }).sort((a, b) => a.wf.total - b.wf.total);
    const cmp = chartOf('cmp');
    if (cmp) cmp.setOption({
      animationDuration: 400, textStyle: { fontFamily: ff() }, color: [COLORS.green, COLORS.blue, COLORS.grey],
      grid: { left: 8, right: 24, top: 36, bottom: 8, containLabel: true },
      legend: { top: 0, data: [T.green, T.blue, T.grey], textStyle: { color: '#55686d', fontFamily: ff() } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => fmt(v, 0) + ' L/kg' },
      xAxis: { type: 'value', name: 'L/kg', nameTextStyle: { color: '#55686d' }, axisLabel: { color: '#55686d', formatter: v => v.toLocaleString(loc) }, splitLine: { lineStyle: { color: '#dfe6e3' } } },
      yAxis: { type: 'category', data: rows.map(r => r.name), axisLabel: { color: '#1b3a40', fontWeight: 600 }, axisLine: { lineStyle: { color: '#dfe6e3' } } },
      series: [['green', T.green], ['blue', T.blue], ['grey', T.grey]].map(([k, n]) => ({ name: n, type: 'bar', stack: 't', data: rows.map(r => Math.round(r.wf[k])), barMaxWidth: 26 }))
    }, true);
    $('#wf-cmp-title').textContent = T.cmp + ' · ' + o.loc[lg] + ' · ' + (o.irrigated ? T.irr : T.rain).toLowerCase();
    last.rows = rows;

    /* monthly table */
    $('#wf-table').innerHTML = '<thead><tr><th scope="col">' + T.month + '</th><th scope="col">' + T.et + '</th><th scope="col">' + T.pe + '</th><th scope="col">' + T.green + '</th><th scope="col">' + T.blue + '</th></tr></thead><tbody>'
      + order.map(i => '<tr><th scope="row">' + esc(MONTHS[i]) + '</th><td>' + fmt(r.et[i]) + '</td><td>' + fmt(r.pe[i]) + '</td><td>' + fmt(r.green[i]) + '</td><td>' + fmt(r.blue[i]) + '</td></tr>').join('') + '</tbody>';
  }

  function exportXlsx() {
    if (!last) return;
    const { o, r } = last;
    const rows = [[T.crop, CROPS[o.crop][lg]], [T.loc, o.loc[lg]], [EN ? 'Irrigation' : 'Irigare', o.irrigated ? T.irr : T.rain],
      [EN ? 'Planting date' : 'Data plantării', o.start[1] + '.' + o.start[0]], [EN ? 'Yield (t/ha)' : 'Randament (t/ha)', o.yieldT], [EN ? 'Nitrogen (kg N/ha)' : 'Azot (kg N/ha)', o.n], [],
      [T.total + ' (L/kg)', Math.round(r.wf.total)], [T.green + ' (L/kg)', Math.round(r.wf.green)], [T.blue + ' (L/kg)', Math.round(r.wf.blue)], [T.grey + ' (L/kg)', Math.round(r.wf.grey)], [],
      [T.month, T.et + ' (mm)', T.pe + ' (mm)', T.green + ' (mm)', T.blue + ' (mm)']];
    r.days.forEach((d, i) => { if (d) rows.push([MONTHS[i], Math.round(r.et[i]), Math.round(r.pe[i]), Math.round(r.green[i]), Math.round(r.blue[i])]); });
    rows.push([], [T.cmp, '', '', ''], [T.crop, T.green + ' (L/kg)', T.blue + ' (L/kg)', T.grey + ' (L/kg)', T.total + ' (L/kg)']);
    last.rows.forEach(x => rows.push([x.name, Math.round(x.wf.green), Math.round(x.wf.blue), Math.round(x.wf.grey), Math.round(x.wf.total)]));
    downloadBlob(makeXlsx(rows, { sheet: T.sheet, widths: [30, 22, 18, 18, 18] }), T.file + '-' + o.crop + '-' + o.loc.id + '.xlsx');
  }

  async function init() {
    if (D) { render(); return; }
    D = await (await fetch(new URL('wf.json', BASE))).json();
    $('#wf-loc').replaceChildren(...D.locations.map(l => optn(l.id, l[lg])));
    $('#wf-crop').replaceChildren(...Object.keys(CROPS).map(k => optn(k, CROPS[k][lg])));
    $('#wf-month').replaceChildren(...MONTHS.map((m, i) => optn(i + 1, m)));
    $('#wf-irr').replaceChildren(optn('1', T.irr), optn('0', T.rain));
    setDefaults();
    $('#wf-crop').addEventListener('change', () => { setDefaults(); render(); });
    ['#wf-loc', '#wf-month', '#wf-day', '#wf-irr', '#wf-yield', '#wf-n'].forEach(s => $(s).addEventListener('input', render));
    $('#wf-loc').addEventListener('input', hints);
    $('#wf-reset').addEventListener('click', () => { setDefaults(); render(); });
    $('#wf-xlsx').addEventListener('click', exportXlsx);
    render();
  }
  window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));
  const show = () => init().then(() => setTimeout(render, 0));
  window.addEventListener('f4f:tab', e => { if (e.detail === 'apa') show(); });
  if (!document.getElementById('p-apa').hidden) show();
})();
