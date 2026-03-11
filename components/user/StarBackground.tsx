'use client';

import { useEffect, useRef } from 'react';

export default function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const count = 120;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2.5 + 0.5;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 4 + Math.random() * 6;

      star.className = 'star';
      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${x}%;
        top: ${y}%;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        opacity: ${0.3 + Math.random() * 0.7};
      `;
      container.appendChild(star);
    }
  }, []);

  return <div ref={containerRef} className="stars-bg" aria-hidden="true" />;
}
