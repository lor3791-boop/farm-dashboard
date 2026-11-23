// 농장 대시보드 자동 백업 — 매일 오전 6시, Firestore 전체를 내 구글드라이브 '대시보드 백업' 폴더에 JSON으로 저장
// 후기자돈사(루카, Firebase luka-piglets) 자료도 같은 폴더에 따로 저장 (luka-backup-날짜.json)
// 처음 한 번: 함수 '설치' 실행 → 권한 승인. (트리거 함수 이름 '백업'은 바꾸지 말 것)
const PROJECT = 'farm-dashboard-2e9aa';
const FOLDER = '대시보드 백업';
const BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents';

function 설치() {
  ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === '백업'; }).forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('백업').timeBased().atHour(6).nearMinute(0).everyDays(1).inTimezone('Asia/Seoul').create();
  백업(); // 바로 한 번 받아서 확인
}

function 백업() {
  const out = {};
  listCollections_('').forEach(function (c) { out[c] = dumpCollection_(c); });
  const day = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  const name = 'farm-dashboard-backup-' + day + '.json';
  const folder = folder_();
  const old = folder.getFilesByName(name); while (old.hasNext()) old.next().setTrashed(true); // 같은 날 다시 돌리면 덮어씀
  folder.createFile(name, JSON.stringify({ at: new Date().toISOString(), project: PROJECT, data: out }), 'application/json');
  console.log('백업 완료: ' + name + ' · ' + Object.keys(out).map(function (k) { return k + ' ' + Object.keys(out[k]).length; }).join(', '));
  try { 루카백업(); } catch (e) { console.error('루카 백업 실패: ' + e); } // 루카가 실패해도 대시보드 백업은 남김
}

// 루카 현황판은 공개 규칙이라 공개 키로 읽는다 (대시보드와 다른 Firebase 프로젝트)
const LUKA = 'https://firestore.googleapis.com/v1/projects/luka-piglets/databases/(default)/documents';
const LUKA_KEY = 'AIzaSyD16GVE23OVqodlFHx8h1e0FhWFDz2wLL8';
function 루카백업() {
  const get = function (path, token) {
    const res = UrlFetchApp.fetch(LUKA + '/' + path + '?pageSize=300&key=' + LUKA_KEY + (token ? '&pageToken=' + encodeURIComponent(token) : ''), { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error(path + ' ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 200));
    return JSON.parse(res.getContentText() || '{}');
  };
  const s = get('settings/main');
  const settings = s.fields ? val_({ mapValue: { fields: s.fields } }) : {};
  const records = {};
  let token = '';
  do { const r = get('records', token); (r.documents || []).forEach(function (d) { records[d.name.split('/').pop()] = d.fields ? val_({ mapValue: { fields: d.fields } }) : {}; }); token = r.nextPageToken; } while (token);
  const day = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
  const name = 'luka-backup-' + day + '.json';
  const folder = folder_();
  const old = folder.getFilesByName(name); while (old.hasNext()) old.next().setTrashed(true);
  folder.createFile(name, JSON.stringify({ at: new Date().toISOString(), project: 'luka-piglets', data: { settings: { main: settings }, records: records } }), 'application/json');
  console.log('루카 백업 완료: ' + name + ' · records ' + Object.keys(records).length + ', 후기자돈현황 ' + (settings.lukaStatusRows || []).length + '줄');
}

function folder_() {
  const it = DriveApp.getFoldersByName(FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER);
}

function call_(method, url, body) {
  const res = UrlFetchApp.fetch(url, { method: method, contentType: 'application/json', payload: body ? JSON.stringify(body) : undefined, headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error(res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText() || '{}');
}

// parent: '' = 최상위, 'share/열쇠' = 하위 컬렉션
function listCollections_(parent) {
  const url = BASE + (parent ? '/' + parent : '') + ':listCollectionIds';
  let ids = [], token = '';
  do { const r = call_('post', url, { pageSize: 100, pageToken: token || undefined }); ids = ids.concat(r.collectionIds || []); token = r.nextPageToken; } while (token);
  return ids;
}

function dumpCollection_(path) {
  const docs = {};
  let token = '';
  do {
    const r = call_('get', BASE + '/' + path + '?pageSize=300&showMissing=true' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    (r.documents || []).forEach(function (d) {
      const id = d.name.split('/').pop(), rel = path + '/' + id;
      const v = d.fields ? val_({ mapValue: { fields: d.fields } }) : {};
      // 하위 컬렉션은 농장 공유 화면(share/열쇠/deaths)에만 있음 — 다른 곳까지 뒤지면 6분 제한에 걸림
      const subs = path === 'share' ? listCollections_(rel) : [];
      if (subs.length) { v.__sub = {}; subs.forEach(function (s) { v.__sub[s] = dumpCollection_(rel + '/' + s); }); }
      docs[id] = v;
    });
    token = r.nextPageToken;
  } while (token);
  return docs;
}

function val_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('referenceValue' in v) return v.referenceValue;
  if ('geoPointValue' in v) return v.geoPointValue;
  if ('bytesValue' in v) return v.bytesValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(val_);
  if ('mapValue' in v) { const o = {}; const f = v.mapValue.fields || {}; Object.keys(f).forEach(function (k) { o[k] = val_(f[k]); }); return o; }
  return null;
}
