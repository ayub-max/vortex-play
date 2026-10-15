/* VORTEX//PLAY — фон: бесплатные цвета + платные анимированные темы */
(function () {
  "use strict";

  var KEY = "vortex-theme";
  var OWN_KEY = "vortexplay.themesOwned";
  var CUSTOM_KEY = "vortex-theme-custom";

  /* free: solid colors · paid: animated scenes */
  var THEMES = [
    { id: "default", label: "Классика", free: true, kind: "color" },
    { id: "black", label: "Чёрный", free: true, kind: "color" },
    { id: "white", label: "Белый", free: true, kind: "color" },
    { id: "navy", label: "Синий", free: true, kind: "color" },
    { id: "forest", label: "Зелёный", free: true, kind: "color" },
    { id: "rose", label: "Розовый", free: true, kind: "color" },
    { id: "custom", label: "Свой цвет", free: true, kind: "picker" },
    { id: "stars", label: "Звёздный", free: false, price: 49, kind: "anim", desc: "Анимация звёзд и метеоров" },
    { id: "magic", label: "Магический", free: false, price: 79, kind: "anim", desc: "Искры и магический шлейф" },
    { id: "flowers", label: "Цветы", free: false, price: 39, kind: "anim", desc: "Падающие лепестки" }
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

  function themeById(id) {
    for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
    return null;
  }

  function loadOwned() {
    try {
      var raw = localStorage.getItem(OWN_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveOwned(list) {
    try {
      localStorage.setItem(OWN_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function isOwned(id) {
    var t = themeById(id);
    if (!t || t.free) return true;
    return loadOwned().indexOf(id) !== -1;
  }

  function load() {
    try {
      var v = localStorage.getItem(KEY);
      if (known(v) && isOwned(v)) return v;
      if (known(v) && !isOwned(v)) return "default";
    } catch (e) {}
    return "default";
  }

  function save(id) {
    try {
      localStorage.setItem(KEY, id);
    } catch (e) {}
  }

  function loadCustom() {
    try {
      return localStorage.getItem(CUSTOM_KEY) || "#1a1035";
    } catch (e) {
      return "#1a1035";
    }
  }

  function saveCustom(hex) {
    try {
      localStorage.setItem(CUSTOM_KEY, hex);
    } catch (e) {}
  }

  function toast(msg) {
    var n = document.getElementById("toast");
    if (!n) {
      n = document.createElement("div");
      n.id = "toast";
      n.className = "toast";
      document.body.appendChild(n);
    }
    n.textContent = msg;
    n.classList.add("is-shown");
    clearTimeout(n._t);
    n._t = setTimeout(function () {
      n.classList.remove("is-shown");
    }, 2600);
  }

  function getWallet() {
    try {
      if (window.VP && window.VP.account) {
        var a = window.VP.account();
        if (a && typeof a.wallet === "number") return a.wallet;
      }
      var raw = localStorage.getItem("vortexplay.account");
      if (raw) {
        var acc = JSON.parse(raw);
        if (acc && typeof acc.wallet === "number") return acc.wallet;
      }
    } catch (e) {}
    return 0;
  }

  function chargeWallet(amount) {
    try {
      var raw = localStorage.getItem("vortexplay.account");
      if (!raw) return false;
      var acc = JSON.parse(raw);
      if (!acc || typeof acc.wallet !== "number" || acc.wallet < amount) return false;
      acc.wallet = Math.round((acc.wallet - amount) * 100) / 100;
      localStorage.setItem("vortexplay.account", JSON.stringify(acc));
      document.dispatchEvent(new CustomEvent("vp:wallet", { detail: acc }));
      document.dispatchEvent(new CustomEvent("vp:signin", { detail: acc }));
      // refresh wallet button in topbar immediately
      var w = document.querySelector("[data-topup]");
      if (w) {
        try {
          w.innerHTML = acc.wallet.toLocaleString("en-US", { style: "currency", currency: "USD" }).replace("US$", "$") +
            (acc.wallet % 1 ? "" : "") + ' <span aria-hidden="true">+</span>';
          // simpler display matching app money()
          w.childNodes[0] && (w.childNodes[0].textContent = "");
        } catch (e) {}
        w.textContent = "";
        w.appendChild(document.createTextNode(
          (Math.round(acc.wallet * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₽ "
        ));
        var plus = document.createElement("span");
        plus.setAttribute("aria-hidden", "true");
        plus.textContent = "+";
        w.appendChild(plus);
      }
      var walletEl = document.getElementById("wallet");
      if (walletEl) walletEl.textContent = acc.wallet.toLocaleString("en-US") + " ₽";
      return true;
    } catch (e) {
      return false;
    }
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /* ---------- animated scenes ---------- */

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
        shooters.push({
          x: rand(W * 0.2, W),
          y: rand(0, H * 0.4),
          vx: -rand(9, 13),
          vy: rand(4, 7),
          life: 1
        });
      }
      for (var j = shooters.length - 1; j >= 0; j--) {
        var m = shooters[j];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= 0.016 * dt;
        if (m.life <= 0) {
          shooters.splice(j, 1);
          continue;
        }
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
        f.x += Math.sin(t * 0.02 + f.ph) * f.sway * 0.4 * dt;
        f.rot += f.vr * dt;
        if (f.y > H + 50) items[i] = f = make(false);
        if (f.flower) drawFlower(f);
        else drawPetal(f);
      }
    };
  }

  function magicScene() {
    var count = Math.min(90, Math.round((W * H) / 14000));
    var items = [];
    function make(initial) {
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 10,
        r: rand(1.2, 3.5),
        vx: rand(-0.3, 0.3),
        vy: -rand(0.4, 1.4),
        ph: rand(0, 6.28),
        sp: rand(0.8, 2),
        hue: pick(["180,120,255", "120,220,255", "255,160,255", "100,255,200", "255,220,120"])
      };
    }
    for (var i = 0; i < count; i++) items.push(make(true));
    var trail = [];
    var t = 0;
    function onMove(e) {
      if (reduce) return;
      for (var k = 0; k < 3; k++) {
        trail.push({
          x: e.clientX + rand(-8, 8),
          y: e.clientY + rand(-8, 8),
          vx: rand(-1.5, 1.5),
          vy: rand(-2.5, -0.5),
          r: rand(1.5, 4),
          rot: rand(0, 6),
          vr: rand(-0.1, 0.1),
          life: 1,
          hue: pick(["180,120,255", "120,220,255", "255,160,255"])
        });
      }
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    var cleanup = function () {
      window.removeEventListener("pointermove", onMove);
    };

    function drawSpark(p, a) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = "rgba(" + (p.hue || "200,180,255") + ",1)";
      ctx.beginPath();
      ctx.moveTo(0, -p.r * 2);
      ctx.lineTo(p.r * 0.6, 0);
      ctx.lineTo(0, p.r * 2);
      ctx.lineTo(-p.r * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    var frame = function (dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < items.length; i++) {
        var p = items[i];
        p.x += p.vx * dt + Math.sin(t * 0.01 + p.ph) * 0.15 * dt;
        p.y += p.vy * dt;
        if (p.y < -30) items[i] = p = make(false);
        var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.04 * p.sp + p.ph));
        ctx.fillStyle = "rgba(" + p.hue + "," + a.toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = "rgba(" + p.hue + "," + (a * 0.25).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, 6.283);
        ctx.fill();
      }
      for (var j = trail.length - 1; j >= 0; j--) {
        var q = trail[j];
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.vr * dt;
        q.life -= 0.02 * dt;
        if (q.life <= 0) {
          trail.splice(j, 1);
          continue;
        }
        drawSpark(q, q.life);
      }
    };
    frame.cleanup = cleanup;
    return frame;
  }

  /* ---------- engine ---------- */

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

    var frame = build();
    scene = { frame: frame, cleanup: frame.cleanup || null };

    if (reduce) {
      frame(0);
      return;
    }

    var last = performance.now();
    function loop(now) {
      var dt = Math.min((now - last) / 16.67, 3);
      last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  function applyCustomColor(hex) {
    root.style.setProperty("--custom-bg", hex);
    saveCustom(hex);
  }

  function apply(id) {
    if (!known(id)) id = "default";
    if (!isOwned(id)) {
      toast("Сначала купите эту тему");
      return false;
    }
    root.setAttribute("data-theme", id);
    save(id);
    if (id === "custom") applyCustomColor(loadCustom());
    startScene(id);
    paintButtons();
    return true;
  }

  function paintButtons() {
    var btns = document.querySelectorAll(".theme-opt");
    var cur = root.getAttribute("data-theme");
    for (var i = 0; i < btns.length; i++) {
      var id = btns[i].getAttribute("data-t");
      var owned = isOwned(id);
      btns[i].setAttribute("aria-pressed", String(id === cur));
      btns[i].classList.toggle("is-locked", !owned);
      btns[i].classList.toggle("is-owned", owned && !themeById(id).free);
      var badge = btns[i].querySelector(".theme-opt__badge");
      if (badge) {
        if (themeById(id).free) badge.textContent = "FREE";
        else if (owned) badge.textContent = "OWNED";
        else badge.textContent = themeById(id).price + " ₽";
      }
    }
  }

  function tryPurchase(id) {
    var t = themeById(id);
    if (!t || t.free) return;
    if (isOwned(id)) {
      apply(id);
      return;
    }
    var account = null;
    try {
      if (window.VP && window.VP.account) account = window.VP.account();
    } catch (e) {}
    if (!account) {
      toast("Войдите в аккаунт, чтобы купить тему");
      if (window.VP && window.VP.openGate) window.VP.openGate();
      return;
    }
    var price = t.price;
    var wallet = getWallet();
    if (wallet < price) {
      toast("Недостаточно средств (" + wallet + " ₽). Пополните кошелёк.");
      if (window.VP && window.VP.topup) window.VP.topup(price - wallet);
      return;
    }
    var ok = confirm(
      "Купить тему «" + t.label + "» за " + price + " ₽?\n\n" +
        (t.desc || "Анимированный фон") +
        "\nБаланс: " + wallet + " ₽"
    );
    if (!ok) return;
    if (!chargeWallet(price)) {
      toast("Оплата не прошла");
      return;
    }
    var owned = loadOwned();
    owned.push(id);
    saveOwned(owned);
    toast("Тема «" + t.label + "» куплена! −" + price + " ₽");
    apply(id);
    paintButtons();
  }

  function buildUI() {
    canvas = document.createElement("canvas");
    canvas.className = "bg-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext("2d");

    var box = document.createElement("div");
    box.className = "theme-switch";

    var freeOpts = THEMES.filter(function (t) {
      return t.free;
    })
      .map(function (t) {
        return (
          '<button type="button" class="theme-opt" data-t="' +
          t.id +
          '" aria-pressed="false">' +
          '<span class="theme-opt__sw theme-opt__sw--' +
          t.id +
          '"></span>' +
          '<span class="theme-opt__label">' +
          t.label +
          "</span>" +
          '<span class="theme-opt__badge">FREE</span></button>'
        );
      })
      .join("");

    var paidOpts = THEMES.filter(function (t) {
      return !t.free;
    })
      .map(function (t) {
        return (
          '<button type="button" class="theme-opt theme-opt--paid" data-t="' +
          t.id +
          '" aria-pressed="false">' +
          '<span class="theme-opt__sw theme-opt__sw--' +
          t.id +
          '"></span>' +
          '<span class="theme-opt__label">' +
          t.label +
          "</span>" +
          '<span class="theme-opt__badge">' +
          t.price +
          " ₽</span>" +
          '<span class="theme-opt__lock" aria-hidden="true">🔒</span></button>'
        );
      })
      .join("");

    box.innerHTML =
      '<div class="theme-switch__panel" id="theme-panel" hidden>' +
      '<p class="theme-switch__title">Фон сайта</p>' +
      '<p class="theme-switch__sub">Цвета — бесплатно. Анимации — из кошелька.</p>' +
      '<p class="theme-switch__group">Бесплатные цвета</p>' +
      '<div class="theme-switch__grid">' +
      freeOpts +
      "</div>" +
      '<div class="theme-picker-row" id="theme-picker-row" hidden>' +
      '<label for="theme-color">Свой цвет</label>' +
      '<input type="color" id="theme-color" value="' +
      loadCustom() +
      '">' +
      '<button type="button" class="btn btn--small btn--primary" id="theme-color-apply">Применить</button>' +
      "</div>" +
      '<p class="theme-switch__group">Платные анимации</p>' +
      '<div class="theme-switch__grid">' +
      paidOpts +
      "</div>" +
      '<p class="theme-switch__hint">Звёздный и Магический — с живой анимацией. Оплата списывается с баланса аккаунта.</p>' +
      "</div>" +
      '<button type="button" class="theme-switch__btn" aria-expanded="false" aria-controls="theme-panel" aria-label="Сменить фон" title="Сменить фон">🎨</button>';

    document.body.appendChild(box);

    var toggle = box.querySelector(".theme-switch__btn");
    var panel = box.querySelector(".theme-switch__panel");
    var pickerRow = document.getElementById("theme-picker-row");
    var colorInput = document.getElementById("theme-color");

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    }

    toggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(panel.hidden);
      paintButtons();
    });

    panel.addEventListener("click", function (e) {
      var b = e.target.closest(".theme-opt");
      if (!b) return;
      var id = b.getAttribute("data-t");
      var t = themeById(id);
      if (!t) return;
      if (t.kind === "picker") {
        pickerRow.hidden = false;
        apply("custom");
        return;
      }
      pickerRow.hidden = id !== "custom";
      if (t.free) {
        apply(id);
      } else {
        tryPurchase(id);
      }
    });

    document.getElementById("theme-color-apply").addEventListener("click", function () {
      var hex = colorInput.value;
      applyCustomColor(hex);
      apply("custom");
      toast("Цвет фона изменён");
    });
    colorInput.addEventListener("input", function () {
      applyCustomColor(colorInput.value);
      if (root.getAttribute("data-theme") === "custom") {
        /* live preview */
      }
    });

    document.addEventListener("click", function (e) {
      if (!box.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopLoop();
      else startScene(root.getAttribute("data-theme"));
    });
    document.addEventListener("vp:wallet", function () {
      paintButtons();
    });
    document.addEventListener("vp:signin", function () {
      paintButtons();
    });

    resize();
    var initial = root.getAttribute("data-theme") || load();
    if (!isOwned(initial)) initial = "default";
    apply(initial);
    if (initial === "custom") pickerRow.hidden = false;
  }

  // apply saved theme before paint
  root.setAttribute("data-theme", load());
  if (load() === "custom") {
    root.style.setProperty("--custom-bg", loadCustom());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
