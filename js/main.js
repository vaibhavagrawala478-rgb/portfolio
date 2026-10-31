/* Vaibhav — portfolio interactions. No dependencies. */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const prefersReduced = () => reduceMotion.matches;

  /* ------------------------------------------------------------------ *
   * Intro + page-load choreography
   * ------------------------------------------------------------------ */
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reveal = () => root.classList.add('is-loaded');

  function runIntro() {
    const num = $('#intro-num');
    const duration = 1900;
    // start clean: no restored scroll position hiding under the curtain
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      num.textContent = '100';
      Promise.race([fontsReady, wait(900)]).then(() => {
        root.classList.add('intro-out');
        setTimeout(reveal, 380);
        setTimeout(() => {
          root.classList.add('intro-done');
          try { sessionStorage.setItem('vaibhav-intro', '1'); } catch (e) { /* private mode */ }
        }, 1400);
      });
    }
    function step(now) {
      const t = clamp((now - t0) / duration, 0, 1);
      num.textContent = String(Math.round(ease(t) * 100)).padStart(2, '0');
      if (t < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);
    setTimeout(finish, 5000); // failsafe if rAF is throttled
  }

  if (root.classList.contains('has-intro')) runIntro();
  else Promise.race([fontsReady, wait(1200)]).then(reveal);

  /* ------------------------------------------------------------------ *
   * Header: condense on scroll, hide on scroll-down, progress bar
   * ------------------------------------------------------------------ */
  const header = $('#site-header');
  const progress = $('.scroll-progress');
  let lastY = window.scrollY;
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    header.classList.toggle('is-scrolled', y > 40);
    const delta = y - lastY;
    if (!document.body.classList.contains('menu-open') && Math.abs(delta) > 6) {
      header.classList.toggle('is-hidden', delta > 0 && y > 240);
      lastY = y;
    }
    if (y < 40) header.classList.remove('is-hidden');
  }
  const requestScrollFrame = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); }
  };
  window.addEventListener('scroll', requestScrollFrame, { passive: true });
  window.addEventListener('resize', requestScrollFrame);
  onScrollFrame();

  /* ------------------------------------------------------------------ *
   * Mobile menu
   * ------------------------------------------------------------------ */
  const toggle = $('.menu-toggle');
  const inertTargets = [$('#main'), $('.site-footer')];
  const navMq = matchMedia('(max-width: 900px)');

  function setMenu(open, { returnFocus = false } = {}) {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    inertTargets.forEach((el) => el && (el.inert = open));
    if (open) header.classList.remove('is-hidden');
    if (!open && returnFocus) toggle.focus();
  }
  toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.primary-nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false, { returnFocus: true });
  });
  navMq.addEventListener('change', (e) => { if (!e.matches) setMenu(false); });

  /* ------------------------------------------------------------------ *
   * Split headings into masked words (kept accessible via aria-label)
   * ------------------------------------------------------------------ */
  function splitWords(el) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    let i = 0;
    const walk = (node) => {
      const frag = document.createDocumentFragment();
      node.childNodes.forEach((child) => {
        if (child.nodeType === 3) {
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            const wi = document.createElement('span');
            w.className = 'w';
            wi.className = 'wi';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.append(wi);
            frag.append(w);
          });
        } else if (child.nodeName === 'BR') {
          frag.append(child.cloneNode());
        } else {
          const clone = child.cloneNode(false);
          clone.append(walk(child));
          frag.append(clone);
        }
      });
      return frag;
    };
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.append(walk(el));
    el.replaceChildren(wrap);
    el.setAttribute('aria-label', label);
  }
  $$('[data-split]').forEach(splitWords);

  /* ------------------------------------------------------------------ *
   * Scroll reveals + active nav link
   * ------------------------------------------------------------------ */
  const revealEls = $$('[data-reveal], [data-split]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => io.observe(el));

    const links = $$('a[data-nav]');
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          const on = a === byId.get(entry.target.id);
          a.classList.toggle('is-active', on);
          on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) links.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
    }, { rootMargin: '-40% 0px -55% 0px' }).observe($('#top'));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ------------------------------------------------------------------ *
   * Bubbles — a tiny canvas particle system (hero + contact)
   * ------------------------------------------------------------------ */
  class Bubbles {
    constructor(canvas, { density = 1 } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.density = density;
      this.items = [];
      this.sparks = [];
      this.rings = [];
      this.pointer = { x: -999, y: -999 };
      this.visible = false;
      this.raf = 0;
      this.last = 0;
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      this.resize();
      window.addEventListener('resize', this.resize);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.sync(); }).observe(canvas);
      } else {
        this.visible = true;
      }
      document.addEventListener('visibilitychange', () => this.sync());
      reduceMotion.addEventListener('change', () => { this.draw(); this.sync(); });
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, rect.width);
      this.h = Math.max(1, rect.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = clamp(Math.round((this.w * this.h) / 24000 * this.density), 10, 48);
      while (this.items.length < target) this.items.push(this.spawn(true));
      this.items.length = Math.min(this.items.length, target);
      this.draw();
    }

    spawn(anywhere) {
      const r = 3 + Math.pow(Math.random(), 2.2) * 24;
      return {
        x: Math.random() * this.w,
        y: anywhere ? Math.random() * this.h : this.h + r + Math.random() * 60,
        r,
        vy: 8 + (28 - r) * 1.3 + Math.random() * 10,
        vx: 0,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 0.9,
      };
    }

    burst(x, y) {
      if (prefersReduced()) return;
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 60 + Math.random() * 180;
        this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, r: 2 + Math.random() * 7, life: 1 });
      }
      this.sync();
    }

    /* Click: send out a ripple, shove nearby bubbles, pop any bubble under the cursor */
    interact(x, y) {
      if (prefersReduced()) return;
      this.rings.push({ x, y, r: 6, life: 1 });
      for (const b of this.items) {
        const dx = b.x - x;
        const dy = b.y - y;
        const d = Math.hypot(dx, dy);
        if (d < b.r + 10) {
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2 + Math.random();
            this.sparks.push({ x: b.x, y: b.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, r: 1.5 + Math.random() * 2.5, life: 1 });
          }
          this.rings.push({ x: b.x, y: b.y, r: b.r, life: 0.85 });
          Object.assign(b, this.spawn(false));
        } else if (d < 180) {
          b.vx += (dx / d) * (1 - d / 180) * 420;
          b.y += (dy / d) * (1 - d / 180) * 24;
        }
      }
      this.sync();
    }

    sync() {
      const busy = this.sparks.length > 0 || this.rings.length > 0;
      const run = (this.visible && !document.hidden && !prefersReduced()) || busy;
      if (run && !this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame(this.tick);
      } else if (!run && this.raf) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      }
    }

    tick(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      const t = now / 1000;
      const { pointer } = this;

      if (!prefersReduced() && this.visible) {
        for (const b of this.items) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const reach = 130 + b.r;
          if (d < reach && d > 0.01) {
            const f = (1 - d / reach) * 520 * dt;
            b.vx += (dx / d) * f;
            b.y += (dy / d) * f * 0.6;
          }
          b.vx *= 1 - Math.min(1, 2.2 * dt);
          b.x += b.vx * dt + Math.sin(t * b.sp + b.ph) * 14 * dt;
          b.y -= b.vy * dt;
          if (b.y < -b.r - 10) Object.assign(b, this.spawn(false));
        }
      }
      for (const s of this.sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 160 * dt;
        s.life -= dt * 1.1;
      }
      this.sparks = this.sparks.filter((s) => s.life > 0);
      for (const r of this.rings) {
        r.r += 260 * dt;
        r.life -= dt * 1.5;
      }
      this.rings = this.rings.filter((r) => r.life > 0);

      this.draw();
      this.raf = requestAnimationFrame(this.tick);
      if (!this.visible && !this.sparks.length && !this.rings.length) this.sync();
    }

    draw() {
      const { ctx } = this;
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.lineWidth = 1.2;
      for (const b of this.items) {
        const a = 0.12 + (b.r / 27) * 0.32;
        ctx.strokeStyle = `rgba(244, 239, 228, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        if (b.r > 9) {
          ctx.strokeStyle = `rgba(201, 242, 90, ${(a * 1.4).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.66, Math.PI * 1.15, Math.PI * 1.5);
          ctx.stroke();
        }
      }
      for (const s of this.sparks) {
        ctx.strokeStyle = `rgba(201, 242, 90, ${clamp(s.life, 0, 1).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const r of this.rings) {
        ctx.strokeStyle = `rgba(201, 242, 90, ${(clamp(r.life, 0, 1) * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  const heroEl = $('#top');
  const heroCanvas = $('#hero-bubbles');
  const contactCanvas = $('#contact-bubbles');
  const heroBubbles = heroCanvas && new Bubbles(heroCanvas, { density: 1 });
  const contactBubbles = contactCanvas && new Bubbles(contactCanvas, { density: 0.8 });

  /* ------------------------------------------------------------------ *
   * Pointer state shared by the cursor, weight-reactive type and hero
   * ------------------------------------------------------------------ */
  const cur = { x: -200, y: -200, rx: -200, ry: -200, px: -200, lean: 0, active: false };
  const vEl = $('.cursor-v');
  const labelEl = $('.cursor-label');

  if (finePointer.matches) {
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      cur.x = e.clientX;
      cur.y = e.clientY;
      if (!cur.active && !prefersReduced()) {
        cur.active = true;
        cur.rx = cur.x;
        cur.ry = cur.y;
        root.classList.add('has-cursor');
      }
      const t = e.target;
      const view = t.closest && t.closest('.proj');
      const link = t.closest && t.closest('a, button, [role="button"], summary, label');
      vEl.classList.toggle('is-link', Boolean(link) && !view);
      vEl.classList.toggle('is-view', Boolean(view));
      labelEl.classList.toggle('is-view', Boolean(view));
    }, { passive: true });
    document.addEventListener('pointerdown', () => vEl.classList.add('is-down'));
    document.addEventListener('pointerup', () => vEl.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => {
      vEl.classList.add('is-hidden');
      labelEl.classList.remove('is-view');
    });
    document.documentElement.addEventListener('pointerenter', () => {
      vEl.classList.remove('is-hidden');
    });

    const dish = $('.dish');
    heroEl.addEventListener('pointermove', (e) => {
      if (heroBubbles) {
        const r = heroCanvas.getBoundingClientRect();
        heroBubbles.pointer.x = e.clientX - r.left;
        heroBubbles.pointer.y = e.clientY - r.top;
      }
      if (!prefersReduced()) {
        dish.style.setProperty('--mx', `${((e.clientX / window.innerWidth) - 0.5) * 34}px`);
        dish.style.setProperty('--my', `${((e.clientY / window.innerHeight) - 0.5) * 34}px`);
      }
    });
    heroEl.addEventListener('pointerleave', () => {
      if (heroBubbles) heroBubbles.pointer.x = heroBubbles.pointer.y = -999;
      dish.style.setProperty('--mx', '0px');
      dish.style.setProperty('--my', '0px');
    });
    heroEl.addEventListener('click', (e) => {
      if (!heroBubbles || e.target.closest('a, button')) return;
      const r = heroCanvas.getBoundingClientRect();
      heroBubbles.interact(e.clientX - r.left, e.clientY - r.top);
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        if (prefersReduced()) return;
        const r = el.getBoundingClientRect();
        const x = clamp((e.clientX - (r.left + r.width / 2)) * 0.18, -10, 10);
        const y = clamp((e.clientY - (r.top + r.height / 2)) * 0.28, -8, 8);
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.proj').forEach((card) => {
      const frameEl = $('.frame', card);
      card.addEventListener('pointermove', (e) => {
        const r = frameEl.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        frameEl.style.setProperty('--sx', `${clamp(x, 0, r.width).toFixed(0)}px`);
        frameEl.style.setProperty('--sy', `${clamp(y, 0, r.height).toFixed(0)}px`);
        if (!prefersReduced()) {
          frameEl.style.setProperty('--ry', `${((x / r.width) - 0.5) * 5}deg`);
          frameEl.style.setProperty('--rx', `${-((y / r.height) - 0.5) * 4}deg`);
        }
      });
      card.addEventListener('pointerleave', () => {
        frameEl.style.setProperty('--rx', '0deg');
        frameEl.style.setProperty('--ry', '0deg');
      });
    });
  }

  // Whole card is clickable for mouse users; keyboard users use the real link.
  $$('.proj').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      $('.proj-link', card).click();
    });
  });

  /* ------------------------------------------------------------------ *
   * Master animation loop: smoothed scroll, parallax, ticker, tiles,
   * weight-reactive letters, water-filled wordmark, cursor
   * ------------------------------------------------------------------ */
  const parallaxEls = $$('[data-parallax]').map((el) => ({
    el, factor: parseFloat(el.dataset.parallax) || 0, section: el.closest('section') || el.parentElement,
  }));
  const bgwords = $$('.bgword').map((el) => ({ el, section: el.parentElement }));
  const grid = $('.elements');
  const tiles = $$('.el', grid);
  const projImgs = $$('.frame-view img').map((img) => ({ img, view: img.parentElement }));
  const marquee = $('.marquee');
  const track = $('.marquee-track');
  const wordmark = $('.wordmark');
  const wm = $('.wm');

  /* ---- toolkit: animated connections between the hub and each group ---- */
  const eco = $('.eco');
  const ecoCore = eco && $('.eco-core', eco);
  const ecoGroups = eco ? $$('.eco-group', eco) : [];
  const ecoPaths = eco ? Object.fromEntries($$('.eco-link', eco).map((p) => [p.dataset.for, p])) : {};
  const tether = eco && $('.eco-tether', eco);
  const ecoMq = matchMedia('(min-width: 901px)');
  let tetherTool = null;

  function updateEco(force) {
    if (!eco || !ecoMq.matches) return;
    const er = eco.getBoundingClientRect();
    if (!force && (er.bottom < -120 || er.top > window.innerHeight + 120)) return;
    const cr = ecoCore.getBoundingClientRect();
    const cx = cr.left + cr.width / 2 - er.left;
    const cy = cr.top + cr.height / 2 - er.top;
    const r = cr.width * 0.42;
    const f = (n) => n.toFixed(1);

    for (const g of ecoGroups) {
      const path = ecoPaths[g.dataset.group];
      if (!path) continue;
      const lab = $('.eco-label', g).getBoundingClientRect();
      let d;
      if (g.dataset.group === 'make') {
        const ex = lab.right - er.left;
        const ey = lab.bottom - er.top;
        d = `M${f(cx - r)} ${f(cy)} C${f(cx - r - 70)} ${f(cy)} ${f(ex + 70)} ${f(ey)} ${f(ex)} ${f(ey)}`;
      } else if (g.dataset.group === 'ai') {
        const ex = lab.right - er.left - 48;
        const ey = lab.top - er.top - 6;
        const sy = cy + r;
        d = `M${f(cx)} ${f(sy)} C${f(cx)} ${f(sy + (ey - sy) * 0.55)} ${f(ex)} ${f(ey - (ey - sy) * 0.55)} ${f(ex)} ${f(ey)}`;
      } else {
        const ex = lab.right - er.left - 6;
        const ey = lab.top - er.top - 6;
        const sx = cx - r * 0.72;
        const sy = cy + r * 0.72;
        d = `M${f(sx)} ${f(sy)} C${f(sx - 60)} ${f(sy + 110)} ${f(ex + 16)} ${f(ey - 110)} ${f(ex)} ${f(ey)}`;
      }
      path.setAttribute('d', d);
    }

    if (tetherTool) {
      const tr = tetherTool.getBoundingClientRect();
      const tx = tr.left + tr.width / 2 - er.left;
      const ty = tr.top + tr.height / 2 - er.top;
      tether.setAttribute('d', `M${f(tx)} ${f(ty)} Q${f((tx + cx) / 2)} ${f(Math.min(ty, cy) - 70)} ${f(cx)} ${f(cy)}`);
    }
  }

  if (eco) {
    const setTether = (tool) => {
      tetherTool = tool;
      eco.classList.toggle('is-tether', Boolean(tool));
      updateEco(true);
    };
    eco.addEventListener('pointerover', (e) => {
      const tool = e.target.closest && e.target.closest('.tool');
      if (tool !== tetherTool) setTether(tool);
    });
    eco.addEventListener('pointerleave', () => setTether(null));
    ecoGroups.forEach((g) => {
      g.addEventListener('pointerenter', () => ecoPaths[g.dataset.group] && ecoPaths[g.dataset.group].classList.add('is-on'));
      g.addEventListener('pointerleave', () => ecoPaths[g.dataset.group] && ecoPaths[g.dataset.group].classList.remove('is-on'));
    });
    window.addEventListener('resize', () => updateEco(true));
    ecoMq.addEventListener('change', () => updateEco(true));
    fontsReady.then(() => updateEco(true));
    updateEco(true);
  }

  const weightSets = [
    { els: $$('.hero-name .char:not(.dot)'), base: 600, max: 800, reach: 0.95 },
    { els: $$('.wm-char'), base: 500, max: 800, reach: 0.8 },
  ].map((set) => ({ ...set, state: set.els.map(() => set.base) }));

  // scatter offsets for the assembling element tiles
  const TX = [-90, 70, 120, -110, 40, 90];
  const TY = [120, -100, 140, 150, -130, 110];
  const TR = [-16, 14, -20, 18, -12, 22];
  tiles.forEach((el, i) => {
    el.style.setProperty('--tx', `${TX[i % 6]}px`);
    el.style.setProperty('--ty', `${TY[i % 6]}px`);
    el.style.setProperty('--r', `${TR[i % 6]}deg`);
  });

  const M = { sy: window.scrollY, prevY: window.scrollY, vel: 0, last: performance.now(), fill: 0 };
  const mq = { x: 0, dir: 1, dirTarget: 1, half: 0, visible: true };

  function measureMarquee() {
    if (track) mq.half = track.scrollWidth / 2;
  }
  if (track && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { mq.visible = e.isIntersecting; }).observe(marquee);
  }
  window.addEventListener('resize', measureMarquee);
  fontsReady.then(measureMarquee);
  measureMarquee();

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0.001, (now - M.last) / 1000));
    M.last = now;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const k = 1 - Math.pow(0.0008, dt); // frame-rate independent easing factor

    M.sy += (y - M.sy) * k * 0.9;
    M.vel += (((y - M.prevY) / dt) - M.vel) * clamp(dt * 8, 0, 1);
    M.prevY = y;
    const lag = y - M.sy; // how far the "smoothed" scroll trails the real one

    // ---- reads ----
    const heroVisible = y < vh * 1.3;
    const secTop = new Map();
    const topOf = (el) => {
      if (!secTop.has(el)) secTop.set(el, el.getBoundingClientRect().top + lag);
      return secTop.get(el);
    };

    // ---- hero exit ----
    if (heroVisible) heroEl.style.setProperty('--hp', clamp(M.sy / (vh * 0.85), 0, 1).toFixed(3));

    // ---- parallax (hero art, toolkit groups) ----
    for (const p of parallaxEls) {
      const top = topOf(p.section);
      if (top > vh * 1.6 || top < -p.section.offsetHeight - vh * 0.6) continue;
      p.el.style.setProperty('--py', `${(top * p.factor).toFixed(1)}px`);
    }

    updateEco(false);

    // ---- giant background words ----
    for (const b of bgwords) {
      const top = topOf(b.section);
      if (top > vh * 1.4 || top < -b.section.offsetHeight - vh * 0.4) continue;
      b.el.style.setProperty('--bx', `${(top * 0.42).toFixed(1)}px`);
    }

    // ---- project image parallax ----
    for (const p of projImgs) {
      const r = p.view.getBoundingClientRect();
      const c = r.top + r.height / 2 + lag;
      if (c < -r.height || c > vh + r.height) continue;
      p.img.style.setProperty('--iy', `${(clamp((c - vh / 2) / vh, -1, 1) * -3.4).toFixed(2)}%`);
    }

    // ---- element tiles assemble ----
    if (grid) {
      const top = topOf(grid);
      const p = easeOut(clamp((vh * 0.95 - top) / (vh * 0.55), 0, 1));
      grid.style.setProperty('--ap', p.toFixed(3));
    }

    // ---- scroll-velocity ticker ----
    if (track && mq.half && mq.visible) {
      if (Math.abs(M.vel) > 40) mq.dirTarget = M.vel > 0 ? 1 : -1;
      mq.dir += (mq.dirTarget - mq.dir) * clamp(dt * 3, 0, 1);
      const speed = 70 + Math.min(Math.abs(M.vel), 3200) * 0.32;
      mq.x -= speed * mq.dir * dt;
      if (mq.x <= -mq.half) mq.x += mq.half;
      if (mq.x > 0) mq.x -= mq.half;
      const skew = clamp(-M.vel * 0.0016, -5, 5);
      track.style.transform = `translate3d(${mq.x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
    }

    // ---- weight-reactive letters ----
    for (const set of weightSets) {
      set.els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        let target = set.base;
        if (cur.active && r.bottom > -300 && r.top < vh + 300) {
          const d = Math.hypot(cur.x - (r.left + r.width / 2), cur.y - (r.top + r.height / 2));
          const t = clamp(1 - d / (r.height * set.reach), 0, 1);
          target = set.base + (set.max - set.base) * t * t;
        }
        const w = set.state[i] + (target - set.state[i]) * clamp(dt * 9, 0, 1);
        if (Math.abs(w - set.state[i]) > 0.15 || Math.abs(w - target) > 0.4) {
          set.state[i] = w;
          const rounded = Math.round(w);
          if (el.dataset.w !== String(rounded)) {
            el.dataset.w = String(rounded);
            el.style.fontWeight = rounded;
          }
        }
      });
    }

    // ---- water-filled wordmark ----
    if (wordmark && wm) {
      const r = wordmark.getBoundingClientRect();
      if (r.top < vh * 1.05) {
        const maxScroll = document.documentElement.scrollHeight - vh;
        const topNow = r.top + lag;
        const topAtEnd = r.top + y - maxScroll;
        const span = vh * 0.98 - topAtEnd;
        const target = span > 1 ? clamp((vh * 0.98 - topNow) / span, 0, 1) : 1;
        M.fill += (target - M.fill) * clamp(dt * 4, 0, 1);
        const h = wm.offsetHeight;
        wordmark.style.setProperty('--lvl', `${(h * (1 - M.fill) - 40 * M.fill).toFixed(1)}px`);
      }
    }

    // ---- cursor ----
    if (cur.active) {
      cur.rx += (cur.x - cur.rx) * clamp(dt * 14, 0, 1);
      cur.ry += (cur.y - cur.ry) * clamp(dt * 14, 0, 1);
      // the V leans into the direction it's moving, like a pennant
      const vx = cur.x - cur.px;
      cur.px = cur.x;
      cur.lean += (clamp(vx * 1.1, -26, 26) - cur.lean) * clamp(dt * 10, 0, 1);
      vEl.style.transform = `translate3d(${cur.x}px,${cur.y}px,0)`;
      vEl.style.setProperty('--lean', `${cur.lean.toFixed(1)}deg`);
      labelEl.style.transform = `translate3d(${cur.rx.toFixed(1)}px,${cur.ry.toFixed(1)}px,0)`;
    }
  }

  let raf = 0;
  function syncLoop() {
    const run = !prefersReduced() && !document.hidden;
    if (run && !raf) {
      M.last = performance.now();
      raf = requestAnimationFrame(loop);
      if (track) track.classList.add('is-driven');
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      if (track) { track.classList.remove('is-driven'); track.style.transform = ''; }
    }
  }
  document.addEventListener('visibilitychange', syncLoop);
  reduceMotion.addEventListener('change', syncLoop);
  syncLoop();

  /* ------------------------------------------------------------------ *
   * SVG (SMIL) motion respects reduced-motion
   * ------------------------------------------------------------------ */
  const orbit = $('.orbit');
  const syncSvg = () => {
    if (!orbit || typeof orbit.pauseAnimations !== 'function') return;
    prefersReduced() ? orbit.pauseAnimations() : orbit.unpauseAnimations();
  };
  syncSvg();
  reduceMotion.addEventListener('change', syncSvg);

  /* ------------------------------------------------------------------ *
   * Games: a select screen (accessible tabs)
   * ------------------------------------------------------------------ */
  const arcade = $('[data-arcade]');
  if (arcade) {
    const tabs = $$('[role="tab"]', arcade);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));

    const curEl = $('#arcade-cur');
    const totalEl = $('#arcade-total');
    if (totalEl) totalEl.textContent = String(tabs.length).padStart(2, '0');
    const current = () => tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    $$('.ctrl-btn', arcade).forEach((b) => b.addEventListener('click', () => select((current() + Number(b.dataset.dir) + tabs.length) % tabs.length)));

    const select = (i, { focus = false } = {}) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[j].classList.toggle('is-active', on);
        panels[j].inert = !on;
      });
      arcade.dataset.active = tabs[i].dataset.game;
      // on small screens the tabs scroll sideways: keep the chosen one in view
      const nav = tabs[i].parentElement;
      if (nav.scrollWidth > nav.clientWidth + 1) {
        const left = nav.scrollLeft + tabs[i].getBoundingClientRect().left - nav.getBoundingClientRect().left - 16;
        nav.scrollTo({ left, behavior: prefersReduced() ? 'auto' : 'smooth' });
      }
      if (focus) tabs[i].focus({ preventScroll: true });
      if (curEl) curEl.textContent = String(i + 1).padStart(2, '0');
    };

    tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    $('.arcade-nav', arcade).addEventListener('keydown', (e) => {
      const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const keys = { ArrowDown: cur + 1, ArrowRight: cur + 1, ArrowUp: cur - 1, ArrowLeft: cur - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select((keys[e.key] + tabs.length) % tabs.length, { focus: true });
    });
    select(0);
  }

  /* ------------------------------------------------------------------ *
   * Scratch: "joined" duration is worked out from the real join date,
   * and the green flag runs the little script
   * ------------------------------------------------------------------ */
  const joinedEl = $('#scratch-joined');
  if (joinedEl && joinedEl.dataset.joined) {
    const j = new Date(`${joinedEl.dataset.joined}T00:00:00Z`);
    const n = new Date();
    const anchorFor = (m) => new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth() + m, j.getUTCDate()));
    let months = (n.getUTCFullYear() - j.getUTCFullYear()) * 12 + n.getUTCMonth() - j.getUTCMonth();
    if (anchorFor(months) > n) months -= 1;
    const weeks = Math.floor((n - anchorFor(months)) / (7 * 864e5));
    const plural = (v, w) => `${v} ${w}${v === 1 ? '' : 's'}`;
    const parts = [];
    if (months >= 12) parts.push(plural(Math.floor(months / 12), 'year'));
    if (months % 12) parts.push(plural(months % 12, 'month'));
    if (weeks) parts.push(plural(weeks, 'week'));
    if (months >= 0 && parts.length) joinedEl.textContent = `${parts.join(', ')} ago`;
  }

  const skArt = $('.scratch-art');
  const flagBtn = $('.flag-btn');
  if (skArt && flagBtn) {
    const flagLabel = $('.flag-label', flagBtn);
    const status = $('#sk-status');
    const blocks = $$('[data-step]', skArt);
    const glow = (step) => blocks.forEach((b) => b.classList.toggle('is-glow', Number(b.dataset.step) === step));
    let timer = 0;
    let running = false;

    const stop = () => {
      running = false;
      clearTimeout(timer);
      glow(-1);
      skArt.classList.remove('is-running');
      flagBtn.setAttribute('aria-pressed', 'false');
      flagLabel.textContent = 'Run the script';
      status.textContent = 'Script stopped.';
    };
    const start = () => {
      running = true;
      skArt.classList.add('is-running');
      flagBtn.setAttribute('aria-pressed', 'true');
      flagLabel.textContent = 'Stop';
      status.textContent = 'Script running: the sprite says “Hello, world!” and spins.';
      const order = [0, 1, 2, 3, 4];
      let i = 0;
      const next = () => {
        if (!running) return;
        glow(order[i]);
        i = i + 1 >= order.length ? 2 : i + 1; // after the first pass, loop inside "forever"
        timer = setTimeout(next, 650);
      };
      next();
    };
    flagBtn.addEventListener('click', () => (running ? stop() : start()));
  }

  /* ------------------------------------------------------------------ *
   * Copy email
   * ------------------------------------------------------------------ */
  const copyBtn = $('.copy-btn');
  const copyLabel = $('.copy-label', copyBtn);
  const copyStatus = $('#copy-status');
  let copyTimer = 0;

  function legacyCopy(text) {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }

  copyBtn.addEventListener('click', async () => {
    const text = copyBtn.dataset.copy;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    clearTimeout(copyTimer);
    if (ok) {
      copyBtn.classList.add('is-copied');
      copyLabel.textContent = 'Copied!';
      copyStatus.textContent = 'Email address copied to clipboard.';
      if (contactBubbles) {
        const c = contactCanvas.getBoundingClientRect();
        const b = copyBtn.getBoundingClientRect();
        contactBubbles.burst(b.left + b.width / 2 - c.left, b.top + b.height / 2 - c.top);
      }
    } else {
      const range = document.createRange();
      range.selectNodeContents($('.email-addr'));
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copyLabel.textContent = 'Press Ctrl+C';
      copyStatus.textContent = `Couldn’t copy automatically. The address is ${text}.`;
    }
    copyTimer = setTimeout(() => {
      copyBtn.classList.remove('is-copied');
      copyLabel.textContent = 'Copy email';
    }, 2600);
  });

  /* ------------------------------------------------------------------ */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
