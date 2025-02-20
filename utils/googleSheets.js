// Moduł do integracji z Google Sheets API
const { google } = require('googleapis');
const path = require('path');
const { GOOGLE_SHEETS } = require('../config/config');
const { validateTime } = require('./timeValidation');

// Zmiana nazwy arkusza na prawidłową
const SHEET_NAME = 'Arkusz1';  // Zmiana z 'Raporty' na 'Arkusz1'
const SHEET_RANGE = 'A:J';     // Zmiana z A:I na A:J (10 kolumn)

// Pomocnicza funkcja do generowania znacznika czasu
function getTimestamp() {
    return new Date().toLocaleString('pl-PL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

class GoogleSheetsService {
    constructor() {
        this.debugSearch = process.env.DEBUG_SEARCH === 'true';
        this.debugLogs = process.env.DEBUG_LOGS === 'true';
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
            const dateStr = now.toLocaleString('pl-PL', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).replace(/[\s,]/g, '-');

            return `${dateStr}-${username}`;
        } catch (error) {
            console.error('❌ Błąd podczas generowania ID:', error);
            throw error;
        }
    }

    // Dodawanie nowego raportu do arkusza
    async dodajRaport(raportData, isEdit = false) {
        if (this.writeLock) {
            console.debug('⏳ [SHEETS] Oczekiwanie na dostęp');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.dodajRaport(raportData, isEdit);
        }

        this.writeLock = true;
        try {
            if (!this.sheetsApi) await this.init();

            // Generujemy ID raportu
            const raportId = await this.generujNoweId(raportData.username);
            const timestamp = getTimestamp();
            
            // Przygotuj dane do zapisu
            const values = [[
                raportId,
                raportData.pracownik,
                raportData.miejscePracy,
                raportData.czasRozpoczecia,
                raportData.czasZakonczenia,
                raportData.dieta ? 'Tak' : 'Nie',
                raportData.osobyPracujace.join(', '),
                raportData.auto,
                raportData.kierowca,
                isEdit ? `Edytowany [${timestamp}]` : 'Aktywny' // Status z timestampem dla edycji
            ]];

            // Zapisz do arkusza
            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `${SHEET_NAME}!${SHEET_RANGE}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values }
            });

            console.log(`✅ [SHEETS] Zapisano raport: ${raportId}`);
            return true;
        } catch (error) {
            console.error(`❌ [SHEETS] Błąd zapisu: ${error.message}`);
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

    async znajdzRaportUzytkownika(username, dataRaportu) {
        if (!this.sheetsApi) await this.init();
        
        try {
            if (this.debugSearch) {
                console.log('🔍 [GOOGLE SHEETS] Szukam raportu:', {
                    username,
                    dataRaportu,
                });
            }

            const response = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Arkusz1!A:J'
            });

            const rows = response.data.values || [];
            
            if (this.debugSearch) {
                rows.forEach((row, index) => {
                    if (!row[0]) return;
                    const raportId = row[0];
                    const pracownik = row[1];
                    const dataZRaportu = row[3].split(' ')[0];
                    const usernameZId = raportId.split('-').pop();
                    console.debug(`🔍 [GOOGLE SHEETS] Wiersz ${index}:`, {
                        raportId, pracownik, dataZRaportu, usernameZId
                    });
                });
            }

            const znalezionyRaport = rows.find((row) => {
                if (!row[0] || !row[3]) return false;
                
                const usernameZId = row[0].split('-').pop();
                const dataZRaportu = row[3].split(' ')[0];
                
                const czyPasuje = usernameZId === username.toLowerCase().replace(/ /g, '_') && 
                                dataZRaportu === dataRaportu;
                
                if (this.debugSearch && czyPasuje) {
                    console.debug('✓ [GOOGLE SHEETS] Znaleziono dopasowanie:', {
                        dataZRaportu,
                        szukanaData: dataRaportu,
                        usernameZId,
                        szukanyUsername: username.toLowerCase().replace(/ /g, '_')
                    });
                }
                
                return czyPasuje;
            });

            if (this.debugSearch) {
                console.debug(`${znalezionyRaport ? '✅' : '❌'} [GOOGLE SHEETS] Wynik wyszukiwania: ${znalezionyRaport ? 'Znaleziono' : 'Nie znaleziono'}`);
            }
            
            return znalezionyRaport;
        } catch (error) {
            console.error('❌ Błąd podczas szukania raportu:', error);
            return null;
        }
    }

    async przeniesDoHistorii(raport) {
        if (!this.sheetsApi) await this.init();

        try {
            const timestamp = getTimestamp();
            
            // Znajdź indeks wiersza do usunięcia
            const response = await this.sheetsApi.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'Arkusz1!A:J'
            });

            const rows = response.data.values || [];
            const rowIndex = rows.findIndex(row => 
                row[1] === raport[1] && // pracownik
                row[3].split(' ')[0] === raport[3].split(' ')[0] // data
            );

            if (rowIndex === -1) {
                throw new Error('Nie znaleziono raportu do przeniesienia');
            }

            // Dodaj do arkusza historia_zmian
            await this.sheetsApi.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: 'historia_zmian!A:J',
                valueInputOption: 'USER_ENTERED',
                resource: { 
                    values: [[
                        ...raport.slice(0, -1), // wszystkie kolumny oprócz statusu
                        `Przeniesiony do historii [${timestamp}]` // nowy status z timestampem
                    ]] 
                }
            });

            // Usuń wiersz z Arkusz1
            await this.sheetsApi.spreadsheets.batchUpdate({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                resource: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: 0,
                                dimension: 'ROWS',
                                startIndex: rowIndex,
                                endIndex: rowIndex + 1
                            }
                        }
                    }]
                }
            });

            console.log(`✅ [GOOGLE SHEETS] Raport przeniesiony do historii: Pracownik ${raport[1]}, data ${raport[3]}`);
            return true;
        } catch (error) {
            console.error('❌ Błąd podczas przenoszenia do historii:', error);
            throw error;
        }
    }
}

module.exports = new GoogleSheetsService(); 