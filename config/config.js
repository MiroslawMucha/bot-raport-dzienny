// Plik konfiguracyjny zawierający stałe wartości i ustawienia
module.exports = {
    // Lista dostępnych miejsc pracy
    MIEJSCA_PRACY: [
        'SERWIS',
        'Nurzec-Stacja BUDOWA',
        'Gorlice BUDOWA',
        'Ludwin BUDOWA',
        'Wadowice BUDOWA',
        'Praca Na Bazie',
        'Biuro',
        'Inne'
    ],

    // Lista dostępnych pojazdów
    POJAZDY: [
        'Renault Master',
        'Opel Vivaro',
        'Citroen Jumpy Artur',
        'Citroen Jumpy Dariusz Lublin',
        'Fiat Scudo',
        'Citroen Berlingo',
        'WV Caddy',
        'WV Amarok',
        'Inne'
    ],

    // ID kanału dla raportów dziennych
    KANAL_RAPORTY_ID: 'ID_KANALU_RAPORTY',

    // Konfiguracja arkusza Google
    GOOGLE_SHEETS: {
        // Zakres komórek w arkuszu
        RANGE: 'Raporty!A:J',
        // Nazwy kolumn w arkuszu
        COLUMNS: [
            'Data',
            'Pracownik',
            'Miejsce pracy',
            'Czas rozpoczęcia',
            'Czas zakończenia',
            'Dieta',
            'Osoby pracujące',
            'Auto',
            'Kierowca',
            'Status'
        ]
    },

    // Dodajemy konfigurację dla czasu
    CZAS: {
        MINUTY: [
            { label: '00', value: '00' },
            { label: '30', value: '30' }
        ],
        // Funkcja generująca godziny rozpoczęcia (od 7:00)
        getGodzinyRozpoczecia: () => {
            // Najpierw dodajemy 7:00
            const godziny = [
                { label: '07:00', value: '07' }
            ];
            
            // Następnie dodajemy pozostałe godziny
            for (let i = 0; i < 24; i++) {
                const hour = i;
                if (hour !== 7) { // Pomijamy 7, bo już jest na początku
                    godziny.push({
                        label: `${String(hour).padStart(2, '0')}:00`,
                        value: String(hour).padStart(2, '0')
                    });
                }
            }
            return godziny;
        },
        // Funkcja generująca godziny zakończenia (od 15:00)
        getGodzinyZakonczenia: () => {
            // Najpierw dodajemy 15:00
            const godziny = [
                { label: '15:00', value: '15' }
            ];
            
            // Następnie dodajemy pozostałe godziny
            for (let i = 0; i < 24; i++) {
                const hour = i;
                if (hour !== 15) { // Pomijamy 15, bo już jest na początku
                    godziny.push({
                        label: `${String(hour).padStart(2, '0')}:00`,
                        value: String(hour).padStart(2, '0')
                    });
                }
            }
            return godziny;
        },
        // Funkcja generująca daty (dziś i 20 dni wstecz)
        getDaty: () => {
            const daty = [];
            for (let i = 0; i < 21; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const formattedDate = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
                daty.push({
                    label: i === 0 ? `Dzisiaj (${formattedDate})` : formattedDate,
                    value: formattedDate
                });
            }
            return daty;
        }
    }
}; 