import fs from 'fs';
import { quote, stringify } from './common.js';

const pathConfig = './configs/config.json';
const pathSecrets = './configs/secrets.json';

let config;
let secrets;

export function configGet() {
    return config;
};

export function configGetCopyAbbreviated() {
    const configCopy = JSON.parse(JSON.stringify(config));
    delete configCopy.secrets;
    return configCopy;
}

let isSaving = false;

export function configSave() {
    console.log('configSave()');

    isSaving = true;

    configSaveSecrets();

    delete config.secrets;

    fs.writeFileSync(pathConfig, stringify(config), {encoding: 'utf8'});
    config.secrets = secrets;
}

function configSaveSecrets() {
    console.log('configSaveSecrets()');
    fs.writeFileSync(pathSecrets, stringify(secrets), {encoding: 'utf8'});
}

function configLoad() {
    console.log('configLoad()');
    config = JSON.parse(fs.readFileSync(pathConfig, 'utf8'));
    configLoadSecrets();
}

function configLoadSecrets() {
    console.log('configLoadSecrets()');
    secrets = JSON.parse(fs.readFileSync(pathSecrets, 'utf8'));
    config.secrets = secrets;
}

let configSaveDebounce;

function debounceConfigFileChanged(eventType, filename) {
    clearTimeout(configSaveDebounce);
    configSaveDebounce = setTimeout(() => {
        console.log(`debounceConfigFileChanged: eventType=${quote(eventType)}, filename=${quote(filename)}`);
        if (isSaving) {
            isSaving = false;
            return;
        }
        console.log(`debounceConfigFileChanged: DEBOUNCED; re-loading...`);
        configLoad();
    }, 1000);
}

function configInit() {
    console.log('configInit()');
    configLoad();
    fs.watch(pathConfig, { persistent:true }, debounceConfigFileChanged);
    fs.watch(pathSecrets, { persistent:true }, debounceConfigFileChanged);
}

configInit();

export function configServerGet() {
    return config.servers[config.serverToUse];
}

export function configServerProfileNameGet() {
    return configServerGet().profile;
}

export function configServerProfilesGet() {
    return configServerGet().profiles;
}

export function configServerProfileGet() {
    return configServerProfilesGet()[configServerProfileNameGet()]
}

export function configSecretsServerGet() {
    return config.secrets.servers[config.serverToUse];
}