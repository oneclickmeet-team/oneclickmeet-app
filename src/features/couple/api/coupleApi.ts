// 커플 연결(C01~C06)과 공동 장소·코스(S01~S09) API.
// mock/실서버 전환은 이 파일 안에서만 일어난다.
import { toCourse } from '@/features/course/api/courseApi';
import { toPlace } from '@/features/place/api/placeApi';
import { apiRequest } from '@/lib/apiClient';
import { mockCouples, mockShared } from '@/mocks/couples';
import { useAuthStore } from '@/stores/authStore';
import { isMockMode } from '@/stores/settingsStore';
import type {
  CourseEditRequest,
  CoupleResponse,
  CoupleStatus,
  DisconnectionResponse,
  InvitationResponse,
  SharedCourseResponse,
  SharedPageResponse,
  SharedPlaceResponse,
  UnshareScope,
} from '@/types/api';
import type { CoupleId, CourseId, MemberId, PlaceId, SharedCourseId, SharedPlaceId } from '@/types/ids';
import type { Couple, Invitation, SharedCourse, SharedPage, SharedPlace } from '@/types/model';

const myId = () => useAuthStore.getState().member?.id ?? null;

function toCouple(res: CoupleResponse): Couple {
  const me = myId();
  const other = res.members.find((m) => m.memberId !== me) ?? null;
  const daysLeft =
    res.status === 'GRACE' && res.graceExpiresAt
      ? Math.max(0, Math.ceil((Date.parse(res.graceExpiresAt) - Date.parse(res.serverTime)) / 86_400_000))
      : null;
  return {
    id: res.coupleId as CoupleId,
    status: res.status,
    partner: other ? { id: other.memberId as MemberId, name: other.displayName } : null,
    disconnectedAt: res.disconnectedAt,
    graceExpiresAt: res.graceExpiresAt,
    graceDaysLeft: daysLeft,
    readOnly: res.readOnly,
    canReconnect: res.canReconnect,
  };
}

function toInvitation(res: InvitationResponse): Invitation {
  return { code: res.invitationCode, purpose: res.purpose, expiresAt: res.expiresAt };
}

function toSharedPlace(res: SharedPlaceResponse): SharedPlace {
  return {
    sharedId: res.sharedPlaceId as SharedPlaceId,
    coupleId: res.coupleId as CoupleId,
    sharedByMe: res.sharedByMemberId === myId(),
    sharedAt: res.sharedAt,
    readOnly: res.readOnly,
    place: toPlace(res.place),
  };
}

function toSharedCourse(res: SharedCourseResponse): SharedCourse {
  return {
    sharedId: res.sharedCourseId as SharedCourseId,
    coupleId: res.coupleId as CoupleId,
    sharedByMe: res.sharedByMemberId === myId(),
    sharedAt: res.sharedAt,
    readOnly: res.readOnly,
    course: toCourse(res.course),
  };
}

function toSharedPage<A, B>(res: SharedPageResponse<A>, map: (a: A) => B): SharedPage<B> {
  return {
    items: res.items.map(map),
    page: res.page,
    hasNext: res.hasNext,
    readOnly: res.readOnly,
    status: res.relationshipStatus,
    graceExpiresAt: res.graceExpiresAt,
  };
}

export const coupleApi = {
  // C01: 생략하면 ACTIVE·GRACE
  async list(status?: CoupleStatus[]): Promise<Couple[]> {
    const res = isMockMode()
      ? await mockCouples.list(status)
      : await apiRequest<{ items: CoupleResponse[] }>('/couples', {
          query: { status: status?.join(',') },
        });
    return res.items.map(toCouple);
  },

  // C02
  async invite(purpose: 'CONNECT' | 'RECONNECT', coupleId?: CoupleId): Promise<Invitation> {
    const body = purpose === 'RECONNECT' ? { purpose, coupleId } : { purpose };
    const res = isMockMode()
      ? await mockCouples.invite(body)
      : await apiRequest<InvitationResponse>('/couple-invitations', { method: 'POST', body });
    return toInvitation(res);
  },

  // C03
  async accept(invitationCode: string): Promise<Couple> {
    const code = invitationCode.trim().toUpperCase();
    const res = isMockMode()
      ? await mockCouples.accept(code)
      : await apiRequest<CoupleResponse>('/couples', { method: 'POST', body: { invitationCode: code } });
    return toCouple(res);
  },

  // C05
  async disconnect(id: CoupleId): Promise<Couple> {
    const res = isMockMode()
      ? await mockCouples.disconnect(id)
      : await apiRequest<DisconnectionResponse>(`/couples/${id}/disconnections`, { method: 'POST' });
    return toCouple(res.couple);
  },

  // C06
  async reconnect(id: CoupleId, invitationCode: string): Promise<Couple> {
    const code = invitationCode.trim().toUpperCase();
    const res = isMockMode()
      ? await mockCouples.reconnect(id, code)
      : await apiRequest<CoupleResponse>(`/couples/${id}/reconnections`, {
          method: 'POST',
          body: { invitationCode: code },
        });
    return toCouple(res);
  },
};

export const sharedApi = {
  // S01
  async places(coupleId: CoupleId, page: number): Promise<SharedPage<SharedPlace>> {
    const res = isMockMode()
      ? await mockShared.places(coupleId, page)
      : await apiRequest<SharedPageResponse<SharedPlaceResponse>>(`/couples/${coupleId}/places`, {
          query: { page },
        });
    return toSharedPage(res, toSharedPlace);
  },
  // S02
  async sharePlace(coupleId: CoupleId, placeId: PlaceId): Promise<SharedPlace> {
    const res = isMockMode()
      ? await mockShared.sharePlace(coupleId, placeId)
      : await apiRequest<SharedPlaceResponse>(`/couples/${coupleId}/places`, {
          method: 'POST',
          body: { placeId },
        });
    return toSharedPlace(res);
  },
  // S03
  async place(coupleId: CoupleId, id: SharedPlaceId): Promise<SharedPlace> {
    const res = isMockMode()
      ? await mockShared.place(coupleId, id)
      : await apiRequest<SharedPlaceResponse>(`/couples/${coupleId}/places/${id}`);
    return toSharedPlace(res);
  },
  // S04: scope는 필수, 기본값 없음(TRD 10.2)
  async unsharePlace(coupleId: CoupleId, id: SharedPlaceId, scope: UnshareScope): Promise<void> {
    if (isMockMode()) return mockShared.unsharePlace(coupleId, id, scope);
    await apiRequest<void>(`/couples/${coupleId}/places/${id}`, { method: 'DELETE', query: { scope } });
  },
  // S05
  async courses(coupleId: CoupleId, page: number): Promise<SharedPage<SharedCourse>> {
    const res = isMockMode()
      ? await mockShared.courses(coupleId, page)
      : await apiRequest<SharedPageResponse<SharedCourseResponse>>(`/couples/${coupleId}/courses`, {
          query: { page },
        });
    return toSharedPage(res, toSharedCourse);
  },
  // S06
  async shareCourse(coupleId: CoupleId, courseId: CourseId): Promise<SharedCourse> {
    const res = isMockMode()
      ? await mockShared.shareCourse(coupleId, courseId)
      : await apiRequest<SharedCourseResponse>(`/couples/${coupleId}/courses`, {
          method: 'POST',
          body: { courseId },
        });
    return toSharedCourse(res);
  },
  // S07
  async course(coupleId: CoupleId, id: SharedCourseId): Promise<SharedCourse> {
    const res = isMockMode()
      ? await mockShared.course(coupleId, id)
      : await apiRequest<SharedCourseResponse>(`/couples/${coupleId}/courses/${id}`);
    return toSharedCourse(res);
  },
  // S08
  async editCourse(coupleId: CoupleId, id: SharedCourseId, req: CourseEditRequest): Promise<SharedCourse> {
    const res = isMockMode()
      ? await mockShared.editCourse(coupleId, id, req)
      : await apiRequest<SharedCourseResponse>(`/couples/${coupleId}/courses/${id}`, {
          method: 'PATCH',
          body: req,
        });
    return toSharedCourse(res);
  },
  // S09
  async unshareCourse(coupleId: CoupleId, id: SharedCourseId, scope: UnshareScope): Promise<void> {
    if (isMockMode()) return mockShared.unshareCourse(coupleId, id, scope);
    await apiRequest<void>(`/couples/${coupleId}/courses/${id}`, { method: 'DELETE', query: { scope } });
  },
};
