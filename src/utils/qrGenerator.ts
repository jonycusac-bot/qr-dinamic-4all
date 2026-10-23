import QRCode from 'qrcode';
import { QRDesignConfig } from '../types';

export interface RenderQROptions {
  url: string;
  brandName?: string;
  brandLogoUrl?: string;
  size?: number;
  design: QRDesignConfig;
  clientName?: string;
  projectName?: string;
}

export async function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  options: RenderQROptions
): Promise<void> {
  const {
    url,
    size = 400,
    design,
    clientName,
    projectName,
  } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // The frame hugs the QR quiet zone instead of adding a second wide margin.
  // Keep four clear modules on every side so phone cameras can detect the code.
  const hasFrame = design.includeFrame;
  const topHeaderHeight = hasFrame ? 50 : 0;
  const frameInset = hasFrame ? 8 : 0;
  const hasCenterLogo = Boolean(design.logoUrl?.trim());
  const qr = QRCode.create(url, { errorCorrectionLevel: hasCenterLogo ? 'H' : 'M' });
  const modules = qr.modules;
  const moduleCount = modules.size;
  const quietZoneModules = 4;
  const availableWidth = size + (hasFrame ? 48 : 32) - frameInset * 2;
  const cellSize = Math.max(4, Math.floor(availableWidth / (moduleCount + quietZoneModules * 2)));
  const matrixSize = moduleCount * cellSize;
  const quietZone = quietZoneModules * cellSize;
  const qrBoxSize = matrixSize + quietZone * 2;
  const totalWidth = qrBoxSize + frameInset * 2;
  const totalHeight = totalWidth + topHeaderHeight;
  const qrBoxX = frameInset;
  const qrBoxY = topHeaderHeight + frameInset;
  const qrX = qrBoxX + quietZone;
  const qrY = qrBoxY + quietZone;

  canvas.width = totalWidth;
  canvas.height = totalHeight;
  // Canvas Background - Always pure white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // Outer frame border if requested - Always solid black luxury border
  if (hasFrame) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const r = 16;
    ctx.beginPath();
    ctx.roundRect(4, 4, totalWidth - 8, totalHeight - 8, r);
    ctx.stroke();

    // Top banner background - Luxury solid black
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.roundRect(8, 8, totalWidth - 16, 42, [12, 12, 4, 4]);
    ctx.fill();

    // Render custom logo and banner text 'USER MANUAL' centered in a perfect line
    const bannerText = (design.frameText?.trim() || 'USER MANUAL').toUpperCase();
    const bannerY = 29;

    try {
      if (!options.brandLogoUrl) throw new Error('Text-only brand');
      const bannerLogo = await loadImage(options.brandLogoUrl);
      const bLogoH = 14;
      const bLogoW = Math.min(90, bLogoH * bannerLogo.width / bannerLogo.height);

      ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '0.10em';
      const textWidth = ctx.measureText(bannerText).width;
      const gap = 10;
      const separatorW = 1;
      const totalContentW = bLogoW + gap + separatorW + gap + textWidth;
      const startX = Math.round((totalWidth - totalContentW) / 2);

      // Draw white logo aligned in the center of the banner
      const logoY = Math.round(bannerY - bLogoH / 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(startX-3,logoY-3,bLogoW+6,bLogoH+6);
      ctx.drawImage(bannerLogo, startX, logoY, bLogoW, bLogoH);

      // Subtle vertical separator centered in line with logo and text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      const sepHeight = 12;
      ctx.fillRect(startX + bLogoW + gap, Math.round(bannerY - sepHeight / 2), separatorW, sepHeight);

      // Banner text (USER MANUAL) in exact horizontal line with the custom logo
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(bannerText, startX + bLogoW + gap + separatorW + gap, bannerY - 0.5);
    } catch {
      // Fallback text if image load fails
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '0.10em';
      ctx.fillText((options.brandName || 'QR Dinamic 4all') + ' | ' + bannerText, totalWidth / 2, bannerY, totalWidth-24);
    }
  }

  ctx.imageSmoothingEnabled = false;

  // Strict white quiet zone around the entire matrix.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

  // Use solid black square modules for maximum camera compatibility.
  ctx.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.get(row, col)) {
        ctx.fillRect(
          qrX + col * cellSize,
          qrY + row * cellSize,
          cellSize,
          cellSize
        );
      }
    }
  }

  // Draw Center Logo if explicitly provided by user
  if (design.logoUrl && design.logoUrl.trim().length > 0) {
    try {
      const logoImg = await loadImage(design.logoUrl);
      // Keep the logo small enough to preserve the code's readable data area.
      const logoRatio = Math.min(design.logoSize || 18, 18) / 100;
      const logoWidth = matrixSize * logoRatio;
      const logoHeight = (logoWidth / logoImg.width) * logoImg.height;
      const centerX = qrX + matrixSize / 2;
      const centerY = qrY + matrixSize / 2;
      const logoX = centerX - logoWidth / 2;
      const logoY = centerY - logoHeight / 2;
      const margin = design.logoMargin || 6;

      // Draw pure white background card with black border for the logo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(
        logoX - margin,
        logoY - margin,
        logoWidth + margin * 2,
        logoHeight + margin * 2,
        8
      );
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Could not load center QR logo:', err);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export async function exportCanvasAsImage(
  canvas: HTMLCanvasElement,
  filename: string,
  type: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<void> {
  const dataUrl = canvas.toDataURL(type, 1.0);
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
