// Price Updater - Content Script
// Recherche et remplace les prix directement dans la page

(function() {
  'use strict';

  // Fonction pour trouver tous les textarea et inputs contenant un prix
  function findTextFieldsWithPrice(price) {
    const fields = [];

    // Fonction pour chercher dans un document
    function searchInDocument(doc) {
      // Chercher dans les textarea
      const textareas = doc.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        if (textarea.value.includes(price)) {
          fields.push({ type: 'textarea', element: textarea });
        }
      });

      // Chercher dans les input text
      const inputs = doc.querySelectorAll('input[type="text"], input:not([type])');
      inputs.forEach(input => {
        if (input.value.includes(price)) {
          fields.push({ type: 'input', element: input });
        }
      });

      // Chercher dans les contenteditable
      const editables = doc.querySelectorAll('[contenteditable="true"]');
      editables.forEach(editable => {
        if (editable.textContent.includes(price)) {
          fields.push({ type: 'contenteditable', element: editable });
        }
      });
    }

    // Chercher dans le document principal
    searchInDocument(document);

    // Chercher dans les iframes accessibles
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            searchInDocument(iframe.contentDocument);
          }
        } catch (e) {
          console.log('Cannot access iframe (cross-origin):', e);
        }
      });
    } catch (e) {
      console.log('Error accessing iframes:', e);
    }

    return fields;
  }

  // Fonction pour trouver tous les nœuds de texte contenant un prix
  function findTextNodesWithPrice(price) {
    const textNodes = [];

    // Fonction pour parcourir un document (principal ou iframe)
    function walkDocument(doc) {
      if (!doc.body) return;

      const walker = doc.createTreeWalker(
        doc.body,
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
    }

    // Parcourir le document principal
    walkDocument(document);

    // Parcourir les iframes accessibles
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentDocument) {
            walkDocument(iframe.contentDocument);
          }
        } catch (e) {
          // Iframe cross-origin, on ne peut pas y accéder
          console.log('Cannot access iframe (cross-origin):', e);
        }
      });
    } catch (e) {
      console.log('Error accessing iframes:', e);
    }

    return textNodes;
  }

  // Compter le nombre d'occurrences d'un prix sur la page et les mettre en surbrillance
  function countPriceOccurrences(price) {
    // D'abord, nettoyer les anciennes surbrillances
    removeHighlights();

    const regex = new RegExp(escapeRegex(price), 'g');
    let count = 0;

    // Compter dans les nœuds de texte normaux
    const textNodes = findTextNodesWithPrice(price);
    textNodes.forEach(node => {
      const matches = node.textContent.match(regex);
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

    // Compter dans les champs de texte (textarea, input, contenteditable)
    const textFields = findTextFieldsWithPrice(price);
    textFields.forEach(field => {
      const content = field.type === 'contenteditable' ? field.element.textContent : field.element.value;
      const matches = content.match(regex);
      if (matches) {
        count += matches.length;

        // Mettre en surbrillance le champ
        field.element.classList.add('price-updater-highlight');
        field.element.style.backgroundColor = '#fef08a';
        field.element.style.transition = 'background-color 0.3s';
        field.element.style.outline = '2px solid #eab308';
        field.element.style.outlineOffset = '2px';
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

    const regex = new RegExp(escapeRegex(oldPrice), 'g');
    let count = 0;

    // Remplacer dans les nœuds de texte normaux
    const textNodes = findTextNodesWithPrice(oldPrice);
    textNodes.forEach(node => {
      const originalText = node.textContent;
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

    // Remplacer dans les champs de texte (textarea, input, contenteditable)
    const textFields = findTextFieldsWithPrice(oldPrice);
    textFields.forEach(field => {
      const isContentEditable = field.type === 'contenteditable';
      const originalContent = isContentEditable ? field.element.textContent : field.element.value;
      const matches = originalContent.match(regex);

      if (matches) {
        const newContent = originalContent.replace(regex, newPrice);

        if (isContentEditable) {
          field.element.textContent = newContent;
        } else {
          field.element.value = newContent;
        }

        count += matches.length;

        // Déclencher les événements pour que les frameworks détectent le changement
        field.element.dispatchEvent(new Event('input', { bubbles: true }));
        field.element.dispatchEvent(new Event('change', { bubbles: true }));

        // Effet vert temporaire
        field.element.style.transition = 'background-color 0.5s';
        field.element.style.backgroundColor = '#4ade80';
        field.element.style.outline = '2px solid #22c55e';
        field.element.style.outlineOffset = '2px';

        setTimeout(() => {
          field.element.style.backgroundColor = '';
          field.element.style.outline = '';
          field.element.style.outlineOffset = '';
        }, 1500);
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
