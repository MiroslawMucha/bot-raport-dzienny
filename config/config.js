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
    }
}; 