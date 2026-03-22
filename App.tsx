import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './src/screens/Home';
import NovelPage from './src/screens/NovelPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/novel/:slug" element={<NovelPage />} />
        {/* يمكن إضافة مسار للفصل الفردي إذا رغبت */}
        {/* <Route path="/novel/:slug/chapter-:chapter" element={<ChapterPage />} /> */}
      </Routes>
    </Router>
  );
}