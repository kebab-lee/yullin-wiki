# 열린 위키 (Yullin Wiki)

Next.js 15 + TypeScript + Tailwind CSS로 만든 열린교회 위키 사이트입니다.
Figma 디자인 기반으로 홈 화면을 구현한 시작 프로젝트입니다.

## 🚀 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── layout.tsx        # 루트 레이아웃 (HTML, body)
│   ├── page.tsx          # 홈 페이지 (/)
│   └── globals.css       # 전역 스타일 + Pretendard 폰트
│
└── components/
    ├── layout/
    │   ├── Header.tsx    # 상단 헤더 (예배문구 + 로그아웃)
    │   └── Footer.tsx    # 하단 푸터
    │
    └── home/             # 홈 화면 전용 컴포넌트
        ├── SearchBox.tsx       # 검색창
        ├── LinkBadge.tsx       # 외부 링크 박스
        ├── CategoryButton.tsx  # 카테고리 원형 버튼
        ├── PostCard.tsx        # 게시물 미리보기 카드
        ├── SectionHeader.tsx   # 섹션 헤더
        └── MoreButton.tsx      # 더보기 버튼
```

## 🎨 디자인 토큰 (tailwind.config.ts)

Figma에서 추출한 색상/폰트가 Tailwind 설정에 정의돼 있어요.

| 용도          | 클래스                       | HEX       |
| ------------- | ---------------------------- | --------- |
| 메인 빨강     | `bg-brand-red`               | `#B32020` |
| 밝은 배경     | `bg-brand-red-white`         | `#F6F5F4` |
| 연한 핑크     | `bg-brand-red-pink`          | `#F8ECEA` |
| 카테고리 초록 | `border-category-green`      | `#C2CDAB` |
| 태그 배경     | `bg-category-green-light`    | `#E8ECD0` |
| 태그 텍스트   | `text-category-green-dark`   | `#808F44` |

## 📝 다음에 만들 것 (TODO)

- [ ] 로고 SVG 추가 (현재는 placeholder)
- [ ] 로그인 / 회원가입 페이지
- [ ] 게시물 상세 페이지 (Article)
- [ ] 항목별 게시물 페이지
- [ ] 검색 결과 페이지
- [ ] 마이페이지
- [ ] 관리자 페이지 (별도 라우트)
- [ ] 백엔드 API 연동 (게시물 데이터 fetch)
- [ ] 반응형 (현재는 1512px 데스크톱 고정)

## 💡 참고

- 현재 화면은 데스크톱(1512px)에 고정된 레이아웃으로 구현했어요. 반응형은 나중에 작업하시면 됩니다.
- 게시물 데이터는 `page.tsx`의 `RECENT_POSTS`에 임시로 들어가 있어요. 실제 API 연동 시 서버 컴포넌트에서 fetch하도록 변경하면 됩니다.
- 로고/SNS 아이콘 자리는 placeholder로 처리했으니 실제 SVG 파일을 받아서 교체하시면 돼요.
