require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    // ========= WL NORMAL =========
    new SlashCommandBuilder()
        .setName('wlpass')
        .setDescription('Aprobar whitelist de un usuario')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario a aprobar')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('wldenied')
        .setDescription('Denegar whitelist de un usuario')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario a denegar')
                .setRequired(true)
        ),

    // ========= WL DELICTIVA =========
    new SlashCommandBuilder()
        .setName('wdpass')
        .setDescription('Aprobar whitelist DELICTIVA')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario (WL delictiva)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('wddenied')
        .setDescription('Denegar whitelist DELICTIVA')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID del usuario (WL delictiva)')
                .setRequired(true)
        )

].map(cmd => cmd.toJSON());

// ⛔ Registro por GUILD (rápido, sin delay)
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('🚀 Registrando comandos (GUILD)...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('✅ Comandos registrados correctamente EN LA GUILD!');
    } catch (error) {
        console.error('❌ Error registrando comandos:', error);
    }
})();
