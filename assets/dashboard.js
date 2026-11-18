/* FEED4FOOD România — pagina „Date”: registrul INS TEMPO (tabel + grafic pe ani) și seriile climatice ANM.
   Limba vine din <html lang>; datele se încarcă din assets/dashboard/ doar când sunt necesare. */
(function () {
  'use strict';
  const BASE = new URL('dashboard/', document.currentScript.src);
  const EN = document.documentElement.lang === 'en';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const loc = EN ? 'en-US' : 'ro-RO';
  const T = EN
    ? { none: 'No data for this selection.', year: 'Year', aria: 'Chart by year', period: 'Period', all: 'All stations', unit: 'UoM: ', uomShort: 'UoM: ', ext1: ' (1991–2020 extreme)', units: 'Units',
        indicator: 'indicator', indicators: 'indicators', cclim: 'Climate chart', rol: 'Values up to 2004 are in old lei (ROL). Since the July 2005 redenomination, values are in new lei (RON): 1 RON = 10,000 ROL.',
        regSheet: 'Registry', regFile: 'registry-feed4food', limit: 'EU annual limit value' }
    : { none: 'Nu există date pentru această selecție.', year: 'Anul', aria: 'Grafic pe ani', period: 'Perioada', all: 'Toate stațiile', unit: 'UM: ', uomShort: 'UM: ', ext1: ' (extremă 1991–2020)', units: 'Unități',
        indicator: 'indicator', indicators: 'indicatori', cclim: 'Grafic climatic', rol: 'Valorile până în 2004 sunt în lei vechi (ROL). După redenominarea din iulie 2005, valorile sunt în lei noi (RON): 1 RON = 10.000 ROL.',
        regSheet: 'Registru', regFile: 'registru-feed4food', limit: 'Valoare limită anuală UE' };
  const fmt = (n, d) => n == null ? '–' : n.toLocaleString(loc, { maximumFractionDigits: d == null ? 2 : d, minimumFractionDigits: d == null ? 0 : d });
  const compact = v => {
    const a = Math.abs(v), f = x => x.toLocaleString(loc, { maximumFractionDigits: 1 });
    if (a >= 1e9) return f(v / 1e9) + (EN ? ' bn' : ' mld.');
    if (a >= 1e6) return f(v / 1e6) + (EN ? ' M' : ' mil.');
    return f(v);
  };
  const PAL = ['#1d4f9c', '#1f9d55', '#d9730d'];
  const MUTED = '#55686d', LINE = '#dfe6e3';
  const fontFamily = () => getComputedStyle(document.body).fontFamily;
  const getJSON = async u => (await fetch(new URL(u, BASE))).json();
  const option = (v, label) => { const o = document.createElement('option'); o.value = v; o.textContent = label; return o; };
  const charts = {};
  function chartFor(id) {
    const el = document.getElementById(id);
    if (!window.echarts || !el.offsetWidth) return null;
    return charts[id] || (charts[id] = echarts.init(el));
  }
  window.addEventListener('resize', () => Object.values(charts).forEach(c => c.resize()));

  /* ---------- Tabs ---------- */
  const tabs = [...document.querySelectorAll('.dash-tabs [role="tab"]')];
  const hooks = {};
  function showTab(id, push) {
    tabs.forEach(t => {
      const on = t.id === 'tab-' + id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (push) { try { history.replaceState(null, '', id === 'agri' ? location.pathname : '#' + id); } catch (e) {} }
    if (hooks[id]) hooks[id]();
    window.dispatchEvent(new Event('resize'));
  }
  tabs.forEach(t => t.addEventListener('click', () => showTab(t.id.slice(4), true)));
  tabs.forEach((t, i) => t.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
  }));

  /* ---------- Registry table: search, filters, sorting ---------- */
  const regBody = $('#reg-table tbody');
  const regRows = [...regBody.rows];
  const regHeads = [...document.querySelectorAll('#reg-table thead th')];
  let sortCol = -1, sortDir = 1;
  const cellText = (r, i) => r.cells[i].textContent.replace(/\s+/g, ' ').trim();
  function applyRegistry() {
    const q = $('#reg-search').value.trim().toLowerCase(), cat = $('#reg-cat').value, av = $('#reg-av').value;
    let rows = regRows.filter(r =>
      (!q || (cellText(r, 0) + ' ' + cellText(r, 1)).toLowerCase().includes(q)) &&
      (!cat || cellText(r, 2) === cat) &&
      (!av || r.cells[6].dataset.filter === av));
    if (sortCol >= 0) {
      const num = sortCol === 5;
      rows = rows.slice().sort((a, b) => {
        const x = cellText(a, sortCol), y = cellText(b, sortCol);
        return sortDir * (num ? Number(x) - Number(y) : x.localeCompare(y, EN ? 'en' : 'ro', { numeric: true }));
      });
    }
    regBody.replaceChildren(...rows);
    if (!rows.length) {
      const tr = document.createElement('tr'); tr.className = 'dash-empty';
      tr.innerHTML = '<td colspan="7">' + esc(T.none) + '</td>'; regBody.append(tr);
    }
    $('#reg-count').textContent = rows.length + ' ' + (rows.length === 1 ? T.indicator : T.indicators);
    regHeads.forEach((h, i) => h.setAttribute('aria-sort', i === sortCol ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'));
  }
  ['#reg-search', '#reg-cat', '#reg-av'].forEach(s => $(s).addEventListener('input', applyRegistry));
  regHeads.forEach((h, i) => { const b = h.querySelector('.th-sort'); if (b) b.addEventListener('click', () => { sortDir = sortCol === i ? -sortDir : 1; sortCol = i; applyRegistry(); }); });
  applyRegistry();

  $('#reg-xlsx').addEventListener('click', () => {
    const rows = [regHeads.map(h => h.textContent.trim())];
    [...regBody.rows].filter(r => r.cells.length > 1).forEach(r => rows.push([...r.cells].map((c, i) =>
      i === 6 ? (c.dataset.filter === 'yes' ? (EN ? 'Available' : 'Disponibil') : (EN ? 'No data' : 'Fără date')) : i === 5 ? Number(cellText(r, i)) : cellText(r, i))));
    downloadBlob(makeXlsx(rows, { sheet: T.regSheet, widths: [12, 90, 28, 44, 12, 8, 14] }), T.regFile + '.xlsx');
  });

  /* ---------- Registry detail panel (chart + table by year) ---------- */
  const PLACES = { 'BUCURESTI': 'București', 'MAGURELE': 'Măgurele', 'MOGOSOAIA': 'Mogoșoaia', 'STEFANESTII DE JOS': 'Ștefăneștii de Jos',
    'DARASTI-ILFOV': 'Dărăști-Ilfov', 'GANEASA': 'Găneasa', 'GRADISTEA': 'Grădiștea', 'CIOROGARLA': 'Ciorogârla', 'DASCALU': 'Dascălu',
    'DOMNESTI': 'Domnești', 'DRAGOMIRESTI-VALE': 'Drăgomirești-Vale', 'BALOTESTI': 'Balotești', 'BRANESTI': 'Brănești', 'AFUMATI': 'Afumați',
    'DOBROESTI': 'Dobroești', 'POPESTI LEORDENI': 'Popești-Leordeni', 'MOARA VLASIEI': 'Moara Vlăsiei', 'CHITILA': 'Chitila' };
  const title = w => w.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  const nice = s => {
    const m = s.match(/^\d+\s+(?:(?:ORAS|COMUNA|MUNICIPIUL)\s+)?(.+)$/i);
    if (m) return PLACES[m[1].toUpperCase()] || title(m[1]);
    return s
      .replace(/^Regiunea BUCURESTI - ILFOV$/i, 'Regiunea București–Ilfov')
      .replace(/^Municipiul Bucuresti$/i, 'București')
      .replace(/^(\w)(.*)$/, (x, a, b) => a + (b === b.toUpperCase() && b.length > 3 ? b.toLowerCase() : b));
  };
  const ABBR = { 'Hectare': 'ha', 'Kilograme': 'kg', 'Tone': 't', 'Litri': 'l' };
  const isRol = v => v === 'Milioane lei' || v === 'Mii lei';
  let TR = {}, DATA = null, ds = null, code = '', selIdx = [], serIdx = -1, sel = [], shift = 0, view = null;
  const lab = v => v === 'Numar' ? T.units : ABBR[v] ? ABBR[v] : isRol(v) ? (EN ? (TR[v] || v) : v) + ' (ROL)' : v === 'Procente' ? '%'
    : EN ? (v === 'Municipiul Bucuresti' ? 'Bucharest' : (TR[v] || nice(v))) : nice(v);
  const panel = $('#detaliu');

  async function loadRegistry() {
    if (!DATA) DATA = await getJSON('data.json');
    if (EN && !Object.keys(TR).length) TR = await getJSON('i18n-en.json');
  }
  function options(k) {
    const seen = [];
    ds.rows.forEach(r => {
      for (let j = 0; j < k; j++) if (r.d[selIdx[j]] !== sel[j]) return;
      const v = r.d[selIdx[k]];
      if (!seen.includes(v)) seen.push(v);
    });
    return seen;
  }
  function fillSelect(k) {
    const el = $('#d-sel-' + k), opts = options(k);
    if (/Localitati/i.test(ds.dims[selIdx[k]])) opts.sort((a, b) => lab(a).localeCompare(lab(b), 'ro'));
    if (!opts.includes(sel[k])) sel[k] = opts.includes('Total') ? 'Total' : opts[0];
    el.replaceChildren(...opts.map(o => option(o, lab(o))));
    el.value = sel[k];
  }
  function buildFilters() {
    const box = $('#d-filters');
    box.replaceChildren();
    selIdx.forEach((di, k) => {
      const wrap = document.createElement('label'); wrap.className = 'dash-field';
      const cap = document.createElement('span'); cap.textContent = EN ? (TR[ds.dims[di]] || ds.dims[di]) : ds.dims[di];
      const sl = document.createElement('select'); sl.id = 'd-sel-' + k;
      sl.addEventListener('change', () => { sel[k] = sl.value; for (let j = k + 1; j < selIdx.length; j++) fillSelect(j); renderDetail(); });
      wrap.append(cap, sl); box.append(wrap);
    });
    sel = selIdx.map(() => null);
    selIdx.forEach((_, k) => fillSelect(k));
  }
  const locIdx = () => { const k = selIdx.findIndex(di => /Localitati/i.test(ds.dims[di])); return k >= 0 ? k : Math.max(0, selIdx.length - 2); };

  /* money units are rescaled so the numbers stay short: thousand lei -> million -> billion -> trillion */
  const LEI = { 'Mii lei': 0, 'Mii lei RON': 0, 'Milioane lei': 1 };
  const LADDER = { ro: ['Mii lei', 'Milioane lei', 'Miliarde lei', 'Mii miliarde lei'], en: ['Thousand lei', 'Million lei', 'Billion lei', 'Trillion lei'] };
  const unitKey = () => { const k = selIdx.findIndex(di => /Unitate/i.test(ds.dims[di])); return k >= 0 ? sel[k] : ''; };
  function current() {
    const rows = ds.rows.filter(r => selIdx.every((di, k) => r.d[di] === sel[k]));
    const out = rows.map(r => ({ name: serIdx >= 0 ? lab(r.d[serIdx]) : lab(sel[locIdx()] || code), v: r.v }));
    shift = 0;
    const u = unitKey();
    if (u in LEI) {
      let max = 0;
      out.forEach(s => s.v.forEach(x => { if (x != null && Math.abs(x) > max) max = Math.abs(x); }));
      while (max >= 1e6 && LEI[u] + shift < 3) { max /= 1000; shift++; }
      if (shift) { const d = Math.pow(1000, shift); out.forEach(s => { s.v = s.v.map(x => x == null ? null : x / d); }); }
    }
    return out;
  }
  function unitLabel() {
    const u = unitKey();
    if (!u) return '';
    if (u === 'Procente') return '%';
    if (ABBR[u]) return ABBR[u];
    if (u === 'Numar') return T.units;
    if (u in LEI) return LADDER[EN ? 'en' : 'ro'][LEI[u] + shift] + (isRol(u) ? ' (ROL)' : u === 'Mii lei RON' ? ' (RON)' : '');
    return EN ? (TR[u] || u) : u;
  }
  function renderDetail() {
    const series = current(), years = ds.years, unit = unitLabel();
    const el = $('#d-chart');
    el.setAttribute('aria-label', T.aria + ': ' + $('#d-title').textContent);
    const chart = chartFor('d-chart');
    if (chart) chart.setOption({
      animationDuration: 500, textStyle: { fontFamily: fontFamily() }, color: PAL,
      grid: { left: 8, right: 16, top: series.length > 1 ? 44 : 16, bottom: 12, containLabel: true },
      legend: series.length > 1 ? { top: 0, itemGap: 32, textStyle: { color: MUTED, fontFamily: fontFamily() } } : { show: false },
      tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '–' : fmt(v) + (unit === '%' ? '%' : unit ? ' ' + unit.toLowerCase() : '') },
      xAxis: { type: 'category', data: years, boundaryGap: true, axisLabel: { color: MUTED, margin: 14 }, axisLine: { lineStyle: { color: LINE } } },
      yAxis: { type: 'value', axisLabel: { color: MUTED, margin: 12, formatter: v => compact(v) + (unit === '%' ? '%' : '') }, splitLine: { lineStyle: { color: LINE } } },
      series: series.map(s => ({ name: s.name, type: 'line', data: s.v, showSymbol: true, symbolSize: 5, smooth: false, connectNulls: false, lineStyle: { width: 2.5 } }))
    }, true);
    const rol = selIdx.some((di, k) => /Unitate/i.test(ds.dims[di]) && isRol(sel[k]));
    $('#d-unit').textContent = T.uomShort + unit;
    $('#d-note').hidden = !rol;
    $('#d-note').textContent = T.rol;
    const tbl = $('#d-table');
    if (!series.length) { tbl.innerHTML = ''; return; }
    tbl.innerHTML = '<thead><tr><th scope="col">' + T.year + '</th>' + series.map(s => '<th scope="col">' + esc(s.name) + '</th>').join('') + '</tr></thead>'
      + '<tbody>' + years.map((y, i) => '<tr><th scope="row">' + y + '</th>' + series.map(s => '<td>' + fmt(s.v[i]) + '</td>').join('') + '</tr>').reverse().join('') + '</tbody>';
    view = { series, years, unit };
  }
  async function openDetail(c, ttl) {
    await loadRegistry();
    code = c; ds = DATA[c];
    if (!ds) return;
    serIdx = ds.dims.findIndex(d => /Macroregiuni/i.test(d));
    selIdx = ds.dims.map((_, i) => i).filter(i => i !== serIdx);
    $('#d-code').textContent = c;
    $('#d-title').textContent = ttl;
    panel.hidden = false;
    buildFilters();
    renderDetail();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  regBody.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) openDetail(b.dataset.open, cellText(b.closest('tr'), 1));
  });
  $('#d-reset').addEventListener('click', () => { if (ds) { buildFilters(); renderDetail(); } });
  $('#d-close').addEventListener('click', () => { panel.hidden = true; });
  $('#d-xlsx').addEventListener('click', () => {
    if (!view) return;
    const rows = [[T.year, ...view.series.map(s => s.name + (view.unit ? ' (' + view.unit + ')' : ''))]];
    view.years.forEach((y, i) => rows.push([Number(y), ...view.series.map(s => s.v[i])]));
    downloadBlob(makeXlsx(rows, { sheet: code, widths: [10, ...view.series.map(() => 28)] }), code + '.xlsx');
  });

  /* ---------- Monthly-series explorers: climate (ANM), air quality (EEA) ---------- */
  const MONTHS = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const lg = EN ? 'en' : 'ro';
  const RES = {
    year:  { ro: 'Anuală', en: 'Yearly' },
    month: { ro: 'Lunară', en: 'Monthly' }
  };
  const agg = (vals, how, need) => {
    const v = vals.filter(x => x != null);
    if (v.length < need) return null;
    const r = how === 'sum' ? v.reduce((a, b) => a + b, 0) : how === 'max' ? Math.max(...v) : how === 'min' ? Math.min(...v) : v.reduce((a, b) => a + b, 0) / v.length;
    return Math.round(r * 100) / 100;
  };

  function explorer(cfg) {
    const id = s => '#' + cfg.p + '-' + s;
    let D = null, view = null;
    const resList = () => ({ ...RES, norm: cfg.norm.label });

    function series(st, key, res) {
      const m = st[key], V = cfg.vars[key], how = V.agg, labels = [], vals = [];
      if (res === 'month') {
        m.forEach((v, i) => { labels.push((st.y0 + Math.floor(i / 12)) + '-' + String(i % 12 + 1).padStart(2, '0')); vals.push(v); });
      } else if (res === 'year') {
        for (let y = st.y0; y <= st.y1; y++) { const i = (y - st.y0) * 12; labels.push(String(y)); vals.push(agg(m.slice(i, i + 12), how, V.yearNeed || (how === 'sum' ? 12 : 11))); }
      } else {
        const n0 = cfg.norm.y0 || st.y0, n1 = cfg.norm.y1 || st.y1, need = cfg.norm.need || Math.ceil(0.6 * (n1 - n0 + 1));
        MONTHS.forEach(l => labels.push(l));
        for (let k = 0; k < 12; k++) {
          const col = [];
          for (let y = n0; y <= n1; y++) { const i = (y - st.y0) * 12 + k; if (i >= 0 && i < m.length) col.push(m[i]); }
          vals.push(agg(col, how === 'max' || how === 'min' ? how : 'mean', need));
        }
      }
      return { labels, vals };
    }
    function fill(sel, items) { $(id(sel)).replaceChildren(...items.map(([v, l]) => option(v, l))); }
    function render() {
      if (!D) return;
      const sv = $(id('st')).value, key = $(id('var')).value, res = $(id('res')).value, V = cfg.vars[key], unit = V.u;
      const sts = sv === 'all' ? D.stations : D.stations.filter(s => s.wsi === sv);
      const ser = sts.map(s => ({ name: cfg.stName(s), ...series(s, key, res) }));
      let labels;
      if (res === 'norm') labels = ser[0].labels;
      else { const all = new Set(); ser.forEach(s => s.labels.forEach(l => all.add(l))); labels = [...all].sort(); }
      let data = ser.map(s => { const map = new Map(s.labels.map((l, i) => [l, s.vals[i]])); return labels.map(l => map.has(l) ? map.get(l) : null); });
      if (res !== 'norm') {   /* drop leading/trailing periods where no selected station has a value */
        const has = i => data.some(d => d[i] != null);
        let a = 0, b = labels.length - 1;
        while (a < b && !has(a)) a++;
        while (b > a && !has(b)) b--;
        labels = labels.slice(a, b + 1); data = data.map(d => d.slice(a, b + 1));
      }
      let ttl = V[lg];
      if (res === 'norm' && (V.agg === 'max' || V.agg === 'min')) ttl += T.ext1;
      const empty = !data.some(d => d.some(x => x != null));
      $(id('unit')).textContent = T.unit + unit + ' · ' + ttl + (empty ? ' · ' + T.none : '');
      const el = $(id('chart'));
      el.setAttribute('aria-label', T.cclim + ': ' + ttl);
      const chart = chartFor(cfg.p + '-chart');
      if (chart) {
        const bars = V.agg === 'sum' && res !== 'month', zoom = res === 'month' && labels.length > 120, ff = fontFamily();
        const limit = V.limit && res === 'year' ? { silent: true, symbol: 'none', lineStyle: { color: '#c0392b', type: 'dashed' }, label: { formatter: T.limit + ': ' + V.limit, color: '#c0392b', position: 'insideEndTop' }, data: [{ yAxis: V.limit }] } : undefined;
        chart.setOption({
          animationDuration: 500, textStyle: { fontFamily: ff }, color: PAL,
          grid: { left: 8, right: 16, top: ser.length > 1 ? 44 : 16, bottom: zoom ? 56 : 12, containLabel: true },
          legend: ser.length > 1 ? { top: 0, itemGap: 20, type: 'scroll', textStyle: { color: MUTED, fontFamily: ff } } : { show: false },
          tooltip: { trigger: 'axis', valueFormatter: v => v == null ? '–' : fmt(v, V.dec == null ? 1 : V.dec) + ' ' + unit },
          dataZoom: zoom ? [{ type: 'inside', start: 100 - Math.min(100, 360 / labels.length * 100), end: 100 }, { type: 'slider', height: 18, bottom: 8 }] : [],
          xAxis: { type: 'category', data: labels, boundaryGap: bars, axisLabel: { color: MUTED, margin: 14 }, axisLine: { lineStyle: { color: LINE } } },
          yAxis: { type: 'value', scale: !!V.scale, axisLabel: { color: MUTED, margin: 12, formatter: v => v.toLocaleString(loc) }, splitLine: { lineStyle: { color: LINE } } },
          series: ser.map((s, i) => {
            const base = bars ? { name: s.name, type: 'bar', data: data[i], barMaxWidth: 22 }
              : { name: s.name, type: 'line', data: data[i], showSymbol: res !== 'month', symbolSize: 5, connectNulls: false, lineStyle: { width: res === 'month' ? 1.5 : 2.5 } };
            if (limit && i === 0) base.markLine = limit;
            return base;
          })
        }, true);
      }
      const head = '<thead><tr><th scope="col">' + T.period + '</th>' + ser.map(s => '<th scope="col">' + esc(s.name) + '</th>').join('') + '</tr></thead>';
      const rows = labels.map((l, i) => '<tr><th scope="row">' + esc(l) + '</th>' + data.map(d => '<td>' + fmt(d[i], V.dec == null ? 1 : V.dec) + '</td>').join('') + '</tr>');
      $(id('table')).innerHTML = head + '<tbody>' + (res === 'norm' ? rows : rows.reverse()).join('') + '</tbody>';
      view = { labels, data, ser, unit, key, res };
    }
    async function init() {
      if (D) { render(); return; }
      D = await getJSON(cfg.file);
      fill('st', [...(D.stations.length > 1 ? [['all', T.all]] : []), ...D.stations.map(s => [s.wsi, cfg.stName(s)])]);
      fill('var', Object.keys(cfg.vars).map(k => [k, cfg.vars[k][lg]]));
      fill('res', Object.entries(resList()).map(([k, v]) => [k, v[lg]]));
      if (D.stations.length < 2) { const f = $(id('st')).closest('.dash-field'); if (f) f.hidden = true; }
      [id('st'), id('var'), id('res')].forEach(s => $(s).addEventListener('change', render));
      $(id('xlsx')).addEventListener('click', () => {
        if (!view) return;
        const rows = [[T.period, ...view.ser.map(s => s.name + ' (' + view.unit + ')')]];
        view.labels.forEach((l, i) => rows.push([view.res === 'year' ? Number(l) : l, ...view.data.map(d => d[i])]));
        downloadBlob(makeXlsx(rows, { sheet: view.key + '_' + view.res, widths: [14, ...view.ser.map(() => 22)] }), cfg.xl + '-' + view.key + '-' + view.res + '.xlsx');
      });
      render();
    }
    return () => init().then(() => setTimeout(render, 0));
  }

  const TYPES = { background: EN ? 'background' : 'fond', industrial: EN ? 'industrial' : 'industrială', traffic: EN ? 'traffic' : 'trafic' };
  hooks.clima = explorer({
    p: 'm', file: 'meteo.json', xl: 'meteo', stName: s => s.name,
    norm: { y0: 1991, y1: 2020, need: 25, label: { ro: 'Normale 1991–2020', en: 'Normals 1991–2020' } },
    vars: {
      ta:  { ro: 'Temperatura medie a aerului', en: 'Mean air temperature', u: '°C', agg: 'mean' },
      tx:  { ro: 'Temperatura maximă zilnică (medie)', en: 'Daily maximum temperature (mean)', u: '°C', agg: 'mean' },
      tn:  { ro: 'Temperatura minimă zilnică (medie)', en: 'Daily minimum temperature (mean)', u: '°C', agg: 'mean' },
      txx: { ro: 'Temperatura maximă absolută', en: 'Absolute maximum temperature', u: '°C', agg: 'max' },
      tnn: { ro: 'Temperatura minimă absolută', en: 'Absolute minimum temperature', u: '°C', agg: 'min' },
      r:   { ro: 'Precipitații', en: 'Precipitation', u: 'mm', agg: 'sum' },
      ff:  { ro: 'Viteza medie a vântului', en: 'Mean wind speed', u: 'm/s', agg: 'mean' },
      p:   { ro: 'Presiunea atmosferică medie', en: 'Mean atmospheric pressure', u: 'hPa', agg: 'mean', scale: true }
    }
  });
  hooks.aer = explorer({
    p: 'a', file: 'air.json', xl: 'aer', stName: s => s.name.split(' ')[0] + ' · ' + TYPES[s.type],
    norm: { label: { ro: 'Media pe luni (toți anii)', en: 'Monthly average (all years)' } },
    vars: {
      pm10: { ro: 'PM10', en: 'PM10', u: 'µg/m³', agg: 'mean', yearNeed: 9, limit: 40 },
      pm25: { ro: 'PM2,5', en: 'PM2.5', u: 'µg/m³', agg: 'mean', yearNeed: 9, limit: 25 },
      no2:  { ro: 'Dioxid de azot (NO₂)', en: 'Nitrogen dioxide (NO₂)', u: 'µg/m³', agg: 'mean', yearNeed: 9, limit: 40 },
      o3:   { ro: 'Ozon (O₃)', en: 'Ozone (O₃)', u: 'µg/m³', agg: 'mean', yearNeed: 9 }
    }
  });

  const fromHash = () => { const h = location.hash.slice(1); if (h && document.getElementById('tab-' + h)) showTab(h, false); };
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
