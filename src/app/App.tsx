import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { UiProvider } from '@/lib/ui';
import { Gate } from './Gate';
import { Layout } from './Layout';
import { HomePage } from '@/features/home/HomePage';
import { ShipPage } from '@/features/ship/ShipPage';
import { DeathPage } from '@/features/death/DeathPage';
import { SettlePage } from '@/features/settle/SettlePage';
import { HerdPage } from '@/features/herd/HerdPage';
import { AnalysisPage } from '@/features/analysis/AnalysisPage';
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
                      <Route path="/ship" element={<ShipPage />} />
                      <Route path="/death" element={<DeathPage />} />
                      <Route path="/settle" element={<SettlePage />} />
                      <Route path="/input" element={<Navigate to="/death" />} />
                      <Route path="/report" element={<Navigate to="/analysis" />} />
                      <Route path="/herd" element={<HerdPage />} />
                      <Route path="/analysis" element={<AnalysisPage />} />
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
