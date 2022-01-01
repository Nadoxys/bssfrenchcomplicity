const DISCORD = require("discord.js");
const CLIENT = new DISCORD.Client({
  intents: [
    "GUILDS",
    "GUILD_MEMBERS",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS",
  ],
});
const FS = require("fs");
const BDD = require("./bdd.json");
// const CONFIG = require("./config.json");
const CHANNELSID = require("./channelsId.json");
const ROLESID = require("./rolesId.json");
const { MessageEmbed } = require("discord.js");

const PREFIX = "!";
const AUTODELETEMSG = 3000;

CLIENT.once("ready", () => {
  console.log("Gummy Bee is ready");
  CLIENT.user.setActivity("Gummy Star Song", { type: "LISTENING" });
});

// NOUVEAU MEMBRE ##########################################################

CLIENT.on("guildMemberAdd", (member) => {
  CLIENT.channels.cache
    .get(CHANNELSID.bienvenue)
    .send(`Bienvenue à toi ${member}!`);
  member.roles.add(ROLESID.membre);
  member
    .send(
      "Salut et bienvenue sur le serveur BSS French Complicity" +
        ", je suis la Gummy Bee!\n" +
        "Oublies pas d'aller voir <#" +
        CHANNELSID["le-serveur"] +
        "> pour comprendre le but du serveur, c'est rapide et super important !\n" +
        "Tu peux aussi choisir tes <#" +
        CHANNELSID.roles +
        ">\n" +
        "Bon farm à toi!"
    )
    .catch((err) => {});
});

// MEMBRE QUITTE LE SERVEUR ##########################################################

CLIENT.on("guildMemberRemove", (member) => {
  CLIENT.channels.cache
    .get(CHANNELSID.bienvenue)
    .send("Au revoir " + member.displayName + " !");
});

// COMMANDES PREFIX ##########################################################

CLIENT.on("messageCreate", (message) => {
  if (message.content === PREFIX + "salut") {
    message.reply("Salut " + message.author.username + " !");
  } else {
    if (message.content.startsWith(PREFIX + "clear")) {
      if (message.member.permissions.has("MANAGE_MESSAGES")) {
        let args = message.content.split(" ");
        if (args[1]) {
          let nbMessages = parseInt(args[1]) + 1;
          if (nbMessages) {
            if (nbMessages > 0 && nbMessages < 101) {
              message.channel.bulkDelete(nbMessages);
              message.channel.send("J'ai supprimé " + args[1] + " messages!");
            } else {
              message.channel
                .send("Erreur : Le nombre doit être inférieur à 100.")
                .then((msg) => {
                  setTimeout(() => {
                    msg.delete();
                  }, AUTODELETEMSG);
                });
            }
          } else {
            message.channel
              .send("Erreur : L'argument 1 doit être un nombre.")
              .then((msg) => {
                setTimeout(() => {
                  msg.delete();
                }, AUTODELETEMSG);
              });
          }
        } else {
          message.channel
            .send(
              "Erreur : Entrez le nombre de messages à supprimer en argument 1."
            )
            .then((msg) => {
              setTimeout(() => {
                msg.delete();
              }, AUTODELETEMSG);
            });
        }
      }
    } else if (message.content.startsWith(PREFIX + "warn")) {
      if (message.member.permissions.has("MUTE_MEMBERS")) {
        let args = message.content.split(" ");

        let member = message.mentions.members.first();
        let reason = "PasDeRaison";
        if (args[2]) {
          reason = args[2];
        }

        if (args.length > 3) {
          message.reply("La raison du warn ne doit pas dépasser 1 mot");
          return;
        }

        if (member) {
          let muted = false;
          let date = new Date();
          let realDate =
            date.getDate() +
            "-" +
            (date.getMonth() + 1) +
            "-" +
            date.getFullYear();
          if (BDD["warn"][member.id]) {
            let nbWarn = BDD["warn"][member.id]["nb"];
            if (nbWarn % 3 == 2) {
              muted = true;
            }
            BDD["warn"][member.id]["nb"]++;
            BDD["warn"][member.id][nbWarn + 1] = {
              reason: reason,
              date: realDate,
            };
            saveBdd();
          } else {
            BDD["warn"][member.id] = {
              nb: 1,
              1: {
                reason: reason,
                date: realDate,
              },
            };
            saveBdd();
          }
          message.channel.send(
            BDD["warn"][member.id]["nb"] +
              " warn pour " +
              member.displayName +
              " !"
          );
          if (muted) {
            member.roles.add(ROLESID.mute);
            message.channel.send(
              member.displayName +
                " a été mute pour une durée indéterminée! cheh."
            );
          }
        }
      }
    } else if (message.content.startsWith(PREFIX + "mute")) {
      if (!message.member.permissions.has("MUTE_MEMBERS")) return;
      let member = message.mentions.users.first();
      if (member) {
        member = message.guild.members.cache.get(member.id);
        member.roles.add(ROLESID.mute);
        message.channel.send(
          member.displayName + " a été mute pour une durée indéterminée! cheh."
        );
      }
    } else if (message.content.startsWith(PREFIX + "unmute")) {
      if (!message.member.permissions.has("MUTE_MEMBERS")) return;
      let member = message.mentions.users.first();
      if (member) {
        member = message.guild.members.cache.get(member.id);
        member.roles.remove(ROLESID.mute);
        message.channel.send(member.displayName + " a été unmute!");
      }
    } else if (message.content.startsWith(PREFIX + "lw")) {
      // LISTE DES WARNS
      if (message.member.permissions.has("MUTE_MEMBERS")) {
        let args = message.content.split(" ");
        member = message.mentions.members.first();
        if (!member) return;
        if (BDD["warn"][member.id]) {
          let nbWarns = BDD["warn"][member.id]["nb"];
          const listWarn = new MessageEmbed()
            .setColor("#0099ff")
            .setTitle(member.displayName)
            .setDescription(
              "Affichage des 5 derniers warns pour " + member.displayName
            )
            .addField("Nombre de warns : ", nbWarns.toString(), false);
          for (let i = nbWarns; i > nbWarns - 5; i--) {
            if (i <= 0) break;
            listWarn.addField(
              BDD["warn"][member.id][i]["date"],
              BDD["warn"][member.id][i]["reason"]
            );
          }
          message.channel.send({ embeds: [listWarn] });
        } else {
          message.reply("Aucun warn pour " + member.displayName);
        }
      }
    }
  }
});

function saveBdd() {
  FS.writeFile("./bdd.json", JSON.stringify(BDD, null, 4), (err) => {
    if (err) message.channel.send("Une erreur est survenue");
  });
}

CLIENT.login(process.env.TOKEN);
