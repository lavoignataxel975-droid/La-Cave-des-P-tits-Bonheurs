/* Accueil — sections « Événements » et « Nouveautés » (refonte UI UX Pro Max).
   Contenu lu dans le CMS SGT (même API de lecture que le reste du site, js/cms-config.js).
   Sans CMS : l'agenda reste masqué, les nouveautés affichent une sélection de secours. */
(function () {
  'use strict';
  var config = window.SGT_CMS;
  var CAT = { vins: 'Vins', bieres: 'Bières', spiritueux: 'Spiritueux', epicerie: 'Épicerie fine' };
  var CAT_ONE = { vins: 'Vin', bieres: 'Bière', spiritueux: 'Spiritueux', epicerie: 'Épicerie fine' };
  var BOTTLE = { rouge: 'red', blanc: 'white', rose: 'rose', effervescent: 'sparkling', doux: 'sweet', bieres: 'amber', spiritueux: 'amber' };
  var ARROW = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>';

  /* Sélection affichée si le CMS ne répond pas (reprend les nouveautés d'origine de l'accueil) */
  var FALLBACK = [
    { id: 'f1', data: { nom: 'Pommard', producteur: 'Château de Pommard', millesime: 2023, prix: 50, categorie: 'vins', type: 'rouge', nouveaute: true } },
    { id: 'f2', data: { nom: 'Chassagne-Montrachet', producteur: 'Domaine Morey Coffinet', millesime: 2024, prix: 60, categorie: 'vins', type: 'blanc', nouveaute: true } },
    { id: 'f3', data: { nom: 'Château des Tours Côtes-du-Rhône Réserve', producteur: 'Château des Tours (E. Reynaud)', millesime: 2022, prix: 150, categorie: 'vins', type: 'rouge', nouveaute: true } },
    { id: 'f4', data: { nom: 'Vosne-Romanée', producteur: 'SCE Domaine Forey Père & Fils', millesime: 2023, prix: 60, categorie: 'vins', type: 'rouge', nouveaute: true } }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    var agendaEl = document.querySelector('[data-hx="agenda"]');
    var newsEl = document.querySelector('[data-hx="nouveautes"]');
    var ok = config && config.url && config.key;
    if (agendaEl && ok) agenda(agendaEl);
    if (newsEl) {
      if (!ok) return showcase(newsEl, FALLBACK, null);
      Promise.all([api('content/produit', { nouveaute: 'true' }), api('schema/produit').catch(function () { return null; })])
        .then(function (r) { showcase(newsEl, r[0].items.length ? r[0].items : FALLBACK, r[1]); })
        .catch(function (e) { warn(e); showcase(newsEl, FALLBACK, null); });
    }
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
  function warn(e) { console.warn('[CMS] contenu indisponible, affichage par défaut.', e); }

  /* ---------- Utilitaires ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = String(text);
    return n;
  }
  function price(n) { return typeof n === 'number' ? n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : ''; }
  function paris(date, o) { o.timeZone = 'Europe/Paris'; return date.toLocaleDateString('fr-FR', o); }
  function time(date) { return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h'); }
  function dayKey(date) { return paris(date, { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-'); }
  /** « Aujourd'hui », « Demain », « Dans 5 jours », « Dans 3 semaines » (heure de Paris) */
  function relative(date) {
    var d = Math.round((new Date(dayKey(date)) - new Date(dayKey(new Date()))) / 864e5);
    if (d <= 0) return 'Aujourd’hui';
    if (d === 1) return 'Demain';
    if (d < 14) return 'Dans ' + d + ' jours';
    if (d < 60) return 'Dans ' + Math.round(d / 7) + ' semaines';
    return null;
  }

  /* ---------- Agenda ---------- */
  function agenda(section) {
    var list = section.querySelector('[data-hx-list]');
    var limit = section.getAttribute('data-limit');
    api('content/evenement', limit ? { limit: limit } : {}).then(function (r) {
      if (!r.items.length) return;                         // rien de prévu : la section reste masquée
      r.items.forEach(function (it) { list.appendChild(ticket(it.data)); });
      section.hidden = false;
    }).catch(warn);
  }
  function ticket(d) {
    var start = new Date(d.debut);
    var li = el('li', 'hx-ticket');
    var date = el('div', 'hx-date');
    date.appendChild(el('span', 'hx-date-wd', paris(start, { weekday: 'short' }).replace('.', '')));
    date.appendChild(el('span', 'hx-date-day', paris(start, { day: 'numeric' })));
    date.appendChild(el('span', 'hx-date-mo', paris(start, { month: 'short' }).replace('.', '')));
    li.appendChild(date);

    var body = el('div', 'hx-ticket-body');
    var rel = relative(start);
    if (rel) body.appendChild(el('span', 'hx-badge', rel));
    body.appendChild(el('h3', 'hx-ticket-title', d.titre));
    var when = paris(start, { weekday: 'long', day: 'numeric', month: 'long' });
    body.appendChild(el('p', 'hx-ticket-meta', when.charAt(0).toUpperCase() + when.slice(1) + ' · ' + time(start) + (d.fin ? '–' + time(new Date(d.fin)) : '') + (d.lieu ? ' · ' + d.lieu : '')));
    if (d.description) body.appendChild(el('p', 'hx-ticket-desc', d.description));
    if (d.infos) body.appendChild(el('p', 'hx-ticket-infos', d.infos));
    li.appendChild(body);

    var cta = el('a', 'hx-btn');
    if (d.lien_inscription && /^https?:\/\//i.test(d.lien_inscription)) {
      cta.href = d.lien_inscription; cta.target = '_blank'; cta.rel = 'noopener';
      cta.innerHTML = 'Réserver ' + ARROW;
    } else {
      cta.href = 'tel:+33616285220';
      cta.innerHTML = 'Réserver <span class="hx-btn-sub">par téléphone</span>';
    }
    cta.setAttribute('aria-label', 'Réserver : ' + d.titre);
    li.appendChild(cta);
    return li;
  }

  /* ---------- Nouveautés ---------- */
  function visual(d, cls) {
    var m = el('div', 'hx-media' + (cls ? ' ' + cls : ''));
    if (d.photo && d.photo.url) {
      var img = el('img');
      img.src = cls === 'hx-media--big' ? d.photo.url : (d.photo.thumbnailUrl || d.photo.url);
      img.alt = d.nom || '';
      img.loading = 'lazy';
      m.appendChild(img);
    } else {
      m.insertAdjacentHTML('beforeend', '<svg class="hx-bottle hx-bottle--' + (BOTTLE[d.type] || BOTTLE[d.categorie] || 'red') + '" viewBox="0 0 80 240" aria-hidden="true"><rect x="32" y="4" width="16" height="12" rx="2" fill="#20242a"/><path d="M33 16 L47 16 L47 40 C47 52 60 58 60 86 L60 214 C60 224 54 230 44 230 L36 230 C26 230 20 224 20 214 L20 86 C20 58 33 52 33 40 Z" fill="var(--glass)"/><rect x="22" y="150" width="36" height="52" rx="1" fill="#f4efe3"/><rect x="27" y="163" width="26" height="3" fill="#c4b79c"/><rect x="27" y="173" width="18" height="3" fill="#d6ccb5"/></svg>');
    }
    return m;
  }
  function label(sch, d) {
    if (sch && d.type) {
      var f = sch.filters.filter(function (x) { return x.name === 'type'; })[0];
      var o = f && f.options.filter(function (x) { return x.value === d.type; })[0];
      if (o) return CAT_ONE[d.categorie] + ' ' + o.label.toLowerCase();
    }
    return CAT_ONE[d.categorie] || '';
  }

  /* Carrousel de cartes identiques (format d'origine), avec flèches précédent / suivant */
  function showcase(section, items, sch) {
    var rail = section.querySelector('[data-hx-showcase]');
    rail.textContent = '';
    items.forEach(function (it) {
      var d = it.data;
      var li = el('li');
      var b = el('button', 'hx-mini');
      b.type = 'button';
      b.setAttribute('aria-label', d.nom + ' — voir la fiche');
      b.appendChild(visual(d));
      if (d.nouveaute) b.appendChild(el('span', 'hx-badge hx-badge--wine hx-card-tag', 'Nouveauté'));
      var t = el('div', 'hx-mini-info');
      t.appendChild(el('span', 'hx-cat', label(sch, d)));
      t.appendChild(el('h3', 'hx-mini-name', d.nom));
      if (d.producteur) t.appendChild(el('p', 'hx-dom', d.producteur));
      var m = el('div', 'hx-mini-meta');
      m.appendChild(el('span', null, d.millesime || ''));
      m.appendChild(el('b', null, price(d.prix)));
      t.appendChild(m);
      t.appendChild(el('span', 'hx-more', 'Voir la fiche →'));
      b.appendChild(t);
      b.addEventListener('click', function () { sheet(it, sch); });
      li.appendChild(b);
      rail.appendChild(li);
    });

    var prev = section.querySelector('[data-hx-prev]'), next = section.querySelector('[data-hx-next]');
    var step = function (dir) {
      var card = rail.firstElementChild;
      var w = card ? card.getBoundingClientRect().width + 20 : 280;
      rail.scrollBy({ left: dir * w, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    var sync = function () {
      var max = rail.scrollWidth - rail.clientWidth - 6;
      prev.disabled = rail.scrollLeft <= 6;
      next.disabled = rail.scrollLeft >= max;
      section.querySelector('.hx-arrows').hidden = max <= 0;
    };
    prev.onclick = function () { step(-1); };
    next.onclick = function () { step(1); };
    rail.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---------- Fiche produit ---------- */
  var dialog;
  function sheet(item, sch) {
    if (!dialog) {
      dialog = el('dialog', 'hx-dialog');
      dialog.innerHTML = '<button class="hx-close" type="button" aria-label="Fermer la fiche"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button><div class="hx-sheet" data-sheet></div>';
      dialog.querySelector('.hx-close').addEventListener('click', function () { dialog.close(); });
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      document.querySelector('.hx-news').appendChild(dialog);
    }
    var d = item.data, s = dialog.querySelector('[data-sheet]');
    s.textContent = '';
    s.appendChild(visual(d, 'hx-media--big'));
    var info = el('div', 'hx-sheet-info');
    info.appendChild(el('span', 'hx-cat', label(sch, d)));
    var h = el('h2', 'hx-feature-name', d.nom); h.id = 'hx-sheet-title'; info.appendChild(h);
    if (d.producteur) info.appendChild(el('p', 'hx-dom', d.producteur));
    info.appendChild(el('p', 'hx-price', price(d.prix)));
    if (d.description) info.appendChild(el('p', 'hx-feature-desc hx-feature-desc--full', d.description));
    var rows = [];
    if (sch) sch.filters.forEach(function (f) {
      if (f.main || !d[f.name]) return;
      var o = f.options.filter(function (x) { return x.value === d[f.name]; })[0];
      rows.push([f.label, o ? o.label : d[f.name]]);
    });
    if (d.millesime) rows.push(['Millésime', d.millesime]);
    if (rows.length) {
      var dl = el('dl', 'hx-specs');
      rows.forEach(function (r) { var w = el('div'); w.appendChild(el('dt', null, r[0])); w.appendChild(el('dd', null, r[1])); dl.appendChild(w); });
      info.appendChild(dl);
    }
    var cta = el('a', 'hx-btn');
    cta.href = d.categorie ? d.categorie + '.html' : 'vins.html';
    cta.innerHTML = ({ vins: 'Tous nos vins', bieres: 'Toutes nos bières', spiritueux: 'Tous nos spiritueux', epicerie: 'Toute l’épicerie fine' }[d.categorie] || 'Toute la cave') + ' ' + ARROW;
    info.appendChild(cta);
    s.appendChild(info);
    dialog.setAttribute('aria-labelledby', 'hx-sheet-title');
    dialog.showModal();
  }
})();
