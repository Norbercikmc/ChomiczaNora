(function () {
  "use strict";

  var d = document;
  var KEY = "chomicza-clicker-v1";
  var hit = d.getElementById("l");
  var wrap = d.querySelector(".logo-wrap");
  if (!hit || !wrap) return;

  var UPGRADES = [
    { id: "paw", icon: "🐾", name: "Mocniejsze łapki", desc: "+1 orzeszek za kliknięcie", base: 50, growth: 2.2, click: 1 },
    { id: "hamster", icon: "🐹", name: "Chomik", desc: "1 orzeszek/s", base: 15, growth: 1.15, cps: 1 },
    { id: "wheel", icon: "🎡", name: "Koło do biegania", desc: "5 orzeszków/s", base: 100, growth: 1.15, cps: 5 },
    { id: "pi", icon: "🥧", name: "Raspberry Pi", desc: "20 orzeszków/s", base: 600, growth: 1.15, cps: 20 },
    { id: "mc", icon: "⛏️", name: "Serwer Minecraft", desc: "100 orzeszków/s", base: 3000, growth: 1.15, cps: 100 },
    { id: "lab", icon: "🖥️", name: "Maszynownia", desc: "500 orzeszków/s", base: 15000, growth: 1.15, cps: 500 }
  ];

  var state = load();
  var rows = {};

  var compact = new Intl.NumberFormat("pl-PL", { notation: "compact", maximumFractionDigits: 2 });
  function fmt(n) {
    return n < 10000 ? Math.floor(n).toLocaleString("pl-PL") : compact.format(n);
  }

  function load() {
    var s = { nuts: 0, owned: {} };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY));
      if (raw && isFinite(raw.nuts) && raw.nuts >= 0) s.nuts = raw.nuts;
      UPGRADES.forEach(function (u) {
        var v = raw && raw.owned && raw.owned[u.id];
        if (Number.isInteger(v) && v > 0) s.owned[u.id] = v;
      });
    } catch (e) { /* brak lub uszkodzony zapis */ }
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* brak dostępu do storage */ }
  }

  function count(u) { return state.owned[u.id] || 0; }
  function cost(u) { return Math.ceil(u.base * Math.pow(u.growth, count(u))); }

  function perClick() {
    return UPGRADES.reduce(function (a, u) { return a + (u.click || 0) * count(u); }, 1);
  }
  function perSecond() {
    return UPGRADES.reduce(function (a, u) { return a + (u.cps || 0) * count(u); }, 0);
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
  var toggle = el("button", "shop__toggle", "Ulepszenia");
  toggle.type = "button";
  toggle.setAttribute("aria-controls", "shop-list");
  var list = el("div", "shop__list");
  list.id = "shop-list";

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
    state = { nuts: 0, owned: {} };
    save();
    render();
  });
  list.appendChild(reset);

  shop.appendChild(toggle);
  shop.appendChild(list);
  d.body.appendChild(shop);

  function setOpen(open) {
    list.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  }
  toggle.addEventListener("click", function () { setOpen(list.hidden); });
  setOpen(window.matchMedia("(min-width: 800px)").matches);

  function buy(u) {
    var c = cost(u);
    if (state.nuts < c) return;
    state.nuts -= c;
    state.owned[u.id] = count(u) + 1;
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
    render();
  }, 100);

  setInterval(save, 5000);
  d.addEventListener("visibilitychange", function () { if (d.hidden) save(); });
  window.addEventListener("pagehide", save);

  render();
})();
