// Google Website Translator Widget Integration + Offline DOM Caching

export function initGoogleTranslator() {
  if (typeof window === 'undefined') return;

  window.googleTranslateElementInit = () => {
    if (window.google && window.google.translate) {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,ta,te,kn,ml',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');

      // Auto-apply stored language on load
      const savedLang = localStorage.getItem('language') || 'en';
      if (savedLang && savedLang !== 'en') {
        setTimeout(() => {
          setGoogleTranslateLanguage(savedLang, true);
        }, 600);
      }
    }
  };

  // Inject Google Translate script if not loaded
  if (!document.getElementById('google-translate-script')) {
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.body.appendChild(script);
  }

  // Inject hidden div if not present
  if (!document.getElementById('google_translate_element')) {
    const div = document.createElement('div');
    div.id = 'google_translate_element';
    div.style.display = 'none';
    document.body.appendChild(div);
  }

  // Inject CSS overrides to hide Google's default top banner/iframe
  if (!document.getElementById('google-translate-style-overrides')) {
    const style = document.createElement('style');
    style.id = 'google-translate-style-overrides';
    style.innerHTML = `
      /* Completely hide Google Translate default top banner frame and related widgets */
      .goog-te-banner-frame,
      .goog-te-banner-frame.skiptranslate,
      iframe.goog-te-banner-frame,
      .goog-te-banner,
      .skiptranslate[style*="visibility: visible"],
      #goog-gt-tt {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        height: 0 !important;
        width: 0 !important;
      }
      /* Prevent shifted margins/padding on html/body elements */
      body {
        top: 0 !important;
        position: static !important;
      }
      html {
        margin-top: 0 !important;
        top: 0 !important;
      }
      .goog-logo-link {
        display: none !important;
      }
      .goog-te-gadget {
        font-size: 0 !important;
      }
      .goog-te-balloon-frame {
        display: none !important;
      }
      /* Hide the tooltip on hover */
      #goog-gt-tt, .goog-te-balloon-frame {
        display: none !important;
        visibility: hidden !important;
      }
      .goog-text-highlight {
        background-color: transparent !important;
        box-shadow: none !important;
        border: none !important;
      }
      .goog-te-combo {
        padding: 6px 12px !important;
        border-radius: 8px !important;
        border: 1px solid #dcdcdc !important;
        background-color: #ffffff !important;
        color: #333333 !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 13px !important;
        outline: none !important;
        cursor: pointer !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
        transition: all 0.2s ease !important;
      }
      .goog-te-combo:hover {
        border-color: #c5a059 !important;
      }
      .login-page .goog-te-combo {
        background-color: rgba(13, 28, 50, 0.9) !important;
        color: #ffffff !important;
        border: 1px solid rgba(197, 160, 89, 0.35) !important;
      }
    `;
    document.head.appendChild(style);
  }
}

export function setGoogleTranslateLanguage(langCode, force = false) {
  if (typeof window === 'undefined') return;

  // Direct cookie synchronization to prevent translation cache leakage across sessions/reloads
  const cookieValue = langCode === 'en' ? '' : `/en/${langCode}`;
  
  // Clear any old cookies
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
  
  // Write the current cookie if not English
  if (cookieValue) {
    document.cookie = `googtrans=${cookieValue}; path=/;`;
    document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
  }

  let retries = 0;
  const applyLang = () => {
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      if (force) {
        // Toggle to force Google Translate to translate new React DOM elements
        select.value = '';
        select.dispatchEvent(new Event('change'));
        setTimeout(() => {
          select.value = langCode;
          select.dispatchEvent(new Event('change'));
        }, 50);
      } else if (select.value !== langCode) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
      }
    } else if (retries < 15) {
      retries++;
      setTimeout(applyLang, 300);
    }
  };
  applyLang();
}

// Check if text is standard English / ASCII / Latin
export function isEnglishText(text) {
  if (!text) return false;
  // Return true if the text consists only of ASCII, standard Latin-1 symbols, punctuation, and spaces
  // This rules out Tamil (\u0B80-\u0BFF), Hindi (\u0900-\u097F), Telugu, etc.
  return /^[\x00-\x7F\u00A0-\u00FF\u2010-\u2026\s]*$/.test(text);
}

// Get direct text content (excluding children)
function getDirectTextContent(element) {
  let text = '';
  if (!element || !element.childNodes) return text;
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent;
    }
  }
  return text;
}

// Walks the entire DOM and tags text elements with their original English values before translation
export function tagDOMWithOriginalText() {
  if (typeof window === 'undefined') return;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const tag = node.tagName?.toLowerCase();
        if (['script', 'style', 'noscript', 'iframe', 'select', 'option', 'textarea'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.id === 'google_translate_element' || node.classList?.contains('goog-te-gadget')) {
          return NodeFilter.FILTER_REJECT;
        }
        if (node.classList?.contains('language-selector-wrapper') || node.classList?.contains('language-select-dropdown')) {
          return NodeFilter.FILTER_REJECT;
        }
        // Guard to prevent double processing or looping
        if (node.hasAttribute('data-cs-processing')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode = walker.currentNode;
  while (walker.nextNode()) {
    currentNode = walker.currentNode;
    
    // Only tag if it does not have data-original-text yet
    if (!currentNode.hasAttribute('data-original-text')) {
      const directText = getDirectTextContent(currentNode).trim();
      // Skip numbers/whitespace/symbols only, and ensure it's English
      if (directText.length > 1 && !/^\d+$/.test(directText) && isEnglishText(directText)) {
        currentNode.setAttribute('data-original-text', directText);
        currentNode.setAttribute('data-cs-processing', 'true');
      }
    }
  }

  // Also tag inputs/textareas placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach(input => {
    if (!input.hasAttribute('data-original-placeholder') && !input.hasAttribute('data-cs-processing')) {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder && placeholder.trim().length > 1 && isEnglishText(placeholder)) {
        input.setAttribute('data-original-placeholder', placeholder);
        input.setAttribute('data-cs-processing', 'true');
      }
    }
  });
}

/**
 * Walk the entire DOM and capture Google Translate's output.
 * Maps: { "english text" => "translated text" } stored in localStorage.
 */
export function snapshotGoogleTranslations(langCode) {
  if (typeof window === 'undefined' || !langCode || langCode === 'en') return;

  // Race condition guard: verify that the Google Translate widget actually has the target language active
  const select = document.querySelector('.goog-te-combo');
  if (!select || select.value !== langCode) {
    console.log(`[CraftShield] Snapshot deferred: widget is on '${select ? select.value : 'loading'}', expected '${langCode}'`);
    return;
  }

  const cacheKey = `craftshield_gt_snapshot_${langCode}`;
  let cache = {};
  try {
    cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
  } catch (e) {
    cache = {};
  }

  let updated = false;

  // 1. Snapshot elements with data-original-text
  const dataOriginalElements = document.querySelectorAll('[data-original-text]');
  dataOriginalElements.forEach(el => {
    const original = el.getAttribute('data-original-text');
    const translated = (el.innerText || el.textContent || '').trim();
    if (original && translated && original !== translated && translated.length > 0) {
      if (!isEnglishText(translated)) {
        cache[original] = translated;
        updated = true;
      }
    }
  });

  // 2. Snapshot font tag translations (Google Translate inserts these inside elements)
  const fontElements = document.querySelectorAll('font[style]');
  fontElements.forEach(fontEl => {
    const translated = (fontEl.textContent || '').trim();
    if (translated.length > 1 && !isEnglishText(translated)) {
      const parent = fontEl.parentElement;
      if (parent) {
        const origAttr = parent.getAttribute('data-original-text');
        if (origAttr) {
          cache[origAttr] = translated;
          updated = true;
        }
      }
    }
  });

  // 3. Snapshot inputs/textareas placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach(input => {
    const original = input.getAttribute('data-original-placeholder');
    const translated = input.getAttribute('placeholder');
    if (original && translated && original !== translated && !isEnglishText(translated)) {
      cache[original] = translated;
      updated = true;
    }
  });

  if (updated) {
    localStorage.setItem(cacheKey, JSON.stringify(cache));
    console.log(`[CraftShield] Snapshot: cached ${Object.keys(cache).length} translations for ${langCode}`);
  }
}

/**
 * Apply cached translations to the DOM when offline.
 * Walks the DOM and replaces English text with cached translations.
 * Now optimized to ONLY mutate non-React elements (document title and placeholders)
 * to avoid virtual DOM desync errors and duplicate renderings.
 */
export function applyOfflineTranslations(langCode) {
  if (typeof window === 'undefined' || !langCode || langCode === 'en') return;

  const cacheKey = `craftshield_gt_snapshot_${langCode}`;
  let cache = {};
  try {
    cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
  } catch (e) {
    return;
  }

  if (Object.keys(cache).length === 0) return;

  // 1. Translate input/textarea placeholders
  const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach(input => {
    if (input.getAttribute('data-cs-processed-placeholder') === langCode) return;
    const original = input.getAttribute('data-original-placeholder') || input.getAttribute('placeholder');
    if (original && cache[original]) {
      input.setAttribute('placeholder', cache[original]);
      input.setAttribute('data-cs-processed-placeholder', langCode);
    }
  });

  // 2. Translate document title
  if (document.title && cache[document.title]) {
    document.title = cache[document.title];
  }
}

/**
 * Start continuous snapshotting of Google Translate output.
 * Returns a cleanup function to stop.
 */
export function startTranslationSnapshotting(langCode) {
  if (typeof window === 'undefined' || !langCode || langCode === 'en') return null;

  // Run snapshot every 3 seconds to capture Google Translate's output
  const intervalId = setInterval(() => {
    snapshotGoogleTranslations(langCode);
  }, 3000);

  // Also run once immediately after a delay (let Google Translate finish)
  setTimeout(() => snapshotGoogleTranslations(langCode), 3000);
  setTimeout(() => snapshotGoogleTranslations(langCode), 6000);

  return () => clearInterval(intervalId);
}

/**
 * Check if we're offline
 */
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}
