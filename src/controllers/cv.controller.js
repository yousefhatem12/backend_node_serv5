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
}

module.exports = CvController;
