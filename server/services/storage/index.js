const LocalStorageAdapter = require('./LocalStorageAdapter');
const CloudinaryStorageAdapter = require('./CloudinaryStorageAdapter');

class StorageService {
  constructor() {
    this.localAdapter = new LocalStorageAdapter();
    this.cloudinaryAdapter = new CloudinaryStorageAdapter();
  }

  getAdapter() {
    const provider = (process.env.STORAGE_PROVIDER || '').toLowerCase();
    if (provider === 'local') {
      return this.localAdapter;
    }
    if (this.cloudinaryAdapter.isConfigured || provider === 'cloudinary') {
      return this.cloudinaryAdapter;
    }
    return this.localAdapter;
  }

  async upload(file) {
    const adapter = this.getAdapter();
    const isCloudinary = adapter === this.cloudinaryAdapter;

    try {
      return await adapter.upload(file);
    } catch (err) {
      // When Cloudinary is configured and fails, do NOT silently fall back to
      // local storage — a local /uploads/ URL will be unreachable in production
      // (ephemeral filesystem). Surface the error so the client gets a clean
      // failure message instead of storing a permanently broken URL.
      if (isCloudinary) {
        console.error('[StorageService] Cloudinary upload failed:', err.message);
        throw new Error(`File upload failed: ${err.message}`);
      }

      // Local adapter failed (should be rare) — nothing else to fall back to
      console.error('[StorageService] Local upload failed:', err.message);
      throw err;
    }
  }

  async delete(fileUrl) {
    if (fileUrl && fileUrl.includes('cloudinary.com')) {
      return await this.cloudinaryAdapter.delete(fileUrl);
    }
    return await this.localAdapter.delete(fileUrl);
  }
}

module.exports = new StorageService();
