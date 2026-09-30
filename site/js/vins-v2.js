/* Pages Vins, Bières, Spiritueux, Épicerie fine, Événements — reprise de la V2 :
   catalogue filtrable (CMS SGT) + fiche produit + agenda + apparitions.
   Ne concerne que la section .v2s de ces pages ; n'utilise que l'API de lecture déjà configurée (js/cms-config.js). */
(function () {
  'use strict';
  var config = window.SGT_CMS;
  var LABEL_CAT = { vins: 'Vin', bieres: 'Bière', spiritueux: 'Spiritueux', epicerie: 'Épicerie fine' };
  var BOTTLE = { rouge: 'red', blanc: 'white', rose: 'rose', effervescent: 'sparkling', doux: 'sweet', bieres: 'amber', spiritueux: 'amber' };
  var ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';

  document.addEventListener('DOMContentLoaded', function () {
    var scope = document.querySelector('.v2s');
    if (!scope) return;

    /* apparitions au défilement */
    scope.classList.add('is-js');
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    scope.querySelectorAll('[data-reveal]').forEach(function (el) { io ? io.observe(el) : el.classList.add('is-in'); });

    if (!config || !config.url || !config.key) return;
    scope.querySelectorAll('[data-v2-cms="catalogue"]').forEach(catalogue);
    scope.querySelectorAll('[data-v2-cms="agenda"]').forEach(agenda);
  });

  /* ---------- API ---------- */
  function api(path, params) {
    var q = new URLSearchParams(params || {}).toString();
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 5000);
    return fetch(config.url.replace(/\/$/, '') + '/api/v1/' + path + (q ? '?' + q : ''), {
      headers: { Authorization: 'Bearer ' + config.key }, signal: ctrl.signal
    }).then(function (r) { if (!r.ok) throw new Error('CMS ' + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }
  var schemaP;
  function schema() { return schemaP || (schemaP = api('schema/produit').catch(function () { schemaP = null; return null; })); }
  function labelOf(sch, field, value) {
    if (!sch || !value) return value || '';
    var f = sch.filters.filter(function (x) { return x.name === field; })[0];
    var o = f && f.options.filter(function (x) { return x.value === value; })[0];
    return o ? o.label : value;
  }

  /* ---------- Cartes produit ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function price(n) { return typeof n === 'number' ? n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : ''; }
  function visual(d, big) {
    var media = el('div', 'product-media');
    if (d.photo && d.photo.url) {
      var img = el('img', 'photo');
      img.src = big ? d.photo.url : (d.photo.thumbnailUrl || d.photo.url);
      img.alt = d.nom || '';
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      media.insertAdjacentHTML('beforeend', '<svg class="bottle bottle--' + (BOTTLE[d.type] || BOTTLE[d.categorie] || 'red') + '" viewBox="0 0 80 240" aria-hidden="true"><rect x="32" y="4" width="16" height="12" rx="2" fill="#20242a"/><path d="M33 16 L47 16 L47 40 C47 52 60 58 60 86 L60 214 C60 224 54 230 44 230 L36 230 C26 230 20 224 20 214 L20 86 C20 58 33 52 33 40 Z" fill="var(--glass)"/><rect x="22" y="150" width="36" height="52" rx="1" fill="#f4efe3"/><rect x="27" y="163" width="26" height="3" fill="#c4b79c"/><rect x="27" y="173" width="18" height="3" fill="#d6ccb5"/></svg>');
    }
    if (d.nouveaute && !big) media.appendChild(el('span', 'product-tag', 'Nouveauté'));
    return media;
  }
  function card(item, sch) {
    var d = item.data;
    var b = el('button', 'product');
    b.type = 'button';
    b.setAttribute('aria-label', (d.nom || 'Produit') + ' — voir la fiche');
    b.appendChild(visual(d));
    var body = el('div', 'product-body');
    body.appendChild(el('span', 'product-cat', labelOf(sch, 'type', d.type) || LABEL_CAT[d.categorie] || ''));
    body.appendChild(el('h3', 'product-name', d.nom));
    if (d.producteur) body.appendChild(el('p', 'product-dom', d.producteur));
    var meta = el('div', 'product-meta');
    meta.appendChild(el('span', null, d.millesime || ''));
    meta.appendChild(el('b', null, price(d.prix)));
    body.appendChild(meta);
    b.appendChild(body);
    b.addEventListener('click', function () { openProduct(item, sch); });
    return b;
  }

  /* ---------- Fiche produit ---------- */
  var dialog;
  function openProduct(item, sch) {
    if (!dialog) {
      dialog = el('dialog', 'dialog');
      dialog.innerHTML = '<button class="dialog-close" type="button" aria-label="Fermer la fiche"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button><div class="pd" data-pd></div>';
      dialog.querySelector('.dialog-close').addEventListener('click', function () { dialog.close(); });
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      document.querySelector('.v2s').appendChild(dialog);   // dans la section : styles limités à .v2s
    }
    var d = item.data, pd = dialog.querySelector('[data-pd]');
    pd.textContent = '';
    pd.appendChild(visual(d, true));
    var info = el('div', 'pd-info');
    info.appendChild(el('span', 'kicker', LABEL_CAT[d.categorie] || ''));
    var h = el('h2', 'pd-name', d.nom); h.id = 'pd-title'; info.appendChild(h);
    if (d.producteur) info.appendChild(el('p', 'product-dom', d.producteur));
    info.appendChild(el('p', 'pd-price', price(d.prix)));
    if (d.description) info.appendChild(el('p', 'lead', d.description));
    var rows = [];
    if (sch) sch.filters.forEach(function (f) { if (!f.main && d[f.name]) rows.push([f.label, labelOf(sch, f.name, d[f.name])]); });
    if (d.millesime) rows.push(['Millésime', d.millesime]);
    if (rows.length) {
      var dl = el('dl', 'pd-specs');
      rows.forEach(function (r) { var w = el('div'); w.appendChild(el('dt', null, r[0])); w.appendChild(el('dd', null, r[1])); dl.appendChild(w); });
      info.appendChild(dl);
    }
    var cta = el('a', 'btn btn--wine');
    cta.href = 'contact.html';
    cta.innerHTML = 'Une question sur ce produit&nbsp;? ' + ARROW;
    info.appendChild(cta);
    pd.appendChild(info);
    dialog.setAttribute('aria-labelledby', 'pd-title');
    dialog.showModal();
  }

  /* ---------- Pages univers : catalogue filtrable ---------- */
  function catalogue(root) {
    var cat = root.getAttribute('data-categorie');
    var grid = root.querySelector('[data-grid]'), tools = root.querySelector('[data-tools]'), count = root.querySelector('[data-count]');
    Promise.all([api('content/produit', { categorie: cat }), schema()]).then(function (r) {
      var items = r[0].items, sch = r[1];
      if (!items.length) return;                            // on garde le message par défaut
      // le bloc « Elle se découvre à la cave » reste en conclusion du catalogue
      var state = { q: '' };
      var filters = sch ? sch.filters.filter(function (f) { return !f.main && (!f.showIf || f.showIf['in'].indexOf(cat) !== -1); }) : [];
      filters.forEach(function (f) {
        var present = f.options.filter(function (o) { return items.some(function (i) { return i.data[f.name] === o.value; }); });
        if (present.length < 2) return;
        state[f.name] = '';
        var g = el('div', 'chip-group');
        g.appendChild(el('span', null, f.label));
        var chips = el('div', 'chips');
        [{ value: '', label: 'Tous' }].concat(present).forEach(function (o) {
          var c = el('button', 'chip', o.label);
          c.type = 'button';
          c.setAttribute('aria-pressed', String(o.value === ''));
          c.addEventListener('click', function () {
            state[f.name] = o.value;
            chips.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
            render();
          });
          chips.appendChild(c);
        });
        g.appendChild(chips);
        tools.appendChild(g);
      });
      var search = el('label', 'search');
      search.innerHTML = '<span class="sr">Rechercher</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="search" placeholder="Rechercher un nom, un domaine…">';
      search.querySelector('input').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
      tools.appendChild(search);
      tools.hidden = false;

      function render() {
        var list = items.filter(function (i) {
          var d = i.data;
          for (var k in state) if (k !== 'q' && state[k] && d[k] !== state[k]) return false;
          return !state.q || [d.nom, d.producteur, d.description].join(' ').toLowerCase().indexOf(state.q) !== -1;
        });
        grid.textContent = '';
        list.forEach(function (i) { grid.appendChild(card(i, sch)); });
        count.textContent = list.length ? list.length + ' référence' + (list.length > 1 ? 's' : '') + ' en ligne — bien d’autres vous attendent à la cave.' : 'Aucun produit ne correspond à ces critères.';
      }
      render();
    }).catch(warn);
  }

  /* ---------- Agenda ---------- */
  function agenda(root) {
    var list = root.querySelector('[data-list]'), empty = root.querySelector('[data-empty]');
    var limit = root.getAttribute('data-limit');
    api('content/evenement', limit ? { limit: limit } : {}).then(function (r) {
      var items = r.items;
      if (!items.length) { if (empty) empty.hidden = false; else root.hidden = true; return; }
      list.textContent = '';
      items.forEach(function (i) { list.appendChild(eventRow(i.data)); });
      root.hidden = false;
      if (empty) empty.hidden = true;
    }).catch(function (e) {
      warn(e);
      if (empty) { empty.querySelector('p').textContent = 'L’agenda est momentanément indisponible. Appelez-nous au 06 16 28 52 20 pour connaître nos prochains rendez-vous.'; empty.hidden = false; }
    });
  }
  function fmt(date, o) { o.timeZone = 'Europe/Paris'; return date.toLocaleDateString('fr-FR', o); }
  function time(date) { return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h'); }
  function eventRow(d) {
    var start = new Date(d.debut);
    var row = el('article', 'event');
    var date = el('div', 'event-date');
    date.appendChild(el('b', null, fmt(start, { day: 'numeric' })));
    date.appendChild(el('span', null, fmt(start, { month: 'short' }).replace('.', '')));
    row.appendChild(date);
    var body = el('div');
    if (d.image && d.image.url) { var img = el('img', 'event-img'); img.src = d.image.thumbnailUrl || d.image.url; img.alt = ''; img.loading = 'lazy'; body.appendChild(img); }
    body.appendChild(el('h3', null, d.titre));
    var when = fmt(start, { weekday: 'long', day: 'numeric', month: 'long' });
    body.appendChild(el('p', 'event-when', when.charAt(0).toUpperCase() + when.slice(1) + ' · ' + time(start) + (d.fin ? ' – ' + time(new Date(d.fin)) : '') + (d.lieu ? ' · ' + d.lieu : '')));
    if (d.description) body.appendChild(el('p', 'event-desc', d.description));
    if (d.infos) body.appendChild(el('p', 'event-infos', d.infos));
    row.appendChild(body);
    var cta;
    if (d.lien_inscription && /^https?:\/\//i.test(d.lien_inscription)) {
      cta = el('a', 'btn btn--ghost'); cta.href = d.lien_inscription; cta.target = '_blank'; cta.rel = 'noopener'; cta.textContent = 'Réserver';
    } else {
      cta = el('a', 'btn btn--ghost'); cta.href = 'tel:+33616285220'; cta.textContent = 'Réserver par téléphone';
    }
    row.appendChild(cta);
    return row;
  }

  function warn(e) { console.warn('[CMS] contenu indisponible, affichage par défaut.', e); }
})();
