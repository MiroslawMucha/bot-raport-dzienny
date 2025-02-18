// Moduł do integracji z Google Sheets API
const { google } = require('googleapis');
const path = require('path');
const { GOOGLE_SHEETS } = require('../config/config');
const { validateTime } = require('./timeValidation');

// Zmiana nazwy arkusza na prawidłową
const SHEET_NAME = 'Arkusz1';  // Zmiana z 'Raporty' na 'Arkusz1'
const SHEET_RANGE = 'A:J';     // Zmiana z A:I na A:J (10 kolumn)

class GoogleSheetsService {
    constructor() {
        // Inicjalizacja klienta Google Sheets
        this.auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        this.sheetsApi = null;
        this.init();
    }

    // Inicjalizacja połączenia z API
    async init() {
        try {
            const authClient = await this.auth.getClient();
            this.sheetsApi = google.sheets({ version: 'v4', auth: authClient });
            console.log('Google Sheets API zainicjalizowane pomyślnie');
        } catch (error) {
            console.error('Błąd inicjalizacji Google Sheets API:', error);
            throw error;
        }
    }

    // Dodawanie nowego raportu do arkusza
    async dodajRaport(raportData) {
        try {
            if (!this.sheetsApi) {
                await this.init();
            }

            // Sprawdź wymagane pola
            if (!this.validateRaportData(raportData)) {
                throw new Error('Brakuje wymaganych danych w raporcie!');
            }

            // Przygotuj dane do zapisu w kolejności zgodnej z arkuszem
            const values = [[
                new Date().toISOString(),        // Data utworzenia
                raportData.pracownik,            // Pracownik (używamy pracownik zamiast username)
                raportData.miejscePracy,         // Miejsce pracy (dodane)
                raportData.czasRozpoczecia,      // Czas rozpoczęcia
                raportData.czasZakonczenia,      // Czas zakończenia
                raportData.dieta ? 'Tak' : 'Nie',// Dieta
                raportData.osobyPracujace.join(', '), // Osoby pracujące
                raportData.auto,                 // Auto
                raportData.kierowca,             // Kierowca
                'Aktywny'                        // Status
            ]];

            // Zapisz do arkusza
            const response = await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            });

            console.log('Raport zapisany pomyślnie:', response.data);
            return true;
        } catch (error) {
            console.error('Błąd podczas zapisywania raportu:', error);
            throw error;
        }
    }

    validateRaportData(data) {
        return data.pracownik &&           // Zmienione z username na pracownik
            data.miejscePracy &&           // Dodane
            data.czasRozpoczecia &&
            data.czasZakonczenia &&
            data.osobyPracujace?.length > 0 &&
            data.auto &&
            data.kierowca;
    }

    // Aktualizacja istniejącego raportu
    async aktualizujRaport(rowIndex, raportData) {
        if (!this.sheetsApi) await this.init();

        const values = [
            [
                raportData.data,                 // Data
                raportData.pracownik,            // Pracownik
                raportData.miejscePracy,         // Miejsce pracy (dodane)
                raportData.czasRozpoczecia,      // Czas rozpoczęcia
                raportData.czasZakonczenia,      // Czas zakończenia
                raportData.dieta ? 'Tak' : 'Nie',// Dieta
                raportData.osobyPracujace.join(', '), // Osoby pracujące
                raportData.auto,                 // Auto
                raportData.kierowca,             // Kierowca
                'Edytowany'                      // Status
            ]
        ];

        try {
            await this.sheetsApi.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex}:J${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            return true;
        } catch (error) {
            console.error('Błąd podczas aktualizacji arkusza:', error);
            return false;
        }
    }

    // Pobranie ostatnich raportów użytkownika
    async pobierzOstatnieRaporty(pracownik, limit = 3) {
        if (!this.sheetsApi) await this.init();

        try {
            const response = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: GOOGLE_SHEETS.RANGE
            });

            const rows = response.data.values || [];
            return rows
                .filter(row => row[1] === pracownik)
                .slice(-limit)
                .map((row, index) => ({
                    rowIndex: rows.indexOf(row) + 1,
                    data: row[0],
                    pracownik: row[1],
                    miejscePracy: row[2],
                    czasRozpoczecia: row[3],
                    czasZakonczenia: row[4],
                    dieta: row[5] === 'Tak',
                    osobyPracujace: row[6].split(', '),
                    auto: row[7],
                    kierowca: row[8],
                    status: row[9]
                }));
        } catch (error) {
            console.error('Błąd podczas pobierania raportów:', error);
            return [];
        }
    }
}

module.exports = new GoogleSheetsService(); 