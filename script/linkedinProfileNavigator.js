const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Navigates LinkedIn to collect profile data using saved cookies
 * @param {Object} options Configuration options
 * @param {number} options.maxProfiles Maximum number of profiles to visit
 * @param {number} options.minDelay Minimum delay between actions in ms
 * @param {number} options.maxDelay Maximum delay between actions in ms
 * @param {string} options.saveDirectory Directory to save results
 * @param {string} options.cookiesPath Path to the saved cookies file
 * @returns {Promise<Array>} Collected profile data
 */
async function navigateLinkedInProfiles(options = {}) {
  const {
    maxProfiles = 5,
    minDelay = 2000,
    maxDelay = 5000,
    saveDirectory = './data',
    cookiesPath = './linkedin_cookies.json'
  } = options;
  
  console.log("Starting LinkedIn profile navigation with cookies...");
  
  // Create session ID for this run
  const sessionId = uuidv4().substring(0, 8);
  console.log(`Session ID: ${sessionId}`);
  
  // Ensure save directory exists
  try {
    await fs.mkdir(saveDirectory, { recursive: true });
  } catch (err) {
    console.log(`Save directory already exists: ${saveDirectory}`);
  }
  
  // Check if cookies file exists
  try {
    await fs.access(cookiesPath);
  } catch (err) {
    throw new Error(`Cookies file not found at ${cookiesPath}. Please run saveCookies.js first.`);
  }
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: [
      '--window-size=1280,800',
      '--disable-notifications',
      '--no-sandbox'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
    );
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Load cookies
    const cookiesString = await fs.readFile(cookiesPath);
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    
    // Random delay function to mimic human behavior
    const randomDelay = async () => {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      await page.waitForTimeout(delay);
    };
    
    // Go to LinkedIn to verify cookies worked
    console.log("Navigating to LinkedIn...");
    await page.goto('https://www.linkedin.com', {
      waitUntil: 'networkidle2'
    });
    
    // Check if login was successful
    const isLoggedIn = await page.evaluate(() => {
      // Check for elements that only appear when logged in
      return !!document.querySelector('.global-nav__me-photo') || 
             !!document.querySelector('.profile-rail-card__actor-link');
    });
    
    if (!isLoggedIn) {
      console.error("Login with cookies failed. Please refresh your cookies.");
      await page.screenshot({ path: `${saveDirectory}/login-failed-${sessionId}.png` });
      throw new Error("Cookie authentication failed");
    }
    
    console.log("Successfully authenticated with cookies");
    await randomDelay();
    
    // Navigate to sales navigator or leads page
    console.log("Navigating to Sales Navigator...");
    await page.goto('https://www.linkedin.com/sales/lead-dashboard', {
      waitUntil: 'networkidle2'
    });
    
    // Wait for profile links to appear
    await page.waitForSelector('a[data-sales-action]', { timeout: 30000 })
      .catch(() => console.log("Warning: Couldn't find profile links with expected selector"));
    
    await randomDelay();
    
    // Find all profile links using the structure shared in your HTML sample
    const profileLinks = await page.$$eval(
      'a[id^="dashboard-recommendations-name-link"]', 
      links => links.map(link => link.href)
    );
    
    console.log(`Found ${profileLinks.length} profile links`);
    
    if (profileLinks.length === 0) {
      console.log("No profile links found. This could indicate:");
      console.log("- The page structure has changed");
      console.log("- You're not viewing a page with profile recommendations");
      console.log("- Login was unsuccessful or requires verification");
      
      // Take screenshot for debugging
      await page.screenshot({ path: `${saveDirectory}/error-no-links-${sessionId}.png` });
    }
    
    // Visit each profile
    const profilesData = [];
    
    for (let i = 0; i < Math.min(profileLinks.length, maxProfiles); i++) {
      console.log(`Visiting profile ${i+1}/${Math.min(profileLinks.length, maxProfiles)}`);
      
      try {
        // Navigate to individual profile
        await page.goto(profileLinks[i], { waitUntil: 'networkidle2' });
        await randomDelay();
        
        // Take screenshot of profile (optional)
        await page.screenshot({ 
          path: `${saveDirectory}/profile-${i+1}-${sessionId}.png`,
          fullPage: false
        });
        
        // Extract profile data
        const profileData = await page.evaluate(() => {
          // This runs in browser context
          // Look for both Sales Navigator and regular LinkedIn profile structures
          
          // For Sales Navigator
          const nameElement = document.querySelector('h1.profile-topcard-person-entity__name, span._lead-detail-entity-details_ocf42k');
          const titleElement = document.querySelector('.profile-topcard__headline-item');
          const companyElement = document.querySelector('.profile-topcard__current-company, span[data-anonymize="company-name"]');
          
          // For regular LinkedIn profile
          const altNameElement = document.querySelector('h1.text-heading-xlarge');
          const altTitleElement = document.querySelector('div.text-body-medium');
          const altCompanyElement = document.querySelector('span.text-body-small[aria-hidden="true"]');
          
          return {
            name: nameElement ? nameElement.textContent.trim() : 
                  altNameElement ? altNameElement.textContent.trim() : 'Name not found',
            title: titleElement ? titleElement.textContent.trim() : 
                   altTitleElement ? altTitleElement.textContent.trim() : 'Title not found',
            company: companyElement ? companyElement.textContent.trim() : 
                     altCompanyElement ? altCompanyElement.textContent.trim() : 'Company not found',
            profileUrl: window.location.href
          };
        });
        
        profilesData.push({
          url: profileLinks[i],
          ...profileData,
          timestamp: new Date().toISOString()
        });
        
        // Save data incrementally to avoid data loss
        await fs.writeFile(
          `${saveDirectory}/profile-${i+1}-${sessionId}.json`, 
          JSON.stringify(profileData, null, 2)
        );
        
        // Add longer delay between profiles
        await page.waitForTimeout(minDelay * 2 + Math.random() * (maxDelay * 2));
        
      } catch (error) {
        console.error(`Error processing profile ${i+1}:`, error.message);
        await page.screenshot({ path: `${saveDirectory}/error-profile-${i+1}-${sessionId}.png` });
      }
    }
    
    // Save complete dataset
    await fs.writeFile(
      `${saveDirectory}/profiles-${sessionId}.json`,
      JSON.stringify(profilesData, null, 2)
    );
    
    console.log(`Data collection complete. Results saved to ${saveDirectory}/profiles-${sessionId}.json`);
    return profilesData;
    
  } catch (error) {
    console.error("Error during LinkedIn navigation:", error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { navigateLinkedInProfiles };

// Run directly if called from command line
if (require.main === module) {
  navigateLinkedInProfiles({
    maxProfiles: process.env.MAX_PROFILES ? parseInt(process.env.MAX_PROFILES) : 5,
    cookiesPath: process.env.COOKIES_PATH || './linkedin_cookies.json'
  }).then(() => process.exit(0));
}