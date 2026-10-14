'use strict';

class JobSourceResource {
  /**
   * Transform JobSource model to JSON matching API_README contract
   */
  static toArray(source, diagnostics = null) {
    if (!source) return null;

    const data = {
      id: Number(source.id),
      name: source.name,
      slug: source.slug,
      source_type: source.source_type,
      collection_method: source.collection_method,
      base_url: source.base_url || null,
      is_active: Boolean(source.is_active),
      schedule_enabled: Boolean(source.schedule_enabled),
      schedule_expression: source.schedule_expression || null,
      configuration: source.configuration || null,
      notes: source.notes || null,
      last_run_at: source.last_run_at ? new Date(source.last_run_at).toISOString() : null,
      last_status: source.last_status || null,
      error_rate: Number(source.error_rate || 0),
      created_at: source.created_at ? new Date(source.created_at).toISOString() : null,
      updated_at: source.updated_at ? new Date(source.updated_at).toISOString() : null
    };

    const errorRate = Number(source.error_rate || (source.dataValues && source.dataValues.error_rate) || 0);
    const successRate = diagnostics && diagnostics.success_rate !== undefined
      ? diagnostics.success_rate
      : Math.max(0, Math.min(100, 100 - errorRate));
    const failureRate = diagnostics && diagnostics.failure_rate !== undefined
      ? diagnostics.failure_rate
      : errorRate;

    data.health_status = {
      status: source.last_status || 'idle',
      last_collection_time: source.last_run_at ? new Date(source.last_run_at).toISOString() : null,
      success_rate: successRate,
      failure_rate: failureRate,
      error_rate: errorRate,
      total_runs: diagnostics ? diagnostics.total_runs : (source.dataValues?.total_runs || 0)
    };

    if (diagnostics) {
      data.diagnostics = diagnostics;
    }

    return data;
  }

  /**
   * Transform collection of job sources
   */
  static collection(sources) {
    if (!Array.isArray(sources)) return [];
    return sources.map(item => this.toArray(item));
  }
}

module.exports = JobSourceResource;
