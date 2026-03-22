import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import { userService, UserProfile, UserStats } from '../services/user';
import { authService } from '../services/auth';
import { User, Heart, Bookmark, Settings, LogOut, Edit3, Camera } from 'lucide-react';

export default function MyPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', bio: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        setEditForm({ name: currentUser.name, email: currentUser.email, bio: currentUser.bio || '' });
        const userStats = await userService.getUserStats();
        setStats(userStats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleUpdateProfile = async () => {
    try {
      const updated = await userService.updateProfile({
        name: editForm.name,
        email: editForm.email,
        bio: editForm.bio,
      });
      setUser(updated);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <div className="flex items-center justify-center h-64">جاري التحميل...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Helmet>
          <title>قمر الروايات - صفحتي</title>
        </Helmet>
        <div className="min-h-screen bg-background text-foreground">
          <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="bg-[#111111] rounded-2xl border border-white/10 p-6 text-center">
              <User size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-bold mb-2">مرحباً بك</h2>
              <p className="text-gray-400 mb-4">قم بتسجيل الدخول للوصول إلى مكتبتك الشخصية</p>
              <Link to="/login" className="bg-primary text-white px-6 py-2 rounded-lg inline-block">تسجيل الدخول</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>قمر الروايات - صفحتي</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground">
        <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-[#111111] rounded-2xl border border-white/10 p-6">
            {/* صورة الغلاف */}
            <div className="relative h-32 bg-gradient-to-r from-primary to-purple-500 rounded-t-2xl -mt-6 -mx-6 mb-6">
              {user.banner && (
                <img src={user.banner} alt="Banner" className="w-full h-full object-cover rounded-t-2xl" />
              )}
            </div>

            {/* صورة المستخدم */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative">
                <img
                  src={user.picture || '/default-avatar.png'}
                  alt={user.name}
                  className="w-24 h-24 rounded-full border-4 border-[#111111] -mt-12 object-cover"
                />
              </div>

              <div className="flex-1">
                {!isEditing ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl font-bold">{user.name}</h1>
                      <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-white">
                        <Edit3 size={18} />
                      </button>
                    </div>
                    <p className="text-gray-400">{user.email}</p>
                    <p className="mt-2 text-foreground">{user.bio || 'لا توجد سيرة ذاتية'}</p>
                    <div className="mt-4 flex gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats?.readChapters || 0}</div>
                        <div className="text-xs text-gray-400">فصل مقروء</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats?.addedChapters || 0}</div>
                        <div className="text-xs text-gray-400">فصل مضاف</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{stats?.totalViews || 0}</div>
                        <div className="text-xs text-gray-400">مشاهدة</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2"
                      placeholder="الاسم"
                    />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2"
                      placeholder="البريد الإلكتروني"
                    />
                    <textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-2"
                      rows={3}
                      placeholder="نبذة عنك"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleUpdateProfile} className="bg-primary text-white px-4 py-2 rounded-lg">حفظ</button>
                      <button onClick={() => setIsEditing(false)} className="bg-gray-700 text-white px-4 py-2 rounded-lg">إلغاء</button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white self-start"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </div>

          {/* أعمال المستخدم */}
          {stats?.myWorks && stats.myWorks.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">أعمالي</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {stats.myWorks.map((work: any) => (
                  <Link key={work._id} to={`/novel/${work._id}`} className="bg-[#111111] rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all">
                    <div className="aspect-[2/3]">
                      <img src={work.cover} alt={work.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-bold line-clamp-2">{work.title}</h3>
                      <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>{work.chaptersCount} فصل</span>
                        <span>{work.views} مشاهدة</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}