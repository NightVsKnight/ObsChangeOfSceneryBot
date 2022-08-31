
import { Client, GatewayIntentBits, MessageFlags } from 'discord.js';
import { VoiceConnectionStatus,  joinVoiceChannel } from '@discordjs/voice';

import { obsGetScenes, obsSetScene } from './obs.js'
import { formatDateYMDHMS, formatSceneIndexAndName, stringify } from './common.js'
import { handleMessage } from './commands.js'

import { configGet, configServerGet, configServerProfileGet } from './config.js';

// For now, remove all embeds (aka: which includes url previews) from messages
const FEATURE_SUPPRESS_EMBEDS = true;


var guild = undefined;
var textChannel = undefined;
var voiceChannel = undefined;
var enableAutoVoiceSceneSet = true;

export function discordEnableAutoVoiceSceneSet(enable) {
    enableAutoVoiceSceneSet = enable;
}

export function clearTextChannelMessages(count) {
    textChannel.bulkDelete(count, true)
        .then(messages => {
            textChannel.send(`Cleared ${messages.size} messages`);
        })
        .catch(error => {
            textChannel.send(`Error clearing ${count} messages: ${error}`);
        });
}

export function reportCurrentScene() {
    obsGetScenes()
        .then(data => {
            const [currentSceneName, scenes] = data;
            //console.log(`reportCurrentScene: currentSceneName`, currentSceneName);
            //console.log(`reportCurrentScene: scenes`, scenes);
            let currentSceneIndex = 0;
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                if (scene.sceneName == currentSceneName) {
                    currentSceneIndex = i;
                    break;
                }
            }
            const sceneIndexAndName = formatSceneIndexAndName(currentSceneIndex, currentSceneName, true);
            sendTextChannelMessage(`Current Scene \`${sceneIndexAndName}\``);
        })
        .catch(error => {
            const text = `obsGetScenes error=${error}`;
            console.error(`reportCurrentScene: ${text}`);
            sendTextChannelMessage(text);
        });
}

export function reportMapUserIdToScene() {
    const text = 'User->Scene:\n```\n' + stringify(configServerProfileGet()) + '\n```';
    return sendTextChannelMessage(text);
}

export function getUser(userId, callback) {
    discord.users.fetch(userId)
        .then(user => { callback(user); })
        .catch(error => {
            console.error('getUser error', error);
            callback(undefined);
        });
}

export function setUserScene(userId, scene) {
    configServerProfileGet()[userId] = scene;
}

export function formatUserNameWithDiscriminator(user) {
    return `${user.username}#${user.discriminator}`;
}

function split(str, index) {
    return [str.slice(0, index), str.slice(index)];
}

const maxTextChannelContentLength = 2000;

export function buildMessage(text, line, prefix, suffix) {
    if (suffix === undefined) {
        suffix = prefix;
    }
    if (text.length + line.length + 2 + suffix?.length < maxTextChannelContentLength) {
        text += line;
    } else {
        text += '\n' + suffix;
        sendTextChannelMessage(text);
        text = prefix + '\n' + line;
    }
    return text;
}

export function sendTextChannelMessage(text) {
    //console.log(`sendTextChannelMessage(text)`);
    return new Promise(async (resolve, reject) => {
        while (text.length > maxTextChannelContentLength) {
            let partial;
            [partial, text] = split(text, maxTextChannelContentLength);
            //console.log('sendTextChannelMessage: partial', partial);
            await textChannel?.send(partial);
        }
        //console.log('sendTextChannelMessage: content', content);
        await textChannel?.send(text)
            .then(message => {
                //console.log('sendTextChannelMessage: then message', message);
                resolve(message);
            })
            .catch(error => {
                const text = `textChannel?.send error=${error}`;
                console.error(`sendTextChannelMessage: ${text}`);
                //sendTextChannelMessage(text);
                reject(error);
            });
    });
}

export function updateTextChannelMessage(messageId, text) {
    //console.log(`updateTextChannelMessage(${messageId}, text)`);
    return new Promise((resolve, reject) => {
        textChannel.messages.fetch(messageId)
            .then(message => {
                //console.log('updateTextChannelMessage: message', message);
                message.edit(text)
                    .then(message => {
                        //console.log('updateTextChannelMessage: message edited', message);
                        resolve();
                    })
                    .catch(error => {
                        const text = `message.edit error=${error}`;
                        console.error(`updateTextChannelMessage: ${text}`);
                        //sendTextChannelMessage(text);
                        reject(error);
                    });
            })
            .catch(error => {
                const text = `textChannel.messages.fetch error=${error}`;
                console.error(`updateTextChannelMessage: ${text}`);
                //sendTextChannelMessage(text);
                reject(error);
            });
    });
}

function sendTextChannelTimedHeader() {
    const text = `----- ${formatDateYMDHMS()} -----`;
    return sendTextChannelMessage(text);
}

const mapUserIdSceneToTimer = {};
var activeSceneNameToSet = null;
var activeSceneNameToSetElapsedMs = -1;

function voiceChannelSetActiveScene(usernamescene, activate) {
    console.log(`voiceChannelSetActiveScene(\`${usernamescene}\`, ${activate})`);
    removeTimeout(usernamescene);
    sendTextChannelTimedHeader();
    let text = `:ear:: User \`${username}\` has been talking for more than ${configGet().talkingDurationMs}ms.`;
    sendTextChannelMessage(text);
    text = `:brain:: Auto PTT scene switch to \`${usernamescene}\``;
    sendTextChannelMessage(text);
    obsSetScene(usernamescene)
        .then(() => {
            sendTextChannelTimedHeader();
        })
        .catch(error => {
            const text = `obsSetScene error=${error}`;
            console.error(`voiceChannelSetActiveScene: ${text}`);
            sendTextChannelMessage(text);
        });
}

function timerStart(usernamescene, talking) {
    console.log(`timerStart(\`${usernamescene}\`, ${talking})`);
    removeTimeout(usernamescene);
    if (talking) {
        mapUserIdSceneToTimer[usernamescene] = setTimeout(() => { voiceChannelSetActiveScene(usernamescene)}, configGet().talkingDurationMs);
    }
}

function timerStop(usernamescene) {
    console.log(`timerStop(\`${usernamescene}\`)`);
    let timer = mapUserIdSceneToTimer[usernamescene];
    //console.log('timer', timer);
    if (timer === undefined) return;
    clearTimeout(timer);
    delete mapUserIdSceneToTimer[usernamescene];
}

const featureUseTalkDuration = false;

function onVoiceChannelSpeakingStarted(userId) {
    getUser(userId, user => {
        const username = formatUserNameWithDiscriminator(user);
        console.log(`Speaking Started: \`${username}\``);
        let text = null;
        if (featureUseTalkDuration) {
            //...
        } else {
            sendTextChannelTimedHeader();
            text = `:ear:: User \`${username}\` started talking.`;
            sendTextChannelMessage(text);
        }
        if (!enableAutoVoiceSceneSet) {
            if (featureUseTalkDuration) {
                console.log('enableAutoVoiceSceneSet == false; ignoring');
            } else {
                text = ':brain:: Auto PTT scene switching is disabled; ignoring.';
                sendTextChannelMessage(text);
                reportCurrentScene();
            }
            return;
        }
        const usernamescene = configServerProfileGet()[username];
        console.log(`onVoiceChannelSpeakingStarted: usernamescene: \`${usernamescene}\``);
        // No need to start any timer logic if user does not have a scene defined
        if (usernamescene === undefined) return;

        if (featureUseTalkDuration) {
            addTimeout(usernamescene, true);
        } else {
            text = `:brain:: Auto PTT scene switch to \`${usernamescene}\``;
            sendTextChannelMessage(text);
            obsSetScene(usernamescene)
                .then(() => {
                    sendTextChannelTimedHeader();
                })
                .catch(error => {
                    const text = `obsSetScene error=${error}`;
                    console.error(`onVoiceChannelSpeakingStarted: ${text}`);
                    sendTextChannelMessage(text);
                });
        }
    });
}

function onVoiceChannelSpeakingStopped(userId) {
    getUser(userId, user => {
        const username = formatUserNameWithDiscriminator(user);
        console.log(`Speaking Stopped: \`${username}\``);
        sendTextChannelTimedHeader();
        let text = `:ear:: User \`${username}\` stopped talking.`;
        sendTextChannelMessage(text);
        sendTextChannelTimedHeader();

        if (featureUseTalkDuration) {
            const usernamescene = configServerProfileGet()[username];
            console.log(`onVoiceChannelSpeakingStopped: usernamescene: \`${usernamescene}\``);
            // No need to start any timer logic if user does not have a scene defined
            if (usernamescene === undefined) return;

            addTimeout(usernamescene, false);
        } else {
            //...
        }
        console.log();
   });
}

export function discordInit() {
    console.log('discordInit()');
    const discord = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildVoiceStates,
        ],
    });
    discord.on('error', error => {
        console.error('discord error', error);
        // Anything else to do here?
    });
    discord.on('messageCreate', message => {
        // TODO: only authorized users
        if (message.channel.id != textChannel?.id) return;
        //if (message.author.bot) return; // ignore bot messages
        //if (message.author.id == discord.user.id) return; // ignore our own messages
        if (FEATURE_SUPPRESS_EMBEDS) {
            message.suppressEmbeds().catch(() => {});
        }
        handleMessage(message);
    });
    if (FEATURE_SUPPRESS_EMBEDS) {
        discord.on('messageUpdate', (oldMessage, newMessage) => {
            if (newMessage.embeds.length > 0 && newMessage.flags.has(MessageFlags.FLAGS.SUPPRESS_EMBEDS)) {
                newMessage.suppressEmbeds().catch(() => {});
            }
        });
    }
    return discord;
}

export function discordLogin() {
    console.log('discordLogin()');
    return new Promise((resolve, reject) => {
        discord.once('ready', () => {
            const serverConfig = configServerGet();
            const serverName = serverConfig.serverName;
            const textChannelName = serverConfig.textChannelName;
            const voiceChannelName = serverConfig.voiceChannelName;
            console.log(`Logged in as \`${discord.user.tag}\`; Finding server \`${serverName}\`...`);
            guild = discord.guilds.cache.find(guild => guild.name === serverName);
            console.log(`Found server; Finding text channel \`#${textChannelName}\``);
            textChannel = discord.channels.cache.find(channel => channel.guild.id == guild.id && channel.name == textChannelName);
            console.log(`Found text channel; Finding voice channel \`${voiceChannelName}\``);
            voiceChannel = discord.channels.cache.find(channel => channel.guild.id == guild.id && channel.name == voiceChannelName);
            console.log(`Found voice channel; Joining...`);
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true
            });
            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log(`Voice channel joined; Waiting on someone to speak...`);
            });
            connection.receiver.speaking.on('start', (userId) => {
                onVoiceChannelSpeakingStarted(userId);
            });
            connection.receiver.speaking.on('end', (userId) => {
                onVoiceChannelSpeakingStopped(userId);
            });
            console.log('discordLogin: success!');
            resolve();
        });
        discord
            .login(configGet().secrets.token)
            .catch(error => {
                const message = 'discord.login error!';
                console.error(`discordLogin: ${message}`, error);
                reject(error);
            });
    });
}

const discord = discordInit();
