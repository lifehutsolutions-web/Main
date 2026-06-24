/**
 * LIFEHUT SOLUTIONS — Main JavaScript
 * Version: 1.0.0
 * Handles: Navigation, FAQ accordion, Scroll animations, Mobile menu, Year update
 */

(function () {
  'use strict';

  /* ────────────────────────────────────────
     UTILITIES
  ──────────────────────────────────────── */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ────────────────────────────────────────
     CURRENT YEAR IN FOOTER
  ──────────────────────────────────────── */
  function setCurrentYear() {
    const el = $('#currentYear');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ────────────────────────────────────────
     STICKY NAV — shadow on scroll
  ──────────────────────────────────────── */
  function initStickyNav() {
    const nav = $('.nav-wrapper');
    if (!nav) return;

    const onScroll = () => {
      if (window.scrollY > 20) {
        nav.style.boxShadow = '0 4px 32px rgba(0,0,0,0.4)';
      } else {
        nav.style.boxShadow = 'none';
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ────────────────────────────────────────
     MOBILE MENU TOGGLE
  ──────────────────────────────────────── */
  function initMobileMenu() {
    const toggle = $('#menuToggle');
    const menu = $('#mobileMenu');
    if (!toggle || !menu) return;

    const links = $$('.mobile-nav-link, .btn-mobile-cta', menu);

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      menu.classList.toggle('hidden');

      // Animate hamburger lines
      const lines = $$('.hamburger-line', toggle);
      if (!isOpen) {
        lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        lines[0].style.transform = '';
        lines[1].style.opacity = '';
        lines[2].style.transform = '';
      }
    });

    // Close on link click
    links.forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
        const lines = $$('.hamburger-line', toggle);
        lines[0].style.transform = '';
        lines[1].style.opacity = '';
        lines[2].style.transform = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !menu.contains(e.target)) {
        if (!menu.classList.contains('hidden')) {
          menu.classList.add('hidden');
          toggle.setAttribute('aria-expanded', 'false');
          const lines = $$('.hamburger-line', toggle);
          lines[0].style.transform = '';
          lines[1].style.opacity = '';
          lines[2].style.transform = '';
        }
      }
    });
  }

  /* ────────────────────────────────────────
     FAQ ACCORDION
  ──────────────────────────────────────── */
  function initFAQ() {
    const questions = $$('.faq-question');

    questions.forEach(btn => {
      btn.addEventListener('click', () => {
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        const answerId = btn.getAttribute('aria-controls');
        const answer = document.getElementById(answerId);

        // Close all others
        questions.forEach(otherBtn => {
          if (otherBtn !== btn) {
            otherBtn.setAttribute('aria-expanded', 'false');
            const otherId = otherBtn.getAttribute('aria-controls');
            const otherAnswer = document.getElementById(otherId);
            if (otherAnswer) otherAnswer.hidden = true;
          }
        });

        // Toggle this one
        btn.setAttribute('aria-expanded', String(!isExpanded));
        if (answer) answer.hidden = isExpanded;
      });
    });
  }

  /* ────────────────────────────────────────
     SCROLL REVEAL ANIMATION
  ──────────────────────────────────────── */
  function initScrollReveal() {
    // Add reveal class to elements
    const elements = $$(
      '.product-card, .testimonial-card, .hiw-step, .pricing-card, .faq-item, .result-stat'
    );

    elements.forEach((el, i) => {
      el.classList.add('reveal');
      // Stagger cards within their containers
      const parent = el.parentElement;
      const siblings = $$('.reveal', parent);
      const index = siblings.indexOf(el);
      if (index < 3) {
        el.classList.add(`reveal-delay-${index + 1}`);
      }
    });

    if (!('IntersectionObserver' in window)) {
      // Fallback: show all immediately
      elements.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    elements.forEach(el => observer.observe(el));
  }

  /* ────────────────────────────────────────
     SMOOTH SCROLL FOR ANCHOR LINKS
  ──────────────────────────────────────── */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;

        const target = document.getElementById(href.slice(1));
        if (!target) return;

        e.preventDefault();

        const navHeight = $('.nav-wrapper')?.offsetHeight ?? 68;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  /* ────────────────────────────────────────
     ACTIVE NAV LINK HIGHLIGHT
  ──────────────────────────────────────── */
  function initActiveNav() {
    const sections = $$('section[id]');
    const navLinks = $$('.nav-link');
    if (!sections.length || !navLinks.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              if (href === `#${id}`) {
                link.style.color = 'var(--pearl)';
                link.style.background = 'rgba(255,255,255,0.06)';
              } else {
                link.style.color = '';
                link.style.background = '';
              }
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    sections.forEach(section => observer.observe(section));
  }

  /* ────────────────────────────────────────
     ANNOUNCEMENT BAR DISMISS
  ──────────────────────────────────────── */
  function initAnnouncementBar() {
    const bar = $('.announcement-bar');
    if (!bar) return;

    // Dismiss if previously closed
    if (sessionStorage.getItem('lh-bar-dismissed')) {
      bar.style.display = 'none';
    }
  }

  /* ────────────────────────────────────────
     COUNT-UP ANIMATION FOR STATS
  ──────────────────────────────────────── */
  function initCountUp() {
    const stats = $$('.result-num');
    if (!stats.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateNumber(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    stats.forEach(stat => observer.observe(stat));
  }

  function animateNumber(el) {
    const text = el.textContent.trim();
    // Extract numeric value
    const match = text.match(/[\d,.]+/);
    if (!match) return;

    const numStr = match[0].replace(/,/g, '');
    const num = parseFloat(numStr);
    if (isNaN(num)) return;

    const prefix = text.split(match[0])[0];
    const suffix = text.slice(prefix.length + match[0].length);
    const duration = 1800;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = num * eased;

      let display;
      if (num >= 1000) {
        display = Math.round(current).toLocaleString('en-IN');
      } else if (num < 10) {
        display = current.toFixed(1);
      } else {
        display = Math.round(current).toLocaleString('en-IN');
      }

      el.textContent = prefix + display + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  /* ────────────────────────────────────────
     INIT ALL
  ──────────────────────────────────────── */
  function init() {
    setCurrentYear();
    initStickyNav();
    initMobileMenu();
    initFAQ();
    initScrollReveal();
    initSmoothScroll();
    initActiveNav();
    initAnnouncementBar();
    initCountUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
