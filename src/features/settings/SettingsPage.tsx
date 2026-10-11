import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTitle } from '@/app/Layout';
import { FarmsTab } from './FarmsTab';
import { ThresholdsTab } from './ThresholdsTab';
import { NameMapTab } from './NameMapTab';
import { BackupTab } from './BackupTab';

export function SettingsPage() {
  return (
    <>
      <PageTitle title="설정" sub="바뀌는 값은 모두 여기서 고칩니다 — 코드 수정 없이 농장·동·기준값 관리" />
      <Tabs defaultValue="farms">
        <TabsList>
          <TabsTrigger value="farms">농장·동</TabsTrigger>
          <TabsTrigger value="thr">기준값</TabsTrigger>
          <TabsTrigger value="names">이름 맞춤표</TabsTrigger>
          <TabsTrigger value="backup">백업</TabsTrigger>
        </TabsList>
        <TabsContent value="farms"><FarmsTab /></TabsContent>
        <TabsContent value="thr"><ThresholdsTab /></TabsContent>
        <TabsContent value="names"><NameMapTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>
    </>
  );
}
