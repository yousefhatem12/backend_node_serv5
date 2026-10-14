'use strict';

class RawJobResource {
  /**
   * Transform RawJob model to JSON matching API_README contract
   */
  static toArray(rawJob) {
    if (!rawJob) return null;

    const data = {
      id: Number(rawJob.id),
      job_source_id: Number(rawJob.job_source_id),
      ingestion_run_id: Number(rawJob.ingestion_run_id),
      external_id: rawJob.external_id || null,
      source_url: rawJob.source_url || null,
      content_fingerprint: rawJob.content_fingerprint,
      extraction_status: rawJob.extraction_status,
      deduplication_status: rawJob.deduplication_status,
      job_post_id: rawJob.job_post_id ? Number(rawJob.job_post_id) : null,
      error_message: rawJob.error_message || null,
      raw_payload: rawJob.raw_payload,
      created_at: rawJob.created_at ? new Date(rawJob.created_at).toISOString() : null,
      updated_at: rawJob.updated_at ? new Date(rawJob.updated_at).toISOString() : null
    };

    if (rawJob.jobSource) {
      data.job_source = {
        id: Number(rawJob.jobSource.id),
        name: rawJob.jobSource.name,
        slug: rawJob.jobSource.slug
      };
    }

    if (rawJob.jobPost) {
      data.job_post = {
        id: Number(rawJob.jobPost.id),
        title: rawJob.jobPost.title,
        company_id: Number(rawJob.jobPost.company_id)
      };
    }

    return data;
  }

  /**
   * Transform collection of raw jobs
   */
  static collection(rawJobs) {
    if (!Array.isArray(rawJobs)) return [];
    return rawJobs.map(item => this.toArray(item));
  }
}

module.exports = RawJobResource;
