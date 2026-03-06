import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PageLayout } from '@components/layout';
import { HomePage, AboutPage, NotFoundPage } from '@pages/index';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PageLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
