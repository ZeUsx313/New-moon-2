import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { authService } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';

/**
 * Landing point after Google OAuth. The backend redirects here with
 * ?token=... (or ?auth_error=true on failure). We exchange the token for a
 * user profile and hand the session to the app.
 */
export default function GoogleCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (params.get('auth_error') === 'true') {
      setError('تعذّر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى.');
      return;
    }

    const token = params.get('token');
    if (!token) {
      setError('لم يتم استلام رمز الدخول. حاول تسجيل الدخول مرة أخرى.');
      return;
    }

    (async () => {
      try {
        // Verify the token and load the profile with it
        authService.setToken(token);
        const user = await authService.getCurrentUser();
        login(token, user);
        navigate('/', { replace: true });
      } catch (err) {
        authService.clearToken();
        setError('انتهت صلاحية رمز الدخول أو حدث خطأ غير متوقع. حاول مرة أخرى.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Helmet>
        <title>جاري تسجيل الدخول… - قمر الروايات</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        dir="rtl"
        className="min-h-screen flex flex-col items-center justify-center bg-black px-6 text-center"
        style={{ fontFamily: "'Cairo', sans-serif" }}
      >
        {error ? (
          <>
            <div className="text-4xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-white mb-2">فشل تسجيل الدخول</h1>
            <p className="text-white/60 text-sm mb-8 max-w-sm leading-relaxed">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="bg-white text-black font-bold py-3 px-8 rounded-xl hover:bg-white/90 transition-colors"
              >
                العودة لتسجيل الدخول
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="bg-white/10 border border-white/20 text-white font-bold py-3 px-8 rounded-xl hover:bg-white/20 transition-colors"
              >
                الرئيسية
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
            <p className="text-white/70 text-sm mt-6 font-semibold">جاري إكمال تسجيل الدخول عبر Google…</p>
          </>
        )}
      </div>
    </>
  );
}
