import { AxiosResponse } from 'axios'
import service from '@/api/common/axios-voyagerss'
import { PageResponseDTO } from '@/api/common/api-common'
import { Task, TaskEmployee } from '@/types/workschd/task'
export type { Task, TaskEmployee }


// Task APIs
const fetchTasks = (): Promise<AxiosResponse<PageResponseDTO<Task>>> => {
  return service.get('/workschd/task')
}
// Worker-specific API to fetch available tasks with pagination
const fetchTasksForWorker = (params?: any): Promise<AxiosResponse<PageResponseDTO<TaskEmployee>>> => {
  return service.get('/workschd/task', { params })
}
// Worker-specific API to get a user's task requests
const getUserTaskRequests = (accountId: number): Promise<AxiosResponse<TaskEmployee[]>> => {
  return service.get(`/workschd/account/${accountId}/task-requests`)
}
const createTask = (task: Task): Promise<AxiosResponse<Task>> => {
  return service.post('/workschd/task', task)
}

const updateTask = (task: Task): Promise<AxiosResponse<Task>> => {
  return service.put(`/workschd/task/${task.id}`, task)
}

const deleteTask = (taskId: number): Promise<AxiosResponse<void>> => {
  return service.delete(`/workschd/task/${taskId}`)
}



// Task-Employee API to create a task employee request
const createTaskEmployeeRequest = (requestData: Partial<TaskEmployee>): Promise<AxiosResponse<TaskEmployee>> => {
  const taskId = requestData.taskId
  return service.post(`/workschd/task/${taskId}/request`, requestData)
}

const approveJoinRequest = (requestData: Partial<TaskEmployee>): Promise<AxiosResponse<void>> => {
  const requestId = requestData.id
  return service.post(`/workschd/task/request/${requestId}/approve`)
}

// 참여 거절
const rejectJoinRequest = (requestData: Partial<TaskEmployee>): Promise<AxiosResponse<void>> => {
  const requestId = requestData.id
  return service.post(`/workschd/task/request/${requestId}/reject`)
}

// 참여 취소
const cancelJoinRequest = (requestId: number): Promise<AxiosResponse<void>> => {
  return service.delete(`/workschd/task/request/${requestId}`)
}
// Get task employees (참여자 목록 조회)
const getTaskEmployees = (taskId: number, params?: any): Promise<AxiosResponse<TaskEmployee[]>> => {
  return service.get(`/workschd/task/${taskId}/employees`, { params });
};

// Check in (출근) - Sets joinedAt to current time and status to ACTIVE
const checkIn = (taskEmployeeId: number): Promise<AxiosResponse<TaskEmployee>> => {
  return service.post(`/workschd/task-employee/${taskEmployeeId}/check-in`);
};

// Check out (퇴근) - Sets leftAt to current time and status to INACTIVE
const checkOut = (taskEmployeeId: number): Promise<AxiosResponse<TaskEmployee>> => {
  return service.post(`/workschd/task-employee/${taskEmployeeId}/check-out`);
};

export default {
  fetchTasks,
  fetchTasksForWorker,
  createTaskEmployeeRequest,
  createTask,
  updateTask,
  deleteTask,
  approveJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  getTaskEmployees,
  checkIn,
  checkOut
} 

