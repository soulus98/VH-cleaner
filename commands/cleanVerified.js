module.exports = {
	name: "cleanup-verified",
	description: "Deletes VH from anyone who has VH and not RR",
  aliases: ["cv"],
  usage: `\`${ops.prefix}\`cv`,
	guildOnly:true,
	permissions: "ADMINISTRATOR",
	type:"Admin",
	async execute(message) {
		console.log(ops.VH);
		const vh = await message.guild.roles.fetch(ops.VH);
		const rr = await message.guild.roles.fetch(ops.RR);
		message.reply(`Remote Raids = ${rr.size}
Verified Host = ${vh.size}
Approximately ${vh.size - rr.size} members will lose the Verified Host role.
React with ✅ to continue, ❌ to cancel.
This message will last 60 seconds.`).then((msg) => {
			msg.react("✅").then(() => msg.react("❌"));
			const filter = (reaction, usr) => {
				return ["✅", "❌"].includes(reaction.emoji.name) && usr.id === message.author.id;
			};
			msg.awaitReactions({ filter, max: 1, time: 60000, errors: ["time"] }).then((collected) => {
				console.log("testo 1");
				if (collected.first().emoji.name === "✅") {
					msg.delete();
					message.reply("test success");
				} else {
					msg.delete();
					message.reply("test declined");
				}
			}).catch(() => {
				msg.delete();
				message.reply("test expired");
			});
		});
	},
};
