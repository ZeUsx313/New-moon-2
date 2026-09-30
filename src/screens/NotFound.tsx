import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Library } from 'lucide-react';

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>الصفحة غير موجودة - قمر الروايات</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        <div className="text-7xl mb-4 select-none">🌌</div>
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm leading-relaxed">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها. ربما حان الوقت لاستكشاف رواية جديدة؟
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/80 transition-colors"
          >
            <Home size={18} />
            الرئيسية
          </Link>
          <Link
            to="/library"
            className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors"
          >
            <Library size={18} />
            المكتبة
          </Link>
        </div>
      </div>
    </>
  );
}
