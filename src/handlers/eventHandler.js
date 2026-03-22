const fs = require('fs');
const path = require('path');

// Reads every .js file in src/events and binds each to the appropriate client event
async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '../events');
  const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const event = require(path.join(eventsPath, file));
    if (!event.name || !event.execute) {
      console.warn(`[EventHandler] Skipping ${file} — missing name or execute export.`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    console.log(`[EventHandler] Registered event: ${event.name}`);
  }
}

module.exports = { loadEvents };
