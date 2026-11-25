import {activitySentence, completedClauses, extractSkills, jobs, skills} from "./catalog.js?v=18";
import {icon} from "./icons.js";
import {readActivities, writeActivity} from "./storage.js?v=18";

const main = document.querySelector("main");
const dialog = document.querySelector("dialog");
const shortDate = new Intl.DateTimeFormat("ko-KR", {month:"long", day:"numeric"});
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
    for (const item of activity.matches) {
      if (!evidence.has(item.id)) evidence.set(item.id, []);
      evidence.get(item.id).push({activity, item});
    }
  }
  const completed = new Map(activities.map(activity => [activity, completedClauses(activity.text).join("\n")]));
  criterionEvidence = new Map(jobs.flatMap(job => job.requirements).map(criterion => {
    const [id,,patterns,,,mode,skill = id] = criterion;
    if (mode === "eligibility") return [criterion, []];
    const matches = (evidence.get(skill) || []).filter(({activity,item}) =>
      (mode !== "project" || activity.project === true)
      && skills[skill].pattern.test(item.trigger)
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
function activityList() {
  return activities.map(a => `<article class="entry"><div class="entry-meta">${icon("calendar")}${shortDate.format(a.created)}${a.project ? " · 프로젝트" : ""}<div class="entry-tools"><button data-action="edit" data-id="${escape(a.id)}">수정</button><button data-action="delete" data-id="${escape(a.id)}">삭제</button></div></div>
    <p>${escape(a.text)}</p>${a.matches.length ? `<div class="chips">${a.matches.map(m=>chip(m.id)).join("")}</div>` : ""}</article>`).join("");
}
function board() {
  const chips = [...evidence.keys()].map(id => `<button class="chip" data-action="evidence" data-skill="${id}" aria-haspopup="dialog">${skills[id].name}</button>`).join("");
  if (!loaded) return `<section class="card board">${heading("layers","나의 스킬 보드")}<p class="state-message">${loadError ? '활동을 불러오지 못했어요. <button class="text-button" data-action="retry">다시 시도</button>' : "활동을 불러오는 중이에요."}</p></section>`;
  return `<section class="card board">${heading("layers","나의 스킬 보드")}
    <div class="stats"><button data-action="skills" aria-haspopup="dialog"><span>보유 스킬 ${icon("chev")}</span><strong>${evidence.size}<small>개</small></strong></button><button data-action="activities" aria-haspopup="dialog"><span>기록한 활동 ${icon("chev")}</span><strong>${activities.length}<small>개</small></strong></button></div>
    ${chips ? `<div class="chips">${chips}</div>` : '<p class="board-note">활동에서 찾은 스킬이 여기에 모여요.</p>'}</section>`;
}
function logo(job) { return `<span aria-hidden="true" class="company-mark ${job.color}">${job.mark}</span>`; }
function journal() {
  return `<div class="dashboard">${composer()}${board()}</div>`;
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
    <span class="grow"><strong>${title}</strong><small>${hint}</small></span>${icon("chev")}</a>`;
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
    return `<div class="evidence-row"><small>${shortDate.format(activity.created)}${activity.project ? " · 프로젝트" : ""}</small><blockquote>${body}</blockquote></div>`;
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
  panel.innerHTML = `<h3>${skills[id].name}</h3><p class="owned-count">연결된 활동 ${evidence.get(id).length}개</p>${evidenceRows(evidence.get(id))}`;
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
  const [,title,,project,guide] = criterion;
  const matches = criterionEvidence.get(criterion) || [];
  const intro = `${backLink("jobs/"+job.id,job.role)}<div class="card skill-intro"><div class="eyeline"><span class="tile">${icon(matches.length ? "check" : "target")}</span>자격요건</div><h1>${title}</h1></div>`;
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
  if (!event.target.matches("input[data-skill]")) return;
  const {skill}=event.target.dataset;
  if (event.target.checked) draft.selected.add(skill); else draft.selected.delete(skill);
});
document.addEventListener("click", event => {
  const el=event.target.closest("[data-action]");
  if (!el) return;
  const {action,id,skill,filter}=el.dataset;
  if (action === "close") dialog.close();
  else if (action === "confirm") {const run=modalAction; dialog.close(); run?.();}
  else if (action === "retry") refresh();
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
  else if (action === "activities") openDialog("기록한 활동",activityList() || "<p>저장한 활동이 없어요.</p>");
  else if (action === "skills" || action === "evidence") openOwnedSkills(skill);
  else if (action === "select-skill") selectOwnedSkill(skill);
  else if (action === "edit") {
    const a=activities.find(item=>item.id===id);
    if (a) {dialog.close(); discardThen(()=>useDraft({...blank(),text:a.text,project:a.project === true,original:a}));}
  } else if (action === "delete") {
    const a=activities.find(item=>item.id===id);
    if (a) openDialog("활동을 삭제할까요?",`<p>이 활동만 뒷받침하던 스킬은 공고 체크리스트에서도 해제돼요.</p>${dialogActions("삭제하기",true)}`,()=>persist(a));
  } else if (action === "cancel-edit") {
    const back=draft.returnTo;
    draft=blank(); if(back) location.hash=back; else render();
  } else if (action === "project") {
    const {job}=route();
    discardThen(()=>useDraft({...blank(),project:true,returnTo:"jobs/"+job.id}));
  }
});
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
