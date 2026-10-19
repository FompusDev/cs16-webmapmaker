/**
 * In-Browser WAD3 Texture Packer for GoldSrc / Half-Life / CS 1.6
 * Runs 100% inside client browser (no server needed).
 */

class BrowserWad {
  constructor() {
    this.textures = []; // Array of { name, width, height, data (Uint8Array) }
  }

  // Quantizes an HTML Image/Canvas to 256-color palette and generates 4 mipmaps
  async addTextureFromImage(name, imgElement, isTransparent = false) {
    const cleanName = name.replace(/[^A-Za-z0-9_]/g, '').toUpperCase().substring(0, 15);
    
    // Draw on hidden canvas to resize to multiple of 16 (max 512)
    let w = Math.min(512, Math.max(16, Math.floor(imgElement.width / 16) * 16));
    let h = Math.min(512, Math.max(16, Math.floor(imgElement.height / 16) * 16));
    if (isNaN(w) || w <= 0) w = 128;
    if (isNaN(h) || h <= 0) h = 128;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgElement, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);

    // Simple median-cut / color quantization to 256 colors
    const { palette, indexedPixels } = this.quantizeColors(imgData.data, w, h, isTransparent);

    // Generate 4 mipmaps
    const mip0 = indexedPixels;
    const mip1 = this.downsampleIndices(mip0, w, h, palette);
    const mip2 = this.downsampleIndices(mip1, w >> 1, h >> 1, palette);
    const mip3 = this.downsampleIndices(mip2, w >> 2, h >> 2, palette);

    // Encode GoldSrc Miptex
    const miptexBytes = this.encodeMiptex(cleanName, w, h, mip0, mip1, mip2, mip3, palette);
    this.textures.push({
      name: cleanName,
      width: w,
      height: h,
      palette: palette,
      mip0: mip0,
      data: miptexBytes
    });
  }

  quantizeColors(rgbaData, w, h, isTransparent) {
    // Collect distinct colors
    const totalPixels = w * h;
    const palette = [];
    const colorMap = new Map();

    // 256-color palette (RGB triplets)
    // If transparent, index 255 is reserved for blue (0, 0, 255)
    const maxColors = isTransparent ? 255 : 256;

    // Fast popularity / uniform quantizer
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = rgbaData[idx] & 0xF8;     // 5-bit
      const g = rgbaData[idx + 1] & 0xFC; // 6-bit
      const b = rgbaData[idx + 2] & 0xF8; // 5-bit
      const key = (r << 16) | (g << 8) | b;
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }

    // Sort by frequency
    const sortedColors = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);

    for (let i = 0; i < Math.min(maxColors, sortedColors.length); i++) {
      const key = sortedColors[i][0];
      palette.push((key >> 16) & 0xFF, (key >> 8) & 0xFF, key & 0xFF);
    }

    // Pad palette to 256 entries
    while (palette.length < 256 * 3) {
      palette.push(0, 0, 0);
    }

    if (isTransparent) {
      palette[255 * 3] = 0;
      palette[255 * 3 + 1] = 0;
      palette[255 * 3 + 2] = 255;
    }

    // Map pixels to palette indices
    const indexedPixels = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = rgbaData[idx];
      const g = rgbaData[idx + 1];
      const b = rgbaData[idx + 2];
      indexedPixels[i] = this.findClosestPaletteIndex(r, g, b, palette, maxColors);
    }

    return { palette, indexedPixels };
  }

  findClosestPaletteIndex(r, g, b, palette, maxColors) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < maxColors; i++) {
      const pr = palette[i * 3];
      const pg = palette[i * 3 + 1];
      const pb = palette[i * 3 + 2];
      const dr = r - pr;
      const dg = g - pg;
      const db = b - pb;
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
        if (dist === 0) break;
      }
    }
    return bestIdx;
  }

  downsampleIndices(srcIndices, w, h, palette) {
    const nw = Math.max(1, w >> 1);
    const nh = Math.max(1, h >> 1);
    const dst = new Uint8Array(nw * nh);

    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        // Sample top-left pixel
        const sx = Math.min(w - 1, x * 2);
        const sy = Math.min(h - 1, y * 2);
        dst[y * nw + x] = srcIndices[sy * w + sx];
      }
    }
    return dst;
  }

  encodeMiptex(name, w, h, mip0, mip1, mip2, mip3, palette) {
    // Header size = 16 (name) + 4 (width) + 4 (height) + 16 (4 offsets) = 40 bytes
    const headerSize = 40;
    const ofs0 = headerSize;
    const ofs1 = ofs0 + mip0.length;
    const ofs2 = ofs1 + mip1.length;
    const ofs3 = ofs2 + mip2.length;
    const paletteOfs = ofs3 + mip3.length;
    const totalSize = paletteOfs + 2 + 768 + 2;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // 16 bytes ASCII name
    for (let i = 0; i < 16; i++) {
      bytes[i] = i < name.length ? name.charCodeAt(i) : 0;
    }

    view.setUint32(16, w, true);
    view.setUint32(20, h, true);
    view.setUint32(24, ofs0, true);
    view.setUint32(28, ofs1, true);
    view.setUint32(32, ofs2, true);
    view.setUint32(36, ofs3, true);

    // Mipmaps
    bytes.set(mip0, ofs0);
    bytes.set(mip1, ofs1);
    bytes.set(mip2, ofs2);
    bytes.set(mip3, ofs3);

    // Palette count: 256
    view.setUint16(paletteOfs, 256, true);
    // Palette 768 bytes
    bytes.set(new Uint8Array(palette), paletteOfs + 2);
    // 2 bytes padding
    view.setUint16(paletteOfs + 2 + 768, 0, true);

    return bytes;
  }

  buildWad() {
    const numLumps = this.textures.length;
    const headerSize = 12; // 'WAD3' (4) + numLumps (4) + infoTableOfs (4)

    let currentOffset = headerSize;
    const lumpData = [];
    const dirEntries = [];

    for (const tex of this.textures) {
      lumpData.push(tex.data);
      const size = tex.data.length;

      // Directory entry: 32 bytes
      // filepos (4), disksize (4), size (4), type (1), compression (1), pad (2), name (16)
      const entryBuf = new ArrayBuffer(32);
      const entryView = new DataView(entryBuf);
      const entryBytes = new Uint8Array(entryBuf);

      entryView.setUint32(0, currentOffset, true);
      entryView.setUint32(4, size, true);
      entryView.setUint32(8, size, true);
      entryView.setUint8(12, 0x43); // LUMP_MIPTEX
      entryView.setUint8(13, 0);

      for (let i = 0; i < 16; i++) {
        entryBytes[16 + i] = i < tex.name.length ? tex.name.charCodeAt(i) : 0;
      }

      dirEntries.push(entryBytes);
      currentOffset += size;
    }

    const infoTableOfs = currentOffset;
    const totalFileSize = infoTableOfs + (numLumps * 32);
    const finalBuf = new Uint8Array(totalFileSize);
    const finalView = new DataView(finalBuf.buffer);

    // Header: 'WAD3'
    finalBuf[0] = 0x57; finalBuf[1] = 0x41; finalBuf[2] = 0x44; finalBuf[3] = 0x33;
    finalView.setUint32(4, numLumps, true);
    finalView.setUint32(8, infoTableOfs, true);

    // Copy lump bytes
    let cursor = 12;
    for (const lump of lumpData) {
      finalBuf.set(lump, cursor);
      cursor += lump.length;
    }

    // Copy directory entries
    for (const entry of dirEntries) {
      finalBuf.set(entry, cursor);
      cursor += entry.length;
    }

    return finalBuf;
  }
}

window.BrowserWad = BrowserWad;
