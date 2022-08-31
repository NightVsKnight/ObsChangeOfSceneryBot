#
# Skunkworks; Not Yet Working
#

# Check out https://github.com/Gorialis/discord.py/tree/voice-recv-mk3

token = 'xxx'


#token = 'redacted'

# import sys
# sys.path.insert(1, '/path/to/application/app/folder')

import discord
intents = discord.Intents.default()
print(f'intents.voice_states={intents.voice_states}')
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'We have logged in as {client.user}')
    for channel in client.get_all_channels():
        if isinstance(channel, discord.VoiceChannel) and channel.name == 'General':
            print(f'Connecting to VoiceChannel "{channel}"')
            voiceClient = await channel.connect()
            

@client.event
async def on_voice_state_update(member, prev, cur):
    print(f"on_voice_state_update({member}, {prev}, {cur})")

client.run(token)