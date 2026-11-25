const dataBook = ["혼자 공부하는 데이터 분석 with 파이썬", "https://lms.hanbit.co.kr/books/B1666992199?code=B1666992199"];
const dataClass = ["박해선의 데이터 분석 기초 강의", "https://lms.hanbit.co.kr/product/C1357921607"];
const pycon = ["파이콘 한국 · 임상심리에서의 파이썬", "https://2022.pycon.kr/program/talks/41"];
const feconf = ["FEConf · React 바깥의 프론트엔드", "https://2023.feconf.kr/"];

// Each guide keeps its titles, tasks and deliverables available without a connection.
export const skills = {
  python: {
    name: "Python", pattern: /(?<![a-z0-9])python(?:3)?(?![a-z0-9])|파이[썬선]/i,
    goal: "반복하는 작업을 함수로 나누고 파일을 읽고 쓰는 연습을 해보세요.",
    resources: [
      [...dataBook, "도서관 데이터를 불러오는 예제를 따라 하며 변수와 데이터프레임을 익히세요."],
      ["Harvard CS50P · Python 입문", "https://cs50.harvard.edu/python/", "함수와 반복문 강의를 듣고, 같은 작업을 여러 파일에 적용해 보세요. 영어 강의입니다."],
      [...pycon, "심리평가 보고서를 자동화한 과정을 보고, 내 일상에서 반복하는 일 하나를 고르세요."]
    ],
    project: ["동아리 출석 집계 자동화", "회차별 출석 CSV를 읽어 회원별 출석률을 계산하세요. 같은 이름과 빈 행을 처리하는 규칙도 정해 보세요.", "실행 가능한 Python 스크립트, 출석 기록 CSV, 실행 방법을 적은 README"]
  },
  clean: {
    name: "데이터 정제", pattern: /결[측손]치|누락값|중복\s*(?:값\s*)?(?:제거|삭제)|(?:데이터|자료)\s*(?:정제|전처리|클리닝)|전처리|data\s*clean(?:ing)?|missing\s+(?:values?|data)|dropna|fillna/i,
    goal: "누락되거나 중복된 값을 찾고, 처리 기준을 설명하는 연습을 해보세요.",
    resources: [
      [...dataBook, "데이터 정제 부분에서 빈 값과 중복 행을 찾는 방법을 따라 해보세요."],
      [...dataClass, "5·6강에서 불필요한 행 삭제와 잘못된 값 수정을 실습하세요."],
      [...pycon, "실제 검사 결과가 그래프가 되기 전에 어떤 전처리를 거치는지 살펴보세요."]
    ],
    project: ["설문 데이터 정제 노트북", "익명 설문 응답에서 중복 응답과 누락값을 찾고, 삭제와 대체 중 하나를 선택한 이유를 적으세요.", "정제 전후 행 수 비교표, 재실행 가능한 노트북, 처리 기준 세 가지"]
  },
  sql: {
    name: "SQL", pattern: /(?<![a-z0-9])sql(?![a-z0-9])|에스큐엘|(?:select|join|group by)\s+\w+|쿼리\s*(?:작성|실행)/i,
    goal: "여러 테이블을 연결하고, 질문에 답하는 집계 쿼리를 작성해 보세요.",
    resources: [
      ["혼자 공부하는 SQL", "https://hongong.hanbit.co.kr/sql/", "SELECT로 필요한 행을 고른 뒤 GROUP BY와 JOIN 예제를 순서대로 풀어 보세요."],
      ["우재남의 SQL 기초 강의", "https://lms.hanbit.co.kr/product/C7579723266", "조건 검색과 테이블 조인 강의를 보고 다른 데이터로 쿼리를 직접 실행해 보세요."],
      ["PostgreSQL Meetup Seoul · 성능 구현", "https://www.youtube.com/watch?v=zu9xYh-dYWI", "쿼리 성능을 살피는 실무 관점을 듣고, 내 쿼리에서 확인할 점 하나를 적으세요."]
    ],
    project: ["캠퍼스 도서관 대출 분석", "도서와 대출 기록을 두 테이블로 구성하세요. 월별 대출 수, 인기 분야, 재대출 비율을 SQL로 구하고 발견한 점을 설명하세요.", "테이블 스키마, SQL 쿼리 3개, 결과표와 해석을 담은 README"]
  },
  js: {
    name: "JavaScript", pattern: /(?<![.a-z0-9])(?:javascript|js)(?![a-z0-9])|자바\s*스크립트/i,
    goal: "이벤트에 반응해 화면과 데이터를 함께 갱신하는 연습을 해보세요.",
    resources: [
      ["혼자 공부하는 자바스크립트", "https://hongong.hanbit.co.kr/자바스크립트/", "배열 메서드와 문서 객체 조작 예제를 이용해 검색 결과 목록을 만드세요."],
      ["생활코딩 · WEB2 JavaScript", "https://opentutorials.org/course/3085", "이벤트와 조건문 수업을 보고 버튼을 눌렀을 때 화면을 바꿔 보세요."],
      [...feconf, "발표에서 소개하는 프론트엔드 도구를 살펴보고, 작은 화면을 구현하는 데 필요한 기능을 구분해 보세요."]
    ],
    project: ["학과 행사 검색 도구", "행사 배열에서 검색어와 학년을 기준으로 결과를 거르세요. 결과가 비었을 때 보여 줄 화면도 만드세요.", "작동하는 페이지, 필터 함수 코드, 검색 전후 화면 두 장"]
  },
  react: {
    name: "React", pattern: /(?<![a-z0-9])react(?:\.js|js)?(?![a-z0-9])|리액트/i,
    goal: "컴포넌트를 나누고, 사용자의 선택을 상태로 관리해 보세요.",
    resources: [
      ["The Road to React", "https://www.roadtoreact.com/", "컴포넌트와 상태 예제에서 입력값이 목록에 반영되는 과정을 따라가세요. 영문 도서입니다."],
      ["Scrimba · Learn React", "https://scrimba.com/learn-react-c0e", "강의 속 프로젝트에서 props와 state를 바꿔 화면 변화를 확인하세요. 영어 강의입니다."],
      [...feconf, "React가 적합한 문제를 구분하는 사례를 듣고 프로젝트의 도구 선택 이유를 적으세요."]
    ],
    project: ["나만의 수강 계획표", "강의 목록과 시간표를 각각 컴포넌트로 나누고, 강의를 선택하거나 빼면 시간표가 갱신되도록 만드세요.", "실행 가능한 수강 계획표, 컴포넌트 구조도, 상태 관리 방식을 설명한 README"]
  },
  git: {
    name: "Git", pattern: /(?<![a-z0-9])git(?:hub|lab)?(?![a-z0-9])|깃허브|깃헙|깃랩|브랜치|풀\s*리퀘스트|pull request/i,
    goal: "작은 변경을 커밋하고, 브랜치에서 검토를 거쳐 병합하는 과정을 익히세요.",
    resources: [
      ["Pro Git 한국어판", "https://git-scm.com/book/ko/v2", "Git 기초와 브랜치 장을 읽고 변경 이력을 짧은 커밋으로 남겨 보세요."],
      ["생활코딩 · 지옥에서 온 Git", "https://edu.goorm.io/lecture/12948/생활코딩-지옥에서-온-git", "브랜치를 만들고 병합하는 과정을 실습한 뒤 로그로 확인하세요."],
      ["공개SW 특강 · GitHub를 통한 협업", "https://skb.skku.edu/swuniv/notice.do?articleNo=200733&mode=view", "지난 특강의 협업 주제를 참고해 프로젝트에 적용할 리뷰 절차를 적어 보세요."]
    ],
    project: ["팀 프로젝트의 변경 이력 남기기", "이슈를 하나 열고 별도 브랜치에서 수정하세요. 풀 리퀘스트에 변경 이유를 설명하고 검토 후 병합하세요.", "이슈와 PR 링크, 읽기 쉬운 커밋 세 개, 리뷰 반영 기록"]
  },
  api: {
    name: "REST API", pattern: /(?<![a-z0-9])rest(?:ful)?\s*api(?![a-z0-9])|레스트\s*API|(?:GET|POST|PATCH|DELETE)\s+\/[a-z]+/i,
    goal: "리소스와 HTTP 메서드를 정하고, 요청과 응답 형식을 문서로 남겨 보세요.",
    resources: [
      ["RESTful Web APIs", "https://www.crummy.com/writing/RESTful-Web-APIs/", "리소스 표현과 HTTP 메서드를 읽고 작은 서비스의 리소스 목록을 만드세요. 영문 도서입니다."],
      [...dataClass, "3강의 API 데이터 수집 실습으로 요청 URL과 응답 형식을 확인하세요."],
      ["DEVIEW · 그런 REST API로 괜찮은가", "https://www.youtube.com/watch?v=RP_f5dMoHFc", "REST의 제약을 듣고 내 API 문서에 반영할 점을 정리하세요."]
    ],
    project: ["동아리 비품 대여 API", "비품 목록 조회, 대여 등록, 반납을 설계하고 구현하세요. 없는 비품을 요청했을 때의 응답도 정하세요.", "엔드포인트 명세, 실행 가능한 서버, 성공·실패 요청과 응답 기록"]
  },
  viz: {
    name: "데이터 시각화", pattern: /시각화|(?:막대|선|산점)\s*(?:그래프|도표)|matplotlib|seaborn|data\s*visuali[sz]ation/i,
    goal: "질문에 맞는 그래프를 고르고, 축과 단위를 읽기 쉽게 표현해 보세요.",
    resources: [
      [...dataBook, "데이터 시각화 장에서 분포와 추세에 적합한 차트를 비교하세요."],
      [...dataClass, "9·10강을 보며 같은 데이터를 선 그래프와 막대그래프로 각각 그려 보세요."],
      [...pycon, "검사 결과를 그래프로 표현한 사례에서 독자가 먼저 읽어야 할 정보를 찾아보세요."]
    ],
    project: ["도서관 이용 패턴 시각화", "도서관 방문 기록을 요일별로 집계하고 혼잡한 시간대를 그래프로 보여 주세요.", "축과 단위가 있는 그래프 두 개, 원본 데이터 설명, 결과 해석 세 문장"]
  },
  java: {name:"Java", pattern:/(?<![a-z0-9])java(?![a-z0-9])|자바(?!\s*스크립트)/i},
  kotlin: {name:"Kotlin", pattern:/\bKotlin\b|코틀린/i},
  spring: {name:"Spring", pattern:/\bSpring\b(?![ -]*Boot)|스프링(?!\s*부트)/i},
  "spring-boot": {name:"Spring Boot", pattern:/\bSpring[ -]*Boot\b|스프링\s*부트/i},
  oop: {name:"객체지향 프로그래밍", pattern:/객체\s*지향|\bOOP\b/i},
  "data-structures": {name:"자료구조", pattern:/자료\s*구조|data structures?|해시맵|\bHashMap\b/i},
  mysql: {name:"MySQL", pattern:/\bMySQL\b|마이\s*에스큐엘/i},
  http: {name:"HTTP", pattern:/\bHTTP(?:S)?\b|HTTP\s*상태\s*코드/i},
  typescript: {name:"TypeScript", pattern:/\bTypeScript\b|타입\s*스크립트/i},
  nextjs: {name:"Next.js", pattern:/\bNext\.?js\b|넥스트\s*제이에스/i},
  fastapi: {name:"FastAPI", pattern:/\bFastAPI\b|패스트\s*API/i},
  django: {name:"Django", pattern:/\bDjango\b|장고/i},
  rdbms: {name:"관계형 데이터베이스", pattern:/RDBMS|관계형\s*(?:DB|데이터베이스)|MySQL|PostgreSQL|SQLite|MariaDB/i},
  excel: {name:"Excel", pattern:/\bExcel\b|엑셀/i},
  sheets: {name:"Google Sheets", pattern:/Google\s*Sheets|구글\s*(?:시트|스프레드시트)/i},
  html: {name:"HTML", pattern:/\bHTML(?:5)?\b/i},
  css: {name:"CSS", pattern:/\bCSS(?:3)?\b/i},
  responsive: {name:"반응형 웹", pattern:/반응형|responsive\s*(?:web|design|layout)/i},
  "web-operation": {name:"웹 서비스 운영", pattern:/웹\s*(?:서비스|앱|사이트)|web\s*(?:service|app|site)/i},
  "project-delivery": {name:"프로젝트 기능 완성", pattern:/프로젝트|팀\s*과제|\bproject\b/i},
  "code-verification": {name:"AI 코드 검증", pattern:/(?:AI|Claude|Codex|ChatGPT|Cursor)[^.!?\n]{0,36}(?:코드|code)|(?:코드|code)[^.!?\n]{0,36}(?:AI|Claude|Codex|ChatGPT|Cursor)/i},
  "ai-tools": {name:"생성형 AI 활용", pattern:/Claude|ChatGPT|클로드|Codex|Cursor|생성형\s*AI/i},
  "sql-join": {name:"SQL JOIN", pattern:/\bJOIN\b|조인/i},
  subquery: {name:"SQL 서브쿼리", pattern:/서브\s*쿼리|하위\s*쿼리|\bsubquer(?:y|ies)\b/i},
  cte: {name:"SQL CTE", pattern:/\bCTE\b|\bWITH\s+\w+\s+AS\b/i},
  "query-filter": {name:"쿼리 조건 검증", pattern:/필터\s*조건|쿼리\s*조건|WHERE\s*절/i},
  "join-key": {name:"조인 키 검증", pattern:/조인\s*(?:키|조건)|join\s*keys?/i}
};

const codeWork = /구현|개발|작성|만들|개선|설계|built|developed|implemented/i;
const backend = /백엔드|서버|\bAPI\b|backend/i;
const frontend = /프론트엔드|화면|컴포넌트|frontend/i;
const sqlWork = /SQL|쿼리|조회|집계|SELECT/i;
const verified = /검증|테스트|검토|비교|추적|오류|원인|확인/i;

const check = (id, title, practice, {skill = id, mode = "skill", guide = "", patterns = []} = {}) =>
  [id,title,patterns,practice,guide,mode,skill];
const eligible = (id, title) => [id,title,[],"","","eligibility"];
const group = (id,title,operator,...options) => ({id,title,operator,options});
const single = option => ({id:option[0],options:[option]});

const postingCriteria = {
  "redblue-375632": {
    groups:[
      {id:"career", title:"지원 경력", operator:"xor", options:[
        ["entry","신입",[],"","","eligibility"],
        ["backend-career","백엔드 경력 3년 이하",[],"","","eligibility"]
      ]},
      {id:"language", title:"프로그래밍 경험", operator:"xor", options:[
        ["java","Java 프로젝트",[],"Java로 동아리 예약 기능을 구현하고 주요 로직과 테스트를 남기세요.","","project"],
        ["kotlin","Kotlin 프로젝트",[],"Kotlin으로 동아리 예약 기능을 구현하고 주요 로직과 테스트를 남기세요.","","project"]
      ]},
      {id:"framework", title:"프레임워크 경험", operator:"xor", options:[
        ["spring","Spring 프로젝트",[],"Spring으로 예약 등록과 취소 기능을 만들고 실행 방법을 적으세요.","api","project"],
        ["spring-boot","Spring Boot 프로젝트",[],"Spring Boot로 예약 등록과 취소 API를 만들고 요청·응답을 문서화하세요.","api","project"]
      ]},
      {id:"fundamentals", title:"개발 기본기", operator:"and", options:[
        ["oop","객체지향 프로그래밍",[],"센터와 회원, 예약의 책임을 클래스로 나누고 역할을 설명하세요.","","skill"],
        ["data-structures","자료구조",[],"예약 검색에 사용할 리스트나 해시맵을 비교하고 선택 이유를 적으세요.","","skill"]
      ]},
      {id:"database", title:"데이터베이스 기본기", operator:"and", options:[
        ["mysql","MySQL",[],"MySQL에서 센터·회원·예약 테이블과 관계를 정의하세요.","sql","skill"],
        ["sql","SQL",[],"센터별 예약 건수와 취소율을 SQL로 집계하세요.","sql","skill"]
      ]},
      {id:"web", title:"웹 기본기", operator:"and", options:[
        ["http","HTTP",[],"예약 조회와 생성에 맞는 HTTP 메서드 및 상태 코드를 설명하세요.","api","skill"],
        ["api","REST API",[],"예약 등록·조회·취소의 REST API 요청과 응답을 설계하세요.","api","skill"]
      ]},
      {id:"version-control", options:[
        ["git","Git",[],"작업 브랜치에서 변경 사항을 커밋하고 팀원 리뷰를 받아 병합해 보세요.","git","skill"]
      ]}
    ],
    interview:[
      "새로운 기술과 업무 분야를 적극적으로 배우고 적용할 수 있는 분",
      "직접 작성한 코드와 기술을 선택한 이유를 동료에게 설명할 수 있는 분",
      "동료의 피드백을 열린 태도로 받아들이고 함께 성장할 수 있는 분"
    ]
  },
  "binulabs-398515": {
    employment:"정규직 전환형 인턴 6개월",
    groups:[
      single(eligible("related-degree","컴퓨터공학 또는 관련 전공 학사 이상")),
      single(check("web-operation","웹 서비스 제작·운영 프로젝트","웹 서비스를 배포하고 운영 중 발생한 문제와 해결 과정을 기록하세요.",{mode:"project",patterns:[codeWork,/배포|운영|deployed/i]})),
      group("fullstack","웹 화면과 서버 개발 경험","xor",
        check("fullstack-js","JavaScript 풀스택 프로젝트","JavaScript로 캠퍼스 일정 화면과 저장 API를 함께 구현하세요.",{skill:"js",mode:"project",guide:"js",patterns:[frontend,backend,codeWork]}),
        check("fullstack-ts","TypeScript 풀스택 프로젝트","TypeScript로 캠퍼스 일정 화면과 저장 API를 함께 구현하세요.",{skill:"typescript",mode:"project",guide:"js",patterns:[frontend,backend,codeWork]})),
      single(check("code-verification","AI가 만든 코드 이해 및 검증","AI가 작성한 함수의 의도를 설명하고 경계 조건을 테스트하세요.",{patterns:[verified]})),
      group("database","데이터베이스 기본기","and",
        check("rdbms","관계형 데이터베이스","게시글과 댓글을 테이블로 나누고 관계를 설명하세요.",{guide:"sql"}),
        check("sql","SQL","게시글별 댓글 수를 SQL로 계산하세요.",{guide:"sql"}))
    ],
    interview:[
      "기술적인 내용을 다른 직군의 동료도 이해할 수 있게 말과 글로 설명할 수 있는 분"
    ]
  },
  "beautyselection-396487": {
    employment:"전환형 인턴 3개월",
    groups:[
      group("academic-status","학적 조건","xor",
        eligible("leave","대학 휴학생"),eligible("graduate","대학 졸업생"),eligible("graduating","대학 졸업 예정자")),
      group("spreadsheets","스프레드시트와 원본 데이터 정리","and",
        check("excel","Excel","Excel에서 채널별 판매 파일을 합치고 날짜 형식을 통일하세요.",{guide:"clean"}),
        check("sheets","Google Sheets","Google Sheets에서 채널별 판매 자료를 집계하세요.",{guide:"clean"}),
        check("clean","원본 데이터 구조화","누락값과 중복 행을 확인하고 상품 코드 형식을 통일하세요.",{guide:"clean"})),
      group("analysis-tools","데이터 분석 도구 기본기","xor",
        check("sql","SQL","SQL로 채널별 월간 매출을 집계하세요.",{guide:"sql"}),
        check("python","Python","Python으로 채널별 월간 매출을 집계하세요.",{guide:"python"})),
      single(check("ai-tools","업무에서 AI 도구 활용","Claude나 ChatGPT로 분석 요약을 작성하고 원본 수치와 대조하세요.",{patterns:[/분석|리포트|정제|요약|업무/i]}))
    ],
    interview:[
      "뷰티 브랜드와 제품이 주목받는 이유에 관심을 갖고 성분이나 제형을 살펴보는 분",
      "판매 수치와 고객 리뷰, 경쟁사 동향을 함께 살펴보고 변화의 이유를 설명할 수 있는 분",
      "분석 결과를 바탕으로 사업부가 실행할 수 있는 방안을 제안할 수 있는 분"
    ]
  },
  "opensurvey-394433": {
    groups:[
      group("degree","컴퓨터 관련 학과 학사","xor",
        eligible("graduate","학사 학위 보유"),eligible("graduating","졸업 예정")),
      group("jvm-backend","백엔드 개발 경험","xor",
        check("java","Java 백엔드 프로젝트","Java로 설문 응답 등록·집계 API를 구현하세요.",{mode:"project",patterns:[backend,codeWork]}),
        check("kotlin","Kotlin 백엔드 프로젝트","Kotlin으로 설문 응답 등록·집계 API를 구현하세요.",{mode:"project",patterns:[backend,codeWork]})),
      group("backend-fundamentals","백엔드 개발 기본기","and",
        check("http","HTTP","설문 조회의 HTTP 요청과 성공·실패 응답을 정의하세요.",{guide:"api"}),
        check("sql","SQL","설문 문항별 응답 수를 SQL로 집계하세요.",{guide:"sql"}),
        check("git","Git","작업 브랜치에서 기능을 구현하고 커밋 이력을 남기세요.",{guide:"git"})),
      single(check("own-project","팀·개인 프로젝트에서 맡은 기능 완성","맡은 기능의 범위와 최종 구현 내용을 README에 정리하세요.",{skill:"project-delivery",mode:"project",patterns:[/맡|담당/i,codeWork]}))
    ],
    interview:[
      "직접 구현한 기능과 기술을 선택한 이유, 문제를 해결한 과정을 설명할 수 있는 분"
    ]
  },
  "wantedlab-387428": {
    employment:"단기형 인턴 1년",
    groups:[
      single(check("join","SQL JOIN으로 여러 테이블 연결","이벤트와 사용자 테이블을 조인해 실험군별 행동을 집계하세요.",{skill:"sql-join",guide:"sql",patterns:[sqlWork]})),
      group("query-aggregation","SQL 집계 단계 분리","xor",
        check("subquery","서브쿼리","서브쿼리로 실험 대상을 먼저 추출한 뒤 전환율을 집계하세요.",{guide:"sql",patterns:[sqlWork]}),
        check("cte","CTE","CTE로 대상 추출과 집계를 나누고 단계별 행 수를 확인하세요.",{guide:"sql",patterns:[sqlWork]})),
      group("query-debugging","쿼리 결과 불일치 원인 추적","and",
        check("query-filter","쿼리 조건 검증","필터를 하나씩 바꿔 예상 결과와 달라진 조건을 찾으세요.",{guide:"sql",patterns:[verified]}),
        check("join-key","조인 키 검증","조인 키별 행 수를 비교해 중복 집계 원인을 찾으세요.",{guide:"sql",patterns:[verified]})),
      group("ai-work","AI 도구 활용 경험","and",
        check("ai-sql","AI로 SQL 작성","AI가 작성한 쿼리 결과를 검증하고 수정 내용을 기록하세요.",{skill:"ai-tools",guide:"sql",patterns:[sqlWork,codeWork]}),
        check("ai-docs","AI로 작업 문서 정리","AI로 분석 절차 초안을 만들고 실제 작업 순서와 대조하세요.",{skill:"ai-tools",patterns:[/문서|README/i]}),
        check("ai-automation","AI로 반복 업무 자동화","반복 분석을 스크립트로 자동화하고 AI의 기여와 검증 과정을 적으세요.",{skill:"ai-tools",patterns:[/자동화|automat/i]}))
    ],
    interview:[
      "직접 한 작업을 다른 사람도 이해할 수 있도록 글로 정리할 수 있는 분",
      "여러 요청을 동시에 맡아도 무엇을 먼저 할지 정하고 진행 상황을 스스로 관리할 수 있는 분"
    ]
  },
  "atci-348483": {
    groups:[
      group("frontend","프론트엔드 개발 경험","xor",
        check("react","React 프론트엔드 프로젝트","React로 파일 목록과 필터 화면을 구현하세요.",{mode:"project",guide:"react",patterns:[frontend,codeWork]}),
        check("nextjs","Next.js 프론트엔드 프로젝트","Next.js로 파일 목록과 상세 화면을 구현하세요.",{mode:"project",guide:"react",patterns:[frontend,codeWork]})),
      group("backend","Python 백엔드 개발 경험","xor",
        check("fastapi","FastAPI 백엔드 프로젝트","FastAPI로 파일 등록과 조회 API를 개발하세요.",{mode:"project",guide:"python",patterns:[backend,codeWork]}),
        check("django","Django 백엔드 프로젝트","Django로 파일 등록과 조회 API를 개발하세요.",{mode:"project",guide:"python",patterns:[backend,codeWork]})),
      single(check("rest","REST API 설계 및 구현 프로젝트","파일 등록·조회·삭제 API의 요청과 오류 응답을 설계하고, 같은 프로젝트에서 구현한 결과를 기록하세요.",{
        skill:"api",mode:"project",guide:"api",patterns:[/설계|design/i,/구현|개발|만들|built|developed|implemented/i]
      })),
      group("language","웹 프로그래밍 언어 활용","xor",
        check("js","JavaScript","JavaScript로 파일 목록 필터를 작성하세요.",{guide:"js"}),
        check("typescript","TypeScript","TypeScript로 파일 목록 필터를 작성하세요.",{guide:"js"})),
      single(check("git","Git","작업 브랜치에서 변경 사항을 커밋하고 리뷰를 받아 병합하세요.",{guide:"git"})),
      single(check("rdbms","관계형 데이터베이스 (PostgreSQL 등)","파일과 사용자 테이블의 관계를 정의하세요.",{guide:"sql"})),
      group("responsive","웹 화면 기본기","and",
        check("html","HTML","파일 목록의 HTML 구조를 작성하세요."),
        check("css","CSS","파일 목록의 여백과 열 배치를 CSS로 조정하세요."),
        check("responsive","반응형 웹","휴대폰과 데스크톱에서 목록의 열 수가 바뀌도록 구현하세요."))
    ],
    interview:[
      "문제를 직접 해결하고 새로운 기술을 배우려는 의지가 있는 분",
      "팀원과 원활하게 소통하며 협업할 수 있는 분"
    ]
  }
};

export const jobs = [
  {
    id:"redblue-375632", company:"레드블루", mark:"R", color:"coral",
    role:"[바디코디] Backend Engineer (신입·주니어)", field:"백엔드", type:"신입·주니어", place:"서울 서초구",
    deadline:"2026-11-27", sourceUrl:"https://recruit.wanted.co.kr/wd/375632", tags:["sql","api","git"],
    description:"피트니스 운영 서비스의 예약, 결제, 정산 기능을 개발합니다. Spring 기반 API와 배치 작업을 다루고, MySQL 데이터 처리와 코드 리뷰에 참여합니다."
  },
  {
    id:"binulabs-398515", company:"비누랩스", mark:"B", color:"violet",
    role:"에브리타임 웹 개발 인턴", field:"프론트엔드", type:"전환형 인턴", place:"서울 마포구",
    deadline:"2026-12-16", sourceUrl:"https://recruit.wanted.co.kr/wd/398515", tags:["js","sql"],
    description:"에브리타임의 새 기능을 기획자·디자이너와 함께 만듭니다. JavaScript와 TypeScript로 웹 화면과 서버 기능을 개발하며 테스트와 배포에도 참여합니다."
  },
  {
    id:"beautyselection-396487", company:"뷰티셀렉션", mark:"B", color:"rose",
    role:"바이오던스 데이터 애널리스트 인턴", field:"데이터", type:"전환형 인턴", place:"서울 강남구",
    deadline:null, sourceUrl:"https://recruit.wanted.co.kr/wd/396487", tags:["sql","python","clean","viz"],
    description:"사업부의 데이터를 정리하고 시각화해 의사결정을 지원합니다. SQL 또는 Python의 기초를 활용하고 반복되는 분석 작업의 자동화에 참여합니다."
  },
  {
    id:"opensurvey-394433", company:"오픈서베이", mark:"O", color:"sea",
    role:"백엔드 엔지니어 (신입)", field:"백엔드", type:"신입", place:"서울 강남구",
    deadline:null, sourceUrl:"https://recruit.wanted.co.kr/wd/394433", tags:["sql","git"],
    description:"소비자 반응을 비교하는 분석 서비스의 API와 데이터 처리 시스템을 개발합니다. Java 또는 Kotlin 프로젝트 경험과 HTTP, SQL, Git 기초를 봅니다."
  },
  {
    id:"wantedlab-387428", company:"원티드랩", mark:"W", color:"ocean",
    role:"AI기술팀 데이터 분석가 인턴", field:"데이터", type:"인턴", place:"서울 송파구",
    deadline:null, sourceUrl:"https://recruit.wanted.co.kr/wd/387428", tags:["sql","clean","viz"],
    description:"제품 실험 결과를 분석할 수 있도록 지표와 대시보드를 관리합니다. SQL로 분석 결과를 검증하고 이벤트 수집의 누락이나 중복을 확인합니다."
  },
  {
    id:"atci-348483", company:"에이티씨아이", mark:"A", color:"gold",
    role:"소프트웨어 엔지니어 (Full Stack)", field:"프론트엔드", type:"신입·경력", place:"서울 금천구",
    deadline:null, sourceUrl:"https://recruit.wanted.co.kr/wd/348483", tags:["react","python","api","js","git","sql"],
    description:"React 기반 화면과 Python 백엔드를 함께 개발합니다. REST API를 설계하고 관계형 데이터베이스를 다루며 Git으로 팀원과 협업합니다."
  }
].map(job => {
    const posting = postingCriteria[job.id];
    const requirements = posting.groups.flatMap(group => group.options);
    return {...job, ...posting, requirements};
  })
  .sort((left, right) => (left.deadline || "9999").localeCompare(right.deadline || "9999"));

export const activitySentence = "수업에서 Python으로 설문 응답의 결측치를 정리했다.";
const planned = /예정|계획|(?:배울|익힐|공부할|만들|쓸|해볼|할)\s*(?:것|거|생각)|할\s*수\s*없|하려(?:고|는)|싶(?:다|어|습니다)|아직|못\s*(?:했|해|하)|지\s*(?:않|못)|(?:다음\s*(?:학기|주|달)|앞으로).*?(?:배울|할|쓸|만들|공부)|\b(?:will|want to|plan(?:ning)? to|hope to|haven't|didn't|did not|not yet)\b/i;

export function completedClauses(text) {
  return text.split(/(?<![a-z0-9])\.|\.(?![a-z0-9])|[!?。！？\n]+|[,;](?=\s)|(?<=했지만|했고|했으며|했고요)\s+|\s+(?:하지만|그리고|but|and then)\s+/i)
    .map(part => part.trim())
    .filter(part => part && !planned.test(part));
}

export function extractSkills(text) {
  const evidence = new Map();
  for (const excerpt of completedClauses(text)) {
    for (const [id, skill] of Object.entries(skills)) {
      const match = skill.pattern.exec(excerpt);
      if (match && !evidence.has(id)) evidence.set(id, {id, trigger:match[0], excerpt});
    }
  }
  return [...evidence.values()];
}
