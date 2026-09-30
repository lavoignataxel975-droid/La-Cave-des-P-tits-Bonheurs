/* La Cave des P'tits Bonheurs — V2 : comportements généraux
   header, menu mobile, apparitions, statut d'ouverture, carrousels, formulaire. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* Horaires (heure de Paris). 0 = dimanche. */
  var HOURS = {
    0: [[10, 0, 12, 30]],
    1: [],
    2: [[10, 0, 12, 30], [16, 0, 19, 30]], 3: [[10, 0, 12, 30], [16, 0, 19, 30]],
    4: [[10, 0, 12, 30], [16, 0, 19, 30]], 5: [[10, 0, 12, 30], [16, 0, 19, 30]],
    6: [[10, 0, 12, 30], [16, 0, 19, 30]]
  };
  var DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var hm = function (h, m) { return h + 'h' + (m ? String(m).padStart(2, '0') : ''); };

  function parisNow() {
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var get = function (t) { return (p.filter(function (x) { return x.type === t; })[0] || {}).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: day, min: Number(get('hour')) % 24 * 60 + Number(get('minute')) };
  }

  function openingStatus() {
    var now = parisNow();
    var slots = HOURS[now.day];
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i], a = s[0] * 60 + s[1], b = s[2] * 60 + s[3];
      if (now.min >= a && now.min < b) return { open: true, text: 'Ouvert · jusqu’à ' + hm(s[2], s[3]) };
      if (now.min < a) return { open: false, text: 'Fermé · ouvre à ' + hm(s[0], s[1]) };
    }
    for (var k = 1; k <= 7; k++) {
      var d = (now.day + k) % 7;
      if (HOURS[d].length) {
        var f = HOURS[d][0];
        return { open: false, text: 'Fermé · ouvre ' + (k === 1 ? 'demain' : DAYS[d]) + ' à ' + hm(f[0], f[1]) };
      }
    }
    return { open: false, text: 'Fermé' };
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* statut d'ouverture + jour en cours dans le tableau des horaires */
    var st = openingStatus();
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.textContent = st.text;
      el.classList.toggle('is-open', st.open);
    });
    var today = parisNow().day;
    document.querySelectorAll('[data-day]').forEach(function (el) {
      if (Number(el.getAttribute('data-day')) === today) el.classList.add('is-today');
    });

    /* header au scroll */
    var header = document.querySelector('.header');
    var onScroll = function () { header && header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* menu mobile */
    var menu = document.querySelector('[data-menu]');
    var opener = document.querySelector('[data-menu-open]');
    function setMenu(open) {
      if (!menu) return;
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      document.body.style.overflow = open ? 'hidden' : '';
      opener && opener.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('[data-menu-close]').focus();
      else opener && opener.focus();
    }
    if (menu) {
      menu.inert = true;
      opener && opener.addEventListener('click', function () { setMenu(true); });
      menu.querySelectorAll('[data-menu-close], nav a').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });
    }

    /* apparitions au défilement */
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) { io ? io.observe(el) : el.classList.add('is-in'); });

    /* carrousels : boutons précédent / suivant */
    document.querySelectorAll('[data-rail]').forEach(function (wrap) {
      var rail = wrap.querySelector('.rail');
      var step = function (dir) {
        var card = rail.firstElementChild;
        var w = card ? card.getBoundingClientRect().width + 20 : 280;
        rail.scrollBy({ left: dir * w, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      };
      var prev = wrap.querySelector('[data-rail-prev]'), next = wrap.querySelector('[data-rail-next]');
      prev && prev.addEventListener('click', function () { step(-1); });
      next && next.addEventListener('click', function () { step(1); });
    });

    /* formulaire de contact (Formspree ; mode démonstration tant que VOTRE_ID est présent) */
    var form = document.querySelector('[data-contact-form]');
    if (form) {
      var status = form.querySelector('[data-form-status]');
      var btn = form.querySelector('[type="submit"]');
      var say = function (msg, kind) { status.textContent = msg; status.className = 'form-status' + (kind ? ' is-' + kind : ''); };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var action = form.getAttribute('action') || '';
        if (action.indexOf('VOTRE_ID') !== -1) {
          say('Merci ! Votre message est prêt (formulaire en mode démonstration).', 'ok');
          form.reset();
          return;
        }
        btn.disabled = true;
        var label = btn.textContent;
        btn.textContent = 'Envoi en cours…';
        say('');
        fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            form.reset();
            say('Merci ! Votre message a bien été envoyé. Nous vous répondons rapidement.', 'ok');
          })
          .catch(function () { say('L’envoi a échoué. Réessayez, ou appelez-nous au 06 16 28 52 20.', 'error'); })
          .finally(function () { btn.disabled = false; btn.textContent = label; });
      });
    }

    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  });
})();
