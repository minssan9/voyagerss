const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const WeatherImageDTO = require('../dtos/WeatherImageDTO');

/**
 * Business logic service for Weather operations
 * Implements weather data collection and management
 */
class WeatherService {
  constructor(config, weatherImageRepository = null) {
    this.config = config;
    this.weatherImageRepository = weatherImageRepository;
    this.baseUrl = 'https://www.weather.go.kr/w/repositary/image/sat/gk2a/KO';
    this.listApiUrl = 'https://www.weather.go.kr/w/wnuri-img/rest/sat/images/gk2a.do?autoStart=&zoomLevel=&zoomX=&zoomY=&showOption=&mapType=img&opacity=0.3&area=ko020lc&tm=&tm_display=&itv=0.5&leaflet=0&kmap=0&unit=m%2Fs';
    // Handle both old config format and new ConfigManager format
    // Try multiple ways to get BASE_PATH
    let basePath = null;
    if (config && config.BASE_PATH) {
      basePath = config.BASE_PATH;
    } else if (config && typeof config.get === 'function') {
      basePath = config.get('weather.basePath') || config.get('BASE_PATH');
    }
    // Fallback to environment variable or default
    if (!basePath) {
      basePath = process.env.BASE_PATH || '/Volumes/SSD-NVMe-2';
    }
    this.baseImageDir = path.join(basePath, 'weather-images');
    console.log(`📁 Weather images will be saved to: ${this.baseImageDir}`);
    this.timeout = 30000;
    this.maxRetries = 3;
  }

  /**
   * Initialize the weather service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Ensure the base image directory exists
      await this._ensureDirectoryExists();
      console.log(`✅ WeatherService initialized successfully`);
      console.log(`📁 Image directory: ${this.baseImageDir}`);
    } catch (error) {
      console.error('Failed to initialize WeatherService:', error);
      throw error;
    }
  }

  /**
   * Get latest weather image
   * @returns {Promise<Object>} Latest weather image data
   */
  async getLatestWeatherImage() {
    try {
      const imageData = await this._fetchLatestImage();
      return {
        success: true,
        data: imageData
      };
    } catch (error) {
      console.error('Error getting latest weather image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download and save weather image
   * @param {Object} options - Download options
   * @returns {Promise<Object>} Download result
   */
  async downloadWeatherImage(options = {}) {
    try {
      const { imageType = 'satellite', date = null, timestamp = null } = options;
      
      // Ensure directory exists
      await this._ensureDirectoryExists();
      
      // Fetch image data (timestamp override supported)
      let imageData;
      if (timestamp && /^\d{12}$/.test(timestamp)) {
        // Try both .thn.png and .png suffixes
        const suffixes = ['.thn.png', '.png'];
        for (const suffix of suffixes) {
          const filename = `gk2a_ami_le1b_rgb-s-true_ko020lc_${timestamp}${suffix}`;
          const url = `${this.baseUrl}/${filename}`;
          imageData = await this._fetchImageByUrl(url);
          if (imageData) break;
        }
        if (!imageData) {
          throw new Error(`No image found for timestamp ${timestamp}`);
        }
      } else {
        imageData = await this._fetchImageData(imageType, date);
      }
      
      // Save to file system
      const filePath = await this._saveImageToFile(imageData, imageType);
      
      // Save to database if repository is available
      if (this.weatherImageRepository) {
        await this._saveToDatabase(imageData, filePath, imageType);
      }
      
      return {
        success: true,
        filePath,
        imageData
      };
    } catch (error) {
      console.error('Error downloading weather image:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get weather images by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of weather images
   */
  async getWeatherImagesByDateRange(startDate, endDate) {
    try {
      if (!this.weatherImageRepository) {
        throw new Error('Weather image repository not available');
      }

      const images = await this.weatherImageRepository.findByDateRange(startDate, endDate);
      return images.map(image => WeatherImageDTO.fromDatabase(image));
    } catch (error) {
      console.error('Error getting weather images by date range:', error);
      throw new Error('Failed to retrieve weather images');
    }
  }

  /**
   * Get weather image by ID
   * @param {number} id - Image ID
   * @returns {Promise<WeatherImageDTO>} Weather image DTO
   */
  async getWeatherImageById(id) {
    try {
      if (!this.weatherImageRepository) {
        throw new Error('Weather image repository not available');
      }

      const image = await this.weatherImageRepository.findById(id);
      if (!image) {
        throw new Error('Weather image not found');
      }
      return WeatherImageDTO.fromDatabase(image);
    } catch (error) {
      console.error(`Error getting weather image ${id}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old weather images
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldImages(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up database records
      if (this.weatherImageRepository) {
        await this.weatherImageRepository.deleteByDateRange(null, cutoffDate);
      }

      // Clean up file system
      const files = await fs.readdir(this.baseImageDir);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.baseImageDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return {
        success: true,
        deletedCount,
        cutoffDate
      };
    } catch (error) {
      console.error('Error cleaning up old images:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get weather service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getWeatherStats() {
    try {
      if (!this.weatherImageRepository) {
        return {
          totalImages: 0,
          message: 'Database repository not available'
        };
      }

      const stats = await this.weatherImageRepository.getStats();
      return stats;
    } catch (error) {
      console.error('Error getting weather statistics:', error);
      throw new Error('Failed to retrieve weather statistics');
    }
  }

  /**
   * Sync images from KMA list API: download any missing files
   * @param {number} maxCount - Limit number of timestamps to process
   * @returns {Promise<{processed:number, downloaded:number, skipped:number, errors:number}>}
   */
  async syncImagesFromList(maxCount = 24) {
    await this._ensureDirectoryExists();
    const result = { processed: 0, downloaded: 0, skipped: 0, errors: 0 };
    try {
      const items = await this._fetchImageTimestampsFromList();
      const slice = items.slice(0, maxCount);
      for (const item of slice) {
        result.processed++;
        // Check if file already exists using timestamp extracted from url
        const candidateNames = [
          `gk2a_ami_le1b_rgb-s-true_ko020lc_${item.timestamp}.thn.png`,
          `gk2a_ami_le1b_rgb-s-true_ko020lc_${item.timestamp}.png`
        ];
        let exists = false;
        for (const name of candidateNames) {
          try {
            const filePath = path.resolve(this.baseImageDir, name);
            await fs.access(filePath);
            exists = true;
            break;
          } catch {
            // not exist
          }
        }
        if (exists) {
          result.skipped++;
          continue;
        }
        try {
          const imageData = await this._fetchImageByUrl(item.url);
          if (imageData) {
            await this._saveImageToFile(imageData, 'satellite');
            result.downloaded++;
          } else {
            result.errors++;
          }
        } catch (e) {
          console.warn(`⚠️  Failed to download ${item.url}: ${e.message}`);
          result.errors++;
        }
      }
      return result;
    } catch (e) {
      console.error('Error syncing images from list:', e);
      throw e;
    }
  }

  /**
   * Download image (alias removed - use downloadWeatherImage instead)
   */

  /**
   * Get stored images from filesystem
   * @param {number} limit - Maximum number of images to return
   * @param {Date} startDate - Optional start date for filtering
   * @param {Date} endDate - Optional end date for filtering
   * @returns {Promise<Array>} Array of image file information
   */
  async getStoredImages(limit = 20, startDate = null, endDate = null) {
    try {
      await this._ensureDirectoryExists();
      const files = await fs.readdir(this.baseImageDir);
      
      // Filter image files and get their stats
      const imageFiles = [];
      for (const file of files) {
        if (file.match(/\.(png|jpg|jpeg|gif)$/i)) {
          const filePath = path.join(this.baseImageDir, file);
          try {
            const stats = await fs.stat(filePath);
            
            // Extract date from filename
            // Supported:
            // - kma_ko_rgb_YYYYMMDD_HHMM.png
            // - gk2a_ami_le1b_rgb-s-true_ko020lc_YYYYMMDDHHMM.thn.png
            let fileDate = null;
            let dateStr = null;
            let timeStr = null;
            const dateMatchOld = file.match(/(\d{8})_(\d{4})/);
            const dateMatchNew = file.match(/_(\d{12})/);
            if (dateMatchOld) {
              dateStr = dateMatchOld[1];
              timeStr = dateMatchOld[2];
            } else if (dateMatchNew) {
              const ts = dateMatchNew[1]; // YYYYMMDDHHMM
              dateStr = ts.substring(0, 8);
              timeStr = ts.substring(8, 12);
            }
            if (dateStr && timeStr) {
              const year = parseInt(dateStr.substring(0, 4));
              const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
              const day = parseInt(dateStr.substring(6, 8));
              const hour = parseInt(timeStr.substring(0, 2));
              const minute = parseInt(timeStr.substring(2, 4));
              fileDate = new Date(year, month, day, hour, minute);
            } else {
              // Fallback to file modified time if date can't be extracted from filename
              fileDate = stats.mtime;
            }
            
            // Apply date range filter if provided
            if (startDate && fileDate < startDate) {
              continue;
            }
            if (endDate && fileDate > endDate) {
              continue;
            }
            
            imageFiles.push({
              filename: file,
              filepath: filePath,
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
              capturedAt: fileDate // Add captured date from filename
            });
          } catch (error) {
            console.warn(`Error reading file ${file}:`, error.message);
          }
        }
      }

      // Sort by captured date (newest first) and limit
      imageFiles.sort((a, b) => {
        const dateA = a.capturedAt || a.modified;
        const dateB = b.capturedAt || b.modified;
        return dateB - dateA;
      });
      return imageFiles.slice(0, limit);
    } catch (error) {
      console.error('Error getting stored images:', error);
      return [];
    }
  }

  /**
   * Get service status
   * @returns {Promise<Object>} Service status information
   */
  async getStatus() {
    try {
      // Try to fetch latest image to check service availability
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');
      
      const timestamp = `${year}${month}${day}${hour}${minute}`;
      const filename = `gk2a_ami_le1b_rgb-s-true_ko020lc_${timestamp}.thn.png`;
      const testUrl = `${this.baseUrl}/${filename}`;

      // Check if directory exists and is accessible
      await this._ensureDirectoryExists();

      return {
        status: 'available',
        currentTimestamp: timestamp,
        testUrl: testUrl,
        baseUrl: this.baseUrl,
        baseImageDir: this.baseImageDir
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        currentTimestamp: null,
        testUrl: null
      };
    }
  }

  /**
   * Cleanup old images (alias for cleanupOldImages)
   * @param {number} daysToKeep - Number of days to keep
   * @returns {Promise<number>} Number of deleted files
   */
  async cleanup(daysToKeep = 7) {
    try {
      const result = await this.cleanupOldImages(daysToKeep);
      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return 0;
    }
  }

  /**
   * Fetch image by URL (handles both relative and absolute URLs)
   * @param {string} url - Relative or absolute URL
   * @returns {Promise<Object|null>} Image data or null if not found
   * @private
   */
  async _fetchImageByUrl(url) {
    const fullUrl = url.startsWith('http') ? url : `https://www.weather.go.kr${url}`;
    const filename = path.basename(url);
    try {
      return await this._downloadAndValidatePng(fullUrl, filename);
    } catch {
      return null;
    }
  }

  /**
   * Fetch latest image data from weather service
   * @returns {Promise<Object>} Image data
   * @private
   */
  async _fetchLatestImage() {
    // Use KMA list API to get available image items, try newest first
    const items = await this._fetchImageTimestampsFromList();
    for (const item of items) {
      const image = await this._fetchImageByUrl(item.url);
      if (image) return image;
    }
    throw new Error('No valid weather image found from KMA repository.');
  }

  /**
   * Fetch image data with retry logic
   * @param {string} imageType - Type of image
   * @param {Date} date - Specific date
   * @returns {Promise<Object>} Image data
   * @private
   */
  async _fetchImageData(imageType, date) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this._fetchLatestImage();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Fetch available image items from KMA list API
   * @returns {Promise<Array<{url: string, tm: string, timestamp: string}>>} Array of image items (newest first)
   * @private
   */
  async _fetchImageTimestampsFromList() {
    const res = await axios.get(this.listApiUrl, {
      timeout: this.timeout,
      validateStatus: (status) => status === 200
    });
    const items = [];
    if (Array.isArray(res.data)) {
      for (const item of res.data) {
        if (item && typeof item.url === 'string') {
          // Extract timestamp from url for file existence checking
          const m = item.url.match(/_(\d{12})\.(?:thn\.)?png/i);
          if (m) {
            items.push({
              url: item.url,
              tm: item.tm || null,
              timestamp: m[1]
            });
          }
        }
      }
    }
    if (items.length === 0) {
      throw new Error('No valid image items found in KMA list API response');
    }
    // Sort by timestamp descending (newest first)
    return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Convert KST 'tm' (YYYYMMDDHHMM in KST) to UTC timestamp string used in filenames
   * @param {string} kstTm
   * @returns {string}
   * @private
   */
  _convertKstTmToUtcTs(kstTm) {
    const y = parseInt(kstTm.substring(0, 4), 10);
    const mo = parseInt(kstTm.substring(4, 6), 10) - 1; // 0-based
    const d = parseInt(kstTm.substring(6, 8), 10);
    const h = parseInt(kstTm.substring(8, 10), 10);
    const m = parseInt(kstTm.substring(10, 12), 10);
    // Interpret provided components as KST clock time, then convert to UTC (-9h)
    const kstAsUtc = Date.UTC(y, mo, d, h, m);
    const utcMs = kstAsUtc - (9 * 60 * 60 * 1000);
    const utc = new Date(utcMs);
    const Y = String(utc.getUTCFullYear()).padStart(4, '0');
    const M = String(utc.getUTCMonth() + 1).padStart(2, '0');
    const D = String(utc.getUTCDate()).padStart(2, '0');
    const H = String(utc.getUTCHours()).padStart(2, '0');
    const Min = String(utc.getUTCMinutes()).padStart(2, '0');
    return `${Y}${M}${D}${H}${Min}`;
  }

  /**
   * Download and validate PNG by signature
   * @param {string} url
   * @param {string} filename
   * @returns {Promise<{filename:string,url:string,data:Buffer,contentType:string,size:number}|null>}
   * @private
   */
  async _downloadAndValidatePng(url, filename) {
    console.log(`🔍 Attempting to fetch: ${url}`);
    const response = await axios.get(url, {
      timeout: this.timeout,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Referer': 'https://www.weather.go.kr/',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      validateStatus: (status) => status === 200,
      maxRedirects: 5
    });
    const contentType = response.headers['content-type'] || '';
    const data = response.data;
    if (contentType.includes('text/html')) {
      console.log(`⚠️ HTML response for ${filename}`);
      return null;
    }
    if (data.length < 5000) {
      try {
        const text = Buffer.from(data).toString('utf-8', 0, 200);
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          console.log(`⚠️ HTML detected in small response for ${filename}`);
          return null;
        }
      } catch {
        // ignore encoding issues
      }
    }
    const buffer = Buffer.from(data);
    if (buffer.length < 8) {
      console.log(`⚠️ Response too small for ${filename}`);
      return null;
    }
    const pngSignature = buffer.slice(0, 8);
    const isValidPng = pngSignature[0] === 0x89 && 
                      pngSignature[1] === 0x50 && 
                      pngSignature[2] === 0x4E && 
                      pngSignature[3] === 0x47 &&
                      pngSignature[4] === 0x0D &&
                      pngSignature[5] === 0x0A &&
                      pngSignature[6] === 0x1A &&
                      pngSignature[7] === 0x0A;
    if (!isValidPng) {
      console.log(`⚠️ Invalid PNG signature for ${filename}`);
      return null;
    }
    console.log(`✅ Found valid image: ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    return {
      filename,
      url,
      data: response.data,
      contentType: contentType || 'image/png',
      size: response.data.length
    };
  }

  /**
   * Save image to file system
   * @param {Object} imageData - Image data
   * @param {string} imageType - Type of image
   * @returns {Promise<string>} File path
   * @private
   */
  async _saveImageToFile(imageData, imageType) {
    const filename = imageData.filename;
    const filePath = path.resolve(this.baseImageDir, filename);
    
    // Ensure directory exists before writing
    await this._ensureDirectoryExists();
    
    await fs.writeFile(filePath, imageData.data);
    console.log(`💾 Image saved: ${filePath} (${(imageData.data.length / 1024).toFixed(2)} KB)`);
    return filePath;
  }

  /**
   * Save image metadata to database
   * @param {Object} imageData - Image data
   * @param {string} filePath - File path
   * @param {string} imageType - Type of image
   * @returns {Promise<number>} Database record ID
   * @private
   */
  async _saveToDatabase(imageData, filePath, imageType) {
    const stats = await fs.stat(filePath);
    
    const imageRecord = {
      filename: imageData.filename,
      filePath,
      imageType,
      capturedAt: new Date().toISOString(),
      fileSize: stats.size,
      dimensions: null, // Could be extracted from image data
      metadata: {
        url: imageData.url,
        contentType: imageData.contentType,
        downloadTime: new Date().toISOString()
      }
    };

    return await this.weatherImageRepository.createWeatherImage(imageRecord);
  }

  /**
   * Ensure directory exists
   * @returns {Promise<void>}
   * @private
   */
  async _ensureDirectoryExists() {
    try {
      await fs.access(this.baseImageDir);
      console.log(`✅ Directory exists: ${this.baseImageDir}`);
    } catch (error) {
      console.log(`📁 Creating directory: ${this.baseImageDir}`);
      await fs.mkdir(this.baseImageDir, { recursive: true });
      console.log(`✅ Directory created: ${this.baseImageDir}`);
    }
  }
}

module.exports = WeatherService;
