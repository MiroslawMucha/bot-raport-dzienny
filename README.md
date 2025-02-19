# Bot Raport Dzienny - Discord

## 1. Konfiguracja Discord Developer Portal

### 1.1. Tworzenie aplikacji
1. Przejdź do [Discord Developer Portal](https://discord.com/developers/applications)
2. Kliknij "New Application" i nazwij aplikację (np. "Raport Dzienny Bot")
3. Zapisz `CLIENT_ID` z zakładki "General Information"

### 1.2. Konfiguracja bota
1. Przejdź do zakładki "Bot"
2. Kliknij "Add Bot" → "Yes, do it!"
3. W sekcji "Privileged Gateway Intents" włącz:
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
   - PRESENCE INTENT
4. Kliknij "Reset Token" i zapisz nowy token bota (TOKEN do .env)
5. Wyłącz opcję "Public Bot" jeśli bot ma być prywatny

### 1.3. Dodawanie bota do serwera
1. Przejdź do zakładki "OAuth2" → "URL Generator"
2. Zaznacz uprawnienia (scopes):
   - `bot`
   - `applications.commands`
3. Zaznacz uprawnienia bota (bot permissions):
   - Manage Channels
   - Read Messages/View Channels
   - Send Messages
   - Manage Messages
   - Read Message History
   - Add Reactions
4. Skopiuj wygenerowany URL i otwórz w przeglądarce
5. Wybierz serwer i zatwierdź dodanie bota

## 2. Konfiguracja serwera Discord

### 2.1. Tworzenie kategorii i kanałów
1. Utwórz kategorię dla raportów (np. "📋 RAPORTY")
   - Kliknij PPM na kategorię → Kopiuj ID
   - Zapisz jako `PRIVATE_CATEGORY_ID` w .env
2. Utwórz kanał #📋raporty-dzienne
   - Kliknij PPM na kanał → Kopiuj ID
   - Zapisz jako `KANAL_RAPORTY_ID` w .env

### 2.2. Konfiguracja roli administratora
1. Przejdź do Ustawienia serwera → Role
2. Utwórz nową rolę (np. "Admin Raportów")
3. Nadaj uprawnienia:
   - View Channels
   - Manage Channels
   - Read Message History
4. Skopiuj ID roli (Ustawienia → Zaawansowane → Tryb dewelopera)
5. Zapisz jako `ADMIN_ROLE_ID` w .env

## 3. Plik .env
```env
# Token bota (z Discord Developer Portal → Bot → Reset Token)
TOKEN=twoj-token-bota

# ID aplikacji (z Discord Developer Portal → General Information)
CLIENT_ID=id-twojej-aplikacji

# ID arkusza Google (z URL arkusza)
GOOGLE_SHEET_ID=id-twojego-arkusza

# ID kanału raportów (PPM na kanał → Kopiuj ID)
KANAL_RAPORTY_ID=id-kanalu-raporty

# ID roli admina (PPM na rolę → Kopiuj ID)
ADMIN_ROLE_ID=id-roli-admin

# ID kategorii (PPM na kategorię → Kopiuj ID)
PRIVATE_CATEGORY_ID=id-kategorii-prywatnych-kanalow
```

## 4. Instalacja i uruchomienie

### 4.1. Wymagania
- Node.js w wersji 16.x lub wyższej
- npm (menedżer pakietów Node.js)
- Git (opcjonalnie)

### 4.2. Instalacja
```bash
# Klonowanie repozytorium (lub pobierz ZIP)
git clone [url-repozytorium]
cd raport-dzienny-bot

# Instalacja zależności
npm install

# Rejestracja komend slash
npm run deploy

# Uruchomienie bota
npm start
```

## 5. Weryfikacja działania

1. Bot powinien być online na serwerze
2. Komendy slash powinny być dostępne:
   - `/raport`
   - `/edytuj_raport`
3. Bot powinien automatycznie tworzyć kanały prywatne
4. Raporty powinny być zapisywane w Google Sheets

## 6. Rozwiązywanie problemów

### 6.1. Bot nie jest online
- Sprawdź token w .env
- Sprawdź logi konsoli
- Upewnij się, że intenty są włączone

### 6.2. Brak komend slash
- Uruchom ponownie `npm run deploy`
- Sprawdź czy bot ma uprawnienie `applications.commands`
- Poczekaj do 1 godziny na propagację komend

### 6.3. Problemy z kanałami
- Sprawdź czy ID kategorii jest poprawne
- Upewnij się, że bot ma uprawnienie `Manage Channels`
- Sprawdź uprawnienia roli administratora 