# 원클릭밋 앱 (oneclickmeet-app)

흩어진 저장 장소를 모아 둘이 걸어서 갈 데이트 코스를 추천하는 모바일 앱입니다.
딸깍코딩단 · 오픈소스 AI·SW 융합 프로젝트

## 기술 스택

- React Native, Expo SDK 57, TypeScript
- Expo Router (`src/app`)
- expo-share-intent 8.0.1 (다른 앱에서 링크·이미지 공유 받기)

## 관련 저장소

- 서버: [oneclickmeet-server](https://github.com/oneclickmeet-team/oneclickmeet-server)
- AI: [oneclickmeet-ai](https://github.com/oneclickmeet-team/oneclickmeet-ai)

## 개발 환경

- Node.js LTS, JDK 17, Android Studio (Android SDK)
- USB 디버깅을 켠 Android 기기

공유 수신 기능 때문에 Expo Go가 아니라 개발용 빌드로 실행합니다.

## 실행

```bash
npm install
npx expo prebuild --clean
npx expo run:android
```

## 폴더 구조

```text
src/
└─ app/    화면 라우트 (Expo Router)
```

## 진행 상황

- [x] 프로젝트 생성, 공유 수신 설정
- [ ] 공유 수신 실기기 확인 (M0)