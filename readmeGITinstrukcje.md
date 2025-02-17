# Instrukcja Git dla projektu Bot Raport Dzienny

## 0. Sytuacja wyjściowa - przeniesienie lokalnego projektu na GitHub

### 0.1. Stan obecny
- Projekt znajduje się lokalnie na komputerze
- Git nie jest zainstalowany
- Nie mamy konta na GitHub
- Mamy działający kod z plikami konfiguracyjnymi

### 0.2. Krok po kroku - przeniesienie projektu
1. Załóż konto na GitHub:
   - Wejdź na [GitHub.com](https://github.com)
   - Kliknij "Sign up"
   - Wypełnij formularz rejestracyjny
   - Potwierdź email

2. Przygotuj projekt przed przeniesieniem:
   ```bash
   # Utwórz kopię pliku .env
   cp .env .env.example
   # Usuń wrażliwe dane z .env.example
   
   # Utwórz kopię credentials.json
   cp credentials.json credentials.json.example
   # Usuń wrażliwe dane z credentials.json.example
   ```

3. Zainstaluj Git (instrukcja w sekcji 1.1)

4. **WAŻNE - Konfiguracja użytkownika Git:**
   ```bash
   # Skonfiguruj swoją tożsamość w Git (użyj tego samego emaila co na GitHub)
   git config --global user.name "TwojaNazwaUżytkownika"
   git config --global user.email "twoj.email@gmail.com"
   
   # Sprawdź czy konfiguracja się powiodła
   git config --list
   ```

5. Utwórz repozytorium na GitHub:
   - Zaloguj się na GitHub
   - Kliknij "+" w prawym górnym rogu
   - Wybierz "New repository"
   - Nazwa: "bot-raport-dzienny"
   - Opis: "Bot do raportowania dziennego na Discord"
   - Ustaw jako "Private"
   - Nie inicjalizuj z README
   - Kliknij "Create repository"

6. Przygotuj lokalny projekt:
   ```bash
   # Przejdź do katalogu projektu
   cd ścieżka/do/projektu

   # Zainicjuj Git
   git init

   # Jeśli pojawi się błąd z origin już istniejącym:
   git remote remove origin

   # Utwórz .gitignore przed pierwszym commitem
   echo "node_modules/" >> .gitignore
   echo ".env" >> .gitignore
   echo "credentials.json" >> .gitignore
   echo "*.log" >> .gitignore

   # Dodaj pliki do repozytorium
   git add .
   # Nie przejmuj się ostrzeżeniami o CRLF/LF - to normalne w Windows

   # Wykonaj pierwszy commit
   git commit -m "init: pierwszy commit"

   # Dodaj zdalne repozytorium
   git remote add origin https://github.com/TwojaNazwaUżytkownika/nazwa-repo.git

   # WAŻNE: Zmień nazwę głównej gałęzi na main
   git branch -M main

   # Wypchnij zmiany na GitHub
   git push -u origin main
   ```

7. Rozwiązywanie typowych problemów:
   - Jeśli pojawi się błąd "remote origin already exists":
     ```bash
     git remote remove origin
     git remote add origin https://github.com/TwojaNazwaUżytkownika/nazwa-repo.git
     ```
   
   - Jeśli pojawi się błąd "src refspec main does not match any":
     ```bash
     git branch -M main
     git push -u origin main
     ```

   - Jeśli Git prosi o hasło:
     1. Przejdź do GitHub → Settings → Developer settings → Personal access tokens
     2. Wygeneruj nowy token (classic)
     3. Zaznacz uprawnienia: `repo` (wszystkie)
     4. Użyj tego tokenu jako hasła przy pushowaniu

8. Weryfikacja po wysłaniu:
   ```bash
   # Sprawdź jakie pliki zostały wysłane
   git ls-tree -r main --name-only

   # Sprawdź status lokalnego repozytorium
   git status
   ```

9. Sprawdź czy NIE wysłano wrażliwych plików:
   - `.env`
   - `credentials.json`
   - `node_modules/`
   - pliki z hasłami i tokenami

10. Sprawdź repozytorium na GitHub:
    - Wejdź na https://github.com/TwojaNazwaUżytkownika/nazwa-repo
    - Upewnij się, że repo jest prywatne
    - Sprawdź czy wszystkie pliki się poprawnie przesłały
    - Zweryfikuj czy nie ma wrażliwych danych

8. Dodaj dokumentację:
   ```bash
   # Zaktualizuj README.md o informacje o instalacji
   git add README.md
   git commit -m "docs: dodanie instrukcji instalacji"
   git push
   ```

### 0.3. Pliki które NIE powinny trafić na GitHub
- `node_modules/` (folder)
- `.env` (plik z tokenami)
- `credentials.json` (dane uwierzytelniające Google)
- Pliki logów
- Lokalne pliki konfiguracyjne IDE

### 0.4. Pliki które POWINNY trafić na GitHub
- `.env.example` (szablon pliku .env)
- `credentials.json.example` (szablon credentials)
- Kod źródłowy (*.js)
- Dokumentacja (*.md)
- Pliki konfiguracyjne (package.json, .gitignore)
- Pliki pomocnicze (README.md, LICENSE)

### 0.5. Po przeniesieniu na GitHub
1. Zabezpiecz repozytorium:
   - Ustaw branch protection rules
   - Włącz dwuskładnikowe uwierzytelnianie
   - Dodaj współpracowników jeśli potrzebne

2. Skonfiguruj workflow:
   - Utwórz gałąź develop
   - Ustaw zasady mergowania
   - Skonfiguruj GitHub Actions jeśli potrzebne

## 1. Konfiguracja początkowa

### 1.1. Instalacja Git
1. Windows:
   - Pobierz instalator z [git-scm.com](https://git-scm.com/download/win)
   - Uruchom instalator
   - Wybierz opcje:
     - Git Bash
     - Git GUI
     - Git Credential Manager
     - Używaj Git z wiersza poleceń Windows

2. Linux:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install git

# Fedora
sudo dnf install git

# Arch Linux
sudo pacman -S git
```

### 1.2. Konfiguracja Git
```bash
# Ustaw nazwę użytkownika
git config --global user.name "Twoje Imię"

# Ustaw email
git config --global user.email "twoj.email@domena.pl"

# Ustaw domyślny edytor (np. VS Code)
git config --global core.editor "code --wait"

# Ustaw domyślną gałąź na main
git config --global init.defaultBranch main
```

## 2. Inicjalizacja projektu

### 2.1. Utworzenie nowego repozytorium
```bash
# Utwórz katalog projektu
mkdir bot-raport-dzienny
cd bot-raport-dzienny

# Zainicjuj repozytorium
git init
```

### 2.2. Konfiguracja .gitignore
1. Utwórz plik .gitignore:
```bash
touch .gitignore
```

2. Dodaj do niego wymagane wykluczenia:
```gitignore
# Środowisko Node.js
node_modules/
npm-debug.log
package-lock.json

# Zmienne środowiskowe
.env

# Dane uwierzytelniające
credentials.json

# Logi
*.log

# System
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
```

## 3. Organizacja branchy

### 3.1. Struktura gałęzi
```
main              # Główna gałąź produkcyjna
├── develop       # Gałąź rozwojowa
│   ├── feature/  # Gałęzie funkcjonalności
│   ├── bugfix/   # Gałęzie naprawy błędów
│   └── refactor/ # Gałęzie refaktoryzacji
└── hotfix/       # Pilne poprawki produkcyjne
```

### 3.2. Konwencje nazewnictwa
```
feature/nazwa-funkcjonalnosci
bugfix/nazwa-bledu
refactor/nazwa-modulu
hotfix/nazwa-poprawki
```

## 4. Workflow pracy

### 4.1. Tworzenie nowej funkcjonalności
```bash
# Zaktualizuj główną gałąź
git checkout main
git pull origin main

# Utwórz gałąź develop jeśli nie istnieje
git checkout -b develop
git push -u origin develop

# Utwórz gałąź funkcjonalności
git checkout -b feature/nazwa-funkcjonalnosci

# Pracuj nad funkcjonalnością
git add .
git commit -m "feat: opis zmian"

# Wypchnij zmiany
git push origin feature/nazwa-funkcjonalnosci
```

### 4.2. Konwencja commitów
```
feat: nowa funkcjonalność
fix: naprawa błędu
docs: aktualizacja dokumentacji
style: formatowanie kodu
refactor: refaktoryzacja kodu
test: dodanie testów
chore: aktualizacja zależności
```

## 5. Merge Requests

### 5.1. Przygotowanie MR
1. Sprawdź czystość kodu:
```bash
# Uruchom linter
npm run lint

# Uruchom testy
npm test
```

2. Zaktualizuj gałąź:
```bash
git checkout develop
git pull origin develop
git checkout feature/nazwa-funkcjonalnosci
git rebase develop
```

3. Rozwiąż konflikty jeśli występują

### 5.2. Opis MR
```markdown
## Opis zmian
Krótki opis wprowadzonych zmian

## Zmiany
- [ ] Zmiana 1
- [ ] Zmiana 2

## Testy
- [ ] Testy jednostkowe
- [ ] Testy manualne

## Uwagi
Dodatkowe informacje
```

## 6. Przydatne komendy

### 6.1. Podstawowe operacje
```bash
# Sprawdź status
git status

# Sprawdź historię
git log --oneline --graph

# Cofnij zmiany w pliku
git checkout -- nazwa-pliku

# Cofnij ostatni commit
git reset --soft HEAD^

# Usuń nieśledzone pliki
git clean -fd
```

### 6.2. Praca z branchami
```bash
# Lista branchy
git branch -a

# Przełącz branch
git checkout nazwa-brancha

# Usuń branch lokalnie
git branch -d nazwa-brancha

# Usuń branch zdalnie
git push origin --delete nazwa-brancha
```

### 6.3. Stash
```bash
# Zapisz zmiany w stash
git stash save "opis zmian"

# Lista stash
git stash list

# Przywróć ostatni stash
git stash pop

# Usuń stash
git stash drop stash@{0}
```

## 7. Rozwiązywanie problemów

### 7.1. Konflikty
1. Identyfikacja konfliktów:
```bash
git status
```

2. Rozwiązanie konfliktów:
   - Otwórz pliki z konfliktami
   - Znajdź znaczniki `<<<<<<<`, `=======`, `>>>>>>>`
   - Wybierz prawidłową wersję
   - Usuń znaczniki konfliktów

3. Zakończenie merge:
```bash
git add .
git commit -m "merge: rozwiązanie konfliktów"
```

### 7.2. Przywracanie zmian
```bash
# Przywróć do ostatniego commita
git reset --hard HEAD

# Przywróć do konkretnego commita
git reset --hard commit-hash

# Przywróć usunięty branch
git checkout -b nazwa-brancha commit-hash
```

## 8. Dobre praktyki

### 8.1. Commity
- Używaj konwencji commitów
- Pisz krótkie, jasne opisy
- Jeden commit = jedna zmiana
- Nie commituj plików konfiguracyjnych

### 8.2. Branching
- Regularnie aktualizuj branche
- Usuwaj nieużywane branche
- Nie pushuj bezpośrednio do main
- Używaj rebase zamiast merge gdy to możliwe

### 8.3. Code Review
- Sprawdzaj zmiany przed MR
- Używaj komentarzy w kodzie
- Testuj zmiany lokalnie
- Aktualizuj dokumentację

## 9. Bezpieczeństwo

### 9.1. Dane wrażliwe
- Nie commituj plików .env
- Nie commituj credentials.json
- Używaj zmiennych środowiskowych
- Regularnie rotuj tokeny

### 9.2. Backup
- Regularnie pushuj zmiany
- Twórz tagi dla wersji
- Backupuj lokalne repozytorium
- Dokumentuj zmiany w README 

## 11. Szybka instrukcja codzienna

### 11.1. Workflow: Cursor → Git → GitHub
```bash
# 1. Przed rozpoczęciem pracy
git pull origin main              # Pobierz najnowsze zmiany
git checkout -b feature/nazwa     # Utwórz nową gałąź dla zmian

# 2. Podczas pracy w Cursor
# Pracuj normalnie, zapisuj zmiany (Ctrl+S)

# 3. Po zakończeniu pracy
git status                        # Sprawdź zmienione pliki
git add .                         # Dodaj wszystkie zmiany
git commit -m "feat: opis zmian"  # Zapisz zmiany
git push origin feature/nazwa     # Wyślij na GitHub

# 4. Gdy feature jest gotowy
git checkout main                 # Przełącz na główną gałąź
git pull origin main             # Pobierz ewentualne zmiany
git merge feature/nazwa          # Połącz zmiany
git push origin main            # Wyślij na GitHub
```

### 11.2. Wdrożenie na serwer Ubuntu
```bash
# 1. Połącz się z serwerem
ssh root@...

# 2. Pierwsze wdrożenie
cd /var/www/                     # Przejdź do katalogu aplikacji
git clone [URL-repozytorium]     # Sklonuj repo
cd bot-raport-dzienny           # Wejdź do katalogu
npm install                      # Zainstaluj zależności
cp .env.example .env            # Skopiuj plik konfiguracyjny
# Edytuj .env i ustaw właściwe wartości
nano .env

# 3. Aktualizacja na serwerze
cd /var/www/bot-raport-dzienny  # Przejdź do katalogu
git pull origin main            # Pobierz zmiany
npm install                     # Aktualizuj zależności
pm2 restart bot-raport         # Zrestartuj bota (jeśli używasz PM2)

# 4. Sprawdzenie statusu
pm2 status                      # Sprawdź czy bot działa
pm2 logs bot-raport            # Zobacz logi
```

### 11.3. Przydatne skróty Git
```bash
# Sprawdzanie
git status                      # Stan repozytorium
git log --oneline              # Historia commitów
git diff                       # Zobacz zmiany

# Cofanie zmian
git checkout -- plik           # Cofnij zmiany w pliku
git reset --hard HEAD          # Cofnij wszystkie zmiany
git reset --soft HEAD^         # Cofnij ostatni commit

# Branche
git branch                     # Lista gałęzi
git checkout -b nazwa          # Nowa gałąź
git branch -d nazwa           # Usuń gałąź

# Synchronizacja
git fetch                      # Pobierz info o zmianach
git pull                       # Pobierz zmiany
git push                       # Wyślij zmiany
```

### 11.4. Rozwiązywanie problemów
```bash
# Konflikt podczas merge
git status                     # Zobacz konfliktujące pliki
# Edytuj pliki i rozwiąż konflikty
git add .                      # Dodaj rozwiązane pliki
git commit -m "merge: fix"     # Zatwierdź rozwiązanie

# Błędy push/pull
git fetch origin              # Odśwież stan zdalny
git reset --hard origin/main  # Synchronizuj z origin
git clean -fd                # Usuń nieśledzone pliki

# Problemy z autoryzacją
git config --list            # Sprawdź konfigurację
# Sprawdź/odnów token GitHub
```

### 11.5. Rozwiązywanie problemów z tokenami na serwerze
```bash
# 1. Sprawdź plik .env na serwerze
cd /var/www/bot-raport-dzienny
cat .env                        # Zobacz zawartość pliku

# 2. Jeśli token jest nieprawidłowy:
# a) Wygeneruj nowy token na Discord Developer Portal:
# - Przejdź do https://discord.com/developers/applications
# - Wybierz swoją aplikację
# - Zakładka "Bot"
# - Kliknij "Reset Token"
# - Skopiuj nowy token

# b) Edytuj plik .env na serwerze:
nano .env
# Zmień linię z TOKEN= na nowy token
# Ctrl+X, Y, Enter aby zapisać

# c) Zrestartuj bota:
pm2 restart bot-raport

# d) Sprawdź logi:
pm2 logs bot-raport

# 3. Jeśli problem nadal występuje:
# Sprawdź czy token w .env zgadza się z tym na Discord Developer Portal
pm2 stop bot-raport            # Zatrzymaj bota
pm2 start index.js --name bot-raport  # Uruchom ponownie
pm2 logs bot-raport            # Sprawdź logi

# 4. Dodatkowe sprawdzenie uprawnień:
ls -la .env                    # Sprawdź uprawnienia pliku
chown root:root .env           # Zmień właściciela jeśli potrzeba
chmod 600 .env                 # Ustaw bezpieczne uprawnienia
```

### 11.6. Ważne uwagi dotyczące tokenów
- Token bota Discord jest jak hasło - musi być chroniony
- Po wyciekach tokena należy go natychmiast zresetować
- Tokeny nie powinny być commitowane do repozytorium
- Po każdej zmianie tokena należy zrestartować bota
- Zawsze trzymaj kopię działającego tokena w bezpiecznym miejscu 
