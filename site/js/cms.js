/* ============================================================
   La Cave des P'tits Bonheurs — contenu géré depuis le CMS
   - [data-cms="nouveautes"]  : carrousel des produits « Nouveauté » (accueil)
   - [data-cms="produits"]    : grille des produits d'une catégorie (data-categorie)
   - [data-cms="evenements"]  : événements à venir (data-limit facultatif)
   Si le CMS ne répond pas, le contenu déjà présent dans la page reste affiché.
   ============================================================ */
(function () {
  'use strict';

  var config = window.SGT_CMS;
  var TIMEOUT_MS = 5000;

  var BOTTLE_SVG = '<svg class="bottle" viewBox="0 0 80 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="32" y="4" width="16" height="12" rx="2" fill="#20242a"/><path d="M33 16 L47 16 L47 40 C47 52 60 58 60 86 L60 214 C60 224 54 230 44 230 L36 230 C26 230 20 224 20 214 L20 86 C20 58 33 52 33 40 Z" fill="var(--glass)"/><rect x="22" y="150" width="36" height="52" rx="1" fill="#f4efe3"/><rect x="27" y="163" width="26" height="3" fill="#c4b79c"/><rect x="27" y="173" width="18" height="3" fill="#d6ccb5"/></svg>';
  var BOTTLE_CLASS = {
    rouge: 'bottle--red', blanc: 'bottle--white', rose: 'bottle--rose', effervescent: 'bottle--sparkling', doux: 'bottle--sweet',
    bieres: 'bottle--amber', spiritueux: 'bottle--amber'
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!config || !config.url || !config.key) return;
    document.querySelectorAll('[data-cms]').forEach(function (el) {
      var kind = el.getAttribute('data-cms');
      if (kind === 'nouveautes') loadNouveautes(el);
      else if (kind === 'produits') loadCategory(el);
      else if (kind === 'evenements') loadEvents(el);
    });
  });

  /* ---- Accès à l'API ------------------------------------------ */
  function fetchContent(type, params) {
    return fetchApi('content/' + type, params).then(function (body) { return body.items; });
  }

  /** Description des filtres d'un type (libellés, valeurs possibles), chargée une seule fois. */
  var schemaCache = {};
  function fetchSchema(type) {
    if (!schemaCache[type]) {
      schemaCache[type] = fetchApi('schema/' + type).catch(function (err) {
        delete schemaCache[type];
        throw err;
      });
    }
    return schemaCache[type];
  }

  function fetchApi(path, params) {
    var query = Object.keys(params || {}).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, TIMEOUT_MS);
    return fetch(config.url.replace(/\/$/, '') + '/api/v1/' + path + (query ? '?' + query : ''), {
      headers: { 'Authorization': 'Bearer ' + config.key },
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error('CMS : réponse ' + res.status);
        return res.json();
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function keepFallback(err) {
    console.warn('[CMS] Contenu indisponible, affichage du contenu par défaut.', err);
  }

  /* ---- Produits ----------------------------------------------- */
  function loadNouveautes(track) {
    fetchContent('produit', { nouveaute: 'true' }).then(function (items) {
      var section = track.closest('section');
      if (!items.length) { if (section) section.hidden = true; return; }
      replaceChildren(track, items.map(function (item) { return productCard(item); }));
      openFromHash(items);
    }, keepFallback);
  }

  function loadCategory(section) {
    var grid = section.querySelector('[data-cms-list]');
    var category = section.getAttribute('data-categorie');
    Promise.all([
      fetchContent('produit', { categorie: category }),
      // Sans la description des filtres, les produits s'affichent quand même (sans filtres).
      fetchSchema('produit').catch(function () { return null; })
    ]).then(function (res) {
      var items = res[0];
      if (!items.length) return; // section laissée masquée
      var filters = res[1] ? applicableFilters(res[1], category) : [];
      initCatalog(section, grid, items, filters);
      section.hidden = false;
      openFromHash(items);
    }, keepFallback);
  }

  /** Filtres propres à la catégorie (ex. couleur et région pour les vins). */
  function applicableFilters(schema, category) {
    return schema.filters.filter(function (f) {
      return !f.main && (!f.showIf || f.showIf['in'].indexOf(category) !== -1);
    });
  }

  /* ---- Catalogue filtrable (pages catégories) ----------------- */
  function initCatalog(section, grid, items, filters) {
    var params = new URLSearchParams(window.location.search);
    var state = { q: params.get('q') || '' };
    var labels = {};

    // Un filtre n'est proposé que s'il permet vraiment de choisir (au moins 2 valeurs présentes).
    var groups = filters.map(function (f) {
      labels[f.name] = {};
      f.options.forEach(function (o) { labels[f.name][o.value] = o.label; });
      var counts = {};
      items.forEach(function (i) { var v = i.data[f.name]; if (v) counts[v] = (counts[v] || 0) + 1; });
      var options = f.options.filter(function (o) { return counts[o.value]; });
      state[f.name] = counts[params.get(f.name)] ? params.get(f.name) : '';
      return { field: f, options: options, counts: counts };
    }).filter(function (g) { return g.options.length >= 2; });

    var bar = el('div', 'cms-filters');
    var chipsByField = {};
    groups.forEach(function (g) {
      var group = el('div', 'cms-filter-group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', g.field.label);
      group.appendChild(el('span', 'cms-filter-label', g.field.label));
      var chips = el('div', 'cms-chips');
      chipsByField[g.field.name] = chips;
      [{ value: '', label: 'Tous' }].concat(g.options).forEach(function (o) {
        var chip = el('button', 'cms-chip', o.label);
        chip.type = 'button';
        chip.setAttribute('data-value', o.value);
        if (o.value) chip.appendChild(el('span', 'cms-chip-count', String(g.counts[o.value])));
        chip.addEventListener('click', function () { state[g.field.name] = o.value; update(); });
        chips.appendChild(chip);
      });
      group.appendChild(chips);
      bar.appendChild(group);
    });

    var search = el('input', 'cms-search');
    search.type = 'search';
    search.placeholder = 'Rechercher un nom, un domaine…';
    search.setAttribute('aria-label', 'Rechercher un produit');
    search.value = state.q;
    search.addEventListener('input', function () { state.q = search.value; update(); });
    bar.appendChild(search);

    var count = el('p', 'cms-count');
    count.setAttribute('aria-live', 'polite');
    var empty = el('div', 'cms-empty');
    empty.appendChild(el('p', null, 'Aucun produit ne correspond à votre recherche.'));
    var reset = el('button', 'cms-reset u-underline', 'Voir tous les produits');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      Object.keys(state).forEach(function (k) { state[k] = ''; });
      search.value = '';
      update();
    });
    empty.appendChild(reset);

    section.insertBefore(bar, grid);
    section.insertBefore(count, grid);
    section.appendChild(empty);

    var cards = items.map(function (item) { return { item: item, node: productCard(item, true, labels) }; });
    replaceChildren(grid, cards.map(function (c) { return c.node; }));

    function matches(item) {
      var d = item.data;
      var ok = groups.every(function (g) { return !state[g.field.name] || d[g.field.name] === state[g.field.name]; });
      var q = normalize(state.q.trim());
      return ok && (!q || normalize([d.nom, d.producteur, d.description].join(' ')).indexOf(q) !== -1);
    }

    function update() {
      var shown = 0;
      cards.forEach(function (c) {
        var visible = matches(c.item);
        c.node.hidden = !visible;
        if (visible) shown++;
      });
      groups.forEach(function (g) {
        chipsByField[g.field.name].querySelectorAll('.cms-chip').forEach(function (chip) {
          var active = chip.getAttribute('data-value') === state[g.field.name];
          chip.classList.toggle('is-active', active);
          chip.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
      count.textContent = shown + ' produit' + (shown > 1 ? 's' : '');
      empty.hidden = shown > 0;
      // Les filtres sont gardés dans l'adresse : la page peut être partagée ou rechargée.
      var url = new URLSearchParams();
      Object.keys(state).forEach(function (k) { if (state[k]) url.set(k, state[k]); });
      var qs = url.toString();
      history.replaceState(history.state, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
    }
    update();
  }

  function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function productCard(item, withDescription, labels) {
    var d = item.data;
    var card = el('article', 'wine-card is-clickable');
    var media = el('div', 'wine-media');
    appendProductVisual(media, d, 'wine-photo', d.photo && d.photo.thumbnailUrl);
    card.appendChild(media);

    var info = el('div', 'wine-info');
    info.appendChild(el('h3', 'wine-name', d.nom));
    if (d.producteur) info.appendChild(el('p', 'wine-dom', d.producteur));
    // Critères lisibles sous le nom (ex. « Rouge · Bourgogne »), quand les libellés sont connus.
    if (labels) {
      var tags = Object.keys(labels).map(function (f) { return labels[f][d[f]]; }).filter(Boolean);
      if (tags.length) info.appendChild(el('p', 'wine-tags', tags.join(' · ')));
    }
    if (withDescription && d.description) info.appendChild(el('p', 'wine-desc', d.description));
    var meta = el('div', 'wine-meta');
    meta.appendChild(el('span', 'wine-year', d.millesime ? String(d.millesime) : ''));
    meta.appendChild(el('span', 'wine-price', formatPrice(d.prix)));
    info.appendChild(meta);
    info.appendChild(el('span', 'wine-more', 'Voir la fiche'));
    card.appendChild(info);

    // Toute la carte ouvre la fiche : un vrai bouton (clavier, lecteur d'écran) couvre la carte.
    var open = el('button', 'wine-card-link');
    open.type = 'button';
    open.setAttribute('aria-label', 'Voir la fiche : ' + (d.nom || 'produit'));
    open.setAttribute('aria-haspopup', 'dialog');
    open.addEventListener('click', function () { openProduct(item); });
    card.appendChild(open);
    return card;
  }

  /** Photo du produit, ou bouteille dessinée à la couleur du vin. */
  function appendProductVisual(container, d, imgClass, src) {
    if (d.photo && d.photo.url) {
      var img = el('img', imgClass);
      img.src = src || d.photo.url;
      img.alt = d.nom || '';
      img.loading = 'lazy';
      container.appendChild(img);
    } else {
      container.innerHTML = BOTTLE_SVG; // dessin statique, aucune donnée injectée
      container.firstChild.classList.add(BOTTLE_CLASS[d.type] || BOTTLE_CLASS[d.categorie] || 'bottle--white');
    }
  }

  /* ---- Fiche produit (grand affichage) ------------------------ */
  var dialog = null;
  var dialogFromHistory = false;
  var pushedHistory = false;
  var productsById = {};

  function openProduct(item) {
    productsById[item.id] = item;
    var dlg = getDialog();
    renderProduct(dlg.querySelector('[data-pd-body]'), item, null);
    // Les libellés (« Bourgogne ») arrivent avec la description des filtres.
    fetchSchema('produit').then(function (schema) {
      if (dlg.open && dlg.getAttribute('data-id') === item.id) {
        renderProduct(dlg.querySelector('[data-pd-body]'), item, schema);
      }
    }, function () {});
    dlg.setAttribute('data-id', item.id);
    if (!dlg.open) {
      dlg.showModal();
      document.body.style.overflow = 'hidden';
      // Une entrée d'historique : le bouton « retour » du téléphone ferme la fiche.
      if (!dialogFromHistory) {
        history.pushState({ produit: item.id }, '', window.location.pathname + window.location.search + '#produit-' + item.id);
        pushedHistory = true;
      }
    }
    dialogFromHistory = false;
  }

  function closeProduct(fromHistory) {
    if (!dialog || !dialog.open) return;
    dialog.close();
    document.body.style.overflow = '';
    if (!fromHistory) {
      // Ouverte par un clic : on revient simplement en arrière. Ouverte par un lien partagé :
      // on retire l'ancre sans quitter la page.
      if (pushedHistory) history.back();
      else history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    pushedHistory = false;
  }

  window.addEventListener('popstate', function () {
    var match = window.location.hash.match(/^#produit-(.+)$/);
    if (match && productsById[match[1]]) {
      dialogFromHistory = true;
      openProduct(productsById[match[1]]);
    } else {
      closeProduct(true);
    }
  });

  /** Ouvre la fiche indiquée dans l'adresse (lien partagé), une fois les produits chargés. */
  function openFromHash(items) {
    var match = window.location.hash.match(/^#produit-(.+)$/);
    items.forEach(function (i) { productsById[i.id] = i; });
    if (!match || !productsById[match[1]] || (dialog && dialog.open)) return;
    history.replaceState({ produit: match[1] }, '', window.location.href);
    dialogFromHistory = true;
    openProduct(productsById[match[1]]);
  }

  function getDialog() {
    if (dialog) return dialog;
    dialog = el('dialog', 'product-dialog');
    dialog.setAttribute('aria-label', 'Fiche produit');
    var close = el('button', 'pd-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Fermer la fiche');
    close.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
    close.addEventListener('click', function () { closeProduct(false); });
    dialog.appendChild(close);
    var body = el('div', 'pd-body');
    body.setAttribute('data-pd-body', '');
    dialog.appendChild(body);
    // Clic sur le fond sombre ou touche Échap : fermeture.
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeProduct(false); });
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeProduct(false); });
    document.body.appendChild(dialog);
    return dialog;
  }

  function renderProduct(body, item, schema) {
    var d = item.data;
    var labelOf = function (field, value) {
      if (!schema || !value) return value ? String(value) : '';
      var f = schema.filters.filter(function (x) { return x.name === field; })[0];
      var o = f && f.options.filter(function (x) { return x.value === value; })[0];
      return o ? o.label : String(value);
    };
    replaceChildren(body, []);

    var media = el('div', 'pd-media');
    appendProductVisual(media, d, 'pd-photo');
    body.appendChild(media);

    var info = el('div', 'pd-info');
    var category = labelOf('categorie', d.categorie);
    if (category) info.appendChild(el('span', 'pd-accroche', category));
    var title = el('h2', 'pd-name', d.nom);
    title.id = 'pd-title';
    info.appendChild(title);
    if (d.producteur) info.appendChild(el('p', 'pd-producer', d.producteur));
    if (d.nouveaute) info.appendChild(el('span', 'pd-badge', 'Nouveauté'));
    info.appendChild(el('p', 'pd-price', formatPrice(d.prix)));
    if (d.description) info.appendChild(el('p', 'pd-desc', d.description));

    // Caractéristiques : les critères de la catégorie, puis le millésime.
    var rows = [];
    if (schema) {
      schema.filters.forEach(function (f) {
        if (!f.main && d[f.name]) rows.push([f.label, labelOf(f.name, d[f.name])]);
      });
    }
    if (d.millesime) rows.push(['Millésime', String(d.millesime)]);
    if (rows.length) {
      info.appendChild(el('h3', 'pd-subtitle', 'Caractéristiques'));
      var dl = el('dl', 'pd-specs');
      rows.forEach(function (row) {
        var line = el('div', 'pd-spec');
        line.appendChild(el('dt', null, row[0]));
        line.appendChild(el('dd', null, row[1]));
        dl.appendChild(line);
      });
      info.appendChild(dl);
    }

    var actions = el('div', 'pd-actions');
    var contact = el('a', 'pd-cta', 'Une question ? Contactez-nous');
    contact.href = 'contact.html';
    actions.appendChild(contact);
    info.appendChild(actions);
    body.appendChild(info);
    dialog.setAttribute('aria-labelledby', 'pd-title');
  }

  /* ---- Événements --------------------------------------------- */
  function loadEvents(container) {
    var list = container.querySelector('[data-cms-list]');
    var empty = container.querySelector('[data-cms-empty]');
    var limit = container.getAttribute('data-limit');
    fetchContent('evenement', limit ? { limit: limit } : {}).then(function (items) {
      if (!items.length) {
        if (empty) { replaceChildren(list, []); empty.hidden = false; container.hidden = false; }
        else container.hidden = true;
        return;
      }
      if (empty) empty.hidden = true;
      replaceChildren(list, items.map(eventCard));
      container.hidden = false;
    }, function (err) {
      keepFallback(err);
      // Page Agenda : on prévient le visiteur plutôt que d'afficher une liste vide.
      if (empty) {
        empty.textContent = "L'agenda est momentanément indisponible. Appelez-nous au 06 16 28 52 20 pour connaître nos prochains rendez-vous.";
        empty.hidden = false;
      }
    });
  }

  function eventCard(item) {
    var d = item.data;
    var start = new Date(d.debut);
    var card = el('article', 'event-card');

    var date = el('div', 'event-date');
    date.appendChild(el('span', 'event-day', format(start, { day: 'numeric' })));
    date.appendChild(el('span', 'event-month', format(start, { month: 'short' }).replace('.', '')));
    card.appendChild(date);

    var body = el('div', 'event-body');
    if (d.image && d.image.url) {
      var img = el('img', 'event-img');
      img.src = d.image.thumbnailUrl || d.image.url;
      img.alt = '';
      img.loading = 'lazy';
      body.appendChild(img);
    }
    body.appendChild(el('h3', 'event-title', d.titre));
    var when = capitalize(format(start, { weekday: 'long', day: 'numeric', month: 'long' })) +
      ' · ' + formatTime(start) + (d.fin ? ' – ' + formatTime(new Date(d.fin)) : '');
    body.appendChild(el('p', 'event-when', when + (d.lieu ? ' · ' + d.lieu : '')));
    if (d.description) body.appendChild(el('p', 'event-desc', d.description));
    if (d.infos) body.appendChild(el('p', 'event-infos', d.infos));
    if (d.lien_inscription && /^https?:\/\//i.test(d.lien_inscription)) {
      var link = el('a', 'event-link u-underline', 'Réserver');
      link.href = d.lien_inscription;
      link.target = '_blank';
      link.rel = 'noopener';
      body.appendChild(link);
    }
    card.appendChild(body);
    return card;
  }

  /* ---- Utilitaires -------------------------------------------- */
  // Le texte est toujours inséré via textContent : aucune balise venant du CMS n'est interprétée.
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function replaceChildren(parent, children) {
    while (parent.firstChild) parent.removeChild(parent.firstChild);
    children.forEach(function (c) { parent.appendChild(c); });
  }

  function formatPrice(n) {
    return typeof n === 'number'
      ? n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
      : '';
  }

  function format(date, options) {
    options.timeZone = 'Europe/Paris';
    return date.toLocaleDateString('fr-FR', options);
  }

  function formatTime(date) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }).replace(':', 'h');
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
})();
