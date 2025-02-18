# Plan Wdrożenia Systemu Edycji Raportów

## Faza 1: Przygotowanie Infrastruktury

### 1.1 Wykorzystanie Istniejącej Struktury
```javascript
// Używamy istniejącej kolumny Data jako ID raportu
// Format: DD-MM-YYYY-HH:MM:SS-username
// Przykład: 15-03-2024-14:30:45-jan_kowalski

const EXISTING_COLUMNS = [
    'Data',                // Służy jako ID raportu
    'Status',              // (Aktywny/Edytowany)
    'Pracownik',
    // ... pozostałe istniejące kolumny
];
```

### 1.2 Utworzenie Arkusza Historii
```javascript
// Struktura arkusza historii (nowy arkusz)
const HISTORY_COLUMNS = [
    'ID_Oryginalnego_Raportu', // Link do kolumny Data z głównego arkusza
    'Data_Edycji',
    'Edytujacy',
    'Zmienione_Pola',
    'Poprzednie_Wartosci',
    'Nowe_Wartosci'
];
```

## Faza 2: Rozszerzenie Kodu

### 2.1 Modyfikacja GoogleSheetsService
```javascript
class GoogleSheetsService {
    // Wykorzystujemy istniejącą metodę generowania ID
    async getEditableReports(username, daysBack = 7) {
        // Pobieranie raportów do edycji używając istniejącego ID (kolumna Data)
        const reports = await this.sheetsApi.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: `${SHEET_NAME}!A:J`
        });
        
        // Filtrowanie po dacie i użytkowniku
        return reports.data.values
            .filter(row => {
                const reportDate = new Date(row[0].split('-').slice(0,3).join('-'));
                const daysAgo = (new Date() - reportDate) / (1000 * 60 * 60 * 24);
                return daysAgo <= 7 && row[0].includes(username);
            });
    }
}
```

### 2.2 Aktualizacja RaportDataStore
```javascript
// Nowe funkcje w store
const editStore = {
    activeEdits: new Map(),
    editHistory: new Map(),
    
    startEdit(userId, raportId) {
        // Rozpoczęcie sesji edycji
    }
};
```

## Faza 3: Implementacja Krok po Kroku

### 3.1 Tydzień 1: Podstawowa Struktura
1. Utworzenie nowych arkuszy
2. Dodanie kolumn ID i statusu
3. Implementacja pobierania raportów

### 3.2 Tydzień 2: System Edycji
1. Implementacja formularza edycji
2. System walidacji zmian
3. Mechanizm zapisywania historii

### 3.3 Tydzień 3: Interfejs i Testowanie
1. Interfejs użytkownika Discord
2. Testy jednostkowe
3. Testy integracyjne

## Faza 4: Bezpieczeństwo i Walidacja

### 4.1 Mechanizmy Bezpieczeństwa
```javascript
// Przykład walidacji uprawnień
async function validateEditPermissions(userId, raportId) {
    const raport = await getRaportById(raportId);
    const daysSinceCreation = getDaysDifference(raport.createdAt);
    
    return {
        canEdit: daysSinceCreation <= 7 && raport.authorId === userId,
        reason: daysSinceCreation > 7 ? 'Raport zbyt stary' : 'Brak uprawnień'
    };
}
```

### 4.2 System Logowania
```javascript
// Struktura logów edycji
const editLog = {
    timestamp: new Date(),
    userId: 'user123',
    action: 'EDIT_START',
    raportId: 'RAP123',
    details: {...}
};
```

## Faza 5: Testowanie i Wdrożenie

### 5.1 Plan Testów
1. Testy jednostkowe (każda nowa funkcja)
2. Testy integracyjne (cały proces edycji)
3. Testy wydajnościowe (równoczesne edycje)
4. Testy użytkownika (interfejs Discord)

### 5.2 Scenariusze Testowe
```javascript
// Przykładowe scenariusze
const testScenarios = [
    {
        name: 'Edycja własnego raportu (< 7 dni)',
        expected: 'success'
    },
    {
        name: 'Próba edycji starego raportu',
        expected: 'error'
    },
    {
        name: 'Równoczesne edycje',
        expected: 'queue'
    }
];
```

### 5.3 Harmonogram Wdrożenia
1. **Dzień 1-2:** Przygotowanie arkuszy
2. **Dzień 3-5:** Implementacja podstawowych funkcji
3. **Dzień 6-7:** Testy i poprawki
4. **Dzień 8:** Wdrożenie produkcyjne
5. **Dzień 9-10:** Monitoring i wsparcie

## Faza 6: Dokumentacja

### 6.1 Dokumentacja Techniczna
- Opis architektury
- Specyfikacja API
- Procedury backupu
- Procedury recovery

### 6.2 Dokumentacja Użytkownika
- Instrukcja użycia
- FAQ
- Znane problemy
- Kontakt wsparcia 