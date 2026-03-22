import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import toast from 'react-hot-toast';

// صورة الخلفية - نفس الصورة المستخدمة في التطبيق
import backgroundImage from '../../assets/adaptive-icon.png';

export default function Login() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authService.login(email, password);
      authLogin(token, user);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 404) {
        toast.error('الحساب غير موجود. يرجى إنشاء حساب جديد.');
      } else if (status === 401) {
        toast.error('كلمة المرور غير صحيحة');
      } else {
        toast.error(message || 'فشل تسجيل الدخول');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    window.location.href = `https://c-production-fba1.up.railway.app/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  return (
    <>
      <Helmet>
        <title>قمر الروايات - تسجيل الدخول</title>
      </Helmet>
      <div className="min-h-screen relative overflow-hidden bg-black">
        {/* خلفية زجاجية مع الصورة */}
        <div className="absolute inset-0 z-0">
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-full object-cover opacity-40 blur-sm"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, type: 'spring', damping: 20 }}
            className="w-full max-w-md"
          >
            {/* بطاقة زجاجية */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              {/* الشعار */}
              <div className="pt-8 pb-4 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-24 h-24 mx-auto bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-lg"
                >
                  <img
                    src={backgroundImage}
                    alt="Logo"
                    className="w-20 h-20 object-contain"
                  />
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl font-bold text-white mt-4"
                >
                  قمر الروايات
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/60 text-sm"
                >
                  بوابتك لعالم الخيال
                </motion.p>
              </div>

              {/* النموذج */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="relative"
                  >
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="البريد الإلكتروني"
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                      dir="rtl"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative"
                  >
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="كلمة المرور"
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                      dir="rtl"
                    />
                  </motion.div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>دخول</span>
                    </>
                  )}
                </motion.button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-white/40">أو</span>
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={handleGoogleLogin}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-white text-gray-900 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>المتابعة باستخدام Google</span>
                </motion.button>
              </form>

              {/* رابط إنشاء حساب */}
              <div className="p-6 pt-0 text-center">
                <Link to="/signup">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    className="text-white/60 hover:text-white transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    ليس لديك حساب؟ <span className="text-primary font-semibold">إنشاء حساب جديد</span>
                    <UserPlus className="w-4 h-4" />
                  </motion.span>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}