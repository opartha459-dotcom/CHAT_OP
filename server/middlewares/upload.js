const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Determine upload directory: local ../uploads or OS tempdir (e.g. /tmp for serverless/Lambda)
let uploadDir = path.join(__dirname, '../uploads');

function getSafeUploadDir() {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  } catch (err) {
    // In serverless / read-only environments (like Vercel / Lambda /var/task), fall back to /tmp
    const tmpUploadDir = path.join(os.tmpdir(), 'pulsechat_uploads');
    try {
      if (!fs.existsSync(tmpUploadDir)) {
        fs.mkdirSync(tmpUploadDir, { recursive: true });
      }
      return tmpUploadDir;
    } catch (tmpErr) {
      console.warn('[Upload] Falling back to os.tmpdir():', tmpErr.message);
      return os.tmpdir();
    }
  }
}

uploadDir = getSafeUploadDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedName}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common safe media and document types
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'application/zip', 'application/x-zip-compressed'
  ];

  if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max limit
  },
  fileFilter
});

upload.uploadDir = uploadDir;
module.exports = upload;
