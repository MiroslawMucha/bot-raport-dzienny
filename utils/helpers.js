function getDisplayName(user) {
    // Dla obiektów user z Discord.js
    if (user.globalName || user.displayName || user.username) {
        return user.globalName || user.displayName || user.username;
    }
    
    // Dla danych z raportStore
    if (user.fullName) {
        return user.fullName;
    }
    
    // Dla danych z Google Sheets
    if (typeof user === 'string') {
        return user;
    }
    
    return 'Nieznany użytkownik';
}

module.exports = { getDisplayName }; 