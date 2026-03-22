const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../../ticket-counter.json');

// Reads the current ticket counter from disk, creating the file if absent
function readCounter() {
  if (!fs.existsSync(COUNTER_FILE)) {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: 0 }, null, 2));
  }
  const raw = fs.readFileSync(COUNTER_FILE, 'utf-8');
  return JSON.parse(raw);
}

// Increments the counter, persists it, and returns a formatted ticket ID string
function generateTicketId() {
  const data = readCounter();
  data.count += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  return `TICKET-${String(data.count).padStart(3, '0')}`;
}

module.exports = { generateTicketId };
