const CvExtractionResource = require('./cvExtraction.resource');

class CvDocumentResource {
  /**
   * Transform CV Document model with extractions to full response object
   */
  static toArray(doc) {
    if (!doc) return null;
    return {
      id: Number(doc.id),
      original_filename: doc.original_filename,
      mime_type: doc.mime_type,
      file_size: Number(doc.file_size),
      version: Number(doc.version),
      is_current: Boolean(doc.is_current),
      status: doc.status,
      processed_at: doc.processed_at ? new Date(doc.processed_at).toISOString() : null,
      created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
      updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null,
      extractions: CvExtractionResource.collection(doc.extractions || [])
    };
  }

  /**
   * Transform CV Document model to history item summary
   */
  static toHistory(doc) {
    if (!doc) return null;
    return {
      id: Number(doc.id),
      original_filename: doc.original_filename,
      version: Number(doc.version),
      is_current: Boolean(doc.is_current),
      status: doc.status,
      created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null
    };
  }

  /**
   * Transform collection of documents
   */
  static collection(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(d => this.toArray(d));
  }

  /**
   * Transform collection to history list
   */
  static historyCollection(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(d => this.toHistory(d));
  }
}

module.exports = CvDocumentResource;
