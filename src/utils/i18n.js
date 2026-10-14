const en = require('../locales/en.json');
const ar = require('../locales/ar.json');
const config = require('../config/env');

const translations = { en, ar };

function getTranslation(key, locale = config.locale.default) {
  const activeLocale = translations[locale] ? locale : config.locale.fallback;
  const parts = key.split('.');
  let current = translations[activeLocale];

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English if key missing in selected locale
      let fallbackCurrent = translations[config.locale.fallback];
      for (const fallbackPart of parts) {
        if (fallbackCurrent && typeof fallbackCurrent === 'object' && fallbackPart in fallbackCurrent) {
          fallbackCurrent = fallbackCurrent[fallbackPart];
        } else {
          return key;
        }
      }
      return fallbackCurrent;
    }
  }

  return current || key;
}

module.exports = {
  t: getTranslation
};
