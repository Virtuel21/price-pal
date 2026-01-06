// Price Updater - Content Script
// Handles interaction with the page's code editors

(function() {
  'use strict';

  // Editor detection and interaction
  const EditorHandler = {
    // Detect what type of editor is present on the page
    detectEditor() {
      // Check for Monaco Editor (VS Code style)
      if (window.monaco && window.monaco.editor) {
        const editors = window.monaco.editor.getEditors();
        if (editors.length > 0) {
          return { type: 'monaco', editor: editors[0] };
        }
      }

      // Check for CodeMirror 6
      if (document.querySelector('.cm-editor')) {
        const cmEditor = document.querySelector('.cm-editor');
        if (cmEditor && cmEditor.CodeMirror) {
          return { type: 'codemirror', editor: cmEditor.CodeMirror };
        }
        // Try to get the view from the element
        const view = cmEditor?.__view;
        if (view) {
          return { type: 'codemirror6', editor: view };
        }
      }

      // Check for CodeMirror 5
      if (window.CodeMirror) {
        const cmElement = document.querySelector('.CodeMirror');
        if (cmElement && cmElement.CodeMirror) {
          return { type: 'codemirror5', editor: cmElement.CodeMirror };
        }
      }

      // Check for Ace Editor
      if (window.ace) {
        const aceElement = document.querySelector('.ace_editor');
        if (aceElement) {
          const editor = window.ace.edit(aceElement);
          if (editor) {
            return { type: 'ace', editor };
          }
        }
      }

      // Check for textarea
      const textareas = document.querySelectorAll('textarea');
      const codeTextarea = Array.from(textareas).find(ta => 
        ta.classList.contains('code') ||
        ta.classList.contains('editor') ||
        ta.id.includes('code') ||
        ta.id.includes('editor') ||
        ta.rows > 5
      );
      
      if (codeTextarea) {
        return { type: 'textarea', editor: codeTextarea };
      }

      // Check for contenteditable
      const editables = document.querySelectorAll('[contenteditable="true"]');
      const codeEditable = Array.from(editables).find(el =>
        el.classList.contains('code') ||
        el.classList.contains('editor') ||
        el.closest('.code-editor')
      );
      
      if (codeEditable) {
        return { type: 'contenteditable', editor: codeEditable };
      }

      // Fallback: find any large textarea
      if (textareas.length > 0) {
        return { type: 'textarea', editor: textareas[0] };
      }

      return { type: 'unknown', editor: null };
    },

    // Get content from the detected editor
    getContent(editorInfo) {
      if (!editorInfo.editor) return null;

      switch (editorInfo.type) {
        case 'monaco':
          return editorInfo.editor.getValue();
        
        case 'codemirror':
        case 'codemirror5':
          return editorInfo.editor.getValue();
        
        case 'codemirror6':
          return editorInfo.editor.state.doc.toString();
        
        case 'ace':
          return editorInfo.editor.getValue();
        
        case 'textarea':
          return editorInfo.editor.value;
        
        case 'contenteditable':
          return editorInfo.editor.textContent || editorInfo.editor.innerText;
        
        default:
          return null;
      }
    },

    // Set content in the detected editor
    setContent(editorInfo, content) {
      if (!editorInfo.editor) return false;

      try {
        switch (editorInfo.type) {
          case 'monaco':
            editorInfo.editor.setValue(content);
            return true;
          
          case 'codemirror':
          case 'codemirror5':
            editorInfo.editor.setValue(content);
            return true;
          
          case 'codemirror6':
            editorInfo.editor.dispatch({
              changes: {
                from: 0,
                to: editorInfo.editor.state.doc.length,
                insert: content,
              },
            });
            return true;
          
          case 'ace':
            editorInfo.editor.setValue(content, -1);
            return true;
          
          case 'textarea':
            editorInfo.editor.value = content;
            // Trigger input event for frameworks that listen to it
            editorInfo.editor.dispatchEvent(new Event('input', { bubbles: true }));
            editorInfo.editor.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          
          case 'contenteditable':
            editorInfo.editor.textContent = content;
            editorInfo.editor.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          
          default:
            return false;
        }
      } catch (error) {
        console.error('Error setting editor content:', error);
        return false;
      }
    },
  };

  // Listen for messages from the popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getEditorContent') {
      const editorInfo = EditorHandler.detectEditor();
      const content = EditorHandler.getContent(editorInfo);
      
      sendResponse({
        success: content !== null,
        content,
        editorType: editorInfo.type,
        error: content === null ? 'No editor found or unable to read content' : undefined,
      });
      return true;
    }

    if (request.action === 'setEditorContent') {
      const editorInfo = EditorHandler.detectEditor();
      const success = EditorHandler.setContent(editorInfo, request.content);
      
      sendResponse({
        success,
        editorType: editorInfo.type,
        error: success ? undefined : 'Unable to set editor content',
      });
      return true;
    }

    if (request.action === 'detectEditor') {
      const editorInfo = EditorHandler.detectEditor();
      sendResponse({
        success: editorInfo.type !== 'unknown',
        type: editorInfo.type,
      });
      return true;
    }

    if (request.action === 'ping') {
      sendResponse({ success: true });
      return true;
    }
  });

  // Log that the content script is loaded
  console.log('[Price Updater] Content script loaded');
})();
