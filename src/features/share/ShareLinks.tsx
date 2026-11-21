// 농장별 현황 공유링크 — 농장마다 공유 링크(조회 + 폐사 등록) 만들기·복사·미리보기
import { useState } from 'react';
import { useHerd } from '@/lib/ui';
import { useAuth } from '@/lib/auth';
import { newShareKey } from '@/share/payload';
import { shareUrl } from '@/share/shareConfig';

export function ShareLinks() {
  const { farms, saved, save } = useHerd();
  const { repo } = useAuth();
  const [copied, setCopied] = useState('');
  const [renew, setRenew] = useState('');
  const links = saved.shareLinks;
  const issue = (f: string) => save({ shareLinks: { ...links, [f]: newShareKey() } });
  const reissue = async (f: string) => { const old = links[f]; save({ shareLinks: { ...links, [f]: newShareKey() } }); if (old) await repo?.remove('share', old).catch(() => {}); setRenew(''); };
  const copy = (f: string) => { navigator.clipboard?.writeText(shareUrl(links[f])); setCopied(f); setTimeout(() => setCopied(''), 1500); };
  return (
    <div className="card">
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
  );
}
