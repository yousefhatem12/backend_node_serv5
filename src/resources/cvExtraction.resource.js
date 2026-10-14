class CvExtractionResource {
  /**
   * Transform CV Extraction model to response object
   */
  static toArray(extraction) {
    if (!extraction) return null;
    return {
      id: Number(extraction.id),
      attempt_number: Number(extraction.attempt_number),
      status: extraction.status,
      confidence_score: extraction.confidence_score !== null && extraction.confidence_score !== undefined
        ? Number(extraction.confidence_score)
        : null,
      extracted_data: extraction.extracted_data || null,
      started_at: extraction.started_at ? new Date(extraction.started_at).toISOString() : null,
      completed_at: extraction.completed_at ? new Date(extraction.completed_at).toISOString() : null
    };
  }

  /**
   * Transform collection of extractions
   */
  static collection(extractions) {
    if (!Array.isArray(extractions)) return [];
    return extractions.map(e => this.toArray(e));
  }
}

module.exports = CvExtractionResource;
