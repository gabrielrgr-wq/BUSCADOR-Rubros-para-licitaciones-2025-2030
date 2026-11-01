/* Buscador de rubros — Licitaciones 2025-2030 (Intendencia de Canelones)
   Sin dependencias: todo el índice se construye en el navegador a partir de data/rubros.js */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const fatal = msg => { const f = $('#fatal'); if (f) { f.textContent = msg; f.hidden = false; } };
  window.addEventListener('error', ev => fatal('Error en el buscador: ' + (ev.message || 'desconocido') + '. Recargue la página (Ctrl+F5).'));
  const D = window.RUBROS_DATA;
  if (!D) { fatal('No se pudieron cargar los datos (data/rubros.js). Verifique que la carpeta "data" esté junto a index.html, o use buscador-standalone.html.'); return; }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------ texto */
  const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const STOP = new Set('a al algo ante con contra cual cuales cuando de del desde donde el ella ellos en entre es esta estas este estos hay la las lo los me mi muy ni no o para pero por que se si sin sobre su sus te tu un una uno unas unos y ya como cuanto cuantos cuanta que quien forma formas'.split(' '));
  function stem(w) {
    if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
    return w;
  }
  function tokens(s) {
    let t = fold(s).replace(/\bot\s?-?\s?(\d{1,2})\b/g, (_, n) => 'ot-' + n.padStart(2, '0'));
    return (t.match(/[a-z0-9]+(?:-[a-z0-9]+)?/g) || []).map(stem);
  }
  const SYN_GROUPS = [
    ['bache', 'bacheo', 'baches', 'bachear'],
    ['alcantarilla', 'cano', 'canos', 'tubo', 'tuberia', 'caneria', 'conducto'],
    ['hormigon', 'concreto', 'hormigonado'],
    ['asfalto', 'asfaltico', 'asfaltica', 'bituminoso', 'bituminosa', 'carpeta', 'pavimento'],
    ['senal', 'senales', 'cartel', 'carteles', 'senalizacion', 'señalizacion'],
    ['vereda', 'veredas', 'acera', 'aceras'],
    ['pluvial', 'pluviales', 'tormenta', 'sumidero', 'sumideros'],
    ['pago', 'paga', 'pagar', 'pagado', 'pagados', 'pagara', 'pagan', 'cotiza', 'cotizara', 'cotizacion', 'precio', 'medicion', 'medira', 'liquidacion', 'abona', 'abonara', 'certificacion'],
    ['transporte', 'flete', 'acarreo', 'sobretransporte', 'traslado'],
    ['excavacion', 'excavar', 'desmonte', 'zanja', 'movimiento'],
    ['cordon', 'cordoneta', 'cordonera', 'cordones'],
    ['cuneta', 'cunetas', 'drenaje'],
    ['gravilla', 'gravillin'],
    ['rampa', 'rampas', 'accesibilidad'],
    ['vehiculo', 'camioneta', 'auto', 'chofer'],
    ['arbol', 'arboles', 'tocon', 'tocones', 'poda'],
    ['pasto', 'cesped', 'tepes', 'siembra', 'semilla'],
    ['junta', 'juntas', 'sellado', 'sello', 'resellado'],
    ['fresado', 'fresar', 'fresadora'],
    ['demolicion', 'demoler', 'rotura', 'martillo'],
    ['canal', 'canales', 'canalon', 'canalones'],
    ['imprevisto', 'imprevistos'],
    ['adoquin', 'adoquines', 'greenblock', 'green'],
    ['ensayo', 'ensayos', 'laboratorio', 'probeta', 'probetas'],
    ['arena', 'arenas'],
    ['tacha', 'tachas', 'demarcacion', 'linea', 'lineas', 'pintura'],
    ['base', 'subbase', 'sub'],
    ['reciclado', 'reciclar', 'estabilizado', 'estabilizada'],
    ['riego', 'imprimacion', 'adherencia', 'tratamiento']
  ];
  const SYN = new Map();
  SYN_GROUPS.forEach(g => {
    const st = [...new Set(g.map(w => stem(fold(w))))];
    st.forEach(w => { const s = SYN.get(w) || new Set(); st.forEach(x => x !== w && s.add(x)); SYN.set(w, s); });
  });

  /* ------------------------------------------------------------ catálogo y unidades */
  const UNIT_LABEL = { m3: 'm³', m2: 'm²', m3s: 'm³ suelto', 'm3.km': 'm³·km', 'ton.km': 'ton·km', 'c/u': 'c/u', unidad: 'unidad', 'Veh.mes': 'vehículo·mes', ton: 'ton', m: 'm (lineal)', km: 'km', global: 'global' };
  const unitLabel = u => UNIT_LABEL[u] || u || '—';
  const fmtCode = c => c;
  const byCode = new Map();
  D.indice.forEach(i => byCode.set(i.codigo, i));

  // entradas "rubro" (con o sin texto) + "general"
  const entries = []; // {key, kind, codigo, nombre, unidad, grupo, pagina, pagina_fin, rubro|general}
  const entryByKey = new Map();
  const bodyByCode = new Map(D.rubros.map(r => [r.codigo, r]));
  D.indice.forEach(i => {
    const r = bodyByCode.get(i.codigo);
    const e = {
      key: 'r:' + i.codigo, kind: 'rubro', codigo: i.codigo,
      nombre: r ? r.nombre : i.descripcion, descripcion: i.descripcion,
      unidad: i.unidad, grupo: i.grupo, pagina: r ? r.pagina : 3, pagina_fin: r ? r.pagina_fin : 3,
      data: r || null, sinCuerpo: !r
    };
    entries.push(e); entryByKey.set(e.key, e);
  });
  D.generales.forEach((g, n) => {
    const e = { key: 'g:' + n, kind: 'general', codigo: 'GEN', nombre: g.titulo, descripcion: g.titulo, unidad: '', grupo: 'General', pagina: g.pagina, pagina_fin: g.pagina_fin, data: g };
    entries.push(e); entryByKey.set(e.key, e);
  });

  /* ------------------------------------------------------------ índice invertido (BM25) */
  const docs = [];
  const df = new Map();
  entries.forEach(e => {
    const nameToks = tokens(e.nombre + ' ' + e.descripcion);
    const codeToks = e.kind === 'rubro' ? tokens(e.codigo).concat(tokens('rubro ' + e.codigo)) : [];
    e.titleSet = new Set(nameToks.concat(codeToks));
    const frs = (e.data && e.data.fragmentos && e.data.fragmentos.length) ? e.data.fragmentos : [{
      subtitulo: '', pagina: e.pagina,
      texto: e.sinCuerpo ? 'Este rubro figura en el listado del índice (p. 3), pero el documento no incluye una definición detallada del mismo.' : ''
    }];
    frs.forEach((f, n) => {
      const body = tokens(f.texto);
      const tf = new Map();
      const push = (arr, w) => arr.forEach(t => tf.set(t, (tf.get(t) || 0) + w));
      push(body, 1); push(nameToks, 2); push(tokens(f.subtitulo || ''), 2); push(codeToks, 3);
      let len = body.length + nameToks.length * 2 + 4;
      const d = { id: docs.length, e, n, f, tf, len, fold: fold(f.texto) };
      docs.push(d);
      tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1));
    });
  });
  const N = docs.length;
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / N;
  const vocab = [...df.keys()];
  const idf = t => Math.log(1 + (N - (df.get(t) || 0) + 0.5) / ((df.get(t) || 0) + 0.5));
  const K1 = 1.4, B = 0.6;
  const bm = (t, d) => {
    const f = d.tf.get(t); if (!f) return 0;
    return idf(t) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.len / avgLen));
  };

  /* ------------------------------------------------------------ búsqueda */
  const PAY_WORDS = new Set(['pago', 'pagara', 'cotiza', 'cotizara', 'cotizacion', 'precio', 'medicion', 'medira', 'liquidacion', 'abona', 'abonara', 'forma', 'cuanto', 'cobra', 'paga', 'pagan', 'pagar', 'pagado', 'pagados'].map(w => stem(w)));

  function parseQuery(raw) {
    const toks = tokens(raw);
    let qt = toks.filter(t => !STOP.has(t));
    if (!qt.length) qt = toks;
    qt = [...new Set(qt)];
    // forma de pago: "forma de pago" => pago
    return qt;
  }

  function expand(t) {
    const out = new Map(); // term -> weight
    out.set(t, 1);
    (SYN.get(t) || []).forEach(s => out.set(s, Math.max(out.get(s) || 0, 0.55)));
    if (t.length >= 4) vocab.forEach(v => { if (v !== t && v.startsWith(t)) out.set(v, Math.max(out.get(v) || 0, 0.7)); });
    return out;
  }

  function codeLookup(raw) {
    const s = fold(raw).replace(/rubros?|n[ºo°]?\.?|numero/g, ' ').replace(/\s+/g, ' ').trim();
    let m = s.match(/^ot\s?-?\s?(\d{1,2})$/);
    if (m) return 'OT-' + m[1].padStart(2, '0');
    m = s.match(/^(\d{1,4})\s?\.?\s?(a)?$/);
    if (m) return m[1] + (m[2] || '');
    return null;
  }

  function search(raw, filt) {
    const q = raw.trim();
    if (!q) return null;
    const qt = parseQuery(q);
    if (!qt.length) return { terms: [], matchSet: new Set(), hits: [] };
    const PAYSET = new Set(['pago','pagara','cotiza','cotizara','cotizacion','precio','medicion','medira','liquidacion','abona','abonara','cobra','paga','pagan','pagar','pagado','pagados'].map(stem));
    const hasContent = qt.some(t => !PAYSET.has(t));
    const exp = qt.map(t => { const m = expand(t); if (hasContent && PAYSET.has(t)) m.forEach((w, k) => m.set(k, w * 0.4)); return m; });
    const matchSet = new Set(); exp.forEach(m => m.forEach((_, k) => matchSet.add(k)));
    const phrase = fold(q).replace(/\s+/g, ' ');
    const exactCode = codeLookup(q);
    const wantsPay = qt.some(t => PAY_WORDS.has(t));
    const perEntry = new Map();

    docs.forEach(d => {
      const e = d.e;
      if (filt.grupo && e.grupo !== filt.grupo) return;
      if (filt.unidad && e.unidad !== filt.unidad) return;
      if (filt.ambito && e.kind !== filt.ambito) return;
      let s = 0, matched = 0;
      exp.forEach(m => {
        let best = 0; m.forEach((w, t) => { const v = bm(t, d) * w; if (v > best) best = v; });
        if (best > 0) { matched++; s += best; }
      });
      if (!matched) return;
      s *= 0.55 + 0.45 * (matched / qt.length);
      if (qt.length > 1 && d.fold.includes(phrase)) s += 3;
      // la forma de pago puntúa más en los fragmentos que hablan de pago/medición
      if (wantsPay && /(se pagar|se cotizar|se medir|se liquidar|se abonar|el precio|pago del rubro)/.test(d.fold)) s *= 1.35;
      let rec = perEntry.get(e.key);
      if (!rec) { rec = { e, scores: [], docs: [] }; perEntry.set(e.key, rec); }
      rec.scores.push(s); rec.docs.push({ d, s });
    });

    const hits = [];
    perEntry.forEach(rec => {
      rec.docs.sort((a, b) => b.s - a.s);
      let score = rec.docs[0].s + 0.25 * (rec.docs[1] ? rec.docs[1].s : 0);
      // coincidencia en el título del rubro
      let tm = 0; exp.forEach(m => { for (const t of m.keys()) if (rec.e.titleSet.has(t)) { tm++; break; } });
      score += tm * 2.2 + (tm === qt.length ? 3 : 0);
      if (exactCode && rec.e.codigo.toLowerCase() === exactCode.toLowerCase()) score += 200;
      hits.push({ e: rec.e, score, passages: rec.docs.slice(0, 3) });
    });
    hits.sort((a, b) => b.score - a.score || a.e.pagina - b.e.pagina);

    // si es un código exacto y no hubo texto coincidente, igual mostrar el rubro
    if (exactCode) {
      const ex = entryByKey.get('r:' + exactCode) || entryByKey.get('r:' + exactCode.toUpperCase());
      if (ex && !hits.some(h => h.e === ex)) {
        const d = docs.find(x => x.e === ex);
        hits.unshift({ e: ex, score: 200, passages: d ? [{ d, s: 1 }] : [] });
      }
    }
    return { terms: qt, matchSet, hits, wantsPay };
  }

  /* ------------------------------------------------------------ presentación */
  function highlight(text, matchSet) {
    return esc(text).replace(/[\p{L}\p{N}]+/gu, w => {
      const f = stem(fold(w));
      return matchSet.has(f) || matchSet.has(fold(w)) ? '<mark>' + w + '</mark>' : w;
    });
  }
  function snippet(text, matchSet, max = 480) {
    if (text.length <= max) return highlight(text, matchSet);
    const re = /[\p{L}\p{N}]+/gu; let m, first = -1;
    while ((m = re.exec(text))) { const f = stem(fold(m[0])); if (matchSet.has(f)) { first = m.index; break; } }
    let a = Math.max(0, (first < 0 ? 0 : first) - 140);
    let b = Math.min(text.length, a + max);
    if (a > 0) { const sp = text.indexOf(' ', a); if (sp > -1 && sp < a + 40) a = sp + 1; }
    if (b < text.length) { const sp = text.lastIndexOf(' ', b); if (sp > a + 40) b = sp; }
    return (a > 0 ? '… ' : '') + highlight(text.slice(a, b), matchSet) + (b < text.length ? ' …' : '');
  }
  const pdfUrl = p => `${D.meta.pdf}#page=${p}`;
  const refText = (e, p) => `${D.meta.titulo} (${D.meta.organismo.split(' — ')[0]}, ${D.meta.fecha.toLowerCase()}), ` +
    (e.kind === 'rubro' ? `Rubro ${e.codigo} – ${e.nombre}` : e.nombre) + `, p. ${p}.`;
  const badge = e => e.kind === 'rubro' ? `<span class="codebadge">Rubro ${esc(fmtCode(e.codigo))}</span>` : `<span class="codebadge">General</span>`;
  const metaHtml = e => `<div class="meta">` +
    (e.kind === 'rubro' ? `<span class="pill">Unidad: <b>${esc(unitLabel(e.unidad))}</b></span><span class="pill">Grupo ${esc(e.grupo)}</span>` : '') +
    `<span class="pill">Doc. pág. ${e.pagina}${e.pagina_fin > e.pagina ? '–' + e.pagina_fin : ''}</span></div>`;

  let state = { res: null, shown: 10, raw: '' };
  const els = {
    q: $('#q'), form: $('#searchForm'), answer: $('#answer'), results: $('#resultados'), count: $('#count'),
    more: $('#moreBtn'), welcome: $('#welcome'), fGrupo: $('#fGrupo'), fUnidad: $('#fUnidad'), fAmbito: $('#fAmbito')
  };

  function passageHtml(p, matchSet, max) {
    return `<p class="passage">${p.d.f.subtitulo ? `<span class="sub">${esc(p.d.f.subtitulo)}</span>` : ''}${snippet(p.d.f.texto, matchSet, max)}` +
      `<span class="pg">Documento, p. ${p.d.f.pagina}</span></p>`;
  }

  function render() {
    const res = state.res;
    els.answer.innerHTML = ''; els.results.innerHTML = '';
    document.body.classList.toggle('searching', !!res);
    if (!res) { els.welcome.hidden = false; els.count.textContent = ''; els.more.hidden = true; return; }
    els.welcome.hidden = true;
    const hits = res.hits;
    if (!hits.length) {
      els.count.textContent = '';
      els.results.innerHTML = `<div class="empty"><p><strong>Sin resultados para “${esc(state.raw)}”.</strong></p><p>Pruebe con otra palabra (por ejemplo <em>hormigón</em>, <em>base</em>, <em>transporte</em>), el número del rubro o quite filtros.</p></div>`;
      els.more.hidden = true; return;
    }
    const topScore = hits[0].score > 150 ? (hits[1] ? Math.max(hits[1].score, 1) : 1) : hits[0].score;
    els.count.textContent = `${hits.length} resultado${hits.length === 1 ? '' : 's'} para “${state.raw}” — ordenados por relevancia`;

    // Respuesta más acertada
    const top = hits[0], tp = top.passages[0];
    let extra = '';
    if (res.wantsPay && top.e.data && top.e.data.medicion_pago && top.e.data.medicion_pago.length) {
      const pay = top.e.data.medicion_pago.filter(t => /(se pagar|se cotizar|se medir|se liquidar|se abonar|pago del rubro)/i.test(t)).slice(-2);
      if (pay.length) extra = `<div class="extra"><b>Medición y pago:</b> ${pay.map(t => highlight(t, res.matchSet)).join(' ')}</div>`;
    }
    const ans = document.createElement('div');
    ans.className = 'answer';
    ans.innerHTML = `<span class="tag">Respuesta más acertada</span>
      <h3>${badge(top.e)}${esc(top.e.nombre)}</h3>${metaHtml(top.e)}
      ${tp ? `<blockquote>${tp.d.f.subtitulo ? `<span class="sub">${esc(tp.d.f.subtitulo)}</span>` : ''}${snippet(tp.d.f.texto, res.matchSet, 900)}</blockquote>` : ''}
      ${extra}
      <p class="ref"><strong>Referencia:</strong> ${esc(refText(top.e, tp ? tp.d.f.pagina : top.e.pagina))}</p>
      <div class="actions">
        <button class="btn" data-open="${esc(top.e.key)}" type="button">Ver rubro completo</button>
        <a class="btn sec" href="${pdfUrl(tp ? tp.d.f.pagina : top.e.pagina)}" target="_blank" rel="noopener">Abrir PDF en p. ${tp ? tp.d.f.pagina : top.e.pagina}</a>
        <button class="btn sec" data-copy="${esc(refText(top.e, tp ? tp.d.f.pagina : top.e.pagina))}" type="button">Copiar referencia</button>
      </div>`;
    els.answer.appendChild(ans);

    // Otros resultados
    const rest = hits.slice(1, state.shown);
    if (rest.length) {
      const h = document.createElement('h2'); h.className = 'sect-title'; h.textContent = 'Otros resultados relacionados';
      els.results.appendChild(h);
    }
    rest.forEach((h, i) => {
      const c = document.createElement('article'); c.className = 'card'; c.style.animationDelay = (i * 40) + 'ms';
      const pct = Math.max(8, Math.min(100, Math.round(h.score / topScore * 100)));
      const p0 = h.passages[0];
      c.innerHTML = `<h3>${badge(h.e)}<button type="button" data-open="${esc(h.e.key)}">${esc(h.e.nombre)}</button></h3>${metaHtml(h.e)}<div class="meter" title="Relevancia"><i style="width:${pct}%"></i></div>
        ${h.passages.slice(0, 2).map(p => passageHtml(p, res.matchSet, 300)).join('')}
        <div class="actions">
          <button class="btn sec" data-open="${esc(h.e.key)}" type="button">Ver rubro completo</button>
          <a class="btn sec" href="${pdfUrl(p0 ? p0.d.f.pagina : h.e.pagina)}" target="_blank" rel="noopener">PDF p. ${p0 ? p0.d.f.pagina : h.e.pagina}</a>
          <button class="btn sec" data-copy="${esc(refText(h.e, p0 ? p0.d.f.pagina : h.e.pagina))}" type="button">Copiar referencia</button>
        </div>`;
      els.results.appendChild(c);
    });
    els.more.hidden = hits.length <= state.shown;
  }

  function scrollToResults() {
    const t = $('#scrollTarget'); if (!t) return;
    const y = t.getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > y + 4 || t.getBoundingClientRect().top > window.innerHeight * 0.55) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
  function updateFilterBadge() {
    const n = [els.fGrupo.value, els.fUnidad.value, els.fAmbito.value].filter(Boolean).length;
    const b = $('#filterBadge'); b.hidden = !n; b.textContent = n;
    if (n) $('#filtersBox').open = true;
  }
  function doSearch(push = true) {
    updateFilterBadge();
    state.raw = els.q.value.trim();
    state.shown = 10;
    state.res = search(state.raw, { grupo: els.fGrupo.value, unidad: els.fUnidad.value, ambito: els.fAmbito.value });
    render();
    if (push && state.res) scrollToResults();
    if (push) {
      const p = new URLSearchParams();
      if (state.raw) p.set('q', state.raw);
      if (els.fGrupo.value) p.set('g', els.fGrupo.value);
      if (els.fUnidad.value) p.set('u', els.fUnidad.value);
      if (els.fAmbito.value) p.set('a', els.fAmbito.value);
      const h = p.toString();
      try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); } catch (e) { /* file:// */ }
    }
  }

  /* ------------------------------------------------------------ detalle (panel lateral) */
  const drawer = $('#drawer');
  let lastFocus = null;
  const isSub = t => t.length <= 90 && !/[.;,]$/.test(t) && t.split(/\s+/).length <= 12 && !/^[-•]/.test(t);
  function relatedCodes(e) {
    if (!e.data || !e.data.texto) return [];
    const found = new Set();
    const t = e.data.texto;
    let m; const re1 = /\bOT-\d{2}\b/g;
    while ((m = re1.exec(t))) found.add(m[0]);
    const re2 = /rubros?\s*(?:n[ºo°.]*\s*)?:?\s*((?:\d{1,4}\s?a?(?:\s*(?:,|y|e|o|\/)\s*)?)+)/gi;
    while ((m = re2.exec(t))) (m[1].match(/\d{1,4}\s?a?/g) || []).forEach(x => found.add(x.replace(/\s/g, '')));
    return [...found].filter(c => c !== e.codigo && byCode.has(c));
  }
  function openDrawer(key, matchSet) {
    const e = entryByKey.get(key); if (!e) return;
    lastFocus = document.activeElement;
    matchSet = matchSet || (state.res ? state.res.matchSet : new Set());
    $('#drKicker').textContent = e.kind === 'rubro' ? `Rubro ${e.codigo}` : 'Especificaciones generales';
    $('#drTitle').textContent = e.nombre;
    $('#drMeta').innerHTML = (e.kind === 'rubro' ? `<span class="pill">Unidad: <b>${esc(unitLabel(e.unidad))}</b></span><span class="pill">Grupo ${esc(e.grupo)}</span>` : '') +
      `<span class="pill">Doc. pág. ${e.pagina}${e.pagina_fin > e.pagina ? '–' + e.pagina_fin : ''}</span>`;
    $('#drActions').innerHTML = `<a class="btn" href="${pdfUrl(e.pagina)}" target="_blank" rel="noopener">Abrir PDF en p. ${e.pagina}</a>
      <button class="btn sec" type="button" data-copy="${esc(refText(e, e.pagina))}">Copiar referencia</button>
      <button class="btn sec" type="button" data-copytext="${esc(e.key)}">Copiar texto</button>`;
    let html = '';
    if (e.data && e.data.agrupado_con && e.data.agrupado_con.length) html += `<p class="notice">Este texto es común a los rubros ${esc([e.codigo, ...e.data.agrupado_con].join(', '))}.</p>`;
    if (e.sinCuerpo) html += `<p class="notice">Este rubro figura en el listado del índice (p. 3) pero el documento no contiene su definición detallada.${e.descripcion ? ' Descripción en el índice: ' + esc(e.descripcion) + '.' : ''}</p>`;
    if (e.data && e.data.medicion_pago && e.data.medicion_pago.length) {
      html += `<h4>Medición, pago e inclusiones</h4>` + e.data.medicion_pago.map(t => `<div class="pay">${highlight(t, matchSet)}</div>`).join('');
    }
    if (e.data && e.data.texto) {
      html += `<h4>Texto completo del documento</h4>` + e.data.texto.split('\n\n').map(p => isSub(p) ? `<p class="st">${highlight(p, matchSet)}</p>` : `<p>${highlight(p, matchSet)}</p>`).join('');
    }
    const rel = relatedCodes(e);
    if (rel.length) html += `<h4>Rubros mencionados en este texto</h4><div class="rel">` + rel.map(c => `<button type="button" data-open="r:${esc(c)}">${esc(c)} · ${esc((byCode.get(c).descripcion || '').slice(0, 38))}…</button>`).join('') + `</div>`;
    $('#drBody').innerHTML = html;
    $('#drBody').scrollTop = 0;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.drawer-head .icon-btn').focus(), 50);
  }
  function closeDrawer() {
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ------------------------------------------------------------ catálogo */
  function renderCatalog() {
    const q = fold($('#catQ').value.trim());
    const g = $('#cGrupo').value, u = $('#cUnidad').value;
    const rows = entries.filter(e => e.kind === 'rubro' &&
      (!g || e.grupo === g) && (!u || e.unidad === u) &&
      (!q || fold(e.codigo + ' ' + e.nombre + ' ' + e.descripcion).includes(q)));
    $('#catCount').textContent = `${rows.length} de ${D.indice.length} rubros`;
    $('#catTable tbody').innerHTML = rows.map(e => `<tr tabindex="0" data-open="${esc(e.key)}">
      <td class="code">${esc(e.codigo)}</td><td>${esc(e.nombre)}${e.sinCuerpo ? ' <span class="nobody">(sin definición en el cuerpo)</span>' : ''}</td>
      <td>${esc(unitLabel(e.unidad))}</td><td>${esc(e.grupo)}</td><td>${e.pagina}</td></tr>`).join('');
  }

  /* ------------------------------------------------------------ utilidades UI */
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copiado al portapapeles'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copiado al portapapeles'); } catch (_) { toast('No se pudo copiar'); }
      ta.remove();
    }
  }
  function fillSelect(sel, values, labeler) {
    values.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = labeler ? labeler(v) : v; sel.appendChild(o); });
  }
  const romanVal = s => { const m = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let t = 0; for (let i = 0; i < s.length; i++) { const a = m[s[i]], b = m[s[i + 1]] || 0; t += a < b ? -a : a; } return t; };
  const grupos = [...new Set(D.indice.map(i => i.grupo))].sort((a, b) => {
    const ra = /^[IVXLCDM]+$/.test(a), rb = /^[IVXLCDM]+$/.test(b);
    if (ra && rb) return romanVal(a) - romanVal(b);
    if (ra) return -1; if (rb) return 1; return a.localeCompare(b);
  });
  const unidades = [...new Set(D.indice.map(i => i.unidad))].sort();

  /* ------------------------------------------------------------ arranque */
  fillSelect(els.fGrupo, grupos); fillSelect(els.fUnidad, unidades, unitLabel);
  fillSelect($('#cGrupo'), grupos); fillSelect($('#cUnidad'), unidades, unitLabel);
  $('#kpis').innerHTML = [[D.meta.total_rubros, 'rubros'], [D.meta.paginas, 'páginas'], [grupos.length, 'grupos'], [docs.length, 'fragmentos']]
    .map(([n, l]) => `<div class="kpi"><b>${n}</b><span>${l}</span></div>`).join('');
  const TOPICS = [
    ['🚜', 'Excavación y suelos', 'excavación', 'Excavar, retirar, préstamo'],
    ['🕳️', 'Bacheo', 'bacheo', 'Asfalto, granular, hormigón'],
    ['🛣️', 'Mezcla asfáltica', 'mezcla asfáltica', 'Base negra, carpeta, fresado'],
    ['💧', 'Riegos y tratamientos', 'tratamiento bituminoso', 'Imprimación, sellado, adherencia'],
    ['🪨', 'Bases y sub-bases', 'base granular CBR', 'Materiales granulares'],
    ['🏗️', 'Hormigón y pavimentos', 'pavimento hormigón armado', 'Losas, juntas, curado'],
    ['🔵', 'Alcantarillas y caños', 'alcantarilla', 'Hormigón simple y armado'],
    ['🧱', 'Cordones y veredas', 'cordón cuneta vereda', 'Cordón, rampas, entradas'],
    ['🌧️', 'Pluviales y canales', 'boca de tormenta canal', 'Bocas, cámaras, canales'],
    ['🚧', 'Señalización', 'señalización', 'Carteles, postes, tachas'],
    ['🌱', 'Espacios verdes', 'siembra tepes suelo vegetal', 'Pasto, tepes'],
    ['🚚', 'Transporte', 'transporte sobretransporte', 'Distancias, flete']
  ];
  $('#tiles').innerHTML = TOPICS.map((t, i) => `<button class="tile" type="button" data-q="${esc(t[2])}" style="animation-delay:${i * 30}ms"><span class="ic">${t[0]}</span><b>${esc(t[1])}</b><span class="d">${esc(t[3])}</span></button>`).join('');

  // sugerencias mientras se escribe
  const sug = $('#suggest'); let sugItems = [], sugIdx = -1;
  function hideSuggest() { sug.hidden = true; sugIdx = -1; }
  function showSuggest() {
    const v = els.q.value.trim();
    if (v.length < 2) return hideSuggest();
    const r = search(v, { grupo: els.fGrupo.value, unidad: els.fUnidad.value, ambito: els.fAmbito.value });
    sugItems = r ? r.hits.filter(h => h.e.kind === 'rubro').slice(0, 6) : [];
    if (!sugItems.length) return hideSuggest();
    sug.innerHTML = sugItems.map((h, i) => `<li role="option" data-i="${i}" aria-selected="false"><span class="sc">${esc(h.e.codigo)}</span><span class="sn">${esc(h.e.nombre)}</span><span class="su">${esc(unitLabel(h.e.unidad))}</span></li>`).join('');
    sug.hidden = false; sugIdx = -1;
  }
  function moveSug(d) {
    if (sug.hidden) return;
    sugIdx = (sugIdx + d + sugItems.length) % sugItems.length;
    [...sug.children].forEach((li, i) => li.setAttribute('aria-selected', i === sugIdx));
  }
  sug.addEventListener('mousedown', ev => {
    const li = ev.target.closest('li'); if (!li) return;
    ev.preventDefault(); const h = sugItems[+li.dataset.i]; hideSuggest(); openDrawer(h.e.key);
  });
  els.q.addEventListener('input', showSuggest);
  els.q.addEventListener('blur', () => setTimeout(hideSuggest, 120));
  els.q.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSug(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSug(-1); }
    else if (ev.key === 'Enter' && sugIdx >= 0 && !sug.hidden) { ev.preventDefault(); const h = sugItems[sugIdx]; hideSuggest(); openDrawer(h.e.key); }
    else if (ev.key === 'Escape') hideSuggest();
  });
  els.form.addEventListener('submit', hideSuggest);

  // volver arriba
  const toTop = $('#toTop');
  window.addEventListener('scroll', () => { toTop.hidden = window.scrollY < 500; }, { passive: true });
  toTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  ['bacheo', 'cuánto se paga el bacheo', 'cordón cuneta', 'CBR 80', 'alcantarilla 60 cm', 'señalización', 'distancia de transporte', 'juntas', 'imprevistos', 'vehículo sin chofer', 'OT-12']
    .forEach(w => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = w; b.onclick = () => { els.q.value = w; showTab('buscar'); doSearch(); }; $('#chips').appendChild(b); });

  let timer;
  els.q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { showTab('buscar'); doSearch(); }, 130); });
  els.form.addEventListener('submit', ev => { ev.preventDefault(); showTab('buscar'); doSearch(); });
  [els.fGrupo, els.fUnidad, els.fAmbito].forEach(s => s.addEventListener('change', () => doSearch()));
  $('#clearBtn').onclick = () => { hideSuggest(); els.q.value = ''; els.fGrupo.value = els.fUnidad.value = els.fAmbito.value = ''; doSearch(); els.q.focus(); };
  els.more.onclick = () => { state.shown += 10; render(); };
  ['#catQ', '#cGrupo', '#cUnidad'].forEach(s => $(s).addEventListener('input', renderCatalog));

  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-open],[data-copy],[data-copytext],[data-close],[data-q]');
    if (!t) return;
    if (t.dataset.q) { els.q.value = t.dataset.q; showTab('buscar'); hideSuggest(); doSearch(); return; }
    if (t.dataset.close !== undefined) return closeDrawer();
    if (t.dataset.open) return openDrawer(t.dataset.open);
    if (t.dataset.copy) return copy(t.dataset.copy);
    if (t.dataset.copytext) { const e = entryByKey.get(t.dataset.copytext); return copy(`${e.kind === 'rubro' ? 'Rubro ' + e.codigo + ' – ' : ''}${e.nombre}\n\n${(e.data && e.data.texto) || ''}\n\n${refText(e, e.pagina)}`); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && drawer.getAttribute('aria-hidden') === 'false') return closeDrawer();
    if (ev.key === 'Enter' && ev.target.matches('tr[data-open]')) return openDrawer(ev.target.dataset.open);
    if (ev.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { ev.preventDefault(); showTab('buscar'); els.q.focus(); els.q.select(); }
  });

  function showTab(which) {
    const b = which === 'buscar';
    $('#viewBuscar').hidden = !b; $('#viewCatalogo').hidden = b;
    $('#tabBuscar').classList.toggle('active', b); $('#tabCatalogo').classList.toggle('active', !b);
    $('#tabBuscar').setAttribute('aria-selected', b); $('#tabCatalogo').setAttribute('aria-selected', !b);
    if (!b) renderCatalog();
  }
  $('#tabBuscar').onclick = () => showTab('buscar');
  $('#tabCatalogo').onclick = () => showTab('catalogo');

  // tema
  const root = document.documentElement;
  try { const th = localStorage.getItem('tema'); if (th) root.dataset.theme = th; } catch (e) { /* ignore */ }
  $('#themeBtn').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('tema', root.dataset.theme); } catch (e) { /* ignore */ }
  };

  // estado inicial desde la URL (#q=bacheo&g=V)
  (function init() {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (p.get('q')) els.q.value = p.get('q');
    if (p.get('g')) els.fGrupo.value = p.get('g');
    if (p.get('u')) els.fUnidad.value = p.get('u');
    if (p.get('a')) els.fAmbito.value = p.get('a');
    doSearch(false);
  })();
  window.addEventListener('hashchange', () => {
    const p = new URLSearchParams(location.hash.replace(/^#/, ''));
    if ((p.get('q') || '') !== els.q.value.trim()) { els.q.value = p.get('q') || ''; doSearch(false); }
  });

  // utilidades para pruebas desde la consola / Node
  window.__buscador = { search, entries, docs };
})();
