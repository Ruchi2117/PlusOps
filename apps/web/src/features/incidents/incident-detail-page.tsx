import type { IncidentSeverity, IncidentStatus } from "@plusops/contracts";
import { FilePlus2, MessageSquarePlus, Paperclip, SendHorizontal, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, RetryButton } from "../../components/ui/data-state";
import { FieldLabel, Input, Select, Textarea } from "../../components/ui/form-controls";
import { PageHeader } from "../../components/ui/page-header";
import {
  IncidentSeverityBadge,
  IncidentStatusBadge,
  PriorityBadge
} from "../../components/ui/status-badge";
import { Skeleton } from "../../components/ui/skeleton";
import { formatDateTime, formatNumber, titleCase } from "../../lib/format";
import {
  useIncident,
  useIncidentAttachments,
  useIncidentMutations
} from "../platform/use-platform-data";

const workflowStatuses: IncidentStatus[] = [
  "open",
  "investigating",
  "identified",
  "mitigated",
  "monitoring",
  "resolved",
  "closed"
];

const severities: IncidentSeverity[] = ["sev1", "sev2", "sev3", "sev4"];

export function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.incidentId ?? "";
  const incidentQuery = useIncident(incidentId);
  const attachmentsQuery = useIncidentAttachments(incidentId);
  const incidentMutations = useIncidentMutations(incidentId);
  const [comment, setComment] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  if (incidentQuery.isLoading) {
    return <IncidentDetailSkeleton />;
  }

  if (incidentQuery.isError || !incidentQuery.data) {
    return (
      <ErrorState
        title="Incident unavailable"
        description="The selected incident could not be loaded."
        action={<RetryButton onRetry={() => void incidentQuery.refetch()} />}
      />
    );
  }

  const incident = incidentQuery.data.incident;
  const attachments = attachmentsQuery.data?.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={incident.title}
        description={`${incident.serviceName} updated ${formatDateTime(incident.updatedAt)}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link to="/incidents">Back to queue</Link>
            </Button>
            <Button
              disabled={incidentMutations.changeStatus.isPending}
              onClick={() => incidentMutations.changeStatus.mutate("resolved")}
            >
              Resolve
            </Button>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Incident posture">
        <SummaryTile label="Severity" value={<IncidentSeverityBadge severity={incident.severity} />} />
        <SummaryTile label="Priority" value={<PriorityBadge priority={incident.priority} />} />
        <SummaryTile label="Status" value={<IncidentStatusBadge status={incident.status} />} />
        <SummaryTile label="Assignee" value={incident.assigneeName ?? "Unassigned"} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Impact and response</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Customer impact</p>
                <p className="mt-2 text-sm leading-6">{incident.customerImpact ?? "No impact recorded."}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Description</p>
                <p className="mt-2 text-sm leading-6">{incident.description ?? "No description recorded."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {incident.tags.map((tag) => (
                  <Badge key={tag.id} variant="neutral">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Timeline</CardTitle>
              <Badge variant="info">{formatNumber(incident.timeline.length)} events</Badge>
            </CardHeader>
            <CardContent>
              {incident.timeline.length ? (
                <ol className="space-y-4">
                  {incident.timeline.map((event) => (
                    <li key={event.id} className="grid grid-cols-[1.25rem_1fr] gap-3">
                      <span className="mt-1 size-2 rounded-full bg-primary" aria-hidden="true" />
                      <div className="ops-row p-3">
                        <p className="text-sm font-medium">{event.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {titleCase(event.type)} at {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No timeline events yet" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Comments</CardTitle>
              <MessageSquarePlus className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-4">
              {incident.comments.length ? (
                incident.comments.map((item) => (
                  <article key={item.id} className="ops-row p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="ops-icon-tile">
                          <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.authorName}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6">{item.body}</p>
                  </article>
                ))
              ) : (
                <EmptyState title="No comments yet" />
              )}
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!comment.trim()) {
                    return;
                  }
                  incidentMutations.addComment.mutate(comment.trim(), {
                    onSuccess: () => setComment("")
                  });
                }}
              >
                <FieldLabel htmlFor="incident-comment">Add response update</FieldLabel>
                <Textarea
                  id="incident-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share the latest investigation note"
                />
                <Button disabled={incidentMutations.addComment.isPending || !comment.trim()} type="submit">
                  <SendHorizontal className="size-4" aria-hidden="true" />
                  Comment
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="space-y-1">
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={incident.status}
                  onChange={(event) => incidentMutations.changeStatus.mutate(event.target.value as IncidentStatus)}
                >
                  {workflowStatuses.map((status) => (
                    <option key={status} value={status}>
                      {titleCase(status)}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="space-y-1">
                <FieldLabel>Severity</FieldLabel>
                <Select
                  value={incident.severity}
                  onChange={(event) => incidentMutations.changeSeverity.mutate(event.target.value as IncidentSeverity)}
                >
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity.toUpperCase()}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => incidentMutations.changeStatus.mutate("monitoring")}
                >
                  Monitor
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => incidentMutations.changeStatus.mutate("closed")}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attachments</CardTitle>
              <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent className="space-y-3">
              {attachmentsQuery.isLoading ? (
                <Skeleton className="h-32" />
              ) : attachmentsQuery.isError ? (
                <ErrorState
                  className="min-h-32"
                  title="Attachments unavailable"
                  description="Attachment metadata could not be loaded from the API."
                  action={<RetryButton onRetry={() => void attachmentsQuery.refetch()} />}
                />
              ) : attachments.length ? (
                attachments.map((attachment) => (
                  <div key={attachment.id} className="ops-row p-3">
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attachment.contentType} by {attachment.uploadedByName}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState className="min-h-32" title="No attachments" />
              )}
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!attachmentName.trim()) {
                    return;
                  }
                  incidentMutations.addAttachment.mutate(
                    {
                      filename: attachmentName.trim(),
                      contentType: "text/plain",
                      size: 1024
                    },
                    {
                      onSuccess: () => setAttachmentName("")
                    }
                  );
                }}
              >
                <FieldLabel htmlFor="attachment-name">Attachment metadata</FieldLabel>
                <Input
                  id="attachment-name"
                  placeholder="timeline-export.txt"
                  value={attachmentName}
                  onChange={(event) => setAttachmentName(event.target.value)}
                />
                <Button
                  disabled={incidentMutations.addAttachment.isPending || !attachmentName.trim()}
                  type="submit"
                  variant="secondary"
                >
                  <FilePlus2 className="size-4" aria-hidden="true" />
                  Add metadata
                </Button>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="ops-row bg-surface/72 p-4 shadow-panel">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-3 text-sm font-semibold">{value}</div>
    </div>
  );
}

function IncidentDetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-14 w-full max-w-xl" />
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Skeleton className="h-[36rem]" />
        <Skeleton className="h-[28rem]" />
      </div>
    </div>
  );
}
