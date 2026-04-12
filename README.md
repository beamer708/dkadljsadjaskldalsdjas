# HowtoBot

Official Discord bot for @howtoerlc.

## Setup

1. Copy `.env` and fill in all values
2. Fill in all IDs in `config.json`
3. Run `npm install`
4. Run `npm start`

## Mamba Host Startup Command
npm start

## Environment Variables
See `.env` for all required variables with descriptions.

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | Discord bot token from the Developer Portal |
| `API_SECRET` | Yes | Shared secret for website API requests — must match your website env |
| `WEBSITE_URL` | No | Your Vercel website URL — used for CORS (defaults to `*` in dev) |
| `SERVER_PORT` | No | Express server port (default: `3001`) |
| `CLIENT_ID` | No | Discord application ID — can also be set in `config.json` |
| `GUILD_ID` | No | Discord server ID — can also be set in `config.json` |

## Config
See `config.json` for all channel and role IDs.

## Forum Channels
`staffForumChannelId` and `suggestionForumChannelId` must be set to
Discord Forum channel IDs (not regular text channels).

Staff applications and suggestions are posted as individual forum threads.
Each submission creates a new thread with voting/action buttons.

## Privileged Intents
Enable the following in the Discord Developer Portal under your app > Bot > Privileged Gateway Intents:
- **Server Members Intent** — required for join logging and role change tracking
- **Message Content Intent** — required for message edit/delete logging

## Commands

| Command | Permission | Description |
|---------|------------|-------------|
| `/open-ticket` | Anyone | Posts the support panel to the current channel |
| `/close-ticket` | Staff | Closes the current ticket channel and generates a transcript |
| `/about-panel` | Staff | Posts the @howtoerlc about panel |
| `/panel` | Staff | Posts the combined about + role panel |
| `/role-panel` | Admin | Posts the notification role toggle panel |
| `/website-update` | Admin | Draft and post a website update announcement |
| `/resource-release` | Admin | Draft and post a resource release announcement |
