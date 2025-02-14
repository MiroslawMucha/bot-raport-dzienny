// Moduł do integracji z Google Sheets API
const { google } = require('googleapis');
const path = require('path');
const { GOOGLE_SHEETS } = require('../config/config');
const { validateTime } = require('./timeValidation');

class GoogleSheetsService {
    constructor() {
        // Inicjalizacja klienta Google Sheets
        this.auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        this.sheetsApi = null;
    }

    // Inicjalizacja połączenia z API
    async init() {
        const authClient = await this.auth.getClient();
        this.sheetsApi = google.sheets({ version: 'v4', auth: authClient });
    }

    // Dodawanie nowego raportu do arkusza
    async dodajRaport(raportData) {
        try {
            if (!this.sheetsApi) await this.init();
            
            // Walidacja danych przed zapisem
            if (!raportData.miejscePracy || !raportData.czasRozpoczecia || !raportData.czasZakonczenia) {
                throw new Error('Brakuje wymaganych danych w raporcie!');
            }
            
            // Walidacja czasu
            const timeValidation = validateTime(raportData.czasRozpoczecia, raportData.czasZakonczenia);
            if (!timeValidation.valid) {
                throw new Error(timeValidation.message);
            }
            
            const values = [
                [
                    new Date().toISOString(),
                    raportData.pracownik,
                    raportData.miejscePracy,
                    raportData.czasRozpoczecia,
                    raportData.czasZakonczenia,
                    raportData.dieta ? 'Tak' : 'Nie',
                    raportData.osobyPracujace.join(', '),
                    raportData.auto,
                    raportData.kierowca,
                    'Aktywny'
                ]
            ];

            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: GOOGLE_SHEETS.RANGE,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });
            return true;
        } catch (error) {
            console.error('Błąd podczas zapisywania raportu:', error);
            throw error;
        }
    }

    // Aktualizacja istniejącego raportu
    async aktualizujRaport(rowIndex, raportData) {
        if (!this.sheetsApi) await this.init();

        const values = [
            [
                raportData.data,
                raportData.pracownik,
                raportData.miejscePracy,
                raportData.czasRozpoczecia,
                raportData.czasZakonczenia,
                raportData.dieta ? 'Tak' : 'Nie',
                raportData.osobyPracujace.join(', '),
                raportData.auto,
                raportData.kierowca,
                'Edytowany'
            ]
        ];

        try {
            await this.sheetsApi.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${GOOGLE_SHEETS.RANGE}!A${rowIndex}`,
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