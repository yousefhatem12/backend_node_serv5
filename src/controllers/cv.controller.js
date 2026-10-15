const fs = require('fs');
const cvService = require('../services/cv.service');
const CvDocumentResource = require('../resources/cvDocument.resource');
const { success, actionSuccess } = require('../utils/response');

class CvController {
  /**
   * POST /api/cv/upload
   */
  static async upload(req, res, next) {
    try {
      const doc = await cvService.uploadCv(req.user.id, req.file);
      return res.status(201).json({
        status: 'success',
        message: req.t ? req.t('cv.uploaded') : 'CV uploaded successfully.',
        data: CvDocumentResource.toArray(doc)
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/cv/file
   * Upload raw CV file directly without triggering text parsing or AI extraction
   */
  static async uploadRawFile(req, res, next) {
    try {
      const doc = await cvService.uploadRawCv(req.user.id, req.file);
      return res.status(201).json({
        status: 'success',
        message: req.t ? req.t('cv.uploaded') : 'CV file uploaded successfully.',
        data: {
          id: Number(doc.id),
          candidate_profile_id: Number(doc.candidate_profile_id),
          original_filename: doc.original_filename,
          storage_path: doc.storage_path,
          mime_type: doc.mime_type,
          file_size: Number(doc.file_size),
          version: Number(doc.version),
          is_current: Boolean(doc.is_current),
          status: doc.status,
          preview_url: `/api/cv/preview/${doc.id}`,
          download_url: `/api/cv/download/${doc.id}`,
          processed_at: doc.processed_at ? new Date(doc.processed_at).toISOString() : null,
          created_at: doc.created_at ? new Date(doc.created_at).toISOString() : null,
          updated_at: doc.updated_at ? new Date(doc.updated_at).toISOString() : null
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cv/status/:cvDocument
   */
  static async getStatus(req, res, next) {
    try {
      const doc = await cvService.getStatus(req.user.id, req.params.cvDocument);
      return success(res, CvDocumentResource.toArray(doc));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cv/history
   */
  static async getHistory(req, res, next) {
    try {
      const docs = await cvService.getHistory(req.user.id);
      return success(res, CvDocumentResource.historyCollection(docs));
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/cv/retry/:cvDocument
   */
  static async retry(req, res, next) {
    try {
      const doc = await cvService.retryCv(req.user.id, req.params.cvDocument);
      return res.status(200).json({
        status: 'success',
        message: req.t ? req.t('cv.retried') : 'CV processing retried successfully.',
        data: {
          id: Number(doc.id),
          status: doc.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/cv/extractions/:extraction/verify
   */
  static async verify(req, res, next) {
    try {
      await cvService.verifyExtraction(req.user.id, req.params.extraction, req.body);
      return res.status(200).json({
        status: 'success',
        message: req.t ? req.t('cv.verified') : 'CV extraction verified and synced successfully.',
        data: null
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cv/preview and GET /api/cv/preview/:cvDocument
   * Preview CV PDF document inline
   */
  static async preview(req, res, next) {
    try {
      const locale = req.locale || 'en';
      const docId = req.params?.cvDocument || req.query?.cvDocument || req.query?.id || null;
      const { filePath, filename, mimeType, fileSize } = await cvService.getPreviewDocument(
        req.user.id,
        docId,
        locale
      );

      const safeFilename = filename.replace(/["\r\n]/g, '');

      res.setHeader('Content-Type', mimeType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
      if (fileSize) {
        res.setHeader('Content-Length', fileSize);
      }
      res.setHeader('Accept-Ranges', 'bytes');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => next(err));
      return fileStream.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/cv/file, GET /api/cv/file/:cvDocument, GET /api/cv/download, GET /api/cv/download/:cvDocument
   * Return CV file directly for any format (PDF, DOCX, DOC, etc.)
   */
  static async getFile(req, res, next) {
    try {
      const locale = req.locale || 'en';
      const docId = req.params?.cvDocument || req.query?.cvDocument || req.query?.id || null;
      const isDownload = req.query?.download === 'true' || (req.baseUrl + req.path).includes('/download');

      const { filePath, filename, mimeType, fileSize } = await cvService.getCvFile(
        req.user.id,
        docId,
        locale
      );

      const safeFilename = filename.replace(/["\r\n]/g, '');
      const disposition = isDownload ? 'attachment' : 'inline';

      res.setHeader('Content-Type', mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
      if (fileSize) {
        res.setHeader('Content-Length', fileSize);
      }
      res.setHeader('Accept-Ranges', 'bytes');

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => next(err));
      return fileStream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CvController;
