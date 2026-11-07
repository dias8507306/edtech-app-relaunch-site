/* ==========================================================================
   EduApp FX — 3D tilt, spotlight, звёздное небо на canvas, свечение за курсором.
   Без зависимостей. Автоинициализация по атрибутам; ручной вызов через window.EduAppFX.
   В Vue: вызвать EduAppFX.tilt(el) в onMounted / в директиве v-tilt.
   ========================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function ensureGlare(el) {
    var g = el.querySelector(":scope > .fx-glare");
    if (!g) {
      g = document.createElement("span");
      g.className = "fx-glare";
      g.setAttribute("aria-hidden", "true");
      el.appendChild(g);
    }
    return g;
  }

  /* Spotlight + (опционально) 3D-наклон одного элемента */
  function tilt(el) {
    if (el.__fx) return;
    el.__fx = true;
    ensureGlare(el);
    var max = parseFloat(el.getAttribute("data-tilt")) || 0;
    var doTilt = max > 0 && finePointer && !reduce;
    var depthEls = doTilt ? el.querySelectorAll("[data-depth]") : [];
    var raf = 0, lastEvent = null;

    function frame() {
      raf = 0;
      if (!lastEvent) return;
      var r = el.getBoundingClientRect();
      var x = (lastEvent.clientX - r.left) / r.width;
      var y = (lastEvent.clientY - r.top) / r.height;
      el.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(2) + "%");
      if (doTilt) {
        el.style.transform = "perspective(1100px) rotateX(" + ((0.5 - y) * max).toFixed(2) +
          "deg) rotateY(" + ((x - 0.5) * max).toFixed(2) + "deg) translateZ(0)";
      }
    }
    el.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "touch") return;
      el.classList.add("fx-hover", "fx-active");
      for (var i = 0; i < depthEls.length; i++) {
        depthEls[i].style.setProperty("--fx-depth", depthEls[i].getAttribute("data-depth"));
      }
    });
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      lastEvent = e;
      if (!raf) raf = requestAnimationFrame(frame);
    });
    el.addEventListener("pointerleave", function () {
      lastEvent = null;
      el.classList.remove("fx-hover", "fx-active");
      el.style.transform = "";
      for (var i = 0; i < depthEls.length; i++) depthEls[i].style.setProperty("--fx-depth", "0");
    });
  }

  /* Мерцающие звёзды + редкие падающие звёзды + параллакс к курсору */
  function starfield(canvas) {
    if (canvas.__fx) return;
    canvas.__fx = true;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var host = canvas.parentElement;
    var dpr = 1, w = 0, h = 0, stars = [], running = false, visible = true;
    // Экономия: не чаще 30 кадров/с и пауза, пока страницу прокручивают (иначе прокрутка тормозит)
    var lastDraw = 0, scrolling = false, scrollTimer = 0;
    window.addEventListener("scroll", function () {
      scrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () { scrolling = false; }, 200);
    }, { passive: true });
    var px = 0, py = 0, tx = 0, ty = 0;
    var shoot = null, nextShoot = 2500;
    var colors = ["255,255,255", "255,255,255", "221,214,254", "253,230,138", "191,219,254"];

    function resize() {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(140, Math.round((w * h) / 9000));
      stars = [];
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: Math.random() < 0.08 ? 1.4 + Math.random() * 0.9 : 0.35 + Math.random() * 0.9,
          z: 0.2 + Math.random() * 0.8,
          p: Math.random() * Math.PI * 2,
          s: 0.6 + Math.random() * 1.8,
          c: colors[(Math.random() * colors.length) | 0]
        });
      }
      if (reduce) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.001 * s.s + s.p);
        var x = s.x + px * s.z * 18, y = s.y + py * s.z * 18;
        ctx.globalAlpha = 0.25 + 0.75 * tw * s.z;
        ctx.fillStyle = "rgb(" + s.c + ")";
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.2832); ctx.fill();
        if (s.r > 1.4) { /* мягкий ореол у крупных звёзд */
          ctx.globalAlpha *= 0.18;
          ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, 6.2832); ctx.fill();
        }
      }
      if (!reduce) {
        if (!shoot && t > nextShoot) {
          shoot = { x: Math.random() * w * 0.7 + w * 0.2, y: Math.random() * h * 0.4, l: 0, t0: t };
          nextShoot = t + 5000 + Math.random() * 6000;
        }
        if (shoot) {
          var k = (t - shoot.t0) / 900;
          if (k >= 1) shoot = null;
          else {
            var len = 140 * Math.sin(k * Math.PI), sx = shoot.x - k * 260, sy = shoot.y + k * 150;
            var g = ctx.createLinearGradient(sx, sy, sx + len * 0.87, sy - len * 0.5);
            g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + len * 0.87, sy - len * 0.5); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      if (!running) return;
      if (!scrolling && t - lastDraw >= 33) { lastDraw = t; draw(t); }
      requestAnimationFrame(loop);
    }
    function setRunning() {
      var should = visible && !document.hidden && !reduce;
      if (should && !running) { running = true; requestAnimationFrame(loop); }
      else if (!should) running = false;
    }

    if (finePointer && !reduce) {
      host.addEventListener("pointermove", function (e) {
        var r = host.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      host.addEventListener("pointerleave", function () { tx = 0; ty = 0; });
    }
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas); else window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; setRunning(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", setRunning);
    resize();
    setRunning();
  }

  /* Мягкое световое пятно, догоняющее курсор (CSS-переменные --gx/--gy на элементе) */
  function pointerGlow(el) {
    if (!finePointer || reduce || el.__fxGlow) return;
    el.__fxGlow = true;
    var x = 50, y = 30, txg = 50, tyg = 30, raf = 0;
    function step() {
      x += (txg - x) * 0.08; y += (tyg - y) * 0.08;
      el.style.setProperty("--gx", x.toFixed(2) + "%");
      el.style.setProperty("--gy", y.toFixed(2) + "%");
      raf = (Math.abs(txg - x) > 0.1 || Math.abs(tyg - y) > 0.1) ? requestAnimationFrame(step) : 0;
    }
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      txg = ((e.clientX - r.left) / r.width) * 100;
      tyg = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(step);
    });
  }

  function init(root) {
    root = root || document;
    var t = root.querySelectorAll("[data-tilt],[data-spot]");
    for (var i = 0; i < t.length; i++) tilt(t[i]);
    var s = root.querySelectorAll("canvas[data-starfield]");
    for (var j = 0; j < s.length; j++) starfield(s[j]);
    var g = root.querySelectorAll("[data-pointer-glow]");
    for (var k = 0; k < g.length; k++) pointerGlow(g[k]);
  }

  window.EduAppFX = { init: init, tilt: tilt, starfield: starfield, pointerGlow: pointerGlow };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); });
  else init();
})();
