/**
 * Base Resource Transformer
 * Equivalent to Laravel API Resources (JsonResource)
 */
class BaseResource {
  static toArray(item, options = {}) {
    if (!item) return null;
    return item;
  }

  static collection(items, options = {}) {
    if (!items || !Array.isArray(items)) return [];
    return items.map((item) => this.toArray(item, options));
  }
}

module.exports = BaseResource;
