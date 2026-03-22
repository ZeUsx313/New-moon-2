import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FolderPlus, ArrowLeft, ArrowUpDown, Save, PlusCircle, Trash2 } from 'lucide-react';

interface ReplacementsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  folders: any[];
  currentFolderId: string | null;
  viewMode: 'folders' | 'list';
  search: string;
  sortDesc: boolean;
  newOriginal: string;
  newReplacement: string;
  editingId: number | null;
  filteredSortedReplacements: any[];
  showFolderModal: boolean;
  onSearchChange: (val: string) => void;
  onNewOriginalChange: (val: string) => void;
  onNewReplacementChange: (val: string) => void;
  onAddReplacement: () => void;
  onEditReplacement: (item: any, idx: number) => void;
  onDeleteReplacement: (idx: number) => void;
  onOpenFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onBackToFolders: () => void;
  onToggleSort: () => void;
  onShowFolderModal: (show: boolean) => void;
  onCreateFolder: () => void;
}

export const ReplacementsDrawer: React.FC<ReplacementsDrawerProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  viewMode,
  search,
  sortDesc,
  newOriginal,
  newReplacement,
  editingId,
  filteredSortedReplacements,
  onSearchChange,
  onNewOriginalChange,
  onNewReplacementChange,
  onAddReplacement,
  onEditReplacement,
  onDeleteReplacement,
  onOpenFolder,
  onDeleteFolder,
  onBackToFolders,
  onToggleSort,
  onShowFolderModal,
  onCreateFolder,
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
          {viewMode === 'folders' ? (
            <>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                  <X size={24} className="text-white" />
                </button>
                <h3 className="text-white font-bold">مجلدات الاستبدال</h3>
                <button onClick={() => onShowFolderModal(true)} className="p-1 hover:bg-white/10 rounded-full">
                  <FolderPlus size={20} className="text-blue-400" />
                </button>
              </div>
              <div className="divide-y divide-white/10">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <button onClick={() => onOpenFolder(folder.id)} className="flex-1 text-right">
                      <div className="text-white font-medium">{folder.name}</div>
                      <div className="text-xs text-gray-400">{folder.replacements.length} كلمة</div>
                    </button>
                    <button onClick={() => onDeleteFolder(folder.id)} className="p-2">
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                ))}
                {folders.length === 0 && (
                  <div className="p-8 text-center text-gray-500">لا توجد مجلدات</div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <button onClick={onBackToFolders} className="p-1 hover:bg-white/10 rounded-full">
                    <ArrowLeft size={24} className="text-white" />
                  </button>
                  <h3 className="text-white font-bold">
                    {folders.find(f => f.id === currentFolderId)?.name || 'كلمات'}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={onToggleSort} className="p-1 hover:bg-white/10 rounded-full">
                    <ArrowUpDown size={18} className="text-blue-400" />
                  </button>
                  <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full">
                    <X size={24} className="text-white" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="الكلمة الأصلية"
                    value={newOriginal}
                    onChange={e => onNewOriginalChange(e.target.value)}
                    className="flex-1 bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 focus:border-blue-400 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="الكلمة البديلة"
                    value={newReplacement}
                    onChange={e => onNewReplacementChange(e.target.value)}
                    className="flex-1 bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 focus:border-blue-400 outline-none"
                  />
                </div>
                <button
                  onClick={onAddReplacement}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {editingId !== null ? <Save size={18} /> : <PlusCircle size={18} />}
                  {editingId !== null ? 'تحديث' : 'إضافة'}
                </button>
                <input
                  type="text"
                  placeholder="بحث..."
                  value={search}
                  onChange={e => onSearchChange(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2 border border-white/20 focus:border-blue-400 outline-none"
                />
              </div>
              <div className="divide-y divide-white/10">
                {filteredSortedReplacements.map(item => (
                  <div key={item.idx} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                    <div className="flex-1 text-right">
                      <div className="text-gray-400 text-sm line-through">{item.original}</div>
                      <div className="text-white font-medium mt-1">→ {item.replacement}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onEditReplacement(item, item.idx)} className="p-1">
                        <Save size={16} className="text-blue-400" />
                      </button>
                      <button onClick={() => onDeleteReplacement(item.idx)} className="p-1">
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredSortedReplacements.length === 0 && (
                  <div className="p-8 text-center text-gray-500">لا توجد كلمات</div>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};