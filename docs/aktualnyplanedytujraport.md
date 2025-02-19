```markdown:docs/aktualnyplanedytujraport.md
# Plan i Dokumentacja Systemu Edycji Raportów

## 1. Struktura Danych

### 1.1 Format ID Raportu (kolumna Data)
```javascript
// Format podstawowy dla nowego raportu:
DD-MM-YYYY-HH:MM:SS-username
// np: 15-03-2024-14:30:45-jan_kowalski

// Format dla edytowanego raportu:
DD-MM-YYYY-HH:MM:SS-username-editX
// np: 15-03-2024-14:30:45-jan_kowalski-edit1
```

### 1.2 Struktura Arkuszy Google Sheets
Oba arkusze (`Arkusz1` i `historia_zmian`) mają identyczną strukturę:

```
A: Data (ID raportu)
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

## 2. Workflow Edycji Raportu

1. Użytkownik wywołuje `/edytuj_raport`
2. Bot wyświetla listę ostatnich 7 raportów użytkownika
3. Po wybraniu raportu:
   - Stary raport jest przenoszony do `historia_zmian`
   - Nowa wersja zapisywana jest w `Arkusz1` z nowym ID
4. Aktualizowane są kanały Discord:
   - Nowa wersja na kanale głównym
   - Informacja o aktualizacji na kanale prywatnym

## 3. Kluczowe Komponenty Kodu

### 3.1 Generowanie ID Raportu
```javascript
generateReportId(username, editNumber = null) {
    const now = new Date();
    const dateStr = now.toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/[\s,]/g, '-');
    
    const editSuffix = editNumber ? `-edit${editNumber}` : '';
    return `${dateStr}-${username}${editSuffix}`;
}
```

### 3.2 Pobieranie Raportów do Edycji
```javascript
async pobierzOstatnieRaportyUzytkownika(username, limit = 7) {
    // ... inicjalizacja
    return rows
        .filter(row => {
            const [reportId] = row;
            return reportId.includes(username) && 
                   new Date(reportId.split('-').slice(0,3).join('-')) >= sevenDaysAgo;
        })
        .slice(-limit)
        .map(row => ({
            id: row[0],
            pracownik: row[1],
            // ... mapowanie pozostałych pól
        }));
}
```

### 3.3 Aktualizacja Raportu z Historią
```javascript
async aktualizujRaportZHistoria(raportId, noweData) {
    // 1. Znajdź raport w Arkusz1
    // 2. Skopiuj do historia_zmian
    await this.sheetsApi.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'historia_zmian!A:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [staryRaport] }
    });
    
    // 3. Aktualizuj w Arkusz1
    const newId = generujNoweId(raportId);
    await this.sheetsApi.spreadsheets.values.update({
        // ... aktualizacja z nowym ID
    });
}
```

## 4. Zabezpieczenia i Walidacje

1. **Ograniczenia czasowe:**
   - Edycja możliwa tylko dla raportów z ostatnich 7 dni
   - Limit 7 ostatnich raportów w menu wyboru

2. **Walidacje użytkownika:**
   ```javascript
   // Sprawdzenie czy użytkownik edytuje własny raport
   if (!reportId.includes(interaction.user.username)) {
       return false;
   }
   ```

3. **Zabezpieczenia danych:**
   - Blokada edycji raportów z `historia_zmian`
   - Walidacja wszystkich pól przed zapisem
   - Rollback w przypadku błędów

## 5. Format Wiadomości Discord

### 5.1 Nowy Raport
```
📌 **RAPORT DZIENNY – ORYGINAŁ**
👷‍♂️ Pracownik: @Jan_Kowalski
// ... pozostałe pola
```

### 5.2 Edytowany Raport
```
🛠 **RAPORT DZIENNY – EDYCJA** 
(Oryginalny wpis: 15-03-2024-14:30:45-jan_kowalski)
👷‍♂️ Pracownik: @Jan_Kowalski
// ... pozostałe pola
```

## 6. Obsługa Błędów

1. **Walidacja danych:**
   ```javascript
   validateRaportData(data) {
       return data.username &&
           data.czasRozpoczecia &&
           data.czasZakonczenia &&
           // ... pozostałe walidacje
   }
   ```

2. **Komunikaty błędów:**
   - Brak raportów do edycji
   - Błąd aktualizacji
   - Timeout wyboru raportu (60 sekund)

## 7. Przyszłe Rozszerzenia

1. Panel administratora do przeglądania historii zmian
2. System powodów edycji
3. Statystyki edycji raportów
4. Automatyczne powiadomienia o edycjach dla administratorów
5. Możliwość przywracania poprzednich wersji raportu

## 8. Uwagi Techniczne

1. Wszystkie operacje na arkuszach są asynchroniczne
2. Używamy transakcyjnego podejścia do aktualizacji
3. Implementacja wzorca Singleton dla GoogleSheetsService
4. Reużywalność komponentów formularza z `raport.js`
```
