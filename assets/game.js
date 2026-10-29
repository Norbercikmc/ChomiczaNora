(function () {
  "use strict";

  var d = document;
  var KEY = "chomicza-clicker-v1";
  var hit = d.getElementById("l");
  var wrap = d.querySelector(".logo-wrap");
  if (!hit || !wrap) return;

  var UPGRADES = [
    { id: "paw", icon: "🐾", name: "Mocniejsze łapki", desc: "+1 orzeszek za kliknięcie", base: 50, growth: 1.7, click: 1 },
    { id: "hamster", icon: "🐹", name: "Chomik", desc: "1 orzeszek/s", base: 15, growth: 1.15, cps: 1 },
    { id: "wheel", icon: "🎡", name: "Koło do biegania", desc: "5 orzeszków/s", base: 100, growth: 1.15, cps: 5 },
    { id: "pi", icon: "🥧", name: "Raspberry Pi", desc: "20 orzeszków/s", base: 600, growth: 1.15, cps: 20 },
    { id: "mc", icon: "⛏️", name: "Serwer Minecraft", desc: "100 orzeszków/s", base: 3000, growth: 1.15, cps: 100 },
    { id: "lab", icon: "🖥️", name: "Maszynownia", desc: "500 orzeszków/s", base: 15000, growth: 1.15, cps: 500 },
    { id: "rack", icon: "🗄️", name: "Szafa rack", desc: "2 500 orzeszków/s", base: 80000, growth: 1.15, cps: 2500 },
    { id: "gpu", icon: "🎮", name: "Farma GPU", desc: "12 000 orzeszków/s", base: 450000, growth: 1.15, cps: 12000 },
    { id: "ai", icon: "🤖", name: "Klaster AI", desc: "60 000 orzeszków/s", base: 2500000, growth: 1.15, cps: 60000 },
    { id: "dc", icon: "🏢", name: "Centrum danych", desc: "350 000 orzeszków/s", base: 15000000, growth: 1.15, cps: 350000 }
  ];

  // Jednorazowe ulepszenia, widoczne dopiero po spełnieniu warunku ok()
  var ONCE = [];
  UPGRADES.forEach(function (u) {
    if (!u.cps) return;
    [{ n: 10, k: 50 }, { n: 25, k: 400 }].forEach(function (t, i) {
      ONCE.push({
        id: u.id + (i + 1), icon: u.icon, name: u.name + " — poziom " + (i + 2),
        desc: "Produkcja ×2 (od " + t.n + " szt.)", cost: u.base * t.k, target: u.id, mult: 2,
        ok: function () { return count(u) >= t.n; }
      });
    });
  });
  ONCE.push(
    { id: "gloves", icon: "🧤", name: "Złote łapki", desc: "Klikanie ×2 (od 10 łapek)", cost: 25000, clickMult: 2,
      ok: function () { return (state.owned.paw || 0) >= 10; } },
    { id: "coach", icon: "🏋️", name: "Trener chomików", desc: "Kliknięcie daje +2% produkcji/s", cost: 10000, clickPct: 0.02,
      ok: function () { return state.total >= 5000; } },
    { id: "champ", icon: "🏆", name: "Mistrz klikania", desc: "Kliknięcie daje dodatkowo +5% produkcji/s", cost: 1000000, clickPct: 0.05,
      ok: function () { return state.total >= 500000; } },
    { id: "oc", icon: "⚡", name: "Przetaktowanie", desc: "Cała produkcja +25%", cost: 200000, global: 1.25,
      ok: function () { return state.total >= 100000; } },
    { id: "psu", icon: "🔌", name: "Zasilacz Gold", desc: "Cała produkcja +25%", cost: 5000000, global: 1.25,
      ok: function () { return state.total >= 2500000; } },
    { id: "water", icon: "❄️", name: "Chłodzenie wodne", desc: "Cała produkcja +50%", cost: 100000000, global: 1.5,
      ok: function () { return state.total >= 50000000; } }
  );

  var state = load();
  var rows = {};

  var compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 2 });
  function fmt(n) {
    return n < 10000 ? Math.floor(n).toLocaleString("pl-PL") : compact.format(n);
  }

  function load() {
    var s = { nuts: 0, total: 0, owned: {}, ups: {} };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && isFinite(raw.nuts) && raw.nuts >= 0) s.nuts = raw.nuts;
      if (raw && isFinite(raw.total) && raw.total >= 0) s.total = raw.total;
      if (!(raw && isFinite(raw.total))) s.total = s.nuts;
      UPGRADES.forEach(function (u) {
        var v = raw && raw.owned && raw.owned[u.id];
        if (Number.isInteger(v) && v > 0) s.owned[u.id] = v;
      });
      ONCE.forEach(function (o) {
        if (raw && raw.ups && raw.ups[o.id] === true) s.ups[o.id] = true;
      });
    } catch (e) { /* brak lub uszkodzony zapis */ }
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* brak dostępu do storage */ }
  }

  function count(u) { return state.owned[u.id] || 0; }
  function cost(u) { return Math.ceil(u.base * Math.pow(u.growth, count(u))); }

  function bought(o) { return !!state.ups[o.id]; }
  function buildingMult(u) {
    return ONCE.reduce(function (a, o) { return a * (bought(o) && o.target === u.id ? o.mult : 1); }, 1);
  }
  function globalMult() {
    return ONCE.reduce(function (a, o) { return a * (bought(o) && o.global ? o.global : 1); }, 1);
  }
  function perSecond() {
    var sum = UPGRADES.reduce(function (a, u) { return a + (u.cps || 0) * count(u) * buildingMult(u); }, 0);
    return sum * globalMult();
  }
  function perClick() {
    var base = UPGRADES.reduce(function (a, u) { return a + (u.click || 0) * count(u); }, 1);
    var mult = ONCE.reduce(function (a, o) { return a * (bought(o) && o.clickMult ? o.clickMult : 1); }, 1);
    var pct = ONCE.reduce(function (a, o) { return a + (bought(o) && o.clickPct ? o.clickPct : 0); }, 0);
    return base * mult + perSecond() * pct;
  }

  function el(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  // Licznik nad logiem
  var score = el("div", "score");
  var scoreNum = el("strong", "score__num", "0");
  var scoreRate = el("small", "score__rate", "");
  score.appendChild(scoreNum);
  score.appendChild(d.createTextNode(" orzeszków 🌰"));
  score.appendChild(d.createElement("br"));
  score.appendChild(scoreRate);
  wrap.appendChild(score);

  // Sklep
  var shop = el("aside", "shop");
  var tabs = el("div", "shop__tabs");
  var toggle = el("button", "shop__toggle", "Ulepszenia");
  var boardToggle = el("button", "shop__toggle", "Ranking");
  var gambleToggle = el("button", "shop__toggle", "Gamba");
  toggle.type = boardToggle.type = gambleToggle.type = "button";
  toggle.setAttribute("aria-controls", "shop-list");
  boardToggle.setAttribute("aria-controls", "shop-board");
  gambleToggle.setAttribute("aria-controls", "shop-gamble");
  tabs.appendChild(gambleToggle);
  tabs.appendChild(boardToggle);
  tabs.appendChild(toggle);
  var list = el("div", "shop__list");
  list.id = "shop-list";
  var board = el("div", "shop__list board");
  board.id = "shop-board";

  var onceHead = el("p", "board__msg", "Dostępne ulepszenia");
  onceHead.hidden = true;
  var onceBox = el("div", "once");
  var onceKey = "";
  var onceRows = {};
  list.appendChild(onceHead);
  list.appendChild(onceBox);

  UPGRADES.forEach(function (u) {
    var b = el("button", "up");
    b.type = "button";
    var cnt = el("span", "up__count");
    var price = el("span", "up__cost");
    b.appendChild(el("span", "up__icon", u.icon));
    b.appendChild(el("span", "up__name", u.name));
    b.appendChild(cnt);
    b.appendChild(el("span", "up__desc", u.desc));
    b.appendChild(price);
    b.addEventListener("click", function () { buy(u); });
    list.appendChild(b);
    rows[u.id] = { btn: b, cnt: cnt, price: price };
  });

  var reset = el("button", "shop__reset", "Zacznij od nowa");
  reset.type = "button";
  reset.addEventListener("click", function () {
    if (!confirm("Na pewno usunąć cały postęp?")) return;
    state = { nuts: 0, total: 0, owned: {}, ups: {} };
    save();
    render();
  });
  list.appendChild(reset);

  // Ranking globalny (serwer Java za reverse proxy z HTTPS)
  var API = "https://api.chomiczanora.pl/scores";
  var ID_KEY = KEY + "-id";
  var NICK_KEY = KEY + "-nick";
  var NICK_RE = /^[\p{L}\p{N} _.-]{2,16}$/u;
  var playerId = loadId();
  var nick = "";
  var lastSent = -1;
  var view = null;
  try { nick = localStorage.getItem(NICK_KEY) || ""; } catch (e) { /* brak storage */ }
  if (!NICK_RE.test(nick)) nick = "";

  function loadId() {
    try {
      var saved = localStorage.getItem(ID_KEY);
      if (saved && /^[0-9a-f]{32}$/.test(saved)) return saved;
    } catch (e) { /* brak storage */ }
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    var id = Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    try { localStorage.setItem(ID_KEY, id); } catch (e) { /* brak storage */ }
    return id;
  }

  var boardMsg = el("p", "board__msg", "Ładowanie…");
  var boardList = el("ol", "board__list");
  var nickRow = el("div", "board__row");
  var nickInput = el("input", "board__nick");
  nickInput.type = "text";
  nickInput.maxLength = 16;
  nickInput.placeholder = "Twój nick";
  nickInput.autocomplete = "off";
  nickInput.value = nick;
  nickInput.setAttribute("aria-label", "Nick w rankingu");
  var nickBtn = el("button", "board__save", "Zapisz");
  nickBtn.type = "button";
  nickRow.appendChild(nickInput);
  nickRow.appendChild(nickBtn);
  board.appendChild(boardMsg);
  board.appendChild(boardList);
  board.appendChild(nickRow);

  function refreshBoard() {
    fetch(API, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        boardList.textContent = "";
        rows.slice(0, 10).forEach(function (row) {
          var li = el("li", "board__item");
          li.appendChild(el("span", "board__name", String(row.nick)));
          li.appendChild(el("span", "board__score", fmt(Number(row.score))));
          boardList.appendChild(li);
        });
        boardMsg.textContent = rows.length ? "Zebrane orzeszki łącznie" : "Brak wyników — bądź pierwszy!";
      })
      .catch(function () { boardMsg.textContent = "Ranking jest teraz niedostępny."; });
  }

  function submitScore() {
    var total = Math.floor(state.total);
    if (!nick || total <= lastSent) return;
    lastSent = total;
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playerId, nick: nick, score: total })
    }).then(function (r) {
      if (r.status === 409) {
        boardMsg.textContent = "Ten nick jest już zajęty.";
        nick = "";
        lastSent = -1;
        return;
      }
      if (!r.ok) throw new Error(r.status);
      if (view === "board") refreshBoard();
    }).catch(function () { lastSent = -1; });
  }

  nickBtn.addEventListener("click", function () {
    var v = nickInput.value.trim();
    if (!NICK_RE.test(v)) {
      boardMsg.textContent = "Nick: 2–16 znaków (litery, cyfry, spacja, _ . -).";
      return;
    }
    nick = v;
    try { localStorage.setItem(NICK_KEY, v); } catch (e) { /* brak storage */ }
    lastSent = -1;
    submitScore();
  });

  setInterval(submitScore, 30000);
  setInterval(function () { if (view === "board") refreshBoard(); }, 60000);

  // Gamba: tylko wirtualne orzeszki, wygrane nie liczą się do rankingu (state.total)
  var GAMES = [
    { icon: "🪙", name: "Rzut monetą", desc: "48% szans na ×2", outcomes: [[0.48, 2], [0.52, 0]] },
    { icon: "🎡", name: "Koło chomika", desc: "×0 / ×1 / ×2 / ×3 / ×10", outcomes: [[0.58, 0], [0.15, 1], [0.15, 2], [0.10, 3], [0.02, 10]] }
  ];
  var gamble = el("div", "shop__list gamble");
  gamble.id = "shop-gamble";
  var gambleMsg = el("p", "board__msg", "Postaw orzeszki i spróbuj szczęścia.");
  var betInput = el("input", "board__nick");
  betInput.type = "number";
  betInput.min = "1";
  betInput.step = "1";
  betInput.value = "10";
  betInput.setAttribute("aria-label", "Stawka");
  var quick = el("div", "board__row");
  [["10%", 0.1], ["50%", 0.5], ["Wszystko", 1]].forEach(function (q) {
    var qb = el("button", "board__save", q[0]);
    qb.type = "button";
    qb.addEventListener("click", function () {
      betInput.value = Math.max(1, Math.floor(state.nuts * q[1]));
    });
    quick.appendChild(qb);
  });
  gamble.appendChild(gambleMsg);
  gamble.appendChild(betInput);
  gamble.appendChild(quick);

  var busy = false;
  function play(g) {
    if (busy) return;
    var bet = Math.floor(Number(betInput.value));
    if (!isFinite(bet) || bet < 1) { gambleMsg.textContent = "Podaj stawkę (min. 1)."; return; }
    if (bet > Math.floor(state.nuts)) { gambleMsg.textContent = "Nie masz tylu orzeszków."; return; }
    busy = true;
    state.nuts -= bet;
    gambleMsg.textContent = "🎲 Losowanie…";
    render();
    setTimeout(function () {
      var r = Math.random(), acc = 0, mult = 0;
      for (var i = 0; i < g.outcomes.length; i++) {
        acc += g.outcomes[i][0];
        if (r < acc) { mult = g.outcomes[i][1]; break; }
      }
      state.nuts += bet * mult;
      gambleMsg.textContent = mult === 0 ? "Przegrana: −" + fmt(bet) + " 🌰"
        : mult === 1 ? "Zwrot stawki."
        : "Wygrana ×" + mult + ": +" + fmt(bet * (mult - 1)) + " 🌰";
      busy = false;
      save();
      render();
    }, 600);
  }
  GAMES.forEach(function (g) {
    var b = el("button", "up");
    b.type = "button";
    b.appendChild(el("span", "up__icon", g.icon));
    b.appendChild(el("span", "up__name", g.name));
    b.appendChild(el("span", "up__count"));
    b.appendChild(el("span", "up__desc", g.desc));
    b.addEventListener("click", function () { play(g); });
    gamble.appendChild(b);
  });

  shop.appendChild(tabs);
  shop.appendChild(list);
  shop.appendChild(board);
  shop.appendChild(gamble);
  d.body.appendChild(shop);

  function setView(v) {
    view = v;
    list.hidden = v !== "up";
    board.hidden = v !== "board";
    gamble.hidden = v !== "gamble";
    toggle.setAttribute("aria-expanded", String(v === "up"));
    boardToggle.setAttribute("aria-expanded", String(v === "board"));
    gambleToggle.setAttribute("aria-expanded", String(v === "gamble"));
    if (v === "board") refreshBoard();
  }
  toggle.addEventListener("click", function () { setView(view === "up" ? null : "up"); });
  boardToggle.addEventListener("click", function () { setView(view === "board" ? null : "board"); });
  gambleToggle.addEventListener("click", function () { setView(view === "gamble" ? null : "gamble"); });
  setView(window.matchMedia("(min-width: 800px)").matches ? "up" : null);

  function buy(u) {
    var c = cost(u);
    if (state.nuts < c) return;
    state.nuts -= c;
    state.owned[u.id] = count(u) + 1;
    save();
    render();
  }

  function buyOnce(o) {
    if (bought(o) || state.nuts < o.cost) return;
    state.nuts -= o.cost;
    state.ups[o.id] = true;
    save();
    render();
  }

  function render() {
    var n = Math.floor(state.nuts);
    scoreNum.textContent = fmt(n);
    var cps = perSecond();
    scoreRate.textContent = cps
      ? cps.toLocaleString("pl-PL", { maximumFractionDigits: 1 }) + " na sekundę"
      : "kliknij logo!";
    d.title = fmt(n) + " orzeszków — Chomicza Nora";

    var visible = ONCE.filter(function (o) { return !bought(o) && o.ok(); });
    var key = visible.map(function (o) { return o.id; }).join();
    if (key !== onceKey) {
      onceKey = key;
      onceBox.textContent = "";
      onceRows = {};
      onceHead.hidden = !visible.length;
      visible.forEach(function (o) {
        var b = el("button", "up");
        b.type = "button";
        b.appendChild(el("span", "up__icon", o.icon));
        b.appendChild(el("span", "up__name", o.name));
        b.appendChild(el("span", "up__count"));
        b.appendChild(el("span", "up__desc", o.desc));
        b.appendChild(el("span", "up__cost", "🌰 " + fmt(o.cost)));
        b.addEventListener("click", function () { buyOnce(o); });
        onceBox.appendChild(b);
        onceRows[o.id] = b;
      });
    }
    visible.forEach(function (o) {
      var locked = state.nuts < o.cost;
      onceRows[o.id].classList.toggle("is-locked", locked);
      onceRows[o.id].setAttribute("aria-disabled", String(locked));
    });

    UPGRADES.forEach(function (u) {
      var r = rows[u.id];
      var c = cost(u);
      r.cnt.textContent = count(u) ? "×" + count(u) : "";
      r.price.textContent = "🌰 " + fmt(c);
      var locked = state.nuts < c;
      r.btn.classList.toggle("is-locked", locked);
      r.btn.setAttribute("aria-disabled", String(locked));
    });
  }

  function pop(x, y, text) {
    var p = el("span", "pop", text);
    p.style.left = x + "px";
    p.style.top = y + "px";
    d.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 800);
  }

  hit.addEventListener("click", function (e) {
    var gain = perClick();
    state.nuts += gain;
    state.total += gain;
    var x = e.clientX, y = e.clientY;
    if (!x && !y) {
      var rect = hit.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    pop(x + (Math.random() * 40 - 20), y - 10, "+" + fmt(gain));
    render();
  });

  setInterval(function () {
    var cps = perSecond();
    if (!cps) return;
    state.nuts += cps / 10;
    state.total += cps / 10;
    render();
  }, 100);

  setInterval(save, 5000);
  d.addEventListener("visibilitychange", function () { if (d.hidden) save(); });
  window.addEventListener("pagehide", save);

  render();
})();
