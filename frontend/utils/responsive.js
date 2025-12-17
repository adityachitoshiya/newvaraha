// Responsive utility functions and hooks for all devices
import { useState, useEffect } from 'react';

// Device detection hook
export const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState('desktop');

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width >= 640 && width < 1024) {
        setDeviceType('tablet');
      } else if (width >= 1024 && width < 1920) {
        setDeviceType('desktop');
      } else {
        setDeviceType('tv');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return deviceType;
};

// Screen size hook
export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// Breakpoint hook
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('2xl');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 375) setBreakpoint('xs');
      else if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else if (width < 1536) setBreakpoint('2xl');
      else if (width < 1920) setBreakpoint('3xl');
      else setBreakpoint('4xl');
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
};

// Mobile detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Touch device detection
export const useIsTouchDevice = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
};

// Orientation detection
export const useOrientation = () => {
  const [orientation, setOrientation] = useState('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return orientation;
};

// Responsive class generator
export const getResponsiveClasses = (base, sm, md, lg, xl, xxl) => {
  return `${base} sm:${sm} md:${md} lg:${lg} xl:${xl} 2xl:${xxl}`;
};

// Container padding based on screen size
export const getContainerPadding = (screenWidth) => {
  if (screenWidth < 640) return 'px-4';
  if (screenWidth < 768) return 'px-6';
  if (screenWidth < 1024) return 'px-8';
  if (screenWidth < 1920) return 'px-12';
  return 'px-16';
};

// Grid columns based on screen size
export const getGridColumns = (screenWidth) => {
  if (screenWidth < 640) return 'grid-cols-1';
  if (screenWidth < 768) return 'grid-cols-2';
  if (screenWidth < 1024) return 'grid-cols-2';
  if (screenWidth < 1280) return 'grid-cols-3';
  if (screenWidth < 1920) return 'grid-cols-4';
  return 'grid-cols-5';
};

export default {
  useDeviceType,
  useScreenSize,
  useBreakpoint,
  useIsMobile,
  useIsTouchDevice,
  useOrientation,
  getResponsiveClasses,
  getContainerPadding,
  getGridColumns,
};
