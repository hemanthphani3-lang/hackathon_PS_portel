import React, { useEffect, useState } from 'react';
import MatrixRain from './MatrixRain';
import PixelRevealLogo from './PixelRevealLogo';

const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= text.length) {
        // Random glitch characters during typing
        const glitchChars = '!@#$%^&*()_+-=';
        const char = i < text.length ? text[i] : '';
        const glitch = Math.random() > 0.8 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char;
        
        setDisplayedText(text.substring(0, i) + (i < text.length ? glitch : ''));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayedText}</span>;
};

const SplashScreen: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fading out at 3.5s
    const fadeTimer = setTimeout(() => setIsFading(true), 3500);
    
    // Unmount at 4s
    const exitTimer = setTimeout(() => {
      setIsVisible(true); // Ensure it's visible initially
      
      const unmountTimer = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
      
      return () => clearTimeout(unmountTimer);
    }, 0);

    return () => {
      clearTimeout(fadeTimer);
      // exitTimer doesn't exist anymore in that scope, just use individual timers
    };
  }, []);

  // Simplified useEffect
  useEffect(() => {
    const fadeTimer = setTimeout(() => setIsFading(true), 3500);
    const exitTimer = setTimeout(() => setIsVisible(false), 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, []);
  
  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-500 ease-in-out ${isFading ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Background foundation */}
      <div className="absolute inset-0">
        <MatrixRain />
        
        {/* Perspective Data Grid Floor */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[400px] bg-[linear-gradient(to_bottom,transparent,rgba(0,255,0,0.1))] [perspective:1000px] [transform-style:preserve-3d]">
            <div className="absolute inset-0 [transform:rotateX(60deg)] bg-[linear-gradient(rgba(0,255,0,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.2)_1px,transparent_1px)] bg-[size:80px_80px] animate-[grid-move_20s_linear_infinite]" />
          </div>
        </div>
        
        {/* CRT Scanline Overlays */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>
      
      {/* Centered System Asset (Logo) */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="min-h-[300px] flex items-center justify-center">
          <PixelRevealLogo imageSrc="/ctf_logo2.jpg" duration={3500} />
        </div>
        <div className="mt-32 font-mono text-[#00ff00] tracking-[0.4em] text-[10px] opacity-80 uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-[#00ff00] animate-ping" />
          <TypewriterText text="Initializing secure environment..." />
          <span className="w-1 h-3 bg-[#00ff00] animate-pulse" />
        </div>
      </div>

      <style>{`
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 0 80px; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
