import { useState, useEffect } from 'react';

function getBreakpoint() {
  const w = window.innerWidth;
  return { isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024 };
}

export default function useResponsive() {
  const [bp, setBp] = useState(getBreakpoint);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setBp(getBreakpoint());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return bp;
}
