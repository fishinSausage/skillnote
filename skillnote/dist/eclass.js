import {extractSkills, skills} from "./catalog.js?v=18";

// Prototype data: a one-time snapshot of eclass (course names, 수업계획서 weekly topics,
// 과제 제출물 titles and dates), taken on 2026-11-28. Nothing here talks to eclass live.
// Summaries are written from assignment titles and descriptions; submitted files were not read.
//
// The rules this file follows are written down in SPEC.md at the repo root. In short:
//   수업계획서 (weekly learning) → skill entries. A skill needs no project behind it.
//   과제 제출물 (things the student built) → project entries. Reports, proposals and setup tasks are left out.
//   Anything the model is unsure about is folded into a parent skill as a sub-skill, or left out. Nothing is shown as "unsure".
const course = (key, name, term, ended, weeks, submissions, {aspects = {}, skip = []} = {}) => ({key,name,term,ended,weeks,submissions,aspects,skip});
// `name` is what a project is saved as. It is worded like a job-posting requirement ("Java 백엔드 프로젝트"):
// main skill + kind of work + "프로젝트". `title` is the original eclass assignment title.
// `purpose` says what the thing built is for; `team` marks group work. Both show as tags on the project.
const sub = (key, title, date, summary, extra = {}) => ({key,title,date,summary,...extra});

// Skills the model found in eclass that the built-in catalog does not have. They join the catalog
// when this file loads, so they are also recognised in activities the user writes by hand.
export const learnedSkills = {
  cpp:{name:"C++", pattern:/C\+\+/},
  c:{name:"C", pattern:/(?<![A-Za-z0-9+#])C(?=\s*(?:언어|소스\s*코드))/},
  ml:{name:"머신러닝", pattern:/머신\s*러닝|machine learning|(?:un)?supervised learning|지도\s*학습|\bML\b/i},
  algorithms:{name:"알고리즘", pattern:/알고리즘|\balgorithms?\b|Kruskal|shortest path/i},
  uml:{name:"UML", pattern:/\bUML\b/},
  testing:{name:"단위 테스트", pattern:/단위\s*테스트|unit test|JUnit/i},
  "data-modeling":{name:"데이터 모델링", pattern:/데이터\s*모델링|data modeling|Entity-Relationship/i}
};
for (const [id, skill] of Object.entries(learnedSkills)) skills[id] = {...skill, learned:true};

// `aspects` are sub-skills per skill. `skip` lists skills the wording would match but that are not
// skills in their own right here: they are either folded into a parent as a sub-skill or left out.
export const snapshot = {
  takenAt:"2026-11-28",
  courses:[
    course("oss-python","오픈소스SW와 파이썬 프로그래밍","2023년 1학기","2023-06-21",[
      [2,"버전 관리 시스템(VCS) · 오픈소스 소프트웨어(OSS)"],
      [3,"개발 환경 설치 · Git 구조"],
      [4,"Git 기본 사용법 · Python 함수"],
      [6,"Git 브랜치와 병합 · Python 자료구조"],
      [9,"Git 변경 이력 조회와 비교"],
      [10,"Git stash"],
      [11,"Python 예외 처리 · Git patching"],
      [12,"Git 디버깅 · Python 입출력"],
      [13,"Git submodule · Python 모듈과 패키지"],
      [14,"PEP와 Pythonic 코드"]
    ],[
      sub("report-01","Report 01 - OSS License Survey","2023-03-27","오픈소스 소프트웨어 라이선스를 조사해 보고서로 제출했다.",{project:false}),
      sub("report-02","Report 02 - Setup a programming environment","2023-03-22","Python과 Git 개발 환경을 설치하고 보고서로 제출했다.",{project:false}),
      sub("practice","Practice 01~06 - 학점 계산기","2023-06-07","Python으로 학점 계산기를 단계별로 구현해 제출했다.",{count:6, name:"Python 프로그램 구현 프로젝트", purpose:"학점을 계산해 주는 프로그램"})
    ],{
      // "Python 자료구조" is Python's built-in data structures, so it is a Python sub-skill, not the 자료구조 skill.
      skip:["data-structures"],
      aspects:{git:["기본 사용법","브랜치와 병합","변경 이력 조회","stash","patching","디버깅","submodule"], python:["함수","자료구조","예외 처리","입출력","모듈과 패키지"]}
    }),
    course("sw-project","소프트웨어프로젝트","2024년 1학기","2024-06-18",[
      [1,"Java 및 Eclipse 설치"],
      [2,"String Type · Array Type · 기본 클래스 구성 요소"],
      [3,"Static Fields, Method and Access Modifier"],
      [4,"Inheritance and Protected Access Modifier"],
      [6,"Polymorphism and Sealed Class"],
      [7,"Interface"],
      [9,"중첩 선언 및 익명 객체"],
      [14,"Oracle 설치 · 데이터베이스 구축 및 연결 · JDBC로 데이터베이스에 데이터 입력하고 읽기"]
    ],[
      sub("lab","실습 과제 1~9","2024-06-04","강의 시간에 Java로 배열, 클래스, Counter 연산 실습 문제를 풀어 java 파일을 제출했다.",{count:9, name:"Java 프로그래밍 프로젝트", purpose:"배열·클래스·Counter 연산 실습 프로그램", aspects:{java:["배열","클래스"]}})
    ],{aspects:{java:["클래스와 접근 제한자","상속","다형성","인터페이스","JDBC"]}}),
    course("data-structures","자료구조","2024년 1학기","2024-06-30",[],[
      sub("hw-1","자료구조 1차 과제","2024-05-02","자료구조 과제로 동적 어레이와 연결리스트를 구현하고 시간·공간 복잡도를 비교했다.",{name:"자료구조 구현 및 성능 비교 프로젝트", purpose:"동적 배열과 연결 리스트의 시간·공간 복잡도 비교", aspects:{"data-structures":["동적 배열","연결 리스트","복잡도 분석"]}}),
      sub("hw-2","자료구조 2차 과제","2024-05-27","자료구조 과제로 주어진 C 소스코드의 TODO를 완성해 BST와 TRIE 트리를 구현했다.",{name:"C 트리 자료구조 구현 프로젝트", purpose:"BST와 Trie 구현", aspects:{"data-structures":["BST","Trie"]}}),
      sub("hw-3","자료구조 3차 과제","2024-06-29","자료구조 과제로 Kruskal 방법과 shortest path 문제의 소스코드를 작성하고 풀이를 보고서로 제출했다.",{name:"그래프 알고리즘 구현 프로젝트", purpose:"Kruskal 최소 신장 트리와 최단 경로 풀이", aspects:{"data-structures":["그래프"], algorithms:["Kruskal","최단 경로"]}})
    ]),
    course("oop","객체지향프로그래밍","2024년 2학기","2024-12-17",[
      [1,"Course Overview · C++ Introduction"],
      [2,"C++ Introduction · Introduction to OOP"],
      [3,"Data Abstraction"],
      [4,"Class (Basics)"],
      [5,"Class (Advanced)"],
      [6,"Inheritance"],
      [7,"Polymorphism"],
      [9,"Polymorphism (case study: bank account)"],
      [10,"Template"],
      [11,"STL (Standard Template Library) Introduction"],
      [12,"STL Containers · Iterators"],
      [13,"STL Algorithm"],
      [14,"UML Introduction"],
      [15,"Team Project Presentation"]
    ],[
      sub("projects","Project 1~4","2024-12-08","팀을 구성해 객체지향프로그래밍 수업의 C++ 과제를 네 차례 제출했다.",{count:4, name:"C++ 객체지향 팀 프로젝트", team:true})
    ],{
      // "STL Algorithm" is the C++ library, so STL is a C++ sub-skill. A presentation week is not a skill.
      skip:["algorithms","project-delivery"],
      aspects:{oop:["데이터 추상화","클래스","상속","다형성"], cpp:["클래스","템플릿","STL"]}
    }),
    course("db-design","데이타베이스설계","2024년 2학기","2024-12-17",[
      [2,"Preliminary: B+ tree"],
      [4,"Database and DBMS Concepts and Architecture"],
      [5,"Data Modeling using Entity-Relationship (ER) Approach"],
      [6,"Relational Data Model"],
      [7,"ER to Relational Model"],
      [9,"Relational Algebra & Calculus"],
      [10,"SQL: Data Definition Language"],
      [11,"SQL: Data Manipulation Language"],
      [12,"ESQL & SQL Practice"],
      [13,"Database Design Process"],
      [14,"Functional Dependencies and Normalization"],
      [15,"Transaction Management & Concurrency Control"]
    ],[
      sub("pa-1","Programming Assignment #1: B-Tree","2024-10-05","B-Tree 자료구조를 구현해 제출했다.",{name:"B-Tree 인덱스 구현 프로젝트", purpose:"데이터베이스 인덱스용 B-Tree 구현", aspects:{"data-structures":["B-Tree"]}}),
      sub("pa-2","Programming Assignment #2: RDB for Library Management System","2024-12-10","도서관 관리 시스템용 관계형 데이터베이스(RDB)를 설계·구현하고 보고서를 제출했다.",{name:"관계형 데이터베이스 설계 및 구현 프로젝트", purpose:"도서관 관리 시스템의 데이터 관리", aspects:{rdbms:["스키마 설계"]}})
    ],{aspects:{sql:["DDL","DML","ESQL"], "data-modeling":["ER 모델","관계형 모델 변환"]}}),
    course("se","소프트웨어공학","2025년 1학기","2025-06-17",[
      [2,"Software Development Process · UML Overview · Class Diagram"],
      [3,"Sequence Diagram"],
      [4,"OOAD Introduction · Iterative, Evolutionary and Agile"],
      [5,"Class 다이어그램 모델링 실습 · Use Cases"],
      [6,"Use Case Diagram"],
      [7,"Quality Requirements · Operation Contract · OOP Review"],
      [9,"Logical Architecture · MVC"],
      [10,"GRASP · Object Design · Unit Test Introduction"],
      [11,"SOLID Principles · Verification and Validation"],
      [12,"Exception Handling · Test Coverage for White Box Testing"],
      [13,"Bug Triage Research"]
    ],[
      // The mid-term hand-in is the same project as the final one, so only the final counts.
      sub("term-mid","Term Project 중간 제출","2025-05-10","팀별 안내서에 따라 중간 결과물을 제출했다.",{project:false}),
      sub("term-final","Term Project 최종 제출","2025-06-04","동영상, 모든 소스코드와 JUnit 테스트 코드, 문서, 발표자료를 팀으로 제출했다.",{name:"소프트웨어 설계 및 테스트 팀 프로젝트", team:true, purpose:"설계 문서, 소스코드, JUnit 테스트를 갖춘 학기 프로젝트", aspects:{testing:["JUnit"]}})
    ],{aspects:{uml:["클래스 다이어그램","시퀀스 다이어그램","유스케이스 다이어그램"], testing:["단위 테스트","화이트박스 테스트 커버리지"]}}),
    course("ml","머신러닝","2026년 1학기","2026-06-23",[
      [2,"Probability and estimation"],
      [3,"Classification"],
      [4,"Regression"],
      [5,"Generalization · regularization"],
      [6,"SVMs · ensemble methods"],
      [7,"Deep learning · convolutional neural networks"],
      [9,"Machine learning applications"],
      [10,"Unsupervised learning · clustering"],
      [11,"Dimension reduction · recommender systems"],
      [12,"Semi-supervised learning · outlier detection"],
      [13,"Recurrent neural networks · transformers"]
    ],[
      sub("assignment-1","Assignment #1 (Supervised Learning)","2026-04-28","구현 코드와 실험 설정·결과를 설명한 PDF를 제출했다.",{name:"머신러닝 지도학습 구현 프로젝트", purpose:"지도학습 알고리즘 구현과 실험", aspects:{ml:["지도학습"]}}),
      sub("assignment-2","Assignment #2 (Unsupervised Learning)","2026-05-21","구현 코드와 실험 설정·결과를 설명한 PDF를 제출했다.",{name:"머신러닝 비지도학습 구현 프로젝트", purpose:"비지도학습 알고리즘 구현과 실험", aspects:{ml:["비지도학습"]}}),
      sub("assignment-3","Assignment #3 (ML Challenge)","2026-06-21","안내 자료에 따라 최종 과제의 구현 결과를 제출했다.",{name:"머신러닝 모델 구현 프로젝트", purpose:"ML Challenge 최종 과제"})
    ],{aspects:{ml:["분류","회귀","SVM·앙상블","딥러닝·CNN","클러스터링","차원 축소"]}}),
    course("capstone-1","캡스톤디자인(1)","2026년 2학기","2026-11-19",[],[
      sub("proposal","프로젝트 제안서 제출","2026-09-14","팀별 제안서(PDF)를 제출했다.",{project:false}),
      sub("mentoring","1·2차 멘토링 보고서","2026-10-28","멘토링 보고서 양식에 맞춰 작성해 제출했다.",{count:2, project:false})
    ])
  ]
};

// Seam 1: where a real eclass connection would go. It must return the same shape as `snapshot`.
export async function fetchEclass() {
  return snapshot;
}

// Seam 2: stand-in for the LLM. A real model returns the same shape: [{id, trigger, excerpt, aspects}],
// already following SPEC.md (unsure items folded into a parent skill or left out).
export async function llmExtract(text, {aspects = {}, skip = []} = {}) {
  return extractSkills(text).filter(match => !skip.includes(match.id)).map(match => ({...match, aspects:aspects[match.id] || []}));
}

const noon = date => Date.parse(date + "T12:00:00+09:00");

// Builds the list the confirmation window shows. `existing` holds activity ids that are already saved.
// Each item is one of the two entry types: "skill" (from 수업계획서) or "project" (from 과제 제출물).
export async function proposeSync(existing) {
  const {courses, takenAt} = await fetchEclass();
  const items = [];
  let empty = 0;
  let known = 0;
  for (const c of courses) {
    const group = [];
    if (c.weeks.length) {
      const text = c.weeks.map(([week,topic]) => week + "주차: " + topic).join("\n");
      group.push({id:"eclass-" + c.key + "-syllabus", type:"syllabus", title:"주차별 학습", created:noon(c.ended), text, project:false,
        count:c.weeks.length, matches:await llmExtract(text, c)});
    }
    for (const s of c.submissions) {
      if (s.project === false) { empty++; continue; }
      // The word "프로젝트" in the name must not turn into the 프로젝트 기능 완성 skill.
      const text = s.name + ": " + s.summary;
      group.push({id:"eclass-" + c.key + "-" + s.key, type:"submission", title:s.name, origin:s.title, purpose:s.purpose || "", team:s.team === true, created:noon(s.date), text, project:true,
        count:s.count || 1, matches:await llmExtract(text, {...s, skip:["project-delivery"]})});
    }
    for (const item of group) {
      if (item.type === "syllabus" && !item.matches.length) empty++;
      else if (existing.has(item.id)) known++;
      else items.push({...item, course:c.name, term:c.term, include:true, selected:new Set(item.matches.map(match => match.id))});
    }
  }
  return {items, empty, known, takenAt};
}
