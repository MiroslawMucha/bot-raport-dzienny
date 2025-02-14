# Instrukcja wdrożenia Bota Raport Dzienny

## 1. Struktura projektu
```
raport-dzienny-bot/
├── commands/
│   ├── raport.js
│   └── edytujRaport.js
├── utils/
│   ├── channelManager.js
│   ├── googleSheets.js
│   └── timeValidation.js
├── config/
│   └── config.js
├── .env
├── .gitignore
├── .eslintrc.json
├── credentials.json
├── deploy-commands.js
├── index.js
├── package.json
└── README.md
```

## 2. Kolejność tworzenia i konfiguracji plików

### 2.1. Pliki konfiguracyjne
1. Utwórz `package.json`:
```bash
npm init -y
```

2. Zainstaluj wymagane zależności:
```bash
npm install discord.js @discordjs/builders @discordjs/rest dotenv googleapis
```

3. Utwórz plik `.env` z następującą zawartością:
```env
TOKEN=twoj-token-bota
CLIENT_ID=id-twojej-aplikacji
GOOGLE_SHEET_ID=id-twojego-arkusza
KANAL_RAPORTY_ID=id-kanalu-raporty
ADMIN_ROLE_ID=id-roli-admin
PRIVATE_CATEGORY_ID=id-kategorii-prywatnych-kanalow
```

### 2.2. Pliki źródłowe
Kolejność tworzenia plików:

1. `config/config.js` - konfiguracja stałych wartości
2. `utils/timeValidation.js` - walidacja czasu
3. `utils/channelManager.js` - zarządzanie kanałami
4. `utils/googleSheets.js` - integracja z Google Sheets
5. `commands/raport.js` - komenda /raport
6. `commands/edytujRaport.js` - komenda /edytuj_raport
7. `deploy-commands.js` - rejestracja komend
8. `index.js` - główny plik bota

## 3. Konfiguracja Google Sheets

1. Utwórz arkusz Google Sheets z następującymi kolumnami:
```
A: Data
B: Pracownik
C: Miejsce pracy
D: Czas rozpoczęcia
E: Czas zakończenia
F: Dieta
G: Osoby pracujące
H: Auto
I: Kierowca
J: Status
```

2. Umieść plik `credentials.json` w głównym katalogu projektu

## 4. Konfiguracja Discord

1. W Discord Developer Portal:
   - Włącz intenty: SERVER_MEMBERS, MESSAGE_CONTENT
   - Skopiuj token bota i Client ID
   - Nadaj uprawnienia botowi:
     - Manage Channels
     - Read Messages
     - Send Messages
     - Manage Messages
     - Read Message History

2. Utwórz na serwerze:
   - Kanał #📋raporty-dzienne
   - Kategorię dla prywatnych kanałów
   - Rolę dla administracji

## 5. Uruchomienie

1. Sprawdź czy wszystkie ID w `.env` są poprawne
2. Zarejestruj komendy:
```bash
node deploy-commands.js
```

3. Uruchom bota:
```bash
node index.js
```

## 6. Weryfikacja działania

1. Sprawdź czy bot jest online
2. Przetestuj komendę `/raport`:
   - Czy tworzy się prywatny kanał
   - Czy raport zapisuje się w Google Sheets
   - Czy wiadomości pojawiają się na odpowiednich kanałach

3. Przetestuj komendę `/edytuj_raport`:
   - Czy pokazują się ostatnie raporty
   - Czy edycja jest możliwa
   - Czy zmiany są zapisywane w Google Sheets
   - Czy historia edycji jest widoczna

## 7. Rozwiązywanie problemów

Jeśli wystąpią błędy, sprawdź:
1. Logi konsoli Node.js
2. Uprawnienia bota na serwerze
3. Poprawność credentials.json
4. Dostęp do arkusza Google Sheets
5. Poprawność wszystkich ID w .env

## 8. Pliki do zweryfikowania

Sprawdź czy istnieją i są poprawnie skonfigurowane:
- [ ] package.json z odpowiednimi zależnościami
- [ ] .env z wszystkimi wymaganymi zmiennymi
- [ ] credentials.json z poprawnymi danymi
- [ ] Wszystkie pliki .js w odpowiednich katalogach
- [ ] Uprawnienia bota na serwerze Discord
- [ ] Dostęp do arkusza Google Sheets

## 9. Testowanie

Wykonaj następujące testy:
1. Utworzenie nowego raportu
2. Edycja istniejącego raportu
3. Sprawdzenie prywatnego kanału
4. Weryfikacja zapisów w Google Sheets
5. Sprawdzenie historii edycji na kanale raportów

## 10. Uwagi końcowe

- Bot wymaga Node.js w wersji 16.x lub wyższej
- Wszystkie intenty Discord muszą być włączone
- Service account Google musi mieć uprawnienia do edycji arkusza
- Kanały Discord muszą być utworzone przed uruchomieniem bota 