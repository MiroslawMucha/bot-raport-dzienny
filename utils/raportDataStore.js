// Store do przechowywania danych raportów
const raportDataStore = new Map();
const locks = new Map(); // Dodajemy mapę blokad

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
        const TIMEOUT = 30 * 60 * 1000; // 30 minut
        const now = new Date();
        
        for (const [userId, report] of raportDataStore.entries()) {
            if (now - report.startTime > TIMEOUT) {
                raportDataStore.delete(userId);
                locks.delete(userId);
            }
        }
    }
};

module.exports = store; 