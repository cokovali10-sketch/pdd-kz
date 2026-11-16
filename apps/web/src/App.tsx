import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ContentProvider } from './app/providers';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { HomePage } from './pages/HomePage';
import { ExamModesPage } from './pages/ExamModesPage';
import { ExamRunnerPage } from './pages/ExamRunnerPage';
import { QuestionPreviewPage } from './pages/QuestionPreviewPage';
import { TicketsPage } from './pages/TicketsPage';
import { TopicsPage } from './pages/TopicsPage';
import { TopicDetailPage } from './pages/TopicDetailPage';
import { SignsPage } from './pages/SignsPage';
import { SignDetailPage } from './pages/SignDetailPage';
import { MarkingsPage } from './pages/MarkingsPage';
import { ReferencePage } from './pages/ReferencePage';
import { ChapterPage } from './pages/ChapterPage';
import { FinesPage } from './pages/FinesPage';
import { ProgressPage } from './pages/ProgressPage';
import { TopPage } from './pages/TopPage';
import { ProfilePage } from './pages/ProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { SearchPage } from './pages/SearchPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { i18n } from './lib/i18n';

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <ErrorBoundary
      errorLabel={i18n.t('common.error')}
      loadingLabel={i18n.t('common.retryLater')}
    >
      <BrowserRouter>
        <ContentProvider>
          <Routes>
            <Route element={<AppShell scrolled={scrolled} />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/exam" element={<ExamModesPage />} />
              <Route path="/exam/run" element={<ExamRunnerPage />} />
              <Route path="/exam/preview/:questionId" element={<QuestionPreviewPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:ticketId" element={<TicketsPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/topics/:topicId" element={<TopicDetailPage />} />
              <Route path="/signs" element={<SignsPage />} />
              <Route path="/signs/:code" element={<SignDetailPage />} />
              <Route path="/markings" element={<MarkingsPage />} />
              <Route path="/reference" element={<ReferencePage />} />
              <Route path="/reference/:chapterId" element={<ChapterPage />} />
              <Route path="/fines" element={<FinesPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/top" element={<TopPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ContentProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}