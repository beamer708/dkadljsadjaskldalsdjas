# HowtoBot

Official Discord bot for @howtoerlc.

## Setup

1. Copy `.env` and fill in all values
2. Fill in all IDs in `config.json`
3. Run `npm install`
4. Run `npm start`

## Mamba Host Startup Command

```
bash -lc 'set +e
if [[ -n "$GIT_URL" ]]; then
  _GU="$GIT_URL"
  if [[ -n "$GIT_TOKEN" ]]; then
    _GU="${GIT_URL/https:\/\//https://x-access-token:${GIT_TOKEN}@}"
  elif [[ "$GIT_URL" == *github.com* ]]; then
    echo "[Mamba Panel] GIT_URL points to github.com but no access token is configured."
    echo "[Mamba Panel] For a private repo, connect your GitHub account from the server Variables page."
  fi
  if [[ -d .git ]]; then
    git remote set-url origin "$_GU" 2>/dev/null || true
    if ! git fetch --all 2>&1; then
      echo "[Mamba Panel] git fetch failed — continuing with existing files."
    elif ! git reset --hard "origin/${GIT_BRANCH:-main}" 2>&1; then
      echo "[Mamba Panel] git reset failed — continuing with existing files."
    fi
  else
    rm -rf .mamba-clone-tmp 2>/dev/null || true
    if git clone --depth 1 -b "${GIT_BRANCH:-main}" "$_GU" .mamba-clone-tmp 2>&1; then
      shopt -s dotglob nullglob
      for f in .mamba-clone-tmp/*; do
        bn=$(basename "$f")
        rm -rf -- "./$bn" 2>/dev/null || true
        mv -- "$f" "./$bn"
      done
      shopt -u dotglob nullglob
      rmdir .mamba-clone-tmp 2>/dev/null || true
      echo "[Mamba Panel] Repository cloned successfully."
    else
      rm -rf .mamba-clone-tmp 2>/dev/null || true
      echo "[Mamba Panel] git clone failed. Your existing files have been left untouched."
      echo "[Mamba Panel] Fix GIT_URL / GIT_BRANCH or reconnect GitHub, then restart the server."
    fi
  fi
fi
if [[ -f package-lock.json ]]; then npm ci --no-fund --no-audit;
elif [[ -f package.json ]]; then npm i --no-fund --no-audit; fi
npm run deploy
exec node "${STARTUP_FILE:-index.js}"'
```

## Post-Deploy Checklist

- [ ] Go to discord.dev/applications → your app → General Information
- [ ] Update the app name to: HowtoBot
- [ ] Update the description to: Official bot for @howtoerlc
- [ ] Go to the Bot tab and update the username to: HowtoBot
- [ ] Upload a new bot avatar (use /Media/GreenLogo.png from the website repo)
- [ ] Save all changes

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
| `/panel` | Staff | Posts the combined about + role panel |
| `/website-update` | Admin | Draft and post a website update announcement |
| `/resource-release` | Admin | Draft and post a resource release announcement |
