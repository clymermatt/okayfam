'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const threshold = 80;

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing) return;
      // Check if page is scrolled to top
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartY.current;

      if (distance > 0) {
        // Prevent native scroll while pulling
        e.preventDefault();
        setPullDistance(Math.min(distance * 0.4, 120));
      }
    };

    const handleTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;

      setPullDistance((current) => {
        if (current >= threshold) {
          setIsRefreshing(true);
          router.refresh();
          // Reload after a brief moment so the spinner is visible
          setTimeout(() => {
            window.location.reload();
          }, 300);
          return threshold * 0.5;
        }
        return 0;
      });
    };

    // Use passive: false on touchmove so we can call preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRefreshing, router]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div ref={containerRef}>
      {/* Pull indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] flex justify-center overflow-hidden bg-muted/80 transition-[height] duration-150 ease-out"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
      >
        <div className="flex items-end justify-center pb-2">
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
