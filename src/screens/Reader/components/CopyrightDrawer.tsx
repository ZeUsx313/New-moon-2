import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, AlignRight, AlignCenter, AlignLeft } from 'lucide-react';
import { ADVANCED_COLORS } from '../utils/constants';
import { CustomSlider } from './CustomSlider';

interface CopyrightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  startText: string;
  endText: string;
  style: any;
  hexColor: string;
  frequency: string;
  everyX: string;
  enableSeparator: boolean;
  separatorText: string;
  loading: boolean;
  onStartTextChange: (val: string) => void;
  onEndTextChange: (val: string) => void;
  onStyleChange: (style: any) => void;
  onHexColorChange: (val: string) => void;
  onFrequencyChange: (val: string) => void;
  onEveryXChange: (val: string) => void;
  onEnableSeparatorChange: (val: boolean) => void;
  onSeparatorTextChange: (val: string) => void;
  onSave: () => void;
}

export const CopyrightDrawer: React.FC<CopyrightDrawerProps> = ({
  isOpen,
  onClose,
  startText,
  endText,
  style,
  hexColor,
  frequency,
  everyX,
  enableSeparator,
  separatorText,
  loading,
  onStartTextChange,
  onEndTextChange,
  onStyleChange,
  onHexColorChange,
  onFrequencyChange,
  onEveryXChange,
  onEnableSeparatorChange,
  onSeparatorTextChange,
  onSave,
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
            <h3 className="text-white font-bold text-blue-400">حقوق التطبيق</h3>
            <div className="w-6" />
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">تكرار الظهور</label>
              <div className="flex gap-2">
                {['always', 'random', 'every_x'].map(freq => (
                  <button
                    key={freq}
                    onClick={() => onFrequencyChange(freq)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      frequency === freq
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {freq === 'always' ? 'دائماً' : freq === 'random' ? 'عشوائي' : 'كل X فصل'}
                  </button>
                ))}
              </div>
              {frequency === 'every_x' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-400 text-sm">كل</span>
                  <input
                    type="number"
                    value={everyX}
                    onChange={e => onEveryXChange(e.target.value)}
                    className="w-16 bg-white/10 text-white rounded px-2 py-1 text-center border border-white/20"
                  />
                  <span className="text-gray-400 text-sm">فصل</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">اللون (Hex)</label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-white/30" style={{ backgroundColor: style.color }} />
                <input
                  type="text"
                  value={hexColor}
                  onChange={e => onHexColorChange(e.target.value)}
                  className="flex-1 bg-white/10 text-white rounded px-3 py-2 border border-white/20 focus:border-blue-400 outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {ADVANCED_COLORS.map(c => (
                  <button
                    key={c.color}
                    onClick={() => {
                      onStyleChange({ ...style, color: c.color });
                      onHexColorChange(c.color);
                    }}
                    className="w-6 h-6 rounded-full border border-white/30"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">حجم الخط ({style.fontSize}px)</label>
              <CustomSlider
                min={10}
                max={30}
                step={1}
                value={style.fontSize}
                onValueChange={val => onStyleChange({ ...style, fontSize: val })}
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">الشفافية ({Math.round(style.opacity * 100)}%)</label>
              <CustomSlider
                min={0.1}
                max={1}
                step={0.05}
                value={style.opacity}
                onValueChange={val => onStyleChange({ ...style, opacity: val })}
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">المحاذاة</label>
              <div className="flex gap-2">
                {['right', 'center', 'left'].map(align => (
                  <button
                    key={align}
                    onClick={() => onStyleChange({ ...style, alignment: align })}
                    className={`p-2 rounded transition-colors ${
                      style.alignment === align ? 'bg-blue-600' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {align === 'right' && <AlignRight size={18} className="text-white" />}
                    {align === 'center' && <AlignCenter size={18} className="text-white" />}
                    {align === 'left' && <AlignLeft size={18} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">خط عريض</span>
              <input
                type="checkbox"
                checked={style.isBold}
                onChange={e => onStyleChange({ ...style, isBold: e.target.checked })}
                className="w-5 h-5 accent-blue-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">تفعيل الفاصل تحت العنوان</span>
              <input
                type="checkbox"
                checked={enableSeparator}
                onChange={e => onEnableSeparatorChange(e.target.checked)}
                className="w-5 h-5 accent-blue-500"
              />
            </div>
            {enableSeparator && (
              <div>
                <label className="block text-white/70 text-sm mb-1">نص الفاصل</label>
                <input
                  type="text"
                  value={separatorText}
                  onChange={e => onSeparatorTextChange(e.target.value)}
                  className="w-full bg-white/10 text-white rounded px-3 py-2 border border-white/20 focus:border-blue-400 outline-none text-center"
                />
              </div>
            )}
            <div>
              <label className="block text-white/70 text-sm mb-1">نص البداية</label>
              <textarea
                rows={3}
                value={startText}
                onChange={e => onStartTextChange(e.target.value)}
                className="w-full bg-white/10 text-white rounded p-3 border border-white/20 focus:border-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">نص النهاية</label>
              <textarea
                rows={3}
                value={endText}
                onChange={e => onEndTextChange(e.target.value)}
                className="w-full bg-white/10 text-white rounded p-3 border border-white/20 focus:border-blue-400 outline-none"
              />
            </div>
            <button
              onClick={onSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : <Save size={18} />}
              حفظ الحقوق
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};