/**
 * 🔎 SEO المركزي — عنوان/وصف/كانوني/OG/Twitter + JSON-LD (Schema.org).
 * يُستخدم في كل الصفحات المهمة لجوجل:
 *   - Home   : WebSite + SearchAction (صندوق بحث السايت-لينكس في نتائج جوجل)
 *   - Novel  : Book + BreadcrumbList (نتائج غنية بالنجوم والبيانات)
 *   - الباقي : عنوان/وصف/كانوني يمنع المحتوى المكرر
 */
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_TAGLINE, siteUrl } from '../lib/site';

interface SEOProps {
  title: string;
  description: string;
  path?: string;               // المسار النسبي (/ أو /novel/xxx)
  image?: string;              // صورة OG
  noindex?: boolean;           // للصفحات الخاصة
  jsonLd?: object | object[];  // بيانات منظمة
}

export default function SEO({ title, description, path = '/', image, noindex, jsonLd }: SEOProps) {
  const canonical = siteUrl(path);
  const ogImage = image?.startsWith('http') ? image : siteUrl(image || '/icon.png');
  const fullTitle = path === '/' ? `${SITE_NAME} — ${SITE_TAGLINE}` : `${title} — ${SITE_NAME}`;
  const graph = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : null;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
      )}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={path === '/' ? 'website' : 'article'} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* بيانات منظمة */}
      {graph && <script type="application/ld+json">{JSON.stringify(graph)}</script>}
    </Helmet>
  );
}

/** JSON-LD للموقع + صندوق بحث جوجل (Sitelinks Search Box) */
export const websiteJsonLd = (): object => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: 'Moon Novels',
  url: siteUrl('/'),
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl('/library')}?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
});

/** JSON-LD لصفحة رواية (نتيجة غنية) */
export const bookJsonLd = (novel: any): object => ({
  '@context': 'https://schema.org',
  '@type': 'Book',
  name: novel.title,
  alternateName: novel.titleEn || undefined,
  author: { '@type': 'Person', name: novel.author || 'غير معروف' },
  inLanguage: 'ar',
  image: novel.cover || undefined,
  description: (novel.description || '').slice(0, 300) || undefined,
  genre: novel.category || undefined,
  keywords: (novel.tags || []).join(', ') || undefined,
  numberOfPages: novel.chaptersCount || undefined,
  url: siteUrl(`/novel/${novel._id}`),
  ...(novel.rating > 0 ? {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: novel.rating,
      bestRating: 10,
      ratingCount: Math.max(1, novel.views || 1),
    },
  } : {}),
});

/** JSON-LD مسار التنقل */
export const breadcrumbJsonLd = (items: { name: string; path: string }[]): object => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: siteUrl(it.path),
  })),
});
