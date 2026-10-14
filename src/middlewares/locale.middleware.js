const { t } = require('../utils/i18n');
const config = require('../config/env');

function localeMiddleware(req, res, next) {
  const acceptLang = req.headers['accept-language'];
  let locale = config.locale.default;

  if (acceptLang) {
    const primary = acceptLang.split(',')[0].trim().toLowerCase();
    if (primary.startsWith('ar')) {
      locale = 'ar';
    } else {
      locale = 'en';
    }
  }

  req.locale = locale;
  req.t = (key) => t(key, locale);
  next();
}

module.exports = localeMiddleware;
