const path = require('path')

function getConfig() {
  let fileConfig = {}

  try {
    const configPath = path.join(__dirname, '../../config.json')
    fileConfig = require(configPath)
  } catch (err) {
    console.warn('config.json not found. Falling back to environment variables only.')
  }

  return {
    token:                     process.env.BOT_TOKEN                     || fileConfig.token,
    clientId:                  process.env.CLIENT_ID                     || fileConfig.clientId,
    guildId:                   process.env.GUILD_ID                      || fileConfig.guildId,
    apiSecret:                 process.env.API_SECRET                    || fileConfig.apiSecret,
    websiteUrl:                process.env.WEBSITE_URL                   || fileConfig.websiteUrl,
    staffRoleId:               process.env.STAFF_ROLE_ID                 || fileConfig.staffRoleId,
    supportCategoryId:         process.env.SUPPORT_CATEGORY_ID           || fileConfig.supportCategoryId,
    logChannelId:              process.env.LOG_CHANNEL_ID                || fileConfig.logChannelId,
    joinGateChannelId:         process.env.JOIN_GATE_CHANNEL_ID          || fileConfig.joinGateChannelId,
    ticketLogChannelId:        process.env.TICKET_LOG_CHANNEL_ID         || fileConfig.ticketLogChannelId,
    ticketTranscriptChannelId: process.env.TICKET_TRANSCRIPT_CHANNEL_ID  || fileConfig.ticketTranscriptChannelId,
    applicationChannelId:      process.env.APPLICATION_CHANNEL_ID        || fileConfig.applicationChannelId,
    suggestionChannelId:       process.env.SUGGESTION_CHANNEL_ID         || fileConfig.suggestionChannelId,
    updatesChannelId:          process.env.UPDATES_CHANNEL_ID            || fileConfig.updatesChannelId,
    updatesPingRoleId:         process.env.UPDATES_PING_ROLE_ID          || fileConfig.updatesPingRoleId,
    communityTeamRoleId:       process.env.COMMUNITY_TEAM_ROLE_ID        || fileConfig.communityTeamRoleId,
    betaTesterRoleId:          process.env.BETA_TESTER_ROLE_ID           || fileConfig.betaTesterRoleId,
  }
}

module.exports = getConfig
