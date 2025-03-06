document.addEventListener('DOMContentLoaded', function() {
  const captureCookiesBtn = document.getElementById('captureCookies');
  const downloadCookiesBtn = document.getElementById('downloadCookies');
  const statusDiv = document.getElementById('status');
  
  // Initially disable download button until cookies are captured
  downloadCookiesBtn.disabled = true;
  
  // Check if we have stored cookies
  chrome.storage.local.get(['linkedinCookies'], function(result) {
    if (result.linkedinCookies && result.linkedinCookies.length > 0) {
      downloadCookiesBtn.disabled = false;
    }
  });
  
  captureCookiesBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url;
      
      if (!currentUrl.includes('linkedin.com')) {
        showStatus('Please navigate to LinkedIn before capturing cookies.', 'error');
        return;
      }
      
      chrome.cookies.getAll({domain: '.linkedin.com'}, function(cookies) {
        if (cookies.length > 0) {
          chrome.storage.local.set({linkedinCookies: cookies}, function() {
            showStatus('Cookies captured successfully!', 'success');
            downloadCookiesBtn.disabled = false;
          });
        } else {
          showStatus('No LinkedIn cookies found. Are you logged in?', 'error');
        }
      });
    });
  });
  
  downloadCookiesBtn.addEventListener('click', function() {
    chrome.storage.local.get(['linkedinCookies'], function(result) {
      if (result.linkedinCookies && result.linkedinCookies.length > 0) {
        const cookiesJson = JSON.stringify(result.linkedinCookies, null, 2);
        const blob = new Blob([cookiesJson], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        chrome.downloads.download({
          url: url,
          filename: 'linkedin_cookies.json',
          saveAs: true
        });
        
        showStatus('Cookies downloaded. Use these with the scraper script.', 'success');
      } else {
        showStatus('No cookies found. Please capture cookies first.', 'error');
      }
    });
  });
  
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
});