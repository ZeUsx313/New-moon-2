import React from 'react';
import { motion } from 'motion/react';

interface LoadingScreenProps {
  novelCover?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ novelCover }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      {novelCover && (
        <img
          src={novelCover}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full"
        />
        <p className="text-white/80 text-sm font-medium">جاري تحميل الفصل...</p>
      </div>
    </div>
  );
};