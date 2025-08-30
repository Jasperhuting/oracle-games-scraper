#!/usr/bin/env node

/*

Usage:
  node getRiders.js --race tour-de-france --year 2025

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

// ---- Constants ----
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

// ---- Helpers: CLI parsing (no external deps) ----
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const part = argv[i];
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

function printHelpAndExit(code = 1) {
  console.error(`Usage: node getRiders.js --race <slug> --year <yyyy>\n\n` +
    `Example: node getRiders.js --race tour-de-france --year 2025\n\n` +
    `Supported race slugs:\n  - ${KNOWN_RACE_SLUGS.join('\n  - ')}\n`);
  process.exit(code);
}

// ---- Main ----
(async function main() {
  try {
    const { race, year, help } = parseArgs(process.argv);
    if (help) printHelpAndExit(0);

    // Support npm run style: npm run script --year=2025 (npm_config_year)
    const envYear = process.env.npm_config_year || process.env.year;
    const resolvedYearStr = year || envYear || String(new Date().getFullYear());

    if (!race) {
      console.error('Error: --race is required. --year is optional (defaults to current year).');
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

    const url = `https://www.procyclingstats.com/race/${race}/${yearNum}/startlist`;
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

    console.log(html);

    const $ = cheerio.load(html);

    const riders = [];

    $('.startlist_v4 > li').each((i, el) => {

      const team = {};

      const shirtUrl = $(el).find('.shirtCont').find('img').attr('src');

      const ridersCont = $(el).find('.ridersCont');

      team.image = shirtUrl;
      team.name = $(ridersCont).find('a.team').text().trim();
      team.shortName = $(ridersCont).find('a.team').attr('href').split('/')[1];
      team.riders = [];

      ridersCont.find('li').each((_, el) => {
        const rider = {};
        const $el = $(el);
        rider.name = $el.find('a').text().trim();
        rider.country = $el.find('.flag').attr('class').split(' ')[1];
        rider.startNumber = $el.find('.bib').text().trim();
        rider.dropout = Boolean($el.eq(0).hasClass('dropout'));
        team.riders.push(rider);
      });
      

      riders.push(team);  
    });



    // $('a[href^="/rider/"]').each((_, el) => {
    //   const $el = $(el);
    //   const name = $el.text().trim();
    //   const href = $el.attr('href');
    //   if (!name || !href) return;
    //   // Ignore anchors that are not part of the startlist block if possible by checking nearby context
    //   // but default to collecting unique rider profile links.
    //   const key = href.split('#')[0];
    //   if (seen.has(key)) return;
    //   seen.add(key);
    //   riders.push({ name, url: new URL(href, 'https://www.procyclingstats.com').toString() });
    // });

    // Basic heuristic: If no riders found, inform the user the page structure may have changed.
    if (riders.length === 0) {
      console.error('Warning: No riders found. The page structure may have changed or the startlist is not available yet.');
    }

    const output = {
      race,
      year: yearNum,
      source: url,
      count: riders.length,
      riders,
      scrapedAt: new Date().toISOString(),
    };

    // Print JSON to stdout
    console.log(JSON.stringify(output, null, 2));

    // Also write to file under scripts/output/
    const outDir = path.join(__dirname, 'output');
    const outFile = path.join(outDir, `startlist-${race}-${yearNum}.json`);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');
    console.error(`Saved: ${outFile}`);
  } catch (err) {
    console.error('Unexpected error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();