const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { createObjectCsvWriter } = require('csv-writer');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('cookies', {
    alias: 'c',
    describe: 'Path to the LinkedIn cookies JSON file',
    type: 'string',
    demandOption: true
  })
  .option('type', {
    alias: 't',
    describe: 'Type of export: "leads" or "accounts"',
    choices: ['leads', 'accounts'],
    demandOption: true
  })
  .option('url', {
    alias: 'u',
    describe: 'Sales Navigator URL containing your search or list',
    type: 'string',
    demandOption: true
  })
  .option('output', {
    alias: 'o',
    describe: 'Output CSV filename',
    type: 'string',
    default: 'sales_navigator_export.csv'
  })
  .option('headless', {
    describe: 'Run in headless mode',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

// Function to add random delay to avoid detection
const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
};

// Main scraping function
async function scrapeLinkedIn() {
  console.log('Starting Sales Navigator Exporter...');
  
  // Read cookies from file
  let cookies;
  try {
    const cookiesFile = fs.readFileSync(argv.cookies, 'utf8');
    cookies = JSON.parse(cookiesFile);
    console.log(`Loaded ${cookies.length} cookies from file`);
  } catch (error) {
    console.error('Error reading cookies file:', error.message);
    process.exit(1);
  }
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: argv.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Set cookies
    await page.setCookie(...cookies);
    
    // Navigate to the Sales Navigator URL
    console.log(`