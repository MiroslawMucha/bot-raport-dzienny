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
        this.writeQueue = []; // Kolejka zapisów
        this.processing = false;
        this.writeLock = false;
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

    // Dodajemy kolejkowanie zapisów
    async processWriteQueue() {
        if (this.processing) return;
        this.processing = true;

        while (this.writeQueue.length > 0) {
            const { operation, resolve, reject } = this.writeQueue.shift();
            try {
                const result = await operation();
                resolve(result);
            } catch (error) {
                reject(error);
            }
            // Dodajemy małe opóźnienie między operacjami
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.processing = false;
    }

    async generujNoweId(username) {
        try {
            const now = new Date();
            
            // Format: YYYY-MM-DD--HH:MM:SS--username
            const dateStr = now.toLocaleString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/[\s,]/g, '--');  // Zamieniamy spacje i przecinki na --

            console.log('🕒 Generowanie ID raportu:', {
                czas: dateStr,
                strefa: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

            return `${dateStr}--${username}`;
        } catch (error) {
            console.error('❌ Błąd podczas generowania ID:', error);
            throw error;
        }
    }

    // Dodawanie nowego raportu do arkusza
    async dodajRaport(raportData) {
        if (this.writeLock) {
            console.log('⏳ Czekam na zwolnienie blokady zapisu...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.dodajRaport(raportData);
        }

        this.writeLock = true;
        try {
            if (!this.sheetsApi) await this.init();

            // Generujemy ID raportu
            const raportId = await this.generujNoweId(raportData.username);
            
            // Przygotuj dane do zapisu
            const values = [[
                raportId,                               // ID raportu (np. 2024-03-15--14:30:45--john_doe)
                raportData.pracownik,                   // Pracownik
                raportData.miejscePracy,                // Miejsce pracy
                raportData.czasRozpoczecia,             // Czas rozpoczęcia
                raportData.czasZakonczenia,             // Czas zakończenia
                raportData.dieta ? 'Tak' : 'Nie',       // Dieta
                raportData.osobyPracujace.join(', '),   // Osoby pracujące
                raportData.auto,                        // Auto
                raportData.kierowca,                    // Kierowca
                'Aktywny'                               // Status
            ]];

            // Zapisz do arkusza
            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            console.log(`✅ Dodano raport ID: ${raportId}`);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas dodawania raportu:', error);
            return false;
        } finally {
            this.writeLock = false;
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
        return new Promise((resolve, reject) => {
            this.writeQueue.push({
                operation: async () => {
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
                },
                resolve,
                reject
            });
            this.processWriteQueue();
        });
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