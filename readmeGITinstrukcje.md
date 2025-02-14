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
   git config --global user.name "MiroslawMucha"
   git config --global user.email "budowaumuchy@gmail.com"
   
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
   cd ścieżka/do/bot-raport-dzienny

   # Zainicjuj Git
   git init

   # Utwórz .gitignore przed pierwszym commitem
   echo "node_modules/" >> .gitignore
   echo ".env" >> .gitignore
   echo "credentials.json" >> .gitignore
   echo "*.log" >> .gitignore

   # Dodaj pliki do repozytorium
   git add .

   # Wykonaj pierwszy commit
   git commit -m "init: pierwszy commit"

   # Dodaj zdalne repozytorium
   git remote add origin https://github.com/MiroslawMucha/bot-raport-dzienny.git

   # Ustaw główną gałąź
   git branch -M main

   # Wypchnij zmiany na GitHub
   git push -u origin main
   ```

7. Sprawdź czy wszystko się przeniosło:
   - Otwórz GitHub w przeglądarce
   - Sprawdź czy pliki się pojawiły
   - Upewnij się, że wrażliwe dane nie zostały wysłane

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