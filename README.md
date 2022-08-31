# ObsChangeOfSceneryBot

**Shameless plug:** Seriously, one way you can really help out this project is to subscribe to NightVsKnight's [YouTube](https://www.youtube.com/channel/UCn8Ds6jeUzjxCPkMApg_koA) and/or [Twitch](https://www.twitch.tv/nightvsknight) channels. I will be showing off this project there from time to time, and getting new subscribers gives me a little morale boost to help me continue this project.

This repo is a hodgepodge of different but related bots with different capabilities each.

**The overall goal is to show how to automatically set an OBS Scene relevant to the active talker in a Discord [or one day Guilded] voice channel.**

See each folder for [hopefully] their own readme.

* js - JavaScript versions
  * [Discord](./js/Discord/)  
    The main/hero/halo app of this repo
  * [Guilded](./js/Guilded/)  
    An attempt at a Guilded version of the Discord bot, but at the  
    time of writing that bot their API did not support Active Talker.  
    Things may have changed...
* py - Python versions
  * [Discord](./py/Discord/)  
    * Barely even started, definitely nowhere near working Python version

## Commands
```
      help : This help output
    scenes : List the OBS scene #s and names
 scene [#] : Report or set the current OBS scene to scene #
         # : /scene #
       pin : Pin the current OBS scene (disable auto PTT scene switching)
     unpin : Unpin the currently pinned OBS scene (enable auto PTT scene switching)
 clear [#] : Clear last # messages, 100 by default *
stream [x] : on|start|off|stop, or report status
 title [t] : Set stream title to 't', or report title
    config : Show the config
      save : Save the config
```
