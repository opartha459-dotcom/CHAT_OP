const cloudinary = require('cloudinary').v2;
const fs = require('fs');

class CloudinaryStorageAdapter {
  constructor() {
    this.isConfigured = false;
    if (
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    ) {
      if (!process.env.CLOUDINARY_URL) {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
      }
      this.isConfigured = true;
    }
  }

  async upload(file) {
    if (!this.isConfigured) {
      throw new Error('Cloudinary credentials are not configured');
    }

    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: 'auto',
      folder: 'pulsechat'
    });

    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (e) {
      // non-fatal
    }

    return {
      url: result.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: file.mimetype,
      provider: 'cloudinary',
      publicId: result.public_id
    };
  }

  async delete(publicIdOrUrl) {
    if (!this.isConfigured) return false;
    try {
      let publicId = publicIdOrUrl;
      if (publicIdOrUrl.includes('cloudinary.com')) {
        const parts = publicIdOrUrl.split('/');
        const filename = parts[parts.length - 1];
        publicId = `pulsechat/${filename.split('.')[0]}`;
      }
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (e) {
      console.warn('[CloudinaryStorageAdapter] Failed to delete file:', e.message);
      return false;
    }
  }
}

module.exports = CloudinaryStorageAdapter;
