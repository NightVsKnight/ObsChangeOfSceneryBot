
//
// https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#requests
// https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md#events
//
import OBSWebSocket from 'obs-websocket-js';
import { EventEmitter } from 'events';

import { configSecretsServerGet } from './config.js';
import { sendTextChannelMessage } from './discord.js';


function handleError(error, logFullError) {
    console.log(`handleError(error, logFullError=${logFullError})`);
    //if (logFullError) {
    console.error(`handleError: error="${error}"`, error);
    //} else {
    //    console.error('handleError: error.code', error.code);
    //}
    if (error == 'Error: Not connected') {
        //console.log(`handleError: error == 'Error: Not connected'; faking error.code = -1;`);
        error.code = -1;
    }
    switch(error.code) {
        case -1:
        case 'CONNECTION_ERROR':
        case 'NOT_CONNECTED': {
            obsReconnect();
            return true;
        }
    }
}

/**
 * Test:
 * /scene
 * expect current scene
 * @returns Promise
 */
export function obsGetScene() {
    console.log('obsGetScene()');
    return new Promise((resolve, reject) => {
        obs.call('GetSceneList')
            .then(data => {
                //console.log(`obsGetScene: data`, data);
                resolve(data.currentProgramSceneName);
            })
            .catch(error => {
                console.error('obsGetScene: error', error);
                handleError(error)
                reject(error);
            });
    });
}

/**
 * Test:
 * /scenes
 * expect list of all scenes
 * @returns Promise
 */
export function obsGetScenes() {
    console.log('obsGetScenes()');
    return new Promise((resolve, reject) => {
        obs.call('GetSceneList')
            .then(data => {
                //console.log(`obsGetScenes: data`, data);
                let scenes = data.scenes;
                if (scenes.length > 1) {
                    if (scenes[0].sceneIndex < scenes[scenes.length-1].sceneIndex) {
                        // OBS currently sends list in opposite order from what is displayed
                        // scenes: [
                        //   { sceneIndex: 0, sceneName: 'Bottom' },
                        //   { sceneIndex: 1, sceneName: 'Middle' },
                        //   { sceneIndex: 2, sceneName: 'Top' },
                        // }
                        // Reverse the list so that it is a *little bit* more intuitive:
                        // scenes: [
                        //   { sceneIndex: 2, sceneName: 'Top' },
                        //   { sceneIndex: 1, sceneName: 'Middle' },
                        //   { sceneIndex: 0, sceneName: 'Bottom' },
                        // }
                        scenes.reverse();
                    }
                }
                resolve([data.currentProgramSceneName, scenes]);
            })
            .catch(error => {
                console.error('obsGetScenes: error', error);
                handleError(error);
                reject(error);
            });
    });
}

/**
 * @param {*} sceneName 
 * @returns Promise
 */
export function obsSetScene(sceneName) {
    console.log(`obsSetScene("${sceneName}")`);
    return new Promise((resolve, reject) => {
        obs.call('SetCurrentProgramScene', { 'sceneName': sceneName })
            .then(data => {
                //console.log('obsSetScene: data', data);
                resolve();
            })
            .catch(error => {
                console.error('obsSetScene: error', error);
                handleError(error);
                reject(error);
            });
    });
}

/**
 * @returns Promise
 */
export function obsStreamStatus() {
    //console.log('obsStreamStatus()');
    return new Promise((resolve, reject) => {
        obs.call('GetStreamStatus')
            .then(data => {
                //console.log('obsStreamStatus: data', data);
                isStreamActive = data.outputActive;
                resolve(data);
            })
            .catch(error => {
                console.error('obsStreamStatus: error', error);
                handleError(error);
                reject(error);
            });
    });
}

/**
 * @returns Promise
 */
 export function obsStreamStart() {
    console.log('obsStreamStart()');
    return new Promise((resolve, reject) => {
        obs.call('StartStream')
            .then(data => {
                //console.log('obsStreamStart: data', data);
                resolve(data);
            })
            .catch(error => {
                console.error('obsStreamStart: error', error);
                handleError(error);
                reject(error);
            });
    });
}

/**
 * @returns Promise
 */
 export function obsStreamStop() {
    console.log('obsStreamStop()');
    return new Promise((resolve, reject) => {
        obs.call('StopStream')
            .then(data => {
                //console.log('obsStreamStop: data', data);
                resolve(data);
            })
            .catch(error => {
                console.error('obsStreamStop: error', error);
                handleError(error);
                reject(error);
            });
    });
}

var isConnected = false;
var isStreamActive = false;

export function obsIsConnected() {
    return isConnected;
}

export function obsIsStreamActive() {
    return isStreamActive;
}

/**
 * @returns Promise
 */
 export function obsConnect() {
    pendingReconnect = null;
    const { address, password } = configSecretsServerGet().obsConnectInfo;
    //console.log(`obs.connect(\"${address}\", \"${password}\")...`);
    isConnected = false;
    isStreamActive = false;
    return obs
        .connect(address, password)
        .then(() => {
            const text = 'obs.connect success!';
            console.log(`obsConnect: ${text}`);
            sendTextChannelMessage(text);
            obsStreamStatus();
        })
        .catch(error => {
            const text = 'obs.connect error!';
            console.error(`obsConnect: ${text}`, error);
            sendTextChannelMessage(text);
            handleError(error, false);
        });
}

const reconnectDelayMillis = 15000;
var pendingReconnect = null;

function obsReconnect() {
    if (pendingReconnect) {
        console.log(`obsReconnect: pendingReconnect != null; ignoring;`);
        return;
    }
    const text = `Restarting OBS and reconnecting OBSWebSocket (in ${reconnectDelayMillis / 1000} seconds)`;
    console.log(`obsReconnect: ${text}`);
    sendTextChannelMessage(text);
    pendingReconnect = setTimeout(obsConnect, reconnectDelayMillis);
}

var eventEmitter = null;
var obs = null;

export function obsInit() {
    console.log('obsInit()');
    if (obs != undefined) {
        return eventEmitter;
    }
    eventEmitter = new EventEmitter();
    obs = new OBSWebSocket();
    obs.on('ConnectionOpened', () => {
        isConnected = true;
        const message = 'OBS Connected!';
        console.log(`ConnectionOpened: ${message}`);
        eventEmitter.emit('ConnectionOpened');
    });
    obs.on('ConnectionClosed', error => {
        isConnected = false;
        isStreamActive = false;
        const text = 'OBS Disconnected!';
        console.log(`ConnectionClosed: ${text}`);
        eventEmitter.emit('ConnectionClosed');
    });
    obs.on('CurrentProgramSceneChanged', data => {
        reportCurrentScene();
    });
    obs.on('StreamStateChanged', data => {
        console.log('obsInit: StreamStateChanged data', data);
        isStreamActive = data.outputActive;
        eventEmitter.emit('StreamStateChanged', data);
    });
}

obsInit();
