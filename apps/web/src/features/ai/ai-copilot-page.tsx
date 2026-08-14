import type { AIProvider } from "@plusops/contracts";
import { Bot, Code2, Database, FileText, MessagesSquare, Sparkles, TerminalSquare } from "lucide-react";
import { useMemo, useState } from "react";

import { GlassOrbit } from "../../components/spatial/glass-orbit";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Select, Textarea } from "../../components/ui/form-controls";
import { ScrollReveal } from "../../components/ui/scroll-reveal";
import { Skeleton } from "../../components/ui/skeleton";
import { TabButton, TabList } from "../../components/ui/tabs";
import { formatDurationMs, formatNumber } from "../../lib/format";
import { visualAssets } from "../../lib/visual-assets";
import { useAIChat, useAIPlayground, useAIProviders, useAITool } from "../platform/use-platform-data";

type CopilotTool = {
  id: "log-analysis" | "stacktrace" | "incident-summary" | "sql" | "docs" | "release-notes";
  label: string;
  icon: typeof TerminalSquare;
  placeholder: string;
};

const tools: CopilotTool[] = [
  { id: "log-analysis", label: "Analyze logs", icon: TerminalSquare, placeholder: "Paste application logs or deploy logs" },
  { id: "stacktrace", label: "Explain stack trace", icon: Code2, placeholder: "Paste a stack trace" },
  { id: "incident-summary", label: "Summarize incident", icon: MessagesSquare, placeholder: "Paste incident updates" },
  { id: "sql", label: "Write SQL", icon: Database, placeholder: "Describe the query you need" },
  { id: "docs", label: "Generate API docs", icon: FileText, placeholder: "Paste endpoint behavior or controller notes" },
  { id: "release-notes", label: "Release notes", icon: Sparkles, placeholder: "List shipped changes, one per line" }
];

const orbitPrompts = [
  "Why is checkout latency increasing?",
  "Find the service most likely causing this incident.",
  "Explain the webhook backlog.",
  "Draft release notes from shipped changes."
];

export function AICopilotPage() {
  const providersQuery = useAIProviders();
  const chatMutation = useAIChat();
  const playgroundMutation = useAIPlayground();
  const toolMutation = useAITool();
  const providers = providersQuery.data?.data ?? [];
  const [provider, setProvider] = useState<AIProvider | "">("");
  const [message, setMessage] = useState("Why is checkout latency increasing?");
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [activeTool, setActiveTool] = useState<CopilotTool["id"]>("log-analysis");
  const [toolInput, setToolInput] = useState("Checkout latency exceeded p95 target after production deploy c51cd8e.");
  const [playgroundSystem, setPlaygroundSystem] = useState("You are PlusOps, an engineering operations copilot.");
  const [playgroundUser, setPlaygroundUser] = useState("Explain the likely cause of a degraded readiness check.");

  const selectedProvider = useMemo(
    () => providers.find((item) => item.provider === provider) ?? providers.find((item) => item.isEnabled),
    [provider, providers]
  );
  const latestUsage = chatMutation.data?.usage ?? playgroundMutation.data?.usage ?? toolMutation.data?.usage ?? null;
  const latestOutput = chatMutation.data?.output ?? playgroundMutation.data?.output ?? toolMutation.data?.output ?? "";

  if (providersQuery.isLoading) {
    return <Skeleton className="h-[calc(100vh-8rem)]" />;
  }

  if (providersQuery.isError) {
    return (
      <ErrorState
        title="AI providers unavailable"
        description="The simulated provider catalog could not be loaded from the API."
        action={<RetryButton onRetry={() => void providersQuery.refetch()} />}
      />
    );
  }

  const submitChat = () => {
    const content = message.trim();
    if (!content) {
      return;
    }

    setChatHistory((items) => [...items, { role: "user", content }]);
    chatMutation.mutate(
      {
        provider: selectedProvider?.provider,
        message: content,
        context: { environment: "production", tags: ["beta", "operations"] }
      },
      {
        onSuccess: (response) => {
          setChatHistory((items) => [...items, { role: "assistant", content: response.output }]);
          setMessage("");
        }
      }
    );
  };

  return (
    <div className="space-y-16">
      <section className="portal-core p-6 md:p-10 lg:p-14">
        <img
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-42"
          src={visualAssets.lightSail}
          alt=""
          loading="lazy"
        />
        <img
          className="absolute -right-[6%] top-[10%] h-[42%] w-[38%] rotate-6 object-cover opacity-32 mix-blend-screen blur-[1px]"
          src={visualAssets.orangeOrbit}
          alt=""
          loading="lazy"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,transparent_0%,rgb(0_0_0_/_0.25)_31%,rgb(0_0_0_/_0.88)_82%)]" />
        <div className="relative grid min-h-[42rem] gap-10 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-between">
            <ScrollReveal>
              <p className="art-eyebrow">AI intelligence layer</p>
              <h1 className="mt-6 text-[clamp(2.65rem,4.8vw,4.9rem)] font-black leading-[0.9] text-white">
                What do
                <br />
                you want
                <br />
                to know?
              </h1>
            </ScrollReveal>

            <ScrollReveal className="max-w-xl" delay={0.08}>
              <label className="space-y-3">
                <FieldLabel htmlFor="ai-message">Ask the system</FieldLabel>
                <Textarea
                  id="ai-message"
                  className="min-h-36 border-white/[0.09] bg-black/45 text-lg leading-8"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Signals: incident / service / metric / alert</p>
                <Button disabled={chatMutation.isPending || !message.trim()} onClick={submitChat}>
                  Send through core
                </Button>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal className="relative grid gap-6" delay={0.12} distance={28}>
            <div className="ai-provider-panel relative z-20 ml-auto w-full max-w-sm border-t border-white/[0.14] pt-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedProvider?.displayName ?? "Auto provider"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedProvider?.model ?? "simulated"}</p>
                </div>
                <Badge variant={selectedProvider?.isEnabled ? "success" : "neutral"}>
                  {selectedProvider?.isEnabled ? "Enabled" : "Auto"}
                </Badge>
              </div>
              <label className="mt-5 block space-y-2">
                <FieldLabel>Provider</FieldLabel>
                <Select value={provider} onChange={(event) => setProvider(event.target.value as AIProvider)}>
                  <option value="">Auto</option>
                  {providers.map((item) => (
                    <option key={item.id} value={item.provider}>
                      {item.displayName} - {item.model}
                    </option>
                  ))}
                </Select>
              </label>
            </div>

            <div className="relative min-h-[24rem] md:min-h-[27rem]">
              <GlassOrbit className="absolute left-1/2 top-1/2 z-[1] size-[min(28rem,74vw)] -translate-x-1/2 -translate-y-1/2 opacity-80" />
              <div className="ai-orbit" aria-hidden="true">
                <div className="ai-orbit__ring ai-orbit__ring--outer" />
                <div className="ai-orbit__ring ai-orbit__ring--inner" />
              </div>
              <div className="absolute left-1/2 top-1/2 z-10 grid size-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/[0.14] bg-black/35 text-center shadow-[0_0_90px_rgb(255_132_43_/_0.28)] backdrop-blur-xl">
                <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle_at_42%_30%,rgb(255_238_193_/_0.42),rgb(255_132_43_/_0.2)_32%,rgb(0_0_0_/_0.32)_72%)]" />
                <Bot className="relative size-9 text-primary" aria-hidden="true" />
              </div>
              <div className="absolute left-1/2 top-[calc(50%+5.4rem)] z-10 -translate-x-1/2 text-center">
                <p className="mt-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-white">AI core</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {orbitPrompts.map((prompt) => (
                <button key={prompt} type="button" className="ai-orbit__prompt" onClick={() => setMessage(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>

            <div className="grid w-full grid-cols-3 gap-4">
              <CopilotSignal icon={Bot} label="Providers" value={formatNumber(providers.length)} />
              <CopilotSignal icon={MessagesSquare} label="Tokens" value={latestUsage ? formatNumber(latestUsage.totalTokens) : "0"} />
              <CopilotSignal icon={TerminalSquare} label="Latency" value={latestUsage ? formatDurationMs(latestUsage.latencyMs) : "n/a"} />
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.85fr_1.15fr]">
        <ScrollReveal>
          <p className="art-eyebrow">Reasoning path</p>
          <div className="mt-8 space-y-5">
            {chatHistory.length ? (
              chatHistory.map((entry, index) => (
                <div key={`${entry.role}-${index}`} className="ai-path-row" data-role={entry.role}>
                  <span>{entry.role}</span>
                  <p>{entry.content}</p>
                </div>
              ))
            ) : (
              <EmptyState className="min-h-80" title="No reasoning path yet" />
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <p className="art-eyebrow">Engineering copilots</p>
          <div className="mt-6 space-y-5">
            <TabList>
              {tools.map((tool) => (
                <TabButton key={tool.id} active={activeTool === tool.id} onClick={() => setActiveTool(tool.id)}>
                  <tool.icon className="size-4" aria-hidden="true" />
                  {tool.label}
                </TabButton>
              ))}
            </TabList>
            <form
              className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]"
              onSubmit={(event) => {
                event.preventDefault();
                const input = toolInput.trim();
                if (!input) {
                  return;
                }

                if (activeTool === "sql") {
                  toolMutation.mutate({
                    path: "sql",
                    payload: { provider: selectedProvider?.provider, input, dialect: "postgresql", variables: {} }
                  });
                  return;
                }

                if (activeTool === "release-notes") {
                  toolMutation.mutate({
                    path: "release-notes",
                    payload: {
                      provider: selectedProvider?.provider,
                      version: "v1.0.0-beta.1",
                      changes: input.split("\n").filter(Boolean),
                      variables: {}
                    }
                  });
                  return;
                }

                toolMutation.mutate({
                  path: activeTool,
                  payload: { provider: selectedProvider?.provider, input, variables: {} }
                });
              }}
            >
              <label className="space-y-2">
                <FieldLabel htmlFor="tool-input">Input surface</FieldLabel>
                <Textarea
                  id="tool-input"
                  value={toolInput}
                  onChange={(event) => setToolInput(event.target.value)}
                  placeholder={tools.find((tool) => tool.id === activeTool)?.placeholder}
                />
                <Button disabled={toolMutation.isPending || !toolInput.trim()} type="submit">
                  Run copilot
                </Button>
              </label>

              <div className="min-h-80 border-t border-white/[0.14] bg-black/20 p-5">
                {latestOutput ? (
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-foreground">{latestOutput}</pre>
                ) : (
                  <EmptyState className="min-h-72" title="No copilot output" />
                )}
              </div>
            </form>
          </div>
        </ScrollReveal>
      </section>

      <ScrollReveal className="relative overflow-hidden rounded-lg border border-white/[0.07] bg-black p-6 md:p-8">
        <img className="absolute inset-0 h-full w-full object-cover opacity-30" src={visualAssets.redPanelCorridor} alt="" loading="lazy" />
        <div className="absolute inset-0 bg-black/68" />
        <form
          className="relative grid gap-5 xl:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            playgroundMutation.mutate({
              provider: selectedProvider?.provider,
              systemPrompt: playgroundSystem,
              userPrompt: playgroundUser,
              variables: {}
            });
          }}
        >
          <label className="space-y-2">
            <FieldLabel>System prompt</FieldLabel>
            <Textarea value={playgroundSystem} onChange={(event) => setPlaygroundSystem(event.target.value)} />
          </label>
          <label className="space-y-2">
            <FieldLabel>User prompt</FieldLabel>
            <Textarea value={playgroundUser} onChange={(event) => setPlaygroundUser(event.target.value)} />
          </label>
          <div className="flex items-end">
            <Button disabled={playgroundMutation.isPending} type="submit">
              Run playground
            </Button>
          </div>
        </form>
      </ScrollReveal>
    </div>
  );
}

function CopilotSignal({ icon: Icon, label, value }: { icon: typeof Bot; label: string; value: string }) {
  return (
    <div className="border-t border-white/[0.14] pt-4">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    </div>
  );
}
