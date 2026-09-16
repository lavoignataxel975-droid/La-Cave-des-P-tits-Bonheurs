/* ============================================================
   La Cave des P'tits Bonheurs — comportements
   - Header sticky révélé au scroll
   - Menu plein écran (ouverture/fermeture avec fondu)
   - Formulaire Contact (confirmation, sans envoi réel)
   ============================================================ */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initHeaderReveal();
    initMenu();
    initContactForm();
    initCarousel();
  });

  /* ---- Carrousel Nouveautés --------------------------------- */
  function initCarousel() {
    document.querySelectorAll('[data-carousel]').forEach(function (c) {
      var track = c.querySelector('[data-carousel-track]');
      if (!track) return;
      var prev = c.querySelector('[data-carousel-prev]');
      var next = c.querySelector('[data-carousel-next]');

      function step() {
        var card = track.querySelector('.wine-card');
        var gap = 22;
        return card ? card.getBoundingClientRect().width + gap : 240;
      }
      prev && prev.addEventListener('click', function () { track.scrollBy({ left: -step() * 2, behavior: 'smooth' }); });
      next && next.addEventListener('click', function () { track.scrollBy({ left: step() * 2, behavior: 'smooth' }); });
    });
  }

  /* ---- Header révélé au scroll ------------------------------ */
  function initHeaderReveal() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var sentinel = document.querySelector('[data-header-sentinel]');
    var threshold = parseInt(header.getAttribute('data-scroll-threshold'), 10) || 120;

    function setVisible(visible) {
      header.classList.toggle('is-visible', visible);
    }

    // Repli sur seuil de scroll en pixels
    function onScroll() {
      var y = document.documentElement.scrollTop || document.body.scrollTop || window.pageYOffset || 0;
      setVisible(y > threshold);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Observation de la première section : header masqué tant qu'elle est visible
    if (sentinel && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        setVisible(!entries[0].isIntersecting);
      }, { threshold: 0 });
      io.observe(sentinel);
    }
  }

  /* ---- Menu plein écran ------------------------------------- */
  function initMenu() {
    var overlay = document.querySelector('.menu-overlay');
    if (!overlay) return;

    var openBtns = document.querySelectorAll('[data-menu-open]');
    var closeEls = overlay.querySelectorAll('[data-menu-close]');
    var closeTimer = null;

    function openMenu() {
      if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      overlay.classList.add('is-mounted');
      // double rAF pour déclencher la transition d'opacité après le montage
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.classList.add('is-visible');
        });
      });
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      overlay.classList.remove('is-visible');
      document.body.style.overflow = '';
      closeTimer = setTimeout(function () {
        overlay.classList.remove('is-mounted');
      }, 380);
    }

    openBtns.forEach(function (btn) { btn.addEventListener('click', openMenu); });
    closeEls.forEach(function (el) { el.addEventListener('click', closeMenu); });

    // Échap pour fermer
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-visible')) closeMenu();
    });
  }

  /* ---- Formulaire Contact ---------------------------------- */
  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var msg = form.querySelector('.sent-msg');
    var btn = form.querySelector('.btn-send');
    var btnLabel = btn ? btn.textContent : 'Envoyer';
    var action = form.getAttribute('action') || '';
    var configured = action && action.indexOf('VOTRE_ID') === -1 && /^https?:\/\//.test(action);

    function show(text, isError) {
      if (!msg) return;
      msg.textContent = text;
      msg.classList.toggle('is-error', !!isError);
      msg.classList.add('is-sent');
    }
    function setBusy(busy) {
      if (!btn) return;
      btn.disabled = busy;
      btn.textContent = busy ? 'Envoi…' : btnLabel;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Validation native (champs requis, format e-mail)
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

      // Mode démonstration tant qu'aucun service n'est configuré
      if (!configured) {
        show('Merci, à très vite !', false);
        console.warn('[Contact] Formulaire en mode démo : renseignez l\'attribut action (Formspree) pour activer l\'envoi réel.');
        return;
      }

      setBusy(true);
      msg && msg.classList.remove('is-sent');

      fetch(action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            show('Merci, votre message est bien parti. À très vite !', false);
          } else {
            return res.json().then(function (data) {
              var m = (data && data.errors && data.errors.map(function (x) { return x.message; }).join(', ')) || '';
              show(m || 'Oups, l\'envoi a échoué. Réessayez ou appelez-nous au 06 83 20 40 87.', true);
            }).catch(function () {
              show('Oups, l\'envoi a échoué. Réessayez ou appelez-nous au 06 83 20 40 87.', true);
            });
          }
        })
        .catch(function () {
          show('Connexion impossible. Vérifiez votre réseau ou appelez-nous au 06 83 20 40 87.', true);
        })
        .finally(function () { setBusy(false); });
    });
  }
})();
