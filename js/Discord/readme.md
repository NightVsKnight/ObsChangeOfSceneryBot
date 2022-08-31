
**Shameless plug:** Seriously, one way you can really help out this project is to subscribe to NightVsKnight's [YouTube](https://www.youtube.com/channel/UCn8Ds6jeUzjxCPkMApg_koA) and/or [Twitch](https://www.twitch.tv/nightvsknight) channels. I will be showing off this project there from time to time, and getting new subscribers gives me a little morale boost to help me continue this project.

## Install
1. Create Discord App + Bot
  1. https://discord.com/developers/applications
  2. "New Application"
  3. Give it a name
  4. Bot, Add Bot, Yes
  5. Reset Token and Copy Token and paste it somewhere safe
  6. Enable: Presence Intent, Server Members Intent, Message Content Intent
2. Install node https://nodejs.org/en/download/
3. Install yarn https://yarnpkg.com/getting-started/install
4. Run PowerShell as Administrator
5. `corepack enable`
6. Exit Administrator PowerShell
7. Clone this repo
8. Run PowerShell
9. `Set-ExecutionPolicy -Scope CurrentUser Unrestricted`
10. `yarn install`
11. Edit secrets.json and add your bot token

## Run

1. `node .\index.js`
