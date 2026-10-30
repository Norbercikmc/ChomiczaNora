(function () {
  "use strict";

  var d = document;
  var KEY = "chomicza-clicker-v1";
  // Strona jest jednoekranowa: bez tego przeglądarka po przeładowaniu przywraca przesunięcie widoku
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
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

  function stat(k, n) { return function () { return (state.stats[k] || 0) >= n; }; }
  function tot(n) { return function () { return state.total >= n; }; }
  function own(id, n) { return function () { return (state.owned[id] || 0) >= n; }; }
  function buildings() {
    return UPGRADES.reduce(function (a, u) { return a + (u.cps ? count(u) : 0); }, 0);
  }

  var STATS = ["clicks", "golden", "caught", "drops", "fixed", "jackpot", "broke", "prestige", "time"];
  var ACH = [
    { id: "c1", icon: "👆", name: "Pierwszy klik", desc: "Kliknij logo", ok: stat("clicks", 1) },
    { id: "c100", icon: "✌️", name: "Rozgrzewka", desc: "100 kliknięć", ok: stat("clicks", 100) },
    { id: "c1k", icon: "🖐️", name: "Klikacz", desc: "1 000 kliknięć", ok: stat("clicks", 1000) },
    { id: "c10k", icon: "🦾", name: "Żelazny palec", desc: "10 000 kliknięć", ok: stat("clicks", 10000) },
    { id: "t1k", icon: "🌰", name: "Mała spiżarnia", desc: "Zbierz łącznie 1 tys.", ok: tot(1e3) },
    { id: "t100k", icon: "🐹", name: "Pełne policzki", desc: "Zbierz łącznie 100 tys.", ok: tot(1e5) },
    { id: "t10m", icon: "🏦", name: "Skarbiec chomika", desc: "Zbierz łącznie 10 mln", ok: tot(1e7) },
    { id: "t1b", icon: "💰", name: "Orzechowy magnat", desc: "Zbierz łącznie 1 mld", ok: tot(1e9) },
    { id: "t1t", icon: "👑", name: "Orzechowe imperium", desc: "Zbierz łącznie 1 bln", ok: tot(1e12) },
    { id: "h1", icon: "🐹", name: "Pierwszy lokator", desc: "Kup chomika", ok: own("hamster", 1) },
    { id: "h50", icon: "🏘️", name: "Kolonia", desc: "Miej 50 chomików", ok: own("hamster", 50) },
    { id: "lab", icon: "🖥️", name: "Własna Maszynownia", desc: "Kup Maszynownię", ok: own("lab", 1) },
    { id: "dc", icon: "🏢", name: "Hiperskala", desc: "Kup Centrum danych", ok: own("dc", 1) },
    { id: "b100", icon: "🏗️", name: "Deweloper", desc: "Miej 100 budynków łącznie", ok: function () { return buildings() >= 100; } },
    { id: "u5", icon: "🔩", name: "Majsterkowicz", desc: "Kup 5 ulepszeń jednorazowych", ok: function () { return Object.keys(state.ups).length >= 5; } },
    { id: "uall", icon: "⭐", name: "Wszystko kupione", desc: "Kup wszystkie ulepszenia jednorazowe", ok: function () { return Object.keys(state.ups).length >= ONCE.length; } },
    { id: "g1", icon: "✨", name: "Złota łapka", desc: "Kliknij złotego orzeszka", ok: stat("golden", 1) },
    { id: "g10", icon: "💛", name: "Poszukiwacz złota", desc: "Kliknij 10 złotych orzeszków", ok: stat("golden", 10) },
    { id: "run", icon: "🏃", name: "Łowca chomików", desc: "Złap uciekającego chomika", ok: stat("caught", 1) },
    { id: "rain", icon: "🧺", name: "Pełny koszyk", desc: "Złap 50 orzeszków z deszczu", ok: stat("drops", 50) },
    { id: "fix", icon: "🛠️", name: "Admin na dyżurze", desc: "Napraw awarię Maszynowni", ok: stat("fixed", 1) },
    { id: "jack", icon: "🎰", name: "Jackpot", desc: "Wygraj ×10 w Kole chomika", ok: stat("jackpot", 1) },
    { id: "broke", icon: "💸", name: "All in", desc: "Przegraj w gambie wszystko (min. 1 tys.)", ok: stat("broke", 1) },
    { id: "mcp", icon: "⛏️", name: "Na serwerze", desc: "Graj, gdy ktoś jest na serwerze Minecraft", ok: function () { return mcPlayers > 0; } },
    { id: "sea", icon: "🎃", name: "Sezonowiec", desc: "Graj podczas eventu sezonowego", ok: function () { return !!SEASON; } },
    { id: "p1", icon: "🌱", name: "Nowy początek", desc: "Przeprowadź norę", ok: stat("prestige", 1) },
    { id: "p5", icon: "🧳", name: "Wędrowny chomik", desc: "Przeprowadź norę 5 razy", ok: stat("prestige", 5) },
    { id: "hr", icon: "⏰", name: "Jeszcze jedno kliknięcie", desc: "Graj przez godzinę", ok: stat("time", 3600) },
    { id: "pass", icon: "🎟️", name: "Karnet ukończony", desc: "Odbierz wszystkie nagrody z karnetu", ok: function () { return state.pass.claimed >= PASS_LEVELS; } }
  ];

  // Karnet miesięczny: XP za grę, nagrody co poziom, reset z początkiem miesiąca
  var PASS_LEVELS = 30, PASS_XP = 100;
  function passId() {
    var t = new Date();
    return t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2);
  }

  function fresh() { return { nuts: 0, total: 0, run: 0, seeds: 0, owned: {}, ups: {}, ach: {}, stats: {}, last: 0, pass: { id: passId(), xp: 0, claimed: 0 } }; }
  function bump(k) { state.stats[k] = (state.stats[k] || 0) + 1; }
  function achMult() { return 1 + 0.01 * Object.keys(state.ach).length; }
  function seedMult() { return 1 + 0.03 * state.seeds; }
  function seedGain() { return Math.floor(Math.cbrt(state.run / 1e6)); }
  function seedsWord(n) {
    if (n === 1) return "złote nasiono";
    var a = n % 10, b = n % 100;
    return a >= 2 && a <= 4 && (b < 12 || b > 14) ? "złote nasiona" : "złotych nasion";
  }
  function earn(n) {
    state.nuts += n;
    state.total += n;
    state.run += n;
  }

  var state = load();
  var rows = {};

  // Eventy: chwilowe bonusy, awaria, gracze MC i sezon
  var fx = { cps: 1, cpsUntil: 0, click: 1, clickUntil: 0, outage: false };
  var mcPlayers = 0;
  var BIRTHDAY = null; // dzień urodzin projektu jako "MM-DD", np. "05-17"

  function season() {
    var t = new Date();
    var md = ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
    if (BIRTHDAY && md === BIRTHDAY) return { id: "birthday", icon: "🎂", name: "Urodziny projektu", cps: 2 };
    if (md >= "10-25" && md <= "11-02") return { id: "halloween", icon: "🎃", name: "Halloween", cps: 1 };
    if (md >= "12-15" && md <= "12-31") return { id: "xmas", icon: "🎁", name: "Święta", cps: 1 };
    return null;
  }
  var SEASON = season();
  var ITEM = SEASON && SEASON.id !== "birthday" ? SEASON.icon : "🌰";

  function eventCpsMult() {
    var m = Date.now() < fx.cpsUntil ? fx.cps : 1;
    if (fx.outage) m *= 0.5;
    if (SEASON) m *= SEASON.cps;
    return m * (1 + 0.1 * mcPlayers);
  }
  function eventClickMult() { return Date.now() < fx.clickUntil ? fx.click : 1; }

  var compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 2 });
  function fmt(n) {
    return n < 10000 ? Math.floor(n).toLocaleString("pl-PL") : compact.format(n);
  }

  function load() {
    var s = fresh();
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
      ACH.forEach(function (a) {
        if (raw && raw.ach && raw.ach[a.id] === true) s.ach[a.id] = true;
      });
      STATS.forEach(function (k) {
        var v = raw && raw.stats && raw.stats[k];
        if (Number.isInteger(v) && v > 0) s.stats[k] = v;
      });
      if (raw && isFinite(raw.last) && raw.last > 0) s.last = raw.last;
      s.run = raw && isFinite(raw.run) && raw.run >= 0 ? Math.min(raw.run, s.total) : s.total;
      if (raw && Number.isInteger(raw.seeds) && raw.seeds > 0) s.seeds = raw.seeds;
      var p = raw && raw.pass;
      if (p && p.id === passId() && isFinite(p.xp) && p.xp >= 0) {
        s.pass.xp = Math.min(PASS_LEVELS * PASS_XP, p.xp);
        if (Number.isInteger(p.claimed) && p.claimed > 0) s.pass.claimed = Math.min(p.claimed, Math.floor(s.pass.xp / PASS_XP));
      }
    } catch (e) { /* brak lub uszkodzony zapis */ }
    return s;
  }

  function save() {
    state.last = Date.now();
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
    return sum * globalMult() * eventCpsMult() * achMult() * seedMult();
  }
  function perClick() {
    var base = UPGRADES.reduce(function (a, u) { return a + (u.click || 0) * count(u); }, 1);
    var mult = ONCE.reduce(function (a, o) { return a * (bought(o) && o.clickMult ? o.clickMult : 1); }, 1);
    var pct = ONCE.reduce(function (a, o) { return a + (bought(o) && o.clickPct ? o.clickPct : 0); }, 0);
    return base * mult * eventClickMult() * seedMult() + perSecond() * pct;
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
  var scoreFx = el("small", "score__fx", "");
  score.appendChild(scoreNum);
  score.appendChild(d.createTextNode(" orzeszków " + ITEM));
  score.appendChild(d.createElement("br"));
  score.appendChild(scoreRate);
  score.appendChild(scoreFx);
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

  var prestige = el("button", "up prestige");
  prestige.type = "button";
  var prCount = el("span", "up__count");
  var prDesc = el("span", "up__desc");
  prestige.appendChild(el("span", "up__icon", "🌱"));
  prestige.appendChild(el("span", "up__name", "Przeprowadzka nory"));
  prestige.appendChild(prCount);
  prestige.appendChild(prDesc);
  prestige.addEventListener("click", function () {
    var g = seedGain();
    if (g < 1) return;
    if (!confirm("Przeprowadzka zresetuje orzeszki, budynki i ulepszenia (ranking i osiągnięcia zostają). " +
      "Dostaniesz " + g + " " + seedsWord(g) + ": +" + g * 3 + "% produkcji i klikania na stałe. Kontynuować?")) return;
    state.seeds += g;
    state.nuts = 0;
    state.run = 0;
    state.owned = {};
    state.ups = {};
    fx.cpsUntil = fx.clickUntil = 0;
    bump("prestige");
    addXp(100);
    sfx("ach");
    announce("🌱 Nowa nora! +" + g + " " + seedsWord(g));
    save();
    render();
  });
  list.appendChild(prestige);

  var reset = el("button", "shop__reset", "Zacznij od nowa");
  reset.type = "button";
  reset.addEventListener("click", function () {
    if (!confirm("Na pewno usunąć cały postęp?")) return;
    state = fresh();
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
    { kind: "coin", icon: "🪙", name: "Rzut monetą", desc: "48% szans na ×2", outcomes: [[0.48, 2], [0.52, 0]] },
    // Te same szanse co wcześniej (×0 58%, ×1 15%, ×2 15%, ×3 10%, ×10 2%), rozłożone na wycinki koła
    { kind: "wheel", icon: "🎡", name: "Koło chomika", desc: "×0 / ×1 / ×2 / ×3 / ×10", outcomes: [
      [0.145, 0], [0.075, 1], [0.075, 2], [0.145, 0], [0.05, 3], [0.02, 10],
      [0.145, 0], [0.075, 1], [0.075, 2], [0.145, 0], [0.05, 3]
    ] }
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

  var stage = el("div", "gstage");
  stage.setAttribute("aria-hidden", "true");
  var coin = el("div", "coin");
  coin.appendChild(el("span", "coin__face", ITEM));
  coin.appendChild(el("span", "coin__face coin__face--back", "💀"));
  var wheelBox = el("div", "wheel-box");
  var wheel = el("div", "wheel");
  wheelBox.appendChild(el("span", "wheel__ptr"));
  wheelBox.appendChild(wheel);
  stage.appendChild(coin);
  stage.appendChild(wheelBox);
  gamble.appendChild(stage);

  var WHEEL_COLORS = { 0: "#374151", 1: "#3b82f6", 2: "#22c55e", 3: "#a855f7", 10: "#f59e0b" };
  var stops = [], deg = 0;
  GAMES[1].outcomes.forEach(function (o) {
    var w = o[0] * 360;
    stops.push(WHEEL_COLORS[o[1]] + " " + deg + "deg " + (deg + w) + "deg");
    var lbl = el("span", "wheel__lbl", "×" + o[1]);
    lbl.style.transform = "translate(-50%,-50%) rotate(" + (deg + w / 2) + "deg) translateY(-48px)";
    wheel.appendChild(lbl);
    deg += w;
  });
  wheel.style.background = "conic-gradient(" + stops.join(",") + ")";
  var wheelRot = 0;

  var busy = false;
  function play(g) {
    if (busy) return;
    var bet = Math.floor(Number(betInput.value));
    if (!isFinite(bet) || bet < 1) { gambleMsg.textContent = "Podaj stawkę (min. 1)."; return; }
    if (bet > Math.floor(state.nuts)) { gambleMsg.textContent = "Nie masz tylu orzeszków."; return; }
    busy = true;
    state.nuts -= bet;
    render();
    var idx = pickOutcome(g.outcomes), mult = g.outcomes[idx][1];
    var ease = function (p) { return 1 - Math.pow(1 - p, 3); };

    if (g.kind === "coin") {
      gambleMsg.textContent = "🪙 Rzut…";
      var target = 1800 + (mult > 0 ? 0 : 180);
      animate(coin, 1600, function (p) {
        coin.style.transform = "translateY(" + -Math.sin(Math.PI * p) * 40 + "px) rotateY(" + ease(p) * target + "deg)";
      }, function () { finishBet(bet, mult); });
      return;
    }

    gambleMsg.textContent = "🎡 Kręcę…";
    var start = 0;
    for (var i = 0; i < idx; i++) start += g.outcomes[i][0] * 360;
    var land = start + g.outcomes[idx][0] * 360 * (0.15 + 0.7 * Math.random());
    var from = wheelRot;
    // Pod wskaźnikiem (góra) jest kąt koła równy -obrót, więc kończymy na obrocie ≡ -land (mod 360)
    var delta = 360 * 5 + ((-land - from) % 360 + 360) % 360;
    var lastSlice = -1;
    animate(wheel, 3500, function (p) {
      wheelRot = from + delta * ease(p);
      wheel.style.transform = "rotate(" + wheelRot + "deg)";
      var under = (-wheelRot % 360 + 360) % 360, s = 0, acc = 0;
      while (s < g.outcomes.length - 1 && under >= acc + g.outcomes[s][0] * 360) {
        acc += g.outcomes[s][0] * 360;
        s++;
      }
      if (s !== lastSlice) { lastSlice = s; sfx("tick"); }
    }, function () {
      wheelRot %= 360;
      wheel.style.transform = "rotate(" + wheelRot + "deg)";
      finishBet(bet, mult);
    });
  }

  function pickOutcome(outcomes) {
    var r = Math.random(), acc = 0;
    for (var i = 0; i < outcomes.length; i++) {
      acc += outcomes[i][0];
      if (r < acc) return i;
    }
    return outcomes.length - 1;
  }

  function finishBet(bet, mult) {
    if (mult === 10) { bump("jackpot"); confetti(); }
    if (mult === 0 && state.nuts < 1 && bet >= 1000) bump("broke");
    sfx(mult > 1 ? "win" : mult === 0 ? "lose" : "buy");
    state.nuts += bet * mult;
    gambleMsg.textContent = mult === 0 ? "Przegrana: −" + fmt(bet) + " " + ITEM
      : mult === 1 ? "Zwrot stawki."
      : "Wygrana ×" + mult + ": +" + fmt(bet * (mult - 1)) + " " + ITEM;
    busy = false;
    save();
    render();
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

  var achToggle = el("button", "shop__toggle", "🏆");
  achToggle.type = "button";
  achToggle.setAttribute("aria-label", "Osiągnięcia");
  achToggle.setAttribute("aria-controls", "shop-ach");
  tabs.insertBefore(achToggle, tabs.firstChild);
  var achPanel = el("div", "shop__list");
  achPanel.id = "shop-ach";
  var achHead = el("p", "board__msg");
  var achList = el("div", "once");
  achPanel.appendChild(achHead);
  achPanel.appendChild(achList);
  shop.appendChild(achPanel);

  function renderAch() {
    var n = Object.keys(state.ach).length;
    achHead.textContent = n + " / " + ACH.length + " · bonus +" + n + "% produkcji";
    achList.textContent = "";
    ACH.forEach(function (a) {
      var got = !!state.ach[a.id];
      var row = el("div", "up ach-row" + (got ? "" : " is-locked"));
      row.appendChild(el("span", "up__icon", got ? a.icon : "❓"));
      row.appendChild(el("span", "up__name", got ? a.name : "???"));
      row.appendChild(el("span", "up__count"));
      row.appendChild(el("span", "up__desc", a.desc));
      achList.appendChild(row);
    });
  }

  function checkAch() {
    var changed = false;
    ACH.forEach(function (a) {
      if (state.ach[a.id] || !a.ok()) return;
      state.ach[a.id] = true;
      changed = true;
      addXp(50);
      announce("🏆 Osiągnięcie: " + a.name + " (+1% produkcji)");
    });
    if (changed) {
      sfx("ach");
      save();
      if (view === "ach") renderAch();
    }
  }

  var statsToggle = el("button", "shop__toggle", "📊");
  statsToggle.type = "button";
  statsToggle.setAttribute("aria-label", "Statystyki");
  statsToggle.setAttribute("aria-controls", "shop-stats");
  tabs.insertBefore(statsToggle, achToggle.nextSibling);
  var statsPanel = el("div", "shop__list");
  statsPanel.id = "shop-stats";
  var statsList = el("dl", "stats");
  statsPanel.appendChild(statsList);
  shop.appendChild(statsPanel);

  function renderStats() {
    var s = state.stats, tm = s.time || 0;
    var items = [
      ["Zebrane łącznie", fmt(state.total)],
      ["W tej norze", fmt(state.run)],
      ["Produkcja", fmt(perSecond()) + "/s"],
      ["Za kliknięcie", fmt(perClick())],
      ["Kliknięcia", fmt(s.clicks || 0)],
      ["Budynki", fmt(buildings())],
      ["Ulepszenia", Object.keys(state.ups).length + " / " + ONCE.length],
      ["Osiągnięcia", Object.keys(state.ach).length + " / " + ACH.length],
      ["Złote nasiona", state.seeds + " (+" + state.seeds * 3 + "%)"],
      ["Przeprowadzki", fmt(s.prestige || 0)],
      ["Złote orzeszki", fmt(s.golden || 0)],
      ["Złapane chomiki", fmt(s.caught || 0)],
      ["Orzeszki z deszczu", fmt(s.drops || 0)],
      ["Naprawione awarie", fmt(s.fixed || 0)],
      ["Jackpoty", fmt(s.jackpot || 0)],
      ["Czas gry", Math.floor(tm / 3600) + " h " + Math.floor(tm % 3600 / 60) + " min"]
    ];
    statsList.textContent = "";
    items.forEach(function (it) {
      statsList.appendChild(el("dt", "", it[0]));
      statsList.appendChild(el("dd", "", it[1]));
    });
  }

  var passToggle = el("button", "shop__toggle", "🎟️");
  passToggle.type = "button";
  passToggle.setAttribute("aria-label", "Karnet");
  passToggle.setAttribute("aria-controls", "shop-pass");
  tabs.insertBefore(passToggle, statsToggle.nextSibling);
  var passPanel = el("div", "shop__list");
  passPanel.id = "shop-pass";
  var passHead = el("p", "board__msg");
  var passBar = el("div", "pass__bar");
  var passFill = el("div", "pass__fill");
  passBar.appendChild(passFill);
  var passClaim = el("button", "board__save");
  passClaim.type = "button";
  var passList = el("div", "once");
  passPanel.appendChild(passHead);
  passPanel.appendChild(passBar);
  passPanel.appendChild(passClaim);
  passPanel.appendChild(passList);
  shop.appendChild(passPanel);

  function passLevel() { return Math.floor(state.pass.xp / PASS_XP); }
  function passReward(lv) {
    if (lv % 10 === 0) return { icon: "🌱", text: "+1 złote nasiono", give: function () { state.seeds += 1; } };
    if (lv % 5 === 0) return { icon: "✨", text: "Szał produkcji ×7 przez 60 s", give: function () { fx.cps = 7; fx.cpsUntil = Date.now() + 60000; } };
    return { icon: ITEM, text: "Orzeszki za 5 min produkcji", give: function () { gain(Math.max(perSecond() * 300, perClick() * 100)); } };
  }

  function renderPass() {
    var lv = passLevel(), xp = state.pass.xp;
    var month = new Date().toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
    passHead.textContent = "Karnet — " + month + " · poziom " + lv + " / " + PASS_LEVELS +
      (lv < PASS_LEVELS ? " · " + Math.floor(xp % PASS_XP) + " / " + PASS_XP + " XP" : " · ukończony!");
    passFill.style.width = (lv >= PASS_LEVELS ? 100 : (xp % PASS_XP) / PASS_XP * 100) + "%";
    var ready = lv - state.pass.claimed;
    passClaim.textContent = ready > 0 ? "Odbierz nagrody (" + ready + ")" : "Brak nagród do odebrania";
    passClaim.disabled = ready <= 0;
    passList.textContent = "";
    for (var i = 1; i <= PASS_LEVELS; i++) {
      var r = passReward(i), done = i <= state.pass.claimed, open = !done && i <= lv;
      var row = el("div", "up ach-row" + (done || open ? "" : " is-locked") + (open ? " is-ready" : ""));
      row.appendChild(el("span", "up__icon", r.icon));
      row.appendChild(el("span", "up__name", "Poziom " + i));
      row.appendChild(el("span", "up__count", done ? "✔" : open ? "🎁" : ""));
      row.appendChild(el("span", "up__desc", r.text));
      passList.appendChild(row);
    }
  }

  passClaim.addEventListener("click", function () {
    var lv = passLevel(), n = 0;
    while (state.pass.claimed < lv) {
      state.pass.claimed++;
      passReward(state.pass.claimed).give();
      n++;
    }
    if (!n) return;
    sfx("ach");
    announce("🎟️ Odebrano nagrody z karnetu: " + n);
    save();
    render();
    renderPass();
  });

  function addXp(n) {
    var before = passLevel();
    state.pass.xp = Math.min(PASS_LEVELS * PASS_XP, state.pass.xp + n);
    var after = passLevel();
    if (after <= before) return;
    announce("🎟️ Karnet: poziom " + after + "! Odbierz nagrodę.");
    sfx("win");
    if (view === "pass") renderPass();
  }

  // Dźwięki generowane przez Web Audio, domyślnie wyłączone
  var soundOn = false;
  try { soundOn = localStorage.getItem(KEY + "-sound") === "1"; } catch (e) { /* brak storage */ }
  var actx = null;
  var SFX = {
    click: [[660, 0, 0.05, "triangle", 0.03]],
    tick: [[1400, 0, 0.02, "square", 0.015]],
    buy: [[700, 0, 0.06, "triangle", 0.05], [1000, 0.05, 0.08, "triangle", 0.05]],
    golden: [[880, 0, 0.15], [1320, 0.1, 0.3]],
    win: [[523, 0, 0.1], [784, 0.08, 0.25]],
    lose: [[300, 0, 0.25, "sawtooth", 0.04], [200, 0.2, 0.35, "sawtooth", 0.04]],
    ach: [[523, 0, 0.15], [659, 0.1, 0.15], [784, 0.2, 0.35]],
    alarm: [[440, 0, 0.2, "square", 0.04], [330, 0.25, 0.2, "square", 0.04], [440, 0.5, 0.2, "square", 0.04]]
  };
  function tone(freq, start, dur, type, vol) {
    var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + start;
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t);
    o.stop(t + dur);
  }
  function sfx(name) {
    if (!soundOn) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      SFX[name].forEach(function (s) { tone(s[0], s[1], s[2], s[3], s[4]); });
    } catch (e) { /* brak Web Audio */ }
  }
  var soundToggle = el("button", "shop__toggle");
  soundToggle.type = "button";
  function soundLabel() {
    soundToggle.textContent = soundOn ? "🔊" : "🔇";
    soundToggle.setAttribute("aria-label", soundOn ? "Wyłącz dźwięk" : "Włącz dźwięk");
    soundToggle.setAttribute("aria-pressed", String(soundOn));
  }
  soundToggle.addEventListener("click", function () {
    soundOn = !soundOn;
    try { localStorage.setItem(KEY + "-sound", soundOn ? "1" : "0"); } catch (e) { /* brak storage */ }
    soundLabel();
    sfx("buy");
  });
  soundLabel();
  tabs.insertBefore(soundToggle, achToggle);
  d.body.appendChild(shop);

  function setView(v) {
    view = v;
    list.hidden = v !== "up";
    board.hidden = v !== "board";
    gamble.hidden = v !== "gamble";
    achPanel.hidden = v !== "ach";
    statsPanel.hidden = v !== "stats";
    passPanel.hidden = v !== "pass";
    passToggle.setAttribute("aria-expanded", String(v === "pass"));
    if (v === "pass") renderPass();
    statsToggle.setAttribute("aria-expanded", String(v === "stats"));
    if (v === "stats") renderStats();
    achToggle.setAttribute("aria-expanded", String(v === "ach"));
    if (v === "ach") renderAch();
    toggle.setAttribute("aria-expanded", String(v === "up"));
    boardToggle.setAttribute("aria-expanded", String(v === "board"));
    gambleToggle.setAttribute("aria-expanded", String(v === "gamble"));
    if (v === "board") refreshBoard();
  }
  toggle.addEventListener("click", function () { setView(view === "up" ? null : "up"); });
  boardToggle.addEventListener("click", function () { setView(view === "board" ? null : "board"); });
  gambleToggle.addEventListener("click", function () { setView(view === "gamble" ? null : "gamble"); });
  achToggle.addEventListener("click", function () { setView(view === "ach" ? null : "ach"); });
  statsToggle.addEventListener("click", function () { setView(view === "stats" ? null : "stats"); });
  passToggle.addEventListener("click", function () { setView(view === "pass" ? null : "pass"); });
  setView(window.matchMedia("(min-width: 800px)").matches ? "up" : null);

  function buy(u) {
    var c = cost(u);
    if (state.nuts < c) return;
    state.nuts -= c;
    state.owned[u.id] = count(u) + 1;
    addXp(1);
    sfx("buy");
    save();
    render();
  }

  function buyOnce(o) {
    if (bought(o) || state.nuts < o.cost) return;
    state.nuts -= o.cost;
    state.ups[o.id] = true;
    addXp(5);
    sfx("buy");
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

    var t = Date.now(), parts = [];
    if (t < fx.cpsUntil) parts.push("✨ ×" + fx.cps + " produkcji (" + Math.ceil((fx.cpsUntil - t) / 1000) + " s)");
    if (t < fx.clickUntil) parts.push("✨ ×" + fx.click + " za klik (" + Math.ceil((fx.clickUntil - t) / 1000) + " s)");
    if (fx.outage) parts.push("⚠️ awaria −50%");
    if (mcPlayers) parts.push("⛏️ +" + mcPlayers * 10 + "% (gracze MC)");
    if (SEASON) parts.push(SEASON.icon + " " + SEASON.name + (SEASON.cps > 1 ? " ×" + SEASON.cps : ""));
    scoreFx.textContent = parts.join(" · ");

    var sg = seedGain();
    prCount.textContent = state.seeds ? "🌱" + state.seeds : "";
    prDesc.textContent = sg >= 1
      ? "Reset za +" + sg + " " + seedsWord(sg) + " (+" + sg * 3 + "% na stałe)"
      : "Dostępna od 1 mln zebranych w tej norze";
    prestige.classList.toggle("is-locked", sg < 1);
    prestige.setAttribute("aria-disabled", String(sg < 1));
    passToggle.classList.toggle("has-reward", passLevel() > state.pass.claimed);

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
    bump("clicks");
    addXp(0.2);
    earn(gain);
    sfx("click");
    var x = e.clientX, y = e.clientY;
    if (!x && !y) {
      var rect = hit.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
    pop(x + (Math.random() * 40 - 20), y - 10, "+" + fmt(gain));
    render();
  });

  function gain(n, x, y) {
    earn(n);
    if (x !== undefined) pop(x, y, "+" + fmt(n));
    render();
  }

  var toast = el("div", "evt-toast");
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  d.body.appendChild(toast);
  var toastT;
  function announce(text) {
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove("is-on"); }, 4000);
  }

  // Ruch przez rAF, bo s.css wyłącza animacje CSS przy prefers-reduced-motion
  function animate(node, dur, step, done) {
    var start = performance.now();
    function f(t) {
      if (!node.isConnected) return;
      var p = Math.min(1, (t - start) / dur);
      step(p);
      if (p < 1) requestAnimationFrame(f); else done();
    }
    requestAnimationFrame(f);
  }

  function spawnGolden() {
    var b = el("button", "evt-golden", ITEM);
    b.type = "button";
    b.setAttribute("aria-label", "Złoty orzeszek");
    b.style.left = (10 + Math.random() * 75) + "vw";
    b.style.top = (15 + Math.random() * 65) + "vh";
    var gone = setTimeout(function () { b.remove(); }, 10000);
    sfx("golden");
    b.addEventListener("click", function (e) {
      clearTimeout(gone);
      b.remove();
      bump("golden");
      addXp(25);
      sfx("win");
      var r = Math.random();
      if (r < 0.45) {
        fx.cps = 7;
        fx.cpsUntil = Date.now() + 60000;
        announce("✨ Szał produkcji! ×7 przez 60 s");
      } else if (r < 0.65) {
        fx.click = 100;
        fx.clickUntil = Date.now() + 10000;
        announce("✨ Szał klikania! ×100 przez 10 s");
      } else {
        var n = Math.min(state.nuts * 0.15, perSecond() * 900) + 13;
        gain(n, e.clientX, e.clientY);
        announce("✨ Szczęście! +" + fmt(n) + " " + ITEM);
      }
      render();
    });
    d.body.appendChild(b);
  }

  function spawnHamster() {
    var b = el("button", "evt-runner", "🐹");
    b.type = "button";
    b.setAttribute("aria-label", "Uciekający chomik");
    var ltr = Math.random() < 0.5;
    d.body.appendChild(b);
    b.addEventListener("click", function (e) {
      b.remove();
      bump("caught");
      addXp(20);
      sfx("win");
      var n = Math.max(perSecond() * 60, perClick() * 20);
      gain(n, e.clientX, e.clientY);
      announce("🐹 Złapany! +" + fmt(n) + " " + ITEM);
    });
    animate(b, 8000, function (p) {
      var x = ltr ? p : 1 - p;
      b.style.transform = "translateX(" + (x * (window.innerWidth + 80) - 80) + "px)";
    }, function () { b.remove(); });
  }

  var raining = false;
  function startRain() {
    raining = true;
    announce(ITEM + " Deszcz orzeszków! Łap, ile się da!");
    var end = Date.now() + 15000;
    var iv = setInterval(function () {
      if (Date.now() > end) { clearInterval(iv); raining = false; return; }
      var b = el("button", "evt-drop", ITEM);
      b.type = "button";
      b.tabIndex = -1;
      b.setAttribute("aria-hidden", "true");
      b.style.left = (3 + Math.random() * 90) + "vw";
      d.body.appendChild(b);
      b.addEventListener("pointerdown", function (e) {
        b.remove();
        bump("drops");
        addXp(2);
        sfx("click");
        gain(Math.max(perSecond() * 2, perClick() * 3), e.clientX, e.clientY);
      });
      animate(b, 3500 + Math.random() * 2000, function (p) {
        b.style.transform = "translateY(" + p * (window.innerHeight + 80) + "px)";
      }, function () { b.remove(); });
    }, 350);
  }

  function startOutage() {
    fx.outage = true;
    sfx("alarm");
    var need = 20;
    var box = el("div", "evt-outage");
    var b = el("button", "evt-fix", "🔧 Napraw (" + need + ")");
    b.type = "button";
    box.appendChild(el("span", "", "⚠️ Serwer padł! Produkcja −50%"));
    box.appendChild(b);
    d.body.appendChild(box);
    var timeout = setTimeout(function () { end(false); }, 45000);
    function end(fixed) {
      clearTimeout(timeout);
      fx.outage = false;
      box.remove();
      if (fixed) {
        bump("fixed");
        addXp(30);
        sfx("ach");
        var n = Math.max(perSecond() * 120, perClick() * 30);
        gain(n);
        announce("🔧 Naprawione! Premia +" + fmt(n) + " " + ITEM);
      } else {
        announce("Serwer wstał sam. Następnym razem napraw szybciej!");
      }
      render();
    }
    b.addEventListener("click", function () {
      if (need <= 0) return;
      need--;
      b.textContent = "🔧 Napraw (" + need + ")";
      if (need === 0) end(true);
    });
    render();
  }

  function confetti() {
    var colors = ["#f43f5e", "#fcd34d", "#22c55e", "#3b82f6", "#a855f7"];
    for (var i = 0; i < 60; i++) (function (i) {
      var c = el("span", "confetti");
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      d.body.appendChild(c);
      var spin = Math.random() * 720 - 360, drift = Math.random() * 120 - 60;
      animate(c, 2500 + Math.random() * 2000, function (p) {
        c.style.transform = "translate(" + drift * p + "px," + p * (window.innerHeight + 40) + "px) rotate(" + spin * p + "deg)";
      }, function () { c.remove(); });
    })(i);
  }

  var nextEvent = Date.now() + 60000 + Math.random() * 60000;
  setInterval(function () {
    checkAch();
    if (state.pass.id !== passId()) {
      state.pass = { id: passId(), xp: 0, claimed: 0 };
      announce("🎟️ Nowy miesiąc — nowy karnet!");
    }
    if (!d.hidden) {
      bump("time");
      addXp(2 / 60);
    }
    if (view === "stats" && !d.hidden) renderStats();
    if (view === "pass" && !d.hidden) renderPass();
    if (d.hidden || Date.now() < nextEvent) return;
    nextEvent = Date.now() + 120000 + Math.random() * 180000;
    var pool = [[spawnGolden, 5], [spawnHamster, 3]];
    if (!raining) pool.push([startRain, 2]);
    if (!fx.outage && perSecond() > 0) pool.push([startOutage, 1]);
    var r = Math.random() * pool.reduce(function (a, p) { return a + p[1]; }, 0);
    for (var i = 0; i < pool.length; i++) {
      r -= pool[i][1];
      if (r < 0) { pool[i][0](); break; }
    }
  }, 1000);

  if (SEASON) {
    d.body.classList.add("season-" + SEASON.id);
    if (SEASON.id === "xmas") d.body.appendChild(el("div", "snow"));
    setTimeout(function () {
      announce(SEASON.icon + " " + SEASON.name + (SEASON.cps > 1 ? "! Produkcja ×" + SEASON.cps : "!"));
      if (SEASON.id === "birthday") confetti();
    }, 1500);
  }

  // Przyrost liczony z upływu czasu, bo przeglądarki spowalniają timery w kartach w tle
  var lastTick = Date.now();
  setInterval(function () {
    var t = Date.now();
    var dt = Math.min(60, Math.max(0, (t - lastTick) / 1000));
    lastTick = t;
    var cps = perSecond();
    if (!cps) return;
    earn(cps * dt);
    render();
  }, 100);

  setInterval(save, 5000);
  d.addEventListener("visibilitychange", function () { if (d.hidden) save(); });
  window.addEventListener("pagehide", save);

  // Status serwera Minecraft (publiczne API mcsrvstat.us)
  var MC_HOST = "chomiczanora.pl";
  // Status z mc.*, bo domena główna nie ma jeszcze rekordu SRV _minecraft._tcp
  var MC_QUERY = "mc.chomiczanora.pl";
  var mcBtn = d.getElementById("mc");
  if (mcBtn) {
    var mcText = mcBtn.querySelector(".mc-btn__text");
    var mcLabel = "Minecraft";
    var mcStatus = function () {
      fetch("https://api.mcsrvstat.us/3/" + MC_QUERY, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) {
          if (j && j.online) {
            var p = j.players || {};
            mcBtn.dataset.state = "online";
            mcPlayers = Math.max(0, Math.min(20, Math.floor(Number(p.online) || 0)));
            mcLabel = "Minecraft " + Number(p.online || 0) + "/" + Number(p.max || 0);
            mcBtn.title = (j.version ? "Wersja: " + String(j.version) + ". " : "") + "Kliknij, aby skopiować adres serwera";
          } else {
            mcBtn.dataset.state = "offline";
            mcPlayers = 0;
            mcLabel = "Minecraft offline";
          }
          mcText.textContent = mcLabel;
          render();
        })
        .catch(function () {
          mcBtn.dataset.state = "unknown";
          mcPlayers = 0;
          mcLabel = "Minecraft";
          mcText.textContent = mcLabel;
        });
    };
    mcBtn.addEventListener("click", function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(MC_HOST).then(function () {
        mcText.textContent = "Skopiowano: " + MC_HOST;
        setTimeout(function () { mcText.textContent = mcLabel; }, 1800);
      }).catch(function () { /* brak uprawnień schowka */ });
    });
    mcStatus();
    setInterval(mcStatus, 60000);
  }
  // Wykrywanie nowej wersji strony przez porównanie ETag/Last-Modified plików
  var FILES = ["./", "assets/game.js", "assets/game.css", "assets/s.js", "assets/s.css"];
  var version = null;
  var updateReady = false;

  function stamp() {
    return Promise.all(FILES.map(function (f) {
      return fetch(f, { method: "HEAD", cache: "no-store" }).then(function (r) {
        return r.headers.get("etag") || r.headers.get("last-modified") || "";
      });
    })).then(function (a) { return a.join("|"); });
  }

  function reloadSafely() {
    // Ochrona przed pętlą przeładowań, gdyby serwer zwracał niestabilne nagłówki
    var last = 0;
    try { last = Number(sessionStorage.getItem(KEY + "-reload")) || 0; } catch (e) { /* brak storage */ }
    if (Date.now() - last < 600000) return;
    try { sessionStorage.setItem(KEY + "-reload", String(Date.now())); } catch (e) { /* brak storage */ }
    save();
    location.reload();
  }

  function checkUpdate() {
    if (updateReady) return;
    stamp().then(function (v) {
      if (version === null) { version = v; return; }
      if (v === version) return;
      updateReady = true;
      save();
      var btn = el("button", "update", "Nowa wersja strony — odśwież");
      btn.type = "button";
      btn.addEventListener("click", function () { location.reload(); });
      d.body.appendChild(btn);
      if (d.hidden) reloadSafely();
    }).catch(function () { /* brak sieci */ });
  }

  d.addEventListener("visibilitychange", function () {
    if (d.hidden) { if (updateReady) reloadSafely(); } else checkUpdate();
  });
  setInterval(checkUpdate, 120000);
  checkUpdate();

  // Zysk z nieobecności: 50% produkcji, maks. 8 godzin
  var away = state.last ? Math.min(8 * 3600, (Date.now() - state.last) / 1000) : 0;
  if (away > 60) {
    var earned = perSecond() * away * 0.5;
    if (earned >= 1) {
      earn(earned);
      var h = Math.floor(away / 3600), m = Math.floor(away % 3600 / 60);
      setTimeout(function () {
        announce("💤 Przez " + (h ? h + " h " : "") + m + " min chomiki zebrały +" + fmt(earned) + " " + ITEM);
      }, 3000);
    }
  }
  save();

  render();
})();
