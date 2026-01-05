import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { isTokenExpired } from '../utils/jwtUtils';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface SearchResult {
  id: number;
  Fullname: string;
  Email: string;
  profilePic?: string;
  isFriend?: boolean;
}

export interface FriendRequest {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_email: string;
  status: string;
  created_at: string;
}

export interface SendFriendRequestRequest {
  receiverId: number;
}

export interface SendFriendRequestResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface GetFriendRequestsResponse {
  success: boolean;
  data: FriendRequest[];
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GroupChat {
  id: number;
  name: string;
  created_by: number;
  created_at: string;
  last_message?: string;
  last_message_time?: string;
  last_message_sender?: number;
  role?: string;
  participant_count?: number;
}

export interface GroupParticipant {
  user_id: number;
  role: string;
  joined_at: string;
  full_name: string;
  email: string;
  profile_pic?: string;
}

export interface CreateGroupRequest {
  groupName: string;
  participants: number[];
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    userID: number;
    Fullname: string;
    Email: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileRequest {
  Fullname: string;
  Email: string;
  profilePic?: string;
}

export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  data: {
    userID: number;
    Fullname: string;
    Email: string;
    profilePic?: string;
  };
}

// Custom base query with token injection and refresh
const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:3000',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Base query with automatic token refresh
const baseQueryWithReauth: any = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  // If token expired or unauthorized, try to refresh
  if (result.error && result.error.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken && !isTokenExpired(refreshToken)) {
      // Try to refresh the token
      const refreshResult = await baseQuery(
        {
          url: '/api/auth/refresh',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        // Store new tokens
        const refreshData = refreshResult.data as RefreshTokenResponse;
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshData;
        localStorage.setItem('accessToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update auth context by dispatching a custom event
        window.dispatchEvent(new CustomEvent('tokenRefreshed', {
          detail: { accessToken: newAccessToken, refreshToken: newRefreshToken }
        }));
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      } else {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
      }
    }
  }

  return result;
};

// Define a service using a base URL and expected endpoints
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (credentials) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: credentials,
      }),
    }),

    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    refreshToken: builder.mutation<{ accessToken: string; refreshToken: string }, { refreshToken: string }>({
      query: (credentials) => ({
        url: '/api/auth/refresh',
        method: 'POST',
        body: credentials,
      }),
    }),

    searchUsers: builder.query<SearchResult[], string>({
      query: (searchQuery) => ({
        url: `/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        method: 'GET',
      }),
    }),

    sendFriendRequest: builder.mutation<SendFriendRequestResponse, SendFriendRequestRequest>({
      query: (request) => ({
        url: '/api/friend-requests/send',
        method: 'POST',
        body: request,
      }),
    }),

    getFriendRequests: builder.query<GetFriendRequestsResponse, void>({
      query: () => ({
        url: '/api/friend-requests',
        method: 'GET',
      }),
    }),

acceptFriendRequest: builder.mutation<{ 
  success: boolean; 
  message: string;
  data: {
    roomName: string;
    friendId: number;
  } 
}, number>({
  query: (requestId) => ({
    url: `/api/friend-requests/accept/${requestId}`,
    method: 'PUT',
  }),
}),

    rejectFriendRequest: builder.mutation<{ success: boolean; message: string }, number>({
      query: (requestId) => ({
        url: `/api/friend-requests/reject/${requestId}`,
        method: 'PUT',
      }),
    }),

    updateProfile: builder.mutation<UpdateProfileResponse, UpdateProfileRequest>({
      query: (profileData) => ({
        url: '/api/users/profile',
        method: 'PUT',
        body: profileData,
      }),
    }),

    getFriends: builder.query<{ success: boolean; data: Array<{ id: number; name: string; email: string; profilePic?: string; online: boolean }> }, void>({
      query: () => ({
        url: '/api/users/friends',
        method: 'GET',
      }),
    }),

    getChatHistory: builder.query<Array<{ id: number; sender_id: number; receiver_id: number; message: string; created_at: string; read_status: boolean; sender_name: string }>, { userId: number; limit?: number }>({
      query: ({ userId, limit = 8 }) => ({
        url: `/api/messages/history/${userId}?limit=${limit}`,
        method: 'GET',
      }),
    }),

    setMessage: builder.mutation<{ id: number; senderId: number; receiverId: number; content: string; conversationId: number; timestamp: string }, { receiverId: number; message: string; roomName: string; timestamp: string }>({
      query: (data) => ({
        url: `/api/messages/send`,
        method: 'POST',
        body: {
          receiverId: data.receiverId,
          content: data.message
        }
      }),
    }),

    // Group Chat endpoints
    createGroupChat: builder.mutation<{ success: boolean; message: string; data: { groupId: number; groupName: string; participants: GroupParticipant[] } }, CreateGroupRequest>({
      query: (groupData) => ({
        url: '/api/group-chats/create',
        method: 'POST',
        body: groupData,
      }),
    }),

    getUserGroups: builder.query<{ success: boolean; data: GroupChat[] }, void>({
      query: () => ({
        url: '/api/group-chats/my-groups',
        method: 'GET',
      }),
    }),

    getGroupParticipants: builder.query<{ success: boolean; data: GroupParticipant[] }, number>({
      query: (groupId) => ({
        url: `/api/group-chats/${groupId}/participants`,
        method: 'GET',
      }),
    }),

    sendGroupMessage: builder.mutation<
      { id: number; groupId: number; senderId: number; message: string; timestamp: string },
      { groupId: number; message: string; timestamp: string }
    >({
      query: (data) => ({
        url: '/api/group-chats/send-message',
        method: 'POST',
        body: {
          groupId: data.groupId,
          message: data.message,
          timestamp: data.timestamp
        }
      }),
      transformResponse: (response: { success: boolean; data: { id: number; groupId: number; senderId: number; message: string; timestamp: string } }) => response.data,
    }),

    getGroupChatHistory: builder.query<
      Array<{ id: number; sender_id: number; sender_name: string; message: string; created_at: string }>,
      { groupId: number; limit?: number }
    >({
      query: ({ groupId, limit = 15 }) => ({
        url: `/api/group-chats/${groupId}/messages?limit=${limit}`,
        method: 'GET',
      }),
      transformResponse: (response: { success: boolean; data: Array<{ id: number; sender_id: number; sender_name: string; message: string; created_at: string }> }) => response.data,
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshTokenMutation,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useGetFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
  useUpdateProfileMutation,
  useGetFriendsQuery,
  useGetChatHistoryQuery,
  useSetMessageMutation,
  useCreateGroupChatMutation,
  useGetUserGroupsQuery,
  useGetGroupParticipantsQuery,
  useSendGroupMessageMutation,
  useGetGroupChatHistoryQuery
} = apiSlice;