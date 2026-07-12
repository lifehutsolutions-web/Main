import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const activePullRef = useRef(false);

  const pullThreshold = 75; // px
  const maxPull = 120; // px

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if we are at the very top of the window
      if (window.scrollY > 5) {
        activePullRef.current = false;
        return;
      }
      
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      activePullRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activePullRef.current || !touchStartRef.current || isRefreshing || showSuccess) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      // Only pull down, and make sure it's mostly a vertical drag
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
        // Apply logarithmic resistance: drag gets harder
        const distance = Math.min(deltaY * 0.45, maxPull);
        setPullDistance(distance);
        
        // Prevent default native browser pull-to-reload
        if (distance > 10 && e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!activePullRef.current) return;
      activePullRef.current = false;
      touchStartRef.current = null;

      if (isRefreshing || showSuccess) return;

      if (pullDistance >= pullThreshold) {
        setIsRefreshing(true);
        setPullDistance(pullThreshold); // keep container at threshold
        try {
          await onRefresh();
          setShowSuccess(true);
          setIsRefreshing(false);
          
          // Hold the success indicator briefly
          setTimeout(() => {
            setShowSuccess(false);
            setPullDistance(0);
          }, 1100);
        } catch (error) {
          console.error("Workspace refresh failed:", error);
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    const element = containerRef.current;
    if (element) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (element) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pullDistance, isRefreshing, showSuccess, onRefresh]);

  const progress = Math.min(pullDistance / pullThreshold, 1);
  const rotation = progress * 360;

  return (
    <div ref={containerRef} className="relative w-full min-h-screen">
      {/* Pull To Refresh Indicator */}
      <div 
        className="absolute top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-150 ease-out"
        style={{ 
          transform: `translateY(${pullDistance - 52}px)`, 
          opacity: pullDistance > 12 ? Math.min(pullDistance / 40, 1) : 0 
        }}
      >
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-md">
          {showSuccess ? (
            <motion.div 
              initial={{ scale: 0.7, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-[11px] font-bold tracking-tight">Synced successfully</span>
            </motion.div>
          ) : isRefreshing ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-[11px] font-bold tracking-tight animate-pulse">Syncing Cloud...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <RefreshCw 
                className="w-4 h-4 transition-transform duration-75"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
              <span className="text-[11px] font-bold tracking-tight">
                {pullDistance >= pullThreshold ? 'Release to update' : 'Pull to update'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Offset Anim */}
      <div 
        className="transition-all duration-150 ease-out"
        style={{ 
          transform: `translateY(${isRefreshing || showSuccess ? pullThreshold * 0.45 : pullDistance * 0.45}px)` 
        }}
      >
        {children}
      </div>
    </div>
  );
}
