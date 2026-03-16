import axiosInstance from '@/utils/axiosInstance';
import type {
  AdminLoginRequest, UPALoginRequest, UPARegisterRequest, UPARegisterResponse,
  EmployeeCreateRequest, AuthResponse, User,
} from '@/types/auth';

export const authService = {
  adminLogin:     (data: AdminLoginRequest)          => axiosInstance.post<AuthResponse>('/api/v1/auth/admin/login/', data),
  userLogin:      (data: UPALoginRequest)            => axiosInstance.post<AuthResponse>('/api/v1/auth/user/login/', data),
  userRegister:   (data: UPARegisterRequest)         => axiosInstance.post<UPARegisterResponse>('/api/v1/auth/user/register/', data),
  createEmployee: (data: EmployeeCreateRequest)      => axiosInstance.post('/api/v1/employees/', data),
  listEmployees:  ()                                 => axiosInstance.get('/api/v1/employees/'),
  updateEmployee: (id: string, data: Partial<EmployeeCreateRequest>) => axiosInstance.patch(`/api/v1/employees/${id}/`, data),
  logout:         (refresh: string)                  => axiosInstance.post('/api/v1/auth/logout/', { refresh }),
  getMe:          ()                                 => axiosInstance.get<User>('/api/v1/auth/me/'),
  updateMe:       (data: Partial<User>)              => axiosInstance.patch<User>('/api/v1/auth/me/', data),
  uploadPhoto:    (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return axiosInstance.patch<{ photo_url: string }>('/api/v1/auth/me/photo/', form);
  },
};
