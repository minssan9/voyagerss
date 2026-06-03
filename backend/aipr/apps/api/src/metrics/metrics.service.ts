import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ── Counters ────────────────────────────────────────────────────────────────
  readonly feedbackReceived = new Counter({
    name:    'feedback_received_total',
    help:    'Total number of feedback submissions received',
    labelNames: ['status'],
    registers: [this.registry],
  });

  readonly runsTotal = new Counter({
    name:    'runs_total',
    help:    'Total number of automation runs',
    labelNames: ['kind', 'status'],
    registers: [this.registry],
  });

  readonly claudeTokensTotal = new Counter({
    name:    'claude_tokens_total',
    help:    'Total Claude API tokens consumed',
    labelNames: ['type'], // 'input' | 'output'
    registers: [this.registry],
  });

  // ── Histogram ───────────────────────────────────────────────────────────────
  readonly runDurationSeconds = new Histogram({
    name:    'run_duration_seconds',
    help:    'Duration of automation runs in seconds',
    labelNames: ['kind'],
    buckets: [30, 60, 120, 300, 600, 900],
    registers: [this.registry],
  });

  // ── Gauge ───────────────────────────────────────────────────────────────────
  readonly queueDepth = new Gauge({
    name:    'queue_depth',
    help:    'Current number of jobs waiting in each queue',
    labelNames: ['queue'],
    registers: [this.registry],
  });

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
