// Price Updater - Background Service Worker
// Service worker minimal pour l'extension

// Log de l'installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Price Updater installed successfully');
  } else if (details.reason === 'update') {
    console.log('Price Updater updated');
  }
});

// Garder le service worker actif
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Pour éviter que le service worker ne s'endorme
  sendResponse({ received: true });
  return true;
});
