'use client';

import { useEffect, useRef, useState } from 'react';

interface FadeInOnScrollProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

// Shared IntersectionObserver instance for better performance
let sharedObserver: IntersectionObserver | null = null;

function getSharedObserver() {
  if (typeof window === 'undefined') return null;
  
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            const delay = parseInt(target.dataset.delay || '0', 10);
            const callback = (target as any).__fadeCallback;
            
            if (callback) {
              setTimeout(() => {
                callback();
              }, delay);
            }
            sharedObserver?.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );
  }
  
  return sharedObserver;
}

export default function FadeInOnScroll({ 
  children, 
  delay = 0, 
  duration = 600,
  className = '' 
}: FadeInOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = getSharedObserver();
    const element = ref.current;
    
    if (!element || !observer) return;

    // Store callback and delay on element
    (element as any).__fadeCallback = () => setIsVisible(true);
    element.dataset.delay = delay.toString();

    observer.observe(element);

    return () => {
      if (element && observer) {
        observer.unobserve(element);
      }
    };
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
