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
        RANGE: 'Arkusz1!A:J',
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
        // Funkcja generująca godziny 00-23
        getGodziny: () => {
            return Array.from({ length: 24 }, (_, i) => ({
                label: `${String(i).padStart(2, '0')}:00`,
                value: String(i).padStart(2, '0')
            }));
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