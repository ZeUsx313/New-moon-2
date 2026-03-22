import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { BookOpen, Search, Star } from 'lucide-react';

export default function Library() {
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">المكتبة</h1>
        </div>
        <div className="relative mb-8">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="ابحث عن مانجا أو رواية..."
            className="w-full bg-[#111111] border border-white/10 rounded-xl py-3 pr-12 pl-4 text-white placeholder-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-[#111111] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
              <div className="aspect-[2/3] bg-gradient-to-br from-gray-800 to-gray-900"></div>
              <div className="p-3">
                <h3 className="text-sm font-bold line-clamp-2">عنوان المانجا {i}</h3>
                <div className="flex items-center gap-1 mt-2 text-yellow-500">
                  <Star size={14} fill="currentColor" />
                  <span className="text-xs">8.5</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}