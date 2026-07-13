import React from 'react';
import { useTranslatedText } from '../context/TranslationContext';

/**
 * DynamicTranslate - Renders text that Google Translate will automatically translate.
 * The data-original-text attribute stores the English original so we can:
 *   1. Let Google Translate find and translate it when online
 *   2. Snapshot the translation via our DOM walker for offline caching
 *   3. Apply cached translations when offline
 * 
 * This component does NOT use translations.js or any manual API.
 * Google Translate handles ALL translation work.
 */
export default function DynamicTranslate({ text, inline = true }) {
  const translated = useTranslatedText(text);
  if (!text) return null;

  if (inline) {
    return <span data-original-text={text}>{translated}</span>;
  }
  return <div data-original-text={text}>{translated}</div>;
}
