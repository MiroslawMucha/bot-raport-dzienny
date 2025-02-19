// Moduł do integracji z Google Sheets API
const { google } = require('googleapis');
const path = require('path');
const { GOOGLE_SHEETS } = require('../config/config');
const { validateTime } = require('./timeValidation');

// Zmiana nazwy arkusza na prawidłową
const SHEET_NAME = 'Arkusz1';  // Zmiana z 'Raporty' na 'Arkusz1'
const SHEET_RANGE = 'A:I';     // Zmiana z A:J na A:I (9 kolumn)

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

            // Generuj ID raportu
            const reportId = this.generateReportId(raportData.username);

            // Przygotuj dane do zapisu
            const values = [[
                reportId,                        // ID raportu (Data)
                raportData.username,             // Pracownik
                raportData.miejscePracy,         // Miejsce pracy
                raportData.czasRozpoczecia,      // Czas rozpoczęcia
                raportData.czasZakonczenia,      // Czas zakończenia
                raportData.dieta ? 'Tak' : 'Nie',// Dieta
                raportData.osobyPracujace.join(', '), // Osoby pracujące
                raportData.auto,                 // Auto
                raportData.kierowca,             // Kierowca
                'Aktywny'                        // Status
            ]];

            // Zapisz do arkusza
            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            return true;
        } catch (error) {
            console.error('Błąd podczas zapisywania raportu:', error);
            return false;
        }
    }

    validateRaportData(data) {
        return data.username &&
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
                range: `${SHEET_NAME}!A${rowIndex}:I${rowIndex}`,
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

    // Generowanie ID raportu
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

    // Pobranie ostatnich raportów użytkownika (tylko z Arkusz1)
    async pobierzOstatnieRaportyUzytkownika(username, limit = 7) {
        if (!this.sheetsApi) await this.init();

        try {
            const response = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`
            });

            const rows = response.data.values || [];
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            return rows
                .filter(row => {
                    const [reportId] = row;
                    return reportId.includes(username) && 
                           new Date(reportId.split('-').slice(0,3).join('-')) >= sevenDaysAgo;
                })
                .slice(-limit)
                .map((row, index) => ({
                    id: row[0],
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

    // Przeniesienie raportu do historii i aktualizacja
    async aktualizujRaportZHistoria(raportId, noweData) {
        if (!this.sheetsApi) await this.init();

        try {
            // 1. Znajdź raport w Arkusz1
            const response = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => row[0] === raportId);
            
            if (rowIndex === -1) {
                throw new Error('Nie znaleziono raportu do edycji');
            }

            // 2. Skopiuj stary raport do historia_zmian
            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'historia_zmian!A:J',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [rows[rowIndex]]
                }
            });

            // 3. Aktualizuj raport w Arkusz1
            const editNumber = (raportId.match(/-edit(\d+)$/) || [null, 0])[1];
            const newEditNumber = parseInt(editNumber) + 1;
            const newId = raportId.replace(/-edit\d+$/, '') + `-edit${newEditNumber}`;

            const values = [[
                newId,
                noweData.pracownik,
                noweData.miejscePracy,
                noweData.czasRozpoczecia,
                noweData.czasZakonczenia,
                noweData.dieta ? 'Tak' : 'Nie',
                noweData.osobyPracujace.join(', '),
                noweData.auto,
                noweData.kierowca,
                `Edytowany [${new Date().toLocaleString('pl-PL')}]`
            ]];

            await this.sheetsApi.spreadsheets.values.update({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!A${rowIndex + 1}:J${rowIndex + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            return { success: true, newId };
        } catch (error) {
            console.error('Błąd podczas aktualizacji raportu:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new GoogleSheetsService(); 