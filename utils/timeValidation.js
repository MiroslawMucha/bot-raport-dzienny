// Nowy plik z funkcjami walidacji czasu
function validateTime(startTime, endTime) {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    
    // Sprawdź czy czas zakończenia jest późniejszy niż rozpoczęcia
    if (end <= start) {
        return {
            valid: false,
            message: 'Czas zakończenia musi być późniejszy niż czas rozpoczęcia!'
        };
    }
    
    // Sprawdź czy czas pracy nie przekracza 24 godzin
    if (end - start > 24 * 60) {
        return {
            valid: false,
            message: 'Czas pracy nie może przekraczać 24 godzin!'
        };
    }
    
    return { valid: true };
}

module.exports = { validateTime }; 