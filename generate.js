const fetch = require('node-fetch');
const fs = require('fs').promises;

const calendarTitle = 'BCJ - 2022/23 Winter ASHL Schedule';

async function generate() {
  const apiKey = await getApiKey();
  const schedule = await getSchedule(apiKey);
  const gameIds = getGameIds(schedule);
  const icalString = await getIcalString(gameIds);
  const processedIcalString = processIcalString(icalString);
  await generateFiles(processedIcalString);
};

async function getApiKey() {
  const response = await fetch('https://lscluster.hockeytech.com/statview-1.3/js/client/canlan/base.js?ver=6.0.2');
  const data = await response.text();
  const apiKey = data.match(/var\s+appKey\s+=\s+['"`](.*?)['"`];/)[1];
  console.log(`API Key: ${apiKey}`);
  return apiKey;
}

async function getSchedule(apiKey) {
  const response = await fetch(`https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=20632&season=247&month=-1&location=homeaway&key=${apiKey}&client_code=c-burnaby&site_id=0&league_id=14&division_id=816&lang=en&callback=angular.callbacks._3`);
  const data = await response.text();
  const schedule = JSON.parse(data.match(/\((.*)\)/)[1]);
  console.log(`Schedule: ${JSON.stringify(schedule, null, 2)}`);
  return schedule;
}

function getGameIds(schedule) {
  const gameIds = schedule[0].sections[0].data.map(game => game.row.game_id);
  console.log(`Game IDs: ${gameIds}`);
  return gameIds;
}

async function getIcalString(gameIds) {
  const response = await fetch(`https://lscluster.hockeytech.com/components/calendar/ical_add_games.php?client_code=c-burnaby&game_ids=${gameIds.join(',')}`);
  const icalString = await response.text();
  console.log(`iCal String:\n\n${icalString}\n\n`);
  return icalString;
}

function processIcalString(icalString) {
  // add a name to the calendar
  if (/X-WR-CALNAME/.test(icalString)) {
    icalString = icalString.replace(/X-WR-CALNAME.*\n/, 'X-WR-CALNAME:BCJ ASHL Winter \n');
  } else {
    icalString = icalString.replace(/BEGIN:VCALENDAR/, 'BEGIN:VCALENDAR\nX-WR-CALNAME:BCJ ASHL Schedule');
  }

  // change the duration to 75 minutes
  icalString = icalString.replace(/DTEND.*\n/g, 'DURATION:PT1H15M\n');

  console.log(`Processed iCal String:\n\n${icalString}\n\n`);

  return icalString;
}

async function generateFiles(icalString) {
  await fs.mkdir('dist', { recursive: true });
  await fs.writeFile('dist/schedule.ics', icalString);
  await fs.writeFile('dist/index.html', `<!DOCTYPE html><html><head><meta charset="utf-8"><title>🏒</title></head><body><h1>🏒</h1></body></html>`);
}

generate();