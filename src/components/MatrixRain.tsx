import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const characters = '01';
    
    // 3D Layers: All set to 10px for high-density 'Micro' look, but with different speeds/opacities
    const layers = [
      { fontSize: 10, speedMult: 0.6, opacityMult: 0.3 },  // Far back
      { fontSize: 10, speedMult: 1.2, opacityMult: 0.6 },  // Mid ground
      { fontSize: 10, speedMult: 2.5, opacityMult: 1.0 }   // Front row
    ];

    // Initial drops for all layers - spread out vertically across the screen
    let drops = layers.flatMap((layer) => {
      const columns = Math.floor(width / layer.fontSize);
      return Array.from({ length: columns }, (_, i) => ({
        x: i * layer.fontSize,
        y: Math.random() * height * -1.5, // Start above the screen
        layer: layer,
        speed: (2 + Math.random() * 5) * layer.speedMult
      }));
    });

    const draw = () => {
      // Very light clear for long digital trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      drops.forEach((drop) => {
        // --- 1. Interaction Logic ---
        const dx = mouseRef.current.x - drop.x;
        const dy = mouseRef.current.y - drop.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const interactionRadius = 150;
        
        let displayX = drop.x;
        let displayY = drop.y;
        let isBright = false;

        if (dist < interactionRadius) {
          const force = (interactionRadius - dist) / interactionRadius;
          displayX += dx * force * 0.3; // Push away from mouse
          isBright = true;
        }

        // --- 2. Color Selection ---
        const char = characters.charAt(Math.floor(Math.random() * characters.length));
        
        const alpha = isBright ? 1 : drop.layer.opacityMult * 0.9;
        const colorRand = Math.random();
        
        if (isBright) {
           ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`; // Bright Green Flash on contact
        } else if (colorRand > 0.85) {
           ctx.fillStyle = `rgba(0, 255, 170, ${alpha})`; // Emerald
        } else {
           ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`; // Standard Green
        }

        ctx.font = `bold ${drop.layer.fontSize}px monospace`;
        
        // Add glow to lead/bright characters
        if (isBright || colorRand > 0.95) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = ctx.fillStyle as string;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillText(char, displayX, displayY);
        ctx.shadowBlur = 0;

        // Reset drop
        if (drop.y > height) {
          if (Math.random() > 0.95) {
            drop.y = Math.random() * -100;
            drop.x = Math.floor(Math.random() * width / drop.layer.fontSize) * drop.layer.fontSize;
          }
        }

        drop.y += drop.speed;
      });
    };

    const interval = setInterval(draw, 33);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      // Re-populate system
      drops = layers.flatMap((layer) => {
        const columns = Math.floor(width / layer.fontSize);
        return Array.from({ length: columns }, (_, i) => ({
          x: i * layer.fontSize,
          y: Math.random() * height * -1,
          layer: layer,
          speed: (2 + Math.random() * 5) * layer.speedMult
        }));
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 opacity-100 pointer-events-none" />;
};

export default MatrixRain;
