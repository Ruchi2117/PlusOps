import type {
  AIProvider,
  AIRequestContext,
  AlertRule,
  IncidentSummary,
  MetricDefinition,
  ServiceHealthResponse,
  ServiceSummary
} from "@plusops/contracts";
import {
  Activity,
  Bot,
  Code2,
  Database,
  FileText,
  MessagesSquare,
  Network,
  Sparkles,
  TerminalSquare,
  TriangleAlert
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GlassOrbit } from "../../components/spatial/glass-orbit";
import { MotionReveal } from "../../components/spatial/motion-reveal";
import { SceneInspector, type SceneInspectorItem } from "../../components/spatial/scene-inspector";
import type { SignalNodeKind, SignalNodeStatus } from "../../components/spatial/signal-node";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Select, Textarea } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { Skeleton } from "../../components/ui/skeleton";
import { TabButton, TabList } from "../../components/ui/tabs";
import { formatDurationMs, formatNumber } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import {
  getOperationalMetricWindow,
  getApiErrorMessage
} from "../platform/platform-api";
import {
  useAIChat,
  useAIPlayground,
  useAIProviders,
  useAITool,
  useAlerts,
  useIncidents,
  useMetricQuery,
  useMetrics,
  useServiceHealthSummaries,
  useServices
} from "../platform/use-platform-data";

type CopilotTool = {
  id: "log-analysis" | "stacktrace" | "incident-summary" | "sql" | "docs" | "release-notes";
  label: string;
  icon: typeof TerminalSquare;
  placeholder: string;
};

type Workflow = "investigate" | "explain" | "summarize" | "create";

type ContextNode = {
  id: string;
  kind: SignalNodeKind;
  label: string;
  status: SignalNodeStatus;
  severity?: "info" | "warning" | "critical";
  value: string;
  meta: string;
  x: number;
  y: number;
  icon: typeof Activity;
  context: AIRequestContext;
  inspector: SceneInspectorItem[];
};

const tools: CopilotTool[] = [
  { id: "log-analysis", label: "Analyze logs", icon: TerminalSquare, placeholder: "Paste application logs or deploy logs" },
  { id: "stacktrace", label: "Explain stack trace", icon: Code2, placeholder: "Paste a stack trace" },
  { id: "incident-summary", label: "Summarize incident", icon: MessagesSquare, placeholder: "Paste incident updates" },
  { id: "sql", label: "Write SQL", icon: Database, placeholder: "Describe the query you need" },
  { id: "docs", label: "Generate API docs", icon: FileText, placeholder: "Paste endpoint behavior or controller notes" },
  { id: "release-notes", label: "Release notes", icon: Sparkles, placeholder: "List shipped changes, one per line" }
];

const workflowPrompts: Record<Workflow, string> = {
  investigate: "What is the most likely cause of this operational signal?",
  explain: "Explain this signal in plain engineering terms and identify the next useful check.",
  summarize: "Summarize the current operational context for the response team.",
  create: "Draft an incident update from the current operational context."
};

const orbitPrompts = [
  "Why is checkout latency increasing?",
  "Find the service most likely causing this incident.",
  "Explain the webhook backlog.",
  "Draft release notes from shipped changes."
];

const nodePositions = [
  { x: 25, y: 22 },
  { x: 75, y: 22 },
  { x: 25, y: 78 },
  { x: 75, y: 78 }
];

export function AICopilotPage() {
  const providersQuery = useAIProviders();
  const incidentsQuery = useIncidents({ pageSize: 100 });
  const servicesQuery = useServices();
  const metricsQuery = useMetrics();
  const alertsQuery = useAlerts();
  const services = servicesQuery.data?.data ?? [];
  const healthQuery = useServiceHealthSummaries(services);
  const chatMutation = useAIChat();
  const playgroundMutation = useAIPlayground();
  const toolMutation = useAITool();
  const providers = providersQuery.data?.data ?? [];
  const incidents = incidentsQuery.data?.data ?? [];
  const metrics = metricsQuery.data?.data ?? [];
  const alerts = alertsQuery.data?.data ?? [];
  const health = healthQuery.data ?? [];
  const [provider, setProvider] = useState<AIProvider | "">("");
  const [selectedContextId, setSelectedContextId] = useState("");
  const [workflow, setWorkflow] = useState<Workflow>("investigate");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [activeTool, setActiveTool] = useState<CopilotTool["id"]>("log-analysis");
  const [toolInput, setToolInput] = useState("Checkout latency exceeded the p95 target after the latest production deploy.");
  const [playgroundSystem, setPlaygroundSystem] = useState("You are PlusOps, an engineering operations copilot.");
  const [playgroundUser, setPlaygroundUser] = useState("Explain the likely cause of a degraded readiness check.");

  const selectedProvider = useMemo(
    () => providers.find((item) => item.provider === provider) ?? providers.find((item) => item.isEnabled),
    [provider, providers]
  );
  const healthByServiceId = useMemo(() => new Map(health.map((item) => [item.serviceId, item])), [health]);
  const latestUsage = chatMutation.data?.usage ?? playgroundMutation.data?.usage ?? toolMutation.data?.usage ?? null;
  const latestOutput = chatMutation.data?.output ?? playgroundMutation.data?.output ?? toolMutation.data?.output ?? "";
  const isLoading = [providersQuery, incidentsQuery, servicesQuery, metricsQuery, alertsQuery, healthQuery].some(
    (query) => query.isLoading
  );
  const hasError = [providersQuery, incidentsQuery, servicesQuery, metricsQuery, alertsQuery, healthQuery].find(
    (query) => query.isError
  );

  const contextNodes = useMemo(
    () => buildContextNodes({ incidents, services, metrics, alerts, healthByServiceId }),
    [alerts, healthByServiceId, incidents, metrics, services]
  );
  const selectedContext = selectedContextId === "__none__"
    ? undefined
    : contextNodes.find((node) => node.id === selectedContextId) ?? contextNodes[0];
  const selectedMetricId = typeof selectedContext?.context.metadata?.metricId === "string" ? selectedContext.context.metadata.metricId : "";
  const selectedMetric = selectedContext?.kind === "metric" ? metrics.find((metric) => metric.id === selectedMetricId) : null;
  const metricQuery = useMetricQuery(
    selectedMetric
      ? {
          ...getOperationalMetricWindow(),
          metricDefinitionId: selectedMetric.id,
          serviceId: selectedMetric.serviceId,
          aggregation: selectedMetric.defaultAggregation,
          groupBy: [],
          pageSize: 100,
          limit: 100,
          sortBy: "timestamp",
          sortDirection: "asc"
        }
      : { serviceId: "" }
  );
  const selectedInspectorItems = selectedContext
    ? [
        ...selectedContext.inspector,
        ...(selectedMetric && metricQuery.data?.data.length
          ? [{ label: "Latest sample", value: formatNumber(metricQuery.data.data.at(-1)?.value ?? 0) }]
          : [])
      ]
    : [];

  useEffect(() => {
    if (!selectedContextId && contextNodes[0]) {
      setSelectedContextId(contextNodes[0].id);
    }
  }, [contextNodes, selectedContextId]);

  useEffect(() => {
    if (selectedContext && !message) {
      setMessage(workflowPrompts[workflow]);
    }
  }, [message, selectedContext, workflow]);

  if (isLoading) {
    return <Skeleton className="h-[calc(100vh-8rem)]" />;
  }

  if (hasError) {
    return (
      <ErrorState
        title="Operational context unavailable"
        description={getApiErrorMessage(hasError.error)}
        action={<RetryButton onRetry={() => void hasError.refetch()} />}
      />
    );
  }

  const submitChat = () => {
    const content = message.trim();
    if (!content) return;

    setChatHistory((items) => [...items, { role: "user", content }]);
    chatMutation.mutate(
      {
        provider: selectedProvider?.provider,
        message: content,
        context: selectedContext?.context
      },
      {
        onSuccess: (response) => {
          setChatHistory((items) => [...items, { role: "assistant", content: response.output }]);
          setMessage("");
        }
      }
    );
  };

  const selectContext = (node: ContextNode) => {
    setSelectedContextId(node.id);
    setMessage(workflowPrompts[workflow]);
  };

  return (
    <div className="space-y-16">
      <MotionReveal>
        <section className="portal-core ai-portal" aria-labelledby="ai-page-title">
          <img className="ai-portal__image" src={visualAssets.lightSail} alt="" loading="eager" />
          <img className="ai-portal__accent" src={visualAssets.orangeOrbit} alt="" loading="lazy" />
          <div className="ai-portal__shade" aria-hidden="true" />

          <div className="ai-portal__layout">
            <div className="ai-portal__question">
              <ScrollReveal>
                <p className="art-eyebrow">AI intelligence layer</p>
                <h1 id="ai-page-title">What do you want to know?</h1>
                <p className="ai-portal__description">
                  Ask across incidents, services, metrics, alerts, and health without leaving the
                  operational context already loaded in PlusOps.
                </p>
              </ScrollReveal>

              <ScrollReveal className="ai-portal__compose" delay={0.08}>
                <label className="space-y-3">
                  <FieldLabel htmlFor="ai-message">Ask the system</FieldLabel>
                  <Textarea
                    id="ai-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Ask PlusOps about the selected operational context"
                  />
                </label>
                <div className="ai-portal__compose-actions">
                  <p>{selectedContext ? `${selectedContext.label} is attached.` : "No context attached."}</p>
                  <Button disabled={chatMutation.isPending || !message.trim()} onClick={submitChat}>
                    {chatMutation.isPending ? "Thinking..." : "Send through core"}
                  </Button>
                </div>
              </ScrollReveal>
            </div>

            <ScrollReveal className="ai-portal__intelligence" delay={0.12} distance={28}>
              <div className="ai-provider-panel ai-portal__provider">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedProvider?.displayName ?? "Auto provider"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedProvider?.model ?? "simulated provider"}</p>
                  </div>
                  <Badge variant={selectedProvider?.isEnabled ? "success" : "neutral"}>
                    {selectedProvider?.isEnabled ? "Enabled" : "Auto"}
                  </Badge>
                </div>
                <label className="mt-5 block space-y-2">
                  <FieldLabel>Provider</FieldLabel>
                  <Select aria-label="Choose AI provider" value={provider} onChange={(event) => setProvider(event.target.value as AIProvider)}>
                    <option value="">Auto</option>
                    {providers.map((item) => (
                      <option key={item.id} value={item.provider}>{item.displayName} - {item.model}</option>
                    ))}
                  </Select>
                </label>
              </div>

              <div className="ai-portal__core-stage">
                <GlassOrbit className="ai-portal__glass-orbit" />
                <div className="ai-orbit" aria-hidden="true">
                  <div className="ai-orbit__ring ai-orbit__ring--outer" />
                  <div className="ai-orbit__ring ai-orbit__ring--inner" />
                </div>
                <div className="ai-portal__core" aria-label="PlusOps AI core">
                  <div className="ai-portal__core-light" />
                  <Bot aria-hidden="true" />
                </div>
                <p className="ai-portal__core-label">AI core</p>
              </div>

              <div className="ai-portal__prompts">
                {orbitPrompts.map((prompt) => (
                  <button key={prompt} type="button" className="ai-orbit__prompt" onClick={() => setMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="ai-portal__signals">
                <CopilotSignal icon={Bot} label="Providers" value={formatNumber(providers.length)} />
                <CopilotSignal icon={MessagesSquare} label="Tokens" value={latestUsage ? formatNumber(latestUsage.totalTokens) : "0"} />
                <CopilotSignal icon={TerminalSquare} label="Latency" value={latestUsage ? formatDurationMs(latestUsage.latencyMs) : "n/a"} />
              </div>
            </ScrollReveal>
          </div>
        </section>
      </MotionReveal>

      <MotionReveal variant="slide">
        <section className="ai-context-deck" aria-labelledby="ai-context-title">
          <div className="ai-context-deck__header">
            <div>
              <p className="art-eyebrow">Live operational context</p>
              <h2 id="ai-context-title">Choose the signal PlusOps should reason about.</h2>
            </div>
            <p>Context is explicit: selecting a signal changes the metadata sent with the next request.</p>
          </div>

          <div className="ai-context-deck__layout">
            <div className="ai-context-deck__signals" role="list" aria-label="Available AI context signals">
              {contextNodes.map((node) => {
                const ContextIcon = node.icon;
                return (
                  <button
                    aria-pressed={node.id === selectedContext?.id}
                    className="ai-context-deck__signal"
                    data-selected={node.id === selectedContext?.id ? "true" : "false"}
                    key={node.id}
                    onClick={() => selectContext(node)}
                    role="listitem"
                    type="button"
                  >
                    <ContextIcon aria-hidden="true" />
                    <span>
                      <small>{node.kind} / {node.status}</small>
                      <strong>{node.label}</strong>
                      <em>{node.value} / {node.meta}</em>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedContext ? (
              <SceneInspector
                actions={
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setMessage(workflowPrompts.investigate)}>Investigate</Button>
                    <Button size="sm" variant="secondary" onClick={() => setMessage(workflowPrompts.summarize)}>Summarize</Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedContextId("__none__")}>Clear context</Button>
                  </div>
                }
                className="ai-context-deck__inspector"
                items={selectedInspectorItems}
                onClose={() => setSelectedContextId("__none__")}
                subtitle="Live context sent with the next copilot request"
                title={selectedContext.label}
              />
            ) : (
              <EmptyState className="ai-context-deck__empty" title="No context selected" description="Choose a signal to attach live operational metadata." />
            )}
          </div>
        </section>
      </MotionReveal>

      <MotionReveal className="ai-command-reveal" variant="slide">
        <section className="ai-command-rail" aria-labelledby="ai-command-title">
          <div>
            <p className="art-eyebrow">Current context</p>
            <h2 id="ai-command-title" className="mt-2 text-2xl font-black text-white">Ask from the signal you selected.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {selectedContext ? `${selectedContext.label} is attached to your next request.` : "Select an operational signal to attach context."}
            </p>
          </div>
          <TabList>
            {(Object.keys(workflowPrompts) as Workflow[]).map((item) => (
              <TabButton key={item} active={workflow === item} onClick={() => { setWorkflow(item); setMessage(workflowPrompts[item]); }}>
                {item}
              </TabButton>
            ))}
          </TabList>
          <div className="ai-chat-compose">
            <Textarea aria-label="Ask PlusOps" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask PlusOps about the selected operational context" />
            <Button disabled={chatMutation.isPending || !message.trim() || !selectedContext} onClick={submitChat}>
              {chatMutation.isPending ? "Thinking..." : "Send through core"}
            </Button>
          </div>
        </section>
      </MotionReveal>

      <section className="ai-workflow-grid grid gap-10 xl:grid-cols-[0.82fr_1.18fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Response thread</p>
          <div className="mt-6 space-y-5">
            {chatHistory.length ? chatHistory.map((entry, index) => (
              <div key={`${entry.role}-${index}`} className="ai-path-row" data-role={entry.role}>
                <span>{entry.role}</span>
                <p>{entry.content}</p>
              </div>
            )) : <EmptyState className="min-h-56" title="No response yet" description="Choose a context node and send a question." />}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <p className="art-eyebrow">Engineering workflows</p>
          <div className="ai-workflow-section mt-6 space-y-5">
            <TabList>
              {tools.map((tool) => (
                <TabButton key={tool.id} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}>
                  <tool.icon className="size-4" aria-hidden="true" />
                  {tool.label}
                </TabButton>
              ))}
            </TabList>
            <form className="ai-workflow-panel" onSubmit={(event) => {
              event.preventDefault();
              const input = toolInput.trim();
              if (!input) return;
              const context = selectedContext?.context;
              if (activeTool === "sql") {
                toolMutation.mutate({ path: "sql", payload: { provider: selectedProvider?.provider, input, dialect: "postgresql", variables: {}, context } });
              } else if (activeTool === "release-notes") {
                toolMutation.mutate({ path: "release-notes", payload: { provider: selectedProvider?.provider, version: "v1.0.0-beta.1", changes: input.split("\n").filter(Boolean), variables: {}, context } });
              } else {
                toolMutation.mutate({ path: activeTool, payload: { provider: selectedProvider?.provider, input, variables: {}, context } });
              }
            }}>
              <label className="space-y-2">
                <FieldLabel htmlFor="tool-input">Workflow input</FieldLabel>
                <Textarea id="tool-input" value={toolInput} onChange={(event) => setToolInput(event.target.value)} placeholder={tools.find((tool) => tool.id === activeTool)?.placeholder} />
                <Button disabled={toolMutation.isPending || !toolInput.trim()} type="submit">{toolMutation.isPending ? "Running..." : "Run workflow"}</Button>
              </label>
              <div className="ai-response-panel" aria-live="polite">
                {latestOutput ? <pre className="whitespace-pre-wrap text-sm leading-7 text-foreground">{latestOutput}</pre> : <EmptyState className="min-h-48" title="No workflow output" />}
              </div>
            </form>
          </div>
        </ScrollReveal>
      </section>

      <MotionReveal variant="fade">
        <section className="ai-playground-strip" aria-labelledby="playground-title">
          <div>
            <p className="art-eyebrow">Controlled experiment</p>
            <h2 id="playground-title" className="mt-2 text-2xl font-black text-white">Playground</h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Test a system and user prompt through the same provider pipeline without leaving PlusOps.</p>
          </div>
          <form className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => {
            event.preventDefault();
            playgroundMutation.mutate({ provider: selectedProvider?.provider, systemPrompt: playgroundSystem, userPrompt: playgroundUser, variables: {}, context: selectedContext?.context });
          }}>
            <label className="space-y-2"><FieldLabel>System prompt</FieldLabel><Textarea value={playgroundSystem} onChange={(event) => setPlaygroundSystem(event.target.value)} /></label>
            <label className="space-y-2"><FieldLabel>User prompt</FieldLabel><Textarea value={playgroundUser} onChange={(event) => setPlaygroundUser(event.target.value)} /></label>
            <div className="flex items-end"><Button disabled={playgroundMutation.isPending} type="submit">Run playground</Button></div>
          </form>
        </section>
      </MotionReveal>

      <div className="grid grid-cols-3 gap-5" aria-label="AI usage summary">
        <CopilotSignal icon={Bot} label="Providers" value={formatNumber(providers.length)} />
        <CopilotSignal icon={MessagesSquare} label="Tokens" value={latestUsage ? formatNumber(latestUsage.totalTokens) : "0"} />
        <CopilotSignal icon={TerminalSquare} label="Latency" value={latestUsage ? formatDurationMs(latestUsage.latencyMs) : "n/a"} />
      </div>
    </div>
  );
}

export function buildContextNodes({
  incidents,
  services,
  metrics,
  alerts,
  healthByServiceId
}: {
  incidents: IncidentSummary[];
  services: ServiceSummary[];
  metrics: MetricDefinition[];
  alerts: AlertRule[];
  healthByServiceId: Map<string, ServiceHealthResponse>;
}): ContextNode[] {
  const nodes: ContextNode[] = [];
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const activeIncident = incidents.find((incident) => !["resolved", "closed"].includes(incident.status));
  if (activeIncident) {
    const service = serviceById.get(activeIncident.serviceId);
    const relatedAlert = alerts.find((alert) => alert.condition.serviceId === activeIncident.serviceId && alert.state === "firing");
    nodes.push({
      id: `incident:${activeIncident.id}`,
      kind: "incident",
      label: activeIncident.title,
      status: toSignalStatus(activeIncident.status),
      severity: activeIncident.severity === "sev1" ? "critical" : "warning",
      value: activeIncident.severity.toUpperCase(),
      meta: service?.name ?? activeIncident.serviceName,
      ...nodePositions[nodes.length]!,
      icon: TriangleAlert,
      context: { incidentId: activeIncident.id, serviceId: activeIncident.serviceId, environment: "production", tags: [activeIncident.severity, activeIncident.status] },
      inspector: [
        { label: "Severity", value: activeIncident.severity.toUpperCase(), state: activeIncident.severity === "sev1" ? "danger" : "warning" },
        { label: "Status", value: activeIncident.status },
        { label: "Service", value: service?.name ?? activeIncident.serviceName },
        { label: "Alert", value: relatedAlert?.name ?? "No linked firing alert", state: relatedAlert ? "danger" : "neutral" }
      ]
    });
  }

  const firingAlert = alerts.find((alert) => alert.state === "firing");
  if (firingAlert) {
    const service = firingAlert.condition.serviceId ? serviceById.get(firingAlert.condition.serviceId) : undefined;
    nodes.push({
      id: `alert:${firingAlert.id}`,
      kind: "alert",
      label: firingAlert.name,
      status: firingAlert.state,
      severity: firingAlert.severity,
      value: firingAlert.condition.aggregation,
      meta: service?.name ?? "system signal",
      ...nodePositions[nodes.length]!,
      icon: TriangleAlert,
      context: { serviceId: firingAlert.condition.serviceId, environment: "production", tags: [firingAlert.severity, firingAlert.state] },
      inspector: [
        { label: "State", value: firingAlert.state.toUpperCase(), state: "danger" },
        { label: "Severity", value: firingAlert.severity.toUpperCase() },
        { label: "Condition", value: `${firingAlert.condition.metricName ?? "Metric"} ${firingAlert.condition.threshold.operator.replaceAll("_", " ")}` },
        { label: "Service", value: service?.name ?? "All services" }
      ]
    });
  }

  const degradedService = services.find((service) => {
    const state = healthByServiceId.get(service.id)?.status;
    return state === "degraded" || state === "unhealthy";
  }) ?? services[0];
  if (degradedService) {
    const serviceHealth = healthByServiceId.get(degradedService.id);
    nodes.push({
      id: `service:${degradedService.id}`,
      kind: "service",
      label: degradedService.name,
      status: toSignalStatus(serviceHealth?.status ?? degradedService.lifecycleStatus),
      severity: serviceHealth?.status === "unhealthy" ? "critical" : "warning",
      value: serviceHealth ? serviceHealth.status : `T${degradedService.tier}`,
      meta: degradedService.ownerTeamName,
      ...nodePositions[nodes.length]!,
      icon: Network,
      context: { serviceId: degradedService.id, environment: "production", tags: [degradedService.lifecycleStatus, "service"] },
      inspector: [
        { label: "Health", value: serviceHealth?.status ?? "Unknown", state: serviceHealth?.status === "unhealthy" ? "danger" : "warning" },
        { label: "Owner", value: degradedService.ownerTeamName },
        { label: "Tier", value: `Tier ${degradedService.tier}` },
        { label: "Lifecycle", value: degradedService.lifecycleStatus }
      ]
    });
  }

  const metric = metrics.find((item) => item.serviceId === degradedService?.id) ?? metrics[0];
  if (metric) {
    const service = serviceById.get(metric.serviceId);
    nodes.push({
      id: `metric:${metric.id}`,
      kind: "metric",
      label: metric.displayName,
      status: "unknown",
      value: metric.unit,
      meta: service?.name ?? "system metric",
      ...nodePositions[nodes.length]!,
      icon: Activity,
      context: { serviceId: metric.serviceId, environment: "production", tags: [metric.type, metric.unit], metadata: { metricId: metric.id, metricName: metric.name } },
      inspector: [
        { label: "Definition", value: metric.name },
        { label: "Unit", value: metric.unit },
        { label: "Aggregation", value: metric.defaultAggregation },
        { label: "Service", value: service?.name ?? "Unknown" }
      ]
    });
  }

  return nodes;
}

function toSignalStatus(value: string): SignalNodeStatus {
  const statuses: SignalNodeStatus[] = [
    "healthy", "degraded", "unhealthy", "unknown", "archived", "open", "investigating",
    "identified", "mitigated", "monitoring", "closed", "ok", "pending", "firing", "resolved",
    "muted", "warning", "critical"
  ];
  return statuses.includes(value as SignalNodeStatus) ? value as SignalNodeStatus : "unknown";
}

function CopilotSignal({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) {
  return <div className="border-t border-white/[0.14] pt-4"><Icon className="size-4 text-primary" aria-hidden="true" /><p className="mt-3 text-2xl font-black text-white">{value}</p><p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p></div>;
}
