import service from '@/api/axios-voyagerss'

export default {
  getCurrentUser: () => service.get('/user/current'),
  updateProfile: (data: any) => service.put('/user/profile', data),
  
  // File upload helper
  uploadFile: (formData: FormData) => 
    service.post('/user/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
} 