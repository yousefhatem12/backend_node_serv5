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

const uploadCv = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
}).single('cv');

/**
 * Express wrapper middleware to handle Multer errors with Laravel-compatible 422 JSON
 */
function uploadCvMiddleware(req, res, next) {
  uploadCv(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(422).json({
            message: 'The cv must not be greater than 5120 kilobytes.',
            errors: {
              cv: ['The cv must not be greater than 5120 kilobytes.']
            }
          });
        }
        return res.status(422).json({
          message: err.message,
          errors: {
            cv: [err.message]
          }
        });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(422).json({
        message: 'The cv field is required.',
        errors: {
          cv: ['The cv field is required.']
        }
      });
    }

    next();
  });
}

module.exports = {
  uploadCvMiddleware,
  uploadDir
};
