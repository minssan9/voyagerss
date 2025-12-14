const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs').promises;
const path = require('path');

/**
 * Map Rendering Service
 * Generates route map images with path overlay
 */
class MapRenderingService {
  constructor(config = {}, logger = console) {
    this.logger = logger;
    this.mapsDir = config.mapsDir || path.join(process.cwd(), 'public/maps');
    this.outputDir = config.outputDir || path.join(process.cwd(), 'data/generated-maps');
    this.defaultWidth = config.defaultWidth || 1200;
    this.defaultHeight = config.defaultHeight || 800;

    // Ensure output directory exists
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      this.logger.warn('Failed to create output directory:', error.message);
    }
  }

  /**
   * Generate route map image
   * @param {Object} route - Route object with waypoints and path
   * @param {Object} options - Rendering options
   * @param {string} [options.terminalId] - Terminal ID
   * @param {number} [options.floorNumber] - Floor number
   * @param {string} [options.outputFilename] - Output filename
   * @returns {Promise<string>} Path to generated image
   */
  async generateRouteMap(route, options = {}) {
    const { terminalId, floorNumber, outputFilename } = options;

    this.logger.log(`🎨 Generating route map for ${terminalId}-${floorNumber}F`);

    try {
      // Try to load base floor map
      let canvas, ctx;
      const baseMapPath = path.join(this.mapsDir, `${terminalId?.toLowerCase()}_${floorNumber}f.png`);

      try {
        const baseImage = await loadImage(baseMapPath);
        canvas = createCanvas(baseImage.width, baseImage.height);
        ctx = canvas.getContext('2d');
        ctx.drawImage(baseImage, 0, 0);
        this.logger.log('✅ Loaded base floor map');
      } catch (error) {
        // No base map found, create blank canvas with coordinate system
        this.logger.warn('⚠️ Base map not found, creating blank canvas');
        canvas = createCanvas(this.defaultWidth, this.defaultHeight);
        ctx = canvas.getContext('2d');
        this.drawBlankMap(ctx, canvas.width, canvas.height, terminalId, floorNumber);
      }

      // Draw route path
      this.drawRoutePath(ctx, route.waypoints);

      // Draw waypoint markers
      this.drawWaypointMarkers(ctx, route.waypoints);

      // Draw route info
      this.drawRouteInfo(ctx, route, canvas.width, canvas.height);

      // Save to file
      const filename = outputFilename || `route-${Date.now()}.png`;
      const outputPath = path.join(this.outputDir, filename);
      const buffer = canvas.toBuffer('image/png');
      await fs.writeFile(outputPath, buffer);

      this.logger.log(`✅ Route map generated: ${outputPath}`);

      return outputPath;
    } catch (error) {
      this.logger.error('❌ Map generation failed:', error);
      throw error;
    }
  }

  /**
   * Draw blank map with grid and labels
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @param {string} terminalId - Terminal ID
   * @param {number} floorNumber - Floor number
   */
  drawBlankMap(ctx, width, height, terminalId, floorNumber) {
    // Background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    const gridSize = 100;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${terminalId} - ${floorNumber}F`, 20, 50);

    // Note
    ctx.fillStyle = '#666666';
    ctx.font = '16px Arial';
    ctx.fillText('(Placeholder Map - Actual floor plan to be added)', 20, 80);
  }

  /**
   * Draw route path as red line
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} waypoints - Array of waypoint objects with map_x, map_y
   */
  drawRoutePath(ctx, waypoints) {
    if (waypoints.length < 2) return;

    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw path with shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    const firstPoint = waypoints[0];
    ctx.moveTo(firstPoint.map_x, firstPoint.map_y);

    for (let i = 1; i < waypoints.length; i++) {
      const point = waypoints[i];
      ctx.lineTo(point.map_x, point.map_y);
    }

    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Draw waypoint markers
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Array} waypoints - Array of waypoint objects
   */
  drawWaypointMarkers(ctx, waypoints) {
    if (waypoints.length === 0) return;

    // Draw start marker (green circle)
    const start = waypoints[0];
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(start.map_x, start.map_y, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw end marker (red circle)
    const end = waypoints[waypoints.length - 1];
    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(end.map_x, end.map_y, 12, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw intermediate markers (small blue dots)
    ctx.fillStyle = '#0066FF';
    for (let i = 1; i < waypoints.length - 1; i++) {
      const waypoint = waypoints[i];
      ctx.beginPath();
      ctx.arc(waypoint.map_x, waypoint.map_y, 6, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw labels for start and end
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // Start label
    const startLabel = this.truncateLabel(start.name_ko);
    ctx.fillText(startLabel, start.map_x, start.map_y - 20);

    // End label
    const endLabel = this.truncateLabel(end.name_ko);
    ctx.fillText(endLabel, end.map_x, end.map_y - 20);

    ctx.textAlign = 'left'; // Reset
  }

  /**
   * Draw route information box
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} route - Route object
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   */
  drawRouteInfo(ctx, route, width, height) {
    const boxWidth = 300;
    const boxHeight = 100;
    const padding = 20;
    const x = width - boxWidth - padding;
    const y = padding;

    // Background box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Text
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('경로 정보', x + 15, y + 30);

    ctx.font = '16px Arial';
    ctx.fillText(`📏 거리: ${route.totalDistance}m`, x + 15, y + 55);
    ctx.fillText(`⏱️ 시간: 약 ${route.totalTime}분`, x + 15, y + 80);
  }

  /**
   * Truncate label to fit
   * @param {string} label - Label text
   * @param {number} maxLength - Max length
   * @returns {string} Truncated label
   */
  truncateLabel(label, maxLength = 15) {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate simple coordinate map (for testing without base images)
   * @param {Array} waypoints - Array of waypoints
   * @param {string} outputFilename - Output filename
   * @returns {Promise<string>} Path to generated image
   */
  async generateCoordinateMap(waypoints, outputFilename) {
    const canvas = createCanvas(this.defaultWidth, this.defaultHeight);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all waypoints
    ctx.fillStyle = '#0066FF';
    for (const waypoint of waypoints) {
      ctx.beginPath();
      ctx.arc(waypoint.map_x, waypoint.map_y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Label
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(waypoint.name_ko, waypoint.map_x + 12, waypoint.map_y + 4);
      ctx.fillStyle = '#0066FF';
    }

    // Save
    const outputPath = path.join(this.outputDir, outputFilename);
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);

    this.logger.log(`✅ Coordinate map generated: ${outputPath}`);
    return outputPath;
  }

  /**
   * Get output directory path
   * @returns {string} Output directory path
   */
  getOutputDir() {
    return this.outputDir;
  }

  /**
   * Clean up old generated maps
   * @param {number} maxAgeMs - Max age in milliseconds
   * @returns {Promise<number>} Number of files deleted
   */
  async cleanupOldMaps(maxAgeMs = 24 * 60 * 60 * 1000) {
    try {
      const files = await fs.readdir(this.outputDir);
      const now = Date.now();
      let deleted = 0;

      for (const file of files) {
        if (!file.endsWith('.png')) continue;

        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deleted++;
        }
      }

      this.logger.log(`🗑️ Cleaned up ${deleted} old map files`);
      return deleted;
    } catch (error) {
      this.logger.error('❌ Cleanup failed:', error);
      return 0;
    }
  }
}

module.exports = MapRenderingService;
