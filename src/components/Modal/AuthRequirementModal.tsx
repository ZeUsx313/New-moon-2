import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, UserPlus, X, Lock } from 'lucide-react';

interface AuthRequirementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthRequirementModal({ isOpen, onClose }: AuthRequirementModalProps) {
  const handleAction = (type: 'login' | 'signup') => {
    // Open in new tab as requested
    window.open(`/${type}`, '_blank');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            dir="rtl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-1 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-6 shadow-lg"
              >
                <Lock className="text-white w-10 h-10" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-3">تسجيل الدخول مطلوب</h2>
              <p className="text-white/60 text-sm mb-8 leading-relaxed">
                هذه الميزة متاحة فقط للأعضاء المسجلين. انضم إلينا الآن لتتمكن من التفاعل، التعليق، وإضافة الروايات لمفضلتك.
              </p>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction('login')}
                  className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-lg"
                >
                  <LogIn size={20} />
                  <span>تسجيل الدخول</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction('signup')}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <UserPlus size={20} />
                  <span>إنشاء حساب جديد</span>
                </motion.button>
              </div>

              <button
                onClick={onClose}
                className="mt-6 text-white/40 hover:text-white/60 text-xs transition-colors"
              >
                ربما لاحقاً
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
