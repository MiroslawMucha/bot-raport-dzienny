// Komenda /edytuj_raport do edycji istniejących raportów
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edytuj_raport')
        .setDescription('Informacja jak edytować raporty'),

    async execute(interaction) {
        const instructionMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 **JAK EDYTOWAĆ RAPORT?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aby edytować raport, wykonaj następujące kroki:

1️⃣ Użyj komendy \`/raport\` i wypełnij formularz z nowymi danymi

2️⃣ Jeśli istnieje już raport z tą samą datą, zobaczysz dwie opcje:
   ✅ "Wyślij jako nowy" - utworzy nowy raport
   🔄 "Podmień istniejący" - zaktualizuje istniejący raport

3️⃣ Po wybraniu "Podmień istniejący":
   • Stary raport zostanie przeniesiony do historii
   • Nowy raport zastąpi poprzedni
   • Otrzymasz powiadomienie o aktualizacji

⚠️ **Ważne informacje:**
• Edytować można tylko własne raporty
• Stare raporty są zachowywane w historii zmian
• Każda edycja jest oznaczona odpowiednim statusem i timestampem

💡 **Wskazówka:**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

        await interaction.reply({
            content: instructionMessage,
            ephemeral: true
        });
    }
}; 