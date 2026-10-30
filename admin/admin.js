(function () {
  "use strict";

  var API = "https://api.chomiczanora.pl";
  var MC_QUERY = "mc.chomiczanora.pl";
  var MC_PUBLIC = "chomiczanora.pl";
  var SAVE_KEY = "chomicza-clicker-v1";
  var TOKEN_KEY = "cn-admin-token";

  var d = document;
  function $(id) { return d.getElementById(id); }
  var nf = new Intl.NumberFormat("pl-PL");
  var token = "";
  var scores = [];
  try { token = sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { /* brak storage */ }

  function el(tag, text, cls) {
    var n = d.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }

  function btn(text, onClick, cls) {
    var b = el("button", text, cls);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function api(path, body) {
    var opt = { cache: "no-store", headers: { Authorization: "Bearer " + token } };
    if (body) {
      opt.method = "POST";
      opt.headers["Content-Type"] = "application/json";
      opt.body = JSON.stringify(body);
    }
    return fetch(API + path, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error((j && j.error) || "HTTP " + r.status);
          e.status = r.status;
          throw e;
        }
        return j;
      });
    });
  }

  function showApp(on) {
    $("login").hidden = on;
    $("app").hidden = !on;
    $("logout").hidden = !on;
  }

  function forget() {
    token = "";
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* brak storage */ }
  }

  function logout(msg) {
    forget();
    showApp(false);
    $("token").value = "";
    $("login-msg").textContent = msg || "";
  }

  function login(t) {
    token = t;
    $("login-msg").textContent = "Sprawdzanie…";
    api("/admin/scores").then(function (list) {
      try { sessionStorage.setItem(TOKEN_KEY, token); } catch (e) { /* brak storage */ }
      $("login-msg").textContent = "";
      $("token").value = "";
      showApp(true);
      setScores(list);
      loadBans();
      loadStatus();
    }).catch(function (e) {
      forget();
      showApp(false);
      $("login-msg").textContent =
        e.status === 401 ? "Nieprawidłowy token." :
        e.status === 404 ? "Panel jest wyłączony na serwerze (brak RANKING_ADMIN_TOKEN)." :
        e.status === 429 ? "Za dużo prób — odczekaj minutę." :
        "Serwer rankingu jest niedostępny.";
    });
  }

  function fail(e, msgEl) {
    if (e.status === 401) { logout("Sesja wygasła albo token się zmienił. Zaloguj się ponownie."); return; }
    msgEl.textContent = "Błąd: " + e.message;
  }

  // Ranking
  function setScores(list) {
    scores = Array.isArray(list) ? list : [];
    $("count").textContent = "(" + scores.length + ")";
    renderScores();
  }

  function renderScores() {
    var q = $("filter").value.trim().toLowerCase();
    var onlyFlagged = $("only-flagged").checked;
    var tb = $("scores");
    tb.textContent = "";
    scores.forEach(function (s, i) {
      var nick = String(s.nick), id = String(s.id), flags = Number(s.flags) || 0;
      if (q && nick.toLowerCase().indexOf(q) < 0 && id.indexOf(q) < 0) return;
      if (onlyFlagged && !flags) return;
      var tr = d.createElement("tr");
      tr.appendChild(el("td", String(i + 1)));
      var nickCell = el("td", nick);
      tr.appendChild(nickCell);
      tr.appendChild(el("td", nf.format(Number(s.score) || 0)));
      var idCell = el("td", id.slice(0, 8) + "…", "mono");
      idCell.title = id;
      tr.appendChild(idCell);
      var flagCell = el("td", undefined, "flag");
      if (flags) {
        tr.classList.add("flagged");
        flagCell.appendChild(el("span", "⚠️ " + flags + "× — " + String(s.flag || "")));
        flagCell.appendChild(btn("Wyczyść", function () { action("/admin/clearflag", { id: id }, "Wyczyszczono flagę."); }, "ghost"));
      }
      tr.appendChild(flagCell);
      var act = el("td", undefined, "actions");
      act.appendChild(btn("Zmień nick", function () { editNick(nickCell, id, nick); }, "ghost"));
      act.appendChild(btn("Usuń", function () {
        if (confirm("Usunąć wynik gracza „" + nick + "”?")) action("/admin/delete", { id: id }, "Usunięto wpis.");
      }, "danger"));
      act.appendChild(btn("Zbanuj", function () {
        if (confirm("Zbanować „" + nick + "”? Wynik zostanie usunięty, a gracz nie będzie mógł wysyłać nowych.")) {
          action("/admin/ban", { id: id }, "Zbanowano.");
        }
      }, "danger"));
      tr.appendChild(act);
      tb.appendChild(tr);
    });
    if (!tb.children.length) {
      var tr = d.createElement("tr");
      var td = el("td", scores.length ? "Brak wyników dla filtra." : "Ranking jest pusty.", "muted");
      td.colSpan = 6;
      tr.appendChild(td);
      tb.appendChild(tr);
    }
  }

  // Edycja w wierszu zamiast prompt(), którego część przeglądarek nie obsługuje
  function editNick(cell, id, nick) {
    cell.textContent = "";
    var form = el("form", undefined, "inline-edit");
    var inp = el("input");
    inp.value = nick;
    inp.maxLength = 16;
    inp.setAttribute("aria-label", "Nowy nick (2–16 znaków)");
    var ok = el("button", "Zapisz");
    ok.type = "submit";
    var cancel = function () { cell.textContent = nick; };
    form.appendChild(inp);
    form.appendChild(ok);
    form.appendChild(btn("Anuluj", cancel, "ghost"));
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inp.value.trim();
      if (v === nick) { cancel(); return; }
      action("/admin/rename", { id: id, nick: v }, "Zmieniono nick.");
    });
    inp.addEventListener("keydown", function (e) { if (e.key === "Escape") cancel(); });
    cell.appendChild(form);
    inp.focus();
    inp.select();
  }

  function refreshScores() {
    api("/admin/scores").then(setScores).catch(function (e) { fail(e, $("scores-msg")); });
  }

  function action(path, body, okMsg) {
    api(path, body).then(function () {
      $("scores-msg").textContent = okMsg;
      refreshScores();
      loadBans();
    }).catch(function (e) { fail(e, $("scores-msg")); });
  }

  function loadBans() {
    api("/admin/bans").then(function (list) {
      var ul = $("bans");
      ul.textContent = "";
      if (!Array.isArray(list) || !list.length) {
        ul.appendChild(el("li", "Brak banów.", "muted"));
        return;
      }
      list.forEach(function (id) {
        var li = el("li");
        li.appendChild(el("span", String(id), "mono"));
        li.appendChild(btn("Odbanuj", function () { action("/admin/unban", { id: String(id) }, "Odbanowano."); }, "ghost"));
        ul.appendChild(li);
      });
    }).catch(function (e) { fail(e, $("scores-msg")); });
  }

  // Status
  function mcStatus(host) {
    return fetch("https://api.mcsrvstat.us/3/" + host, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; });
  }

  function loadStatus() {
    var dl = $("status");
    dl.textContent = "";
    dl.appendChild(el("dt", "Ładowanie…"));
    var t0 = performance.now();
    var rank = fetch(API + "/scores", { cache: "no-store" })
      .then(function (r) { return r.ok ? ["działa (" + Math.round(performance.now() - t0) + " ms)", "ok"] : ["błąd HTTP " + r.status, "bad"]; })
      .catch(function () { return ["niedostępne", "bad"]; });

    Promise.all([rank, mcStatus(MC_QUERY), mcStatus(MC_PUBLIC)]).then(function (r) {
      dl.textContent = "";
      function row(k, v, cls) {
        dl.appendChild(el("dt", k));
        dl.appendChild(el("dd", v, cls));
      }
      row("API rankingu", r[0][0], r[0][1]);
      var mc = r[1];
      if (!mc) {
        row("Serwer Minecraft", "brak danych", "bad");
      } else if (!mc.online) {
        row("Serwer Minecraft", "offline", "bad");
      } else {
        var p = mc.players || {};
        row("Serwer Minecraft", "online · " + (Number(p.online) || 0) + "/" + (Number(p.max) || 0) + (mc.version ? " · " + String(mc.version) : ""), "ok");
        var names = (Array.isArray(p.list) ? p.list : []).map(function (x) { return x && x.name ? String(x.name) : ""; }).filter(Boolean);
        if (names.length) row("Gracze", names.join(", "));
      }
      var apex = r[2];
      row("Adres " + MC_PUBLIC, apex && apex.online ? "działa" : "nie działa — brak rekordu SRV _minecraft._tcp", apex && apex.online ? "ok" : "bad");
      row("Wpisy w rankingu", String(scores.length));
      var flagged = scores.filter(function (s) { return Number(s.flags) > 0; }).length;
      row("Podejrzane wpisy", String(flagged), flagged ? "bad" : "ok");
    });
  }

  // Zapis gry
  function saveMsg(t) { $("save-msg").textContent = t; }

  $("save-export").addEventListener("click", function () {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* brak storage */ }
    $("save-box").value = raw || "";
    saveMsg(raw ? "Wczytano zapis (" + raw.length + " znaków)." : "Brak zapisu w tej przeglądarce.");
  });

  $("save-copy").addEventListener("click", function () {
    var v = $("save-box").value;
    if (!v || !navigator.clipboard) { saveMsg("Najpierw kliknij „Pokaż zapis”."); return; }
    navigator.clipboard.writeText(v).then(function () { saveMsg("Skopiowano."); }, function () { saveMsg("Nie udało się skopiować."); });
  });

  $("save-import").addEventListener("click", function () {
    var v = $("save-box").value.trim(), obj;
    try { obj = JSON.parse(v); } catch (e) { obj = null; }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) { saveMsg("To nie jest poprawny zapis (JSON obiektu)."); return; }
    if (!confirm("Nadpisać zapis gry w tej przeglądarce?")) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(obj)); saveMsg("Zaimportowano. Otwórz stronę gry."); }
    catch (e) { saveMsg("Nie udało się zapisać."); }
  });

  $("save-reset").addEventListener("click", function () {
    if (!confirm("Usunąć zapis gry w tej przeglądarce?")) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* brak storage */ }
    $("save-box").value = "";
    saveMsg("Usunięto zapis.");
  });

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = $("token").value.trim();
    if (t.length < 24) { $("login-msg").textContent = "Token ma co najmniej 24 znaki."; return; }
    login(t);
  });
  $("logout").addEventListener("click", function () { logout("Wylogowano."); });
  $("filter").addEventListener("input", renderScores);
  $("only-flagged").addEventListener("change", renderScores);
  $("refresh-scores").addEventListener("click", function () { $("scores-msg").textContent = ""; refreshScores(); loadBans(); });
  $("refresh-status").addEventListener("click", loadStatus);

  if (token) login(token);
})();
