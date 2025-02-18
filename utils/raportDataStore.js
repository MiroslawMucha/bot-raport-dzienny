// Store do przechowywania danych raportów
const raportDataStore = new Map();
const locks = new Map(); // Dodajemy mapę blokad

// Stała określająca czas ważności formularza (5 minut)
const FORM_TIMEOUT = 5 * 60 * 1000;

// Funkcje pomocnicze do zarządzania danymi
const store = {
    // Inicjalizacja nowego raportu
    initReport: (userId, userData) => {
        if (locks.has(userId)) {
            throw new Error('Użytkownik już wypełnia formularz');
        }
        locks.set(userId, true);
        
        const newReport = {
            userId,
            username: userData.username,
            displayName: userData.displayName,
            globalName: userData.globalName,
            fullName: userData.fullName,
            miejscePracy: '',
            czasRozpoczecia: '',
            czasZakonczenia: '',
            dieta: false,
            osobyPracujace: [],
            auto: '',
            kierowca: '',
            startTime: new Date() // Dodajemy czas rozpoczęcia
        };
        raportDataStore.set(userId, newReport);
        return newReport;
    },

    // Pobranie danych raportu
    getReport: (userId) => {
        return raportDataStore.get(userId);
    },

    // Aktualizacja danych raportu
    updateReport: (userId, data) => {
        const currentReport = raportDataStore.get(userId);
        if (currentReport) {
            raportDataStore.set(userId, { ...currentReport, ...data });
        }
        return raportDataStore.get(userId);
    },

    // Usunięcie raportu
    deleteReport: (userId) => {
        raportDataStore.delete(userId);
        locks.delete(userId); // Zwalniamy blokadę
    },

    // Dodajemy timeout dla nieukończonych formularzy
    cleanupStaleReports: () => {
        const now = new Date();
        
        for (const [userId, report] of raportDataStore.entries()) {
            if (now - report.startTime > FORM_TIMEOUT) {
                console.log(`Usuwanie przeterminowanego formularza użytkownika ${report.username}`);
                raportDataStore.delete(userId);
                locks.delete(userId);
            }
        }
    },

    // Sprawdzenie czy użytkownik ma aktywny formularz
    hasActiveReport: (userId) => {
        const report = raportDataStore.get(userId);
        if (!report) return false;

        // Sprawdź czy formularz nie wygasł
        const now = new Date();
        if (now - report.startTime > FORM_TIMEOUT) {
            // Jeśli wygasł, usuń go
            store.deleteReport(userId);
            return false;
        }

        return true;
    },

    // Wymuszony reset formularza
    resetReport: (userId) => {
        store.deleteReport(userId);
    }
};

// Uruchamiamy czyszczenie co minutę
setInterval(() => {
    store.cleanupStaleReports();
}, 60 * 1000); // Co minutę

module.exports = store; 