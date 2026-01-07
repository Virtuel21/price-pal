// Price Updater - Content Script
// Recherche et remplace les prix directement dans la page

(function() {
  'use strict';

  // Détecter et obtenir l'API de l'éditeur de code
  function detectCodeEditor(textarea) {
    // Vérifier si c'est un CodeMirror (méthode 1: via parentElement)
    if (textarea.parentElement && textarea.parentElement.CodeMirror) {
      return { type: 'codemirror5', api: textarea.parentElement.CodeMirror };
    }

    // Vérifier si c'est un CodeMirror (méthode 2: via nextSibling pour CodePen)
    if (textarea.nextSibling && textarea.nextSibling.CodeMirror) {
      return { type: 'codemirror5', api: textarea.nextSibling.CodeMirror };
    }

    // Chercher dans tout le document pour CodeMirror
    const allCodeMirrors = document.querySelectorAll('.CodeMirror');
    for (const cm of allCodeMirrors) {
      if (cm.CodeMirror) {
        const cmTextarea = cm.CodeMirror.getTextArea();
        if (cmTextarea === textarea) {
          return { type: 'codemirror5', api: cm.CodeMirror };
        }
      }
    }

    // Chercher CodeMirror 6 (plus récent)
    let element = textarea;
    while (element && element !== document.body) {
      if (element.classList && element.classList.contains('cm-editor')) {
        const view = element.cmView?.view || element.__view;
        if (view) {
          return { type: 'codemirror6', api: view };
        }
      }
      element = element.parentElement;
    }

    // Chercher Monaco Editor
    if (window.monaco && window.monaco.editor) {
      const editors = window.monaco.editor.getEditors();
      for (const editor of editors) {
        const domNode = editor.getDomNode();
        if (domNode && domNode.contains(textarea)) {
          return { type: 'monaco', api: editor };
        }
      }
    }

    // Chercher Ace Editor
    if (window.ace) {
      let aceElement = textarea;
      while (aceElement && aceElement !== document.body) {
        if (aceElement.classList && aceElement.classList.contains('ace_editor')) {
          try {
            const editor = window.ace.edit(aceElement);
            if (editor) {
              return { type: 'ace', api: editor };
            }
          } catch (e) {
            // Pas un Ace Editor valide
          }
        }
        aceElement = aceElement.parentElement;
      }
    }

    return null;
  }

  // Trouver tous les éditeurs CodeMirror sur la page (pour CodePen et autres)
  function findAllCodeMirrorEditors() {
    const editors = [];

    // Chercher tous les éléments .CodeMirror
    const codeMirrorElements = document.querySelectorAll('.CodeMirror');
    codeMirrorElements.forEach(el => {
      if (el.CodeMirror) {
        editors.push({
          type: 'codemirror5',
          element: el,
          editorAPI: el.CodeMirror
        });
      }
    });

    return editors;
  }

  // Fonction pour trouver tous les textarea et inputs contenant un prix
  function findTextFieldsWithPrice(price) {
    const fields = [];

    // Fonction pour chercher dans un document
    function searchInDocument(doc) {
      // D'abord, chercher tous les éditeurs CodeMirror directement (pour CodePen)
      const codeMirrorEditors = doc.querySelectorAll('.CodeMirror');
      codeMirrorEditors.forEach(cmElement => {
        if (cmElement.CodeMirror) {
          const content = cmElement.CodeMirror.getValue();
          if (content.includes(price)) {
            // Trouver le textarea associé ou utiliser l'élément lui-même
            const textarea = cmElement.CodeMirror.getTextArea() || cmElement;
            fields.push({
              type: 'codemirror5',
              element: textarea,
              editorAPI: cmElement.CodeMirror
            });
          }
        }
      });

      // Chercher dans les textarea (qui ne sont pas déjà dans un CodeMirror)
      const textareas = doc.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        // Vérifier si ce textarea n'est pas déjà traité par CodeMirror
        const alreadyFound = fields.some(f => f.element === textarea);
        if (!alreadyFound && textarea.value.includes(price)) {
          const editor = detectCodeEditor(textarea);
          fields.push({
            type: editor ? editor.type : 'textarea',
            element: textarea,
            editorAPI: editor ? editor.api : null
          });
        }
      });

      // Chercher dans les input text
      const inputs = doc.querySelectorAll('input[type="text"], input:not([type])');
      inputs.forEach(input => {
        if (input.value.includes(price)) {
          fields.push({ type: 'input', element: input, editorAPI: null });
        }
      });

      // Chercher dans les contenteditable
      const editables = doc.querySelectorAll('[contenteditable="true"]');
      editables.forEach(editable => {
        if (editable.textContent.includes(price)) {
          fields.push({ type: 'contenteditable', element: editable, editorAPI: null });
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
      let content = '';

      // Obtenir le contenu selon le type d'éditeur
      if (field.editorAPI) {
        switch (field.type) {
          case 'codemirror5':
            content = field.editorAPI.getValue();
            break;
          case 'codemirror6':
            content = field.editorAPI.state.doc.toString();
            break;
          case 'monaco':
            content = field.editorAPI.getValue();
            break;
          case 'ace':
            content = field.editorAPI.getValue();
            break;
        }
      } else if (field.type === 'contenteditable') {
        content = field.element.textContent;
      } else {
        content = field.element.value;
      }

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
      let originalContent = '';
      let matches = null;

      // Obtenir le contenu selon le type d'éditeur
      if (field.editorAPI) {
        // Utiliser l'API de l'éditeur de code
        switch (field.type) {
          case 'codemirror5':
            originalContent = field.editorAPI.getValue();
            break;
          case 'codemirror6':
            originalContent = field.editorAPI.state.doc.toString();
            break;
          case 'monaco':
            originalContent = field.editorAPI.getValue();
            break;
          case 'ace':
            originalContent = field.editorAPI.getValue();
            break;
        }
      } else if (field.type === 'contenteditable') {
        originalContent = field.element.textContent;
      } else {
        originalContent = field.element.value;
      }

      matches = originalContent.match(regex);

      if (matches) {
        const newContent = originalContent.replace(regex, newPrice);
        count += matches.length;

        // Appliquer le changement selon le type d'éditeur
        if (field.editorAPI) {
          try {
            switch (field.type) {
              case 'codemirror5':
                field.editorAPI.setValue(newContent);
                field.editorAPI.refresh();
                break;
              case 'codemirror6':
                field.editorAPI.dispatch({
                  changes: {
                    from: 0,
                    to: field.editorAPI.state.doc.length,
                    insert: newContent
                  }
                });
                break;
              case 'monaco':
                field.editorAPI.setValue(newContent);
                break;
              case 'ace':
                const cursorPos = field.editorAPI.getCursorPosition();
                field.editorAPI.setValue(newContent, -1);
                field.editorAPI.moveCursorToPosition(cursorPos);
                break;
            }
            console.log(`[Price Updater] Updated ${field.type} editor successfully`);
          } catch (error) {
            console.error(`[Price Updater] Error updating ${field.type}:`, error);
          }
        } else if (field.type === 'contenteditable') {
          field.element.textContent = newContent;
          field.element.dispatchEvent(new Event('input', { bubbles: true }));
          field.element.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // Textarea ou input standard
          // Pour React et autres frameworks modernes, utiliser le setter natif
          try {
            const isTextarea = field.element.tagName === 'TEXTAREA';
            const prototype = isTextarea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
            nativeInputValueSetter.call(field.element, newContent);
          } catch (e) {
            // Fallback sur la méthode simple
            field.element.value = newContent;
          }

          // Déclencher plusieurs événements pour assurer la compatibilité
          const events = ['input', 'change', 'keyup'];
          events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            field.element.dispatchEvent(event);
          });
        }

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
