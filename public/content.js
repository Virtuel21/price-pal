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

  // Compter le nombre d'occurrences d'un prix sur la page et les mettre en surbrillance
  function countPriceOccurrences(price) {
    // D'abord, nettoyer les anciennes surbrillances
    removeHighlights();

    const textNodes = findTextNodesWithPrice(price);
    let count = 0;

    textNodes.forEach(node => {
      const matches = node.textContent.match(new RegExp(escapeRegex(price), 'g'));
      if (matches) {
        count += matches.length;

        // Mettre en surbrillance l'élément parent
        if (node.parentElement) {
          node.parentElement.classList.add('price-updater-highlight');
          node.parentElement.style.backgroundColor = '#fef08a'; // jaune clair
          node.parentElement.style.transition = 'background-color 0.3s';
          node.parentElement.style.outline = '2px solid #eab308'; // bordure jaune
          node.parentElement.style.outlineOffset = '2px';
        }
      }
    });

    return count;
  }

  // Supprimer toutes les surbrillances
  function removeHighlights() {
    const highlighted = document.querySelectorAll('.price-updater-highlight');
    highlighted.forEach(el => {
      el.classList.remove('price-updater-highlight');
      el.style.backgroundColor = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
  }

  // Remplacer un prix par un autre
  function replacePrices(oldPrice, newPrice) {
    // D'abord, nettoyer les surbrillances de recherche
    removeHighlights();

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

        // Marquer l'élément parent avec un effet vert temporaire
        if (node.parentElement) {
          node.parentElement.style.transition = 'background-color 0.5s';
          node.parentElement.style.backgroundColor = '#4ade80';
          node.parentElement.style.outline = '2px solid #22c55e';
          node.parentElement.style.outlineOffset = '2px';

          setTimeout(() => {
            node.parentElement.style.backgroundColor = '';
            node.parentElement.style.outline = '';
            node.parentElement.style.outlineOffset = '';
          }, 1500);
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

    if (request.action === 'clearHighlights') {
      try {
        removeHighlights();
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error clearing highlights:', error);
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
