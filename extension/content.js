// This script runs on LinkedIn Sales Navigator pages
console.log("Sales Navigator Exporter: Content script loaded");

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkLoginStatus") {
    // Check if we're logged into Sales Navigator
    const isLoggedIn = document.querySelector('.global-nav__me') !== null;
    sendResponse({isLoggedIn: isLoggedIn});
  }
});