import process from 'node:process';
import { EventEmitter } from 'events';

export const typicalMobileScreenWidthChars = 45;


const eventEmitter = new EventEmitter();

var uncaughtException = undefined;

export function getUncaughtException() {
    return uncaughtException;
}

function shutdown(caller, exitCode, message) {
    const promises = [];
    eventEmitter.emit('shutdown', message, promises);
    Promise
        .all(promises)
        .then(() => {
            console.log(`${caller}: process.exit(${exitCode});`);
            process.exit(exitCode);
        });
}

export function commonInit() {
    console.log('commonInit()');
    initConsoleLog();

    const footer = `\`${'='.repeat(typicalMobileScreenWidthChars)}\``;

    // Handle Ctrl-C
    process.on('SIGINT', () => {
        const message = `Ctrl-C; ChangeOfScenery \`${getHostName()}\`: exiting\n${footer}`;
        console.log(`Ctrl-C: ${message}`);
        shutdown('Ctrl-C', 0, message);
    });

    process.on('uncaughtException', (error, source) => {
        console.log('uncaughtException: error', error);
        // TODO: Trying to debug audioplay errors when RDP is connected or disconnected
        const errorMessage = error.toString();
        if (errorMessage.startsWith('Error: write() failed:') ||
            errorMessage.startsWith('Error: Failed to open output device')) {
            console.log('TODO: retry playing...');
            voicemeeterRestartAudioEngine();
            return;
        }
        uncaughtException = error;
        const message = `uncaughtException; ChangeOfScenery \`${getHostName()}\`: exiting\nerror=\`${error}\`\n${footer}`;
        console.error(`uncaughtException: ${message}`);
        shutdown('uncaughtException', 1, message);
    });

    return eventEmitter;
}

function consoleDecorate(name) {
    const f = console[name];
    if (f === undefined) return;
    console[name] = function () {
        let text = `${formatDateHMSMS(new Date())}`;
        const args = [text];
        if (arguments.length > 0) {
            args[0] = `${text} ${arguments[0]}`;
            if (arguments.length > 1) {
                args.concat(Array.prototype.slice.call(arguments, 1));
            }
        }
        f.apply(console, args);
    }
}

function initConsoleLog() {
    consoleDecorate('log');
    consoleDecorate('warn');
    consoleDecorate('error');
}

//
//
//

export function getHostName() {
    return process.env.COMPUTERNAME;
}

export function isString(s) {
    return typeof(s) === 'string' || s instanceof String;
}

export function quote(o, c) {
    if (c === undefined) {
        c = `'`;
    }
    return isString(o) ? `${c}${o}${c}` : o;
}

export function trimQuotes(s) {
    return s?.trim()
        .replace(/^'/, '').replace(/'$/, '')
        .replace(/^"/, '').replace(/"$/, '')
        .replace(/^`/, '').replace(/`$/, '')
}

export function stringify(json) {
    return JSON.stringify(json, null, 2);
}

export function formatDateHMSMS(date) {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return `${((hour < 10) ? '0' + hour : hour)}:${((minute < 10) ? '0' + minute : minute)}:${((second < 10) ? '0' + second : second)}.${('00' + date.getMilliseconds()).slice(-3)}`;
}

export function formatDateYMDHMS(date) {
    if (date === undefined) {
        date = new Date();
    }
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return `${date.getFullYear()}/${((month < 10) ? '0' + month : month)}/${((day < 10) ? '0' + day : day)} ${((hour < 10) ? '0' + hour : hour)}:${((minute < 10) ? '0' + minute : minute)}:${((second < 10) ? '0' + second : second)}`
}

export function formatSceneIndexAndName(sceneIndex, sceneName, current) {
    let result = `${sceneIndex}: `;
    if (current) {
        result += '*';
    }
    return result + `"${sceneName}"`;
}
