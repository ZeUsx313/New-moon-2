import React, { useRef, useEffect } from 'react';

interface ChapterContentProps {
  html: string;
  onMessage: (msg: string) => void;
}

export const ChapterContent: React.FC<ChapterContentProps> = ({ html, onMessage }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        onMessage(event.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      className="w-full h-full border-0"
      title="chapter-content"
      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
    />
  );
};