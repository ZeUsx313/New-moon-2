import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './src/screens/Home';
import NovelPage from './src/screens/NovelPage';
import Library from './src/screens/Library';
import MyPage from './src/screens/MyPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/novel/:slug" element={<NovelPage />} />
        <Route path="/library" element={<Library />} />
        <Route path="/my-page" element={<MyPage />} />
      </Routes>
    </Router>
  );
}