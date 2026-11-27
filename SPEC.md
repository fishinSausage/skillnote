# 스킬노트 rules

These are the rules the eclass sync follows. If the code and this file disagree, this file is right.

## 1. There are two kinds of entry

| Entry | Comes from | What it says |
|---|---|---|
| **Skill (스킬)** | 수업계획서 → 주차별 학습 | "I learnt this." |
| **Project (프로젝트)** | 과제 제출물 | "I built this." |

Nothing else is an entry. "활동" is not a type and is not counted anywhere: the skill board counts 스킬 and 프로젝트 only.

## 2. Skills

- A skill comes from the weekly topics of a course's 수업계획서.
- **A skill does not need a project.** A skill found only in the 수업계획서 is a normal skill. It is never marked as unsure for lacking a submission.
- 과제 제출물 are never used to create or confirm a skill.
- A skill the built-in list does not have (C++, 머신러닝, UML, …) is added as a new skill and tagged "새 스킬".

## 3. Sub-skills (세부 역량)

- A skill can have sub-skills: the specific parts of it that were learnt. Example: Python → 함수, 자료구조, 예외 처리, 입출력, 모듈과 패키지.
- **On the skill board**, only the parent shows ("Python"). Clicking it opens the list of sub-skills.
- **On a job posting**, a requirement that asks for one part of a skill shows the sub-skill up front: "Python · 데이터 분석". Only activities with that sub-skill count towards it.
- A topic that belongs to a bigger skill is a sub-skill of it, not a skill of its own:
  - "Python 자료구조" → sub-skill **자료구조** under **Python** (not the 자료구조 skill).
  - "STL Algorithm" → sub-skill **STL** under **C++** (not the 알고리즘 skill).

## 4. Projects

- A project comes from a 과제 제출물 where the student built something (code or a system).
- These are **not** projects and are left out: reports, proposals, mentoring forms, certificates, quizzes, and environment-setup tasks.
- Several hand-ins of the same work are one project (a mid-term and final hand-in → the final one only).
- Hand-ins of different work are separate projects, even when eclass numbers them as one series (Assignment #1, #2, #3 → three projects).
- **A project is named the way a 채용 공고 requirement is worded**: main skill + kind of work + "프로젝트", like the postings' "Java 백엔드 프로젝트" or "REST API 설계 및 구현 프로젝트". It is not named after the eclass title or the course. Examples: "Assignment #1 (Supervised Learning)" → **머신러닝 지도학습 구현 프로젝트**; "Programming Assignment #1: B-Tree" → **B-Tree 인덱스 구현 프로젝트**; "Practice 01~06 - 학점 계산기" → **Python 프로그램 구현 프로젝트**.
- **Pressing a project opens its tags**: 스킬 (skills used), 세부 역량 (sub-skills it reflects), 목적 (what the thing built is for), 형태 (team work, number of hand-ins) and 출처 (course, semester, original eclass title).
- A project lists the skills it used ("사용 스킬"), so job requirements like "Java 프로젝트" can match it. It is saved as one project entry, not as skill entries.
- Those used skills do appear on the skill board, linked to the project. (Open point: 자료구조 has no 주차별 학습 in the snapshot, so today it reaches the board only through its projects.)

## 5. No "unsure" items

The confirmation window never shows yellow "확인 필요" items. When the model is unsure, it must decide:

1. If the item is really part of a bigger skill → make it a **sub-skill** of that skill.
2. Otherwise → **leave it out**.

Guessed skills are left out. Examples: guessing Python because a machine-learning assignment says "implementation code"; guessing Java because a hand-in mentions JUnit; counting an environment-setup report as Python or Git experience.

## 6. Confirmation window

- Every sync ends in a confirmation window before anything is saved.
- One **전체 선택** box at the top checks or unchecks everything.
- Each entry has its own checkbox. A skill entry also has one checkbox per skill. A project entry is one unit.
- Items already imported are not offered again.

## 7. Saved activities

- Activities are not deleted. Each has a **반영** checkbox; unchecking it removes its skills from the skill board and the job checks but keeps the activity.
- **모두 해제 / 모두 선택** at the top of the activity list switches all of them at once.

## 8. Prototype limits

- eclass data is a snapshot taken on 2026-11-28, not a live connection.
- The LLM is simulated: skills are found by keyword matching, and sub-skills are written into the snapshot by hand.
- Project summaries are written from assignment titles and descriptions; the submitted files were not read.
