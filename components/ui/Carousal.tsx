'use client';

import { useState, useEffect, useCallback, Children, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Circle, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils/css';

interface CarouselProps {
  children: ReactNode;
  autoPlay?: boolean;
  interval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  loop?: boolean;
  className?: string;
  slideClassName?: string;
  arrowClassName?: string;
  dotClassName?: string;
  onSlideChange?: (index: number) => void;
}

export function Carousel({
  children,
  autoPlay = false,
  interval = 5000,
  showArrows = true,
  showDots = true,
  loop = true,
  className,
  slideClassName,
  arrowClassName,
  dotClassName,
  onSlideChange,
}: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const slides = Children.toArray(children);
  const totalSlides = slides.length;

  const goToSlide = useCallback((index: number) => {
    let newIndex = index;
    
    if (loop) {
      if (index < 0) newIndex = totalSlides - 1;
      if (index >= totalSlides) newIndex = 0;
    } else {
      newIndex = Math.max(0, Math.min(index, totalSlides - 1));
    }

    setCurrentIndex(newIndex);
    onSlideChange?.(newIndex);
  }, [totalSlides, loop, onSlideChange]);

  const goToNext = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (!isPlaying || !autoPlay) return;

    const timer = setInterval(goToNext, interval);
    return () => clearInterval(timer);
  }, [isPlaying, autoPlay, interval, goToNext]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      } else if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  if (totalSlides === 0) return null;

  return (
    <div className={cn('relative overflow-hidden group', className)}>
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={cn(
              'absolute inset-0 transition-all duration-500 ease-in-out',
              slideClassName,
              index === currentIndex
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-full'
            )}
            aria-hidden={index !== currentIndex}
            aria-labelledby={`carousel-slide-${index}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {showArrows && totalSlides > 1 && (
        <>
          <button
            onClick={goToPrev}
            className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm',
              'rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !loop && currentIndex === 0 && 'hidden',
              arrowClassName
            )}
            aria-label="Previous slide"
            disabled={!loop && currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              'absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 backdrop-blur-sm',
              'rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !loop && currentIndex === totalSlides - 1 && 'hidden',
              arrowClassName
            )}
            aria-label="Next slide"
            disabled={!loop && currentIndex === totalSlides - 1}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && totalSlides > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'p-1 transition-all',
                dotClassName,
                index === currentIndex
                  ? 'text-red-600 scale-125'
                  : 'text-gray-400 hover:text-gray-600'
              )}
              aria-label={`Go to slide ${index + 1}`}
            >
              <Circle className="w-2 h-2 fill-current" />
            </button>
          ))}
        </div>
      )}

      {/* Play/Pause Button */}
      {autoPlay && totalSlides > 1 && (
        <button
          onClick={togglePlay}
          className="absolute bottom-4 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-all"
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      )}

      {/* Slide Counter */}
      <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full">
        {currentIndex + 1} / {totalSlides}
      </div>

      {/* ARIA Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {currentIndex + 1} of {totalSlides}
      </div>
    </div>
  );
}

// Carousel Item component
interface CarouselItemProps {
  children: ReactNode;
  className?: string;
}

export function CarouselItem({ children, className }: CarouselItemProps) {
  return (
    <div className={cn('w-full h-full', className)}>
      {children}
    </div>
  );
}

// Compound component
Carousel.Item = CarouselItem;
