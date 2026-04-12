const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '../../application-counter.json');

function readCounter() {
  if (!fs.existsSync(COUNTER_FILE)) {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: 0 }, null, 2));
  }
  return JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
}

function generateApplicationId() {
  const data = readCounter();
  data.count += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2));
  return `APP-${String(data.count).padStart(3, '0')}`;
}

module.exports = { generateApplicationId };
