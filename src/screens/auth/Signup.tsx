import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, User, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import toast from 'react-hot-toast';

import backgroundImage from '../../assets/adaptive-icon.png';

export default function Signup() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => {
    const regex = /^[a-zA-Z]{5,}@gmail\.com$/;
    return regex.test(email);
  };

  const validatePassword = (password: string) => {
    const regex = /^[a-zA-Z0-9@]{4,}$/;
    return regex.test(password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('يرجى ملء جميع الحقول');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    if (!validateEmail(email)) {
      toast.error('يجب أن يكون البريد Gmail، ويتكون الاسم (قبل @) من أكثر من 4 حروف إنجليزية فقط');
      return;
    }

    if (!validatePassword(password)) {
      toast.error('كلمة المرور يجب أن تكون 4 خانات على الأقل، وتحتوي فقط على حروف إنجليزية، أرقام، أو رمز @');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await authService.signup(name, email, password);
      authLogin(token, user);
      toast.success('تم إنشاء الحساب بنجاح');
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>قمر الروايات - إنشاء حساب</title>
      </Helmet>
      <div className="min-h-screen relative overflow-hidden bg-black">
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
                  حساب جديد
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-white/60 text-sm"
                >
                  انضم إلى عالم قمر الروايات
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* الاسم */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative"
                >
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="الاسم الكامل"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                  />
                </motion.div>

                {/* البريد */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="relative"
                >
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="البريد (أكثر من 4 حروف @gmail.com)"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-4 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                  />
                </motion.div>

                {/* كلمة المرور */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="relative"
                >
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="كلمة المرور (4+ حروف، أرقام، @)"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </motion.div>

                {/* تأكيد كلمة المرور */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="relative"
                >
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تأكيد كلمة المرور"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pr-12 pl-10 text-white placeholder:text-white/40 focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </motion.div>

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
                      <UserPlus className="w-5 h-5" />
                      <span>إنشاء الحساب</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* رابط تسجيل الدخول */}
              <div className="p-6 pt-0 text-center">
                <Link to="/login">
                  <motion.span
                    whileHover={{ scale: 1.02 }}
                    className="text-white/60 hover:text-white transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    لديك حساب بالفعل؟ <span className="text-primary font-semibold">تسجيل الدخول</span>
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