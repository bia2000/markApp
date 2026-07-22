/**
 * 业务接口定义（按模块组织）
 */
import http from '@/utils/request';

// ========== 鉴权 ==========
export interface SendCodeParams {
  phone: string;
  scene?: 'login' | 'register';
}

export const authApi = {
  sendCode: (data: SendCodeParams) => http.post<{ expireIn: number }>('/auth/sms/code', data),
  loginByCode: (phone: string, code: string) =>
    http.post<{ token: string; user: unknown }>('/auth/login/code', { phone, code }),
  loginByPassword: (account: string, password: string) =>
    http.post<{ token: string; user: unknown }>('/auth/login/password', { account, password }),
  logout: () => http.post('/auth/logout')
};

// ========== 首页 ==========
export interface HomeBanner {
  id: string;
  image: string;
  link: string;
}
export interface HomeEntry {
  id: string;
  title: string;
  icon: string;
  link: string;
}
export interface HomeFeedItem {
  id: string;
  title: string;
  image: string;
  price: number;
  originPrice?: number;
  tags?: string[];
}

export const homeApi = {
  banners: () => http.get<HomeBanner[]>('/home/banners'),
  entries: () => http.get<HomeEntry[]>('/home/entries'),
  feed: (page: number, pageSize = 10) =>
    http.get<{ items: HomeFeedItem[]; total: number }>('/home/feed', { page, pageSize })
};

// ========== 消息 ==========
export interface MessageItem {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'order' | 'activity';
  createdAt: number;
  read: boolean;
}

export const messageApi = {
  list: (page: number, pageSize = 20) =>
    http.get<{ items: MessageItem[]; total: number }>('/messages', { page, pageSize }),
  read: (id: string) => http.post(`/messages/${id}/read`),
  readAll: () => http.post('/messages/read-all')
};

// ========== 用户 ==========
export interface UserProfile {
  userId: string;
  nickname: string;
  avatar: string;
  phone: string;
  gender: 'male' | 'female' | 'unknown';
  registerAt: number;
}

export const userApi = {
  profile: () => http.get<UserProfile>('/user/profile'),
  updateProfile: (data: Partial<UserProfile>) => http.put<UserProfile>('/user/profile', data),
  ordersCount: () =>
    http.get<{ unpaid: number; undelivered: number; unreceived: number; unreviewed: number }>(
      '/user/orders/count'
    )
};
