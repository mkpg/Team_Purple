import React, { createContext, useContext, useState, useEffect } from 'react';
import { CraftShieldContext } from './CraftShieldContext';
import { isOffline } from '../utils/googleTranslator';

export const TranslationContext = createContext();

export const TranslationProvider = ({ children }) => {
  const { language } = useContext(CraftShieldContext);

  const translate = (text) => {
    if (!text) return '';
    return String(text);
  };

  return (
    <TranslationContext.Provider value={{ language, offlineCache: {}, translate }}>
      {children}
    </TranslationContext.Provider>
  );
};

export function useTranslatedText(originalText) {
  const context = useContext(TranslationContext);
  if (!context) {
    return originalText;
  }
  return context.translate(originalText);
}
