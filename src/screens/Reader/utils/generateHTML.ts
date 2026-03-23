import { ChapterFull } from '../../../services/novel';
import { ReaderSettings } from '../types';
import { FONT_OPTIONS } from './constants';

interface GenerateHTMLParams {
  chapter: ChapterFull;
  settings: {
    bgColor: string;
    textColor: string;
    fontFamily: { family: string };
    fontSize: number;
    textBrightness: number;
    enableDialogue: boolean;
    dialogueColor: string;
    dialogueSize: number;
    hideQuotes: boolean;
    selectedQuoteStyle: string;
    enableMarkdown: boolean;
    markdownColor: string;
    markdownSize: number;
    hideMarkdownMarks: boolean;
    selectedMarkdownStyle: string;
  };
  activeReplacements: { original: string; replacement: string }[];
  authorProfile: { name: string; picture?: string; banner?: string } | null;
  novelTitle: string;
  commentCount: number;
  isAdmin: boolean;
  cleanerWords: string[];
  enableSeparator: boolean;
  separatorText: string;
  copyrightStartText: string;
  copyrightEndText: string;
  copyrightStyle: {
    color: string;
    opacity: number;
    alignment: string;
    isBold: boolean;
    fontSize: number;
  };
  copyrightFrequency: string;
  copyrightEveryX: number;
}

export const generateHTML = (params: GenerateHTMLParams): string => {
  const {
    chapter,
    settings,
    activeReplacements,
    authorProfile,
    novelTitle,
    commentCount,
    isAdmin,
    cleanerWords,
    enableSeparator,
    separatorText,
    copyrightStartText,
    copyrightEndText,
    copyrightStyle,
    copyrightFrequency,
    copyrightEveryX,
  } = params;

  const startCopy = chapter.copyrightStart;
  const endCopy = chapter.copyrightEnd;
  const style = chapter.copyrightStyles || {};

  const copyrightCSS = `
    color: ${style.color || '#888'};
    opacity: ${style.opacity || 1};
    text-align: ${style.alignment || 'center'};
    font-weight: ${style.isBold ? 'bold' : 'normal'};
    font-size: ${style.fontSize || 14}px;
    line-height: 1.5;
    padding: 15px 0;
    margin: 10px 0;
    font-family: sans-serif;
  `;

  const dividerCSS = `
    .chapter-divider {
      border: none;
      height: 1px;
      background-color: rgba(128,128,128,0.3);
      margin: 10px 0 30px 0;
      width: 100%;
    }
  `;
  const dividerHTML = `<div class="chapter-divider"></div>`;

  const startHTML = startCopy ? `
    <div class="app-copyright start" style="${copyrightCSS}">
      ${startCopy}
    </div>
    ${dividerHTML}
  ` : '';

  const endHTML = endCopy ? `
    ${dividerHTML}
    <div class="app-copyright end" style="${copyrightCSS}">
      ${endCopy}
    </div>
  ` : '';

  let content = chapter.content;

  // Apply replacements
  activeReplacements.forEach(rep => {
    if (rep.original && rep.replacement) {
      const escaped = rep.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      content = content.replace(regex, rep.replacement);
    }
  });

  // Cleaner (admin)
  if (isAdmin && cleanerWords.length) {
    cleanerWords.forEach(word => {
      if (!word) return;
      if (word.includes('\n') || word.includes('\r')) {
        content = content.split(word).join('');
      } else {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^.*${escaped}.*$`, 'gm');
        content = content.replace(regex, '');
      }
    });
  }

  // Separator
  if (enableSeparator) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0 && /^(?:الفصل|Chapter|فصل)|:/i.test(lines[i].trim())) {
        lines[i] = lines[i] + `\n\n${separatorText}\n\n`;
        break;
      }
    }
    content = lines.join('\n');
  }

  // Format content with dialogue and markdown
  const formattedContent = content
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => {
      let processedLine = line;

      // Markdown
      if (settings.enableMarkdown) {
        const markClass = settings.hideMarkdownMarks ? 'mark-hidden' : 'mark-visible';
        let openQuote = '', closeQuote = '';
        if (settings.selectedMarkdownStyle === 'guillemets') { openQuote = '«'; closeQuote = '»'; }
        else if (settings.selectedMarkdownStyle === 'curly') { openQuote = '“'; closeQuote = '”'; }
        else if (settings.selectedMarkdownStyle === 'straight') { openQuote = '"'; closeQuote = '"'; }
        else if (settings.selectedMarkdownStyle === 'single') { openQuote = '‘'; closeQuote = '’'; }

        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, (_, text) => {
          const quoteStart = openQuote ? `<span class="cm-quote-style">${openQuote}</span>` : '';
          const quoteEnd = closeQuote ? `<span class="cm-quote-style">${closeQuote}</span>` : '';
          return `<span class="cm-markdown-bold"><span class="${markClass}">**</span>${quoteStart}${text}${quoteEnd}<span class="${markClass}">**</span></span>`;
        });
      }

      // Dialogue
      if (settings.enableDialogue) {
        const quoteClass = settings.hideQuotes ? 'quote-mark hidden' : 'quote-mark';
        let quoteRegex;
        if (settings.selectedQuoteStyle === 'guillemets') {
          quoteRegex = /(«)([\s\S]*?)(»)/g;
        } else if (settings.selectedQuoteStyle === 'curly') {
          quoteRegex = /([“])([\s\S]*?)([”])/g;
        } else if (settings.selectedQuoteStyle === 'straight') {
          quoteRegex = /(")([\s\S]*?)(")/g;
        } else if (settings.selectedQuoteStyle === 'single') {
          quoteRegex = /(['‘])([\s\S]*?)(['’])/g;
        } else {
          quoteRegex = /([“"«])([\s\S]*?)([”"»])/g;
        }

        processedLine = processedLine.replace(quoteRegex, (_, open, text, close) => {
          return `<span class="cm-dialogue-text"><span class="${quoteClass}">${open}</span>${text}<span class="${quoteClass}">${close}</span></span>`;
        });
      }

      return `<p>${processedLine}</p>`;
    })
    .join('');

  const fontImports = FONT_OPTIONS.map(f => f.url ? `@import url('${f.url}');` : '').join('\n');

  const authorName = authorProfile?.name || novelTitle.split(' - ')[0] || 'Zeus';
  const authorAvatar = authorProfile?.picture || 'https://via.placeholder.com/150';
  const authorBanner = authorProfile?.banner || null;
  const bannerStyle = authorBanner ? `background-image: url('${authorBanner}');` : 'background-color: #000;';

  const publisherBanner = `
    <div class="author-section-wrapper">
      <div class="section-title">الناشر</div>
      <div class="author-card" id="authorCard">
        <div class="author-banner" style="${bannerStyle}"></div>
        <div class="author-overlay"></div>
        <div class="author-content">
          <div class="author-avatar-wrapper">
            <img src="${authorAvatar}" class="author-avatar-img" />
          </div>
          <div class="author-name">${authorName}</div>
        </div>
      </div>
    </div>
  `;

  const commentsButton = `
    <div class="comments-btn-container">
      <button class="comments-btn" id="commentsBtn">
        <span class="icon">💬</span>
        <span>عرض التعليقات (${commentCount})</span>
      </button>
    </div>
  `;

  // 🔥 GENIUS PROTECTION: Obfuscate the final HTML content area
  const ZEUS_SECRET = "Z3uS_N0v3l_2026_S3cr3t_K3y";
  const obfuscate = (text: string) => {
    const encoded = encodeURIComponent(text);
    let result = "";
    for (let i = 0; i < encoded.length; i++) {
      result += String.fromCharCode(encoded.charCodeAt(i) ^ ZEUS_SECRET.charCodeAt(i % ZEUS_SECRET.length));
    }
    return btoa(result);
  };

  const obfuscatedFinalContent = obfuscate(formattedContent);

  const brightnessStyle = `filter: brightness(${settings.textBrightness});`;

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        ${fontImports}
        * { 
          -webkit-tap-highlight-color: transparent; 
          -webkit-touch-callout: none; 
          box-sizing: border-box; 
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        body, html {
          margin: 0; padding: 0; background-color: ${settings.bgColor}; color: ${settings.textColor};
          font-family: ${settings.fontFamily.family}; line-height: 1.8;
          -webkit-overflow-scrolling: touch;
          overflow-x: hidden;
          ${brightnessStyle}
        }
        .container { padding: 25px 20px 120px 20px; width: 100%; max-width: 800px; margin: 0 auto; }
        .title {
          font-size: ${settings.fontSize + 8}px; font-weight: bold; margin-bottom: 20px;
          color: ${settings.bgColor === '#fff' ? '#000' : '#fff'};
          padding-bottom: 10px; font-family: ${settings.fontFamily.family};
          text-align: right;
        }
        ${dividerCSS}
        .content-area { font-size: ${settings.fontSize}px; text-align: justify; word-wrap: break-word; }
        p { margin-bottom: 1.5em; }
        .cm-dialogue-text {
          color: ${settings.enableDialogue ? settings.dialogueColor : 'inherit'};
          font-size: ${settings.dialogueSize}%;
          font-weight: bold;
          transition: color 0.3s ease, font-size 0.3s ease;
        }
        .cm-markdown-bold {
          font-weight: bold;
          color: ${settings.enableMarkdown ? settings.markdownColor : 'inherit'};
          font-size: ${settings.markdownSize}%;
          transition: color 0.3s ease, font-size 0.3s ease;
        }
        .cm-quote-style { opacity: 1; }
        .quote-mark { opacity: 1; transition: opacity 0.3s ease; }
        .quote-mark.hidden { opacity: 0; font-size: 0; }
        .mark-visible { opacity: 1; }
        .mark-hidden { opacity: 0; font-size: 0; }

        .author-section-wrapper { margin-top: 50px; margin-bottom: 20px; border-top: 1px solid #222; padding-top: 20px; }
        .section-title { color: ${settings.bgColor === '#fff' ? '#000' : '#fff'}; font-size: 18px; font-weight: bold; margin-bottom: 12px; text-align: right; }
        .author-card { border-radius: 16px; overflow: hidden; margin-top: 10px; border: 1px solid #222; position: relative; height: 140px; width: 100%; cursor: pointer; }
        .author-banner { position: absolute; width: 100%; height: 100%; background-size: cover; background-position: center; }
        .author-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)); z-index: 1; }
        .author-content { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; width: 100%; }
        .author-avatar-wrapper { width: 76px; height: 76px; border-radius: 38px; border: 3px solid #fff; background-color: #333; margin-bottom: 8px; overflow: hidden; }
        .author-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .author-name { color: #fff; font-size: 20px; font-weight: bold; text-transform: uppercase; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9); text-align: center; }
        .comments-btn-container { margin-bottom: 40px; padding: 0 5px; }
        .comments-btn { width: 100%; background-color: ${settings.bgColor === '#fff' ? '#f0f0f0' : '#1a1a1a'}; border: 1px solid ${settings.bgColor === '#fff' ? '#ddd' : '#333'}; color: ${settings.bgColor === '#fff' ? '#333' : '#fff'}; padding: 15px; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      </style>
    </head>
    <body oncontextmenu="return false;">
      <div class="container" id="clickable-area">
        <div class="title">${chapter.title}</div>
        ${dividerHTML}
        ${startHTML}
        <div class="content-area" id="main-content-area">
          <div style="text-align: center; padding: 20px; opacity: 0.5;">جاري التحميل الآمن...</div>
        </div>
        ${endHTML}
        ${publisherBanner}
        ${commentsButton}
      </div>
      <script>
        (function() {
          const _S = "${ZEUS_SECRET}";
          const _D = "${obfuscatedFinalContent}";
          
          function decrypt(encoded) {
            try {
              const text = atob(encoded);
              let result = "";
              for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(text.charCodeAt(i) ^ _S.charCodeAt(i % _S.length));
              }
              return decodeURIComponent(result);
            } catch (e) { return "خطأ في تحميل المحتوى الآمن."; }
          }

          // Inject content safely
          document.getElementById('main-content-area').innerHTML = decrypt(_D);

          // Anti-copy protection
          document.addEventListener('copy', (e) => e.preventDefault());
          document.addEventListener('cut', (e) => e.preventDefault());
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'u' || e.key === 's' || e.key === 'p')) {
              e.preventDefault();
              return false;
            }
          });

          function sendMessage(msg) {
            if (window.parent) { window.parent.postMessage(msg, '*'); }
          }
          document.addEventListener('click', function(e) {
            try {
              if (e.target.closest('#commentsBtn')) { e.stopPropagation(); sendMessage('openComments'); return; }
              if (e.target.closest('#authorCard')) { e.stopPropagation(); sendMessage('openProfile'); return; }
              var selection = window.getSelection();
              if (selection && selection.toString().length > 0) return;
              sendMessage('toggleMenu');
            } catch(err) {}
          });
        })();
      </script>
    </body>
    </html>
  `;
};
