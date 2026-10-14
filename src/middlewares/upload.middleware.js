const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ValidationError } = require('../utils/errors');

const uploadDir = path.join(process.cwd(), 'uploads', 'cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `cv-${uniqueSuffix}${ext}`);
  }
});

const allowedMimes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
];

const allowedExtensions = ['.pdf', '.docx', '.doc'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = allowedExtensions.includes(ext);
  const isAllowedMime = allowedMimes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new ValidationError('The cv must be a file of type: pdf, docx.', {
      cv: ['The cv must be a file of type: pdf, docx.']
    }));
  }
};

const config = require('../config/env');

const maxFileSize = (config.storage && config.storage.uploadMaxMb ? config.storage.uploadMaxMb : 5) * 1024 * 1024;

// Accept 'cv', 'cv_file', or any client field name without 'Unexpected field' errors
const uploadCv = multer({
  storage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter
}).any();

/**
 * Express wrapper middleware to handle Multer errors with Laravel-compatible 422 JSON.
 * Supports both 'cv' and 'cv_file' field names simultaneously.
 */
function uploadCvMiddleware(req, res, next) {
  uploadCv(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxKb = Math.round(maxFileSize / 1024);
          return res.status(422).json({
            message: `The cv must not be greater than ${maxKb} kilobytes.`,
            errors: {
              cv: [`The cv must not be greater than ${maxKb} kilobytes.`],
              cv_file: [`The cv_file must not be greater than ${maxKb} kilobytes.`]
            }
          });
        }
        return res.status(422).json({
          message: err.message,
          errors: {
            cv: [err.message],
            cv_file: [err.message]
          }
        });
      }
      return next(err);
    }

    // Resolve whichever field was provided: cv, cv_file, file, or first uploaded file
    let uploadedFile = null;
    if (Array.isArray(req.files) && req.files.length > 0) {
      uploadedFile = req.files.find(f => f.fieldname === 'cv')
        || req.files.find(f => f.fieldname === 'cv_file')
        || req.files.find(f => f.fieldname === 'file')
        || req.files[0];
    } else if (req.files && typeof req.files === 'object') {
      uploadedFile = (req.files.cv && req.files.cv[0])
        || (req.files.cv_file && req.files.cv_file[0])
        || (req.files.file && req.files.file[0]);
    } else if (req.file) {
      uploadedFile = req.file;
    }

    if (!uploadedFile) {
      return res.status(422).json({
        message: 'The cv field is required.',
        errors: {
          cv: ['The cv field is required.'],
          cv_file: ['The cv_file field is required.']
        }
      });
    }

    // Populate req.file for downstream services and controllers
    req.file = uploadedFile;

    // Normalize req.files map so code checking req.files['cv'] or req.files['cv_file'] works
    if (!req.files || Array.isArray(req.files)) {
      req.files = {
        cv: [uploadedFile],
        cv_file: [uploadedFile],
        file: [uploadedFile]
      };
    }

    next();
  });
}

// --- AVATAR / AVATER PHOTO UPLOAD (JPEG, PNG) ---

const avatarUploadDir = path.join(process.cwd(), 'uploads', 'avatars');
if (!fs.existsSync(avatarUploadDir)) {
  fs.mkdirSync(avatarUploadDir, { recursive: true });
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  }
});

const allowedAvatarMimes = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/pjpeg',
  'image/x-png'
];

const allowedAvatarExtensions = ['.jpeg', '.jpg', '.png'];

const avatarFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = allowedAvatarExtensions.includes(ext);
  const isAllowedMime = allowedAvatarMimes.includes(file.mimetype);

  if (isAllowedExt && isAllowedMime) {
    cb(null, true);
  } else {
    cb(new ValidationError('The avatar must be a file of type: jpeg, png, jpg.', {
      avatar: ['The avatar must be a file of type: jpeg, png, jpg.'],
      avater: ['The avater must be a file of type: jpeg, png, jpg.']
    }));
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: maxFileSize
  },
  fileFilter: avatarFileFilter
}).any();

/**
 * Express wrapper middleware for optional Avatar upload on candidate profile.
 * Supports JPEG, JPG, and PNG files via fields: 'avatar', 'avater', 'photo', 'picture', 'image'.
 * Passes through application/json requests smoothly.
 */
function uploadAvatarMiddleware(req, res, next) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  uploadAvatar(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxKb = Math.round(maxFileSize / 1024);
          return res.status(422).json({
            message: `The avatar must not be greater than ${maxKb} kilobytes.`,
            errors: {
              avatar: [`The avatar must not be greater than ${maxKb} kilobytes.`],
              avater: [`The avater must not be greater than ${maxKb} kilobytes.`]
            }
          });
        }
        return res.status(422).json({
          message: err.message,
          errors: {
            avatar: [err.message],
            avater: [err.message]
          }
        });
      }

      if (err instanceof ValidationError || err.name === 'ValidationError') {
        return res.status(err.statusCode || 422).json({
          message: err.message,
          errors: err.errors || {
            avatar: [err.message],
            avater: [err.message]
          }
        });
      }

      return next(err);
    }

    // Resolve whichever avatar field was provided
    let uploadedFile = null;
    if (Array.isArray(req.files) && req.files.length > 0) {
      uploadedFile = req.files.find(f => ['avatar', 'avater', 'photo', 'picture', 'image'].includes(f.fieldname))
        || req.files[0];
    } else if (req.file) {
      uploadedFile = req.file;
    }

    if (uploadedFile) {
      req.file = uploadedFile;
      const avatarUrl = `/uploads/avatars/${uploadedFile.filename}`;
      req.body = req.body || {};
      req.body.avatar = avatarUrl;
      req.body.avater = avatarUrl;
    }

    next();
  });
}

module.exports = {
  uploadCv,
  uploadCvMiddleware,
  uploadDir,
  uploadAvatar,
  uploadAvatarMiddleware,
  avatarUploadDir
};
