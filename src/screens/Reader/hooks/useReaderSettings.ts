import { useState, useEffect, useCallback } from 'react';
import { FONT_OPTIONS } from '../utils/constants';
import { ReaderSettings } from '../types';

const STORAGE_KEY = '@reader_settings_v3';

export const useReaderSettings = () => {
  const [settings, setSettings] = useState<ReaderSettings & {
    fontFamily: { id: string; name: string; family: string };
    bgColor: string;
    textColor: string;
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
  }>({
    fontSize: 19,
    bgColor: '#0a0a0a',
    textColor: '#e0e0e0',
    fontFamily: FONT_OPTIONS[0],
    textBrightness: 1,
    enableDialogue: false,
    dialogueColor: '#4ade80',
    dialogueSize: 100,
    hideQuotes: false,
    selectedQuoteStyle: 'all',
    enableMarkdown: false,
    markdownColor: '#ffffff',
    markdownSize: 100,
    hideMarkdownMarks: false,
    selectedMarkdownStyle: 'all',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.fontSize) setSettings(prev => ({ ...prev, fontSize: parsed.fontSize }));
          if (parsed.bgColor) {
            setSettings(prev => ({
              ...prev,
              bgColor: parsed.bgColor,
              textColor: parsed.bgColor === '#fff' ? '#1a1a1a' : '#e0e0e0',
            }));
          }
          if (parsed.fontId) {
            const found = FONT_OPTIONS.find(f => f.id === parsed.fontId);
            if (found) setSettings(prev => ({ ...prev, fontFamily: found }));
          }
          if (parsed.enableDialogue !== undefined) setSettings(prev => ({ ...prev, enableDialogue: parsed.enableDialogue }));
          if (parsed.dialogueColor) setSettings(prev => ({ ...prev, dialogueColor: parsed.dialogueColor }));
          if (parsed.dialogueSize) setSettings(prev => ({ ...prev, dialogueSize: parsed.dialogueSize }));
          if (parsed.hideQuotes !== undefined) setSettings(prev => ({ ...prev, hideQuotes: parsed.hideQuotes }));
          if (parsed.selectedQuoteStyle) setSettings(prev => ({ ...prev, selectedQuoteStyle: parsed.selectedQuoteStyle }));
          if (parsed.enableMarkdown !== undefined) setSettings(prev => ({ ...prev, enableMarkdown: parsed.enableMarkdown }));
          if (parsed.markdownColor) setSettings(prev => ({ ...prev, markdownColor: parsed.markdownColor }));
          if (parsed.markdownSize) setSettings(prev => ({ ...prev, markdownSize: parsed.markdownSize }));
          if (parsed.hideMarkdownMarks !== undefined) setSettings(prev => ({ ...prev, hideMarkdownMarks: parsed.hideMarkdownMarks }));
          if (parsed.selectedMarkdownStyle) setSettings(prev => ({ ...prev, selectedMarkdownStyle: parsed.selectedMarkdownStyle }));
          if (parsed.textBrightness) setSettings(prev => ({ ...prev, textBrightness: parsed.textBrightness }));
        }
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const saveSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      const toStore: any = {
        fontSize: updated.fontSize,
        bgColor: updated.bgColor,
        fontId: updated.fontFamily.id,
        textBrightness: updated.textBrightness,
        enableDialogue: updated.enableDialogue,
        dialogueColor: updated.dialogueColor,
        dialogueSize: updated.dialogueSize,
        hideQuotes: updated.hideQuotes,
        selectedQuoteStyle: updated.selectedQuoteStyle,
        enableMarkdown: updated.enableMarkdown,
        markdownColor: updated.markdownColor,
        markdownSize: updated.markdownSize,
        hideMarkdownMarks: updated.hideMarkdownMarks,
        selectedMarkdownStyle: updated.selectedMarkdownStyle,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      return updated;
    });
  }, []);

  const changeFontSize = (delta: number) => {
    const newSize = settings.fontSize + delta;
    if (newSize >= 14 && newSize <= 32) {
      saveSettings({ fontSize: newSize });
    }
  };

  const changeTheme = (newBgColor: string) => {
    saveSettings({ bgColor: newBgColor, textColor: newBgColor === '#fff' ? '#1a1a1a' : '#e0e0e0' });
  };

  const handleFontChange = (font: typeof FONT_OPTIONS[0]) => {
    saveSettings({ fontFamily: font });
  };

  const handleBrightnessChange = (val: number) => {
    saveSettings({ textBrightness: val });
  };

  const toggleDialogue = (val: boolean) => saveSettings({ enableDialogue: val });
  const setDialogueColor = (color: string) => saveSettings({ dialogueColor: color });
  const setDialogueSize = (size: number) => saveSettings({ dialogueSize: size });
  const toggleHideQuotes = (val: boolean) => saveSettings({ hideQuotes: val });
  const setQuoteStyle = (style: string) => saveSettings({ selectedQuoteStyle: style });

  const toggleMarkdown = (val: boolean) => saveSettings({ enableMarkdown: val });
  const setMarkdownColor = (color: string) => saveSettings({ markdownColor: color });
  const setMarkdownSize = (size: number) => saveSettings({ markdownSize: size });
  const toggleHideMarkdownMarks = (val: boolean) => saveSettings({ hideMarkdownMarks: val });
  const setMarkdownStyle = (style: string) => saveSettings({ selectedMarkdownStyle: style });

  return {
    settings,
    saveSettings,
    changeFontSize,
    changeTheme,
    handleFontChange,
    handleBrightnessChange,
    dialogue: {
      enable: settings.enableDialogue,
      setEnable: toggleDialogue,
      color: settings.dialogueColor,
      setColor: setDialogueColor,
      size: settings.dialogueSize,
      setSize: setDialogueSize,
      hideQuotes: settings.hideQuotes,
      setHideQuotes: toggleHideQuotes,
      style: settings.selectedQuoteStyle,
      setStyle: setQuoteStyle,
    },
    markdown: {
      enable: settings.enableMarkdown,
      setEnable: toggleMarkdown,
      color: settings.markdownColor,
      setColor: setMarkdownColor,
      size: settings.markdownSize,
      setSize: setMarkdownSize,
      hideMarks: settings.hideMarkdownMarks,
      setHideMarks: toggleHideMarkdownMarks,
      style: settings.selectedMarkdownStyle,
      setStyle: setMarkdownStyle,
    },
  };
};