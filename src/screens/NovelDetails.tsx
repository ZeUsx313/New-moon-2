import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

// بيانات مؤقتة (يمكن استبدالها بجلب من API)
const seriesData = {
  slug: 'the-dutiful-kid-who-saved-the-villainous-family',
  title: 'The Dutiful Kid Who Saved the Villainous Family',
  coverImage: 'https://storage.azoramoon.com/public/upload/2026/03/02/b9648973-e737-4b69-8219-3ec30269c233.webp',
  banner: 'https://storage.azoramoon.com/public/upload/2026/03/02/b9648973-e737-4b69-8219-3ec30269c233.webp',
  type: 'مانهوا',
  status: 'ONGOING',
  chapters: [
    { number: 22, slug: 'chapter-22', date: '15/3/2026', views: 50, likes: 9, comments: 0 },
    { number: 21, slug: 'chapter-21', date: '9/3/2026', views: 50, likes: 9, comments: 1 },
    { number: 20, slug: 'chapter-20', date: '9/3/2026', views: 50, likes: 8, comments: 0 },
    { number: 19, slug: 'chapter-19', date: '9/3/2026', views: 50, likes: 8, comments: 0 },
    { number: 18, slug: 'chapter-18', date: '9/3/2026', views: 50, likes: 8, comments: 0 },
    { number: 17, slug: 'chapter-17', date: '8/3/2026', views: 50, likes: 11, comments: 0 },
    { number: 16, slug: 'chapter-16', date: '16/3/2026', views: 0, likes: 69, comments: 12 },
    { number: 15, slug: 'chapter-15', date: '8/3/2026', views: 0, likes: 109, comments: 20 },
    { number: 14, slug: 'chapter-14', date: '8/3/2026', views: 0, likes: 95, comments: 12 },
    { number: 13, slug: 'chapter-13', date: '8/3/2026', views: 0, likes: 94, comments: 18 },
    { number: 12, slug: 'chapter-12', date: '8/3/2026', views: 0, likes: 91, comments: 5 },
    { number: 11, slug: 'chapter-11', date: '8/3/2026', views: 0, likes: 93, comments: 5 },
    { number: 10, slug: 'chapter-10', date: '8/3/2026', views: 0, likes: 89, comments: 7 },
    { number: 9, slug: 'chapter-9', date: '8/3/2026', views: 0, likes: 92, comments: 6 },
    { number: 8, slug: 'chapter-8', date: '8/3/2026', views: 0, likes: 88, comments: 11 },
    { number: 7, slug: 'chapter-7', date: '8/3/2026', views: 0, likes: 94, comments: 10 },
    { number: 6, slug: 'chapter-6', date: '8/3/2026', views: 0, likes: 96, comments: 7 },
    { number: 5, slug: 'chapter-5', date: '8/3/2026', views: 0, likes: 92, comments: 18 },
    { number: 4, slug: 'chapter-4', date: '8/3/2026', views: 0, likes: 96, comments: 10 },
    { number: 3, slug: 'chapter-3', date: '8/3/2026', views: 0, likes: 104, comments: 16 },
    { number: 2, slug: 'chapter-2', date: '8/3/2026', views: 0, likes: 107, comments: 21 },
    { number: 1, slug: 'chapter-1', date: '2/3/2026', views: 0, likes: 130, comments: 30 },
  ],
  rating: 7.6,
  ratingCount: 125,
  favorites: 768,
  description: `<p>آيري، طفلةٌ نشيطةٌ تبلغ من العمر خمس سنوات، ربّتها جدّتها بحبٍّ وحنان. في أحد الأيام، بعد أن أُغمي عليها من فرط الأكل، استيقظت... لتتذكّر فجأةً حياتها السابقة كفتاةٍ صالحةٍ تحمل حزام التايكوندو.</p>
<p>"لحظة، هل يُفترض بي إنقاذ العالم؟!"</p>
<p>" لا مشكلة، أستطيع فعل ذلك بكلّ تأكيد! سأبدأ بهؤلاء الأطفال المشاغبين!"</p>
<p>"لا يمكنك التحدّث إلى أصدقائك بهذه الفظاظة!"</p>
<p>"ماذا؟ ها! كأنّكِ قادرةٌ على فعل أيّ شيء..."</p>
<p>لذا، وجّهتُ له ركلة "هيكتوباسكال" التي تعلّمتها من المعلّمة  في التايكوندو.</p>
<p>"آآآه!"</p>
<p>"لا تعبث!"</p>
<p>صحيح. كانت هذه الفتاة الصالحة السابقة قويةً (جسديًا). قويةً جدًا.</p>
<p>*** ديكلان أورتيزو (33 عامًا)، الارشيدوق العظيم (والشرير) الذي يحكم المنطقة الشمالية.</p>
<p>بدت ابنته الصغرى، آيري، التي التقتها مجددًا، مثيرةً للريبة.</p>
<p>"من فضلك اعتني بي جيدًا، سيدي."</p>
<p>"...لا تقولي سيدي،أليس أنا والدكِ الآن؟ "</p>
<p>وعندما حاولتُ تحذيرها من تهوّرها "سأجبرك على تناول البروكلي. ونبات الشيح المرّ ذو المذاق البشع أيضًا!"</p>
<p>"يا إلهي! أنا أحب البروكلي كثيرًا! ورائحة الشيح رائعة!"</p>
<p>كانت أذواقها ناضجة جدًا بالنسبة لطفلة، مما جعل من المستحيل التفاهم معها.</p>
<p>"أظن أنك بخير يا أبي العزيز؟"</p>
<p>"آه، أنتِ تعرفين حتى آداب السلوك. كما هو متوقع، أنتِ ذكية جدًا..."</p>
<p>نظر إليها كل من جدتها وجدها بفخر ورضا.</p>
<p>" لا، هل أنا وحدي من يجد كل هذا غريبًا؟"</p>`,
  genres: ['رومانسي', 'كوميدي', 'اطفال', 'خيال'],
  lastUpdate: 'منذ 5 أيام',
};

const NovelPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  // هنا يمكن جلب بيانات الرواية حسب slug
  const series = seriesData; // مؤقت

  const [activeTab, setActiveTab] = useState<'chapters' | 'description' | 'ratings'>('chapters');
  const [chapterSearch, setChapterSearch] = useState('');

  const filteredChapters = series.chapters.filter(ch =>
    ch.number.toString().includes(chapterSearch) ||
    ch.slug.toLowerCase().includes(chapterSearch.toLowerCase())
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* خلفية ثابتة */}
      <div className="fixed w-full h-screen z-0 top-0 left-0">
        <img
          alt="Background"
          width={1920}
          height={1080}
          className="object-cover object-top opacity-40 dark:opacity-100"
          src={series.banner}
        />
        <div className="hidden dark:block" style={{ background: 'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9), rgba(0,0,0,0.9), rgb(0,0,0))', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}></div>
        <div className="block dark:hidden" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(248,250,252,0.70) 35%, rgba(255,255,255,0.90) 70%, rgba(255,255,255,0.98) 100%)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}></div>
      </div>

      <section className="max-w-[1400px] mx-auto my-6 sm:px-2 md:px-4 lg:px-6 relative">
        <div className="flex flex-col gap-4 lg:gap-5 sm:flex-row">
          {/* العمود الأيسر: صورة الغلاف + أزرار */}
          <div className="flex w-full h-auto shrink-0 flex-col gap-3 rounded-lg sm:w-[240px] lg:w-[240px] xl:w-[270px] px-2 sm:p-0 md:sticky md:top-[76px] md:self-start">
            <img
              alt={`Cover of ${series.title}`}
              loading="eager"
              width={400}
              height={320}
              className="w-full rounded-lg object-cover object-bottom sm:max-h-[400px] h-auto"
              src={series.coverImage}
            />
            <div className="hidden sm:block">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                  <div>
                    <Link to={`/novel/${series.slug}/${series.chapters[0].slug}`}>
                      <button className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-[#d61a4c] hover:bg-[#d61a4c]/80 flex justify-center content-center font-bold py-3">
                        اقرأ الفصل {series.chapters[0].number}
                      </button>
                    </Link>
                  </div>
                  <div>
                    <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 py-2 select-none w-full rounded h-12 bg-[#186ae6] hover:bg-[#186ae6]/80">
                      <span className="text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block mx-1 size-4">
                          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd"></path>
                        </svg>
                        <span className="font-normal">إضافة للمفضلة</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-center pt-2">
                <button className="justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 px-4 py-2 w-full rounded h-12 bg-neutral-700 hover:bg-neutral-600 text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flag w-5 h-5">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                    <line x1="4" x2="4" y1="22" y2="15"></line>
                  </svg>
                  الإبلاغ عن مشكلة
                </button>
              </div>
            </div>

            <span className="flex-center gap-3">
              <li className="bg-[#29292966]/40 w-full h-14 flex items-center justify-center gap-2 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#a855f7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star inline-block w-6 h-6 text-[#a855f7]">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-4 bg-gradient-to-br from-blue-500 to-purple-500 text-transparent bg-clip-text">{series.rating}</span>
                  <small className="text-[10px] leading-3 bg-gradient-to-br from-blue-500 to-purple-500 text-transparent bg-clip-text">التقييمات</small>
                </div>
              </li>
              <div data-orientation="vertical" role="none" className="shrink-0 !bg-[#ffffff1f] w-[1px] h-[50%]"></div>
              <li className="bg-[#29292966]/40 w-full h-14 flex items-center justify-center gap-2 rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#22d3ee" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bookmark inline-block w-6 h-6 text-[#22d3ee]">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"></path>
                </svg>
                <div className="flex flex-col">
                  <span className="font-bold text-sm leading-4 bg-gradient-to-br from-green-500 to-blue-500 text-transparent bg-clip-text">{series.favorites}</span>
                  <small className="text-[10px] leading-3 bg-gradient-to-br from-green-500 to-blue-500 text-transparent bg-clip-text">المفضلة</small>
                </div>
              </li>
            </span>

            <div data-orientation="horizontal" role="none" className="shrink-0 !bg-[#ffffff1f] h-[1px] w-full"></div>

            <div className="text-foreground">
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dna inline-block mx-1">
                    <path d="M2 15c6.667-6 13.333 0 20-6"></path>
                    <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"></path>
                    <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"></path>
                    <path d="m17 6-2.5-2.5"></path>
                    <path d="m14 8-1-1"></path>
                    <path d="m7 18 2.5 2.5"></path>
                    <path d="m3.5 14.5.5.5"></path>
                    <path d="m20 9 .5.5"></path>
                    <path d="m6.5 12.5 1 1"></path>
                    <path d="m16.5 10.5 1 1"></path>
                    <path d="m10 16 1.5 1.5"></path>
                  </svg>
                  الحالة
                </h1>
                <div className="flex items-center ">
                  <span className="h-[10px] w-[10px] mx-1 rounded-full inline-block relative bg-green-500"></span>
                  <p className="font-normal text-xs inline ml-1 text-foreground">{series.status}</p>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-type inline-block mx-1">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" x2="15" y1="20" y2="20"></line>
                    <line x1="12" x2="12" y1="4" y2="20"></line>
                  </svg>
                  النوع
                </h1>
                <div className="inline">
                  <span className="px-2 py-1 rounded-[4px] text-xs font-medium inline-block border text-foreground bg-background/10 border-foreground/20">{series.type}</span>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book inline-block mx-1">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                  الفصول
                </h1>
                <div className="inline">
                  <p className="font-normal text-xs inline ml-1 text-foreground">{series.chapters.length}</p>
                </div>
              </div>
              <div className="flex sm:justify-between justify-start items-center gap-2">
                <h1 className="font-semibold text-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar inline-block mx-1">
                    <path d="M8 2v4"></path>
                    <path d="M16 2v4"></path>
                    <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                    <path d="M3 10h18"></path>
                  </svg>
                  آخر تحديث
                </h1>
                <div className="inline">
                  <p className="font-normal text-xs inline ml-1 text-foreground">{series.lastUpdate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* العمود الأيمن: المحتوى */}
          <div className="flex flex-1 min-w-0 flex-col gap-3 px-2 sm:px-3 py-4">
            <div className="flex flex-col gap-1 md:gap-2">
              <h1 className="text-2xl font-bold text-foreground leading-[1.5rem]">{series.title}</h1>
            </div>

            {/* أزرار للشاشات الصغيرة */}
            <div className="block lg:hidden md:hidden sm:hidden">
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-[.5rem] text-[.75rem] leading-4">
                  <div>
                    <Link to={`/novel/${series.slug}/${series.chapters[0].slug}`}>
                      <button className="items-center whitespace-nowrap text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 h-full w-full rounded bg-[#d61a4c] hover:bg-[#d61a4c]/80 flex justify-center content-center font-bold py-3">
                        اقرأ الفصل {series.chapters[0].number}
                      </button>
                    </Link>
                  </div>
                  <div>
                    <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-primary-foreground px-4 py-2 select-none w-full rounded h-12 bg-[#186ae6] hover:bg-[#186ae6]/80">
                      <span className="text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="inline-block mx-1 size-4">
                          <path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clipRule="evenodd"></path>
                        </svg>
                        <span className="font-normal">إضافة للمفضلة</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div data-orientation="horizontal" role="none" className="shrink-0 !bg-[#ffffff1f] h-[1px] w-full text-muted"></div>

            {/* تبويبات الفصول / الملخص / التقييمات */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('chapters')}
                className={`px-4 py-2 font-medium ${activeTab === 'chapters' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                الفصول ({series.chapters.length})
              </button>
              <button
                onClick={() => setActiveTab('description')}
                className={`px-4 py-2 font-medium ${activeTab === 'description' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                الملخص
              </button>
              <button
                onClick={() => setActiveTab('ratings')}
                className={`px-4 py-2 font-medium ${activeTab === 'ratings' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
              >
                التقييمات (6)
              </button>
            </div>

            {/* محتوى التبويبات */}
            {activeTab === 'chapters' && (
              <div className="space-y-4">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                  </svg>
                  <input
                    type="text"
                    className="flex h-10 rounded-md border px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10 pr-4 py-2 w-full bg-gray-100/50 border-gray-300/50 focus:border-gray-400 focus:ring-0 dark:bg-white/5 dark:border-white/10 dark:focus:border-white/20"
                    placeholder="البحث برقم الفصل أو العنوان..."
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                  />
                </div>

                <div className="mt-4 space-y-2">
                  {filteredChapters.map((chapter) => (
                    <div key={chapter.number} className="flex flex-1 bg-gray-100/50 border border-gray-200/60 hover:bg-gray-200/50 dark:bg-[hsla(0,0%,55%,.05)] dark:border-[rgba(255,255,255,.12)] dark:hover:bg-[hsla(0,0%,55%,.08)] relative rounded-lg p-2 sm:p-3 transition-colors">
                      <div className="w-full h-full flex items-center justify-between gap-2 sm:gap-3">
                        <Link to={`/novel/${series.slug}/chapter-${chapter.number}`} className="flex w-full items-center text-left justify-between text-gray-900 dark:text-white visited:!text-gray-500 min-w-0">
                          <div className="relative w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] shrink-0 overflow-hidden rounded-md border border-gray-300 dark:border-white/10">
                            <img
                              alt={`الفصل ${chapter.number}`}
                              draggable="false"
                              loading="lazy"
                              className="object-cover rounded-md absolute inset-0 w-full h-full"
                              src={series.coverImage}
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="text-white w-6 h-6">
                                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd"></path>
                              </svg>
                            </div>
                          </div>
                          <div className="flex w-full flex-col pr-2 sm:pr-[.875rem] ml-2 min-w-0">
                            <div className="flex flex-row gap-1 items-center">
                              <span className="text-xs sm:text-sm font-medium">الفصل {chapter.number}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-start sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                              <time dateTime={chapter.date}>{chapter.date}</time>
                            </div>
                          </div>
                        </Link>
                        <div className="last flex flex-row items-center justify-between gap-2 sm:gap-3 pr-2 sm:pr-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500">
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className="w-3 h-3 sm:w-4 sm:h-4">
                                <path d="M0 405.3V448c0 35.3 86 64 192 64s192-28.7 192-64v-42.7C342.7 434.4 267.2 448 192 448S41.3 434.4 0 405.3zM320 128c106 0 192-28.7 192-64S426 0 320 0 128 28.7 128 64s86 64 192 64zM0 300.4V352c0 35.3 86 64 192 64s192-28.7 192-64v-51.6c-41.3 34-116.9 51.6-192 51.6S41.3 334.4 0 300.4zm416 11c57.3-11.1 96-31.7 96-55.4v-42.7c-23.2 16.4-57.3 27.6-96 34.5v63.6zM192 160C86 160 0 195.8 0 240s86 80 192 80 192-35.8 192-80-86-80-192-80zm219.3 56.3c60-10.8 100.7-32 100.7-56.3v-42.7c-35.5 25.1-96.5 38.6-160.7 41.8 29.5 14.3 51.2 33.5 60 57.2z"></path>
                              </svg>
                              <span className="font-medium text-xs sm:text-sm">{chapter.views}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-4 h-4 sm:w-5 sm:h-5 text-[#aab8c2]">
                              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
                            </svg>
                            <p className="text-lg sm:text-2xl font-bold text-[#aab8c2]">{chapter.comments}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="transition-all duration-200 hover:scale-110 focus:outline-none h-10" aria-label="Like">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-heart text-muted-foreground hover:text-red-400" style={{ width: '24px', height: '24px' }}>
                                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                              </svg>
                            </button>
                            <p className="text-lg sm:text-2xl font-bold transition-all duration-300 ease-in-out" style={{ color: '#aab8c2' }}>{chapter.likes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {filteredChapters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">لا توجد فصول مطابقة</div>
                )}
              </div>
            )}

            {activeTab === 'description' && (
              <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: series.description }} />
            )}

            {activeTab === 'ratings' && (
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg text-center">
                  <p className="text-muted-foreground">لا توجد تعليقات بعد.</p>
                  <p className="text-sm text-muted-foreground">سجل الدخول لمشاركة رأيك.</p>
                </div>
              </div>
            )}

            {/* قسم مشاركة و Discord (كما في الموقع) */}
            <div className="w-full mx-auto mt-2 text-foreground">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between gap-6 bg-[#ffffff1a] p-4 rounded-lg text-foreground">
                  <div className="flex gap-4 justify-center items-center">
                    <div className="h-full w-1 rounded-lg bg-[#ffffff1a]"></div>
                    <div className="grid">
                      <div className="font-medium truncate">شارك Azora Manga</div>
                      <div className="text-sm truncate">مع أصدقائك</div>
                    </div>
                  </div>
                  <button className="h-10 gap-2 px-6 bg-blue-500 hover:bg-opacity-80 flex justify-center items-center rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 512 512" className="me-1">
                      <path d="M307 34.8c-11.5 5.1-19 16.6-19 29.2v64H176C78.8 128 0 206.8 0 304C0 417.3 81.5 467.9 100.2 478.1c2.5 1.4 5.3 1.9 8.1 1.9c10.9 0 19.7-8.9 19.7-19.7c0-7.5-4.3-14.4-9.8-19.5C108.8 431.9 96 414.4 96 384c0-53 43-96 96-96h96v64c0 12.6 7.4 24.1 19 29.2s25 3 34.4-5.4l160-144c6.7-6.1 10.6-14.7 10.6-23.8s-3.8-17.7-10.6-23.8l-160-144c-9.4-8.5-22.9-10.6-34.4-5.4z"></path>
                    </svg>
                    <span>شارك</span>
                  </button>
                </div>
                <div className="flex justify-between gap-6 bg-[#ffffff1a] p-4 rounded-lg text-foreground md:flex-row">
                  <div className="flex gap-4 justify-center items-center">
                    <div className="h-full w-1 rounded-lg bg-white/20"></div>
                    <div className="grid">
                      <div className="font-medium truncate">انضم لمجتمعنا</div>
                    </div>
                  </div>
                  <a href="https://discord.gg/VeKbrd23zY" target="_blank" title="Discord" className="h-10 gap-2 px-6 bg-[#5865F2] hover:bg-opacity-80 flex justify-center items-center rounded-full" rel="noreferrer">
                    <img alt="Discord Image Link" width="128" height="128" src="https://api.iconify.design/cbi:discord.svg?color=%23ffffff" className="w-6" />
                    <div>Discord</div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NovelPage;