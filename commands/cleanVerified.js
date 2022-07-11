/* eslint-disable max-nested-callbacks*/
const rate = 4000;

module.exports = {
	name: "cleanup-verified",
	description: "Deletes VH from anyone who has VH and not RR",
  aliases: ["cv"],
  usage: `\`${ops.prefix}\`cv`,
	guildOnly:true,
	permissions: "ADMINISTRATOR",
	type:"Admin",
	async execute(message) {
		message.reply("Loading members").then((loadingMessage) => {
			message.guild.members.fetch().then(async (members) => {
				loadingMessage.edit(`Members loaded. Size = ${members.size}`);
				const vh = await message.guild.roles.fetch(ops.VH);
				const rr = await message.guild.roles.fetch(ops.RR);
				message.reply(`Remote Raids = ${rr.members.size}
Verified Host = ${vh.members.size}
Approximately ${vh.members.size - rr.members.size} members will lose the Verified Host role.
React with ✅ to continue, ❌ to cancel.
This message will last 60 seconds.`).then((msg) => {
					msg.react("✅").then(() => msg.react("❌"));
					const filter = (reaction, usr) => {
						return ["✅", "❌"].includes(reaction.emoji.name) && usr.id === message.author.id;
					};
					msg.awaitReactions({ filter, max: 1, time: 60000, errors: ["time"] }).then((collected) => {
						let breakProcess = false;
						let cancelTimeout = false;
						if (collected.first().emoji.name === "✅") {
							loadingMessage.delete();
							msg.delete();
							message.reply("Processing: 0%. ❌ to cancel").then(processingMessage => {
								const cheaters = vh.members.filter(memb => !memb.roles.cache.has(ops.RR));
								const size = cheaters.size;
								processingMessage.react("❌");
								processingMessage.awaitReactions({ filter, max: 1, time: 12 * 60 * 60 * 1000, errors: ["time"] }).then((col) => {
									if (col.first().emoji.name === "❌") {
										console.log("CV Cancelled");
										breakProcess = true;
										processingMessage.reactions.removeAll();
									}
								}).catch(() => {
									console.log("Cancel emoji timed out");
									cancelTimeout = true;
									processingMessage.reactions.removeAll();
								});
								revertCheater(0);

								async function revertCheater(i){
									if (breakProcess) return processingMessage.edit("Cancelled.");
									const member = cheaters.at(i);
									if (member.roles.cache.has(ops.RR)) {
										console.log(member.user.username, "#", member.id, "had both VH and RR");
									} else if (member.roles.cache.has(ops.VH)) {
										if (i % 10 == 0 && i != 0) processingMessage.edit(`Processing: ${((i / (size - 1)) * 100).toFixed(2)}%.${(!cancelTimeout) ? " ❌ to cancel" : ""}`);
										await member.roles.remove(ops.VH).then(() => {
											console.log(`Removed VH from ${member.user.username}#${member.id}`);
										}).catch(() => {
											console.log(`${member.user.username}#${member.id} has left the server.`);
										});
									}
									if (i == size - 1) {
										processingMessage.reactions.removeAll();
										return processingMessage.edit(`Completed.\nChecked ${members.size} members and removed VH ${i + 1} times.`);
									}
									revertCheater(i + 1);
								}

							});
						} else {
							loadingMessage.delete();
							msg.delete();
						}
					}).catch(() => {
						loadingMessage.delete();
						msg.delete();
					});
				});
			}).catch((err) => {
				message.reply("Sorry, I didn't load in time... :(");
				message.reply(err);
				console.error(err);
			});
		});
	},
};
