import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Trash2 } from 'lucide-react';

interface CleanerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cleanerWords: string[];
  newCleanerWord: string;
  cleaningLoading: boolean;
  onNewCleanerWordChange: (val: string) => void;
  onExecuteCleaner: () => void;
  onEditCleaner: (word: string, idx: number) => void;
  onDeleteCleaner: (word: string) => void;
}

export const CleanerDrawer: React.FC<CleanerDrawerProps> = ({
  isOpen,
  onClose,
  cleanerWords,
  newCleanerWord,
  cleaningLoading,
  onNewCleanerWordChange,
  onExecuteCleaner,
  onEditCleaner,
  onDeleteCleaner,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 right-0 bottom-0 z-30 w-full max-w-md bg-black/90 backdrop-blur-xl shadow-xl border-l border-white/10 overflow-y-auto"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
              <X size={24} className="text-white" />
            </button>
            <h3 className="text-white font-bold text-red-400">الحذف الشامل</h3>
            <div className="w-6" />
          </div>
          <div className="p-4">
            <textarea
              rows={4}
              placeholder="النص المراد حذفه (يمكن أن يكون فقرة كاملة)"
              value={newCleanerWord}
              onChange={e => onNewCleanerWordChange(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg p-3 border border-white/20 focus:border-red-400 outline-none"
            />
            <button
              onClick={onExecuteCleaner}
              disabled={cleaningLoading}
              className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {cleaningLoading ? 'جاري الحذف...' : <Trash2 size={18} />}
              {cleaningLoading ? 'جارٍ الحذف...' : 'تنفيذ الحذف'}
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {cleanerWords.map((word, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                <div className="flex-1 text-right text-gray-300 text-sm break-all">{word}</div>
                <div className="flex gap-2">
                  <button onClick={() => onEditCleaner(word, idx)} className="p-1">
                    <Save size={16} className="text-blue-400" />
                  </button>
                  <button onClick={() => onDeleteCleaner(word)} className="p-1">
                    <Trash2 size={16} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {cleanerWords.length === 0 && (
              <div className="p-8 text-center text-gray-500">لا توجد كلمات محظورة</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};