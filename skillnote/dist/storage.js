import {extractSkills} from "./catalog.js?v=18";

export const databaseName = document.documentElement.hasAttribute("data-presentation-demo") ? "skillnote-presentation" : "skillnote-journal";

const samples = [
  ["survey", "2026-11-17", "통계 수업에서 Python으로 학식 만족도 설문 86건의 결측치를 정리했다. 메뉴별 평균 점수를 계산해 팀 발표 자료에 넣었다."],
  ["club", "2026-11-14", "개발 동아리에서 React로 축제 부스 검색 화면을 만들었다. Git 브랜치에 변경 사항을 올리고 팀원 리뷰를 반영했다."],
  ["library", "2026-11-11", "교내 데이터톤에서 도서관 방문자 수를 시간대별 막대그래프로 시각화했다. 점심시간에 빈 좌석이 많은 층을 찾아 발표했다."]
];

let connection;
function database() {
  if (!connection) connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 3);
    request.onupgradeneeded = event => {
      const store = event.oldVersion === 0
        ? request.result.createObjectStore("activities", {keyPath:"id"})
        : request.transaction.objectStore("activities");
      if (event.oldVersion < 2) {
        for (const [key, date, text] of samples) {
          store.add({id:"sample-" + key, created:Date.parse(date + "T12:00:00+09:00"), text,
            matches:extractSkills(text), project:key === "club", revision:1, sample:true});
        }
      } else if (event.oldVersion === 2) {
        const club = store.get("sample-club");
        club.onsuccess = () => {
          const activity = club.result;
          if (activity?.sample && activity.revision === 1 && activity.text === samples[1][2]) {
            store.put({...activity, project:true});
          }
        };
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
  });
  return connection;
}
export async function readActivities() {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction("activities").objectStore("activities").getAll();
    request.onsuccess = () => resolve(request.result.sort((a,b) => b.created - a.created));
    request.onerror = () => reject(request.error);
  });
}
export async function writeActivity(id, previousRevision, next) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("activities", "readwrite");
    const store = tx.objectStore("activities");
    const read = store.get(id);
    let conflict = false;
    read.onsuccess = () => {
      if ((read.result?.revision ?? 0) !== previousRevision) {
        conflict = true;
        tx.abort();
      } else if (next) {
        store.put({...next, revision:previousRevision + 1});
      } else {
        store.delete(id);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(new Error(conflict ? "다른 창에서 이 기록이 바뀌었어요. 최신 기록을 다시 열어 주세요." : "기기에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요."));
  });
}

export async function resetActivities() {
  const pending = connection;
  if (pending) {
    const db = await pending.catch(() => null);
    db?.close();
    if (connection === pending) connection = undefined;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
