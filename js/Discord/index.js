
import { commonInit, getHostName } from './common.js';
import { obsConnect } from './obs.js';

const commonEvents = commonInit();

import { discordLogin, sendTextChannelMessage } from './discord.js'

commonEvents.on('shutdown', (text, promises) => {
    const promise = sendTextChannelMessage(text);
    promises.push(promise);
});

async function main() {
    await discordLogin();

    let text = `\`${'='.repeat(45)}\`\nChangeOfScenery \`${getHostName()}\`: initializing...`;
    console.log(text);
    sendTextChannelMessage(text);

    await obsConnect();

    text = 'obs started!';
    console.log(text);
    sendTextChannelMessage(text);

    text = `ChangeOfScenery \`${getHostName()}\`: initialized!`;
    console.log(text);
    sendTextChannelMessage(text);
}

main();