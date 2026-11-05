# Gra po stronie serwera

`GameServer.java` jest źródłem prawdy dla sezonu 2: wyniku, produkcji, kliknięć, zakupów, prestiżu, gier losowych, osiągnięć, karnetu i eventów. Przeglądarka wysyła jedynie akcje. Gracz jest identyfikowany przez losowe ciasteczko `HttpOnly`; dane są zapisywane do `game-season2.tsv`, a bany do `game-season2.bans`.

## Uruchomienie na VPS

Wymagany jest JDK 11 lub nowszy. Uruchom `GameServer` jako usługę nasłuchującą wyłącznie na `127.0.0.1:8081`. Konto usługi musi mieć zapis do katalogu danych. `RANKING_ADMIN_TOKEN` powinien być losowym sekretem o długości co najmniej 24 znaków.

```sh
RANKING_ADMIN_TOKEN='wstaw-tu-losowy-sekret-min-24-znaki' java -Dgameport=8081 -Dgamedata=/var/lib/chomicza/game-season2.tsv -Dgamebans=/var/lib/chomicza/game-season2.bans GameServer.java
```

W reverse proxy dla `api.chomiczanora.pl` skieruj wszystkie poniższe ścieżki do nowego procesu:

- `/game` → `127.0.0.1:8081/game`
- `/scores` → `127.0.0.1:8081/scores`
- `/gamba` → `127.0.0.1:8081/gamba`
- `/admin/*` → `127.0.0.1:8081/admin/*`

Proxy musi przepuszczać `Origin`, `Cookie`, `Set-Cookie` i `Authorization`, wyłączać cache dla API oraz nadpisywać `X-Forwarded-For` adresem klienta. Nie wystawiaj portu 8081 do internetu. Zatrzymaj poprzedni proces `Leaderboard`, żeby ranking i panel admina korzystały z jednego źródła danych.

Dane sezonu 1 (`scores.tsv`) pozostają archiwum. Nowy serwer nie importuje wyników wysyłanych przez klienta; zaczyna osobny ranking w pliku sezonu 2.

## Zakres i ograniczenia

Ranking, kliknięcia, zakupy, gamba, nagrody eventowe, prestiż, osiągnięcia i karnet są zatwierdzane na serwerze. Aktywna gra nalicza pełną produkcję; podczas nieobecności serwer nalicza 25% CPS maksymalnie przez 2 godziny. Ochrona obejmuje limit tempa kliknięć, limit nowych sesji na adres IP, ograniczenia eventów oraz losowanie nagród po stronie serwera. Wygląd gry, animacje, dźwięki i lokalne narzędzia eksportu/importu panelu pozostają w przeglądarce; lokalny zapis nie może zmienić stanu sezonu 2.

Kod wymaga wdrożenia razem z trasami reverse proxy i sekretem admina. Nie uruchamiaj równolegle starej usługi rankingu pod tym samym API.

## Automatyczne wdrażanie na VPS

Repozytorium zawiera workflow `.github/workflows/deploy-game-server.yml`. Po pushu zmian w `GameServer.java` na `main` workflow kompiluje kod, kopiuje tylko plik źródłowy do `/home/ubuntu/rankingwww`, restartuje `game-server.service` i sprawdza lokalny endpoint `/scores`. Przy błędzie health checku przywracana jest poprzednia wersja źródła. Pliki danych w `/var/lib/chomicza` nie są kopiowane ani kasowane.

Przed pierwszym wdrożeniem skonfiguruj GitHub repository secrets:

- `VPS_SSH_KEY` — prywatny klucz wdrożeniowy (bez hasła), dodaj pasujący klucz publiczny do `/home/ubuntu/.ssh/authorized_keys` na VPS.
- `VPS_KNOWN_HOSTS` — zaufany wpis hosta dla `51.83.186.233`, odczytany z `~/.ssh/known_hosts` po zweryfikowanym połączeniu SSH.

Utwórz osobny klucz wdrożeniowy na swoim komputerze poleceniem `ssh-keygen -t ed25519 -C github-actions-chomiczanora -f ~/.ssh/chomiczanora-actions` i zostaw passphrase pusty. Prywatną część zapisz bezpośrednio w GitHub Actions secret `VPS_SSH_KEY`; nie commituj jej i nie wklejaj do czatu. Publiczną część dodaj na VPS do `~/.ssh/authorized_keys`.

Użytkownik `ubuntu` musi móc bez hasła zrestartować wyłącznie tę usługę. Na VPS skonfiguruj tę regułę przez `sudo visudo -f /etc/sudoers.d/game-server-deploy`:

```sudoers
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart game-server.service
```

Workflow nie wdraża `Leaderboard.java`, nie zmienia konfiguracji proxy ani nie importuje danych sezonu 1. Zmiany w innych plikach repozytorium nie restartują serwera gry.
