(function () {
  "use strict";

  var d = document;
  var KEY = "chomicza-clicker-v1";
  // Wersja z ?v= w tagu <script> w index.html — to jedno źródło prawdy dla aktualizacji i rankingu
  var BUILD = (function () {
    var s = d.querySelector('script[src*="game.js"]');
    var m = s && /[?&]v=([\w.-]+)/.exec(s.src);
    return m ? m[1] : "";
  })();
  var stale = false;
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

  function fresh() { return { nuts: 0, total: 0, run: 0, seeds: 0, owned: {}, ups: {}, ach: {}, stats: {}, last: 0, gamba: { bets: 0, won: 0, lost: 0, bigWin: 0, bigLoss: 0 }, pass: { id: passId(), xp: 0, claimed: 0 } }; }
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

  // Sezony: pierwszy pasujący z listy wygrywa. cps = mnożnik produkcji, item = ikona w miejsce orzeszka
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, mo - 1, da);
  }
  function md(t) { return ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2); }
  function between(from, to) {
    return function (t) {
      var s = md(t);
      return from <= to ? s >= from && s <= to : s >= from || s <= to;
    };
  }
  function dnum(t) { return Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5); }
  function aroundEaster(from, to) {
    return function (t) {
      var x = dnum(t) - dnum(easter(t.getFullYear()));
      return x >= from && x <= to;
    };
  }
  function blackFriday(t) {
    if (t.getMonth() !== 10) return false;
    var first = new Date(t.getFullYear(), 10, 1).getDay();
    var thanksgiving = 1 + (4 - first + 7) % 7 + 21; // 4. czwartek listopada
    return t.getDate() === thanksgiving + 1;
  }
  var SEASONS = [
    { id: "birthday", icon: "🎂", name: "Urodziny projektu", cps: 2, item: "🌰", ambient: "🎉", confetti: true,
      on: function (t) { return !!BIRTHDAY && md(t) === BIRTHDAY; } },
    { id: "newyear", icon: "🎆", name: "Nowy Rok", cps: 1.5, ambient: "✨", confetti: true, on: between("12-31", "01-02") },
    { id: "valentine", icon: "💝", name: "Walentynki", cps: 1.5, ambient: "💕", dir: "up", on: between("02-13", "02-14") },
    { id: "fatthu", icon: "🍩", name: "Tłusty Czwartek", cps: 1.5, on: aroundEaster(-52, -52) },
    { id: "easter", icon: "🥚", name: "Wielkanoc", cps: 1.5, ambient: "🐣", on: aroundEaster(-2, 1) },
    { id: "kids", icon: "🎈", name: "Dzień Dziecka", cps: 1.5, ambient: "🎈", dir: "up", confetti: true, on: between("06-01", "06-01") },
    { id: "summer", icon: "☀️", name: "Wakacje", cps: 1, item: "🌰", ambient: "🌴", on: between("06-21", "08-31") },
    { id: "halloween", icon: "🎃", name: "Halloween", cps: 1, ambient: "🦇", on: between("10-25", "11-02") },
    { id: "independence", icon: "🦅", name: "Święto Niepodległości", cps: 1.5, item: "🌰", on: between("11-11", "11-11") },
    { id: "andrzejki", icon: "🔮", name: "Andrzejki", cps: 1.5, ambient: "✨", on: between("11-29", "11-30") },
    { id: "blackfriday", icon: "🛒", name: "Black Friday", cps: 1.5, item: "🌰", on: blackFriday },
    { id: "santa", icon: "🎅", name: "Mikołajki", cps: 1.5, item: "🎁", on: between("12-05", "12-06") },
    { id: "xmas", icon: "🎁", name: "Święta", cps: 1, snow: true, on: between("12-15", "12-30") }
  ];
  function seasonAt(t) {
    for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i].on(t)) return SEASONS[i];
    return null;
  }
  function nextSeason() {
    var now = new Date(), cur = SEASON ? SEASON.id : null;
    for (var i = 1; i <= 400; i++) {
      var s = seasonAt(new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
      if (s && s.id !== cur) return { s: s, days: i };
    }
    return null;
  }
  function multText(n) { return String(n).replace(".", ","); }
  var SEASON = seasonAt(new Date());
  var ITEM = SEASON ? (SEASON.item || SEASON.icon) : "🌰";

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
      var gs = raw && raw.gamba;
      if (gs) {
        ["bets", "won", "lost", "bigWin", "bigLoss"].forEach(function (k) {
          if (isFinite(gs[k]) && gs[k] >= 0) s.gamba[k] = gs[k];
        });
      }
      var p = raw && raw.pass;
      if (p && p.id === passId() && isFinite(p.xp) && p.xp >= 0) {
        s.pass.xp = Math.min(PASS_LEVELS * PASS_XP, p.xp);
        if (Number.isInteger(p.claimed) && p.claimed > 0) s.pass.claimed = Math.min(p.claimed, Math.floor(s.pass.xp / PASS_XP));
      }
    } catch (e) { /* brak lub uszkodzony zapis */ }
    return s;
  }

  function save() {
    if (stale) return; // nieaktualna karta nie może nadpisać nowszego zapisu
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
  function clickParts() {
    return {
      base: UPGRADES.reduce(function (a, u) { return a + (u.click || 0) * count(u); }, 1),
      mult: ONCE.reduce(function (a, o) { return a * (bought(o) && o.clickMult ? o.clickMult : 1); }, 1),
      pct: ONCE.reduce(function (a, o) { return a + (bought(o) && o.clickPct ? o.clickPct : 0); }, 0)
    };
  }
  function perClick() {
    var p = clickParts();
    return p.base * p.mult * eventClickMult() * seedMult() + perSecond() * p.pct;
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
  var lastGk = "";
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
  var saveMsg = el("p", "board__msg", nick ? "Grasz jako " + nick + "." : "Ustaw nick, aby Twój wynik trafił do rankingu.");
  saveMsg.setAttribute("role", "status");
  board.appendChild(boardMsg);
  board.appendChild(boardList);
  board.appendChild(nickRow);
  board.appendChild(saveMsg);

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
    var gw = Math.floor(state.gamba.won), gl = Math.floor(state.gamba.lost), gk = gw + ":" + gl;
    if (stale || !nick || (total <= lastSent && gk === lastGk)) return;
    lastSent = total;
    lastGk = gk;
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: playerId, nick: nick, score: total, gw: gw, gl: gl, build: BUILD })
    }).then(function (r) {
      if (r.status === 426) { markStale(); return; }
      if (r.status === 409) {
        saveMsg.textContent = "Ten nick jest już zajęty — wybierz inny.";
        nick = "";
        lastSent = -1;
        return;
      }
      if (r.status === 403) { saveMsg.textContent = "Ten gracz został zablokowany w rankingu."; return; }
      if (!r.ok) throw new Error(r.status);
      saveMsg.textContent = "✔ Zapisano wynik: " + fmt(total) + " (" + nick + ")";
      if (view === "board") refreshBoard();
    }).catch(function () {
      lastSent = -1;
      saveMsg.textContent = "Nie udało się zapisać wyniku — spróbuję ponownie za chwilę.";
    });
  }

  nickBtn.addEventListener("click", function () {
    var v = nickInput.value.trim();
    if (!NICK_RE.test(v)) {
      saveMsg.textContent = "Nick: 2–16 znaków (litery, cyfry, spacja, _ . -).";
      return;
    }
    nick = v;
    try { localStorage.setItem(NICK_KEY, v); } catch (e) { /* brak storage */ }
    lastSent = -1;
    saveMsg.textContent = "Zapisuję…";
    submitScore();
  });

  setInterval(submitScore, 30000);
  setInterval(function () { if (view === "board") refreshBoard(); }, 60000);

  // Gamba: tylko wirtualne orzeszki, wygrane nie liczą się do rankingu (state.total)
  var GAMES = [
    { kind: "coin", icon: "🪙", name: "Rzut monetą", desc: "45% szans na ×2", outcomes: [[0.45, 2], [0.55, 0]] },
    // Zwrot ze stawki ok. 90% (×0 60%, ×1 14%, ×2 15%, ×3 7%, ×5 3%, ×10 1%), rozożone na wycinki koła
    { kind: "wheel", icon: "🎡", name: "Koło chomika", desc: "×0 / ×1 / ×2 / ×3 / ×5 / ×10", outcomes: [
      [0.15, 0], [0.07, 1], [0.075, 2], [0.15, 0], [0.035, 3], [0.03, 5],
      [0.15, 0], [0.07, 1], [0.075, 2], [0.15, 0], [0.035, 3], [0.01, 10]
    ] }
  ];
  // Limit stawki: 15 min produkcji (min. 1 000), żeby gamba nie była drogą na skróty przy dużych bankrollach
  function maxBet() { return Math.max(1000, Math.floor(perSecond() * 900)); }
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
  [["10%", 0.1], ["50%", 0.5], ["Maks.", 1]].forEach(function (q) {
    var qb = el("button", "board__save", q[0]);
    qb.type = "button";
    qb.addEventListener("click", function () {
      betInput.value = Math.max(1, Math.min(maxBet(), Math.floor(state.nuts * q[1])));
    });
    quick.appendChild(qb);
  });
  var betHint = el("p", "board__msg", "");
  gamble.appendChild(gambleMsg);
  gamble.appendChild(betInput);
  gamble.appendChild(quick);
  gamble.appendChild(betHint);

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

  // Statystyki gamby: własne (z zapisu) i globalne (serwer rankingu)
  var gStatsHead = el("h3", "gh", "Twoje statystyki");
  var gStats = el("dl", "stats");
  var gTopHead = el("h3", "gh", "Najwięcej wygrał");
  var gWonList = el("ol", "board__list");
  var gLostHead = el("h3", "gh", "Najwięcej przegrał");
  var gLostList = el("ol", "board__list");
  [gStatsHead, gStats, gTopHead, gWonList, gLostHead, gLostList].forEach(function (n) { gamble.appendChild(n); });

  function renderGambaStats() {
    var g = state.gamba, net = g.won - g.lost;
    var rows = [
      ["Rozegrane gry", fmt(g.bets)],
      ["Wygrane łącznie", "+" + fmt(g.won)],
      ["Przegrane łącznie", "−" + fmt(g.lost)],
      ["Bilans", (net >= 0 ? "+" : "−") + fmt(Math.abs(net))],
      ["Największa wygrana", g.bigWin ? "+" + fmt(g.bigWin) : "—"],
      ["Największa przegrana", g.bigLoss ? "−" + fmt(g.bigLoss) : "—"]
    ];
    gStats.textContent = "";
    rows.forEach(function (r) {
      gStats.appendChild(el("dt", "", r[0]));
      gStats.appendChild(el("dd", "", r[1]));
    });
  }

  function fillTop(ol, rows, sign) {
    ol.textContent = "";
    if (!rows.length) { ol.appendChild(el("li", "board__item", "Brak danych")); return; }
    rows.forEach(function (row) {
      var li = el("li", "board__item");
      li.appendChild(el("span", "board__name", String(row.nick)));
      li.appendChild(el("span", "board__score", sign + fmt(Number(row.amount) || 0)));
      ol.appendChild(li);
    });
  }

  function refreshGamba() {
    fetch(API.replace(/\/scores$/, "/gamba"), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        fillTop(gWonList, Array.isArray(j.won) ? j.won : [], "+");
        fillTop(gLostList, Array.isArray(j.lost) ? j.lost : [], "−");
      })
      .catch(function () {
        gWonList.textContent = "";
        gLostList.textContent = "";
        gWonList.appendChild(el("li", "board__item", "Ranking gamby jest niedostępny"));
      });
  }
  renderGambaStats();

  var WHEEL_COLORS = { 0: "#374151", 1: "#3b82f6", 2: "#22c55e", 3: "#a855f7", 5: "#ef4444", 10: "#f59e0b" };
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
    if (bet > maxBet()) { gambleMsg.textContent = "Maksymalna stawka to " + fmt(maxBet()) + " (15 min produkcji)."; return; }
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
    var gs = state.gamba;
    gs.bets++;
    if (mult > 1) {
      gs.won += bet * (mult - 1);
      gs.bigWin = Math.max(gs.bigWin, bet * (mult - 1));
    } else if (mult === 0) {
      gs.lost += bet;
      gs.bigLoss = Math.max(gs.bigLoss, bet);
    }
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
    renderGambaStats();
    submitScore();
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

  function nextSeasonText() {
    var n = nextSeason();
    if (!n) return "brak";
    return n.s.icon + " " + n.s.name + " (" + (n.days === 1 ? "jutro" : "za " + n.days + " dni") + ")";
  }

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
      ["Sezon", SEASON ? SEASON.icon + " " + SEASON.name + (SEASON.cps > 1 ? " (×" + multText(SEASON.cps) + ")" : "") : "brak"],
      ["Następny sezon", nextSeasonText()],
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

  // Balans: rozbicie mnożników, czasy zwrotu i rekomendacja zakupu
  var balToggle = el("button", "shop__toggle", "⚖️");
  balToggle.type = "button";
  balToggle.setAttribute("aria-label", "Balans");
  balToggle.setAttribute("aria-controls", "shop-bal");
  tabs.insertBefore(balToggle, passToggle.nextSibling);
  var balPanel = el("div", "shop__list");
  balPanel.id = "shop-bal";
  var balBox = el("div", "bal");
  balPanel.appendChild(balBox);
  shop.appendChild(balPanel);

  function rate(n) { return n < 100 ? n.toLocaleString("pl-PL", { maximumFractionDigits: 1 }) : fmt(n); }
  function mx(n) { return "×" + n.toLocaleString("pl-PL", { maximumFractionDigits: 2 }); }
  function dur(s) {
    if (!isFinite(s)) return "—";
    if (s < 60) return Math.ceil(s) + " s";
    if (s < 3600) return Math.ceil(s / 60) + " min";
    var u = s < 86400 ? [3600, " h"] : [86400, " dni"];
    return (s / u[0]).toLocaleString("pl-PL", { maximumFractionDigits: 1 }) + u[1];
  }

  function renderBalance() {
    var cps = perSecond();
    var gm = globalMult() * eventCpsMult() * achMult() * seedMult();
    balBox.textContent = "";
    function section(title) {
      balBox.appendChild(el("h3", "", title));
      var dl = el("dl", "stats");
      balBox.appendChild(dl);
      return dl;
    }
    function line(dl, k, v) { dl.appendChild(el("dt", "", k)); dl.appendChild(el("dd", "", v)); }

    var dl = section("Mnożniki produkcji");
    var fxm = Date.now() < fx.cpsUntil ? fx.cps : 1;
    line(dl, "Ulepszenia globalne", mx(globalMult()));
    line(dl, "Osiągnięcia (" + Object.keys(state.ach).length + ")", mx(achMult()));
    line(dl, "Złote nasiona (" + state.seeds + ")", mx(seedMult()));
    line(dl, "Gracze MC (" + mcPlayers + ")", mx(1 + 0.1 * mcPlayers));
    line(dl, "Sezon", SEASON ? mx(SEASON.cps) : "—");
    line(dl, "Szał z eventu", fxm > 1 ? mx(fxm) : "—");
    line(dl, "Awaria", fx.outage ? "×0,5" : "—");
    line(dl, "Razem", mx(gm));
    line(dl, "Produkcja", rate(cps) + "/s");

    var cp = clickParts();
    dl = section("Klikanie");
    line(dl, "Podstawa (łapki)", fmt(cp.base));
    line(dl, "Ulepszenia", mx(cp.mult));
    line(dl, "Szał i nasiona", mx(eventClickMult() * seedMult()));
    line(dl, "Z produkcji", cp.pct ? "+" + Math.round(cp.pct * 100) + "% z " + rate(cps) + "/s" : "—");
    line(dl, "Razem", rate(perClick()) + " / klik");

    // Najlepszy zwrot: koszt podzielony przez przyrost produkcji z zakupu
    var best = null;
    function consider(name, c, gain) {
      if (!(gain > 0)) return;
      var pay = c / gain;
      if (!best || pay < best.pay) best = { name: name, pay: pay, cost: c };
    }

    balBox.appendChild(el("h3", "", "Budynki"));
    var tbl = el("div", "bal__rows");
    UPGRADES.forEach(function (u) {
      if (!u.cps) return;
      var n = count(u), unit = u.cps * buildingMult(u) * gm, c = cost(u);
      consider(u.name, c, unit);
      var r = el("div", "bal__row");
      r.appendChild(el("span", "bal__name", u.icon + " " + u.name + (n ? " ×" + n : "")));
      r.appendChild(el("span", "bal__pay", dur(c / unit)));
      r.appendChild(el("span", "bal__sub", (n ? rate(n * unit) + "/s (" + (cps ? Math.round(n * unit / cps * 100) : 0) + "%)" : "brak") + " · +" + rate(unit) + "/s za sztukę"));
      tbl.appendChild(r);
    });
    balBox.appendChild(tbl);

    ONCE.forEach(function (o) {
      if (bought(o) || !o.ok()) return;
      if (o.target) {
        var u = UPGRADES.filter(function (x) { return x.id === o.target; })[0];
        consider(o.name, o.cost, count(u) * u.cps * buildingMult(u) * gm * (o.mult - 1));
      } else if (o.global) {
        consider(o.name, o.cost, cps * (o.global - 1));
      }
    });

    dl = section("Rekomendacja");
    line(dl, "Najszybszy zwrot", best ? best.name : "—");
    line(dl, "Zwraca się po", best ? dur(best.pay) : "—");
    line(dl, "Stać cię za", !best ? "—" : state.nuts >= best.cost ? "teraz" : cps ? dur((best.cost - state.nuts) / cps) : "—");

    dl = section("Prestiż");
    var sg = seedGain();
    line(dl, "Złote nasiona", state.seeds + " (+" + state.seeds * 3 + "%)");
    line(dl, "Za przeprowadzkę teraz", sg >= 1 ? "+" + sg : "—");
    line(dl, "Następne nasiono przy", fmt(1e6 * Math.pow(sg + 1, 3)) + " w norze");

    dl = section("Gamba (zwrot ze stawki)");
    GAMES.forEach(function (g) {
      var ev = g.outcomes.reduce(function (a, o) { return a + o[0] * o[1]; }, 0);
      line(dl, g.name, (ev * 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 }) + "%");
    });
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
    if (v === "gamble") { renderGambaStats(); refreshGamba(); }
    achPanel.hidden = v !== "ach";
    statsPanel.hidden = v !== "stats";
    passPanel.hidden = v !== "pass";
    balPanel.hidden = v !== "bal";
    balToggle.setAttribute("aria-expanded", String(v === "bal"));
    if (v === "bal") renderBalance();
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
  balToggle.addEventListener("click", function () { setView(view === "bal" ? null : "bal"); });
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
    betHint.textContent = "Maks. stawka: " + fmt(maxBet()) + " (15 min produkcji, min. 1 tys.)";

    var t = Date.now(), parts = [];
    if (t < fx.cpsUntil) parts.push("✨ ×" + fx.cps + " produkcji (" + Math.ceil((fx.cpsUntil - t) / 1000) + " s)");
    if (t < fx.clickUntil) parts.push("✨ ×" + fx.click + " za klik (" + Math.ceil((fx.clickUntil - t) / 1000) + " s)");
    if (fx.outage) parts.push("⚠️ awaria −50%");
    if (mcPlayers) parts.push("⛏️ +" + mcPlayers * 10 + "% (gracze MC)");
    if (SEASON) parts.push(SEASON.icon + " " + SEASON.name + (SEASON.cps > 1 ? " ×" + multText(SEASON.cps) : ""));
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

  // Antycheat: maks. 20 kliknięć/s i odrzucanie podejrzanie równych odstępów (autoklikery)
  var clickTimes = [];
  var botWarned = false;
  function botClick() {
    if (!botWarned) {
      botWarned = true;
      announce("🤖 Wykryto autoklikacz — te kliknięcia się nie liczą.");
      setTimeout(function () { botWarned = false; }, 30000);
    }
    return false;
  }
  function humanClick() {
    var t = performance.now();
    clickTimes.push(t);
    if (clickTimes.length > 30) clickTimes.shift();
    var recent = clickTimes.filter(function (x) { return t - x < 1000; }).length;
    if (recent > 20) return botClick();
    if (clickTimes.length >= 25) {
      var gaps = [];
      for (var i = 1; i < clickTimes.length; i++) gaps.push(clickTimes[i] - clickTimes[i - 1]);
      var mean = gaps.reduce(function (a, g) { return a + g; }, 0) / gaps.length;
      var sd = Math.sqrt(gaps.reduce(function (a, g) { return a + (g - mean) * (g - mean); }, 0) / gaps.length);
      if (mean < 150 && sd < 2) return botClick();
    }
    return true;
  }

  hit.addEventListener("click", function (e) {
    if (!e.isTrusted || !humanClick()) return;
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
      if (!e.isTrusted) return;
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
      if (!e.isTrusted) return;
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
        if (!e.isTrusted) return;
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
    b.addEventListener("click", function (e) {
      if (!e.isTrusted || need <= 0) return;
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
    if (view === "bal" && !d.hidden) renderBalance();
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
    d.body.classList.add("season", "season-" + SEASON.id);
    if (SEASON.snow) d.body.appendChild(el("div", "snow"));
    setTimeout(function () {
      announce(SEASON.icon + " " + SEASON.name + (SEASON.cps > 1 ? "! Produkcja ×" + multText(SEASON.cps) : "!"));
      if (SEASON.confetti) confetti();
    }, 1500);

    // Mało natrętne ozdoby w tle: nie blokują kliknięć, maks. 8 naraz
    if (SEASON.ambient) {
      var alive = 0;
      setInterval(function () {
        if (d.hidden || alive >= 8) return;
        alive++;
        var b = el("span", "amb", SEASON.ambient);
        b.setAttribute("aria-hidden", "true");
        b.style.left = (2 + Math.random() * 94) + "vw";
        b.style.fontSize = (1 + Math.random() * 1.2) + "rem";
        d.body.appendChild(b);
        var up = SEASON.dir === "up", sway = Math.random() * 60 - 30;
        animate(b, 7000 + Math.random() * 5000, function (p) {
          var y = up ? (1.1 - 1.2 * p) * window.innerHeight : (-0.1 + 1.2 * p) * window.innerHeight;
          b.style.transform = "translate(" + Math.sin(p * 6) * sway + "px," + y + "px)";
          b.style.opacity = String(0.55 * Math.min(1, p * 8, (1 - p) * 8));
        }, function () { alive--; b.remove(); });
      }, 1800);
    }
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

  // Status Minecrafta dostarcza page.js (zdarzenie cn:mc)
  function syncMc() {
    var m = window.cnMc;
    mcPlayers = m && m.online ? Math.max(0, Math.min(20, Math.floor(Number(m.players) || 0))) : 0;
    render();
  }
  d.addEventListener("cn:mc", syncMc);
  syncMc();
  // Wykrywanie nowej wersji: index.html z serwera wskazuje aktualny ?v= dla page.js (= game.js)
  function remoteBuild() {
    return fetch(location.pathname + "?_=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) {
        var m = /assets\/page\.js\?v=([\w.-]+)/.exec(t);
        return m ? m[1] : null;
      });
  }

  function reloadSafely() {
    // Ochrona przed pętlą przeładowań, gdyby CDN chwilowo serwował starą wersję
    var last = 0;
    try { last = Number(sessionStorage.getItem(KEY + "-reload")) || 0; } catch (e) { /* brak storage */ }
    if (Date.now() - last < 60000) return false;
    try { sessionStorage.setItem(KEY + "-reload", String(Date.now())); } catch (e) { /* brak storage */ }
    location.reload();
    return true;
  }

  function markStale() {
    if (stale) return;
    stale = true;
    var ov = el("div", "stale");
    ov.setAttribute("role", "alertdialog");
    ov.setAttribute("aria-modal", "true");
    var box = el("div", "stale__box");
    var msg = el("p", "", "Ta karta działa na starej wersji gry, więc zapis i ranking są wstrzymane. Odśwież, aby grać dalej.");
    var go = el("button", "", "Odśwież teraz");
    go.type = "button";
    go.addEventListener("click", function () { location.reload(); });
    box.appendChild(el("h2", "", "Dostępna nowa wersja gry"));
    box.appendChild(msg);
    box.appendChild(go);
    ov.appendChild(box);
    d.body.appendChild(ov);
    go.focus();
    var left = 8;
    var iv = setInterval(function () {
      left--;
      go.textContent = "Odśwież teraz (" + left + ")";
      if (left <= 0) {
        clearInterval(iv);
        if (!reloadSafely()) go.textContent = "Odśwież teraz";
      }
    }, 1000);
  }

  function checkUpdate() {
    if (stale || !BUILD) return;
    remoteBuild().then(function (v) {
      if (v && v !== BUILD) markStale();
    }).catch(function () { /* brak sieci */ });
  }

  d.addEventListener("visibilitychange", function () { if (!d.hidden) checkUpdate(); });
  window.addEventListener("focus", checkUpdate);
  setInterval(checkUpdate, 60000);
  checkUpdate();

  // Panel chowa się po 15 s bez aktywności i wraca przy ruchu myszy, dotyku lub klawiszu
  var IDLE_MS = 15000;
  var idleT = 0, lastWake = 0;
  function sleepPanel() {
    var a = d.activeElement;
    var typing = a && shop.contains(a) && /^(INPUT|TEXTAREA)$/.test(a.tagName);
    if (typing || busy) { idleT = setTimeout(sleepPanel, 5000); return; }
    shop.classList.add("is-idle");
  }
  function wakePanel() {
    var t = Date.now();
    if (t - lastWake < 500 && !shop.classList.contains("is-idle")) return;
    lastWake = t;
    shop.classList.remove("is-idle");
    clearTimeout(idleT);
    idleT = setTimeout(sleepPanel, IDLE_MS);
  }
  ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, wakePanel, { passive: true });
  });
  wakePanel();

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
