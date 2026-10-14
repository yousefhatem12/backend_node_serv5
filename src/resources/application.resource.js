class ApplicationResource {
  /**
   * Transform Application model into JSON response matching Laravel contract
   */
  static toArray(application) {
    if (!application) return null;

    const res = {
      id: Number(application.id),
      status: application.status,
      cover_letter: application.cover_letter || null,
      notes: application.notes || null,
      applied_at: application.applied_at ? new Date(application.applied_at).toISOString() : null,
      created_at: application.created_at ? new Date(application.created_at).toISOString() : null,
      updated_at: application.updated_at ? new Date(application.updated_at).toISOString() : null
    };

    if (application.job) {
      res.job = {
        id: Number(application.job.id),
        title: application.job.title,
        job_type: application.job.job_type,
        work_mode: application.job.work_mode,
        company: application.job.company
          ? {
              id: Number(application.job.company.id),
              name: application.job.company.name,
              logo_url: application.job.company.logo_url || null
            }
          : null
      };
    }

    if (application.candidateProfile) {
      res.candidate = {
        id: Number(application.candidateProfile.id),
        user_id: Number(application.candidateProfile.user_id),
        name: application.candidateProfile.user ? application.candidateProfile.user.name : null,
        email: application.candidateProfile.user ? application.candidateProfile.user.email : null,
        job_title: application.candidateProfile.job_title || null,
        phone: application.candidateProfile.phone || null
      };
    }

    if (application.cvDocument) {
      res.cv_document = {
        id: Number(application.cvDocument.id),
        file_name: application.cvDocument.original_filename,
        file_path: application.cvDocument.storage_path,
        file_url: application.cvDocument.file_url || null,
        mime_type: application.cvDocument.mime_type
      };
    }

    if (application.histories) {
      res.histories = application.histories.map(h => ({
        id: Number(h.id),
        from_status: h.from_status || null,
        status: h.to_status,
        notes: h.notes || null,
        changed_by: h.changedByUser ? h.changedByUser.name : null,
        created_at: h.created_at ? new Date(h.created_at).toISOString() : null
      }));
    }

    return res;
  }

  /**
   * Action response envelope format for create / status updates
   */
  static toActionPayload(application) {
    if (!application) return null;
    return {
      id: Number(application.id),
      status: application.status,
      cover_letter: application.cover_letter || null,
      applied_at: application.applied_at ? new Date(application.applied_at).toISOString() : null
    };
  }

  /**
   * Transform collection of applications
   */
  static collection(applications) {
    if (!Array.isArray(applications)) return [];
    return applications.map(app => this.toArray(app));
  }
}

module.exports = ApplicationResource;
