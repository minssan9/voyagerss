import type { PageContext } from '../types/page-context';

export type { PageContext };

export type AgentProviderId = 'claude_cli' | 'omp_sdk';

export type LogStream = 'stdout' | 'stderr' | 'event';

export interface LogLine {
  stream: LogStream;
  content: string;
  meta?: LogLineMeta;
}

export interface LogLineMeta {
  tool?: string;
  file?: string;
  op?: string;
  anchors?: string[];
  kind?: 'hashline' | 'read' | 'tool' | 'cost';
}

export type LogCallback = (line: LogLine) => void | Promise<void>;

export interface PlanResult {
  content: string;
  costUsd: number;
  sessionId?: string;
}

export interface BuildResult {
  success: boolean;
  costUsd: number;
  errorSummary?: string;
  sessionId?: string;
}

export interface AgentPlanInput {
  issue: { title: string; body: string; pageContext?: PageContext | null };
  repoTree: string;
  recentLog: string;
  workdir: string;
}

export interface AgentBuildInput {
  workdir: string;
  planContent: string;
  runId: string;
  pageContext?: PageContext | null;
}

export interface AgentProvider {
  readonly id: AgentProviderId;
  runPlan(input: AgentPlanInput, onLog: LogCallback): Promise<PlanResult>;
  runBuild(input: AgentBuildInput, onLog: LogCallback): Promise<BuildResult>;
}
