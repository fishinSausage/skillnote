import {activitySentence, appliedClauses, aspectsFor, completedClauses, directClauses, extractProject, extractSkills, jobs, resourcesForCriterion, skills} from "./catalog.js?v=18";
import {icon} from "./icons.js";
import {databaseName, readActivities, resetActivities, writeActivity} from "./storage.js?v=18";
import {proposeSync, snapshot} from "./eclass.js?v=18";

const main = document.querySelector("main");
const dialog = document.querySelector("dialog");
const dayFormat = new Intl.DateTimeFormat("ko-KR", {month:"long", day:"numeric"});
const yearFormat = new Intl.DateTimeFormat("ko-KR", {year:"numeric", month:"long", day:"numeric"});
// Synced activities can be years old, so dates outside this year show the year.
const shortDate = {format:time => (new Date(time).getFullYear() === new Date().getFullYear() ? dayFormat : yearFormat).format(time)};
const syncKinds = {syllabus:"수업계획서", submission:"과제 제출물"};
// The two entry types (see SPEC.md): skills come from 수업계획서, projects from 과제 제출물.
const syncTypes = {syllabus:"스킬", submission:"프로젝트"};
const guideKinds = [["도서","book"],["강의","play"],["세미나","mic"]];
const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// `found` is the project the model saw in the text (or null); `project` is whether the user keeps it.
const blank = () => ({text:"", project:false, found:null, suggestions:null, manual:[], selected:new Set(), original:null, returnTo:"", practice:null});
let draft = blank();
let activities = [];
let loaded = false;
let loadError = false;
let saving = false;
let jobFilter = "전체";
let jobQuery = "";
let modalAction;
let messageTimer;
let loadSequence = 0;
let evidence = new Map();
let criterionEvidence = new Map();
let sync = null;
let syncRun = 0;
let listProjects = false;
// Synced matches carry the sub-skills the model named; hand-written ones fall back to the catalog rules.
const matchAspects = (activity,item) => item.aspects ?? aspectsFor(item.id, activity.written ? appliedClauses(activity.text + "\n" + (item.manual ? item.excerpt : "")).join("\n") : activity.text);
const aspectChips = names => names.length ? `<div class="aspects">${names.map(name => `<span class="aspect">${escape(name)}</span>`).join("")}</div>` : "";
const demo = databaseName === "skillnote-presentation";
const prefix = demo ? "skillnote-demo-" : "skillnote-";
const goalsKey = prefix + "goals";
const favoritesKey = prefix + "favorite-jobs";
const portfolioKey = prefix + "portfolio";
function readSetting(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeSetting(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { notice("변경 사항을 저장하지 못했어요."); return false; }
}
let goals = readSetting(goalsKey,{});
let favorites = new Set(readSetting(favoritesKey,[]));
let portfolios = readSetting(portfolioKey,[]);
let resetting = false;
let savedEvidence = new Set();
let lastSaved = null;
let saveReturnHash = "";
const fields = ["데이터","프론트엔드","백엔드"];
const targetJob = () => jobs.find(job => job.id === goals.job);
const eligibilityKey = (job, group) => job.id === "redblue-375632" && group.id === "career"
  ? prefix + "redblue-career" : prefix + "eligibility:" + job.id + ":" + group.id;
function selectedEligibility(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function route() {
  const [panel, jobId, skillId, origin] = location.hash.slice(1).split("/");
  const job = panel === "jobs" && jobs.find(item => item.id === jobId);
  const criterion = job && job.requirements.find(([id,,,,,mode]) => id === skillId && mode !== "eligibility");
  return {panel:["jobs","portfolio"].includes(panel) ? panel : "journal", job, criterion, fromRoadmap:origin === "roadmap"};
}
function syncIndex() {
  evidence = new Map();
  for (const activity of activities) {
    if (activity.off) continue;
    for (const item of activity.matches) {
      if (!evidence.has(item.id)) evidence.set(item.id, []);
      evidence.get(item.id).push({activity, item});
    }
  }
  const completed = new Map(activities.map(activity => [activity, (activity.written ? appliedClauses(activity.text) : completedClauses(activity.text)).join("\n")]));
  criterionEvidence = new Map(jobs.flatMap(job => job.requirements).map(criterion => {
    const [id,,patterns,,,mode,skill = id,aspect] = criterion;
    if (mode === "eligibility") return [criterion, []];
    const matches = (evidence.get(skill) || []).filter(({activity,item}) =>
      (mode !== "project" || activity.project === true)
      && skills[skill].pattern.test(item.trigger)
      && (!item.manual || appliedClauses(item.excerpt).some(part => skills[skill].pattern.test(part)))
      && (!aspect || matchAspects(activity,item).includes(aspect))
      && patterns.every(pattern => pattern.test(completed.get(activity) + (item.manual ? "\n" + appliedClauses(item.excerpt).join("\n") : ""))));
    return [criterion, matches];
  }));
}
// When the app runs inside presentation.html, tell the deck which button was pressed so it can
// light up the matching part of its diagram. Outside the deck this does nothing.
function tellDeck(event) {
  if (window.parent !== window) window.parent.postMessage({source:"skillnote", event}, "*");
}
function notice(message) {
  const box = document.querySelector("#message");
  clearTimeout(messageTimer);
  box.textContent = message;
  box.classList.add("visible");
  messageTimer = setTimeout(() => box.classList.remove("visible"), 3700);
}
function openDialog(title, body, action) {
  modalAction = action;
  dialog.innerHTML = `<div class="section-title"><h2 id="dialog-title">${escape(title)}</h2><button class="icon-button" data-action="close" aria-label="닫기">${icon("close")}</button></div>${body}`;
  if (!dialog.open) dialog.showModal();
}
function dialogActions(label, danger=false) {
  return `<div class="dialog-actions"><button class="subtle" data-action="close">취소</button><button class="${danger ? "danger" : "primary"}" data-action="confirm">${label}</button></div>`;
}
function nav(panel) {
  const tabs = [["journal","journal","활동 기록"],["jobs","work","채용 공고"],["portfolio","bag","포트폴리오"]];
  const links = tabs.map(([key,symbol,title]) => `<a href="#${key}" ${key === panel ? 'aria-current="page"' : ""}>${icon(symbol)}${title}</a>`).join("");
  document.querySelectorAll(".desktop-nav,.mobile-nav").forEach(el => { el.innerHTML = links; });
}
function heading(symbol, title, extra="", tag="h2") {
  return `<div class="section-title"><div class="hgroup"><span class="tile">${icon(symbol)}</span><${tag}>${title}</${tag}></div>${extra}</div>`;
}
const skillName = (id, item) => skills[id]?.name ?? item?.name ?? evidence.get(id)?.[0]?.item.name ?? id;
function chip(id, item) { return `<span class="chip">${escape(skillName(id,item))}</span>`; }
function writtenTags(text) {
  const clauses = directClauses(text).join(" ");
  return [
    ["경험 유형", ["학부연구생","공모전","인턴"].filter(term => clauses.includes(term))],
    ["결과물", ["논문","발표 자료","보고서","비교표"].filter(term => clauses.includes(term))]
  ].filter(([,values]) => values.length);
}
function review() {
  if (draft.suggestions === null) return "";
  const rows = [...draft.suggestions, ...draft.manual].map(item => `<label class="suggestion"><input type="checkbox" data-skill="${escape(item.id)}" ${draft.selected.has(item.id) ? "checked" : ""}><span><strong>${escape(skillName(item.id,item))}</strong><small>${item.manual ? "직접 추가한 근거" : "기록에서 찾은 표현"} · “${escape(item.manual ? item.excerpt : item.trigger)}”</small></span></label>`).join("");
  const project = draft.found ? `<h3 class="review-project">추출한 프로젝트 <span class="count">1</span></h3>
    <label class="suggestion"><input type="checkbox" data-draft-project ${draft.project ? "checked" : ""}><span><strong>${escape(draft.found.name)}</strong>${aspectChips(draft.found.tags.flatMap(([,values]) => values))}</span></label>` : "";
  const tags = writtenTags(draft.text).map(([label,values]) => `<p><b>${label}</b> · ${escape(values.join(", "))}</p>`).join("");
  return `<section class="review" id="review" aria-labelledby="review-title"><h3 id="review-title" tabindex="-1">추출한 스킬 <span class="count">${draft.suggestions.length}</span></h3>
    <p>직접 경험한 스킬을 선택하고 저장하면 공고 비교에 반영돼요.</p>
    ${rows}<button class="subtle" data-action="manual-skill">스킬 직접 추가</button>${project}${tags}<div class="action-end"><button class="primary" data-action="save" ${saving || !loaded ? "disabled" : ""}>${icon("check")}${draft.original ? "수정 저장" : "활동 저장"}</button></div></section>`;
}
function composer() {
  const sentenceButton = `<button class="load-sentence" data-action="load-sentence">${icon("bulb")}${draft.practice ? "완료 예시 불러오기" : "문장 불러오기"}</button>`;
  return `<section class="card compose" id="composer">${heading("pen",draft.original ? "활동 수정" : "새 활동 작성",sentenceButton,"h1")}
    <label for="activity">수업이나 수업 밖에서 어떤 활동을 했나요?</label>
    <div class="textarea-wrap"><textarea id="activity" maxlength="2000" placeholder="사용한 도구와 직접 한 일을 적어 보세요.">${escape(draft.text)}</textarea><span class="counter"><b id="length">${draft.text.length}</b> / 2,000</span></div>

    <div class="compose-actions"><div class="actions">${draft.original || draft.returnTo ? '<button class="subtle" data-action="cancel-edit">취소</button>' : ""}
    <button class="primary" data-action="extract" ${draft.suggestions !== null ? "hidden" : ""}>${icon("spark")}스킬 추출</button></div></div>
    <div id="review-slot">${review()}</div></section>`;
}
// A project shows as its name; pressing it opens the tags attached to it.
function projectBody(a) {
  const cut = a.source ? a.text.indexOf(": ") : -1;
  const name = a.title || (cut > 0 ? a.text.slice(0, cut) : a.text.split(/[.\n]/)[0]);
  const from = a.source || {};
  const subs = [...new Set(a.matches.flatMap(item => matchAspects(a,item)))];
  const rows = [
    ["스킬", a.matches.map(m => chip(m.id,m)).join("")],
    ["세부 역량", subs.map(sub => `<span class="aspect">${escape(sub)}</span>`).join("")],
    // Details the model pulled out of a written record: [label, [values]].
    ...(a.tags || []).map(([label,values]) => [label, values.map(value => `<span class="aspect">${escape(value)}</span>`).join("")]),
    ["목적", from.purpose ? escape(from.purpose) : ""],
    ["형태", [from.team ? "팀 프로젝트" : "", from.count > 1 ? from.count + "회 제출" : ""].filter(Boolean).join(" · ")],
    ["출처", from.course ? escape([from.course, from.term, from.origin].filter(Boolean).join(" · ")) : ""]
  ].filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  return `<details class="project-card"><summary><strong>${escape(name)}</strong>${icon("chev")}</summary><p>${escape(cut > 0 ? a.text.slice(cut + 2) : a.text)}</p><dl>${rows}</dl></details>`;
}
function activityList(projects) {
  return activities.filter(a => !projects || a.project).map(a => `<article class="entry ${a.off ? "off" : ""}"><div class="entry-meta">${icon("calendar")}${shortDate.format(a.created)}${a.project ? " · 프로젝트" : ""}${a.source ? " · eclass " + syncKinds[a.source.type] : ""}<div class="entry-tools"><button data-action="edit" data-id="${escape(a.id)}">수정</button><label class="entry-use"><input type="checkbox" data-activity-use="${escape(a.id)}" ${a.off ? "" : "checked"}>반영</label></div></div>
    ${a.project ? projectBody(a) : `<p>${escape(a.text)}</p>${a.matches.length ? `<div class="chips">${a.matches.map(m=>chip(m.id,m)).join("")}</div>` : ""}${(a.tags || []).map(([label,values])=>`<p><b>${escape(label)}</b> · ${escape(values.join(", "))}</p>`).join("")}`}</article>`).join("");
}
function openActivities(projects = listProjects, keep = false) {
  listProjects = projects;
  const shown = activities.filter(a => !projects || a.project);
  const top = keep ? dialog.scrollTop : 0;
  const anyOn = shown.some(a => !a.off);
  openDialog(projects ? "프로젝트" : "전체 기록", shown.length
    ? `<div class="list-tools"><span>체크를 풀면 스킬 보드와 공고 확인에서 빠져요.</span><button class="text-button" data-action="use-all" data-use="${anyOn ? "off" : "on"}">${anyOn ? "모두 해제" : "모두 선택"}</button></div>${activityList(projects)}`
    : `<p>${projects ? "프로젝트로 표시한 활동이 없어요." : "저장한 기록이 없어요."}</p>`);
  dialog.scrollTop = top;
}
async function setUse(targets, off) {
  if (saving || !targets.length) return;
  saving = true;
  let failure = "";
  for (const activity of targets) {
    try { await writeActivity(activity.id, activity.revision, {...activity, off}); }
    catch(error) { failure = error.message; }
  }
  saving = false;
  await refresh(false);
  render();
  openActivities(listProjects, true);
  if (failure) notice(failure);
}
function board() {
  const chips = [...evidence.keys()].map(id => `<button class="chip" data-action="evidence" data-skill="${escape(id)}" aria-haspopup="dialog">${escape(skillName(id))}</button>`).join("");
  if (!loaded) return `<section class="card board">${heading("layers","나의 스킬 보드")}<p class="state-message">${loadError ? '활동을 불러오지 못했어요. <button class="text-button" data-action="retry">다시 시도</button>' : "활동을 불러오는 중이에요."}</p></section>`;
  return `<section class="card board">${heading("layers","나의 스킬 보드")}
    <div class="stats"><button data-action="skills" aria-haspopup="dialog"><span>보유 스킬 ${icon("chev")}</span><strong>${evidence.size}<small>개</small></strong></button><button data-action="projects" aria-haspopup="dialog"><span>프로젝트 ${icon("chev")}</span><strong>${activities.filter(a => a.project && !a.off).length}<small>개</small></strong></button></div>
    ${chips ? `<div class="chips">${chips}</div>` : '<p class="board-note">기록에서 찾은 스킬이 여기에 모여요.</p>'}
    <button class="text-button board-all" data-action="activities" aria-haspopup="dialog">전체 기록 보기</button></section>`;
}
function syncCard() {
  const synced = activities.filter(a => a.source?.from === "eclass").length;
  return `<section class="card sync-card">${heading("sync","eclass 동기화")}
    <p>수업계획서의 주차별 학습과 과제 제출물에서 스킬과 프로젝트를 찾아 한 번에 추가해요.</p>
    <button class="primary" data-action="sync-open" aria-haspopup="dialog" ${loaded ? "" : "disabled"}>${icon("sync")}eclass에서 가져오기</button>
    <small>프로토타입 · ${snapshot.takenAt.replaceAll("-",".")} 스냅샷 · 과목 ${snapshot.courses.length}개${synced ? " · 가져온 항목 " + synced + "개" : ""}</small></section>`;
}
function syncTotals() {
  const chosen = sync.items.filter(item => item.include);
  return {chosen, skills:new Set(chosen.flatMap(item => [...item.selected])), projects:chosen.filter(item => item.project).length};
}
function syncFootText() {
  const {skills,projects} = syncTotals();
  return `스킬 <b>${skills.size}</b>종 · 프로젝트 <b>${projects}</b>개`;
}
function syncItem(item, index) {
  const meta = [syncKinds[item.type], item.origin ? escape(item.origin) : "", item.type === "syllabus" ? item.count + "주" : shortDate.format(item.created), item.type === "submission" && item.count > 1 ? item.count + "회 제출" : ""].filter(Boolean).join(" · ");
  const fresh = id => skills[id].learned ? '<i class="new-skill">새 스킬</i>' : "";
  // A skill entry lists each skill with its own checkbox; a project entry is one unit and only names the skills it used.
  const body = item.type === "syllabus"
    ? item.matches.map(match => `<label class="sync-skill"><input type="checkbox" data-sync-skill="${index}" value="${match.id}" ${item.selected.has(match.id) ? "checked" : ""}>
    <span><strong>${skills[match.id].name}${fresh(match.id)}</strong><small>${escape(match.excerpt)}</small>${match.aspects.length ? `<small>세부 역량 · ${match.aspects.map(escape).join(", ")}</small>` : ""}</span></label>`).join("")
    : `<p>${escape(item.text.slice(item.title.length + 2))}</p>${item.matches.length ? `<div class="chips"><small>사용 스킬</small>${item.matches.map(match => `<span class="chip">${skills[match.id].name}${fresh(match.id)}</span>`).join("")}</div>` : ""}`;
  return `<article class="sync-item"><label class="sync-head"><input type="checkbox" data-sync-item="${index}" ${item.include ? "checked" : ""}>
    <span><strong><i class="sync-type ${item.type}">${syncTypes[item.type]}</i>${escape(item.title)}</strong><small>${meta}</small></span></label>
    <fieldset ${item.include ? "" : "disabled"}>${body}</fieldset></article>`;
}
function syncReview(result) {
  sync = result;
  const skipped = [result.empty ? "스킬이나 프로젝트가 아닌 항목 " + result.empty + "개" : "", result.known ? "이미 가져온 항목 " + result.known + "개" : ""].filter(Boolean).join(", ");
  if (!result.items.length) {
    openDialog("eclass 동기화",`<p>새로 가져올 항목이 없어요.${skipped ? " " + skipped + "는 제외했어요." : ""}</p>`);
    return;
  }
  const courses = [...new Set(result.items.map(item => item.course))].map(name => {
    const entries = result.items.map((item,index) => [item,index]).filter(([item]) => item.course === name);
    return `<section class="sync-course"><h3>${escape(name)}<span>${entries[0][0].term}</span></h3>${entries.map(([item,index]) => syncItem(item,index)).join("")}</section>`;
  }).join("");
  openDialog("가져올 항목 확인",`<div class="sync"><div class="sync-body">
    <div class="sync-intro"><p>수업계획서에서 찾은 <b>스킬</b>과 과제 제출물에서 찾은 <b>프로젝트</b>예요. 맞지 않는 항목은 체크를 풀어 주세요.</p>
      <label class="sync-all"><input type="checkbox" data-sync-all checked>전체 선택</label></div>
    ${courses}${skipped ? `<p class="sync-skipped">${skipped}는 제외했어요.</p>` : ""}</div>
    <div class="sync-foot"><span id="sync-count">${syncFootText()}</span><div class="actions"><button class="subtle" data-action="close">취소</button><button class="primary" data-action="sync-apply">${icon("check")}선택한 항목 추가</button></div></div></div>`);
  dialog.querySelector(".sync-body").scrollTop = 0;
}
function syncRefresh() {
  const {chosen} = syncTotals();
  const all = dialog.querySelector("[data-sync-all]");
  all.checked = chosen.length === sync.items.length;
  all.indeterminate = chosen.length > 0 && !all.checked;
  dialog.querySelector("#sync-count").innerHTML = syncFootText();
  dialog.querySelector('[data-action="sync-apply"]').disabled = !chosen.length;
}
function openSync() {
  const run = ++syncRun;
  const steps = ["eclass에 연결하는 중","수업계획서와 과제 제출물을 불러오는 중","LLM이 스킬과 프로젝트를 추출하는 중"];
  openDialog("eclass 동기화",`<ol class="sync-steps">${steps.map((step,index) => `<li class="${index ? "" : "now"}">${step}</li>`).join("")}</ol>`);
  const result = proposeSync(new Set(activities.map(a => a.id)));
  // The pauses stand in for the network and model calls a real connection would make.
  steps.forEach((_, index) => setTimeout(async () => {
    if (run !== syncRun || !dialog.open) return;
    const items = dialog.querySelectorAll(".sync-steps li");
    if (index + 1 < steps.length) {
      items[index].className = "done";
      items[index + 1].className = "now";
    } else {
      try { syncReview(await result); }
      catch { dialog.close(); notice("eclass 항목을 불러오지 못했어요."); }
    }
  }, 550 * (index + 1)));
}
async function applySync() {
  if (saving || !sync) return;
  saving = true;
  const {chosen,skills:added,projects} = syncTotals();
  let failure = "";
  for (const item of chosen) {
    try {
      await writeActivity(item.id, 0, {id:item.id, created:item.created, text:item.text, project:item.project,
        matches:item.matches.filter(match => item.selected.has(match.id)).map(({id,trigger,excerpt,aspects}) => aspects.length ? {id,trigger,excerpt,aspects} : {id,trigger,excerpt}),
        source:{from:"eclass", type:item.type, course:item.course, term:item.term,
          ...(item.type === "submission" ? {origin:item.origin, purpose:item.purpose, team:item.team, count:item.count} : {})}});
    } catch(error) { failure = error.message; }
  }
  saving = false;
  dialog.close();
  await refresh(false);
  render();
  notice(failure || `eclass에서 스킬 ${added.size}종과 프로젝트 ${projects}개를 추가했어요.`);
}
function logo(job) { return `<span aria-hidden="true" class="company-mark ${job.color}">${job.mark}</span>`; }
function journal() {
  const target = targetJob();
  return `<div class="dashboard"><div>${target ? `<div class="saved-goal"><a class="subtle" href="#jobs/${target.id}/roadmap">목표 공고 · ${escape(target.company)} 로드맵</a></div>` : ""}${composer()}</div><div class="side">${board()}${syncCard()}</div></div>`;
}
const hasCriterionEvidence = (job,group,criterion) => criterion[5] === "eligibility"
  ? criterion[0] === selectedEligibility(eligibilityKey(job,group)) : Boolean(criterionEvidence.get(criterion)?.length);
const skillGroups = job => job.groups.filter(group => group.options[0][5] !== "eligibility");
function roadmapGroups(job) {
  // Keep the original requirements and matching rules. This order is only for learning.
  const remaining = new Map(skillGroups(job).map(group => [group.id,group]));
  const ordered = [];
  for (const [id,...skills] of job.roadmap) {
    const group = remaining.get(id);
    if (!group) continue;
    const options = new Map(group.options.map(row => [row[0],row]));
    const first = [];
    for (const skill of skills) {
      if (options.has(skill)) first.push(options.get(skill));
      options.delete(skill);
    }
    ordered.push({...group,options:[...first,...options.values()]});
    remaining.delete(id);
  }
  return [...ordered,...remaining.values()];
}
function groupMet(job, group) {
  const met = criterion => hasCriterionEvidence(job,group,criterion);
  return group.operator === "xor" ? group.options.some(met) : group.options.every(met);
}
const requirementStatus = job => job.groups.map(group => groupMet(job,group));
const progress = job => `<div class="match-meter" aria-hidden="true">${requirementStatus(job).map(done => `<i class="${done ? "on" : ""}"></i>`).join("")}</div>`;
const matchText = job => {
  const status = requirementStatus(job);
  return `자격요건 ${status.length}개 중 <b>${status.filter(Boolean).length}개 확인</b>`;
};
const spreadsheetPractice = {
  task:"Excel에서 학식 설문 파일을 합치고 결측치와 중복 행을 정리한 뒤, Google Sheets에서 메뉴별 만족도를 집계해 보세요.",
  output:"정리한 설문 파일과 메뉴별 만족도 비교표",
  example:"통계 수업 팀 프로젝트에서 Excel로 학식 설문 파일을 합치고 결측치와 중복 행을 정리했다. Google Sheets로 메뉴별 만족도를 집계하고 비교표를 만들었다."
};
function practiceFor(job, row) {
  if (job.id === "beautyselection-396487" && ["excel","sheets","clean"].includes(row[0])) return spreadsheetPractice;
  return {task:row[3], output:"실습 결과물과 본인이 작업한 과정이 담긴 기록"};
}
function nextRequirement(job, groups) {
  for (const group of groups) {
    if (groupMet(job,group)) continue;
    const next = group.options.find(row => row[3] && !hasCriterionEvidence(job,group,row));
    if (next) return next;
  }
  return null;
}
const requirementName = row => [row[1],row[7]].filter(Boolean).join(" · ");
function roadmap(job) {
  const path = roadmapGroups(job);
  const next = nextRequirement(job,path);
  const practice = next ? practiceFor(job,next) : null;
  const groups = path.map(group => {
    const complete = groupMet(job,group);
    const count = group.options.filter(row => hasCriterionEvidence(job,group,row)).length;
    return `<li class="roadmap-group"><h3>${escape(group.title || group.options[0][1])}
      <small>${group.operator === "xor" ? (complete ? "택 1 확인" : "하나만 필요") : `${count}/${group.options.length} 확인`}</small></h3>
      <div class="roadmap-nodes">${group.options.map(row => {
        const met = hasCriterionEvidence(job,group,row);
        const state = met ? "met" : row === next ? "next" : complete ? "alternative" : "missing";
        const status = {met:"기록으로 확인됨",next:"다음 추천",alternative:"선택 대안",missing:"아직 근거 없음"}[state];
        return `<a class="roadmap-node ${state}${met && savedEvidence.has(row) ? " newly-met" : ""}" href="#jobs/${job.id}/${row[0]}/roadmap" aria-label="${escape(requirementName(row))}, ${status}"><span class="roadmap-dot" aria-hidden="true">${met ? "✓" : ""}</span>${escape(requirementName(row))}</a>`;
      }).join("")}</div></li>`;
  }).join("");
  return `<section class="card roadmap" id="roadmap" tabindex="-1">${heading("target","이 공고 준비 로드맵")}
    ${loaded ? `${next ? `<a class="next-practice" href="#jobs/${job.id}/${next[0]}/roadmap"><b>다음 추천 · ${escape(requirementName(next))}</b><span>${escape(practice.task)}</span>
    <span class="practice-output"><strong>남길 결과물</strong> ${escape(practice.output)}</span></a>` : "<p>이 공고의 역량 묶음이 모두 확인됐어요.</p>"}
    <p class="roadmap-legend">✓ 확인됨 · 진한 테두리: 다음 추천 · 점선: 선택 대안</p><ul>${groups}</ul>` : "<p>활동 기록을 확인하는 중이에요.</p>"}</section>`;
}
const deadlineText = job => job.closed ? "공고 마감" : job.deadline ? "마감 " + job.deadline.replaceAll("-", ".") : "상시채용";
const normalizeJobSearch = value => value.normalize("NFKC").toLowerCase().replace(/\s+/g,"");
function filteredJobs() {
  const query = normalizeJobSearch(jobQuery);
  return jobs.filter(job => {
    const inFilter = jobFilter === "관심공고" ? favorites.has(job.id) : jobFilter === "전체" || job.field === jobFilter;
    return inFilter && normalizeJobSearch(job.company + job.role).includes(query);
  });
}
function jobCards(filtered) {
  if (!filtered.length) return '<p class="card job-empty">검색 조건에 맞는 공고가 없어요.</p>';
  return filtered.map(j=>`<article class="card job" data-job-id="${j.id}">
    <button type="button" class="job-favorite" data-action="favorite-job" data-id="${j.id}" aria-pressed="${favorites.has(j.id)}" aria-label="${escape(j.company)} 관심공고"><span aria-hidden="true">${icon("star")}</span></button>
    <a class="job-link" href="#jobs/${j.id}"><div class="job-top">${logo(j)}<span class="job-company">${j.company}</span><span class="job-date">${deadlineText(j)}</span></div><h2>${j.role}</h2>
    <div class="job-meta">${j.type}<span>·</span>${j.place}</div><div class="chips">${j.tags.map(chip).join("")}</div>
    <div class="job-match"><span>${matchText(j)}</span>${progress(j)}</div></a></article>`).join("");
}
function jobList() {
  if (jobFilter === "관심공고" && !favorites.size) jobFilter = "전체";
  const filtered = filteredJobs();
  return `<section class="job-feed"><div class="feed-heading"><h1>채용 공고 <span class="count" id="job-count" role="status" aria-label="공고 ${filtered.length}개">${filtered.length}</span></h1><span class="muted inline">${icon("list")}마감일순</span></div>
    <div class="job-toolbar"><div class="job-search" role="search">${icon("search")}<input type="search" id="job-search" aria-label="공고명 또는 회사명 검색" placeholder="공고명 또는 회사명 검색" maxlength="100" value="${escape(jobQuery)}">
    <button type="button" class="job-search-clear" id="job-search-clear" data-action="clear-job-search" aria-label="검색어 지우기" ${jobQuery ? "" : "hidden"}>${icon("close")}</button></div>
    <div class="filters" aria-label="공고 필터">${["전체","관심공고",...fields].map(f=>`<button data-action="filter" data-filter="${f}" aria-pressed="${f === jobFilter}" ${f === "관심공고" && !favorites.size ? "disabled" : ""}>${f}</button>`).join("")}</div>
    </div><div class="job-grid" id="job-results">${jobCards(filtered)}</div></section>`;
}
function updateJobSearch(input) {
  jobQuery = input.value;
  const filtered = filteredJobs();
  const count = document.getElementById("job-count");
  count.textContent = filtered.length;
  count.setAttribute("aria-label", `공고 ${filtered.length}개`);
  document.getElementById("job-results").innerHTML = jobCards(filtered);
  document.getElementById("job-search-clear").hidden = !jobQuery;
}
function backLink(href, label) { return `<a class="back" href="#${href}">${icon("back")}${label}</a>`; }
function requirementRow(job,group,row) {
  const [id,title,,,,mode] = row;
  const matched = hasCriterionEvidence(job,group,row);
  if (mode === "eligibility") {
    return `<label class="skill-row career-option"><input type="checkbox" data-eligibility="${eligibilityKey(job,group)}" data-option="${id}" ${matched ? "checked" : ""}><strong>${title}</strong></label>`;
  }
  const count = criterionEvidence.get(row)?.length || 0;
  const alternative = group.operator === "xor" && groupMet(job,group);
  const hint = matched ? `${mode === "project" ? "프로젝트" : "활동"} ${count}개에서 확인`
    : alternative ? "선택 대안 · 다른 항목으로 요건 확인" : mode === "project" ? "프로젝트 기록 없음 · 준비 방법 보기" : "활동 근거 없음 · 준비 방법 보기";
  return `<a href="#jobs/${job.id}/${id}" class="skill-row"><span class="check-indicator ${matched ? "matched" : ""}">${matched ? icon("check") : ""}</span>
    <span class="grow"><strong>${title}${row[7] ? `<span class="aspect">${row[7]}</span>` : ""}</strong><small>${hint}</small></span>${icon("chev")}</a>`;
}
function requirementGroup(job,group) {
  if (!group.operator) return requirementRow(job,group,group.options[0]);
  const rule = group.operator === "xor"
    ? (group.options.length === 2 ? "둘 중 하나" : "한 항목만 충족")
    : (group.options.length === 2 ? "두 항목 모두" : "모든 항목");
  return `<fieldset class="requirement-group">${group.title ? `<legend>${group.title} <span>${rule}</span></legend>` : ""}
    ${group.options.map(row => requirementRow(job,group,row)).join("")}</fieldset>`;
}
function jobDetail(job) {
  return `<div class="detail">${backLink("jobs","공고 목록")}<article class="card detail-intro"><div class="eyeline">${logo(job)}${job.company}</div>
    <h1>${job.role}</h1><div class="detail-meta"><span>${icon("pin")}${job.place}</span><span>${icon("work")}${job.type}</span><span>${icon("calendar")}${deadlineText(job)}</span></div><p>${job.description}</p>
    ${job.employment ? `<p><strong>근무 조건</strong> · ${job.employment}</p>` : ""}
    <div class="job-goal-actions"><button class="subtle" data-action="target-job" data-id="${job.id}" aria-pressed="${goals.job === job.id}">${goals.job === job.id ? "목표 공고로 설정됨" : "목표 공고 지정"}</button>
    <button class="primary" data-action="roadmap">준비 로드맵 보기</button></div></article>
    <section class="card checklist">${heading("target","자격요건")}
      <div class="match-head"><span>${matchText(job)}</span>${progress(job)}</div>
      ${job.groups.map(group => requirementGroup(job,group)).join("")}
    </section>
    ${job.interview ? `<section class="card interview">${heading("mic","면접 준비")}
      <ul>${job.interview.map(title => `<li><strong>${escape(title)}</strong></li>`).join("")}</ul>
    </section>` : ""}
    <a class="card original-posting" href="${escape(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">
      <span class="tile">${icon("external")}</span><span><strong>원본 공고 보기</strong><small>원티드</small></span>
    </a>${roadmap(job)}</div>`;
}
function evidenceRows(matches) {
  return matches.map(({activity,item}) => {
    const text = activity.text;
    const excerptStart = item ? text.indexOf(item.excerpt) : -1;
    const triggerOffset = item?.trigger ? item.excerpt.indexOf(item.trigger) : -1;
    let body = escape(text);
    if (excerptStart >= 0 && triggerOffset >= 0) {
      const start = excerptStart + triggerOffset;
      body = escape(text.slice(0, start)) + "<strong>" + escape(item.trigger) + "</strong>" + escape(text.slice(start + item.trigger.length));
    }
    const manual = item?.manual ? `<p><b>직접 추가한 근거</b> · ${escape(item.excerpt)}</p>` : "";
    return `<div class="evidence-row"><small>${shortDate.format(activity.created)}${activity.project ? " · 프로젝트" : ""}</small>${item ? aspectChips(matchAspects(activity,item)) : ""}<blockquote>${body}</blockquote>${manual}</div>`;
  }).join("");
}
function selectOwnedSkill(id) {
  const panel = dialog.querySelector("#owned-panel");
  const selected = document.getElementById(`owned-tab-${id}`);
  if (!selected || !evidence.has(id)) return;
  for (const tab of dialog.querySelectorAll('[role="tab"]')) {
    tab.setAttribute("aria-selected", String(tab === selected));
    tab.tabIndex = tab === selected ? 0 : -1;
  }
  panel.setAttribute("aria-labelledby", selected.id);
  const counts = new Map();
  for (const {activity,item} of evidence.get(id)) {
    for (const name of matchAspects(activity,item)) counts.set(name, (counts.get(name) || 0) + 1);
  }
  const spread = counts.size ? `<h4>세부 역량 <span class="count">${counts.size}</span></h4><div class="aspects">${[...counts].map(([name,total]) => `<span class="aspect">${escape(name)}${total > 1 ? ` <b>${total}</b>` : ""}</span>`).join("")}</div><h4>연결된 활동</h4>` : "";
  const linked = evidence.get(id);
  const learned = linked.filter(({activity}) => activity.source?.type === "syllabus").length;
  const projects = linked.filter(({activity}) => activity.project).length;
  panel.innerHTML = `<h3>${escape(skillName(id))}</h3><p class="owned-count">연결된 활동 ${linked.length}개 · 학습 기록 ${learned}개 · 프로젝트 근거 ${projects}개</p>${spread}${evidenceRows(linked)}`;
  panel.scrollTop = 0;
  selected.focus();
}
function openOwnedSkills(id) {
  if (!evidence.size) {
    openDialog("보유 스킬","<p>아직 보유 스킬이 없어요. 활동에서 추출한 스킬을 저장해 보세요.</p>");
    return;
  }
  const tabs = [...evidence].map(([key, matches]) => `<button type="button" role="tab" id="owned-tab-${escape(key)}" aria-controls="owned-panel" data-action="select-skill" data-skill="${escape(key)}"><strong>${escape(skillName(key))}</strong><small>활동 ${matches.length}개</small></button>`).join("");
  openDialog("보유 스킬",`<div class="skills-split"><div class="owned-tabs" role="tablist" aria-label="보유 스킬" aria-orientation="vertical">${tabs}</div><section id="owned-panel" role="tabpanel" tabindex="0"></section></div>`);
  selectOwnedSkill(evidence.has(id) ? id : evidence.keys().next().value);
}
function criterionDetail(job,criterion,fromRoadmap) {
  const matches = criterionEvidence.get(criterion) || [];
  const intro = `${backLink("jobs/"+job.id+(fromRoadmap ? "/roadmap" : ""),fromRoadmap ? "준비 로드맵" : job.role)}<div class="card skill-intro"><div class="eyeline"><span class="tile">${icon(matches.length ? "check" : "target")}</span>자격요건</div><h1>${escape(requirementName(criterion))}</h1></div>`;
  const guides = resourcesForCriterion(criterion);
  const resources = `<section class="card guide">${heading("book","관련 학습 자료")}
    ${guides.map(([name,url,note,kind],i)=>{
      const [label,symbol] = kind ? [kind,"book"] : (guideKinds[i] || ["문서","book"]);
      return `<article class="resource"><span class="resource-type">${icon(symbol)}${escape(label)}</span><a class="resource-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(name)}${icon("external")}</a><p>${escape(note)}</p></article>`;
    }).join("")}</section>`;
  if (matches.length) return `<div class="detail">${intro}<section class="card">${heading("journal","연결된 활동")}${evidenceRows(matches)}</section>${resources}</div>`;
  const practice = practiceFor(job,criterion);
  return `<div class="detail">${intro}<section class="card project">${heading("bag","포트폴리오에 남길 실습")}<p>${escape(practice.task)}</p><p><b>남길 결과물</b> · ${escape(practice.output)}</p><button class="primary" data-action="project">${icon("pen")}완료한 활동 기록하기</button></section>${resources}</div>`;
}
const recordTitle = a => a.title || a.text.split(/[.\n]/)[0].slice(0,75) || "활동 기록";
function portfolio() {
  const cards = portfolios.map(item => `<article class="card portfolio-card"><h2>${escape(item.title)}</h2>
    <dl>${[["내 역할",item.role],["수행 내용",item.work],["결과",item.result]].map(([label,value]) => `<div><dt>${label}</dt><dd>${escape(value || "작성 전")}</dd></div>`).join("")}
    <div><dt>자료 링크</dt><dd>${safeUrl(item.link) ? `<a class="text-button" href="${escape(safeUrl(item.link))}" target="_blank" rel="noopener noreferrer">자료 열기</a>` : "작성 전"}</dd></div></dl>
    <div class="chips">${[...new Map(activities.filter(a => item.sources.includes(a.id)).flatMap(a => a.matches).map(match => [match.id,match])).values()].map(match => chip(match.id,match)).join("")}</div>
    <div class="job-goal-actions"><button class="subtle" data-action="portfolio-sources" data-id="${item.id}">원본 기록 ${item.sources.length}개</button><button class="subtle" data-action="portfolio-edit" data-id="${item.id}">수정</button></div></article>`).join("");
  return `<div class="detail"><section class="card">${heading("bag","내 포트폴리오","","h1")}
    <p>활동과 eclass 프로젝트를 골라 취업 준비에 사용할 초안을 만들어요.</p>
    <button class="primary portfolio-create" data-action="portfolio-new" ${loaded && activities.length ? "" : "disabled"}>초안 만들기</button></section>
    ${cards || '<section class="card"><p>저장한 포트폴리오 초안이 없어요.</p></section>'}</div>`;
}
function safeUrl(url) {
  try { const parsed = new URL(url); return ["https:","http:"].includes(parsed.protocol) ? parsed.href : ""; }
  catch { return ""; }
}
function choosePortfolioSources() {
  openDialog("포트폴리오에 담을 기록", `<form class="entry-form" data-form="portfolio-select"><div class="portfolio-picker">
    ${activities.map(a => `<label class="suggestion"><input type="checkbox" name="source" value="${escape(a.id)}" ${a.id === lastSaved ? "checked" : ""}><span><strong>${escape(recordTitle(a))}</strong><small>${shortDate.format(a.created)}${a.source ? " · eclass" : ""}${a.sample ? " · 예시" : ""}</small></span></label>`).join("")}</div>
    <p class="form-error" role="alert"></p><button class="primary" type="submit">선택한 기록으로 초안 만들기</button></form>`);
}
function editPortfolio(item) {
  const field = (name,label) => `<label>${label}<textarea name="${name}" maxlength="4000">${escape(item[name] || "")}</textarea></label>`;
  openDialog("포트폴리오 초안", `<form class="entry-form" data-form="portfolio-save" data-id="${escape(item.id || "")}" data-sources="${escape(JSON.stringify(item.sources))}">
    <label>제목<input name="title" required maxlength="100" value="${escape(item.title)}"></label>
    ${item.role ? "" : "<p>활동에서 본인이 직접 맡은 일은 무엇인가요? 나중에 작성해도 돼요.</p>"}
    ${field("role","내 역할")}${field("work","수행 내용")}${field("result","결과")}
    <label>자료 링크<input name="link" type="url" maxlength="1000" value="${escape(item.link || "")}" placeholder="https://"></label>
    <p class="form-error" role="alert"></p><button class="primary" type="submit">초안 저장</button></form>`);
}
function render() {
  const {panel,job,criterion,fromRoadmap}=route();
  const title = criterion ? criterion[1] : job ? job.role : {jobs:"채용 공고",portfolio:"내 포트폴리오",journal:"활동 기록"}[panel];
  document.title = title + " · 스킬노트";
  nav(panel);
  main.innerHTML = criterion ? criterionDetail(job,criterion,fromRoadmap) : job ? jobDetail(job) : panel === "jobs" ? jobList() : panel === "portfolio" ? portfolio() : journal();
}
async function refresh(update=true) {
  const sequence = ++loadSequence;
  try {
    const result = await readActivities();
    if (sequence !== loadSequence) return;
    activities = result;
    loaded = true;
    loadError = false;
    syncIndex();
  } catch {
    loaded = false;
    loadError = true;
    notice("활동 기록을 불러오지 못했어요.");
  }
  if (update) render();
}
function editFocus() {
  const input = document.querySelector("#activity");
  input?.focus();
  input?.scrollIntoView({block:"center",behavior:"instant"});
}
function useDraft(next) {
  draft=next;
  if (route().panel !== "journal") location.hash="journal";
  else {render(); editFocus();}
}
function discardThen(run) {
  if (!draft.text.trim() || (draft.original && draft.text === draft.original.text && draft.suggestions === null)) { run(); return; }
  openDialog("작성 중인 내용 바꾸기",`<p>저장하지 않은 내용을 바꾸고 계속할까요?</p>${dialogActions("계속하기")}`,run);
}
function clearReview() {
  draft.suggestions=null;
  draft.selected.clear();
  document.querySelector("#review-slot").replaceChildren();
  document.querySelector('[data-action="extract"]').hidden=false;
}
async function persist(remove=null) {
  if (saving || !loaded) return;
  saving=true;
  const before=remove || draft.original;
  const returnTo=draft.returnTo;
  const previous = new Set([...criterionEvidence].filter(([,matches]) => matches.length).map(([row]) => row));
  try {
    const id=before?.id || newId();
    const tags = [...(draft.project ? draft.found.tags : []), ...writtenTags(draft.text)];
    const next=remove ? null : {...before,id,created:before?.created ?? Date.now(), text:draft.text.trim(), project:draft.project, title:draft.project ? draft.found.name : undefined, tags,
      written:!before?.source, matches:[...draft.suggestions,...draft.manual].filter(m=>draft.selected.has(m.id))};
    await writeActivity(id,before?.revision ?? 0,next);
    if (!remove || draft.original?.id === id) draft=blank();
    await refresh(false);
    savedEvidence = new Set([...criterionEvidence].filter(([row,matches]) => matches.length && !previous.has(row)).map(([row]) => row));
    lastSaved = remove ? null : id;
    if (!remove && returnTo) {
      saveReturnHash = "#" + returnTo;
      location.hash=returnTo;
    }
    else render();
    if (!remove) tellDeck("save");
    notice(remove ? "활동을 삭제했어요." : "활동을 저장했어요.");
  } catch(error) {
    await refresh(false);
    render();
    notice(error.message);
  } finally {saving=false; const btn=document.querySelector('[data-action="save"]'); if(btn) btn.disabled=!loaded;}
}
const newId = () => globalThis.crypto?.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,"0")).join("");

function openManualSkill() {
  openDialog("스킬 직접 추가", `<form class="entry-form" data-form="manual-skill">
    <label>기술명<input name="skill" required maxlength="50" placeholder="예: 문헌 검색"></label>
    <label>근거 문장<textarea name="proof" required maxlength="500" placeholder="직접 사용한 도구와 한 일을 적어 보세요."></textarea></label>
    <p class="form-error" role="alert"></p><button type="submit" class="primary">스킬 추가</button></form>`);
}
document.addEventListener("submit", event => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const values = new FormData(form);
  const value = name => String(values.get(name) ?? "").trim();
  const error = message => { form.querySelector(".form-error").textContent = message; };
  if (form.dataset.form === "manual-skill") {
    const name = value("skill");
    const excerpt = value("proof");
    if (!name || !excerpt) return error("기술명과 근거 문장을 입력해 주세요.");
    const normalized = name.toLowerCase().replace(/\s+/g," ");
    const known = Object.keys(skills).find(id => id === normalized || skills[id].name.toLowerCase() === normalized);
    const id = known || "manual:" + normalized;
    if (draft.suggestions.some(item => item.id === id)) {
      draft.selected.add(id);
      dialog.close();
      document.querySelector("#review-slot").innerHTML = review();
      document.querySelector("#review-title").focus();
      notice("이미 추출된 스킬을 선택했어요.");
      return;
    }
    const trigger = known ? skills[known].pattern.exec(excerpt)?.[0] ?? name : name;
    draft.manual = [...draft.manual.filter(item => item.id !== id), {id,name,excerpt,trigger,manual:true}];
    draft.selected.add(id);
    dialog.close();
    document.querySelector("#review-slot").innerHTML = review();
    document.querySelector("#review-title").focus();
  } else if (form.dataset.form === "portfolio-select") {
    const sources = activities.filter(a => values.getAll("source").includes(a.id));
    if (!sources.length) return error("초안에 연결할 기록을 하나 이상 골라 주세요.");
    const title = recordTitle(sources[0]).slice(0,100);
    const work = sources.map(a => directClauses(a.text).join(". ")).filter(Boolean).join("\n\n").slice(0,4000);
    const result = sources.flatMap(a => (a.tags || []).filter(([label]) => label === "성과" || label === "결과물").flatMap(([,items]) => items)).join(", ").slice(0,4000);
    editPortfolio({title, work, result, sources:sources.map(a => a.id)});
    tellDeck("portfolio-draft");
  } else if (form.dataset.form === "portfolio-save") {
    if (!value("title")) return error("초안 제목을 입력해 주세요.");
    const link = value("link");
    if (link && !safeUrl(link)) return error("http 또는 https 주소를 입력해 주세요.");
    const item = {id:form.dataset.id || newId(), sources:JSON.parse(form.dataset.sources), title:value("title"), role:value("role"), work:value("work"), result:value("result"), link};
    const next = [item,...readSetting(portfolioKey,portfolios).filter(card => card.id !== item.id)];
    if (!writeSetting(portfolioKey,next)) return;
    portfolios = next;
    dialog.close();
    render();
    tellDeck("portfolio-save");
    notice("포트폴리오 초안을 저장했어요.");
  }
});
document.addEventListener("input", event => {
  if (event.target.id === "job-search") { updateJobSearch(event.target); return; }
  if (event.target.id !== "activity") return;
  draft.text=event.target.value;
  document.querySelector("#length").textContent=draft.text.length;
  if (draft.suggestions !== null) clearReview();
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-draft-project]")) {
    draft.project = event.target.checked;
    return;
  }
  if (event.target.matches("[data-activity-use]")) {
    const activity = activities.find(item => item.id === event.target.dataset.activityUse);
    if (activity) setUse([activity], !event.target.checked);
    return;
  }
  if (event.target.matches("[data-eligibility]")) {
    const control = event.target;
    const {eligibility:key,option} = control.dataset;
    try {
      if (control.checked) localStorage.setItem(key,option);
      else localStorage.removeItem(key);
    } catch { notice("지원 조건을 저장하지 못했어요."); }
    render();
    document.querySelector(`[data-eligibility="${key}"][data-option="${option}"]`)?.focus();
    return;
  }
  if (sync && event.target.closest(".sync")) {
    if (event.target.matches("[data-sync-all]")) {
      for (const [index,item] of sync.items.entries()) {
        item.include = event.target.checked;
        const box = dialog.querySelector(`[data-sync-item="${index}"]`);
        box.checked = item.include;
        box.closest(".sync-item").querySelector("fieldset").disabled = !item.include;
      }
      syncRefresh();
      return;
    }
    const {syncItem:itemIndex, syncSkill} = event.target.dataset;
    const item = sync.items[itemIndex ?? syncSkill];
    if (itemIndex !== undefined) {
      item.include = event.target.checked;
      event.target.closest(".sync-item").querySelector("fieldset").disabled = !item.include;
    } else if (syncSkill !== undefined) {
      if (event.target.checked) item.selected.add(event.target.value); else item.selected.delete(event.target.value);
    }
    syncRefresh();
    return;
  }
  if (!event.target.matches("input[data-skill]")) return;
  const {skill}=event.target.dataset;
  if (event.target.checked) draft.selected.add(skill); else draft.selected.delete(skill);
});
document.addEventListener("click", event => {
  const el=event.target.closest("[data-action]");
  if (!el) return;
  const {action,id,skill,filter,use}=el.dataset;
  // Reading stored skills, projects or records: the deck shows the matching lookup diagram.
  if (["skills","evidence","projects","activities"].includes(action)) tellDeck(action);
  // eclass sync: fetching and extracting, then saving what the user confirmed.
  if (action === "sync-open" || action === "sync-apply") tellDeck(action);
  if (action === "close") dialog.close();
  else if (action === "confirm") {const run=modalAction; dialog.close(); run?.();}
  else if (action === "retry") refresh();
  else if (action === "sync-open") openSync();
  else if (action === "sync-apply") {el.disabled=true; applySync();}

  else if (action === "load-sentence") {
    discardThen(()=>{draft.text=draft.practice?.example ?? activitySentence; draft.suggestions=null; draft.manual=[]; render(); editFocus(); tellDeck("load-sentence");});
  }
  else if (action === "extract") {
    const input=document.querySelector("#activity");
    if (!draft.text.trim()) {input.setCustomValidity("활동 내용을 먼저 적어 주세요."); input.reportValidity(); input.setCustomValidity(""); input.focus(); return;}
    draft.suggestions=extractSkills(draft.text,true).filter(item => !draft.manual.some(manual => manual.id === item.id));
    // An edited record stays a project if it was one, even when the wording no longer says so.
    draft.found=extractProject(draft.text, draft.suggestions) || (draft.original?.project ? {name:draft.original.title || "프로젝트", tags:draft.original.tags || []} : null);
    draft.project=Boolean(draft.found);
    tellDeck("extract");
    // An edit keeps manual exclusions unless the user adds a new skill to the text.
    const oldFound = draft.original ? extractSkills(draft.original.text,true).map(m=>m.id) : [];
    draft.selected=new Set(draft.suggestions.filter(m=>!oldFound.includes(m.id) || draft.original?.matches.some(old=>old.id===m.id)).map(m=>m.id));
    for (const item of draft.manual) draft.selected.add(item.id);
    el.hidden=true;
    document.querySelector("#review-slot").innerHTML=review();
    document.querySelector("#review-title").focus();
  } else if (action === "save" && draft.suggestions !== null) {el.disabled=true; persist();}
  else if (action === "manual-skill") openManualSkill();
  else if (action === "target-job") {
    const next = {job:goals.job === id ? null : id};
    if (!writeSetting(goalsKey,next)) return;
    goals = next;
    render();
    document.querySelector('[data-action="target-job"]')?.focus();
    notice(next.job ? "활동 기록 상단에서 이 공고의 로드맵을 바로 열 수 있어요." : "목표 공고를 해제했어요.");
    if (next.job) tellDeck("roadmap");
  }
  else if (action === "roadmap") {
    showRoadmap();
    tellDeck("roadmap");
  }
  else if (action === "portfolio-new") choosePortfolioSources();
  else if (action === "portfolio-edit" || action === "portfolio-sources") {
    const item = portfolios.find(card => card.id === id);
    if (!item) return;
    if (action === "portfolio-edit") editPortfolio(item);
    else {
      const sources = activities.filter(a => item.sources.includes(a.id));
      openDialog("포트폴리오 원본 기록",sources.map(a => `<article class="entry"><h3>${escape(recordTitle(a))}</h3><p>${escape(a.text)}</p></article>`).join("") || "<p>연결된 기록을 찾을 수 없어요.</p>");
      tellDeck("activities");
    }
  }
  else if (action === "filter") {jobFilter=filter; render(); document.querySelector('.filters [aria-pressed="true"]')?.focus({preventScroll:true});}
  else if (action === "clear-job-search") {
    const input = document.getElementById("job-search");
    input.value = "";
    updateJobSearch(input);
    input.focus();
  }
  else if (action === "favorite-job") {
    const next = new Set(readSetting(favoritesKey,[]));
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (!writeSetting(favoritesKey,[...next])) return;
    favorites = next;
    render();
    (document.querySelector(`.job-favorite[data-id="${id}"]`) || document.querySelector('.filters [aria-pressed="true"]'))?.focus({preventScroll:true});
  }
  else if (action === "activities" || action === "projects") openActivities(action === "projects");
  else if (action === "use-all") setUse(activities.filter(a => (!listProjects || a.project) && Boolean(a.off) !== (use === "off")), use === "off");
  else if (action === "skills" || action === "evidence") openOwnedSkills(skill);
  else if (action === "select-skill") selectOwnedSkill(skill);
  else if (action === "edit") {
    const a=activities.find(item=>item.id===id);
    if (a) {dialog.close(); discardThen(()=>useDraft({...blank(),text:a.text,project:a.project === true,original:a,manual:a.matches.filter(item => item.manual)}));}
  } else if (action === "cancel-edit") {
    const back=draft.returnTo;
    draft=blank(); if(back) location.hash=back; else render();
  } else if (action === "project") {
    const {job,criterion}=route();
    const practice = practiceFor(job,criterion);
    discardThen(()=>useDraft({...blank(),project:true,practice:practice.example ? practice : null,returnTo:"jobs/"+job.id+"/roadmap"}));
  }
});
dialog.addEventListener("close", () => { sync = null; syncRun++; });
dialog.addEventListener("keydown", event => {
  const tab = event.target.closest('[role="tab"]');
  if (!tab || !["ArrowUp","ArrowDown","Home","End"].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...tab.parentElement.querySelectorAll('[role="tab"]')];
  let index = tabs.indexOf(tab);
  if (event.key === "Home") index = 0;
  else if (event.key === "End") index = tabs.length - 1;
  else index = (index + (event.key === "ArrowDown" ? 1 : -1) + tabs.length) % tabs.length;
  selectOwnedSkill(tabs[index].dataset.skill);
});
dialog.addEventListener("click",event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close();}});
function showRoadmap() {
  const section = document.getElementById("roadmap");
  section?.focus({preventScroll:true});
  section?.scrollIntoView({block:"start"});
}
window.addEventListener("hashchange",()=>{
  render();
  const {panel,job,criterion,fromRoadmap} = route();
  const inRoadmap = job && !criterion && location.hash.endsWith("/roadmap");
  if (panel === "jobs" && location.hash !== saveReturnHash) {
    tellDeck(inRoadmap ? "roadmap" : fromRoadmap ? "roadmap-node" : job ? "job-detail" : "jobs");
  }
  saveReturnHash = "";
  if (inRoadmap) showRoadmap();
  else {
    window.scrollTo(0,0);
    if (panel === "journal" && draft.returnTo) editFocus();
    else main.focus({preventScroll:true});
  }
});
window.addEventListener("pageshow",e=>{if(e.persisted) refresh();});
async function resetLocalData() {
  if (resetting) return;
  if (saving) { notice("저장이 끝나면 다시 초기화해 주세요."); return; }
  resetting = true;
  try {
    await resetActivities();
    for (const key of Object.keys(localStorage)) {
      if (key === goalsKey || key === favoritesKey || key === portfolioKey
        || key === prefix + "redblue-career" || key.startsWith(prefix + "eligibility:")) localStorage.removeItem(key);
    }
    if (demo && window.parent !== window) tellDeck("reset-complete");
    else {
      history.replaceState(null, "", "#journal");
      location.reload();
    }
  } catch {
    notice("시연 데이터를 초기화하지 못했어요.");
  } finally {
    resetting = false;
  }
}
const resetKeys = new Set();
window.addEventListener("keydown", event => {
  if (!["KeyR","KeyE"].includes(event.code) || event.repeat || event.isComposing
    || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
    || event.target.closest?.("input, textarea, select, [contenteditable]")) return;
  resetKeys.add(event.code);
  if (resetKeys.size !== 2) return;
  event.preventDefault();
  resetKeys.clear();
  resetLocalData();
});
window.addEventListener("keyup", event => resetKeys.delete(event.code));
window.addEventListener("blur", () => resetKeys.clear());
window.addEventListener("message", event => {
  if (demo && event.source === window.parent && event.data?.source === "skillnote-deck"
    && event.data.event === "reset") resetLocalData();
});
render();
refresh();
// Offline caching only exists for the hosted app. The single-file build (opened from disk or embedded
// in presentation.html) has no sw.js beside it and inlines its styles, so it must not try or warn.
if (/^https?:$/.test(location.protocol) && document.querySelector('link[rel="stylesheet"]') && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => notice("오프라인 실행을 준비하지 못했어요."));
}
