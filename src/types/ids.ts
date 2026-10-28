// 브랜드 ID 타입: 숫자는 같아도 서로 바꿔 쓰면 컴파일 에러가 나게 한다.
// 예) PlaceId 자리에 SharedPlaceId를 넣으면 에러.
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type MemberId = Brand<number, 'MemberId'>;
export type LibraryId = Brand<number, 'LibraryId'>;
export type CoupleId = Brand<number, 'CoupleId'>;
export type PlaceId = Brand<number, 'PlaceId'>;
export type SharedPlaceId = Brand<number, 'SharedPlaceId'>;
export type CourseId = Brand<number, 'CourseId'>;
export type SharedCourseId = Brand<number, 'SharedCourseId'>;
export type CoursePlaceId = Brand<number, 'CoursePlaceId'>;
export type CourseItemId = Brand<number, 'CourseItemId'>;
