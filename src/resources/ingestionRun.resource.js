'use strict';

class IngestionRunResource {
  /**
   * Transform IngestionRun model to JSON matching API_README contract
   */
  static toArray(run) {
    if (!run) return null;

    const data = {
      id: Number(run.id),
      job_source_id: Number(run.job_source_id),
      trigger_type: run.trigger_type,
      status: run.status,
      jobs_found: Number(run.jobs_found || 0),
      jobs_imported: Number(run.jobs_imported || 0),
      duplicates_count: Number(run.duplicates_count || 0),
      errors_count: Number(run.errors_count || 0),
      started_at: run.started_at ? new Date(run.started_at).toISOString() : null,
      finished_at: run.finished_at ? new Date(run.finished_at).toISOString() : null,
      error_message: run.error_message || null,
      created_at: run.created_at ? new Date(run.created_at).toISOString() : null,
      updated_at: run.updated_at ? new Date(run.updated_at).toISOString() : null
    };

    if (run.jobSource) {
      data.job_source = {
        id: Number(run.jobSource.id),
        name: run.jobSource.name,
        slug: run.jobSource.slug,
        source_type: run.jobSource.source_type
      };
    }

    return data;
  }

  /**
   * Transform collection of ingestion runs
   */
  static collection(runs) {
    if (!Array.isArray(runs)) return [];
    return runs.map(item => this.toArray(item));
  }
}

module.exports = IngestionRunResource;
