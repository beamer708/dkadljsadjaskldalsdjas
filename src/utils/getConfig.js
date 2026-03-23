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
    // Sensitive — environment variables only, never from config.json
    token:                      process.env.BOT_TOKEN,
    apiSecret:                  process.env.API_SECRET,
    websiteUrl:                 process.env.WEBSITE_URL,

    // Non-sensitive — config.json with environment variable override
    clientId:                   process.env.CLIENT_ID                    || fileConfig.clientId,
    guildId:                    process.env.GUILD_ID                     || fileConfig.guildId,
    staffRoleId:                process.env.STAFF_ROLE_ID                || fileConfig.staffRoleId,
    supportCategoryId:          process.env.SUPPORT_CATEGORY_ID          || fileConfig.supportCategoryId,
    logChannelId:               process.env.LOG_CHANNEL_ID               || fileConfig.logChannelId,
    joinGateChannelId:          process.env.JOIN_GATE_CHANNEL_ID         || fileConfig.joinGateChannelId,
    ticketLogChannelId:         process.env.TICKET_LOG_CHANNEL_ID        || fileConfig.ticketLogChannelId,
    ticketTranscriptChannelId:  process.env.TICKET_TRANSCRIPT_CHANNEL_ID || fileConfig.ticketTranscriptChannelId,
    updatesChannelId:           process.env.UPDATES_CHANNEL_ID           || fileConfig.updatesChannelId,
    updatesPingRoleId:          process.env.UPDATES_PING_ROLE_ID         || fileConfig.updatesPingRoleId,
    applicationChannelId:       process.env.APPLICATION_CHANNEL_ID       || fileConfig.applicationChannelId,
    suggestionChannelId:        process.env.SUGGESTION_CHANNEL_ID        || fileConfig.suggestionChannelId,
    partnershipChannelId:       process.env.PARTNERSHIP_CHANNEL_ID       || fileConfig.partnershipChannelId,
    rolePanelChannelId:         process.env.ROLE_PANEL_CHANNEL_ID        || fileConfig.rolePanelChannelId,
    welcomeChannelId:           process.env.WELCOME_CHANNEL_ID           || fileConfig.welcomeChannelId,
    communityTeamRoleId:        process.env.COMMUNITY_TEAM_ROLE_ID       || fileConfig.communityTeamRoleId,
    betaTesterRoleId:           process.env.BETA_TESTER_ROLE_ID          || fileConfig.betaTesterRoleId,
    notificationsRoleId:        process.env.NOTIFICATIONS_ROLE_ID        || fileConfig.notificationsRoleId,
    updatesRoleId:              process.env.UPDATES_ROLE_ID              || fileConfig.updatesRoleId,
    serverNewsRoleId:           process.env.SERVER_NEWS_ROLE_ID          || fileConfig.serverNewsRoleId,
  }
}

module.exports = getConfig
