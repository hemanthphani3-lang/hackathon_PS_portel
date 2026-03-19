import React, { useEffect, useRef, useState } from 'react';

interface PixelRevealLogoProps {
  imageSrc: string;
  duration?: number;
}

const PixelRevealLogo: React.FC<PixelRevealLogoProps> = ({ imageSrc, duration = 4000 }) => {
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const logoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!imageLoaded || !imgRef.current) return;

    const bgCanvas = bgCanvasRef.current;
    const logoCanvas = logoCanvasRef.current;
    if (!bgCanvas || !logoCanvas) return;

    const bgCtx = bgCanvas.getContext('2d');
    const logoCtx = logoCanvas.getContext('2d');
    if (!bgCtx || !logoCtx) return;

    const img = imgRef.current;
    const canvasWidth = dimensions.width;
    const canvasHeight = dimensions.height;

    // Logo scaling and centering
    const maxLogoSize = Math.min(canvasWidth * 0.8, canvasHeight * 0.6, 500);
    const scale = Math.min(maxLogoSize / img.width, maxLogoSize / img.height);
    const x = (canvasWidth - img.width * scale) / 2;
    const y = (canvasHeight - img.height * scale) / 2;

    const sliceCount = 38;
    const sliceHeight = (img.height * scale) / sliceCount;
    
    // Slice data
    const slices = Array.from({ length: sliceCount }, (_, i) => ({
      index: i,
      y: y + i * sliceHeight,
      startTime: Math.random() * (duration * 0.55),
      isSettled: false
    }));

    let startTime: number | null = null;
    let animationFrameId: number;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      bgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      logoCtx.clearRect(0, 0, canvasWidth, canvasHeight);

      // --- 1. BACKSIDE LAYER (Glow, Scanline) ---
      bgCtx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Scanning line moved to background
      const scanProgress = Math.min(elapsed / duration, 1);
      const scanY = y + (img.height * scale) * scanProgress;
      if (scanProgress < 1) {
        bgCtx.globalAlpha = 1;
        bgCtx.beginPath();
        bgCtx.moveTo(x - 50, scanY);
        bgCtx.lineTo(x + img.width * scale + 50, scanY);
        bgCtx.strokeStyle = '#00ff00';
        bgCtx.lineWidth = 1;
        bgCtx.stroke();
        bgCtx.globalAlpha = 1;
      }

      const glowProgress = Math.max(0, (elapsed / duration) - 0.5) / 0.5;
      if (glowProgress > 0) {
        const logoCenterX = x + (img.width * scale) / 2;
        const logoCenterY = y + (img.height * scale) / 2;
        
        // Secondary soft bloom (Large)
        const bloom = bgCtx.createRadialGradient(logoCenterX, logoCenterY, 0, logoCenterX, logoCenterY, (img.width * scale) * 2.5);
        bloom.addColorStop(0, `rgba(0, 255, 0, ${glowProgress * 0.15})`);
        bloom.addColorStop(1, 'rgba(0, 255, 0, 0)');
        bgCtx.fillStyle = bloom;
        bgCtx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Primary core glow
        const gradient = bgCtx.createRadialGradient(logoCenterX, logoCenterY, 0, logoCenterX, logoCenterY, (img.width * scale) * 1.0);
        gradient.addColorStop(0, `rgba(0, 255, 0, ${glowProgress * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // --- 2. FOREGROUND LAYER (Logo only, solid opacity) ---
      logoCtx.globalAlpha = 1.0; // Force full opacity to hide wires
      slices.forEach(slice => {
        if (elapsed > slice.startTime) {
          const sliceElapsed = elapsed - slice.startTime;
          const settleTime = 1100;
          const progress = Math.min(sliceElapsed / settleTime, 1);
          
          let glitchX = 0;

          if (progress < 1) {
            glitchX = (Math.random() - 0.5) * 20 * (1 - progress);
          }

          if (progress === 1) {
            logoCtx.shadowBlur = 10 * glowProgress;
            logoCtx.shadowColor = '#00ff00';
          }

          // Use Math.ceil on height to prevent sub-pixel gaps (bleed-through)
          logoCtx.drawImage(
            img, 
            0, 
            (slice.index * img.height) / sliceCount, 
            img.width, 
            img.height / sliceCount,
            x + glitchX, 
            slice.y, 
            img.width * scale, 
            Math.ceil(sliceHeight) + 0.5
          );
          logoCtx.shadowBlur = 0;
        }
      });

      if (elapsed < duration + 300) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        logoCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        logoCtx.globalAlpha = 1;
        logoCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [imageLoaded, duration, dimensions]);

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex items-center justify-center">
      {/* Background Layer: Wires, Glow, and Scan Line */}
      <canvas 
        ref={bgCanvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        className="absolute inset-0 block"
      />
      {/* Foreground Layer: Logo Reveal (Opaque) */}
      <canvas 
        ref={logoCanvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        className="absolute inset-0 block drop-shadow-[0_0_20px_rgba(0,255,0,0.4)]"
      />
    </div>
  );
};

export default PixelRevealLogo;









