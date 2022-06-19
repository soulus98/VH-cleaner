const { token } = require("./server/keys.json"),
			fs = require("fs"),
			path = require("path"),
			Discord = require("discord.js"),
			{ handleCommand } = require("./handlers/commands.js"),
			{ dateToTime, errorMessage, dev } = require("./func/misc.js"),
			{ cleanup, loadCleanupList } = require("./func/filter.js"),
			ver = require("./package.json").version;

const client = new Discord.Client({
			intents: [
				Discord.Intents.FLAGS.GUILDS,
				Discord.Intents.FLAGS.GUILD_MESSAGES,
			],
			partials: [
				"CHANNEL",
			],
			presence: {
				status: "online",
				activities: [{
					name: require("./server/config.json").activity || ver,
					type: "PLAYING",
				}],
			},
		}),
			launchDate = new Date();
let loaded = false,
		server = {},
		cleanupList = new Discord.Collection();
ops = {};
module.exports = { loadConfigs };

// Loads all the variables at program launch
async function load(){
	console.log("======================================================================================\n");
	console.log("Server starting...");
		await loadConfigs();
		await loadCommands();
		await loadCleanupList().then((list) => {
			cleanupList = list;
		});
		client.login(token);
}
// Loads (or re-loads) the bot settings
function loadConfigs(){
	return new Promise((resolve) => {
		ops = {};
		delete require.cache[require.resolve("./server/config.json")];
		ops = require("./server/config.json");
		if (!loaded){
			console.log("\nLoading configs...");
			console.log("\nConfigs:", ops);
			loaded = true;
			resolve();
		} else {
			(async () => {
				server = await client.guilds.fetch(ops.serverID);
				console.log("\nReloaded configs\n");
				resolve();
			})();
		}
	});
}
// Loads the command files. This was standard in the discord.js guide
function loadCommands(){
	return new Promise((resolve) => {
		client.commands = new Discord.Collection();
		const commandFiles = fs.readdirSync(path.resolve(__dirname, "./commands")).filter(file => file.endsWith(".js"));
		let commandFilesNames = "\nThe currently loaded commands and cooldowns are:\n";
		for (const file of commandFiles) {		// Loads commands
			const command = require(`./commands/${file}`);
			commandFilesNames = commandFilesNames + ops.prefix + command.name;
			if (command.cooldown){
				commandFilesNames = commandFilesNames + ":\t" + command.cooldown + " seconds \n";
			} else {
				commandFilesNames = commandFilesNames + "\n";
			}
			client.commands.set(command.name, command);
		}
		console.log(commandFilesNames);
		resolve();
	});
}
// Checks all the bot guilds and leaves them if they aren't the intended server
// If it is called from the main event, it sends a reply message
// This is vital, else someone could change the settings by simply inviting the bot to their server and being admin
// TODO: Make different settings for different servers. It is not necessary, but would be good practice

load();

client.once("ready", async () => {
	server = await client.guilds.fetch(ops.serverID);
	const soul = await client.users.fetch(dev, false, true);
	client.user.setActivity(`${ver}`);
	if (server == undefined){
		console.log("\nOops the screenshot server is broken.");
		return;
	}
	const activeServers = client.guilds.cache;
	const activeServerList = [];
	activeServers.each(serv => activeServerList.push(`"${serv.name}" aka #${serv.id}`));
	soul.send(`**Dev message:** Active in:\n${activeServerList.join("\n")}`).catch(console.error);
	soul.send(`**Dev message:** Loaded cleaup bot in guild: "${server.name}"#${server.id}`).catch(console.error);
	console.log(`\nActive in:\n${activeServerList.join("\n")}`);
	console.log(`\nServer started at: ${launchDate.toLocaleString()}. Loaded in guild: "${server.name}"#${server.id}`);
	console.log("\n======================================================================================\n");
});

client.on("shardError", (error) => {
	console.error(`[${dateToTime(new Date())}]: Websocket disconnect: ${error}`);
});

client.on("shardResume", () => {
	if (loaded) {
		console.error("Resumed! Refreshing Activity...");
		client.user.setActivity(`${ver}`);
	}
});

client.on("shardDisconnect", () => {
	console.error("Disconnected!");
});

client.on("shardReady", () => {
	if (loaded) {
		console.error("Reconnected! Refreshing Activity...");
		client.user.setActivity(`${ver}`);
	}
});

client.on("shardReconnecting", () => {
	console.error("Reconnecting...");
});

async function checkCleanupList(message) {
	if (message.author.id != 428187007965986826) return; // pokenav message filtering
	const filtered = [];
	for (const g of cleanupList) {
		if (g[1].includes(message.channel.id)) {
			cleanup(message, g[0]);
			filtered.push(true);
		} else {
			filtered.push(false);
		}
		if (filtered.length == cleanupList.size) {
			return;
		}
	}
}

client.on("messageCreate", async message => {
	await checkCleanupList(message);
	if (message.author.bot) return; // Bot? Cancel
	const postedTime = new Date();
	const dm = (message.channel.type == "DM") ? true : false;
	if (dm) {
		if (message.content.startsWith("$")) {
			message.reply("Commands starting with `$` are for a different bot (Pokénav).").catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`Commands starting with \`$\` are for a different bot (Pokénav).\nYou can use them in <#${ops.profileChannel}> once you have confirmed you are above level ${ops.targetLevelRole} by sending a screenshot in <#${ops.screenshotChannel}>.`);
			});
		} else {
			message.reply(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`).catch(() => {
				errorMessage(postedTime, dm, `Error: I can not reply to ${message.url}${message.channel}.\nContent of mesage: "${message.content}. Sending a backup message...`);
				message.author.send(`This bot does not currently work in dms.\nPlease send your profile screenshot in <#${ops.screenshotChannel}>.`);
			});
		}
		return;
	} else if (message.guild == server) handleCommand(message, postedTime); // command handler
});

process.on("uncaughtException", (err) => {
	errorMessage(new Date(), false, `Uncaught Exception: ${err}`);
});

process.on("unhandledRejection", (err, promise) => {
	console.error(`[${dateToTime(new Date())}]: Unhandled rejection at `, promise, `reason: ${err}`);
});

process.on("SIGINT", () => {
  console.log(`Process ${process.pid} has been interrupted`);
});
