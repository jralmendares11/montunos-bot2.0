// ================== CONFIG & IMPORTS ==================
require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// ================== KEEP ALIVE SERVER ==================
const http = require("http");

const PORT = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  })
  .listen(PORT, () => {
    console.log(`Servidor HTTP keep-alive activo en puerto ${PORT}`);
  });

// ================== ENV & CONSTANTES ==================
const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const ROLE_WHITELIST = process.env.ROLE_WHITELIST_ID;
const ROLE_DENIED = process.env.ROLE_DENIED_ID;

const PUBLIC_CHANNEL = process.env.PUBLIC_CHANNEL_ID;
const LOG_CHANNEL    = process.env.LOG_CHANNEL_ID;

// ================== READY ==================
client.once("ready", async () => {
  console.log("=========== EVENTO READY ===========");
  console.log(`Bot iniciado como ${client.user.tag}`);
  console.log("DEBUG GUILD_ID:", GUILD_ID);
  console.log("DEBUG PUBLIC_CHANNEL:", PUBLIC_CHANNEL);
  console.log("DEBUG LOG_CHANNEL:", LOG_CHANNEL);

  // ---------- Registro de slash commands ----------
  const commands = [
    new SlashCommandBuilder()
      .setName("wlpass")
      .setDescription("Aprobar whitelist")
      .addStringOption(option =>
        option.setName("id")
          .setDescription("ID del usuario")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("wldenied")
      .setDescription("Denegar whitelist")
      .addStringOption(option =>
        option.setName("id")
          .setDescription("ID del usuario")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Intentando registrar comandos en GUILD:", GUILD_ID);
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log("✔️ Comandos registrados correctamente");
  } catch (error) {
    console.error("❌ Error registrando comandos:", error);
  }

  console.log("=========== READY COMPLETADO ===========");
});

// ================== LÓGICA DE COMANDOS ==================
client.on("interactionCreate", async (interaction) => {

  if (!interaction.isChatInputCommand()) return;

  console.log("interactionCreate:", {
    command: interaction.commandName,
    channelId: interaction.channelId,
    user: interaction.user?.id
  });

  // 🔒 Solo permitir los comandos en el canal de LOGS
  if (interaction.channelId !== LOG_CHANNEL) {
    try {
      await interaction.reply({
        content: "❌ Este comando solo se puede usar en el canal configurado para WL.",
        flags: 64
      });
    } catch (e) {
      console.error("Error al responder por canal incorrecto:", e);
    }
    return;
  }

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);
    const userId = interaction.options.getString("id");

    if (!guild) {
      console.error("❌ No se encontró el guild desde interaction.");
      await interaction.reply({
        content: "❌ Error interno: no se encontró el servidor.",
        flags: 64
      }).catch(() => {});
      return;
    }

    // Respuesta diferida (para evitar "La aplicación no respondió")
    await interaction.deferReply({ flags: 64 });

    const member = await guild.members.fetch(userId).catch(() => null);

    if (!member) {
      console.log("No encontré al miembro con ID:", userId);
      await interaction.editReply({
        content: "❌ No encontré ese usuario en el servidor."
      });
      return;
    }

    // ========= WL APROBADA =========
    if (interaction.commandName === "wlpass") {
      try {
        console.log("Ejecutando /wlpass para:", userId);
        await member.roles.add(ROLE_WHITELIST);

        // LOG STAFF (mismo canal donde se ejecuta)
        const logChannel = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (logChannel) {
          logChannel.send(
            `🟢 <@${interaction.user.id}> aprobó una WL → <@${userId}>`
          ).catch(console.error);
        }

        // CANAL PÚBLICO (mensaje bonito + GIF)
        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴀᴘʀᴏʙᴀᴅᴀ <@${userId}> — **ᴀsɪ́ sɪ́, Bienvenido Montuno. ғᴏʀᴍᴜʟᴀʀɪᴏ ʟɪᴍᴘɪᴏ. ᴀᴅᴇʟᴀɴᴛᴇ.**`,
            files: ["./assets/wlpass.gif"]
          }).catch(console.error);
        }

        await interaction.editReply({
          content: "✔️ WL aprobada."
        });

      } catch (err) {
        console.error("Error en /wlpass:", err);
        await interaction.editReply({
          content: "❌ No pude asignar WL."
        });
      }
    }

    // ========= WL DENEGADA =========
    else if (interaction.commandName === "wldenied") {
      try {
        console.log("Ejecutando /wldenied para:", userId);
        await member.roles.add(ROLE_DENIED);

        const logChannel = await guild.channels.fetch(LOG_CHANNEL).catch(() => null);
        if (logChannel) {
          logChannel.send(
            `🔴 <@${interaction.user.id}> denegó una WL → <@${userId}>`
          ).catch(console.error);
        }

        const publicChannel = await guild.channels.fetch(PUBLIC_CHANNEL).catch(() => null);
        if (publicChannel) {
          publicChannel.send({
            content: ` ᴡʜɪᴛᴇʟɪsᴛ ᴅᴇɴᴇɢᴀᴅᴀ <@${userId}> — **ʀᴇᴠɪsᴇ ʟᴀs ɴᴏʀᴍᴀs ᴀɴᴛᴇs ᴅᴇ ᴠᴏʟᴠᴇʀ.**`,
            files: ["./assets/wldenied.gif"]
          }).catch(console.error);
        }

        await interaction.editReply({
          content: "❌ Denegado."
        });

      } catch (err) {
        console.error("Error en /wldenied:", err);
        await interaction.editReply({
          content: "❌ No pude asignar WL Denegada."
        });
      }
    }

  } catch (err) {
    console.error("Error general en interactionCreate:", err);

    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ Ocurrió un error al procesar el comando.",
          flags: 64
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Ocurrió un error al procesar el comando."
        });
      }
    } catch (e) {
      console.error("Error al enviar mensaje de error:", e);
    }
  }
});

// ================== LOGIN ==================
console.log("Iniciando login… TOKEN presente?", !!TOKEN);

client.login(TOKEN)
  .then(() => {
    console.log("✅ Login correcto, esperando evento 'ready'...");
  })
  .catch(err => {
    console.error("❌ Error en client.login:", err);
  });
