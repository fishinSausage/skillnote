import {activitySentence, aspectsFor, completedClauses, extractSkills, jobs, skills} from "./catalog.js?v=18";
import {icon} from "./icons.js";
import {readActivities, writeActivity} from "./storage.js?v=18";
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
const blank = () => ({text:"", project:false, suggestions:null, selected:new Set(), original:null, returnTo:""});
let draft = blank();
let activities = [];
let loaded = false;
let loadError = false;
let saving = false;
let jobFilter = "전체";
let modalAction;
let messageTimer;
let loadSequence = 0;
let evidence = new Map();
let criterionEvidence = new Map();
let sync = null;
let syncRun = 0;
let listProjects = false;
// Synced matches carry the sub-skills the model named; hand-written ones fall back to the catalog rules.
const matchAspects = (activity,item) => item.aspects ?? aspectsFor(item.id, activity.text);
const aspectChips = names => names.length ? `<div class="aspects">${names.map(name => `<span class="aspect">${escape(name)}</span>`).join("")}</div>` : "";
const eligibilityPrefix = "skillnote-eligibility:";
const careerKey = "skillnote-redblue-career";
const eligibilityKey = (job, group) => job.id === "redblue-375632" && group.id === "career"
  ? careerKey : eligibilityPrefix + job.id + ":" + group.id;
function selectedEligibility(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("skillnote-changes") : null;

function route() {
  const [panel, jobId, skillId] = location.hash.slice(1).split("/");
  const job = panel === "jobs" && jobs.find(item => item.id === jobId);
  const criterion = job && job.requirements.find(([id,,,,,mode]) => id === skillId && mode !== "eligibility");
  return {panel:panel === "jobs" ? "jobs" : "journal", job, criterion};
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
  const completed = new Map(activities.map(activity => [activity, completedClauses(activity.text).join("\n")]));
  criterionEvidence = new Map(jobs.flatMap(job => job.requirements).map(criterion => {
    const [id,,patterns,,,mode,skill = id,aspect] = criterion;
    if (mode === "eligibility") return [criterion, []];
    const matches = (evidence.get(skill) || []).filter(({activity,item}) =>
      (mode !== "project" || activity.project === true)
      && skills[skill].pattern.test(item.trigger)
      && (!aspect || matchAspects(activity,item).includes(aspect))
      && patterns.every(pattern => pattern.test(completed.get(activity))));
    return [criterion, matches];
  }));
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
  const tabs = [["journal","journal","활동 기록"],["jobs","work","채용 공고"]];
  const links = tabs.map(([key,symbol,title]) => `<a href="#${key}" ${key === panel ? 'aria-current="page"' : ""}>${icon(symbol)}${title}</a>`).join("");
  document.querySelectorAll(".desktop-nav,.mobile-nav").forEach(el => { el.innerHTML = links; });
}
function heading(symbol, title, extra="", tag="h2") {
  return `<div class="section-title"><div class="hgroup"><span class="tile">${icon(symbol)}</span><${tag}>${title}</${tag}></div>${extra}</div>`;
}
function chip(id) { return `<span class="chip">${escape(skills[id].name)}</span>`; }
function review() {
  if (draft.suggestions === null) return "";
  const rows = draft.suggestions.map(item => `<label class="suggestion"><input type="checkbox" data-skill="${item.id}" ${draft.selected.has(item.id) ? "checked" : ""}><span><strong>${skills[item.id].name}</strong><small>기록에서 찾은 표현 · “${escape(item.trigger)}”</small></span></label>`).join("");
  return `<section class="review" id="review" aria-labelledby="review-title"><h3 id="review-title" tabindex="-1">추출한 스킬 <span class="count">${draft.suggestions.length}</span></h3>
    <p>${rows ? "직접 경험한 스킬만 선택해 저장하세요." : "찾은 스킬이 없어요. 활동만 저장하거나 사용한 도구와 작업을 더 적어 보세요."}</p>
    ${rows}<div class="action-end"><button class="primary" data-action="save" ${saving || !loaded ? "disabled" : ""}>${icon("check")}${draft.original ? "수정 저장" : "활동 저장"}</button></div></section>`;
}
function composer() {
  const sentenceButton = `<button class="load-sentence" data-action="load-sentence">${icon("bulb")}문장 불러오기</button>`;
  return `<section class="card compose" id="composer">${heading("pen",draft.original ? "활동 수정" : "새 활동 작성",sentenceButton,"h1")}
    <label for="activity">수업이나 수업 밖에서 어떤 활동을 했나요?</label>
    <div class="textarea-wrap"><textarea id="activity" maxlength="2000" placeholder="사용한 도구와 직접 한 일을 적어 보세요.">${escape(draft.text)}</textarea><span class="counter"><b id="length">${draft.text.length}</b> / 2,000</span></div>
    <label class="project-source"><input type="checkbox" data-activity-project ${draft.project ? "checked" : ""}> 직접 수행한 프로젝트</label>
    <div class="compose-actions"><span class="local-cue">${icon("archive")}이 기기에 저장</span><div class="actions">${draft.original || draft.returnTo ? '<button class="subtle" data-action="cancel-edit">취소</button>' : ""}
    <button class="primary" data-action="extract" ${draft.suggestions !== null ? "hidden" : ""}>${icon("spark")}스킬 추출</button></div></div>
    <div id="review-slot">${review()}</div></section>`;
}
// A project shows as its name; pressing it opens the tags attached to it.
function projectBody(a) {
  const cut = a.source ? a.text.indexOf(": ") : -1;
  const name = cut > 0 ? a.text.slice(0, cut) : a.text.split(/[.\n]/)[0];
  const from = a.source || {};
  const subs = [...new Set(a.matches.flatMap(item => matchAspects(a,item)))];
  const rows = [
    ["스킬", a.matches.map(m => chip(m.id)).join("")],
    ["세부 역량", subs.map(sub => `<span class="aspect">${escape(sub)}</span>`).join("")],
    ["목적", from.purpose ? escape(from.purpose) : ""],
    ["형태", [from.team ? "팀 프로젝트" : "", from.count > 1 ? from.count + "회 제출" : ""].filter(Boolean).join(" · ")],
    ["출처", from.course ? escape([from.course, from.term, from.origin].filter(Boolean).join(" · ")) : ""]
  ].filter(([,value]) => value).map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  return `<details class="project-card"><summary><strong>${escape(name)}</strong>${icon("chev")}</summary><p>${escape(cut > 0 ? a.text.slice(cut + 2) : a.text)}</p><dl>${rows}</dl></details>`;
}
function activityList(projects) {
  return activities.filter(a => !projects || a.project).map(a => `<article class="entry ${a.off ? "off" : ""}"><div class="entry-meta">${icon("calendar")}${shortDate.format(a.created)}${a.project ? " · 프로젝트" : ""}${a.source ? " · eclass " + syncKinds[a.source.type] : ""}<div class="entry-tools"><button data-action="edit" data-id="${escape(a.id)}">수정</button><label class="entry-use"><input type="checkbox" data-activity-use="${escape(a.id)}" ${a.off ? "" : "checked"}>반영</label></div></div>
    ${a.project ? projectBody(a) : `<p>${escape(a.text)}</p>${a.matches.length ? `<div class="chips">${a.matches.map(m=>chip(m.id)).join("")}</div>` : ""}`}</article>`).join("");
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
  channel?.postMessage("changed");
  render();
  openActivities(listProjects, true);
  if (failure) notice(failure);
}
function board() {
  const chips = [...evidence.keys()].map(id => `<button class="chip" data-action="evidence" data-skill="${id}" aria-haspopup="dialog">${skills[id].name}</button>`).join("");
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
  channel?.postMessage("changed");
  render();
  notice(failure || `eclass에서 스킬 ${added.size}종과 프로젝트 ${projects}개를 추가했어요.`);
}
function logo(job) { return `<span aria-hidden="true" class="company-mark ${job.color}">${job.mark}</span>`; }
function journal() {
  return `<div class="dashboard">${composer()}<div class="side">${board()}${syncCard()}</div></div>`;
}
const hasCriterionEvidence = (job,group,criterion) => criterion[5] === "eligibility"
  ? criterion[0] === selectedEligibility(eligibilityKey(job,group)) : Boolean(criterionEvidence.get(criterion)?.length);
function requirementStatus(job) {
  return job.groups.map(group => {
    const met = criterion => hasCriterionEvidence(job,group,criterion);
    return group.operator === "xor" ? group.options.some(met) : group.options.every(met);
  });
}
const progress = job => `<div class="match-meter" aria-hidden="true">${requirementStatus(job).map(done => `<i class="${done ? "on" : ""}"></i>`).join("")}</div>`;
const matchText = job => {
  const status = requirementStatus(job);
  return `자격요건 ${status.length}개 중 <b>${status.filter(Boolean).length}개 확인</b>`;
};
const deadlineText = job => job.deadline ? "마감 " + job.deadline.replaceAll("-", ".") : "상시채용";
function jobList() {
  const filtered = jobs.filter(j => jobFilter === "전체" || j.field === jobFilter);
  return `<section class="job-feed"><div class="feed-heading"><h1>채용 공고 <span class="count">${filtered.length}</span></h1><span class="muted inline">${icon("list")}마감일순</span></div>
    <div class="filters" aria-label="직무 필터">${["전체","데이터","프론트엔드","백엔드"].map(f=>`<button data-action="filter" data-filter="${f}" aria-pressed="${f === jobFilter}">${f}</button>`).join("")}</div>
    <div class="job-grid">${filtered.map(j=>`<a class="card job" href="#jobs/${j.id}"><div class="job-top">${logo(j)}<span class="job-company">${j.company}</span><span class="job-date">${deadlineText(j)}</span></div><h2>${j.role}</h2>
    <div class="job-meta">${j.type}<span>·</span>${j.place}</div><div class="chips">${j.tags.map(chip).join("")}</div>
    <div class="job-match"><span>${matchText(j)}</span>${progress(j)}</div></a>`).join("")}</div></section>`;
}
function backLink(href, label) { return `<a class="back" href="#${href}">${icon("back")}${label}</a>`; }
function requirementRow(job,group,row) {
  const [id,title,,,,mode] = row;
  const matched = hasCriterionEvidence(job,group,row);
  if (mode === "eligibility") {
    return `<label class="skill-row career-option"><input type="checkbox" data-eligibility="${eligibilityKey(job,group)}" data-option="${id}" ${matched ? "checked" : ""}><strong>${title}</strong></label>`;
  }
  const count = criterionEvidence.get(row)?.length || 0;
  const hint = matched ? `${mode === "project" ? "프로젝트" : "활동"} ${count}개에서 확인`
    : mode === "project" ? "프로젝트 기록 없음 · 준비 방법 보기" : "활동 근거 없음 · 준비 방법 보기";
  return `<a href="#jobs/${job.id}/${id}" class="skill-row"><span class="check-indicator ${matched ? "matched" : ""}">${matched ? icon("check") : ""}</span>
    <span class="grow"><strong>${title}${row[7] ? `<span class="aspect">${row[7]}</span>` : ""}</strong><small>${hint}</small></span>${icon("chev")}</a>`;
}
function requirementGroup(job,group) {
  if (!group.operator) return requirementRow(job,group,group.options[0]);
  const winner = group.operator === "xor" && group.options.find(row => hasCriterionEvidence(job,group,row));
  const options = winner ? [winner] : group.options;
  const rule = group.operator === "xor"
    ? (group.options.length === 2 ? "둘 중 하나" : "한 항목만 충족")
    : (group.options.length === 2 ? "두 항목 모두" : "모든 항목");
  return `<fieldset class="requirement-group">${group.title ? `<legend>${group.title} <span>${rule}</span></legend>` : ""}
    ${options.map(row => requirementRow(job,group,row)).join("")}</fieldset>`;
}
function jobDetail(job) {
  return `<div class="detail">${backLink("jobs","공고 목록")}<article class="card detail-intro"><div class="eyeline">${logo(job)}${job.company}</div>
    <h1>${job.role}</h1><div class="detail-meta"><span>${icon("pin")}${job.place}</span><span>${icon("work")}${job.type}</span><span>${icon("calendar")}${deadlineText(job)}</span></div><p>${job.description}</p>
    ${job.employment ? `<p><strong>근무 조건</strong> · ${job.employment}</p>` : ""}</article>
    <section class="card checklist">${heading("target","자격요건")}
      <div class="match-head"><span>${matchText(job)}</span>${progress(job)}</div>
      ${job.groups.map(group => requirementGroup(job,group)).join("")}
    </section>
    ${job.interview ? `<section class="card interview">${heading("mic","면접 준비")}
      <ul>${job.interview.map(title => `<li><strong>${escape(title)}</strong></li>`).join("")}</ul>
    </section>` : ""}
    <a class="card original-posting" href="${escape(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">
      <span class="tile">${icon("external")}</span><span><strong>원본 공고 보기</strong><small>원티드</small></span>
    </a></div>`;
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
    return `<div class="evidence-row"><small>${shortDate.format(activity.created)}${activity.project ? " · 프로젝트" : ""}</small>${item ? aspectChips(matchAspects(activity,item)) : ""}<blockquote>${body}</blockquote></div>`;
  }).join("");
}
function selectOwnedSkill(id) {
  const panel = dialog.querySelector("#owned-panel");
  const selected = dialog.querySelector(`#owned-tab-${id}`);
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
  panel.innerHTML = `<h3>${skills[id].name}</h3><p class="owned-count">연결된 활동 ${evidence.get(id).length}개</p>${spread}${evidenceRows(evidence.get(id))}`;
  panel.scrollTop = 0;
  selected.focus();
}
function openOwnedSkills(id) {
  if (!evidence.size) {
    openDialog("보유 스킬","<p>아직 보유 스킬이 없어요. 활동에서 추출한 스킬을 저장해 보세요.</p>");
    return;
  }
  const tabs = [...evidence].map(([key, matches]) => `<button type="button" role="tab" id="owned-tab-${key}" aria-controls="owned-panel" data-action="select-skill" data-skill="${key}"><strong>${skills[key].name}</strong><small>활동 ${matches.length}개</small></button>`).join("");
  openDialog("보유 스킬",`<div class="skills-split"><div class="owned-tabs" role="tablist" aria-label="보유 스킬" aria-orientation="vertical">${tabs}</div><section id="owned-panel" role="tabpanel" tabindex="0"></section></div>`);
  selectOwnedSkill(evidence.has(id) ? id : evidence.keys().next().value);
}
function criterionDetail(job,criterion) {
  const [,title,,project,guide,,,aspect] = criterion;
  const matches = criterionEvidence.get(criterion) || [];
  const intro = `${backLink("jobs/"+job.id,job.role)}<div class="card skill-intro"><div class="eyeline"><span class="tile">${icon(matches.length ? "check" : "target")}</span>자격요건</div><h1>${title}${aspect ? " · " + aspect : ""}</h1></div>`;
  if (matches.length) return `<div class="detail">${intro}<section class="card">${heading("journal","연결된 활동")}${evidenceRows(matches)}</section></div>`;
  const resources = guide ? `<section class="card guide">${heading("book","관련 학습 자료")}
    ${skills[guide].resources.map(([name,url,note],i)=>`<article class="resource"><span class="resource-type">${icon(guideKinds[i][1])}${guideKinds[i][0]}</span><a class="resource-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(name)}${icon("external")}</a><p>${note}</p></article>`).join("")}</section>` : "";
  return `<div class="detail">${intro}<section class="card project">${heading("bag","포트폴리오에 남길 실습")}<p>${project}</p><button class="primary" data-action="project">${icon("pen")}완료한 활동 기록하기</button></section>${resources}</div>`;
}
function render() {
  const {panel,job,criterion}=route();
  const title = criterion ? criterion[1] : job ? job.role : panel === "jobs" ? "채용 공고" : "활동 기록";
  document.title = title + " · 스킬노트";
  nav(panel);
  main.innerHTML = criterion ? criterionDetail(job,criterion) : job ? jobDetail(job) : panel === "jobs" ? jobList() : journal();
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
    notice("기기의 활동 저장소를 열지 못했어요.");
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
  try {
    const id=before?.id || crypto.randomUUID();
    const next=remove ? null : {...before,id,created:before?.created ?? Date.now(), text:draft.text.trim(), project:draft.project, matches:draft.suggestions.filter(m=>draft.selected.has(m.id))};
    await writeActivity(id,before?.revision ?? 0,next);
    if (!remove || draft.original?.id === id) draft=blank();
    await refresh(false);
    channel?.postMessage("changed");
    if (!remove && returnTo) location.hash=returnTo;
    else render();
    notice(remove ? "활동을 삭제했어요." : "활동을 저장했어요.");
  } catch(error) {
    await refresh(false);
    render();
    notice(error.message);
  } finally {saving=false; const btn=document.querySelector('[data-action="save"]'); if(btn) btn.disabled=!loaded;}
}
document.addEventListener("input", event => {
  if (event.target.id !== "activity") return;
  draft.text=event.target.value;
  document.querySelector("#length").textContent=draft.text.length;
  if (draft.suggestions !== null) clearReview();
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-activity-project]")) {
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
    } catch {
      notice("지원 조건을 저장하지 못했어요.");
    }
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
  if (action === "close") dialog.close();
  else if (action === "confirm") {const run=modalAction; dialog.close(); run?.();}
  else if (action === "retry") refresh();
  else if (action === "sync-open") openSync();
  else if (action === "sync-apply") {el.disabled=true; applySync();}

  else if (action === "load-sentence") discardThen(()=>{draft.text=activitySentence; draft.suggestions=null; render(); editFocus();});
  else if (action === "extract") {
    const input=document.querySelector("#activity");
    if (!draft.text.trim()) {input.setCustomValidity("활동 내용을 먼저 적어 주세요."); input.reportValidity(); input.setCustomValidity(""); input.focus(); return;}
    draft.suggestions=extractSkills(draft.text);
    // An edit keeps manual exclusions unless the user adds a new skill to the text.
    const oldFound = draft.original ? extractSkills(draft.original.text).map(m=>m.id) : [];
    draft.selected=new Set(draft.suggestions.filter(m=>!oldFound.includes(m.id) || draft.original?.matches.some(old=>old.id===m.id)).map(m=>m.id));
    el.hidden=true;
    document.querySelector("#review-slot").innerHTML=review();
    document.querySelector("#review-title").focus();
  } else if (action === "save" && draft.suggestions !== null) {el.disabled=true; persist();}
  else if (action === "filter") {jobFilter=filter; render(); document.querySelector('[aria-pressed="true"]').focus({preventScroll:true});}
  else if (action === "activities" || action === "projects") openActivities(action === "projects");
  else if (action === "use-all") setUse(activities.filter(a => (!listProjects || a.project) && Boolean(a.off) !== (use === "off")), use === "off");
  else if (action === "skills" || action === "evidence") openOwnedSkills(skill);
  else if (action === "select-skill") selectOwnedSkill(skill);
  else if (action === "edit") {
    const a=activities.find(item=>item.id===id);
    if (a) {dialog.close(); discardThen(()=>useDraft({...blank(),text:a.text,project:a.project === true,original:a}));}
  } else if (action === "cancel-edit") {
    const back=draft.returnTo;
    draft=blank(); if(back) location.hash=back; else render();
  } else if (action === "project") {
    const {job}=route();
    discardThen(()=>useDraft({...blank(),project:true,returnTo:"jobs/"+job.id}));
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
window.addEventListener("hashchange",()=>{render(); window.scrollTo(0,0); if(route().panel==="journal" && draft.returnTo) editFocus(); else main.focus({preventScroll:true});});
channel?.addEventListener("message",()=>refresh());
window.addEventListener("pageshow",e=>{if(e.persisted) refresh();});
window.addEventListener("storage", event => {
  if (event.key === careerKey || event.key?.startsWith(eligibilityPrefix)) render();
});
render();
refresh();
if (location.protocol !== "file:" && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => notice("오프라인 저장을 준비하지 못했어요."));
}
