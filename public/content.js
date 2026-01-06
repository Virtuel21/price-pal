// Price Updater - Content Script
// Recherche et remplace les prix directement dans la page

(function() {
  'use strict';

  // Fonction pour trouver tous les nœuds de texte contenant un prix
  function findTextNodesWithPrice(price) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Ignorer les scripts, styles, et noscript
          if (node.parentElement &&
              (node.parentElement.tagName === 'SCRIPT' ||
               node.parentElement.tagName === 'STYLE' ||
               node.parentElement.tagName === 'NOSCRIPT')) {
            return NodeFilter.FILTER_REJECT;
          }

          // Vérifier si le nœud contient le prix
          if (node.textContent.includes(price)) {
            return NodeFilter.FILTER_ACCEPT;
          }

          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    return textNodes;
  }

  // Compter le nombre d'occurrences d'un prix sur la page
  function countPriceOccurrences(price) {
    const textNodes = findTextNodesWithPrice(price);
    let count = 0;

    textNodes.forEach(node => {
      const matches = node.textContent.match(new RegExp(escapeRegex(price), 'g'));
      if (matches) {
        count += matches.length;
      }
    });

    return count;
  }

  // Remplacer un prix par un autre
  function replacePrices(oldPrice, newPrice) {
    const textNodes = findTextNodesWithPrice(oldPrice);
    let count = 0;

    textNodes.forEach(node => {
      const originalText = node.textContent;
      const regex = new RegExp(escapeRegex(oldPrice), 'g');
      const matches = originalText.match(regex);

      if (matches) {
        const newText = originalText.replace(regex, newPrice);
        node.textContent = newText;
        count += matches.length;

        // Marquer l'élément parent pour feedback visuel (optionnel)
        if (node.parentElement) {
          node.parentElement.style.transition = 'background-color 0.5s';
          node.parentElement.style.backgroundColor = '#4ade80';
          setTimeout(() => {
            node.parentElement.style.backgroundColor = '';
          }, 1000);
        }
      }
    });

    return count;
  }

  // Échapper les caractères spéciaux pour RegExp
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Écouter les messages depuis le popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'findPrices') {
      try {
        const count = countPriceOccurrences(request.oldPrice);
        sendResponse({
          success: true,
          count: count,
        });
      } catch (error) {
        console.error('Error finding prices:', error);
        sendResponse({
          success: false,
          error: error.message,
        });
      }
      return true;
    }

    if (request.action === 'replacePrices') {
      try {
        const count = replacePrices(request.oldPrice, request.newPrice);
        sendResponse({
          success: true,
          count: count,
        });
      } catch (error) {
        console.error('Error replacing prices:', error);
        sendResponse({
          success: false,
          error: error.message,
        });
      }
      return true;
    }

    if (request.action === 'ping') {
      sendResponse({ success: true });
      return true;
    }
  });

  // Log que le content script est chargé
  console.log('[Price Updater] Content script loaded and ready');
})();
