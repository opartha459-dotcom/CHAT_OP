const path = require('path');
const fs = require('fs');

class LocalStorageAdapter {
  constructor(options = {}) {
    this.uploadDir = options.uploadDir || path.join(__dirname, '../../uploads');
  }

  async upload(file) {
    return {
      url: `/uploads/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
      provider: 'local'
    };
  }

  async delete(fileUrl) {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return false;
    const filename = path.basename(fileUrl);
    const filePath = path.join(this.uploadDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (e) {
      console.warn('[LocalStorageAdapter] Failed to delete file:', e.message);
    }
    return false;
  }
}

module.exports = LocalStorageAdapter;
