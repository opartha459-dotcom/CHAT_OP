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
    try {
      return await adapter.upload(file);
    } catch (err) {
      console.warn(
        `[StorageService] Upload using ${adapter.constructor.name} failed: ${err.message}. Falling back to LocalStorageAdapter.`
      );
      return await this.localAdapter.upload(file);
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
