# Dokumentacja i Analiza Funkcji Aplikacji Raportów
   111
// test git push 

git add . && git commit -m "Aktualizacja kodu" && git push origin X-Bot-Optymalizacja

cd /var/www/bot-raport-dzienny && git pull origin X-Bot-Optymalizacja && pm2 restart raport-bot


Niniejszy dokument zawiera szczegółową analizę kluczowych plików JavaScript w aplikacji raportów, omówienie poszczególnych funkcji, zależności między modułami oraz ogólny flow działania systemu. Poniżej znajdziesz omówienie każdego z plików:

---

## Spis Plików
1. [edytujRaport.js](#edytujraportjs)
2. [raport.js](#raportjs)
3. [config/config.js](#configjs)
4. [utils/channelManager.js](#channelmanagerjs)
5. [utils/googleSheets.js](#googlesheetsjs)
6. [utils/raportDataStore.js](#raportdatastorejs)
7. [utils/timeValidation.js](#timevalidationjs)
8. [index.js](#indexjs)
9. [deploy-commands.js](#deploy-commandsjs)

---

## 1. edytujRaport.js  
### Przeznaczenie:
Plik odpowiada za obsługę komendy `/edytuj_raport`, która obecnie nie wykonuje edycji raportów, lecz wyświetla użytkownikowi jedynie instrukcje, jak edytować raporty.

### Główne Elementy:
- **Importy:**  
  - `SlashCommandBuilder` z pakietu `@discordjs/builders`.

- **Funkcja wykonawcza (`execute`):**  
  - **Cel:** Po wywołaniu komendy, użytkownik otrzymuje wiadomość z instrukcjami, jak edytować raport.
  - **Flow:**  
    1. Przygotowuje `instructionMessage` – treść zawierającą szczegółowe kroki dotyczące edycji raportów.
    2. Wysyła wiadomość jako odpowiedź (`interaction.reply`) z flagą `ephemeral`, aby widoczna była tylko dla użytkownika.
  
- **Zależności:**  
  - Wyłącznie wewnętrzna logika oparta na `SlashCommandBuilder`. Brak połączenia z Google Sheets, modułem kanałów czy store'em.

---

## 2. raport.js  
### Przeznaczenie:
Obsługa komendy `/raport` – tworzenie nowych raportów dziennych. Plik zarządza formularzem, walidacją danych, prezentacją wyboru opcji (nowy raport lub podmiana istniejącego) oraz wysyłaniem raportów do kanałów oraz Google Sheets.

### Główne Elementy:
- **Importy:**
  - `SlashCommandBuilder` z `@discordjs/builders`.
  - Komponenty Discord takie jak `ActionRowBuilder`, `StringSelectMenuBuilder`, `ButtonBuilder`, `ButtonStyle`, `TextInputBuilder`, `TextInputStyle`.
  - Stałe z `../config/config` (np. `MIEJSCA_PRACY`, `POJAZDY`, `CZAS`).
  - Moduły lokalne: `googleSheets` (integracja z Google Sheets), `channelManager` (zarządzanie kanałami), `raportStore` (przechowywanie danych formularza).

- **Główne Funkcje:**
  - **execute(interaction):**  
    - Inicjuje formularz raportu dla użytkownika, zapisując podstawowe dane w store (za pomocą `raportStore.initReport`).
    - Generuje dynamiczne komponenty (menu, przyciski) umożliwiające użytkownikowi wprowadzanie danych (wybór miejsca pracy, pojazdu, czasu, osób pracujących, itp.).
    - Po zebraniu pełnych danych, sprawdza kompletność formularza.
    - Wywołuje `googleSheets.znajdzRaportUzytkownika` – aby sprawdzić czy raport o danej dacie już istnieje.
    - Oferuje użytkownikowi przyciski potwierdzające: "Wyślij jako nowy", „Podmień istniejący" oraz "Anuluj raport".  
    - Następnie, w zależności od wyboru, informuje użytkownika o wysyłaniu raportu i wywołuje funkcję `wyslijRaport`.

  - **wyslijRaport(interaction, raportData, isEdit = false, originalRaport = null):**  
    - Przygotowuje dane do wysłania, modyfikując `username` (formatowanie na lowercase z podkreśleniami).
    - Wywołuje funkcję `formatujRaport` w celu sformatowania treści wiadomości raportu, z uwzględnieniem informacji o edycji, jeśli dotyczy.
    - Wywołuje `googleSheets.dodajRaport` do zapisu raportu w arkuszu Google.
    - Wysyła sformatowaną wiadomość na kanał główny raportów oraz do prywatnego kanału użytkownika (przy użyciu `channelManager.getOrCreateUserChannel`).
    - Po pomyślnym wysłaniu, informuje użytkownika o sukcesie.

  - **formatujRaport(raportData, isEdit = false, originalRaport = null):**  
    - Formatuje treść raportu, tworząc nagłówek zależny od tego, czy raport jest nowy, czy edytowany.
    - Jeśli edytowany – nagłówek zawiera informację o oryginalnym wpisie (np. ID lub data raportu).
    - Do wiadomości dodawane są szczegóły: nazwa użytkownika, data, czasy rozpoczęcia i zakończenia, miejsce pracy, dieta, osoby pracujące, auto oraz kierowca.

- **Zależności:**  
  - `googleSheets` – do operacji zapisu i wyszukiwania raportów.
  - `channelManager` – do zarządzania kanałami prywatnymi.
  - `raportStore` – przechowuje dane formularza raportu.
  - Konfiguracja z `config/config.js` (m.in. opcje wyboru) i funkcje formatujące treść raportu.

---

## 3. config/config.js  
### Przeznaczenie:
Plik konfiguracyjny zawiera stałe ustawienia aplikacji, które są wykorzystywane przez inne moduły.

### Główne Elementy:
- **MIEJSCA_PRACY:**  
  - Tablica dostępnych miejsc pracy (np. 'SERWIS', 'Biuro', 'Inne').

- **POJAZDY:**  
  - Tablica dostępnych pojazdów (np. 'Renault Master', 'Opel Vivaro', itp.).

- **KANAL_RAPORTY_ID:**  
  - Identyfikator kanału głównego, gdzie wysyłane są raporty.

- **GOOGLE_SHEETS:**  
  - Obiekt zawierający konfigurację arkusza Google, w tym zakres komórek (`RANGE`) oraz nagłówki kolumn (`COLUMNS`).
  
- **CZAS:**  
  - Obiekt zawierający:  
    - Predefiniowane minuty (np. '00', '30').
    - Funkcje generujące godziny rozpoczęcia oraz zakończenia (uwzględniając początkową wartość i kolejność godzin).
    - Funkcję `getDaty`, która generuje listę dat (od "dziś" aż do 20 dni wstecz).

- **Zależności:**  
  - Dostępny dla modułów takich jak `raport.js`, `googleSheets.js`, lub inne, które muszą korzystać z stałych konfiguracyjnych.

---

## 4. utils/channelManager.js  
### Przeznaczenie:
Moduł ten zarządza tworzeniem i pobieraniem prywatnych kanałów dla użytkowników, gdzie mogą oni otrzymywać powiadomienia o raportach.

### Główne Funkcje:
- **getOrCreateUserChannel(guild, user):**  
  - Sprawdza, czy dla danego użytkownika już istnieje kanał w określonej kategorii (PRIVATE_CATEGORY_ID podanym w zmiennych środowiskowych).
  - **Flow:**  
    1. Sprawdza ograniczenie szybkości (rate limit) tworzenia kanałów.
    2. Pobiera kategorię kanałów przy użyciu `guild.channels.cache.get` oraz loguje informacje debug.
    3. Wyszukuje istniejący kanał (nazwa oparta na `raport-<username>`).
    4. Jeśli kanał istnieje i bot ma do niego dostęp, zwraca kanał; w przeciwnym razie usuwa stary kanał (jeśli to konieczne) i tworzy nowy z poprawnymi uprawnieniami (dostęp tylko dla użytkownika, bota i wyłączenie widoczności dla @everyone).

- **Zależności:**  
  - Importy z `discord.js` (ChannelType, PermissionFlagsBits).
  - Dostęp do zmiennych środowiskowych (`process.env.PRIVATE_CATEGORY_ID`).

---

## 5. utils/googleSheets.js  
### Przeznaczenie:
Moduł odpowiedzialny za integrację z Google Sheets API, umożliwiający zapisywanie, wyszukiwanie oraz przenoszenie raportów.

### Główne Elementy:
- **Inicjalizacja (init):**  
  - Używa `google.auth.GoogleAuth` z pliku `credentials.json` oraz definiuje scope jako: `https://www.googleapis.com/auth/spreadsheets`.
  - Metoda `init()` zapewnia połączenie z API.

- **getTimestamp():**  
  - Funkcja pomocnicza, która generuje znacznik czasu (timestamp) w formacie polskim (DD.MM.YYYY, GG:MM:SS).

- **generujNoweId(username):**  
  - Generuje unikalne ID raportu w formacie: `YYYY-MM-DD--HH:MM:SS--username`.
  - Loguje informacje dotyczące generowania ID oraz strefy czasowej.

- **dodajRaport(raportData, isEdit = false):**  
  - Dodaje nowy raport do arkusza (Arkusz1) przy użyciu metody `spreadsheets.values.append`.
  - Formatowane dane zawierają m.in. ID raportu, dane użytkownika, czasy pracy, status raportu – gdzie status przy edycji zawiera wzmiankę "Edytowany [timestamp]", a przy nowym raporcie status "Aktywny".
  - Obsługuje blokadę zapisu (`writeLock`) by uniknąć kolizji.

- **znajdzRaportUzytkownika(username, dataRaportu):**  
  - Wyszukuje raport użytkownika w arkuszu, porównując:
    - Username uzyskany z ID raportu (ostatnia część rozdzielona myślnikiem) – porównywane po odpowiednim sformatowaniu.
    - Datę raportu wyodrębnioną z pola "czasRozpoczecia" (pierwsza część przed spacją).
  - Dodatkowo, loguje szczegóły dla debugowania (każdy wiersz i wyniki porównań).

- **przeniesDoHistorii(raport):**  
  - Przenosi znaleziony raport z aktywnego arkusza (Arkusz1) do arkusza historii (`historia_zmian`) z nowym statusem: `Przeniesiony do historii [timestamp]`.
  - Następnie usuwa dany wiersz z aktywnego arkusza przy użyciu metody `batchUpdate` i żądania `deleteDimension`.

- **Zależności:**  
  - Pakiet `googleapis`, moduł `path`, konfiguracja z `../config/config`.
  - Używa funkcji pomocniczych takich jak `getTimestamp()`, oraz logowania, by kontrolować operacje zapisu i wyszukiwania raportów.

---

## 6. utils/raportDataStore.js  
### Przeznaczenie:
Moduł do przechowywania tymczasowych danych raportów tworzonych przez użytkowników oraz zarządzanie blokadami i timeoutami formularzy.

### Główne Funkcje:
- **initReport(userId, userData):**  
  - Inicjalizuje nowy formularz raportu dla danego użytkownika.
  - Sprawdza, czy nie przekroczono maksymalnej liczby jednoczesnych formularzy (`MAX_CONCURRENT_FORMS`).
  - Ustala początkowe dane raportu (m.in. username, miejsce pracy, czasy, itp.) oraz zapisuje datę rozpoczęcia.
  - Ustawia blokadę (lock) dla użytkownika.

- **getReport(userId):**  
  - Zwraca bieżące dane raportu zapisane w Mapie.

- **updateReport(userId, data):**  
  - Aktualizuje istniejący raport danymi przekazanymi przez użytkownika.
  - Loguje zmiany – zarówno poprzednie, jak i nowe wartości.

- **deleteReport(userId):**  
  - Usuwa raport i zwalnia blokadę dla danego użytkownika.

- **resetReport(userId):**  
  - Wymusza reset formularza (usunięcie raportu i blokady), stosowany także przy przekroczeniu czasu ważności.

- **cleanupStaleReports():**  
  - Funkcja, która okresowo (co 10 minut) czyści formularze przekraczające zadany czas ważności (`FORM_TIMEOUT` – 5 minut).
  - Loguje szczegóły czyszczenia (wyczyszczone formularze, czas aktywności, itd.).

- **Zależności:**  
  - Używa wbudowanej struktury `Map` do przechowywania danych.
  - Parametry takie jak `MAX_CONCURRENT_FORMS`, `FORM_TIMEOUT`, `CLEANUP_INTERVAL` są zdefiniowane wewnętrznie.
  - Eksportuje obiekt `store` i ustawia interwał dla funkcji czyszczenia.

---

## 7. utils/timeValidation.js  
### Przeznaczenie:
Walidacja wejściowych wartości czasu w formularzu raportu.

### Główne Funkcje:
- **validateTime(startTime, endTime):**  
  - Przyjmuje dwa argumenty typu string w formacie "HH:MM".
  - Konwertuje godziny i minuty na wartość w minutach i sprawdza, czy:
    1. Czas zakończenia jest późniejszy niż czas rozpoczęcia.
    2. Różnica między czasami nie przekracza 24 godzin.
  - Zwraca obiekt typu:
    ```js
    { valid: true } // lub { valid: false, message: 'opis błędu' }
    ```
  
- **Zależności:**  
  - Proste operacje na ciągach znaków i liczbach; nie korzysta z dodatkowych bibliotek.

---

## 8. index.js  
### Przeznaczenie:
Główny plik wejściowy aplikacji – inicjuje klienta Discord, ładuje konfigurację, obsługuje zdarzenia (np. logowanie, błędy, interakcje) oraz koordynuje działanie systemu raportów.

### Główne Elementy:
- **Inicjalizacja klienta Discord:**  
  - Używa `Client` z `discord.js` z odpowiednimi uprawnieniami (GatewayIntentBits, etc.).
  - Ładuje zmienne środowiskowe za pomocą `dotenv` oraz loguje, czy zostały poprawnie załadowane.

- **Obsługa zdarzeń:**  
  - `client.on('ready', ...)` – Loguje komunikat po pomyślnym zalogowaniu.
  - `client.on('interactionCreate', async interaction => { ... })` – Główna obsługa interakcji użytkownika, dotyczących zarówno komend slash, jak i przycisków czy menu.  
    - **Flow:**  
      1. Gdy formularz raportu jest kompletny, dane są aktualizowane w `raportStore` (wykorzystanie funkcji z `raportDataStore.js`).
      2. Wywoływane są funkcje wyszukiwania istniejącego raportu za pomocą `googleSheets.znajdzRaportUzytkownika`.
      3. Na podstawie stanu formularza, użytkownik otrzymuje przyciski potwierdzające: wysłanie nowego raportu, podmianę istniejącego lub anulowanie.
      4. Na akcje przycisków następuje wywołanie funkcji takich jak `wyslijRaport` lub przeniesienie raportu do historii poprzez `googleSheets.przeniesDoHistorii`.

- **Zależności:**  
  - Łączy się z modułami: `googleSheets`, `channelManager`, `raportStore`.
  - Używa logiki interakcji Discorda (przyciski, odpytania, aktualizacja wiadomości).

---

## 9. deploy-commands.js  
### Przeznaczenie:
Skrypt służący do rejestracji lub aktualizacji komend slash aplikacji w Discordzie.

### Główne Elementy:
- **Importy:**  
  - `REST`, `Routes` z `discord.js`.
  - Moduły `fs` oraz `path` do odczytu plików komend.
  - `dotenv` do ładowania zmiennych środowiskowych.

- **Flow działania:**
  1. Wczytuje wszystkie pliki komend (pliki `.js`) z folderu `commands`.
  2. Dla każdej komendy wywołuje metodę `toJSON()` na obiekcie `data` (zbudowanym przy użyciu `SlashCommandBuilder`).
  3. Używając instancji REST klienta (`new REST({ version: '10' })`), wysyła żądanie PUT na endpoint `Routes.applicationCommands(process.env.CLIENT_ID)`, w celu zarejestrowania lub zaktualizowania komend.
  4. Loguje postęp operacji (rozpoczęcie, powodzenie lub ewentualne błędy).

- **Zależności:**  
  - Niezbędne są zmienne środowiskowe: `TOKEN` oraz `CLIENT_ID`.
  - Integruje się z API Discorda do rejestracji komend.

---

## Zależności Między Modułami i Ogólny Flow Aplikacji

1. **Interakcje Użytkownika:**
   - **index.js** nasłuchuje interakcji (komend slash oraz interakcji z przyciskami/menu).
   - W zależności od komendy wywoływane są moduły takie jak **raport.js** lub **edytujRaport.js**.
   
2. **Przechowywanie Danych Formularza:**
   - **raportDataStore.js** zarządza przechowywaniem danych raportu, inicjalizacją i aktualizacją formularzy.
   - **raport.js** korzysta z `raportStore` do pobierania oraz aktualizacji danych podczas procesu tworzenia raportu.

3. **Integracja z Google Sheets:**
   - **googleSheets.js** realizuje operacje zapisu, wyszukiwania i archiwizacji raportów.
   - **raport.js** wywołuje funkcje takie jak `dodajRaport` do zapisywania nowych raportów oraz `znajdzRaportUzytkownika` i `przeniesDoHistorii` w przypadku edycji raportu.

4. **Kanały Discord:**
   - **channelManager.js** odpowiada za tworzenie i pobieranie prywatnych kanałów dla raportów użytkowników.
   - **raport.js** (oraz potencjalnie inne moduły) korzysta z tego modułu, aby wysłać raporty na kanał główny oraz do prywatnych kanałów użytkowników.

5. **Walidacja Czasu:**
   - **timeValidation.js** zapewnia, że wprowadzone czasy (np. rozpoczęcia i zakończenia pracy) są logiczne – końcowy czas musi być późniejszy i nie przekraczać 24 godzin.
   - Funkcja `validateTime` może być wykorzystywana przy przetwarzaniu formularza, aby zapobiec błędnym danym.

6. **Konfiguracja Całej Aplikacji:**
   - **config/config.js** zawiera niezbędne stałe i ustawienia (miejsca pracy, pojazdy, zakresy arkusza Google, ustawienia czasu), które są wykorzystywane przez wszystkie powyższe moduły.

7. **Rejestracja Komend:**
   - **deploy-commands.js** odpowiada za publikację i aktualizację komend slash na serwerze Discord, co jest krokiem niezbędnym przed uruchomieniem bota.

---

## Podsumowanie Flow:
1. **Start Aplikacji:**  
   - `index.js` inicjalizuje klienta Discord, ładuje zmienne środowiskowe, i ustawia zdarzenia nasłuchujące.
2. **Rejestracja Komend:**  
   - `deploy-commands.js` rejestruje komendy, takie jak `/raport` i `/edytuj_raport`.
3. **Tworzenie Raportu:**  
   - Użytkownik wywołuje `/raport`.
   - Formularz jest inicjowany w `raportDataStore.js` i interakcje są obsługiwane przez `raport.js`.
   - Po wypełnieniu formularza, aplikacja sprawdza (przez `googleSheets.znajdzRaportUzytkownika`) czy istnieje już raport z daną datą.
   - Użytkownik wybiera opcję: utworzenie nowego raportu lub podmiana istniejącego.
   - Raport zostaje zapisany w Google Sheets przez `googleSheets.dodajRaport` (z odpowiednim statusem) oraz wysłany do kanału głównego i prywatnego (przy pomocy `channelManager`).
4. **Edycja Raportu:**  
   - Użytkownik wywołuje `/edytuj_raport`, otrzymując instrukcje, jak edytować raport (obecnie plik wyświetla wyłącznie instrukcje).
5. **Obsługa Danych Tymczasowych:**  
   - `raportDataStore.js` przechowuje dane w trakcie edycji, umożliwiając aktualizację i czyszczenie (timeouty formularzy).
6. **Walidacja:**  
   - `timeValidation.js` sprawdza poprawność wprowadzonych czasów pracy.

---

To szczegółowe podsumowanie przedstawia pełen obraz działania aplikacji wraz z zależnościami między modułami oraz przepływem danych od inicjacji raportu do zapisu i komunikacji w Discord. Każdy moduł odpowiada za określony aspekt systemu – od interakcji użytkownika, poprzez zarządzanie danymi, aż po integrację z zewnętrznymi usługami (Google Sheets).

Mam nadzieję, że ten dokument dostarcza pełnej i precyzyjnej analizy, nie pomijając żadnej z kluczowych funkcji i zależności. 