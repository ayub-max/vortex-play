/* VORTEX//PLAY — переключатель фона.
   Подключается в <head> без defer, чтобы тема применилась до первой отрисовки (без мигания). */
(function () {
  "use strict";

  var KEY = "vortex-theme";
  var THEMES = [
    { id: "default", label: "Классика" },
    { id: "black",   label: "Чёрный" },
    { id: "white",   label: "Белый" },
    { id: "stars",   label: "Звёздный" },
    { id: "flowers", label: "Цветы" },
    { id: "magic",   label: "Магия" }
  ];

  var root = document.documentElement;
  var canvas = null;
  var ctx = null;
  var W = 0, H = 0, dpr = 1;
  var raf = 0;
  var scene = null;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function known(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return true;
    return false;
  }

  function load() {
    try {
      var v = localStorage.getItem(KEY);
      if (known(v)) return v;
    } catch (e) {}
    return "default";
  }

  function save(id) {
    try { localStorage.setItem(KEY, id); } catch (e) {}
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  /* ---------- сцены ---------- */

  function starsScene() {
    var count = Math.min(420, Math.round((W * H) / 5200));
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: rand(0.4, 1.6),
        ph: rand(0, 6.28),
        sp: rand(0.6, 2.2),
        dx: rand(0.01, 0.06),
        hue: pick(["255,255,255", "255,255,255", "200,220,255", "255,235,200"])
      });
    }
    var shooters = [];
    var nextShot = rand(60, 200);
    var t = 0;

    return function (dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.dx * dt;
        if (s.x > W + 2) s.x = -2;
        var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.03 * s.sp + s.ph));
        ctx.fillStyle = "rgba(" + s.hue + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.283);
        ctx.fill();
        if (s.r > 1.3) {
          ctx.fillStyle = "rgba(" + s.hue + "," + (a * 0.18).toFixed(3) + ")";
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.2, 0, 6.283);
          ctx.fill();
        }
      }

      nextShot -= dt;
      if (nextShot <= 0 && !reduce) {
        nextShot = rand(160, 420);
        shooters.push({ x: rand(W * 0.2, W), y: rand(0, H * 0.4), vx: -rand(9, 13), vy: rand(4, 7), life: 1 });
      }
      for (var j = shooters.length - 1; j >= 0; j--) {
        var m = shooters[j];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= 0.016 * dt;
        if (m.life <= 0) { shooters.splice(j, 1); continue; }
        var g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 9, m.y - m.vy * 9);
        g.addColorStop(0, "rgba(255,255,255," + m.life.toFixed(2) + ")");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 9, m.y - m.vy * 9);
        ctx.stroke();
      }
    };
  }

  var PETALS = [
    ["#ff7fae", "#ffc2da"],
    ["#ff9bc0", "#ffe0ec"],
    ["#b98cff", "#e3d3ff"],
    ["#ffb45c", "#ffe1b8"],
    ["#ff6f91", "#ffc3d0"],
    ["#ffffff", "#ffe6f0"]
  ];

  function drawFlower(f) {
    var n = f.petals;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalAlpha = f.alpha;
    for (var i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate((i / n) * 6.283);
      var g = ctx.createRadialGradient(0, -f.size * 0.55, 1, 0, -f.size * 0.55, f.size * 0.6);
      g.addColorStop(0, f.c[1]);
      g.addColorStop(1, f.c[0]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -f.size * 0.55, f.size * 0.3, f.size * 0.55, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#ffd35c";
    ctx.beginPath();
    ctx.arc(0, 0, f.size * 0.17, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  function drawPetal(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.c[0];
    ctx.beginPath();
    ctx.ellipse(0, 0, f.size * 0.28, f.size * 0.5, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  function flowersScene() {
    var count = Math.min(46, Math.max(16, Math.round((W * H) / 30000)));
    var items = [];
    function make(initial) {
      var big = Math.random() < 0.55;
      return {
        flower: big,
        petals: pick([5, 5, 6, 8]),
        x: Math.random() * W,
        y: initial ? Math.random() * H : -40,
        size: big ? rand(16, 34) : rand(8, 15),
        rot: rand(0, 6.28),
        vr: rand(-0.012, 0.012),
        vy: rand(0.25, 0.75),
        sway: rand(0.4, 1.4),
        ph: rand(0, 6.28),
        alpha: rand(0.55, 0.95),
        c: pick(PETALS)
      };
    }
    for (var i = 0; i < count; i++) items.push(make(true));
    var t = 0;

    return function (dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < items.length; i++) {
        var f = items[i];
        f.y += f.vy * dt;
        f.x += Math.sin(t * 0.012 + f.ph) * f.sway * 0.4 * dt;
        f.rot += f.vr * dt;
        if (f.y > H + 50) items[i] = f = make(false);
        if (f.flower) drawFlower(f); else drawPetal(f);
      }
    };
  }

  function drawSpark(p, alpha) {
    var r = p.size;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = alpha;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 3);
    g.addColorStop(0, "rgba(" + p.c + ",.9)");
    g.addColorStop(1, "rgba(" + p.c + ",0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 3, 0, 6.283);
    ctx.fill();
    if (p.star) {
      ctx.rotate(p.rot);
      ctx.fillStyle = "rgb(" + p.c + ")";
      ctx.beginPath();
      ctx.moveTo(0, -r * 2);
      ctx.quadraticCurveTo(0, 0, r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 2);
      ctx.quadraticCurveTo(0, 0, -r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function magicScene() {
    var COLORS = ["255,211,92", "92,240,208", "255,140,210", "200,160,255", "255,255,255"];
    var count = Math.min(90, Math.max(30, Math.round((W * H) / 16000)));
    var items = [];
    function make(initial) {
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 20,
        vy: -rand(0.12, 0.5),
        vx: rand(-0.15, 0.15),
        size: rand(1, 3.2),
        ph: rand(0, 6.28),
        sp: rand(0.6, 2),
        rot: rand(0, 6.28),
        vr: rand(-0.02, 0.02),
        star: Math.random() < 0.45,
        c: pick(COLORS)
      };
    }
    for (var i = 0; i < count; i++) items.push(make(true));
    var trail = [];
    var t = 0;

    function onMove(e) {
      if (reduce) return;
      trail.push({
        x: e.clientX, y: e.clientY,
        vx: rand(-0.4, 0.4), vy: rand(-0.6, 0.1),
        size: rand(1.2, 2.6), rot: rand(0, 6.28), vr: 0.05,
        star: true, c: pick(COLORS), life: 1
      });
      if (trail.length > 60) trail.shift();
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    scene.cleanup = function () { window.removeEventListener("pointermove", onMove); };

    return function (dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < items.length; i++) {
        var p = items[i];
        p.x += p.vx * dt + Math.sin(t * 0.01 + p.ph) * 0.15 * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y < -30) items[i] = p = make(false);
        drawSpark(p, 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.04 * p.sp + p.ph)));
      }
      for (var j = trail.length - 1; j >= 0; j--) {
        var q = trail[j];
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        q.life -= 0.02 * dt;
        if (q.life <= 0) { trail.splice(j, 1); continue; }
        drawSpark(q, q.life);
      }
    };
  }

  /* ---------- движок ---------- */

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scene) startScene(root.getAttribute("data-theme"));
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function startScene(id) {
    stopLoop();
    if (scene && scene.cleanup) scene.cleanup();
    scene = null;
    if (!canvas) return;
    ctx.clearRect(0, 0, W, H);
    var build = id === "stars" ? starsScene : id === "flowers" ? flowersScene : id === "magic" ? magicScene : null;
    if (!build) return;

    scene = {};
    var frame = build();
    scene.frame = frame;

    if (reduce) { frame(0); return; }

    var last = performance.now();
    function loop(now) {
      var dt = Math.min((now - last) / 16.67, 3);
      last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  function apply(id) {
    if (!known(id)) id = "default";
    root.setAttribute("data-theme", id);
    save(id);
    startScene(id);
    var btns = document.querySelectorAll(".theme-opt");
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute("aria-pressed", String(btns[i].getAttribute("data-t") === id));
    }
  }

  function buildUI() {
    canvas = document.createElement("canvas");
    canvas.className = "bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");

    var box = document.createElement("div");
    box.className = "theme-switch";
    var opts = THEMES.map(function (t) {
      return '<button type="button" class="theme-opt" data-t="' + t.id + '" aria-pressed="false">' +
        '<span class="theme-opt__sw"></span>' + t.label + '</button>';
    }).join("");
    box.innerHTML =
      '<div class="theme-switch__panel" id="theme-panel" hidden>' +
        '<p class="theme-switch__title">Фон сайта</p>' +
        '<div class="theme-switch__grid">' + opts + '</div>' +
      '</div>' +
      '<button type="button" class="theme-switch__btn" aria-expanded="false" aria-controls="theme-panel" aria-label="Сменить фон" title="Сменить фон">🎨</button>';
    document.body.appendChild(box);

    var toggle = box.querySelector(".theme-switch__btn");
    var panel = box.querySelector(".theme-switch__panel");

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(panel.hidden);
    });
    panel.addEventListener("click", function (e) {
      var b = e.target.closest(".theme-opt");
      if (b) apply(b.getAttribute("data-t"));
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); }
    });

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopLoop();
      else startScene(root.getAttribute("data-theme"));
    });

    resize();
    apply(root.getAttribute("data-theme"));
  }

  // применяем сохранённую тему сразу, до отрисовки страницы
  root.setAttribute("data-theme", load());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
