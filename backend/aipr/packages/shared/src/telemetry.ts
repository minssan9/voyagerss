/**
 * OpenTelemetry SDK initializer.
 * Call initTelemetry() as early as possible (before other imports) in main.ts.
 *
 * Exports traces via OTLP HTTP to OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318).
 */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

let sdk: NodeSDK | null = null;

export function initTelemetry(serviceName?: string): void {
  if (sdk) return; // idempotent

  const name = serviceName
    ?? process.env.OTEL_SERVICE_NAME
    ?? 'auto-pr-unknown';

  sdk = new NodeSDK({
    serviceName: name,
    traceExporter: new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', async () => {
    await sdk?.shutdown();
  });
}
