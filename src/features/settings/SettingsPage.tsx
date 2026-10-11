// 설정 — 목업 v5의 카드 4개(기준값·이름 맞춤표·공유 링크·후기자돈사) + 아래 '관리' 탭에서 실제 수정
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/lib/data';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { newShareKey } from '@/share/payload';
import { shareUrl } from '@/share/shareConfig';
import { LOTS } from '@/data/snapshot';
import { FarmsTab } from './FarmsTab';
import { ThresholdsTab } from './ThresholdsTab';
import { NameMapTab } from './NameMapTab';
import { BackupTab } from './BackupTab';

export function SettingsPage() {
  const { data } = useData();
  const { farms, saved, save } = useHerd();
  const { repo } = useAuth();
  const [tab, setTab] = useState('farms');
  const [copied, setCopied] = useState('');
  const [renew, setRenew] = useState('');
  const links = saved.shareLinks;
  const issue = (f: string) => save({ shareLinks: { ...links, [f]: newShareKey() } });
  const reissue = async (f: string) => { const old = links[f]; save({ shareLinks: { ...links, [f]: newShareKey() } }); if (old) await repo?.remove('share', old).catch(() => {}); setRenew(''); };
  const copy = (f: string) => { navigator.clipboard?.writeText(shareUrl(links[f])); setCopied(f); setTimeout(() => setCopied(''), 1500); };
  if (!data) return null;
  const T = data.thresholds;
  const edit = (t: string) => { setTab(t); setTimeout(() => document.getElementById('manage')?.scrollIntoView({ behavior: 'smooth' }), 0); };
  const lukaLots = Object.entries(LOTS).filter(([w]) => w.startsWith('골드피그 26-1')).flatMap(([w, L]) => L.slice(0, 3).map((l, i) => ({ w, i, l })));
  const base = location.href.split('#')[0];
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 className="h2">기준값</h2><button className="btn sm ghost" onClick={() => edit('thr')}>수정</button></div>
          <div className="tblbox"><table className="wrapcells">
            <thead><tr><th>항목</th><th className="r">값</th></tr></thead>
            <tbody>
              <tr><td>작업 알림 체중 기준</td><td className="r">{T.workWeightKg}kg</td></tr>
              <tr><td>구제역 ({T.workWeightKg}kg 미만 / 이상)</td><td className="r">전입+{T.fmdDaysAfterEntry}일 / {T.fmdAgeHeavy}일령</td></tr>
              <tr><td>구충·사료변경 ({T.workWeightKg}kg 미만 / 이상)</td><td className="r">전입+{T.dewormDaysAfterEntry}일 / {T.dewormAgeHeavy}일령</td></tr>
              <tr><td>출하지연</td><td className="r">{T.delayNoShipAge}일 미출하 · {T.delayRemainAge}일 잔여 · 첫출하 {T.firstShipOverdueDays}일 경과</td></tr>
              <tr><td>육성률 계산</td><td className="r">전입 = 실두수 − 클레임</td></tr>
              <tr><td>정산예정 추천</td><td className="r">진행률 {T.settleProgressPct}% · 재고 {T.settleStockPct}% 이하 · 마지막 출하 {T.settleLastShipDays}일</td></tr>
              <tr><td>문제농가 (그룹 육성률)</td><td className="r">{T.problemSurvivalPct}% 미만</td></tr>
              <tr><td>일령 계산</td><td className="r">차수 두수 가중 평균</td></tr>
              <tr><td>출하기간 · 돈사 비움</td><td className="r">{T.shipPeriodDays}일 · {T.emptyDays}일</td></tr>
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><h2 className="h2">이름 맞춤표</h2><button className="btn sm ghost" onClick={() => edit('names')}>수정</button></div>
          <div className="tblbox"><table className="wrapcells">
            <thead><tr><th>파일에 적힌 이름</th><th>대시보드</th></tr></thead>
            <tbody>{data.nameMap.map((r) => <tr key={r.id}><td>{r.source} ({r.sourceFile})</td><td>{r.excluded ? '담당 아님' + (r.memo ? ' · ' + r.memo.replace('골드피그와 같은 사장님의 다른 농장', '골드피그와 다른 농장') : '') : r.target}</td></tr>)}</tbody>
          </table></div>
        </div>
        <div className="card">
          <h2 className="h2" style={{ marginBottom: 10 }}>농장 공유 링크</h2>
          <div className="tblbox"><table>
            <thead><tr><th>농장</th><th>공유 링크 (조회 + 폐사 등록)</th><th /></tr></thead>
            <tbody>{farms.map((f) => (
              <tr key={f}>
                <td>{f}</td>
                <td>{links[f] ? <><button className="lnk" style={{ fontWeight: 400 }} onClick={() => copy(f)}>{copied === f ? '복사됨 ✓' : '링크 복사'}</button> · <a href={shareUrl(links[f])} target="_blank" rel="noreferrer">열기</a> · <a href={'#/share?farm=' + encodeURIComponent(f)}>미리보기</a></> : <button className="btn sm" onClick={() => issue(f)}>링크 만들기</button>}</td>
                <td className="r">{links[f] && (renew === f ? <button className="btn sm" style={{ borderColor: '#9A3216', color: '#9A3216' }} onClick={() => reissue(f)}>예전 링크 끊기</button> : <button className="btn sm ghost" onClick={() => setRenew(f)}>새 링크로</button>)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
        <div>
          <div className="card">
            <h2 className="h2" style={{ marginBottom: 10 }}>자돈_루카 (후기자돈사)</h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, margin: 0 }}>1단계는 요약과 기존 현황판 연결만 둔다. 루카에서 분양한 돈군은 위탁 농장 전입으로 자동 연결된다.</p>
            <a href="https://lor3791-boop.github.io/luka-piglets/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 14 }}>기존 루카 전입출 현황판 열기 (PIN 필요)</a>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="h2" style={{ marginBottom: 10 }}>루카 분양 → 위탁 전입 연결 (전입현황 실제 값)</h2>
            <div className="tblbox"><table className="wrapcells">
              <thead><tr><th>위탁 농장 · 그룹</th><th>로트</th><th>전입일</th><th className="r">두수</th><th className="r">평체</th><th className="r">일령</th><th>분양농장</th></tr></thead>
              <tbody>{lukaLots.map(({ w, i, l }) => <tr key={w + i}><td>{w}</td><td>({i + 1})</td><td>{l[0].replace('-', '/')}</td><td className="r">{l[1]}</td><td className="r">{l[6]}</td><td className="r">{l[3]}</td><td>인티-루카농장</td></tr>)}</tbody>
            </table></div>
          </div>
        </div>
      </div>

      <div id="manage" className="card" style={{ marginTop: 24 }}>
        <h2 className="h2" style={{ marginBottom: 6 }}>관리</h2>
        <Tabs value={tab} onValueChange={setTab}>
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
      </div>
    </>
  );
}
