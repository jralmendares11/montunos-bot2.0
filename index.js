// ================== CONFIG & IMPORTS ==================
require("dotenv").config();
const http = require("http");
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  WebhookClient
} = require("discord.js");

// ================== CLIENT DISCORD ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// ================== KEEP ALIVE SERVER ==================
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

// ====== DELICTIVA (WD) ======
const ROLE_WD_WHITELIST = process.env.ROLE_WD_WHITELIST_ID;
const ROLE_WD_DENIED   = process.env.ROLE_WD_DENIED_ID;
const WD_LOG_CHANNEL   = process.env.WD_LOG_CHANNEL_ID;
const WD_WEBHOOK_URL   = process.env.WD_WEBHOOK_URL;

const PUBLIC_CHANNEL = process.env.PUBLIC_CHANNEL_ID;
const LOG_CHANNEL    = process.env.LOG_CHANNEL_ID;

// Webhook para anuncios WD (para no cambiar nombre/foto del bot)
const wdWebhook = WD_WEBHOOK_URL ? new WebhookClient({ url: WD_WEBHOOK_URL }) : null;

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
      ),

    new SlashCommandBuilder()
      .setName("wdpass")
      .setDescription("Aprobar whitelist delictiva")
      .addStringOption(option =>
        option.setName("id")
          .setDescription("ID del usuario")
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName("wddenied")
      .setDescription("Denegar whitelist delictiva")
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

  // 🔒 Solo permitir el comando en su canal de LOGS correspondiente
  const expectedLogChannel =
    (interaction.commandName === "wdpass" || interaction.commandName === "wddenied")
      ? WD_LOG_CHANNEL
      : LOG_CHANNEL;

  if (expectedLogChannel && interaction.channelId !== expectedLogChannel) {
    try {
      await interaction.reply({
        content: "❌ Este comando solo se puede usar en el canal de logs configurado.",
        flags: 64
      });
    } catch (e) {
      console.error("Error al responder por canal incorrecto:", e);
    }
    return;
  }

  try {
    const guild = interaction.guild || client.guilds.cache.get(GUILD_ID);
    const userIdRaw = interaction.options.getString("id");
    const userId = (userIdRaw || "").trim();

    // ✅ Validación rápida (evita pegar texto largo / cosas raras)
    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({
        content: "❌ ID inválido. Pegá el Discord ID (solo números).",
        flags: 64
      }).catch(() => {});
      return;
    }

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


    // ========= WD WL APROBADA =========
    else if (interaction.commandName === "wdpass") {
      try {
        console.log("Ejecutando /wdpass para:", userId);
        await member.roles.add(ROLE_WD_WHITELIST);

        // LOG STAFF WD (mismo canal donde se ejecuta)
        const logChannel = expectedLogChannel
          ? await guild.channels.fetch(expectedLogChannel).catch(() => null)
          : null;
        if (logChannel) {
          logChannel.send(
            `🟢 <@${interaction.user.id}> aprobó **WL Delictiva** → <@${userId}>`
          ).catch(console.error);
        }

        // ANUNCIO POR WEBHOOK (sin cambiar nombre/foto del bot)
        if (wdWebhook) {
          wdWebhook.send({
            content: `✅ **ʜᴀ sɪᴅᴏ ᴀᴘʀᴏʙᴀᴅᴏ ᴘᴀʀᴀ ᴇʟ ʀᴏʟ ᴅᴇʟɪᴄᴛɪᴠᴏ** <@${userId}> — **ᴇʟ ʀᴏʟ ʜᴀʙʟᴀʀᴀ ᴘᴏʀ ᴠᴏs, ɴᴏ ʟᴏs ᴅɪsᴘᴀʀᴏs.**`,
            files: [{ attachment: "./assets/wdpass.gif", name: "wdpass.gif" }]
          }).catch(console.error);
        } else {
          console.log("WD_WEBHOOK_URL no configurado, no se envió anuncio WD.");
        }

        await interaction.editReply({ content: "✔️ WL Delictiva aprobada." });
      } catch (err) {
        console.error("Error en /wdpass:", err);
        await interaction.editReply({ content: "❌ No pude asignar WL Delictiva." });
      }
    }

    // ========= WD WL DENEGADA =========
    else if (interaction.commandName === "wddenied") {
      try {
        console.log("Ejecutando /wddenied para:", userId);
        await member.roles.add(ROLE_WD_DENIED);

        const logChannel = expectedLogChannel
          ? await guild.channels.fetch(expectedLogChannel).catch(() => null)
          : null;
        if (logChannel) {
          logChannel.send(
            `🔴 <@${interaction.user.id}> denegó **WL Delictiva** → <@${userId}>`
          ).catch(console.error);
        }

        if (wdWebhook) {
          wdWebhook.send({
            content: `❌ **ᴀᴘʟɪᴄᴀᴄɪᴏ́ɴ ᴅᴇʟɪᴄᴛɪᴠᴀ ᴅᴇɴᴇɢᴀᴅᴀ** <@${userId}> — **ᴘᴜᴇᴅᴇs ᴠᴏʟᴠᴇʀ ᴀ ɪɴᴛᴇɴᴛᴀʀʟᴏ ᴍᴀ́s ᴀᴅᴇʟᴀɴᴛᴇ.**`,
            files: [{ attachment: "./assets/wddenied.gif", name: "wddenied.gif" }]
          }).catch(console.error);
        } else {
          console.log("WD_WEBHOOK_URL no configurado, no se envió anuncio WD.");
        }

        await interaction.editReply({ content: "❌ WL Delictiva denegada." });
      } catch (err) {
        console.error("Error en /wddenied:", err);
        await interaction.editReply({ content: "❌ No pude asignar WL Delictiva (denegada)." });
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
