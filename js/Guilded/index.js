
// config: OBS
const obsConnectInfo = { address: 'localhost:4444', password: 'xxx' };
// config: Guilded
const token = 'xxx';
const textChannelId = 'xxx'; // #ChangeOfScenery

import WebSocket from 'ws';
import OBSWebSocket from 'obs-websocket-js';
import fetch from 'node-fetch';

// OBS

function getObsScenes(next) {
  let currentSceneName = null;
  let scenes = [];
  return obs.send('GetCurrentScene')
    .then(data => {
      const currentSceneName = data.name;
      return obs.send('GetSceneList')
        .then(data => {
          data.scenes.forEach(scene => {
            scenes.push(scene);
          });    
          next(currentSceneName, scenes);
        })
        .catch(err => {
          console.log('GetSceneList ERROR', err);
          next(currentSceneName, scenes);
        });
    })
    .catch(err => {
      console.log('GetCurrentScene ERROR', err);
      next(currentSceneName, scenes);
    });
}

function initObs() {
  const obs = new OBSWebSocket();
  obs.connect(obsConnectInfo)
    .catch(err => {
      console.log('obs.connect ERROR', err);
    });
  obs.on('SwitchScenes', data => {
    const sceneName = data.sceneName;
    const message = `New Active Scene: "${sceneName}"`;
    console.log(message);
    sendChannelMessage(textChannelId, message);
  });
  obs.on('error', err => {
    console.error('socket error:', err);
  });
  // TODO:(pv) Handle disconnect/reconnect/etc...
  return obs;
}

const obs = initObs();


// Discord/Guilded

const commandPrefix = '/';

function commandListScenes(args) {
  getObsScenes((currentSceneName, scenes) => {
    let message = 'Scenes:\n';//```\n';
    scenes.forEach((scene, index) => {
      message += `${index}: `;
      const sceneName = scene.name;
      if (sceneName == currentSceneName) {
        message += '*';
      }
      message += `"${sceneName}"\n`;
    });
    //message += '\n```';
    //console.log('list message', message);
    sendChannelMessage(textChannelId, message);
  });
}

function commandSetScene(args) {
  let sceneNum = args[0];
  console.log('commandSetScene sceneNum', sceneNum);
  //sendChannelMessage(textChannelId, 'TODO:(pv) OBS websocket to change scene');
  getObsScenes((currentSceneName, scenes) => {
    console.log('commandSetScene currentSceneName', currentSceneName);
    if (sceneNum === undefined) {
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        console.log('commandSetScene scene.name', scene.name);
        if (scene.name == currentSceneName) {
          sceneNum = i;
          break;
        }
      }
      sendChannelMessage(textChannelId, `Current Scene = ${sceneNum} : "${currentSceneName}"`);
      return;
    } else if (sceneNum > scenes.length) {
      sceneNum = scenes.length - 1;
    }
    const scene = scenes[sceneNum];
    const sceneName = scene.name;
    obs.send('SetCurrentScene', {
        'scene-name': sceneName
      })
      .then(data => {
        console.log('SetCurrentScene data', data);
      })
      .catch(err => {
        console.log('SetCurrentScene ERROR', err);
      });
    });
}

async function sendChannelMessage(channelId, message) {
  const url = `https://www.guilded.gg/api/v1/channels/${channelId}/messages`;
  const data = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-type': 'application/json',
    },
    body: JSON.stringify({ content: message })
  };
  try {
    const response = await fetch(url, data);
    const responseData = await response.json();
  } catch (error) {
    console.log('sendMessage error', error);
  }
}

function initGuilded() {
  const guilded = new WebSocket('wss://api.guilded.gg/v1/websocket', {
    headers: {
      Authorization: `Bearer ${token}`
    },
  });
  guilded.on('open', function() {
    console.log('connected to Guilded!');
    sendChannelMessage(textChannelId, 'ChangeOfSceneray Bot at your service!\nCommands:\n/list\n/scene #\n');
  });
  guilded.on('message', function incoming(data) {
    const {t: eventType, d: eventData} = JSON.parse(data);
    if (eventType === 'ChatMessageCreated') {
      const {message: {id: messageId, content, channelId}} = eventData;
      if (!content.startsWith(commandPrefix)) return;
      if (channelId != textChannelId) return;
      let [commandName, ...args] = content.slice(commandPrefix.length).trim().split(/ +/);
      commandName = commandName.toLowerCase();
      console.log('commandName', commandName);
      console.log('args', args);
      if (content.indexOf('/list') == 0) {
        commandListScenes(args);
      } else if (content.indexOf('/scene') == 0) {
        commandSetScene(args);
      }
    }
  });
  return guilded;
}

const guilded = initGuilded();
