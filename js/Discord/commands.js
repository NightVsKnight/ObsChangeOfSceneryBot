import {
    configGet,
    configSave,
    configGetCopyAbbreviated,
} from './config.js';
import {
    formatSceneIndexAndName,
    stringify,
    trimQuotes,
} from './common.js'
import {
    obsGetScene,
    obsGetScenes,
    obsSetScene,
} from './obs.js'
import {
    sendTextChannelMessage,
    reportCurrentScene,
    discordEnableAutoVoiceSceneSet,
    clearTextChannelMessages,
} from './discord.js'

export const mapCommands = {
           'help':{f:commandHelp,        args:'',         text:'This help output'},
         'scenes':{f:commandScenes,      args:'',         text:'List the OBS scene #s and names'},
          'scene':{f:commandScene,       args:'[#]',      text:'Report or set the current OBS scene to scene #'},
              '#':{f:null,               args:'',         text:'/scene #'},
            'pin':{f:commandPin,         args:'',         text:'Pin the current OBS scene (disable auto PTT scene switching)'},
          'unpin':{f:commandUnpin,       args:'',         text:'Unpin the currently pinned OBS scene (enable auto PTT scene switching)'},
          'clear':{f:commandClear,       args:'[#]',      text:'Clear last # messages, 100 by default *'},
         'config':{f:commandConfigShow,  args:'',         text:'Show the config'},
           'save':{f:commandConfigSave,  args:'',         text:'Save the config'},
};

/**
 * NOTE: Should be < discord.js:maxTextChannelContentLength (2000)
 */
function makeHelpText() {
    let widestCommandAndArgs = 0;
    const entries = [];
    for (const [command, {args, text}] of Object.entries(mapCommands)) {
        let commandAndArgs = command;
        if (args) {
            commandAndArgs += ` ${args}`; 
        }
        if (commandAndArgs.length > widestCommandAndArgs) {
            widestCommandAndArgs = commandAndArgs.length;
        }
        entries.push([commandAndArgs, text]);
    }
    let help = '';
    for (const [commandAndArgs, text] of entries) {
        help += `${commandAndArgs.padStart(widestCommandAndArgs, ' ')} : ${text}\n`;
    }
    const footer = `* limited to less than 14 days.
NOTE: messages are limited to 2000 characters.`;
    //console.log(`makeHelpText: help(${help.length})`, quote(help));
    return { help, footer };
}

const helpText = makeHelpText();


export function handleMessage(message) {
    const content = message.content;
    //console.log(`handleMessage: content="${content}"`);
    if (content.startsWith(configGet().commandPrefix)) {
        handleCommand(message);
        return;
    }
    //console.log('handleMessage: content.startsWith(configGet().commandPrefix) == false; TODO: parse & process message...');
}

function handleCommand(message) {
    const content = message.content;
    //console.log(`handleCommand: content="${content}"`);
    if (!content.startsWith(configGet().commandPrefix)) {
        console.log('handleCommand: content.startsWith(configGet().commandPrefix) == false; ignoring');
        return;
    }
    let [commandName, ...args] = content.slice(configGet().commandPrefix.length).trim().split(/ +/);
    commandName = commandName.toLowerCase();
    //console.log('handleCommand: commandName', commandName);
    //console.log('handleCommand: args', args);

    const command = mapCommands[commandName];
    const f = command?.f;
    //console.log('handleCommand: f', f);
    if (f) {
        f(args);
    } else {
        const sceneNum = parseInt(commandName);
        if (!isNaN(sceneNum)) {
            commandScene(sceneNum);
        }            
    }
}

function commandHelp(args) {
    let { help, footer } = helpText;
    help = `\`\`\`\n${help}\n\`\`\``;
    footer = `\`\`\`\n${footer}\n\`\`\``;
    sendTextChannelMessage(help);
    sendTextChannelMessage(footer);
}

function commandScenes(args) {
    obsGetScenes()
        .then(data => {
            const [currentSceneName, scenes] = data;
            //console.log(`commandScenes: currentSceneName`, currentSceneName);
            //console.log(`commandScenes: scenes`, scenes);
            let text = 'Scenes:\n```\n';
            scenes?.forEach((scene, sceneIndex) => {
                const sceneName = scene.sceneName;
                text += `${formatSceneIndexAndName(sceneIndex, sceneName, sceneName == currentSceneName)}\n`;
            });
            text += '\n```';
            text += '* == current scene'
            sendTextChannelMessage(text);
        })
        .catch(error => {
            const text = `obsGetScenes error=${error}`;
            console.error(`commandScenes: ${text}`);
            sendTextChannelMessage(text);
        });
}

function commandScene(args) {
    console.log('commandScene: args', args);
    let sceneNum = Array.isArray(args) ? args[0] : args;
    if (sceneNum === undefined) {
        reportCurrentScene();
    } else {
        obsGetScenes()
            .then(data => {
                const [_, scenes] = data;
                if (sceneNum > scenes.length) {
                    sceneNum = scenes.length - 1;
                }
                const scene = scenes[sceneNum];
                const sceneName = scene.sceneName;
                obsSetScene(sceneName) // CurrentProgramSceneChanged event will fire
                    .catch(error => {
                        const text = `obsSetScene error=${error}`;
                        console.error(`commandScene: ${text}`);
                        sendTextChannelMessage(text);
                    }); 
            })
            .catch(error => {
                const text = `obsGetScenes error=${error}`;
                console.error(`commandScene: ${text}`);
                sendTextChannelMessage(text);
            });
    }
}

function commandPin(args, pin) {
    pin = pin == true || pin === undefined;
    discordEnableAutoVoiceSceneSet(!pin);
    obsGetScene()
        .then(_ => {
            let text = ''
            if (pin) {
                text += 'Auto PTT scene switching is now disabled.';
            } else {
                text += 'Auto PTT scene switching is now enabled.';
            }
            sendTextChannelMessage(text);
            reportCurrentScene();
        })
        .catch(error => {
            const text = `obsGetScene error=${error}`;
            console.error(`commandPin: ${text}`);
            sendTextChannelMessage(text);
        });
}

function commandUnpin(args) {
    commandPin(args, false);
}

function commandClear(args) {
    const count = args[0] || 100;
    clearTextChannelMessages(count);
}

//
//
//

function commandConfigShow(args) {
    const configCopy = configGetCopyAbbreviated();
    const text = 'Config:\n```\n' + stringify(configCopy) + '\n```';
    sendTextChannelMessage(text);
}

function commandConfigSave() {
    configSave();
}
