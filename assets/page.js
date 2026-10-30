(function () {
  "use strict";

  // Ranking działa tylko przez HTTPS (CORS), więc wersję http przekierowujemy na https
  if (location.protocol === "http:" && /(^|\.)chomiczanora\.pl$/.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
    return;
  }

  var GAME_NAME = "Chomicze Orzeszki";
  var PLAY_KEY = "chomicza-clicker-v1-play";
  var SAVE_KEY = "chomicza-clicker-v1";
  var MC_HOST = "chomiczanora.pl";
  // Status z mc.*, bo domena główna nie ma jeszcze rekordu SRV _minecraft._tcp
  var MC_QUERY = "mc.chomiczanora.pl";
  var d = document;

  // Strona jest jednoekranowa: bez tego przeglądarka po przeładowaniu przywraca przesunięcie widoku
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // Ta sama wersja (?v=) dla game.js, żeby ranking i wykrywanie aktualizacji miały jedno źródło prawdy
  var V = ((/[?&]v=([\w.-]+)/.exec(d.currentScript && d.currentScript.src || "")) || [])[1] || "";

  // Gra jest opcjonalna: startuje po kliknięciu „Zagraj” i zapamiętuje wybór
  var playBtn = d.getElementById("play");
  var playing = false;
  var loading = false;

  function flag() {
    try { return localStorage.getItem(PLAY_KEY); } catch (e) { return null; }
  }
  function setFlag(on) {
    try { localStorage.setItem(PLAY_KEY, on ? "1" : "0"); } catch (e) { /* brak storage */ }
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
  }

  function label() {
    if (!playBtn) return;
    playBtn.textContent = loading ? "Ładowanie…" : playing ? "⏹ Wyłącz grę" : "▶ Zagraj w " + GAME_NAME;
    playBtn.classList.toggle("is-on", playing);
    playBtn.disabled = loading;
  }

  function loadGame(done) {
    if (loading || playing) return;
    loading = true;
    label();
    var s = d.createElement("script");
    s.src = "assets/game.js" + (V ? "?v=" + V : "");
    s.onload = function () {
      loading = false;
      playing = true;
      label();
      if (done) done(true);
    };
    s.onerror = function () {
      loading = false;
      s.remove();
      label();
      if (done) done(false);
    };
    d.body.appendChild(s);
  }

  if (playBtn) {
    playBtn.addEventListener("click", function () {
      if (playing) {
        // Zapis gry zostaje w przeglądarce, wyłączamy tylko interfejs
        setFlag(false);
        location.reload();
        return;
      }
      setFlag(true);
      loadGame(function (ok) { if (!ok) setFlag(false); });
    });
    label();
    var f = flag();
    // Wracający gracze z zapisem startują od razu, chyba że sami wyłączyli grę
    if (f === "1" || (f === null && hasSave())) loadGame();
  }

  // Status serwera Minecraft (publiczne API mcsrvstat.us); gra korzysta z niego przez zdarzenie cn:mc
  var mcBtn = d.getElementById("mc");
  if (mcBtn) {
    var mcText = mcBtn.querySelector(".mc-btn__text");
    var mcLabel = "Minecraft";
    var publish = function (online, players) {
      window.cnMc = { online: online, players: players };
      d.dispatchEvent(new CustomEvent("cn:mc"));
    };
    var mcStatus = function () {
      fetch("https://api.mcsrvstat.us/3/" + MC_QUERY, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) {
          if (j && j.online) {
            var p = j.players || {};
            mcBtn.dataset.state = "online";
            mcLabel = "Minecraft " + Number(p.online || 0) + "/" + Number(p.max || 0);
            mcBtn.title = (j.version ? "Wersja: " + String(j.version) + ". " : "") + "Kliknij, aby skopiować adres serwera";
            publish(true, Number(p.online) || 0);
          } else {
            mcBtn.dataset.state = "offline";
            mcLabel = "Minecraft offline";
            publish(false, 0);
          }
          mcText.textContent = mcLabel;
        })
        .catch(function () {
          mcBtn.dataset.state = "unknown";
          mcLabel = "Minecraft";
          mcText.textContent = mcLabel;
          publish(false, 0);
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
})();
