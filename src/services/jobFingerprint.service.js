'use strict';

const crypto = require('crypto');

class JobFingerprintService {
  /**
   * Normalizes a text string by lowercasing, stripping diacritics and punctuation,
   * and collapsing whitespaces.
   */
  static normalizeString(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a deterministic SHA-256 hash combining:
   * - Resolved canonical company identity
   * - Normalized comparison title
   * - Normalized geographic location / work mode
   * - Employment type
   * - Stable publication date (if provided)
   */
  static generate({
    companyIdentifier,
    title,
    location,
    country,
    city,
    workMode,
    employmentType,
    publicationDate
  }) {
    const normCompany = this.normalizeString(companyIdentifier);
    const normTitle = this.normalizeString(title);

    let locationStr = location || '';
    if (!locationStr && (city || country)) {
      locationStr = [city, country].filter(Boolean).join(' ');
    }
    if (workMode === 'remote') {
      locationStr = 'remote';
    }
    const normLocation = this.normalizeString(locationStr);

    const normEmpType = this.normalizeString(employmentType || 'full-time');

    let normDate = '';
    if (publicationDate) {
      try {
        const d = new Date(publicationDate);
        if (!isNaN(d.getTime())) {
          normDate = d.toISOString().slice(0, 10);
        }
      } catch (e) {
        normDate = '';
      }
    }

    const signature = [normCompany, normTitle, normLocation, normEmpType, normDate].join('|');
    return crypto.createHash('sha256').update(signature).digest('hex');
  }
}

module.exports = JobFingerprintService;
