# Konfiguracja Google Sheets dla Bota Raport Dzienny

## 1. Utworzenie projektu w Google Cloud

### 1.1. Utworzenie nowego projektu
1. Przejdź do [Google Cloud Console](https://console.cloud.google.com)
2. Kliknij na listę projektów w górnym pasku
3. Kliknij "Nowy projekt"
4. Nazwij projekt (np. "Bot Raport Dzienny")
5. Kliknij "Utwórz"

### 1.2. Włączenie Google Sheets API
1. W menu bocznym wybierz "APIs & Services" → "Library"
2. Wyszukaj "Google Sheets API"
3. Kliknij "Enable"

## 2. Konfiguracja uwierzytelniania

### 2.1. Utworzenie Service Account
1. W menu bocznym wybierz "APIs & Services" → "Credentials"
2. Kliknij "Create Credentials" → "Service Account"
3. Wypełnij formularz:
   - Name: "Bot Raport Dzienny"
   - ID: zostaw domyślne lub wybierz własne
   - Description: opcjonalny opis
4. Kliknij "Create and Continue"
5. W kroku "Grant access to project":
   - Role: "Editor"
   - Kliknij "Continue"
6. Kliknij "Done"

### 2.2. Pobranie credentials.json
1. Na liście Service Accounts kliknij utworzone konto
2. Przejdź do zakładki "Keys"
3. Kliknij "Add Key" → "Create new key"
4. Wybierz format "JSON"
5. Kliknij "Create"
6. Plik zostanie automatycznie pobrany
7. Zmień nazwę pliku na `credentials.json`
8. Przenieś plik do głównego katalogu projektu bota

## 3. Utworzenie i konfiguracja arkusza Google Sheets

### 3.1. Utworzenie arkusza
1. Przejdź do [Google Sheets](https://sheets.google.com)
2. Utwórz nowy arkusz
3. Nazwij arkusz (np. "Raporty Dzienne")

### 3.2. Konfiguracja kolumn
1. W pierwszym wierszu utwórz nagłówki:
```
A  | B         | C             | D                | E                | F      | G               | H     | I         | J
---|-----------| ------------- | ---------------- | ---------------- | ------ | --------------- | ----- | --------- | -------
Data|Pracownik  |Miejsce pracy  |Czas rozpoczęcia  |Czas zakończenia  |Dieta   |Osoby pracujące  |Auto   |Kierowca   |Status
```

2. Sformatuj nagłówki:
   - Pogrubiona czcionka
   - Wyśrodkowanie
   - Zamrożenie pierwszego wiersza (Widok → Zamroź → 1 wiersz)

### 3.3. Udostępnianie arkusza
1. Skopiuj adres email Service Account:
   - Otwórz `credentials.json`
   - Znajdź wartość `client_email`
2. W Google Sheets:
   - Kliknij "Udostępnij" (prawy górny róg)
   - Wklej adres email Service Account
   - Ustaw uprawnienia na "Edytor"
   - Odznacz "Powiadom osoby"
   - Kliknij "Wyślij"

### 3.4. Pobranie ID arkusza
1. Z URL arkusza skopiuj ID:
```
https://docs.google.com/spreadsheets/d/[TO-JEST-ID-ARKUSZA]/edit
```
2. Zapisz ID w pliku `.env` jako `GOOGLE_SHEET_ID`

## 4. Weryfikacja konfiguracji

### 4.1. Sprawdzenie uprawnień
1. Upewnij się, że:
   - Google Sheets API jest włączone
   - Service Account ma rolę Editor
   - Arkusz jest udostępniony dla Service Account
   - Plik credentials.json jest w głównym katalogu projektu

### 4.2. Format danych
Bot będzie zapisywał dane w następującym formacie:
```
Data         : YYYY-MM-DD HH:mm:ss
Pracownik    : Nazwa użytkownika Discord
Miejsce pracy: Tekst
Czas rozpocz.: HH:mm
Czas zakończ.: HH:mm
Dieta        : Tak/Nie
Osoby prac.  : Lista oddzielona przecinkami
Auto         : Tekst
Kierowca     : Nazwa użytkownika
Status       : Aktywny/Edytowany
```

## 5. Rozwiązywanie problemów

### 5.1. Błędy autoryzacji
- Sprawdź czy credentials.json jest poprawny
- Upewnij się, że Service Account ma uprawnienia do arkusza
- Zweryfikuj czy ID arkusza jest prawidłowe

### 5.2. Błędy zapisu
- Sprawdź format danych
- Upewnij się, że arkusz nie jest chroniony
- Zweryfikuj uprawnienia do edycji

### 5.3. Problemy z dostępem
- Sprawdź czy Google Sheets API jest włączone
- Zweryfikuj czy projekt w Google Cloud jest aktywny
- Upewnij się, że Service Account nie jest zablokowane 