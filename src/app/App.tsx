import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { UiProvider } from '@/lib/ui';
import { Gate } from './Gate';
import { Layout } from './Layout';
import { HomePage } from '@/features/home/HomePage';
import { InputPage } from '@/features/input/InputPage';
import { HerdPage } from '@/features/herd/HerdPage';
import { AnalysisPage } from '@/features/analysis/AnalysisPage';
import { ReportPage } from '@/features/report/ReportPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SharePage } from '@/features/share/SharePage';

export function App() {
  return (
    <AuthProvider>
      <Gate>
        <DataProvider>
          <HashRouter>
            <UiProvider>
              <Routes>
                <Route path="/share" element={<SharePage />} />
                <Route path="*" element={
                  <Layout>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/input" element={<InputPage />} />
                      <Route path="/herd" element={<HerdPage />} />
                      <Route path="/analysis" element={<AnalysisPage />} />
                      <Route path="/report" element={<ReportPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                  </Layout>
                } />
              </Routes>
            </UiProvider>
          </HashRouter>
        </DataProvider>
      </Gate>
    </AuthProvider>
  );
}
