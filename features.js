/* VORTEX//PLAY — extra features per page */
(function () {
  "use strict";

  var STORE = {
    get: function (k, fallback) {
      try {
        var v = localStorage.getItem("vortexplay.feat." + k);
        return v ? JSON.parse(v) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem("vortexplay.feat." + k, JSON.stringify(v));
      } catch (e) {}
    }
  };

  function toast(msg) {
    if (window.VP && typeof window.VP.toast === "function") return window.VP.toast(msg);
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
    }, 2400);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------- HOME ---------- */
  function featHome() {
    var main = document.querySelector("main.shell");
    if (!main) return;

    // Search + lucky pick bar
    var bar = document.createElement("section");
    bar.className = "feat-bar section";
    bar.innerHTML =
      '<div class="feat-bar__row">' +
      '<input type="search" id="feat-home-q" class="feat-input" placeholder="Quick search games…" aria-label="Search">' +
      '<button type="button" class="btn btn--ghost" id="feat-lucky">🎲 Lucky pick</button>' +
      '<button type="button" class="btn btn--ghost" id="feat-wishlist-open">♥ Wishlist (<span id="feat-wish-n">0</span>)</button>' +
      "</div>" +
      '<div class="feat-countdown" id="feat-deal-timer"><span>Weekly deals end in</span> <b id="feat-timer">—</b></div>' +
      '<div class="grid" id="feat-search-results" hidden></div>' +
      '<div class="feat-recent" id="feat-recent" hidden><h3>Recently viewed</h3><div class="feat-chips" id="feat-recent-list"></div></div>';
    var hero = main.querySelector(".hero");
    if (hero && hero.nextSibling) main.insertBefore(bar, hero.nextSibling);
    else main.prepend(bar);

    // Countdown to next Monday 00:00
    function tick() {
      var now = new Date();
      var next = new Date(now);
      next.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
      next.setHours(0, 0, 0, 0);
      var ms = next - now;
      var h = Math.floor(ms / 3600000);
      var m = Math.floor((ms % 3600000) / 60000);
      var s = Math.floor((ms % 60000) / 1000);
      var el = document.getElementById("feat-timer");
      if (el) el.textContent = h + "h " + m + "m " + s + "s";
    }
    tick();
    setInterval(tick, 1000);

    // Wishlist
    function wishList() {
      return STORE.get("wishlist", []);
    }
    function paintWishN() {
      var el = document.getElementById("feat-wish-n");
      if (el) el.textContent = String(wishList().length);
    }
    paintWishN();

    document.addEventListener("click", function (e) {
      var w = e.target.closest("[data-wish]");
      if (!w) return;
      var title =
        (document.getElementById("hero-title") && document.getElementById("hero-title").textContent) ||
        w.closest("[data-game]") && w.closest("[data-game]").dataset.game;
      if (!title) return;
      var list = wishList();
      var i = list.indexOf(title);
      if (i >= 0) {
        list.splice(i, 1);
        toast("Removed from wishlist");
      } else {
        list.push(title);
        toast("Added to wishlist: " + title);
      }
      STORE.set("wishlist", list);
      paintWishN();
    });

    document.getElementById("feat-wishlist-open").addEventListener("click", function () {
      var list = wishList();
      if (!list.length) {
        toast("Wishlist is empty — press ♥ on a game");
        return;
      }
      alert("Wishlist:\n• " + list.join("\n• "));
    });

    // Lucky pick
    document.getElementById("feat-lucky").addEventListener("click", function () {
      var titles = Object.keys(window.GAMES || {});
      if (!titles.length && window.VP && window.VP.games) titles = Object.keys(window.VP.games);
      // fallback: scrape covers
      if (!titles.length) {
        document.querySelectorAll("[data-game]").forEach(function (n) {
          if (n.dataset.game) titles.push(n.dataset.game);
        });
      }
      titles = titles.filter(Boolean);
      if (!titles.length) {
        toast("No games found");
        return;
      }
      var pick = titles[Math.floor(Math.random() * titles.length)];
      var card = document.querySelector('[data-game="' + pick + '"]');
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("feat-pulse");
        setTimeout(function () {
          card.classList.remove("feat-pulse");
        }, 1200);
      }
      toast("Lucky pick: " + pick);
      trackView(pick);
    });

    // Quick search
    var q = document.getElementById("feat-home-q");
    var box = document.getElementById("feat-search-results");
    q.addEventListener("input", function () {
      var term = q.value.trim().toLowerCase();
      if (term.length < 2) {
        box.hidden = true;
        box.innerHTML = "";
        return;
      }
      var hits = [];
      document.querySelectorAll("[data-game]").forEach(function (n) {
        var t = n.dataset.game || "";
        if (t.toLowerCase().indexOf(term) !== -1 && hits.indexOf(t) === -1) hits.push(t);
      });
      // also search visible card titles
      document.querySelectorAll(".card__title, .cover__title").forEach(function (n) {
        var t = n.textContent.trim();
        if (t.toLowerCase().indexOf(term) !== -1 && hits.indexOf(t) === -1) hits.push(t);
      });
      box.hidden = hits.length === 0;
      box.innerHTML = hits
        .slice(0, 8)
        .map(function (t) {
          return (
            '<article class="card feat-mini"><div class="card__body"><h3 class="card__title">' +
            esc(t) +
            '</h3><button type="button" class="btn btn--small btn--primary" data-feat-open="' +
            esc(t) +
            '">Open</button></div></article>'
          );
        })
        .join("");
    });
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-feat-open]");
      if (!b) return;
      var t = b.dataset.featOpen;
      var el = document.querySelector('[data-game="' + t + '"]');
      if (el) {
        el.click();
        trackView(t);
      } else toast(t);
    });

    // Recently viewed
    function trackView(title) {
      var r = STORE.get("recent", []);
      r = r.filter(function (x) {
        return x !== title;
      });
      r.unshift(title);
      STORE.set("recent", r.slice(0, 8));
      paintRecent();
    }
    function paintRecent() {
      var r = STORE.get("recent", []);
      var wrap = document.getElementById("feat-recent");
      var list = document.getElementById("feat-recent-list");
      if (!r.length) {
        wrap.hidden = true;
        return;
      }
      wrap.hidden = false;
      list.innerHTML = r
        .map(function (t) {
          return '<button type="button" class="feat-chip" data-feat-open="' + esc(t) + '">' + esc(t) + "</button>";
        })
        .join("");
    }
    paintRecent();
    document.getElementById("feat-recent-list").addEventListener("click", function (e) {
      var b = e.target.closest("[data-feat-open]");
      if (!b) return;
      var el = document.querySelector('[data-game="' + b.dataset.featOpen + '"]');
      if (el) el.click();
    });
    document.addEventListener("click", function (e) {
      var g = e.target.closest("[data-game]");
      if (g && g.dataset.game) trackView(g.dataset.game);
    });
  }

  /* ---------- NEWS ---------- */
  function featNews() {
    var head = document.querySelector(".page-head");
    if (!head) return;
    var tools = document.createElement("div");
    tools.className = "feat-tools";
    tools.innerHTML =
      '<input type="search" id="feat-news-q" class="feat-input" placeholder="Search news…">' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-bookmarks">★ Bookmarks (<span id="feat-bm-n">0</span>)</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-news-font">A+</button>';
    head.appendChild(tools);

    function bookmarks() {
      return STORE.get("bookmarks", []);
    }
    function paintBm() {
      var el = document.getElementById("feat-bm-n");
      if (el) el.textContent = String(bookmarks().length);
    }
    paintBm();

    // Inject bookmark buttons into feed items when they appear
    function enhanceFeed() {
      document.querySelectorAll(".feed article, .feed .post, #feed > *").forEach(function (item, idx) {
        if (item.querySelector("[data-bm]")) return;
        var title =
          (item.querySelector("h2,h3,.post__title,b") &&
            item.querySelector("h2,h3,.post__title,b").textContent.trim()) ||
          "News #" + (idx + 1);
        item.setAttribute("data-news-title", title);
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--ghost btn--small feat-bm-btn";
        btn.dataset.bm = title;
        btn.textContent = bookmarks().indexOf(title) >= 0 ? "★ Saved" : "☆ Save";
        item.appendChild(btn);
      });
    }
    enhanceFeed();
    var mo = new MutationObserver(enhanceFeed);
    var feed = document.getElementById("feed");
    if (feed) mo.observe(feed, { childList: true, subtree: true });

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-bm]");
      if (!b) return;
      var t = b.dataset.bm;
      var list = bookmarks();
      var i = list.indexOf(t);
      if (i >= 0) {
        list.splice(i, 1);
        b.textContent = "☆ Save";
        toast("Removed bookmark");
      } else {
        list.push(t);
        b.textContent = "★ Saved";
        toast("Bookmarked");
      }
      STORE.set("bookmarks", list);
      paintBm();
    });

    document.getElementById("feat-bookmarks").addEventListener("click", function () {
      var list = bookmarks();
      if (!list.length) {
        toast("No bookmarks yet");
        return;
      }
      alert("Saved articles:\n• " + list.join("\n• "));
    });

    // Search filter
    document.getElementById("feat-news-q").addEventListener("input", function (e) {
      var term = e.target.value.trim().toLowerCase();
      document.querySelectorAll("#feed > *").forEach(function (item) {
        var text = item.textContent.toLowerCase();
        item.style.display = !term || text.indexOf(term) !== -1 ? "" : "none";
      });
    });

    // Font size toggle
    var sizes = ["", "feat-text-lg", "feat-text-xl"];
    var si = 0;
    document.getElementById("feat-news-font").addEventListener("click", function () {
      document.body.classList.remove("feat-text-lg", "feat-text-xl");
      si = (si + 1) % sizes.length;
      if (sizes[si]) document.body.classList.add(sizes[si]);
      toast(si === 0 ? "Normal text" : si === 1 ? "Larger text" : "Extra large text");
    });
  }

  /* ---------- LIBRARY ---------- */
  function featLibrary() {
    var head = document.querySelector(".lib__head");
    if (!head) return;
    var tools = document.createElement("div");
    tools.className = "feat-tools feat-tools--lib";
    tools.innerHTML =
      '<label class="feat-label">Sort ' +
      '<select id="feat-lib-sort">' +
      '<option value="default">Default</option>' +
      '<option value="name">Name A–Z</option>' +
      '<option value="hours">Most played</option>' +
      '<option value="recent">Last played</option>' +
      "</select></label>" +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-lib-notes">📝 Notes</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-lib-export">Export list</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-lib-goal">🎯 Play goal</button>';
    head.appendChild(tools);

    // Sort
    document.getElementById("feat-lib-sort").addEventListener("change", function (e) {
      var grid = document.getElementById("lib-grid");
      if (!grid) return;
      var cards = Array.prototype.slice.call(grid.children);
      var mode = e.target.value;
      cards.sort(function (a, b) {
        var ta = (a.querySelector(".game__title, h3, b") || a).textContent.trim();
        var tb = (b.querySelector(".game__title, h3, b") || b).textContent.trim();
        if (mode === "name") return ta.localeCompare(tb);
        if (mode === "hours") {
          var ha = parseFloat((a.textContent.match(/(\d+)\s*h/) || [0, 0])[1]);
          var hb = parseFloat((b.textContent.match(/(\d+)\s*h/) || [0, 0])[1]);
          return hb - ha;
        }
        return 0;
      });
      cards.forEach(function (c) {
        grid.appendChild(c);
      });
      toast("Sorted: " + mode);
    });

    // Notes
    document.getElementById("feat-lib-notes").addEventListener("click", function () {
      var notes = STORE.get("libNotes", {});
      var title = prompt("Game title for a note:", Object.keys(notes)[0] || "Neon Drifter");
      if (!title) return;
      var current = notes[title] || "";
      var next = prompt("Your note for “" + title + "”:", current);
      if (next === null) return;
      if (next.trim()) notes[title] = next.trim();
      else delete notes[title];
      STORE.set("libNotes", notes);
      toast(next && next.trim() ? "Note saved" : "Note removed");
    });

    // Export
    document.getElementById("feat-lib-export").addEventListener("click", function () {
      var names = [];
      document.querySelectorAll("#lib-grid .game__title, #lib-grid h3, #lib-grid b").forEach(function (n) {
        var t = n.textContent.trim();
        if (t && names.indexOf(t) === -1) names.push(t);
      });
      if (!names.length) {
        document.querySelectorAll("#lib-grid [data-play]").forEach(function (b) {
          if (b.dataset.play) names.push(b.dataset.play);
        });
      }
      var text = "VORTEX//PLAY Library\n" + new Date().toLocaleString() + "\n\n" + names.map(function (n, i) {
        return i + 1 + ". " + n;
      }).join("\n");
      var blob = new Blob([text], { type: "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vortex-library.txt";
      a.click();
      toast("Library exported");
    });

    // Play goal
    document.getElementById("feat-lib-goal").addEventListener("click", function () {
      var goal = STORE.get("playGoal", { hours: 5, done: 0 });
      var hours = prompt("Weekly play goal (hours):", String(goal.hours));
      if (hours === null) return;
      hours = Math.max(1, parseInt(hours, 10) || 5);
      STORE.set("playGoal", { hours: hours, done: goal.done || 0 });
      toast("Goal set: " + hours + " h / week");
      paintGoal();
    });

    function paintGoal() {
      var goal = STORE.get("playGoal", null);
      if (!goal) return;
      var el = document.getElementById("feat-goal-bar");
      if (!el) {
        el = document.createElement("div");
        el.id = "feat-goal-bar";
        el.className = "feat-goal";
        head.appendChild(el);
      }
      var pct = Math.min(100, Math.round(((goal.done || 0) / goal.hours) * 100));
      el.innerHTML =
        "<span>Weekly goal: " +
        (goal.done || 0) +
        " / " +
        goal.hours +
        " h</span>" +
        '<div class="feat-goal__track"><i style="width:' +
        pct +
        '%"></i></div>';
    }
    paintGoal();
  }

  /* ---------- HISTORY ---------- */
  function featHistory() {
    var head = document.querySelector(".page-head");
    if (!head) return;
    var tools = document.createElement("div");
    tools.className = "feat-tools";
    tools.innerHTML =
      '<button type="button" class="btn btn--ghost btn--small" id="feat-hist-export">⬇ Export CSV</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-hist-streak">🔥 Streak</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-hist-chart">📊 By day</button>';
    head.appendChild(tools);

    function readHist() {
      if (window.VP && window.VP.readHistory) return window.VP.readHistory();
      try {
        return JSON.parse(localStorage.getItem("vortexplay.history") || "[]");
      } catch (e) {
        return [];
      }
    }

    document.getElementById("feat-hist-export").addEventListener("click", function () {
      var list = readHist();
      if (!list.length) {
        toast("History is empty");
        return;
      }
      var csv = "title,score,duration_sec,timestamp,date\n";
      list.forEach(function (h) {
        csv +=
          '"' +
          String(h.title).replace(/"/g, '""') +
          '",' +
          (h.score || 0) +
          "," +
          Math.round(h.dur || 0) +
          "," +
          h.ts +
          ',"' +
          new Date(h.ts).toISOString() +
          '"\n';
      });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "vortex-history.csv";
      a.click();
      toast("Exported " + list.length + " sessions");
    });

    document.getElementById("feat-hist-streak").addEventListener("click", function () {
      var list = readHist();
      if (!list.length) {
        toast("No sessions yet — play something first");
        return;
      }
      var days = {};
      list.forEach(function (h) {
        var d = new Date(h.ts);
        var key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
        days[key] = true;
      });
      var streak = 0;
      var cur = new Date();
      for (;;) {
        var key = cur.getFullYear() + "-" + (cur.getMonth() + 1) + "-" + cur.getDate();
        if (!days[key]) break;
        streak++;
        cur.setDate(cur.getDate() - 1);
      }
      toast(streak ? "Play streak: " + streak + " day(s) 🔥" : "No streak today — launch a game!");
    });

    document.getElementById("feat-hist-chart").addEventListener("click", function () {
      var list = readHist();
      var byDay = {};
      list.forEach(function (h) {
        var d = new Date(h.ts).toLocaleDateString();
        byDay[d] = (byDay[d] || 0) + 1;
      });
      var lines = Object.keys(byDay)
        .map(function (d) {
          return d + ": " + byDay[d] + " session(s)";
        })
        .join("\n");
      alert(lines || "No data");
    });
  }

  /* ---------- PROFILE ---------- */
  function featProfile() {
    var actions = document.querySelector(".card-me__actions");
    if (!actions) return;

    var editNick = document.createElement("button");
    editNick.type = "button";
    editNick.className = "btn btn--ghost";
    editNick.id = "feat-edit-nick";
    editNick.textContent = "Edit nickname";
    actions.insertBefore(editNick, actions.firstChild);

    var questsBtn = document.createElement("button");
    questsBtn.type = "button";
    questsBtn.className = "btn btn--primary";
    questsBtn.id = "feat-quests";
    questsBtn.textContent = "Daily quests";
    actions.appendChild(questsBtn);

    var inviteBtn = document.createElement("button");
    inviteBtn.type = "button";
    inviteBtn.className = "btn btn--ghost";
    inviteBtn.id = "feat-invite";
    inviteBtn.textContent = "Invite code";
    actions.appendChild(inviteBtn);

    // Quests panel
    var panel = document.createElement("section");
    panel.className = "section feat-quests";
    panel.id = "feat-quests-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<div class="section__head"><h2>Daily quests</h2><span class="section__note">Reset every day · +XP</span></div>' +
      '<ul class="feat-quest-list" id="feat-quest-list"></ul>';
    var stats = document.getElementById("stats");
    if (stats) stats.parentNode.insertBefore(panel, stats.nextSibling);

    function todayKey() {
      var d = new Date();
      return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    }

    function questsState() {
      var s = STORE.get("quests", { day: "", done: {} });
      if (s.day !== todayKey()) {
        s = { day: todayKey(), done: {} };
        STORE.set("quests", s);
      }
      return s;
    }

    var QUESTS = [
      { id: "play1", title: "Launch any game", xp: 50 },
      { id: "browse", title: "Open Explore page", xp: 20 },
      { id: "news", title: "Read the News page", xp: 20 },
      { id: "wish", title: "Add a game to wishlist", xp: 30 }
    ];

    function paintQuests() {
      var s = questsState();
      var list = document.getElementById("feat-quest-list");
      list.innerHTML = QUESTS.map(function (q) {
        var done = !!s.done[q.id];
        return (
          '<li class="feat-quest' +
          (done ? " is-done" : "") +
          '"><span>' +
          esc(q.title) +
          ' <em>+' +
          q.xp +
          " XP</em></span>" +
          (done
            ? "<b>Done</b>"
            : '<button type="button" class="btn btn--small btn--primary" data-claim="' +
              q.id +
              '">Claim</button>') +
          "</li>"
        );
      }).join("");
    }

    questsBtn.addEventListener("click", function () {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) paintQuests();
    });

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-claim]");
      if (!b) return;
      var id = b.dataset.claim;
      var s = questsState();
      // soft auto-complete: allow claim anytime in demo
      s.done[id] = true;
      STORE.set("quests", s);
      var q = QUESTS.filter(function (x) {
        return x.id === id;
      })[0];
      toast("Quest complete! +" + (q ? q.xp : 0) + " XP");
      paintQuests();
    });

    // Edit nickname (demo — stores local display override)
    editNick.addEventListener("click", function () {
      var cur =
        (document.getElementById("me-nick") && document.getElementById("me-nick").textContent) || "Player";
      var next = prompt("New nickname:", cur);
      if (!next || !next.trim()) return;
      next = next.trim().slice(0, 20);
      STORE.set("nickOverride", next);
      document.getElementById("me-nick").textContent = next;
      var av = document.getElementById("me-avatar");
      if (av) av.textContent = next.slice(0, 2).toUpperCase();
      toast("Nickname updated (local)");
    });
    var override = STORE.get("nickOverride", null);
    if (override && document.getElementById("me-nick")) {
      document.getElementById("me-nick").textContent = override;
      var av = document.getElementById("me-avatar");
      if (av) av.textContent = override.slice(0, 2).toUpperCase();
    }

    // Invite code
    inviteBtn.addEventListener("click", function () {
      var code = STORE.get("invite", null);
      if (!code) {
        code = "VX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
        STORE.set("invite", code);
      }
      prompt("Share this invite code with friends:", code);
    });

    // Theme accent on profile
    var themeBtn = document.createElement("button");
    themeBtn.type = "button";
    themeBtn.className = "btn btn--ghost";
    themeBtn.textContent = "Accent color";
    actions.appendChild(themeBtn);
    var accents = ["#7b5cff", "#4fe0b0", "#ffc247", "#ff4d6d", "#5cc8ff"];
    themeBtn.addEventListener("click", function () {
      var i = STORE.get("accentIdx", 0);
      i = (i + 1) % accents.length;
      STORE.set("accentIdx", i);
      document.documentElement.style.setProperty("--accent", accents[i]);
      toast("Accent changed");
    });
    var ai = STORE.get("accentIdx", null);
    if (ai != null) document.documentElement.style.setProperty("--accent", accents[ai]);
  }

  /* ---------- EXPLORE ---------- */
  function featExplore() {
    var main = document.querySelector("main.x, main.shell");
    if (!main) return;

    // Daily challenge + trivia
    var sec = document.createElement("section");
    sec.className = "section feat-explore-extra";
    sec.innerHTML =
      '<div class="section__head"><h2>Daily challenge</h2><span class="section__note" id="feat-ch-status">Not started</span></div>' +
      '<div class="feat-challenge">' +
      '<p id="feat-ch-text">Find a game with rating ≥ 4.5 and add it to cart (or open its page).</p>' +
      '<button type="button" class="btn btn--primary" id="feat-ch-start">Accept challenge</button>' +
      '<button type="button" class="btn btn--ghost" id="feat-trivia">🧠 Trivia quiz</button>' +
      "</div>" +
      '<div id="feat-trivia-box" class="feat-trivia" hidden></div>';
    main.appendChild(sec);

    var challenges = [
      "Open any Racing game details.",
      "Use the search box and find a strategy title.",
      "Press “Surprise me” at least once.",
      "Scroll the leaderboard and sort by Score.",
      "Add any game to cart from this page."
    ];
    var day = new Date().getDate() % challenges.length;
    document.getElementById("feat-ch-text").textContent = challenges[day];

    document.getElementById("feat-ch-start").addEventListener("click", function () {
      STORE.set("challengeDay", new Date().toDateString());
      document.getElementById("feat-ch-status").textContent = "Active — good luck!";
      toast("Challenge accepted");
    });
    if (STORE.get("challengeDay", "") === new Date().toDateString()) {
      document.getElementById("feat-ch-status").textContent = "Active today";
    }

    // Trivia
    var QUESTIONS = [
      {
        q: "Which game is described as races through a flooded megacity?",
        a: ["Neon Drifter", "Iron Meridian", "Static Bloom"],
        c: 0
      },
      {
        q: "What does the History page store?",
        a: ["Only screenshots", "Play sessions, scores and time", "Friend messages"],
        c: 1
      },
      {
        q: "Where do purchased games appear?",
        a: ["News", "Explore only", "Library & Profile"],
        c: 2
      },
      {
        q: "How many sections does the main nav have?",
        a: ["3", "6", "10"],
        c: 1
      }
    ];

    document.getElementById("feat-trivia").addEventListener("click", function () {
      var box = document.getElementById("feat-trivia-box");
      box.hidden = false;
      var qi = 0;
      var score = 0;
      function show() {
        if (qi >= QUESTIONS.length) {
          box.innerHTML =
            "<p><b>Quiz finished!</b> Score: " +
            score +
            " / " +
            QUESTIONS.length +
            "</p>" +
            '<button type="button" class="btn btn--primary" id="feat-trivia-retry">Try again</button>';
          document.getElementById("feat-trivia-retry").onclick = function () {
            qi = 0;
            score = 0;
            show();
          };
          toast("Trivia score: " + score + "/" + QUESTIONS.length);
          return;
        }
        var Q = QUESTIONS[qi];
        box.innerHTML =
          "<p class='feat-trivia__q'>" +
          esc(Q.q) +
          "</p>" +
          Q.a
            .map(function (ans, i) {
              return (
                '<button type="button" class="btn btn--ghost feat-trivia__opt" data-i="' +
                i +
                '">' +
                esc(ans) +
                "</button>"
              );
            })
            .join("");
        box.querySelectorAll("[data-i]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (+btn.dataset.i === Q.c) {
              score++;
              toast("Correct!");
            } else toast("Wrong — next question");
            qi++;
            show();
          });
        });
      }
      show();
    });

    // Update chip count
    var chips = document.querySelector(".x-hero__chips");
    if (chips) {
      chips.innerHTML = "<span>29 games</span><span>6 pages</span><span>24/7</span><span>New features</span>";
    }
  }


  /* ---------- GLOBAL: shared helpers ---------- */
  function gamesMap() {
    if (window.GAMES && typeof window.GAMES === "object") return window.GAMES;
    if (window.VP && window.VP.games) return window.VP.games;
    return {};
  }

  function gameTitles() {
    return Object.keys(gamesMap());
  }

  function getGame(title) {
    var g = gamesMap()[title];
    return g || null;
  }

  /* ---------- GLOBAL: dark mode ---------- */
  function featTheme() {
    var KEY = "theme";
    var cur = STORE.get(KEY, "dark");
    if (cur === "light") document.documentElement.classList.add("feat-light");
    else document.documentElement.classList.remove("feat-light");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feat-fab feat-fab--theme";
    btn.title = "Toggle theme (T)";
    btn.setAttribute("aria-label", "Toggle light/dark theme");
    btn.innerHTML = cur === "light" ? "☀️" : "🌙";
    document.body.appendChild(btn);

    function toggle() {
      var now = STORE.get(KEY, "dark") === "light" ? "dark" : "light";
      STORE.set(KEY, now);
      document.documentElement.classList.toggle("feat-light", now === "light");
      btn.innerHTML = now === "light" ? "☀️" : "🌙";
      toast(now === "light" ? "Light theme" : "Dark theme");
    }
    btn.addEventListener("click", toggle);
    window.__featToggleTheme = toggle;
  }

  /* ---------- GLOBAL: keyboard shortcuts ---------- */
  function featShortcuts() {
    var help = document.createElement("div");
    help.id = "feat-hotkeys";
    help.className = "feat-hotkeys";
    help.hidden = true;
    help.innerHTML =
      '<div class="feat-hotkeys__card">' +
      "<h3>Keyboard shortcuts</h3>" +
      "<ul>" +
      "<li><kbd>/</kbd> Focus search</li>" +
      "<li><kbd>?</kbd> Show this help</li>" +
      "<li><kbd>T</kbd> Toggle theme</li>" +
      "<li><kbd>C</kbd> Open cart</li>" +
      "<li><kbd>W</kbd> Open wishlist</li>" +
      "<li><kbd>G</kbd> Game of the day</li>" +
      "<li><kbd>Esc</kbd> Close overlays</li>" +
      "</ul>" +
      '<button type="button" class="btn btn--ghost btn--small" data-close-hotkeys>Close</button>' +
      "</div>";
    document.body.appendChild(help);

    help.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-hotkeys]") || e.target === help) help.hidden = true;
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input, textarea, select") && e.key !== "Escape") return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        help.hidden = !help.hidden;
      } else if (e.key === "Escape") {
        help.hidden = true;
        var cmp = document.getElementById("feat-compare-modal");
        if (cmp) cmp.hidden = true;
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        var q = document.getElementById("feat-home-q") || document.getElementById("feat-news-q") || document.querySelector('input[type="search"]');
        if (q) {
          e.preventDefault();
          q.focus();
        }
      } else if (e.key === "t" || e.key === "T") {
        if (window.__featToggleTheme) window.__featToggleTheme();
      } else if (e.key === "c" || e.key === "C") {
        var cart = document.querySelector("[data-cart-open]");
        if (cart) cart.click();
      } else if (e.key === "w" || e.key === "W") {
        var wish = document.getElementById("feat-wishlist-open");
        if (wish) wish.click();
      } else if (e.key === "g" || e.key === "G") {
        if (window.__featGameOfDay) window.__featGameOfDay();
      }
    });
  }

  /* ---------- GLOBAL: daily streak ---------- */
  function featStreak() {
    var today = new Date().toISOString().slice(0, 10);
    var data = STORE.get("streak", { last: null, count: 0, best: 0 });
    if (data.last === today) return data.count;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (data.last === yesterday) data.count += 1;
    else data.count = 1;
    if (data.count > data.best) data.best = data.count;
    data.last = today;
    STORE.set("streak", data);
    if (data.count > 1) {
      setTimeout(function () {
        toast("🔥 Login streak: " + data.count + " days (best " + data.best + ")");
      }, 800);
    }
    return data.count;
  }

  /* ---------- GLOBAL: compare tray ---------- */
  function featCompare() {
    var tray = document.createElement("div");
    tray.id = "feat-compare-tray";
    tray.className = "feat-compare-tray";
    tray.hidden = true;
    tray.innerHTML =
      '<div class="feat-compare-tray__inner">' +
      '<span class="feat-compare-tray__label">Compare (<span id="feat-cmp-n">0</span>/3)</span>' +
      '<div class="feat-compare-tray__list" id="feat-cmp-list"></div>' +
      '<button type="button" class="btn btn--primary btn--small" id="feat-cmp-go">Compare</button>' +
      '<button type="button" class="btn btn--ghost btn--small" id="feat-cmp-clear">Clear</button>' +
      "</div>";
    document.body.appendChild(tray);

    var modal = document.createElement("div");
    modal.id = "feat-compare-modal";
    modal.className = "feat-modal";
    modal.hidden = true;
    modal.innerHTML = '<div class="feat-modal__card feat-modal__card--wide" id="feat-cmp-body"></div>';
    document.body.appendChild(modal);

    function list() {
      return STORE.get("compare", []);
    }
    function paint() {
      var L = list();
      tray.hidden = L.length === 0;
      var n = document.getElementById("feat-cmp-n");
      if (n) n.textContent = String(L.length);
      var box = document.getElementById("feat-cmp-list");
      if (box)
        box.innerHTML = L.map(function (t) {
          return '<span class="feat-chip">' + esc(t) + ' <button type="button" data-cmp-rm="' + esc(t) + '" aria-label="Remove">×</button></span>';
        }).join("");
    }
    paint();

    window.__featAddCompare = function (title) {
      if (!title) return;
      var L = list();
      if (L.indexOf(title) >= 0) {
        toast("Already in compare");
        return;
      }
      if (L.length >= 3) {
        toast("Compare is full (max 3)");
        return;
      }
      L.push(title);
      STORE.set("compare", L);
      paint();
      toast("Added to compare: " + title);
    };

    document.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-cmp-rm]");
      if (rm) {
        var L = list().filter(function (x) {
          return x !== rm.dataset.cmpRm;
        });
        STORE.set("compare", L);
        paint();
      }
      var add = e.target.closest("[data-compare]");
      if (add) {
        var t =
          add.dataset.compare ||
          (add.closest("[data-game]") && add.closest("[data-game]").dataset.game) ||
          (document.getElementById("hero-title") && document.getElementById("hero-title").textContent);
        if (t) window.__featAddCompare(t);
      }
    });

    document.getElementById("feat-cmp-clear").addEventListener("click", function () {
      STORE.set("compare", []);
      paint();
    });

    document.getElementById("feat-cmp-go").addEventListener("click", function () {
      var L = list();
      if (L.length < 2) {
        toast("Pick at least 2 games");
        return;
      }
      var rows = [
        ["Title", "Rating", "Price", "Genre", "Players", "Size", "Tags"]
      ];
      L.forEach(function (t) {
        var g = getGame(t) || {};
        var p = g.price || {};
        var price = p.now || p.value || "—";
        if (typeof price === "number") price = "$" + price;
        rows.push([
          t,
          g.rating != null ? "★ " + g.rating : "—",
          String(price),
          g.genre || "—",
          g.players || "—",
          g.size || "—",
          (g.tags || []).slice(0, 4).join(", ") || "—"
        ]);
      });
      var html =
        '<button type="button" class="feat-modal__x" data-cmp-close aria-label="Close">×</button><h2>Compare games</h2><div class="feat-cmp-table-wrap"><table class="feat-cmp-table"><thead><tr>' +
        rows[0]
          .map(function (h) {
            return "<th>" + esc(h) + "</th>";
          })
          .join("") +
        "</tr></thead><tbody>";
      for (var i = 1; i < rows.length; i++) {
        html +=
          "<tr>" +
          rows[i]
            .map(function (c, j) {
              return (j === 0 ? "<th>" : "<td>") + esc(c) + (j === 0 ? "</th>" : "</td>");
            })
            .join("") +
          "</tr>";
      }
      html += "</tbody></table></div>";
      document.getElementById("feat-cmp-body").innerHTML = html;
      modal.hidden = false;
    });

    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.closest("[data-cmp-close]")) modal.hidden = true;
    });
  }

  /* ---------- GLOBAL: coupons ---------- */
  var COUPONS = {
    VORTEX10: { off: 10, label: "10% off cart" },
    WEEKEND20: { off: 20, label: "20% weekend deal" },
    NEWPLAYER: { off: 15, label: "15% for new players" },
    STREAK5: { off: 5, label: "5% streak bonus" }
  };

  function featCoupons() {
    // Hook into cart if present
    function inject() {
      var cart = document.querySelector(".cart, [data-cart], #cart, .drawer--cart");
      if (!cart || cart.querySelector("#feat-coupon")) return;
      var box = document.createElement("div");
      box.className = "feat-coupon";
      box.innerHTML =
        '<label for="feat-coupon">Coupon code</label>' +
        '<div class="feat-coupon__row">' +
        '<input id="feat-coupon" class="feat-input" placeholder="e.g. VORTEX10" autocomplete="off">' +
        '<button type="button" class="btn btn--ghost btn--small" id="feat-coupon-apply">Apply</button>' +
        "</div>" +
        '<p class="feat-coupon__hint" id="feat-coupon-msg"></p>';
      var footer = cart.querySelector(".cart__footer, .drawer__foot, [data-cart-total]") || cart;
      footer.parentNode.insertBefore(box, footer);
      document.getElementById("feat-coupon-apply").addEventListener("click", function () {
        var code = (document.getElementById("feat-coupon").value || "").trim().toUpperCase();
        var msg = document.getElementById("feat-coupon-msg");
        if (COUPONS[code]) {
          STORE.set("coupon", code);
          msg.textContent = "✓ " + COUPONS[code].label + " applied";
          msg.className = "feat-coupon__hint is-ok";
          toast("Coupon " + code + " applied");
        } else {
          STORE.set("coupon", null);
          msg.textContent = "Unknown code. Try VORTEX10 or WEEKEND20";
          msg.className = "feat-coupon__hint is-bad";
        }
      });
    }
    inject();
    var mo = new MutationObserver(inject);
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- GLOBAL: share / copy link ---------- */
  function featShare() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-share]");
      if (!b) return;
      var title =
        b.dataset.share ||
        (b.closest("[data-game]") && b.closest("[data-game]").dataset.game) ||
        (document.getElementById("hero-title") && document.getElementById("hero-title").textContent) ||
        document.title;
      var url = location.origin + location.pathname + "?game=" + encodeURIComponent(title);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            toast("Link copied: " + title);
          },
          function () {
            prompt("Copy link:", url);
          }
        );
      } else {
        prompt("Copy link:", url);
      }
    });
  }

  /* ---------- GLOBAL: game of the day ---------- */
  function featGameOfDay() {
    function pick() {
      var titles = gameTitles().filter(function (t) {
        var g = getGame(t);
        return g && !g.upcoming;
      });
      if (!titles.length) {
        toast("Catalog not ready yet");
        return;
      }
      var day = new Date().toISOString().slice(0, 10);
      var seed = day.split("-").reduce(function (a, b) {
        return a + parseInt(b, 10);
      }, 0);
      var t = titles[seed % titles.length];
      var g = getGame(t) || {};
      var modal = document.getElementById("feat-gotd-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "feat-gotd-modal";
        modal.className = "feat-modal";
        document.body.appendChild(modal);
      }
      var p = g.price || {};
      var price = p.now || (p.value != null ? "$" + p.value : "—");
      modal.innerHTML =
        '<div class="feat-modal__card">' +
        '<button type="button" class="feat-modal__x" data-gotd-close>×</button>' +
        '<p class="hero__kicker">Game of the day · ' +
        esc(day) +
        "</p>" +
        "<h2>" +
        esc(t) +
        "</h2>" +
        "<p>" +
        esc(g.short || g.about || "") +
        "</p>" +
        '<p><b>' +
        esc(String(price)) +
        "</b> · ★ " +
        esc(String(g.rating || "—")) +
        " · " +
        esc(g.genre || "") +
        "</p>" +
        '<div class="feat-modal__actions">' +
        '<button type="button" class="btn btn--primary" data-buy="' +
        esc(t) +
        '">Add to cart</button>' +
        '<button type="button" class="btn btn--ghost" data-wish data-game="' +
        esc(t) +
        '">Wishlist</button>' +
        '<button type="button" class="btn btn--ghost" data-compare="' +
        esc(t) +
        '">Compare</button>' +
        "</div></div>";
      modal.hidden = false;
      modal.onclick = function (e) {
        if (e.target === modal || e.target.closest("[data-gotd-close]")) modal.hidden = true;
      };
    }
    window.__featGameOfDay = pick;
  }

  /* ---------- GLOBAL: inject action buttons on game cards ---------- */
  function featCardActions() {
    function enhance() {
      document.querySelectorAll("[data-game], .card, article.card").forEach(function (card) {
        if (card.querySelector(".feat-card-actions")) return;
        var title = card.dataset.game || (card.querySelector(".card__title, h3, h2") && card.querySelector(".card__title, h3, h2").textContent.trim());
        if (!title) return;
        if (!card.dataset.game) card.dataset.game = title;
        var bar = document.createElement("div");
        bar.className = "feat-card-actions";
        bar.innerHTML =
          '<button type="button" class="feat-icon-btn" data-compare="' +
          esc(title) +
          '" title="Compare">⇄</button>' +
          '<button type="button" class="feat-icon-btn" data-share="' +
          esc(title) +
          '" title="Share">↗</button>';
        card.appendChild(bar);
      });
    }
    enhance();
    var mo = new MutationObserver(function () {
      enhance();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- HOME extras: genre filter + game of day button ---------- */
  function featHomeExtra() {
    var main = document.querySelector("main.shell");
    if (!main) return;
    var bar = document.querySelector(".feat-bar__row");
    if (bar && !document.getElementById("feat-gotd-btn")) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn--ghost";
      b.id = "feat-gotd-btn";
      b.textContent = "🎯 Game of the day";
      bar.appendChild(b);
      b.addEventListener("click", function () {
        if (window.__featGameOfDay) window.__featGameOfDay();
      });
    }

    // Genre filter chips
    if (document.getElementById("feat-genres")) return;
    var section = document.createElement("div");
    section.className = "feat-genres section";
    section.id = "feat-genres";
    section.innerHTML = '<p class="feat-genres__label">Filter by tag</p><div class="feat-chips" id="feat-genre-chips"></div>';
    var deals = document.getElementById("deals");
    if (deals && deals.parentElement) {
      deals.parentElement.insertBefore(section, deals);
    } else {
      var fb = document.querySelector(".feat-bar");
      if (fb) fb.after(section);
    }

    function collectTags() {
      var counts = {};
      gameTitles().forEach(function (t) {
        var g = getGame(t);
        if (!g || !g.tags) return;
        g.tags.forEach(function (tag) {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      });
      // also from DOM cards
      document.querySelectorAll("[data-game]").forEach(function () {});
      return Object.keys(counts)
        .sort(function (a, b) {
          return counts[b] - counts[a];
        })
        .slice(0, 12);
    }

    var active = null;
    function paintChips() {
      var tags = collectTags();
      var box = document.getElementById("feat-genre-chips");
      if (!box) return;
      if (!tags.length) {
        // retry after catalog paints
        setTimeout(paintChips, 600);
        return;
      }
      box.innerHTML =
        '<button type="button" class="feat-chip' +
        (active ? "" : " is-on") +
        '" data-tag="">All</button>' +
        tags
          .map(function (t) {
            return (
              '<button type="button" class="feat-chip' +
              (active === t ? " is-on" : "") +
              '" data-tag="' +
              esc(t) +
              '">' +
              esc(t) +
              "</button>"
            );
          })
          .join("");
    }
    paintChips();
    setTimeout(paintChips, 1200);

    document.getElementById("feat-genre-chips").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tag]");
      if (!btn) return;
      active = btn.dataset.tag || null;
      paintChips();
      document.querySelectorAll(".grid .card, .grid [data-game], #deals > *, #fresh > *, .chart > *").forEach(function (card) {
        if (!active) {
          card.style.display = "";
          return;
        }
        var title = card.dataset.game || (card.querySelector(".card__title, h3") && card.querySelector(".card__title, h3").textContent.trim());
        var g = title && getGame(title);
        var tags = (g && g.tags) || [];
        var text = card.textContent;
        var ok = tags.indexOf(active) >= 0 || text.indexOf(active) >= 0;
        card.style.display = ok ? "" : "none";
      });
      toast(active ? "Filter: " + active : "All games");
    });
  }

  /* ---------- LIBRARY extras: notes ---------- */
  function featLibraryNotes() {
    function notes() {
      return STORE.get("notes", {});
    }
    function enhance() {
      document.querySelectorAll("[data-game], .lib-card, .library .card").forEach(function (card) {
        if (card.querySelector("[data-note-btn]")) return;
        var title = card.dataset.game || (card.querySelector("h3,h2,.card__title") && card.querySelector("h3,h2,.card__title").textContent.trim());
        if (!title) return;
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--ghost btn--small";
        btn.dataset.noteBtn = title;
        var n = notes()[title];
        btn.textContent = n ? "📝 Note" : "📝 Add note";
        card.appendChild(btn);
      });
    }
    enhance();
    var mo = new MutationObserver(enhance);
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-note-btn]");
      if (!b) return;
      var title = b.dataset.noteBtn;
      var all = notes();
      var current = all[title] || "";
      var next = prompt("Personal note for «" + title + "»:", current);
      if (next === null) return;
      next = next.trim();
      if (next) all[title] = next;
      else delete all[title];
      STORE.set("notes", all);
      b.textContent = next ? "📝 Note" : "📝 Add note";
      toast(next ? "Note saved" : "Note removed");
    });
  }

  /* ---------- PROFILE extras: streak display + coupon list ---------- */
  function featProfileExtra() {
    var main = document.querySelector("main.shell, .profile, [data-page='profile']");
    var actions = document.querySelector(".feat-tools, .profile__actions, .page-head");
    if (!actions) return;
    var streak = STORE.get("streak", { count: 0, best: 0 });
    var box = document.createElement("div");
    box.className = "feat-streak-card";
    box.innerHTML =
      "<h3>🔥 Daily streak</h3>" +
      "<p><b>" +
      (streak.count || 0) +
      "</b> days current · best <b>" +
      (streak.best || 0) +
      "</b></p>" +
      "<p class='feat-muted'>Coupons: <code>VORTEX10</code> · <code>WEEKEND20</code> · <code>NEWPLAYER</code></p>" +
      (streak.count >= 5
        ? "<p class='feat-muted'>Streak ≥5 → use code <code>STREAK5</code></p>"
        : "");
    actions.after(box);
  }

  /* ---------- HISTORY extras: stats ---------- */
  function featHistoryStats() {
    var head = document.querySelector(".page-head, .feat-tools");
    if (!head || document.getElementById("feat-hist-stats")) return;
    var stats = document.createElement("div");
    stats.id = "feat-hist-stats";
    stats.className = "feat-hist-stats";
    head.after(stats);
    function paint() {
      var list = [];
      if (window.VP && window.VP.readHistory) list = window.VP.readHistory() || [];
      var total = list.length;
      var secs = list.reduce(function (s, x) {
        return s + (x.dur || 0);
      }, 0);
      var hours = (secs / 3600).toFixed(1);
      var top = {};
      list.forEach(function (x) {
        top[x.title] = (top[x.title] || 0) + 1;
      });
      var ranked = Object.keys(top).sort(function (a, b) {
        return top[b] - top[a];
      });
      stats.innerHTML =
        "<span><b>" +
        total +
        "</b> sessions</span>" +
        "<span><b>" +
        hours +
        "h</b> played</span>" +
        (ranked[0] ? "<span>Most played: <b>" + esc(ranked[0]) + "</b></span>" : "");
    }
    paint();
    document.addEventListener("vp:history", paint);
  }


  /* boot */

  /* ---------- AVATAR (photo from gallery) ---------- */
  function featAvatar() {
    var KEY = "avatar";
    var SIZE = 256;

    function paint() {
      var url = STORE.get(KEY, null);
      var nodes = document.querySelectorAll("#me-avatar, .session__avatar");
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (url) {
          if (el.dataset.photo !== url) {
            el.style.backgroundImage = 'url("' + url + '")';
            el.dataset.photo = url;
          }
          el.classList.add("has-photo");
        } else if (el.classList.contains("has-photo")) {
          el.style.backgroundImage = "";
          el.removeAttribute("data-photo");
          el.classList.remove("has-photo");
        }
      }
      var rm = document.getElementById("feat-avatar-remove");
      if (rm) rm.hidden = !url;
    }

    paint();

    // topbar avatar is re-rendered by app.js on sign-in / wallet changes
    var session = document.querySelector("[data-session]");
    if (session && window.MutationObserver) {
      new MutationObserver(paint).observe(session, { childList: true });
    }
    document.addEventListener("vp:signin", paint);
    document.addEventListener("vp:wallet", paint);

    var big = document.getElementById("me-avatar");
    if (!big) return; // not the profile page

    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.hidden = true;
    input.id = "feat-avatar-input";
    document.body.appendChild(input);

    function pick() {
      input.click();
    }

    big.classList.add("is-editable");
    big.setAttribute("role", "button");
    big.setAttribute("tabindex", "0");
    big.setAttribute("aria-label", "Change profile photo");
    big.title = "Change photo";
    big.addEventListener("click", pick);
    big.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        pick();
      }
    });

    var actions = document.querySelector(".card-me__actions");
    if (actions) {
      var change = document.createElement("button");
      change.type = "button";
      change.className = "btn btn--ghost";
      change.id = "feat-avatar-change";
      change.textContent = "Change photo";
      change.addEventListener("click", pick);

      var remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--ghost";
      remove.id = "feat-avatar-remove";
      remove.textContent = "Remove photo";
      remove.hidden = true;
      remove.addEventListener("click", function () {
        STORE.set(KEY, null);
        paint();
        toast("Photo removed");
      });

      var anchor = document.getElementById("feat-edit-nick");
      if (anchor && anchor.parentNode === actions) {
        actions.insertBefore(change, anchor.nextSibling);
        actions.insertBefore(remove, change.nextSibling);
      } else {
        actions.insertBefore(remove, actions.firstChild);
        actions.insertBefore(change, actions.firstChild);
      }
      paint();
    }

    // crop to a centered square and shrink, so it fits into localStorage
    function process(file) {
      if (!file || !/^image\//.test(file.type)) {
        toast("Please choose an image file");
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () {
        toast("Could not read the file");
      };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () {
          toast("This image format is not supported");
        };
        img.onload = function () {
          var side = Math.min(img.naturalWidth, img.naturalHeight);
          if (!side) return toast("Could not read the image");
          var sx = (img.naturalWidth - side) / 2;
          var sy = (img.naturalHeight - side) / 2;
          var canvas = document.createElement("canvas");
          canvas.width = canvas.height = SIZE;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
          var url = canvas.toDataURL("image/jpeg", 0.88);
          STORE.set(KEY, url);
          if (STORE.get(KEY, null) !== url) {
            toast("Could not save the photo (storage is full)");
            return;
          }
          paint();
          toast("Profile photo updated");
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }

    input.addEventListener("change", function () {
      process(input.files && input.files[0]);
      input.value = ""; // allow picking the same file again
    });
  }

  function boot() {
    var page = document.body && document.body.dataset.page;
    try {
      featTheme();
      featShortcuts();
      featStreak();
      featCompare();
      featCoupons();
      featShare();
      featGameOfDay();
      featCardActions();
      if (page === "home") { featHome(); featHomeExtra(); }
      else if (page === "news") featNews();
      else if (page === "library") { featLibrary(); featLibraryNotes(); }
      else if (page === "history") { featHistory(); featHistoryStats(); }
      else if (page === "profile") { featProfile(); featProfileExtra(); }
      else if (page === "explore") featExplore();
      featAvatar();
    } catch (err) {
      console.error("features:", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
