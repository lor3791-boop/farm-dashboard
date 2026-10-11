import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { Gate } from './Gate';
import { Layout } from './Layout';
import { Planned } from './Planned';
import { MENU } from './menu';
import { HomePage } from '@/features/home/HomePage';
import { SettingsPage } from '@/features/settings/SettingsPage';

const m = (p: string) => MENU.find((x) => x.path === p)!;

export function App() {
  return (
    <AuthProvider>
      <Gate>
        <DataProvider>
          <HashRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/input" element={<Planned m={m('/input')} />} />
                <Route path="/herd" element={<Planned m={m('/herd')} />} />
                <Route path="/analysis" element={<Planned m={m('/analysis')} />} />
                <Route path="/report" element={<Planned m={m('/report')} />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </HashRouter>
        </DataProvider>
      </Gate>
    </AuthProvider>
  );
}
