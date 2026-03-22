import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface PageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
}

export const PageSelectorModal: React.FC<PageSelectorModalProps> = ({
  isOpen,
  onClose,
  totalPages,
  currentPage,
  onSelectPage,
}) => {
  const [inputPage, setInputPage] = useState(currentPage.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onSelectPage(pageNum);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[320px] bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">اختر الصفحة</h3>
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <input
                  type="number"
                  value={inputPage}
                  onChange={(e) => setInputPage(e.target.value)}
                  min={1}
                  max={totalPages}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-lg focus:outline-none focus:border-primary transition-colors"
                  placeholder="رقم الصفحة"
                />
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="flex-1 bg-primary hover:bg-primary/80 text-white font-bold py-2 rounded-xl transition-colors">
                    انتقال
                  </button>
                  <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl transition-colors">
                    إلغاء
                  </button>
                </div>
              </form>
              <div className="mt-4 text-center text-sm text-gray-400">
                الصفحة {currentPage} من {totalPages}
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-primary to-purple-500" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};