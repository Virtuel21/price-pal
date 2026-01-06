// Price Updater - Background Service Worker

// Message handler for communication between popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchPrice') {
    handleFetchPrice(request.url, request.selector, request.regexCleanup)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'getEditorContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'getEditorContent' }, sendResponse);
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }

  if (request.action === 'setEditorContent') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'setEditorContent', 
          content: request.content 
        }, sendResponse);
      } else {
        sendResponse({ success: false, error: 'No active tab found' });
      }
    });
    return true;
  }

  if (request.action === 'checkDomain') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        try {
          const url = new URL(tabs[0].url);
          sendResponse({ success: true, domain: url.hostname, tabId: tabs[0].id });
        } catch (e) {
          sendResponse({ success: false, error: 'Invalid URL' });
        }
      } else {
        sendResponse({ success: false, error: 'No active tab' });
      }
    });
    return true;
  }
});

// Fetch price from a source URL using a background fetch or tab injection
async function handleFetchPrice(url, selector, regexCleanup) {
  try {
    // First, try direct fetch (works for public pages without CORS restrictions)
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    const price = extractPriceFromHTML(html, selector, regexCleanup);

    if (price) {
      return { success: true, price, rawValue: price, timestamp: new Date().toISOString() };
    } else {
      throw new Error('Price element not found with the given selector');
    }
  } catch (fetchError) {
    // If direct fetch fails (CORS), try opening in a new tab and scraping
    console.log('Direct fetch failed, trying tab injection:', fetchError.message);
    
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active: false }, (tab) => {
        const tabId = tab.id;
        
        // Wait for the page to load
        chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            
            // Inject a content script to extract the price
            chrome.scripting.executeScript({
              target: { tabId },
              func: (sel, cleanup) => {
                const element = document.querySelector(sel);
                if (element) {
                  let value = element.textContent || element.innerText || '';
                  if (cleanup) {
                    try {
                      value = value.replace(new RegExp(cleanup, 'g'), '');
                    } catch (e) {}
                  }
                  return value.trim();
                }
                return null;
              },
              args: [selector, regexCleanup],
            }).then((results) => {
              chrome.tabs.remove(tabId);
              
              if (results && results[0]?.result) {
                resolve({
                  success: true,
                  price: results[0].result,
                  rawValue: results[0].result,
                  timestamp: new Date().toISOString(),
                });
              } else {
                reject(new Error('Price element not found'));
              }
            }).catch((error) => {
              chrome.tabs.remove(tabId);
              reject(error);
            });
          }
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          chrome.tabs.remove(tabId).catch(() => {});
          reject(new Error('Timeout waiting for page to load'));
        }, 30000);
      });
    });
  }
}

// Parse HTML and extract price using selector
function extractPriceFromHTML(html, selector, regexCleanup) {
  // Create a DOM parser
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const element = doc.querySelector(selector);
  if (!element) return null;
  
  let value = element.textContent || element.innerText || '';
  
  if (regexCleanup) {
    try {
      value = value.replace(new RegExp(regexCleanup, 'g'), '');
    } catch (e) {
      console.error('Invalid regex cleanup pattern:', e);
    }
  }
  
  return value.trim();
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Price Updater installed');
    // Set default settings
    chrome.storage.sync.set({
      settings: {
        allowedDomains: ['localhost', '127.0.0.1'],
        defaultSelector: '.price',
        defaultRegexCleanup: '[€$£\\s]',
        safetyThreshold: 10,
        templates: [
          {
            id: 'json-price',
            name: 'JSON Price Field',
            oldPricePattern: '"price":\\s*"?([\\d.,]+)"?',
            isRegex: true,
            formatOption: 'dot',
          },
          {
            id: 'html-price',
            name: 'HTML Price Span',
            oldPricePattern: '([\\d.,]+)',
            isRegex: true,
            contextAnchorBefore: '<span class="price">',
            contextAnchorAfter: '</span>',
            formatOption: 'keep',
          },
        ],
      },
    });
  }
});
