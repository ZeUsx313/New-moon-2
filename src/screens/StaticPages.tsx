import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';
import { SITE_NAME, SITE_TAGLINE } from '../lib/site';

function StaticShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>
      <Helmet>
        <title>{`${title} - ${SITE_NAME}`}</title>
        <meta name="description" content={description} />
      </Helmet>
      <Header isDarkMode={isDark} setIsDarkMode={toggleTheme} />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">{title}</h1>
        <div className="space-y-4 text-foreground/80 leading-relaxed text-[15px]">{children}</div>
        <Link to="/" className="inline-block mt-10 text-primary hover:underline text-sm font-semibold">
          ← العودة إلى الرئيسية
        </Link>
      </main>
      <Footer />
    </div>
  );
}

export function About() {
  return (
    <StaticShell
      title="من نحن"
      description={`${SITE_NAME} — منصة عربية لقراءة الروايات المترجمة بجودة عالية وتجربة قراءة مريحة.`}
    >
      <p>
        {SITE_NAME} منصة عربية متخصصة في تقديم الروايات العربية والعالمية المترجمة بجودة عالية، بتجربة قراءة
        مريحة على الهاتف والحاسوب، وتحديثات مستمرة لأحدث الفصول.
      </p>
      <p>
        مهمتنا أن نجعل القراءة العربية أسهل وأجمل: واجهة سريعة، قارئ متقدم بإعدادات كاملة (الخط، الألوان، وضع
        التمرير المتواصل)، مكتبة شخصية، وتعليقات مجتمعية حيّة.
      </p>
      <p>للتواصل أو الإبلاغ عن مشكلة، استخدم زر «الإبلاغ عن مشكلة» في صفحة أي رواية — نقرأ كل بلاغ.</p>
    </StaticShell>
  );
}

export function Privacy() {
  return (
    <StaticShell
      title="سياسة الخصوصية"
      description={`سياسة خصوصية ${SITE_NAME}: البيانات التي نجمعها وكيف نحميها.`}
    >
      <p>نحترم خصوصيتك ونلتزم بحماية بياناتك. هذه الصفحة تشرح ما نجمعه وكيف نستخدمه.</p>
      <h2 className="text-xl font-bold text-foreground pt-2">البيانات التي نجمعها</h2>
      <ul className="list-disc pr-6 space-y-2">
        <li>بيانات الحساب: الاسم، البريد الإلكتروني، وكلمة المرور (تُخزَّن مشفّرة على الخادم).</li>
        <li>بيانات الاستخدام: سجل القراءة، المفضلة، والتفاعلات — لتحسين تجربتك وحفظ تقدمك.</li>
        <li>بيانات تقنية: نوع المتصفح والجهاز لأغراض إحصائية مجمّعة.</li>
      </ul>
      <h2 className="text-xl font-bold text-foreground pt-2">كيف نستخدم البيانات</h2>
      <ul className="list-disc pr-6 space-y-2">
        <li>تشغيل الحساب وحفظ تقدم القراءة والمفضلة.</li>
        <li>تحسين المحتوى والأداء — ولا نبيع بياناتك لأي طرف ثالث إطلاقاً.</li>
      </ul>
      <h2 className="text-xl font-bold text-foreground pt-2">حقوقك</h2>
      <p>
        يمكنك تعديل ملفك الشخصي أو حذف حسابك في أي وقت بالتواصل معنا. تقدم القراءة كضيف تُحفظ محلياً على جهازك
        فقط ولا تُرسل للخادم.
      </p>
    </StaticShell>
  );
}

export function Terms() {
  return (
    <StaticShell
      title="شروط الاستخدام"
      description={`شروط استخدام منصة ${SITE_NAME}.`}
    >
      <p>باستخدامك للموقع فإنك توافق على الشروط التالية:</p>
      <ul className="list-disc pr-6 space-y-2">
        <li>المحتوى متاح للاستخدام الشخصي غير التجاري — يُمنع نسخ أو إعادة نشر فصول الموقع دون إذن.</li>
        <li>يُمنع استخدام حسابات متعددة أو محاولات إساءة استخدام الخدمة أو تعطيلها.</li>
        <li>التعليقات المسيئة أو المخالفة قد تؤدي إلى تقييد الحساب.</li>
        <li>قد تتغير هذه الشروط، وسنُعلن عن أي تغييرات جوهرية على الموقع.</li>
      </ul>
      <p className="text-white/40 text-sm pt-2">{SITE_TAGLINE}</p>
    </StaticShell>
  );
}
