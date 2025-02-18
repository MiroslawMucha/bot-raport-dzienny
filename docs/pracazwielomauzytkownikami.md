Dodam sekcję o użytych technikach i przykładach kodu do dokumentacji:

## Zastosowane Techniki i Wzorce

### 1. Singleton Store
Wykorzystano wzorzec Singleton do przechowywania stanu formularzy:

```javascript
class RaportDataStore {
    constructor() {
        this.store = new Map();
        this.locks = new Set();
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new RaportDataStore();
        }
        return this.instance;
    }
}
```

### 2. Kolejkowanie Operacji
Implementacja kolejki dla operacji na Google Sheets:

```javascript
class GoogleSheetsService {
    constructor() {
        this.writeQueue = [];
        this.processing = false;
    }

    async processQueue() {
        if (this.processing) return;
        this.processing = true;
        
        while (this.writeQueue.length > 0) {
            const task = this.writeQueue.shift();
            await task.operation();
        }
        
        this.processing = false;
    }
}
```

### 3. System Blokad
Mechanizm zapobiegający konfliktom:

```javascript
async acquireLock(userId) {
    if (this.locks.has(userId)) {
        throw new Error('Użytkownik ma już aktywny formularz');
    }
    this.locks.add(userId);
    return true;
}

async releaseLock(userId) {
    this.locks.delete(userId);
}
```

### 4. Walidacja Danych
Przykład walidacji formularza:

```javascript
validateForm(data) {
    return (
        data.miejscePracy && 
        data.auto && 
        data.osobyPracujace.length > 0 && 
        data.kierowca &&
        typeof data.dieta !== 'undefined' &&
        data.czasRozpoczecia && 
        data.czasZakonczenia
    );
}
```

### 5. Automatyczne Czyszczenie
- Nieaktywne formularze są automatycznie usuwane
- Przeterminowane formularze są czyszczone co 10 minut
- Blokady są zwalniane po wygaśnięciu formularza (5 minut)

### 6. Event Emitter
Wykorzystanie systemu eventów do komunikacji:

```javascript
const EventEmitter = require('events');
const eventBus = new EventEmitter();

// Nasłuchiwanie zdarzeń
eventBus.on('formSubmitted', async (data) => {
    console.log('📝 Formularz wysłany:', data);
    await googleSheets.dodajRaport(data);
});

// Emitowanie zdarzeń
eventBus.emit('formSubmitted', formData);
```

## Użyte Biblioteki i Narzędzia

1. **discord.js** - interakcja z Discord API
2. **Google Sheets API** - zapis i odczyt danych
3. **Node.js Events** - system eventów
4. **Map i Set** - przechowywanie danych i blokad
5. **Promise** - obsługa asynchroniczności
6. **setInterval** - automatyczne czyszczenie

## Metryki i Limity

```javascript
const LIMITS = {
    MAX_CONCURRENT_FORMS: 10,    // Maksymalna liczba formularzy
    FORM_TIMEOUT: 300000,        // Timeout formularza (5 minut)
    CLEANUP_INTERVAL: 120000,    // Interwał czyszczenia (2 minuty)
    MAX_USERS_PER_FORM: 25,      // Maksymalna liczba użytkowników w formularzu
    HISTORY_LIMIT: 3             // Limit historii raportów do edycji
};
```

## Przykłady Implementacji

Referencje do kodu źródłowego:

1. Obsługa komend:
```javascript:commands/raport.js
startLine: 15
endLine: 39
```

2. Integracja z Google Sheets:
```javascript:utils/googleSheets.js
startLine: 57
endLine: 69
```

3. Edycja raportów:
```javascript:commands/edytujRaport.js
startLine: 61
endLine: 120
```

4. Konfiguracja stałych:
```javascript:config/config.js
startLine: 2
endLine: 48
```

## Uwagi Implementacyjne

1. Wszystkie operacje na danych są asynchroniczne
2. Wykorzystano system blokad do zapobiegania konfliktom
3. Implementacja wzorca Singleton dla store'a
4. Automatyczne czyszczenie nieaktywnych formularzy
5. Szczegółowe logowanie operacji
6. Walidacja danych przed zapisem

## Mechanizmy Bezpieczeństwa

### 2. Automatyczne Czyszczenie
- Nieaktywne formularze są automatycznie usuwane
- Przeterminowane formularze są czyszczone co 10 minut
- Blokady są zwalniane po wygaśnięciu formularza (5 minut)

## Ograniczenia i Uwagi
1. Maksymalnie 10 jednoczesnych formularzy
2. Każdy formularz ważny przez 5 minut
3. Automatyczne czyszczenie co 10 minut
4. Jeden użytkownik może mieć tylko jeden aktywny formularz
5. Wszystkie operacje są logowane dla celów debugowania
