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

  /* boot */
  function boot() {
    var page = document.body && document.body.dataset.page;
    try {
      if (page === "home") featHome();
      else if (page === "news") featNews();
      else if (page === "library") featLibrary();
      else if (page === "history") featHistory();
      else if (page === "profile") featProfile();
      else if (page === "explore") featExplore();
    } catch (err) {
      console.error("features:", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
