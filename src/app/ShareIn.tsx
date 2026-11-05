// 폰 '공유'로 들어온 파일 나누기 — 사진은 폐사 입력, 엑셀은 출하 올리기
import { useEffect, useState } from 'react';
import { useUi } from '@/lib/ui';
import { peekInbox } from '@/lib/inbox';

export function ShareIn() {
  const { go } = useUi();
  const [msg, setMsg] = useState('공유받은 파일을 여는 중…');
  useEffect(() => {
    peekInbox().then(({ image, sheet }) => {
      if (sheet) go('/ship', { shipTab: 'input' });
      else if (image) go('/death', { deathTab: 'input' });
      else setMsg('공유받은 파일이 없습니다');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="card"><div className="muted">{msg}</div></div>;
}
