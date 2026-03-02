'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [previousPathname, setPreviousPathname] = useState<string>('');
  const [navigationDirection, setNavigationDirection] = useState<'forward' | 'back'>('forward');
  const [isNavigating, setIsNavigating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (previousPathname && pathname !== previousPathname) {
      const previousDepth = previousPathname.split('/').filter(Boolean).length;
      const currentDepth = pathname.split('/').filter(Boolean).length;
      setNavigationDirection(currentDepth > previousDepth ? 'forward' : 'back');
    }
    setPreviousPathname(pathname);
  }, [pathname, previousPathname]);

  const pageVariants = {
    initial: { opacity: 0, x: navigationDirection === 'forward' ? 20 : -20, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, x: navigationDirection === 'forward' ? -20 : 20, scale: 0.98, transition: { duration: 0.15, ease: 'easeIn' } },
  };

  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  };

  const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.2 } } };

  useEffect(() => {
    const handleStart = () => setIsNavigating(true);
    const handleComplete = () => setIsNavigating(false);

    window.addEventListener('beforeunload', handleStart);
    return () => window.removeEventListener('beforeunload', handleStart);
  }, []);

  return (
    <>
      {/* Navigation Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-red-600">
          <motion.div
            className="h-full bg-red-400"
            initial={{ width: '0%' }}
            animate={{ width: '90%' }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          />
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen">
          {/* Background pattern for visual feedback */}
          <motion.div className="fixed inset-0 -z-10 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 0.02 }} transition={{ delay: 0.1 }}>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25px 25px, rgba(220, 38, 38, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(220, 38, 38, 0.1) 2%, transparent 0%)',
                backgroundSize: '100px 100px',
              }}
            />
          </motion.div>

          {/* Main content with staggered animation */}
          <motion.div variants={contentVariants} initial="hidden" animate="visible" className="relative">
            {/* Decorative elements for visual interest */}
            <motion.div variants={itemVariants} className="fixed top-20 right-10 w-72 h-72 bg-gradient-to-br from-red-600/5 to-red-800/5 rounded-full blur-3xl -z-10" />
            <motion.div variants={itemVariants} className="fixed bottom-20 left-10 w-96 h-96 bg-gradient-to-tr from-red-600/5 to-red-800/5 rounded-full blur-3xl -z-10" />

            {/* Content container */}
            <motion.div variants={itemVariants}>{children}</motion.div>

            {/* Scroll progress indicator */}
            <motion.div
              className="fixed bottom-8 right-8 w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative w-6 h-6">
                <motion.div
                  className="absolute inset-0 border-2 border-red-600 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>

            {/* Performance indicator for slow connections */}
            {mounted && 'connection' in navigator && (
              <motion.div variants={itemVariants} className="fixed bottom-8 left-8">
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        (navigator as any).connection?.effectiveType === '4g'
                          ? 'bg-green-500'
                          : (navigator as any).connection?.effectiveType === '3g'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-gray-700">{(navigator as any).connection?.effectiveType || 'unknown'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Visual feedback for interactions */}
          <motion.div className="fixed inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 0 }} whileHover={{ opacity: 0.05 }}>
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-800/10" />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Page transition overlay for visual feedback */}
      <AnimatePresence>
        {isNavigating && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40 pointer-events-none" />}
      </AnimatePresence>

      {/* Audio feedback for interactions (optional) */}
      <audio id="page-transition-audio" preload="auto">
        <source src="/sounds/transition.mp3" type="audio/mpeg" />
      </audio>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              let audioPlayed = false;
              const playTransitionSound = () => {
                if (!audioPlayed) {
                  const audio = document.getElementById('page-transition-audio');
                  if (audio) {
                    audio.volume = 0.1;
                    audio.play().catch(() => {});
                    audioPlayed = true;
                    setTimeout(() => { audioPlayed = false; }, 1000);
                  }
                }
              };
              window.addEventListener('popstate', playTransitionSound);
              document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.href && !link.href.includes('#')) {
                  playTransitionSound();
                }
              });
            }
          `,
        }}
      />
    </>
  );
}
