# Sequence diagrams in presentation.html

How the diagrams beside the phone demo work, and how to add or change one when the app changes.
The design rules are in `SPEC.md` section 8; this file is the how-to.

## How it works

1. The app runs inside the phone frame (an iframe) in `presentation.html`.
2. When a button is pressed, the app sends its name to the page around it: `tellDeck("extract")`.
3. `presentation.html` looks that name up in `EVENTS`, draws the diagram for it on the right, and lights up the steps that button is responsible for.

So a diagram needs two things: the app must **send an event**, and the deck must **know what to draw for it**.

## Where the code is

| What | File | Look for |
|---|---|---|
| Sending an event | `skillnote/dist/app.js` | `tellDeck(` |
| Lifelines | `presentation.html` | `const ACTORS` |
| Diagram height | `presentation.html` | `const ROWS` |
| Diagram contents | `presentation.html` | `const WRITE`, `const SYNC`, `const JOBS`, `const JOB`, `const READ` |
| Event → diagram + lit steps | `presentation.html` | `const EVENTS` |
| Drawing code | `presentation.html` | `function sequenceSvg` |

Do not edit `스킬노트.html` or the long `PROTOTYPE_B64` line in `presentation.html` by hand. Both are produced by the build (see "After any change").

## Rules to keep

- **Lifelines never change between diagrams.** They are `앱, 서버, LLM, DB, eclass, 원티드`, always in that order. Outside systems each get their own lifeline at the far right. A diagram that does not use one still shows it. No 사용자 lifeline: the diagrams show what happens behind the screen.
- **One diagram per kind of work**, not per button. Buttons that do the same kind of thing share a diagram, with labels broad enough to fit all of them (all the "show what is stored" buttons share `READ`).
- **A button lights up only the steps it causes.** The rest of the timeline is darkened.
- **Title and diagram only.** No notes, captions or disclaimers.
- **Labels are short noun phrases in Korean**: what is sent, not a sentence. Skills and projects are written `스킬·프로젝트`.

## The pieces

### A diagram

```js
const WRITE = {
  title: "스킬 추출 → 저장",
  messages: [
    // [from, to, label, reply?]
    [0, 1, "활동 문장 전송"],
    [1, 2, "스킬·세부 역량·프로젝트 추출 요청"],
    [2, 1, "추출 결과", true],
  ]
};
```

- `from` and `to` are positions in `ACTORS`, counted from 0: `0 앱, 1 서버, 2 LLM, 3 DB, 4 eclass, 5 원티드`.
- `reply` is `true` for a response going back (drawn as a grey dashed arrow). Leave it out for a request (solid blue arrow).
- Steps are numbered automatically in the order listed.
- A diagram can have at most `ROWS` messages. If you need more, raise `ROWS`; every diagram gets taller together, which keeps the lifelines identical.

### An event

```js
const EVENTS = {
  "load-sentence": { diagram: WRITE, range: [] },   // every step darkened
  "extract":       { diagram: WRITE, range: [0, 3] }, // steps 1–4 lit
  "save":          { diagram: WRITE, range: [4, 7] }, // steps 5–8 lit
};
```

- The key is the name the app sends.
- `range` is `[first, last]`, counted from 0, so step 1 is `0`.
- `range: []` darkens every step: use it for a button that only sets the scene and runs nothing yet.
- Leave `range` out to light everything.

## Events the app sends today

| Button on the phone | Event | Diagram | Lit steps |
|---|---|---|---|
| 문장 불러오기 | `load-sentence` | 스킬 추출 → 저장 | none (all darkened) |
| 스킬 추출 | `extract` | 스킬 추출 → 저장 | 1–4 |
| 활동 저장 | `save` | 스킬 추출 → 저장 | 5–8 |
| eclass에서 가져오기 | `sync-open` | eclass 동기화 → 저장 | 1–6 |
| 선택한 항목 추가 | `sync-apply` | eclass 동기화 → 저장 | 7–10 |
| 채용 공고 tab (the list) | `jobs` | 채용 공고 수집 → 매칭 | 4–7 |
| A posting, or one of its requirements | `job-detail` | 공고 자격요건 매칭 | 1–6 |
| 보유 스킬 | `skills` | 스킬·프로젝트 조회 | 1–4 |
| A skill tag on the board | `evidence` | 스킬·프로젝트 조회 | 1–4 |
| 프로젝트 | `projects` | 스킬·프로젝트 조회 | 1–4 |
| 전체 기록 보기 | `activities` | 스킬·프로젝트 조회 | 1–4 |

## Recipes

### A button's behaviour changed (same button, different steps)

1. In `presentation.html`, edit the `messages` of the diagram that button uses.
2. If the number of steps changed, fix the `range` of every event that uses that diagram.

### A new button needs a diagram

1. **Decide which diagram it belongs to.** Ask what the button makes the system do:
   - reads stored data → reuse `READ`
   - sends text to be extracted, or saves the result → reuse `WRITE`
   - pulls from eclass → reuse `SYNC`
   - something else → write a new diagram object (copy `READ` as a starting point)
2. **Write out the steps behind the button**, as request/response pairs between lifelines: who asks whom for what, and what comes back. A request and its reply are two separate messages.
3. **Find the button's action name** in `skillnote/dist/app.js`: search for the button's Korean label, and read its `data-action="…"`.
4. **Send the event.** In the click handler in `app.js` there are lines like:
   ```js
   if (["skills","evidence","projects","activities"].includes(action)) tellDeck(action);
   ```
   Add the new action name to the matching list, or add a new `tellDeck("name")` line where that button is handled.
5. **Register it** in `EVENTS` in `presentation.html` with its diagram and `range`.

### Something happens in the background, not because of a button

Put those steps in the diagram, but leave them outside every event's `range`. They then stay darkened whatever is pressed. `JOBS` does this: steps 1–3 are the server's own crawl of job sites, and the `jobs` event lights only steps 4–7.

The `jobs` and `job-detail` events are sent when the app's address changes to the 채용 공고 area (search `app.js` for `"job-detail"`), not from a button's `data-action`, because those screens are opened by links.

### A new system part is needed (a new lifeline)

1. Add it to `ACTORS` in `presentation.html`. Put an outside system at the far right, after 원티드, so no existing number changes.
2. If you insert it anywhere else, every `from`/`to` number at or after that position shifts by one. Fix them in **every** diagram.
3. Update the lifeline list in `SPEC.md` section 8 and in this file.

## After any change

Rebuild, so `스킬노트.html` and the copy of the app inside `presentation.html` are refreshed:

```
node skillnote/standalone.mjs
```

A change made only to the diagram code in `presentation.html` (not to `app.js`) does not need a rebuild.

## Check it

1. Open `presentation.html` and go to the 스킬노트 데모 tab.
2. Press each button in the table above. For each one, check:
   - the title is the right diagram
   - the five lifelines have not moved
   - the blue outline surrounds exactly the steps that button causes
3. The right side stays empty until the first button is pressed. That is expected.

## Prompt to give an AI assistant

> Read `DIAGRAMS.md` and `SPEC.md` section 8. The app changed: [describe the new or changed button and what it does behind the screen]. Update the sequence diagrams in `presentation.html` to match: keep the lifelines fixed, reuse an existing diagram if the work is the same kind, send an event from `skillnote/dist/app.js` with `tellDeck`, register it in `EVENTS` with the steps to light up, rebuild with `node skillnote/standalone.mjs`, then update the event table in `DIAGRAMS.md`.
