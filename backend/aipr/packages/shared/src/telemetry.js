"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initTelemetry = initTelemetry;
/**
 * OpenTelemetry SDK initializer.
 * Call initTelemetry() as early as possible (before other imports) in main.ts.
 *
 * Exports traces via OTLP HTTP to OTEL_EXPORTER_OTLP_ENDPOINT (default: http://localhost:4318).
 */
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const sdk_node_1 = require("@opentelemetry/sdk-node");
let sdk = null;
function initTelemetry(serviceName) {
    if (sdk)
        return; // idempotent
    const name = serviceName
        ?? process.env.OTEL_SERVICE_NAME
        ?? 'auto-pr-unknown';
    sdk = new sdk_node_1.NodeSDK({
        serviceName: name,
        traceExporter: new exporter_trace_otlp_http_1.OTLPTraceExporter({
            url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
        }),
        instrumentations: [
            (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
            }),
        ],
    });
    sdk.start();
    process.on('SIGTERM', async () => {
        await sdk?.shutdown();
    });
}
//# sourceMappingURL=telemetry.js.map