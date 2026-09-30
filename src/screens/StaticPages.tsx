import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Flag, ShieldCheck, FileText, Users, BookOpen, Zap, Heart, WifiOff, MessageCircle, Clock, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { SITE_NAME, SITE_TAGLINE } from '../lib/site';

/* ═══════════════ الغلاف المشترك ═══════════════ */

function StaticShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // دعم الروابط ذات الوسم (#contact مثلاً) — التمرير إلى القسم المطلوب
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Helmet>
        <title>{`${title} - ${SITE_NAME}`}</title>
        <meta name="description" content={description} />
      </Helmet>
      <Header />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground text-sm mb-8">{description}</p>
        <div className="space-y-4 text-foreground/80 leading-relaxed text-[15px]">{children}</div>
        <Link to="/" className="inline-block mt-10 text-primary hover:underline text-sm font-semibold">
          ← العودة إلى الرئيسية
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-bold text-foreground pt-4">
      <Icon size={20} className="text-foreground/70" />
      {children}
    </h2>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pr-6 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function LastUpdated() {
  return (
    <p className="text-muted-foreground text-xs pt-2">
      آخر تحديث: {new Date().getFullYear()}/{new Date().getMonth() + 1}
    </p>
  );
}

/* ═══════════════ من نحن ═══════════════ */

export function About() {
  return (
    <StaticShell
      title="من نحن"
      description={`${SITE_NAME} — منصة عربية لقراءة الروايات المترجمة بجودة عالية وتجربة قراءة مريحة.`}
    >
      <p className="text-lg font-semibold text-foreground">
        {SITE_NAME} — بوابتك لعالم الخيال.
      </p>
      <p>
        {SITE_NAME} منصة عربية متخصصة في نشر وقراءة الروايات العربية والعالمية المترجمة — من الروايات الصينية
        والكورية واليابانية إلى أروع الأعمال المترجمة بعناية. بدأت الفكرة من ملاحظة بسيطة: القارئ العربي يستحق
        تجربة قراءة تضاهي أفضل المواقع العالمية، بواجهة عربية أنيقة، وسرعة فائقة، ومحتوى منظّم ومحدّث باستمرار.
      </p>

      <SectionTitle icon={BookOpen}>ماذا نقدّم؟</SectionTitle>
      <Bullets
        items={[
          <>
            <strong className="text-foreground">مكتبة متنامية</strong> من الروايات المترجمة بجودة عالية، مصنّفة
            بتصنيفات واضحة (أكشن، فانتازيا، زراعة، أنظمة…) لتصل لما تحب بسرعة.
          </>,
          <>
            <strong className="text-foreground">قارئ متقدم</strong> بإعدادات كاملة: حجم الخط ونوعه، أوضح ليلية
            ونهارية، وضع التمرير المتواصل، وحفظ تلقائي لآخر موضع قراءة.
          </>,
          <>
            <strong className="text-foreground">التنزيل للقراءة دون اتصال</strong> — حمّل روايتك كاملة بضغطة
            واحدة واقرأها في المترو أو الطائرة أو أي مكان بلا إنترنت، من داخل المتصفح دون أي تطبيق.
          </>,
          <>
            <strong className="text-foreground">مكتبة شخصية</strong> تتابع فيها مفضلتك وتقدم قراءتك عبر أجهزتك
            عند تسجيل الدخول.
          </>,
          <>
            <strong className="text-foreground">مجتمع حيّ</strong> — تعليقات وتفاعلات على مستوى الرواية
            والفصل، وتقييمات تساعد بقية القراء على الاختيار.
          </>,
        ]}
      />

      <SectionTitle icon={Zap}>مبادئنا في العمل</SectionTitle>
      <Bullets
        items={[
          <>
            <strong className="text-foreground">القارئ أولاً:</strong> كل قرار تصميمي أو تقني عندنا يبدأ من
            سؤال واحد — هل يخدم تجربة القراءة؟
          </>,
          <>
            <strong className="text-foreground">السرعة والتوفير:</strong> نحسّن الموقع باستمرار ليحمّل أسرع
            ويستهلك بياناتك وموارد خوادمنا بأقل قدر ممكن، مع تخزين ذكي يجعل التنقل بين الصفحات شبه فوري.
          </>,
          <>
            <strong className="text-foreground">احترام الخصوصية:</strong> نجمع الحد الأدنى من البيانات
            اللازمة لتشغيل الخدمة، ولا نبيع بياناتك لأي طرف — تفاصيل أكثر في{' '}
            <Link to="/privacy" className="text-primary hover:underline">سياسة الخصوصية</Link>.
          </>,
          <>
            <strong className="text-foreground">احترام حقوق الملكية:</strong> نرحب بأصحاب الحقوق ونعالج أي
            بلاغ جدية وسرعة — تفاصيل ذلك في{' '}
            <Link to="/terms" className="text-primary hover:underline">شروط الاستخدام</Link>.
          </>,
        ]}
      />

      <SectionTitle icon={Heart}>لماذا اسم «قمر الروايات»؟</SectionTitle>
      <p>
        لأن القمر يرافق القارئ في لياليه الهادئة — كما نأمل أن ترافقكم رواياتنا في أوقات راحتكم. شعارنا
        بسيط كشعار القمر: أبيض وأسود، بلا ضجيج، والمحتوى هو النجم الحقيقي.
      </p>

      {/* ═══ تواصل معنا ═══ */}
      <section id="contact" className="scroll-mt-24 pt-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <SectionTitle icon={MessageCircle}>تواصل معنا</SectionTitle>
          <p className="mt-2">نقرأ كل رسالة تصلنا، ونعتمد على ملاحظاتكم في تطوير الموقع. قنوات التواصل:</p>
          <Bullets
            items={[
              <>
                <strong className="text-foreground">الإبلاغ عن مشكلة في رواية</strong> (الأسرع): زر «الإبلاغ
                عن مشكلة» في صفحة كل رواية — يصل بلاغك مباشرة إلى فريق الإدارة مع تفاصيل الرواية والفصل.
              </>,
              <>
                <strong className="text-foreground">التعليقات والتفاعلات:</strong> فريقنا يتابع أقسام
                التعليقات على الروايات باستمرار.
              </>,
              <>
                <strong className="text-foreground">قضايا حقوق الملكية:</strong> عبر صفحة{' '}
                <Link to="/terms" className="text-primary hover:underline">شروط الاستخدام</Link> — قسم
                «حقوق الملكية الفكرية».
              </>,
            ]}
          />
        </div>
      </section>

      <LastUpdated />
    </StaticShell>
  );
}

/* ═══════════════ سياسة الخصوصية ═══════════════ */

export function Privacy() {
  return (
    <StaticShell
      title="سياسة الخصوصية"
      description={`سياسة خصوصية ${SITE_NAME}: البيانات التي نجمعها، كيف نستخدمها ونحميها، وحقوقك الكاملة.`}
    >
      <p>
        خصوصيتك أمانة عندنا. توضح هذه السياسة — بلغة واضحة بلا تعقيد قانوني — ما تجمعه منصة {SITE_NAME} من
        بيانات، وكيف نستخدمها ونحميها، وما هي حقوقك. باستخدامك الموقع فإنك توافق على المبادئ الواردة هنا.
      </p>

      <SectionTitle icon={Users}>البيانات التي نجمعها</SectionTitle>
      <Bullets
        items={[
          <>
            <strong className="text-foreground">بيانات الحساب:</strong> عند إنشاء حساب نحفظ اسم المستخدم
            والبريد الإلكتروني وكلمة المرور (تُخزَّن مشفّرة hash على الخادم ولا يمكن لأحد — بما فيهم فريقنا —
            قراءتها). إن سجّلت الدخول عبر Google نستلم اسمك وبريدك وصورتك الأساسية من حسابك وفق موافقتك.
          </>,
          <>
            <strong className="text-foreground">بيانات نشاط القراءة:</strong> المفضلة، سجل الفصول المقروءة،
            آخر فصل وصلت إليه، تقدمك في الروايات، تعليقاتك وتفاعلاتك — حتى نحفظ تقدمك ونعيدك لما توقفت عنده
            على أي جهاز.
          </>,
          <>
            <strong className="text-foreground">بيانات تقنية محدودة:</strong> نوع المتصفح والجهاز لأغراض
            إحصائية مجمّعة لتحسين الأداء. لا نجمع موقعك الجغرافي الدقيق ولا أرقام هويات.
          </>,
        ]}
      />

      <SectionTitle icon={WifiOff}>البيانات المحفوظة على جهازك فقط</SectionTitle>
      <p>
        جزء كبير من بياناتك لا يغادر متصفحك إطلاقاً، ويبقى محفوظاً محلياً على جهازك (localStorage /
        IndexedDB / ذاكرة التخزين المؤقت للمتصفح):
      </p>
      <Bullets
        items={[
          <>تقدم قراءة الزوار غير المسجلين، وقوائم الفصول المقروءة محلياً.</>,
          <>
            <strong className="text-foreground">الروايات المنزّلة للقراءة دون اتصال</strong> — تُخزَّن نصوص
            الفصول في متصفحك فقط، ولا يمكن لأحد الوصول إليها سواك، وتُحذف نهائياً بمجرد حذفك لها من صفحة
            التنزيلات أو حذف بيانات الموقع من متصفحك.
          </>,
          <>صور الغلافات المخزّنة مؤقتاً لتسريع التصفح.</>,
        ]}
      />

      <SectionTitle icon={ShieldCheck}>كيف نستخدم بياناتك</SectionTitle>
      <Bullets
        items={[
          <>تشغيل الحساب والتحقق من هويتك عند تسجيل الدخول.</>,
          <>حفظ تقدم القراءة والمفضلة ومزامنتها عبر أجهزتك عند تسجيل الدخول.</>,
          <>تحسين المحتوى والأداء (أكثر الروايات قراءة، مشاكل الأداء، جودة الترجمات).</>,
          <>منع الإساءة: حماية الموقع من الحسابات الوهمية والتعليقات المسيئة والسلوك المزعج.</>,
        ]}
      />
      <p>
        <strong className="text-foreground">لنبيع بياناتك أبداً:</strong> نحن لا نبيع ولا نؤجّر ولا نشارك
        بياناتك الشخصية مع أي جهة لأغراض إعلانية أو تجارية — هذا التزام ثابت.
      </p>

      <SectionTitle icon={BarChart3}>الإحصاءات وقياس الزيارات</SectionTitle>
      <p>
        لتحسين الموقع نستخدم نظام إحصاءات داخلياً بأسلوب مواقع جوجل العالمية، مع التزام صارم بالحد
        الأدنى من البيانات:
      </p>
      <Bullets
        items={[
          <>نخزّن معرّفاً عشوائياً في متصفحك (بدون أي بيانات شخصية) لنفرّق الزوار الفريدين ونحصيهم.</>,
          <>نسجّل الصفحات المشاهدة، مصدر الزيارة، نوع الجهاز (هاتف/حاسب) — بشكل مجمّع إحصائي.</>,
          <>نحترم إعداد "Do Not Track" في متصفحك — إن فعّلته نتوقف عن القياس تماماً.</>,
          <>قد نستخدم Google Analytics 4 مع تشفير عنوان IP (anonymize_ip) في بعض الفترات.</>,
          <>بيانات الإحصاءات لا تُستخدم للإعلانات ولا تُشارك مع أي طرف تجاري.</>,
        ]}
      />

      <SectionTitle icon={ShieldCheck}>الحماية من النسخ والسلوك الآلي</SectionTitle>
      <p>
        لحماية المحتوى من السرقة: نراقب أنماط الطلبات، ونقيّد العناوين التي تفتح فصولاً بسرعة غير
        طبيعية (قد نطلب تحققاً بشرياً بسيطاً من Cloudflare Turnstile)، ونحظر عناوين IP التي تستخدم
        سكربتات السحب الآلي. هذا لا يؤثر على القراءة الطبيعية إطلاقاً.
      </p>

      <SectionTitle icon={Users}>مشاركة البيانات مع مزودي الخدمة</SectionTitle>
      <p>
        نعتمد على عدد محدود من مزودي البنية التحتية لتشغيل الموقع، وهم يعالجون البيانات نيابة عنا فقط:
      </p>
      <Bullets
        items={[
          <>استضافة الموقع (Vercel) واستضافة الخادم وقاعدة البيانات (Railway).</>,
          <>تسجيل الدخول عبر Google (OAuth) إذا اخترت هذه الطريقة — عندئذ تحكم سياسة Google الخاصة بكيفية معالجتها.</>,
          <>خطوط الخطوط العربية (Google Fonts) لتحسين شكل النصوص.</>,
        ]}
      />

      <SectionTitle icon={FileText}>ملفات تعريف الارتباط والتخزين المشابه</SectionTitle>
      <p>
        نستخدم localStorage وIndexedDB (تقنيتي تخزين داخل المتصفح) لحفظ جلستك وتفضيلاتك وتقدمك، ولا نستخدم
        إعلانات تتبع من أطراف ثالثة. يمكنك مسح هذه البيانات في أي وقت من إعدادات المتصفح (موقع البيانات /
        Clear site data) — علماً أن ذلك سيحذف التنزيلات المحفوظة للقراءة دون اتصال أيضاً.
      </p>

      <SectionTitle icon={Clock}>مدة الاحتفاظ بالبيانات</SectionTitle>
      <Bullets
        items={[
          <>بيانات الحساب: تُحفظ ما دام الحساب قائماً، وتُحذف نهائياً خلال مدة معقولة من طلب حذف الحساب.</>,
          <>التعليقات: تُحفظ حتى يحذفها صاحبها أو تُلغى بحسب سياسات الإشراف.</>,
          <>البيانات المحلية على جهازك: تبقى حتى تمسحها بنفسك.</>,
        ]}
      />

      <SectionTitle icon={Users}>خصوصية الأطفال</SectionTitle>
      <p>
        الخدمة موجّهة لعامة الناس وليست موجهة للأطفال دون 13 عاماً، ولا نجمع عن قصد بياناتهم. إذا كنت وليّ
        أمر وتعلم أن طفلك أنشأ حساباً، تواصل معنا لحذفه.
      </p>

      <SectionTitle icon={ShieldCheck}>أمن البيانات</SectionTitle>
      <p>
        نحمي بياناتك بتشفير الاتصال (HTTPS)، وتخزين كلمات المرور مشفّرة، وتقييد الوصول إلى قواعد البيانات
        على الخادم. لا يوجد نظام آمن 100%، لكننا نلتزم بأفضل الممارسات المتاحة ونحدّث أنظمتنا باستمرار.
      </p>

      <SectionTitle icon={Users}>حقوقك</SectionTitle>
      <Bullets
        items={[
          <>الوصول إلى بياناتك وتعديلها في أي وقت من صفحة «صفحتي» (الاسم، النبذة، الصورة، الغلاف).</>,
          <>طلب حذف حسابك نهائياً مع كل بياناته المرتبطة به.</>,
          <>التصفح كزائر دون حساب — تقدم قراءتك حينها يُحفظ محلياً على جهازك فقط ولا يُرسل للخادم.</>,
          <>الاعتراض على أي معالجة لبياناتك بمراسلتنا عبر قنوات التواصل في صفحة «من نحن».</>,
        ]}
      />

      <SectionTitle icon={FileText}>تغييرات هذه السياسة</SectionTitle>
      <p>
        قد نحدّث هذه السياسة مع تطور الموقع، وسنُظهر تاريخ آخر تحديث في أسفل الصفحة. الاستمرار في استخدام
        الموقع بعد أي تعديل يعني موافقتك على النسخة المحدّثة.
      </p>

      <SectionTitle icon={MessageCircle}>التواصل بشأن الخصوصية</SectionTitle>
      <p>
        لأي سؤال حول خصوصيتك أو طلب حذف بيانات، استخدم قنوات التواصل المذكورة في صفحة{' '}
        <Link to="/about#contact" className="text-primary hover:underline">من نحن — تواصل معنا</Link>.
      </p>

      <LastUpdated />
    </StaticShell>
  );
}

/* ═══════════════ شروط الاستخدام ═══════════════ */

export function Terms() {
  return (
    <StaticShell
      title="شروط الاستخدام"
      description={`شروط وأحكام استخدام منصة ${SITE_NAME} — حقوقك وواجباتك كقارئ أو ناشر على المنصة.`}
    >
      <p>
        مرحباً بك في {SITE_NAME}. توضح هذه الشروط القواعد التي تحكم استخدامك للموقع. باستخدامك الموقع — تصفحاً
        أو قراءة أو تنزيلاً أو تعليقاً أو نشراً — فإنك توافق على هذه الشروط كاملة. إن لم توافق عليها، يرجى
        التوقف عن استخدام الموقع.
      </p>

      <SectionTitle icon={BookOpen}>وصف الخدمة</SectionTitle>
      <p>
        {SITE_NAME} منصة لقراءة الروايات العربية والعالمية المترجمة عبر المتصفح، مع مزايا تشمل القارئ المتقدم،
        المكتبة الشخصية، التعليقات، والتنزيل للقراءة دون اتصال. الخدمة مقدمة «كما هي» ونسعى لإتاحتها باستمرار
        دون التزام بوقت محدد.
      </p>

      <SectionTitle icon={Users}>الحساب والأهلية</SectionTitle>
      <Bullets
        items={[
          <>أنت مسؤول عن سرية بيانات حسابك وعن كل النشاط الذي يتم من خلاله.</>,
          <>يُمنع إنشاء حسابات متعددة لنفس الشخص، أو انتحال هوية أي شخص أو جهة.</>,
          <>يجب أن تكون المعلومات المسجلة صحيحة (اسم مستخدم لائق، بريد تملكه فعلاً).</>,
          <>قد يُعلَّق الحساب المخالف مؤقتاً أو يُحذف نهائياً حسب جسامة المخالفة.</>,
        ]}
      />

      <SectionTitle icon={ShieldCheck}>الاستخدام المقبول</SectionTitle>
      <p>عند استخدام الموقع، يُمنع منعاً باتاً:</p>
      <Bullets
        items={[
          <>نسخ أو إعادة نشر أو بيع فصول الموقع أو محتواه خارج الموقع دون إذن كتابي مسبق.</>,
          <>محاولات اختراق الموقع أو تعطيله أو إثقال خوادمه بطلبات آلية (bots / scrapers) أو استغلال ثغرات.</>,
          <>جمع بيانات المستخدمين الآخرين (scraping للتعليقات أو البيانات الشخصية).</>,
          <>نشر تعليقات مسيئة أو تحريضية أو عنصرية أو إباحية، أو روابطspam وإعلانات في التعليقات.</>,
          <>استخدام الموقع بأي طريقة تخالف القوانين المعمول بها.</>,
        ]}
      />

      <SectionTitle icon={FileText}>المحتوى وحقوق الملكية الفكرية</SectionTitle>
      <Bullets
        items={[
          <>
            <strong className="text-foreground">حقوق الأعمال الأصلية:</strong> الروايات المنشورة تظل حقوقها
            الأصلية لأصحابها — المؤلفين والناشرين المرخصين. النسخ والترجمات المعروضة على الموقع متاحة
            للاستخدام الشخصي للقراءة فقط.
          </>,
          <>
            <strong className="text-foreground">حقوق الناشرين على المنصة:</strong> جهد الترجمة والنشر والتحرير
            الخاص بفريق الموقع وناشريه محمي، ويُمنع نسخه أو إعادة نشره في مواقع أو تطبيقات أخرى.
          </>,
          <>
            <strong className="text-foreground">بلاغات أصحاب الحقوق:</strong> إذا كنت مالك حقوق وترى أن محتوى
            على الموقع ينتهك حقوقك، أرسل لنا بلاغاً عبر قنوات التواصل الموضحة في صفحة «من نحن» متضمناً: هوية
            العمل، رابط الصفحة المخالفة، وإثبات الملكية — وسنتعامل مع البلاغ بجدية وسرعة، بما يشمل إزالة
            المحتوى عند ثبوت المخالفة.
          </>,
          <>
            <strong className="text-foreground">محتوى المستخدمين:</strong> بالتعليق على الموقع تمنحنا ترخيصاً
            غير حصري لعرض تعليقك داخل المنصة. تبقى مسؤولية ما تكتبه عليك وحدك.
          </>,
        ]}
      />

      <SectionTitle icon={WifiOff}>التنزيلات والقراءة دون اتصال</SectionTitle>
      <Bullets
        items={[
          <>ميزة التنزيل متاحة للاستخدام الشخصي فقط — يُمنع إعادة توزيع الملفات أو محتواها بأي شكل.</>,
          <>الملفات المنزّلة تُحفظ في متصفحك على جهازك وأنت مسؤول عن إدارتها.</>,
          <>قد نعدّل أو نوقف هذه الميزة أو نحدّ من نطاقها تقنياً في أي وقت لضمان استمرار الخدمة للجميع.</>,
        ]}
      />

      <SectionTitle icon={Flag}>الإبلاغ والإشراف</SectionTitle>
      <p>
        نحترم حرية الرأي، لكن نحتفظ بحق إزالة أي تعليق أو تعديله، وتقييد الحسابات المخالفة، دون إشعار مسبق في
        الحالات الجسيمة. إن رأيت محتوى مخالفاً استخدم زر «الإبلاغ عن مشكلة» في صفحة الرواية أو قنوات التواصل.
      </p>

      <SectionTitle icon={ShieldCheck}>إخلاء المسؤولية وحدودها</SectionTitle>
      <Bullets
        items={[
          <>الخدمة مقدمة «كما هي» دون ضمانات صريحة أو ضمنية بشأن الاكتمال أو الخلو من الأخطاء أو الانقطاع.</>,
          <>لا نتحمل مسؤولية أي ضرر مباشر أو غير مباشر ينتج عن استخدام الموقع أو التعذر المؤقت له.</>,
          <>الروابط المنشورة من المستخدمين في التعليقات ليست مسؤوليتنا ولا نضمن محتواها.</>,
        ]}
      />

      <SectionTitle icon={FileText}>تعديل الشروط وإنهاء الخدمة</SectionTitle>
      <p>
        قد نحدّث هذه الشروط، وسنُظهر تاريخ آخر تحديث أسفل الصفحة، والاستمرار في الاستخدام بعد التحديث يعني
        موافقتك عليه. يحق لنا تعديل ميزات الموقع أو إيقافها، وحذف الحسابات المخالفة صراحة لهذه الشروط.
      </p>

      <SectionTitle icon={MessageCircle}>الأسئلة حول الشروط</SectionTitle>
      <p>
        لأي استفسار حول هذه الشروط، استخدم قنوات التواصل المذكورة في صفحة{' '}
        <Link to="/about#contact" className="text-primary hover:underline">من نحن — تواصل معنا</Link>.
      </p>

      <p className="text-muted-foreground text-sm pt-2">{SITE_TAGLINE}</p>
      <LastUpdated />
    </StaticShell>
  );
}
