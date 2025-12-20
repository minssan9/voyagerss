import { AxiosResponse } from 'axios'
import service from '@/api/axios-voyagerss'
import { PageResponseDTO } from '@/api/modules/api-common'
import { Task, TaskEmployee } from '@/types/workschd/task'
export type { Task, TaskEmployee }


// Task APIs
const fetchTasks = (): Promise<AxiosResponse<PageResponseDTO<Task>>> => {
  return service.get('/task')
}
// Worker-specific API to fetch available tasks with pagination
const fetchTasksForWorker = (params?: any): Promise<AxiosResponse<PageResponseDTO<TaskEmployee>>> => {
  return service.get('/task', { params })
}
// Worker-specific API to get a user's task requests
const getUserTaskRequests = (accountId: number): Promise<AxiosResponse<TaskEmployee[]>> => {
  return service.get(`/account/${accountId}/task-requests`)
}
const createTask = (task: Task): Promise<AxiosResponse<Task>> => {
  return service.post('/task', task)
}

const updateTask = (task: Task): Promise<AxiosResponse<Task>> => {
  return service.put(`/task/${task.id}`, task)
}

const deleteTask = (taskId: number): Promise<AxiosResponse<void>> => {
  return service.delete(`/task/${taskId}`)
}



// Task-Employee API to create a task employee request
const createTaskEmployeeRequest = (requestData: Partial<TaskEmployee>): Promise<AxiosResponse<TaskEmployee>> => {
  const taskId = requestData.taskId
  return service.post(`/task-employee/${taskId}/request`, requestData)
}
const approveJoinRequest = (requestData: Partial<TaskEmployee>): Promise<AxiosResponse<void>> => {
  const taskId = requestData.taskId
  const requestId = requestData.id
  return service.post(`/task-employee/${taskId}/request/${requestId}/approve`)
}
// Updated API to get task employees with pagination and filtering
const getTaskEmployees = (taskId: number, params?: any): Promise<AxiosResponse<TaskEmployee[]>> => {
  return service.get(`/task-employee/${taskId}/employees`, { params });
};

// Check in (출근) - Sets joinedAt to current time and status to ACTIVE
const checkIn = (taskEmployeeId: number): Promise<AxiosResponse<TaskEmployee>> => {
  return service.post(`/task-employee/${taskEmployeeId}/check-in`);
};

// Check out (퇴근) - Sets leftAt to current time and status to INACTIVE
const checkOut = (taskEmployeeId: number): Promise<AxiosResponse<TaskEmployee>> => {
  return service.post(`/task-employee/${taskEmployeeId}/check-out`);
};

export default {
  fetchTasks,
  fetchTasksForWorker,
  createTaskEmployeeRequest,
  createTask,
  updateTask,
  deleteTask,
  approveJoinRequest,
  getTaskEmployees,
  checkIn,
  checkOut
} 

