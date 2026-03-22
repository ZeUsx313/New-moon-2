import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { User, Heart, Bookmark, Settings, LogOut } from 'lucide-react';

export default function MyPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#111111] rounded-2xl border border-white/10 p-6">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <User size={40} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">مرحباً بك</h1>
              <p className="text-gray-400">قم بتسجيل الدخول للوصول إلى مكتبتك الشخصية</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <Heart className="mx-auto text-red-500 mb-2" size={24} />
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">الإعجابات</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <Bookmark className="mx-auto text-blue-500 mb-2" size={24} />
              <div className="text-2xl font-bold">0</div>
              <div className="text-sm text-gray-400">المفضلة</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
              <Settings className="mx-auto text-gray-400 mb-2" size={24} />
              <div className="text-2xl font-bold">-</div>
              <div className="text-sm text-gray-400">الإعدادات</div>
            </div>
          </div>
          <button className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            <LogOut size={20} />
            تسجيل الدخول
          </button>
        </div>
      </main>
    </div>
  );
}