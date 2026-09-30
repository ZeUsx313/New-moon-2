import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import {
  User,
  Calendar,
  Shield,
  UserCheck,
  FileText,
  CloudOff,
  RefreshCcw,
  ChevronRight,
  BookOpen,
  Eye,
} from 'lucide-react';
import Header from '../components/Header';
import SafeImage from '../components/SafeImage';
import { useTheme } from '../context/ThemeContext';
import { userService, type UserProfile as UserProfileData } from '../services/user';
import { novelService, Novel } from '../services/novel';
import { Skeleton } from '../components/Skeleton';
import { formatDate } from '../lib/site';
import defaultAvatar from '../assets/adaptive-icon.png';

/**
 * صفحة عضو / صفحة المترجم — /user/:id
 * تُفتح من بطاقة «المترجم» في تبويب الملخص أو من أي مكان يذكر العضو.
 * بيانات الحساب من /api/user/public-profile (خفيفة ومخزّنة 10 دقائق)،
 * والأعمال من قائمة الروايات (بحث باسم المؤلف ثم تصفية محلياً) —
 * كلها مخزّنة ومحسّنة لأقل استهلاك للخادم.
 */

const roleLabel = (role?: string) =>
  role === 'admin' ? 'مشرف عام' : role === 'contributor' ? 'مترجم / مؤلف' : 'قارئ';

const WorkCard = ({ novel, index }: { novel: Novel; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4) }}
  >
    <Link to={`/novel/${novel._id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl shadow-lg transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-2xl">
        <div className="aspect-[2/3]">
          <SafeImage src={novel.cover} alt={novel.title} className="w-full h-full" />
        </div>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent p-2.5 flex items-center justify-between text-[11px] text-white/85">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {(novel.views || 0).toLocaleString('en-US')}
          </span>
          <span className="font-bold">{novel.chaptersCount || 0} فصل</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground line-clamp-1 mt-2 group-hover:text-primary transition-colors">
        {novel.title}
      </h3>
    </Link>
  </motion.div>
);

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // الملف العام — خفيف ومخزّن في apiCache (10 دقائق)
  const {
    data: profileData,
    isLoading: loadingProfile,
    isError: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => userService.getPublicProfile(undefined, userId),
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const profile: UserProfileData | undefined = profileData?.user;

  // أعمال العضو — نبحث باسمه ثم نُبقي ما كتبه هو فعلاً (مطابقة المؤلف)
  const { data: worksData, isLoading: loadingWorks } = useQuery({
    queryKey: ['userWorks', profile?.name],
    queryFn: () => novelService.getNovels({ search: profile!.name, limit: 24 }),
    enabled: !!profile?.name,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 0,
  });

  const works = (worksData?.novels || []).filter(
    (n) => (n.author || '').trim().toLowerCase() === (profile?.name || '').trim().toLowerCase(),
  );

  const isContributor = profile?.role === 'admin' || profile?.role === 'contributor';

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Helmet>
        <title>{profile ? `${profile.name} - ${'قمر الروايات'}` : 'صفحة عضو - قمر الروايات'}</title>
        {profile?.bio && <meta name="description" content={profile.bio.slice(0, 160)} />}
      </Helmet>

      <Header />

      {loadingProfile ? (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-40 rounded-2xl" count={1} />
          <div className="flex flex-col items-center -mt-12 gap-2">
            <Skeleton className="w-24 h-24 rounded-full" count={1} />
            <Skeleton className="w-40 h-5 rounded" count={1} />
          </div>
        </main>
      ) : profileError || !profile ? (
        <main className="max-w-md mx-auto px-4 py-24 text-center">
          <CloudOff className="mx-auto text-muted-foreground mb-4" size={44} />
          <p className="text-muted-foreground text-sm mb-6">تعذّر العثور على هذا العضو</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => refetchProfile()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/85 transition-colors"
            >
              <RefreshCcw size={15} />
              إعادة المحاولة
            </button>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-foreground font-bold text-sm hover:bg-white/20 transition-colors"
            >
              <ChevronRight size={16} />
              رجوع
            </button>
          </div>
        </main>
      ) : (
        <main className="pb-14">
          <div className="max-w-5xl mx-auto px-4">
            {/* ═══ بطاقة الحساب ═══ */}
            <section aria-label="بطاقة العضو" className="mt-4">
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                {/* البنر */}
                <div className="h-40 sm:h-52 w-full bg-black/40">
                  <img
                    src={profile.banner || defaultAvatar}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                </div>

                {/* الهوية فوق البنر */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end gap-4">
                  <img
                    src={profile.picture || defaultAvatar}
                    alt={profile.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-white/85 shadow-xl shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatar; }}
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 pb-1">
                    <motion.h1
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl sm:text-2xl font-extrabold text-white truncate drop-shadow"
                    >
                      {profile.name}
                    </motion.h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-3 py-1 border backdrop-blur-sm ${
                          profile.role === 'admin'
                            ? 'bg-white/20 border-white/35 text-white'
                            : isContributor
                              ? 'bg-white/12 border-white/25 text-white/90'
                              : 'bg-white/8 border-white/15 text-white/70'
                        }`}
                      >
                        {profile.role === 'admin' ? <Shield size={11} /> : isContributor ? <UserCheck size={11} /> : <User size={11} />}
                        {roleLabel(profile.role)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/60 rounded-full px-3 py-1 border border-white/10 bg-black/30 backdrop-blur-sm">
                        <Calendar size={11} />
                        انضم {formatDate(profile.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* النبذة */}
              {profile.bio && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-foreground/75 leading-relaxed text-[15px] mt-4 px-1"
                >
                  {profile.bio}
                </motion.p>
              )}
            </section>

            {/* ═══ أعمال العضو (للناشرين والمشرفين) ═══ */}
            {isContributor && (
              <section aria-label="أعمال العضو" className="mt-8">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <FileText size={20} className="text-foreground/70" />
                  <h2 className="text-lg font-bold">أعمال منشورة</h2>
                  {!loadingWorks && (
                    <span className="text-xs font-bold text-muted-foreground">({works.length})</span>
                  )}
                </div>

                {loadingWorks ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="aspect-[2/3] rounded-xl" count={1} />
                        <Skeleton className="h-4 w-3/4 rounded mt-2" count={1} />
                      </div>
                    ))}
                  </div>
                ) : works.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-white/10 bg-white/5">
                    <BookOpen className="mx-auto text-white/25 mb-3" size={40} />
                    <p className="text-muted-foreground text-sm">لا توجد أعمال منشورة بعد</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {works.map((novel, idx) => (
                      <WorkCard key={novel._id} novel={novel} index={idx} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
