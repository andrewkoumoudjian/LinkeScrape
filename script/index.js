const { navigateLinkedInProfiles } = require('./linkedinProfileNavigator');
const { saveCookies } = require('./saveCookies');
require('dotenv').config();

async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'save-cookies':
        await saveCookies();
        break;
        
      case 'collect-data':
      default:
        // Configure options
        const options = {
          maxProfiles: process.env.MAX_PROFILES ? parseInt(process.env.MAX_PROFILES) : 5,
          minDelay: process.env.MIN_DELAY ? parseInt(process.env.MIN_DELAY) : 2000,
          maxDelay: process.env.MAX_DELAY ? parseInt(process.env.MAX_DELAY) : 5000,
          saveDirectory: process.env.SAVE_DIRECTORY || './data',
          cookiesPath: process.env.COOKIES_PATH || './linkedin_cookies.json'
        };
        
        console.log("Starting LinkedIn profile data collection with options:");
        console.log(JSON.stringify(options, null, 2));
        
        const profileData = await navigateLinkedInProfiles(options);
        
        console.log('Successfully collected data for profiles:');
        console.log(JSON.stringify(profileData.map(p => p.name), null, 2));
        break;
    }
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main();