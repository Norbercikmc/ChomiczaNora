# Sprawozdanie techniczne — plan czystej przebudowy homelabu

**Wersja:** 1.0
**Data:** 21 października 2026 r.
**Zakres:** reinstalacja Proxmox, przebudowa sieci, VPS, WireGuard, HAProxy, Minecraft i pozostałych usług.

## 1. Cel projektu

Celem jest stworzenie uporządkowanej infrastruktury domowej, która umożliwi:

- hosting Minecrafta i innych serwerów gier dla znajomych;
- zdalny dostęp przez WireGuard;
- publikowanie wybranych usług przez VPS z publicznym adresem IP;
- obsługę infrastruktury przez GUI Proxmox i interfejsy webowe usług;
- uruchomienie lokalnego LLM i agenta Discord;
- wykonywanie regularnych kopii zapasowych;
- łatwe dodawanie kolejnych hostów i usług;
- odtwarzanie infrastruktury po awarii bez konieczności odtwarzania konfiguracji z pamięci.

Podstawową zasadą jest rozdzielenie produkcji, usług infrastrukturalnych, testów i kopii zapasowych.

## 2. Docelowy podział sprzętu

| Host | Konfiguracja | Docelowa rola |
|---|---|---|
| i5-11400F | 32 GB RAM, GT 210 | Produkcyjne serwery gier |
| Xeon E5-2690 v1 | 64 GB RAM | Backupy, magazyn danych, usługi infrastrukturalne i testy |
| i7-8700 | 24 GB RAM, RTX 2070 Super 8 GB | Lokalny LLM i agent AI |
| i5-4570 | 12 GB RAM | Monitoring i lekkie usługi |
| FX-8300 | 16 GB RAM | Maszyna testowa uruchamiana na żądanie |
| Pentium E5300 | 2 GB RAM | Opcjonalny host edukacyjny lub retro; nie jest krytyczny dla infrastruktury |

Powyższy podział jest planem, a nie potwierdzeniem, że wszystkie maszyny muszą stale pracować. Pentium E5300 nie powinien być elementem krytycznym. i5-4570 i FX-8300 można uruchamiać zależnie od zapotrzebowania.

### Dyski i magazyn danych

Znany stan sprzętu:

- **i5-11400F:** SSD 120 GB, SSD 240 GB i HDD 1 TB — trzeba potwierdzić, które dyski są obecnie podłączone i jak są wykorzystywane;
- **Xeon E5-2690:** SSD 128 GB i HDD 2 TB;
- **i5-4570:** SSD 128 GB;
- **FX-8300:** dysk do potwierdzenia;
- **i7-8700:** HDD 1 TB, dysk systemowy do potwierdzenia;
- **Pentium E5300:** dysk około 20 GB typu IDE/PATA.

Przed instalacją należy wykonać spis dysków z numerami seryjnymi, pojemnością, SMART i przeznaczeniem. Nie wolno zakładać, że dysk o określonej pojemności można wyczyścić tylko dlatego, że był wcześniej używany przez Proxmox.

SSD 128 GB na Xeonie może być zbyt mały na system, maszyny wirtualne i repozytorium backupów jednocześnie. Nie należy zakładać, że 2 TB HDD sam w sobie zapewni bezpieczne kopie zapasowe.

## 3. Architektura sieci

### 3.1. Zasady

1. Zwykły router domowy pozostaje głównym routerem domu.
2. Nie wdrażamy VLAN-ów.
3. Hosty Proxmox pozostają w jednej sieci LAN.
4. Nie kierujemy całego ruchu domowego przez OPNsense.
5. WireGuard zapewnia zdalny dostęp do wybranych hostów i usług.
6. VPS pozostaje punktem wejścia z Internetu dla wybranych usług.
7. Sieć `10.20.0.0/24` nie jest przydzielana, dopóki nie zostanie opracowany nowy plan adresacji.

### 3.2. VPS

Dotychczasowy VPS OVH ma publiczny adres IPv4 `51.83.186.233`. Dotychczasowe adresy WireGuard to:

- `10.10.0.1` — VPS;
- `10.10.0.2` — obecna maszyna produkcyjna Minecraft.

Te adresy zachowujemy na etapie przygotowania migracji. Ostateczna adresacja zostanie zatwierdzona przed przebudową tunelu.

Docelowo VPS będzie obsługiwał:

- WireGuard;
- firewall i kontrolowany forwarding;
- HAProxy dla usług, które rzeczywiście wymagają proxy;
- publikację wybranych serwerów gier;
- logowanie i diagnostykę ruchu.

Nie należy bez sprawdzenia odtwarzać wszystkich dotychczasowych reguł NAT i portów. Każdy port musi mieć wskazaną usługę, protokół i docelowy host.

### 3.3. OPNsense

OPNsense może być centralnie zarządzaną przez przeglądarkę bramą dla wybranych VM/LXC. Nie zastępuje jednak automatycznie routingu między hostami Proxmox.

Ponieważ hosty mają znajdować się w jednej sieci LAN, trzeba zaprojektować sposób dotarcia do OPNsense z maszyn na pozostałych hostach. Samo utworzenie VM z OPNsense na jednym serwerze nie wystarczy, by pozostałe hosty automatycznie zaczęły kierować przez nią ruch.

Dlatego przed wdrożeniem należy potwierdzić:

- adresację LAN i adres routera domowego;
- fizyczne i logiczne interfejsy każdego hosta;
- mosty Proxmoxa;
- docelowe trasy dla wybranych VM/LXC;
- sposób dostępu administracyjnego w razie awarii bramy.

Nie będziemy wdrażać OPNsense jako routera całego domu.

## 4. Plan instalacji Proxmox

Każdy host otrzyma czystą instalację wspieranej, stabilnej wersji Proxmox VE wybranej na dzień wdrożenia. Przed instalacją należy sprawdzić kompatybilność sprzętu, aktualny status wydań i dostępne aktualizacje.

Wspólny standard dla hostów:

- unikalna nazwa hosta;
- stały adres IP w LAN, najlepiej zarezerwowany w routerze lub poza jego pulą DHCP;
- identyczna konwencja nazw bridge'y;
- dostęp administracyjny wyłącznie z zaufanej sieci;
- synchronizacja czasu i prawidłowy DNS;
- aktualizacje systemu;
- brak niepotrzebnie wystawionego interfejsu zarządzającego do Internetu;
- dokumentacja magazynów danych i dysków.

Na każdym hoście przed zmianami sieciowymi trzeba mieć lokalny lub fizyczny dostęp awaryjny. Błędna konfiguracja interfejsu sieciowego może odciąć GUI Proxmoxa.

### Konwencja sieciowa

- `vmbr0` — podstawowy bridge LAN, podłączony do fizycznej karty sieciowej;
- dodatkowe bridge'e tylko wtedy, gdy wymagają ich konkretne usługi lub zaplanowana topologia;
- bez przypadkowego mieszania kilku podsieci i tras;
- bez przenoszenia starych reguł sieciowych bez sprawdzenia ich przeznaczenia.

Nie należy na tym etapie kopiować całego `/etc/network/interfaces` ze starego hosta. Konfigurację przygotowujemy zgodnie z nową topologią.

## 5. Docelowe maszyny wirtualne i usługi

### i5-11400F — produkcja

Główny host serwerów gier. Minecraft będzie działał w dedykowanej VM z systemem Linux. Początkowy przydział zasobów należy dobrać po pomiarach; punktem wyjścia może być 6 vCPU, 12–16 GB RAM i około 10 GB sterty JVM, o ile pozostanie odpowiedni zapas pamięci dla systemu i innych usług.

Nie należy łączyć wszystkich serwerów gier z usługami administracyjnymi w jednej VM.

### Xeon E5-2690 — backup i usługi infrastrukturalne

Docelowo:

- magazyn kopii zapasowych;
- monitoring lub usługi pomocnicze;
- środowisko testowe.

Jeżeli będzie uruchamiany Proxmox Backup Server, trzeba rozstrzygnąć, czy ma działać bezpośrednio na osobnej maszynie, czy w VM. Dedykowany system backupowy jest korzystniejszy z punktu widzenia niezależności od hosta Proxmox, ale wymaga odpowiedniego układu dysków i zasobów.

### i7-8700 — lokalne AI

Dedykowana VM z Linuxem i Docker Compose, w której można uruchomić:

- Ollama;
- Open WebUI;
- model instrukcyjny 7B w skwantyzowanym formacie;
- opcjonalnie model kodujący;
- API dla własnego agenta;
- bota Discord.

RTX 2070 Super ma 8 GB VRAM, więc rozmiar modelu i kontekst trzeba dobrać do pamięci karty. Nie zakładamy, że dowolny duży model zmieści się w całości w VRAM.

Agent AI nie otrzyma nieograniczonego dostępu root, kluczy SSH ani bezpośredniego dostępu do socketu Dockera. Operacje administracyjne powinny odbywać się przez jawnie dozwolone akcje z logowaniem.

### i5-4570 — monitoring

Lekka VM lub LXC z:

- Uptime Kuma;
- monitoringiem dostępności hostów;
- eksportem metryk;
- powiadomieniami.

Nie umieszczamy na tym hoście jedynej kopii ważnych danych ani krytycznych elementów wymaganych do odzyskania całej infrastruktury.

### FX-8300 i Pentium E5300

FX-8300 będzie środowiskiem do testowania nowych usług i konfiguracji. Pentium pozostaje opcjonalnym hostem edukacyjnym. Żaden z nich nie jest wymagany do działania produkcyjnego Minecrafta, VPN lub backupów.

## 6. Przebudowa VPS

VPS będzie przebudowany dopiero po wykonaniu kopii i zatwierdzeniu nowego planu sieciowego.

Przed reinstalacją należy zachować:

- listę aktywnych peerów WireGuard i ich publicznych kluczy;
- konfigurację interfejsów i tras;
- reguły firewall/NAT;
- konfigurację HAProxy;
- listę portów TCP/UDP i ich docelowych usług;
- rekordy DNS;
- certyfikaty i konfigurację TLS, jeśli są używane;
- skrypty systemd, zadania cron i inne usługi;
- logi potrzebne do diagnostyki.

Klucze prywatne należy przechowywać bezpiecznie i nie umieszczać ich w publicznym sprawozdaniu.

Po instalacji VPS:

1. skonfigurować dostęp administracyjny i aktualizacje;
2. uruchomić firewall z domyślną polityką blokującą niepotrzebny ruch;
3. skonfigurować WireGuard;
4. sprawdzić routing i połączenie z hostem testowym;
5. uruchomić HAProxy tylko dla zatwierdzonych usług;
6. zweryfikować dostęp z zewnętrznej sieci;
7. dopiero później przenieść ruch produkcyjny.

## 7. Odbudowa Minecrafta

Przed reinstalacją należy zachować pełną kopię:

- wszystkich światów i wymiarów;
- plików `server.properties`, `server.jar` oraz ustawień JVM;
- konfiguracji pluginów;
- danych graczy i uprawnień;
- baz danych i plików ekonomii;
- konfiguracji proxy i routingu;
- konfiguracji mapy, jeśli istnieje;
- skryptów startowych i usług systemd.

Należy sprawdzić zgodność wersji serwera, pluginów, Javy i świata. Kopia powinna być zweryfikowana przez testowe uruchomienie, a nie tylko przez sprawdzenie, czy katalog istnieje.

Nowy serwer należy uruchomić w odizolowanym środowisku testowym. Dopiero po sprawdzeniu logowania, pluginów, świata, uprawnień i połączenia z WireGuard można przełączyć domenę lub forwarding na nową instancję.

## 8. Kopie zapasowe

Kopie należy wykonać przed jakimkolwiek formatowaniem dysków lub reinstalacją.

Minimalny plan:

- **Minecraft:** kopia świata co 6 godzin;
- **konfiguracje usług:** po istotnych zmianach i codziennie;
- **VM i LXC:** regularne kopie według znaczenia usługi;
- **VPS:** kopia konfiguracji po zmianach i codziennie;
- **kluczowe dane:** dodatkowa kopia na innym urządzeniu lub w innej lokalizacji.

Kopia znajdująca się na tym samym dysku, który jest formatowany, nie jest bezpieczną kopią migracyjną.

Przed uznaniem kopii za gotową należy:

1. sprawdzić jej kompletność;
2. sprawdzić błędy archiwizacji;
3. odtworzyć przynajmniej jedną kopię w środowisku testowym;
4. udokumentować lokalizację kopii i sposób odtworzenia.

## 9. Kolejność wdrożenia

### Etap 1 — inwentaryzacja i kopie

- spis sprzętu i dysków;
- spis VM/LXC, adresów IP i bridge'y;
- eksport konfiguracji VPS;
- kopia Minecrafta i pozostałych usług;
- test odtwarzania.

**Warunek przejścia:** mamy zweryfikowane kopie i dokumentację potrzebną do odbudowy.

### Etap 2 — projekt sieci

- potwierdzenie podsieci LAN i adresu routera;
- rezerwacja adresów hostów;
- plan WireGuard;
- plan routingu między hostami;
- decyzja o OPNsense;
- plan DNS i domen.

**Warunek przejścia:** każda VM/LXC ma określoną sieć i wiadomo, jak uzyska dostęp do wymaganych usług.

### Etap 3 — czysta instalacja hostów

- instalacja Proxmox;
- aktualizacje;
- konfiguracja bridge'y;
- magazyny danych;
- konta i dostęp administracyjny;
- test sieci i restartu hosta.

### Etap 4 — infrastruktura bazowa

- backupy;
- monitoring;
- synchronizacja czasu i DNS;
- dokumentacja i alerty.

### Etap 5 — VPN i brama publiczna

- przebudowa VPS;
- konfiguracja WireGuard;
- test połączeń;
- firewall;
- HAProxy i wybrane porty.

### Etap 6 — produkcja

- odtworzenie Minecrafta;
- testy świata i pluginów;
- test dostępu z Internetu;
- przełączenie domen i ruchu;
- monitoring po migracji.

### Etap 7 — pozostałe usługi

- serwery dodatkowych gier;
- panel administracyjny;
- lokalne LLM;
- agent Discord;
- środowisko testowe.

## 10. Kryteria zakończenia

Przebudowę uznajemy za zakończoną, gdy:

- wszystkie hosty mają udokumentowaną konfigurację;
- dostęp administracyjny działa po restarcie;
- WireGuard działa po obu stronach tunelu;
- firewall nie wystawia niepotrzebnych usług;
- Minecraft działa z odtworzonym światem i danymi;
- backupy wykonują się automatycznie;
- przetestowano odtworzenie danych;
- monitoring wykrywa niedostępność hosta lub usługi;
- istnieje procedura odzyskania VPS i produkcji;
- nie ma nieużywanych, nieudokumentowanych tras ani reguł przekierowań.

## 11. Informacje wymagane przed rozpoczęciem

Przed pierwszą reinstalacją należy potwierdzić:

- aktualny adres IP routera i podsieć LAN;
- fizyczne interfejsy sieciowe każdego hosta;
- dokładne dyski i ich przeznaczenie;
- aktualny stan peeringu WireGuard;
- pełną listę usług i portów publikowanych przez VPS;
- miejsce przechowywania kopii poza przebudowywanymi dyskami.

**Najważniejsza zasada:** nie formatujemy żadnego dysku i nie kasujemy konfiguracji VPS, dopóki kopie nie zostaną zweryfikowane i nie będzie gotowy plan odtworzenia.
