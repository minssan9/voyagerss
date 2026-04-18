import axios from 'axios';

const autodevAxios = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/autodev`,
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface Issue {
  id: number;
  issueKey: string;
  source: string;
  summary: string;
  status: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompletionHistory {
  id: number;
  issueKey: string;
  jobId: number;
  completedAt: string;
  notes?: string;
}

export interface Job {
  id: number;
  issueKey: string;
  status: string;
  branch?: string;
  prUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
}

export interface Todo {
  id: number;
  content: string;
  date: string;
  resolved: boolean;
  resolvedAt?: string;
  issueKey?: string;
}

export interface Settings {
  jiraConfigured: boolean;
  slackConfigured: boolean;
  dailyCron: string;
}

export interface HealthCheck {
  connected: boolean;
  message?: string;
}

// ── Issues ───────────────────────────────────────────────────────────────────

export function getIssues() {
  return autodevAxios.get<Issue[]>('/issues');
}

export function getIssue(key: string) {
  return autodevAxios.get<Issue>(`/issues/${key}`);
}

export function getCompletionHistory(key: string) {
  return autodevAxios.get<CompletionHistory[]>(`/issues/${key}/history`);
}

export function completeIssue(key: string) {
  return autodevAxios.post<Issue>(`/issues/${key}/complete`);
}

export function reopenIssue(key: string) {
  return autodevAxios.post<Issue>(`/issues/${key}/reopen`);
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

export function getJobs(status?: string) {
  return autodevAxios.get<Job[]>('/jobs', { params: status ? { status } : {} });
}

export function getJob(id: number) {
  return autodevAxios.get<Job>(`/jobs/${id}`);
}

export function triggerJob(issueKey: string) {
  return autodevAxios.post<Job>(`/jobs/trigger/${issueKey}`);
}

export function updateJob(id: number, data: Partial<Job>) {
  return autodevAxios.patch<Job>(`/jobs/${id}`, data);
}

// ── Todos ────────────────────────────────────────────────────────────────────

export function getTodos(params?: { date?: string; resolved?: boolean }) {
  return autodevAxios.get<Todo[]>('/todos', { params });
}

export function updateTodo(id: number, data: Partial<Todo>) {
  return autodevAxios.patch<Todo>(`/todos/${id}`, data);
}

// ── Settings ─────────────────────────────────────────────────────────────────

export function getSettings() {
  return autodevAxios.get<Settings>('/settings');
}

export function checkSettingsHealth(service: string) {
  return autodevAxios.get<HealthCheck>(`/settings/health/${service}`);
}

export default autodevAxios;
