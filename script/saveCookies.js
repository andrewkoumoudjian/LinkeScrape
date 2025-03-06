const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const readline = require('readline');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Creates an interface for command-line input
 */
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 * @param {readline.Interface} rl - Readline interface
 * @param {string} question - Question to prompt
 * @returns {Promise<string>} User input
 */
function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

/**
 * Saves LinkedIn cookies after manual login
 */
async function saveCookies() {
  console.log("=== LinkedIn Cookie Saver ===");
  console.log("This tool will help you save your LinkedIn cookies for later use.");
  console.log("You'll need to manually log in to LinkedIn when the browser opens.");
  
  const rl = createInterface();
  
  try {
    const outputPath = await prompt(rl, "Where to save cookies? (default: ./linkedin_cookies.json): ") || './linkedin_cookies.json';
    
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--window-size=1280,800', '--disable-notifications']
    });
    
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36'
    );
    
    // Navigate to LinkedIn
    console.log("Opening LinkedIn. Please log in manually...");
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2' });
    
    // Wait for user to log in manually
    console.log("Please log in to LinkedIn in the browser window.");
    console.log("When you're done and see your LinkedIn homepage, press Enter to continue...");
    await prompt(rl, "");
    
    // Check if login was successful
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('.global-nav__me-photo') || 
             !!document.querySelector('.profile-rail-card__actor-link');
    });
    
    if (!isLoggedIn) {
      console.log("It seems you're not logged in. Please make sure you're logged in before continuing.");
      console.log("Press Enter to try again, or Ctrl+C to exit");
      await prompt(rl, "");
      
      // Check again
      const isLoggedInRetry = await page.evaluate(() => {
        return !!document.querySelector('.global-nav__me-photo') || 
               !!document.querySelector('.profile-rail-card__actor-link');
      });
      
      if (!isLoggedInRetry) {
        throw new Error("Could not detect successful login.");
      }
    }
    
    // Get cookies
    const cookies = await page.cookies();
    
    // Save cookies to file
    await fs.writeFile(outputPath, JSON.stringify(cookies, null, 2));
    
    console.log(`Cookies saved to ${outputPath}`);
    console.log("You can now use these cookies for authentication in the main script.");
    
    await browser.close();
    
  } catch (error) {
    console.error("Error saving cookies:", error);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  saveCookies();
}

module.exports = { saveCookies };