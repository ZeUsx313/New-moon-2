import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WifiOff } from 'lucide-react';

/**
 * Shows a small dismissible banner whenever the browser goes offline.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          className="fixed top-0 inset-x-0 z-[200] bg-amber-500/95 text-black text-sm font-bold py-2 px-4 flex items-center justify-center gap-2 shadow-lg"
          role="status"
        >
          <WifiOff size={16} />
          <span>أنت غير متصل بالإنترنت — قد لا تعمل بعض المزايا</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
