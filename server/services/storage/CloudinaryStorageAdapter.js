const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

/**
 * Cloudinary resource_type must be set explicitly:
 *   'image'  → JPEG, PNG, GIF, WEBP, SVG ...
 *   'video'  → MP4, WEBM, MOV **and all audio** (OGG, WAV, MP3, WEBM audio)
 *   'raw'    → PDF, DOCX, ZIP, plain text, and anything else
 *
 * Using 'auto' is unreliable for audio and large videos, so we detect
 * the correct type from the file's MIME type ourselves.
 */
function getResourceType(mimetype = '') {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/') || mimetype.startsWith('audio/')) return 'video';
  return 'raw';
}

/**
 * Build a correct delete public_id from a Cloudinary secure_url.
 * The URL structure is:
 *   https://res.cloudinary.com/<cloud>/[image|video|raw]/upload/[v123/]<folder/public_id>.<ext>
 * We need everything after /upload/[vXXX/] without the extension.
 */
function extractPublicId(url) {
  try {
    const uploadMarker = '/upload/';
    const idx = url.indexOf(uploadMarker);
    if (idx === -1) return null;

    let after = url.slice(idx + uploadMarker.length);

    // Strip optional version segment like "v1234567890/"
    after = after.replace(/^v\d+\//, '');

    // Remove file extension
    const dotIdx = after.lastIndexOf('.');
    if (dotIdx !== -1) after = after.slice(0, dotIdx);

    return after; // e.g. "pulsechat/voice_note_1699..."
  } catch {
    return null;
  }
}

class CloudinaryStorageAdapter {
  constructor() {
    this.isConfigured = false;
    if (
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
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

    const resourceType = getResourceType(file.mimetype);

    const uploadOptions = {
      resource_type: resourceType,
      folder: 'pulsechat',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    };

    // For audio delivered under Cloudinary's 'video' resource type, disable
    // any automatic transcoding so the original codec is preserved and the
    // browser's <audio> element can play it without re-encoding delays.
    if (file.mimetype.startsWith('audio/')) {
      // Do NOT set `format` — let Cloudinary keep the original container.
      // `invalidate: true` busts the CDN cache for any re-uploads.
      uploadOptions.invalidate = true;
    }

    let result;
    try {
      result = await cloudinary.uploader.upload(file.path, uploadOptions);
    } catch (uploadErr) {
      // Clean up temp file even if Cloudinary fails
      this._deleteTempFile(file.path);
      throw uploadErr;
    }

    this._deleteTempFile(file.path);

    // For audio files Cloudinary returns a video/* URL — override the MIME
    // type with the original so the browser picks the right player.
    const returnedMime = file.mimetype;

    return {
      url: result.secure_url,
      fileName: file.originalname,
      fileSize: file.size,
      fileMimeType: returnedMime,
      provider: 'cloudinary',
      publicId: result.public_id,
      resourceType
    };
  }

  async delete(publicIdOrUrl) {
    if (!this.isConfigured) return false;
    try {
      // Determine resource_type from URL path segment
      let resourceType = 'image';
      if (publicIdOrUrl.includes('/video/upload/')) resourceType = 'video';
      else if (publicIdOrUrl.includes('/raw/upload/')) resourceType = 'raw';

      const publicId = publicIdOrUrl.includes('cloudinary.com')
        ? extractPublicId(publicIdOrUrl)
        : publicIdOrUrl;

      if (!publicId) return false;

      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return true;
    } catch (e) {
      console.warn('[CloudinaryStorageAdapter] Failed to delete file:', e.message);
      return false;
    }
  }

  _deleteTempFile(filePath) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // non-fatal
    }
  }
}

module.exports = CloudinaryStorageAdapter;
