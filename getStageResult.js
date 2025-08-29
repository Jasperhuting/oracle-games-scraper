#!/usr/bin/env node

/*

Usage:
  node getStageResult.js --race <slug> --stage <stage> [--year <yyyy>]
  npm run stage-vuelta stage=1 [year=2025]

Notes:
  - If --year or year is omitted, the current year is used.

Supported race slugs (argument to --race):
  - tour-de-france
  - giro-d-italia
  - vuelta-a-espana
  - world-championship
  - milano-sanremo
  - amstel-gold-race
  - tirreno-adriatico
  - liege-bastogne-liege
  - il-lombardia
  - la-fleche-wallone
  - paris-nice
  - paris-roubaix
  - volta-a-catalunya
  - dauphine
  - ronde-van-vlaanderen
  - gent-wevelgem
  - san-sebastian

Notes:
  - Requires Node.js v18+ (global fetch) and the 'cheerio' package.
*/

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

// __dirname replacement in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- CLI parsing (no external deps) ----
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
    // Support --key=value and key=value forms
    if (part.includes('=') && !part.startsWith('http')) {
      const [rawKey, ...rest] = part.split('=');
      const key = rawKey.replace(/^--/, '');
      const value = rest.join('=');
      if (key) args[key] = value === '' ? true : value;
      continue;
    }
    if (part.startsWith('--')) {
      const key = part.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const KNOWN_RACE_SLUGS = [
  'tour-de-france',
  'giro-d-italia',
  'vuelta-a-espana',
  'world-championship',
  'milano-sanremo',
  'amstel-gold-race',
  'tirreno-adriatico',
  'liege-bastogne-liege',
  'il-lombardia',
  'la-fleche-wallone',
  'paris-nice',
  'paris-roubaix',
  'volta-a-catalunya',
  'dauphine',
  'ronde-van-vlaanderen',
  'gent-wevelgem',
  'san-sebastian',
];

function printHelpAndExit(code = 1) {
  console.error(`Usage: node getStageResult.js --race <slug> --stage <stage> [--year <yyyy>]\n\n` +
    `Examples:\n  node getStageResult.js --race tour-de-france --stage 1 --year 2025\n  npm run stage-vuelta stage=1 year=2025\n  npm run stage-vuelta stage=1  (defaults to current year)\n\n` +
    `Supported race slugs:\n  - ${KNOWN_RACE_SLUGS.join('\n  - ')}\n`);
  process.exit(code);
}

(async function main() {
  try {
    const { race, year, stage, help } = parseArgs(process.argv);
    if (help) printHelpAndExit(0);

    // Support npm run style: `npm run script stage=1 year=2025`
    const envStage = process.env.npm_config_stage || process.env.stage;
    const envYear = process.env.npm_config_year || process.env.year;

    const resolvedStage = stage || envStage;
    const resolvedYearStr = year || envYear || String(new Date().getFullYear());

    if (!race || !resolvedStage) {
      console.error('Error: --race and --stage (or stage=...) are required.');
      printHelpAndExit(1);
    }

    const yearNum = Number(resolvedYearStr);
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 3000) {
      console.error('Error: --year must be a valid year, e.g., 2025');
      process.exit(1);
    }

    if (!KNOWN_RACE_SLUGS.includes(race)) {
      console.error(`Error: Unknown race slug '${race}'.`);
      printHelpAndExit(1);
    }

    const url = `https://www.procyclingstats.com/race/${race}/${yearNum}/stage-${resolvedStage}`;
    console.error(`Fetching: ${url}`);

    if (typeof fetch !== 'function') {
      console.error('This script requires Node 18+ for global fetch.');
      process.exit(1);
    }

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Node Script)' } });
    if (!res.ok) {
      console.error(`Request failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }
    const html = await res.text();

    const $ = cheerio.load(html);

    console.log($('.page-title > .imob').eq(0).text().trim());

    const stageResults = [];

    const getPlace = (el) => Number($(el).find('td').eq(0).text().trim());
    const getGc = (el) => $(el).find('td.fs11').eq(0).text().trim();
    const getTimeDifference = (el) => $(el).find('td.fs11').eq(1).text().trim();
    const getStartNumber = (el) => $(el).find('td.bibs').text().trim();
    const getCountry = (el) => $(el).find('td.ridername > .flag').attr('class').split(' ')[1];
    const getLastName = (el) => $(el).find('td.ridername > a span.uppercase').text().trim();
    const getFirstName = (el) => $(el).find('td.ridername > a').text().trim().split(' ').pop();
    const getTeam = (el) => $(el).find('td.cu600 > a').text().trim();
    const getShortName = (el) => $(el).find('td.cu600 > a').attr('href').split('/')[1];
    const getUciPoints = (el) => $(el).find('td.uci_pnt').text().trim();
    const getPoints = (el) => $(el).find('td.points').text().trim();
    const getQualificationTime = (el) => $(el).find('td.cu600 > .blue').text().trim();
    const getClass = (el) => $(el).find('td').eq(4).text().trim();
    
    const getTeamName = (el) => $(el).find('span.flag').next().text().trim();
    const getTeamNameShort = (el) => $(el).find('span.flag').next().attr('href').split('/')[1];

    const getTTTPlace = (el) => Number($(el).find('.mb_w100 .w10').text().trim());
    const getTTTTeamName = (el) => $(el).find('span.flag').next().text().trim();
    const getTTTTeamNameShort = (el) => $(el).find('span.flag').next().attr('href').split('/')[1];
    
    const getTTTSingleRiderFirstName = (el) => $(el).find('td > a').text().trim().split(' ').pop();
    const getTTTSingleRiderLastName = (el) => $(el).find('td > a span.uppercase').text().trim();
    

    const generalClassification = [];
    const pointsClassification = [];
    const mountainsClassification = [];
    const youthClassification = [];
    const teamClassification = [];

    if ($('.page-title > .imob').eq(0).text().trim().includes('TTT')) {

        const teamTimeTrial = $('#resultsCont > .resTab .ttt-results');
        const teamTimeTrialResults = [];


        teamTimeTrial.find('li:not(.hideIfMobile)').each((_, el) => {

            const team = {
                place: getTTTPlace(el),
                team: getTTTTeamName(el),
                shortName: getTTTTeamNameShort(el),
                riders: []
            }
            $(el).find('tbody > tr').each((_, elRider) => {
                    const rider = {
                        place: getTTTPlace(el),
                        firstName: getTTTSingleRiderFirstName(elRider),
                        lastName: getTTTSingleRiderLastName(elRider),
                        
                        // shortName: getTeamNameShort(el),
                        // class: getClass(el),
                    }
                    team.riders.push(rider)
                })
            
            teamTimeTrialResults.push(team);
        })


        stageResults.push(teamTimeTrialResults);
       
        


    } else {

    const stageResult = $('#resultsCont > .resTab').eq(0);
    

    stageResult.find('tbody > tr').each((_, el) => {
      const rider = {
        country: getCountry(el),
        lastName: getLastName(el),
        firstName: getFirstName(el),
        startNumber: getStartNumber(el),
        gc: getGc(el),
        place: getPlace(el),
        timeDifference: getTimeDifference(el),
        team: getTeam(el),
        shortName: getShortName(el),
        uciPoints: getUciPoints(el),
        points: getPoints(el),
        qualificationTime: getQualificationTime(el),
      }     
      stageResults.push(rider);  
    });

}

const generalClassificationResult = $('#resultsCont > .resTab').eq(1);
    const pointsClassificationResult = $('#resultsCont > .resTab').eq(2);
    const mountainsClassificationResult = $('#resultsCont > .resTab').eq(3);
    const youthClassificationResult = $('#resultsCont > .resTab').eq(4);
    const teamClassificationResult = $('#resultsCont > .resTab .general').eq(5);

    teamClassificationResult.find('tbody > tr').each((_, el) => {
        teamClassification.push({
            place: getPlace(el),
            team: getTeamName(el),
            shortName: getTeamNameShort(el),
            class: getClass(el),
        })
    })

    pointsClassificationResult.find('tbody > tr').each((_, el) => {
        pointsClassification.push({
            place: getPlace(el),
            rider: getLastName(el),
            team: getTeam(el),
            pointsTotal: Number($(el).find('td.cu600').next().text().trim()),
            points: Number($(el).find('td.green').text().trim().split('+')[1]),
        })
    })

    mountainsClassificationResult.find('tbody > tr').each((_, el) => {
        mountainsClassification.push({
            place: getPlace(el),
            rider: getLastName(el),
            team: getTeam(el),
            pointsTotal: Number($(el).find('td.cu600').next().text().trim()),
            points: Number($(el).find('td.green').text().trim()),
        })
    })

    youthClassificationResult.find('tbody > tr').each((_, el) => {

        const rider = {
          country: getCountry(el),
          lastName: getLastName(el),
          firstName: getFirstName(el),
          startNumber: getStartNumber(el),
          place: getPlace(el),
          team: getTeam(el),
          shortName: getShortName(el),
        }     
        youthClassification.push(rider);  
      });
  

    generalClassificationResult.find('tbody > tr').each((_, el) => {
      const rider = {   
        country: getCountry(el),
        lastName: getLastName(el),
        firstName: getFirstName(el),
        startNumber: getStartNumber(el),
        gc: getGc(el),
        place: getPlace(el),
        timeDifference: getTimeDifference(el),
        team: getTeam(el),
        shortName: getShortName(el),
        uciPoints: getUciPoints(el),
        points: getPoints(el),
        qualificationTime: getQualificationTime(el),
      }     
      generalClassification.push(rider);  
    });

    if (stageResults.length === 0) {
      console.error('Warning: No riders found. The page structure may have changed or the startlist is not available yet.');
    }

    const output = {
      race,
      year: yearNum,
      source: url,
      count: stageResults.length,
      stageResults,
      generalClassification,
      pointsClassification,
      mountainsClassification,
      youthClassification,
      teamClassification,
      scrapedAt: new Date().toISOString(),
    };

    // Print JSON to stdout
    // console.log(JSON.stringify(output, null, 2));

    // Also write to file under scripts/output/
    const outDir = path.join(__dirname, 'output');
    const yearDir = path.join(outDir, String(yearNum));
    const dir = path.join(yearDir, race);
    const stageDir = path.join(dir, String(resolvedStage));
    const outFile = path.join(stageDir, `results.json`);
    fs.mkdirSync(yearDir, { recursive: true });
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(stageDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
    console.error(`Saved: ${outFile}`);

 

  } catch (err) {
    console.error('Unexpected error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();