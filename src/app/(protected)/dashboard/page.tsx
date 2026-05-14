"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Play,
  Search,
  Users,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type {
  CallApiRow,
  CallDashboardResponse,
  CallDirection,
  CallRecordStatus
} from "@/types/call";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function outcomeBadgeVariant(
  outcome: CallRecordStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (outcome) {
    case "ended":
      return "default";
    case "cancelled":
      return "secondary";
    case "failed":
    case "no_answer":
      return "destructive";
    default:
      return "outline";
  }
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  className
}: {
  title: string;
  value: number;
  hint: string;
  icon: typeof Phone;
  className?: string;
}) {
  return (
    <Card size="sm" className={cn("overflow-hidden shadow-sm", className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | CallDirection>(
    "all"
  );
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | CallRecordStatus>(
    "all"
  );

  const { data, isLoading, isError, refetch, isFetching } =
    useQuery<CallDashboardResponse>({
      queryKey: ["calls-dashboard"],
      queryFn: async () => {
        const res = await fetch("/api/calls", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load calls");
        return res.json();
      },
      // Global QueryProvider uses 1m staleTime; calls must refetch when revisiting after dialer saves.
      staleTime: 0,
      refetchOnMount: "always",
    });

  const filteredCalls = useMemo(() => {
    const list = data?.calls ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((row) => {
      if (directionFilter !== "all" && row.direction !== directionFilter) {
        return false;
      }
      if (outcomeFilter !== "all" && row.outcome !== outcomeFilter) {
        return false;
      }
      if (!q) return true;
      return (
        row.phoneNumber.toLowerCase().includes(q) ||
        row.userName.toLowerCase().includes(q) ||
        row.sessionId.toLowerCase().includes(q) ||
        row.cause.toLowerCase().includes(q)
      );
    });
  }, [data?.calls, search, directionFilter, outcomeFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    directionFilter !== "all" ||
    outcomeFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setDirectionFilter("all");
    setOutcomeFilter("all");
  };

  const stats = data?.stats;

  return (
    <div className="mx-auto container px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Call activity and history for your account
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["a", "b", "c", "d"] as const).map((id) => (
            <Card key={id} size="sm" className="animate-pulse">
              <CardHeader className="h-10" />
              <CardContent>
                <div className="h-8 w-20 rounded bg-muted" />
                <div className="mt-2 h-3 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle>Could not load data</CardTitle>
            <CardDescription>
              Check your connection and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total calls"
            value={stats?.total ?? 0}
            hint="All time for your user"
            icon={Phone}
          />
          <StatCard
            title="Incoming"
            value={stats?.incoming ?? 0}
            hint="Received direction"
            icon={ArrowDownLeft}
            className="border-l-4 border-l-emerald-500/60"
          />
          <StatCard
            title="Outgoing"
            value={stats?.outgoing ?? 0}
            hint="Placed direction"
            icon={ArrowUpRight}
            className="border-l-4 border-l-sky-500/60"
          />
          <StatCard
            title="Unique clients"
            value={stats?.uniqueClients ?? 0}
            hint="Distinct phone numbers"
            icon={Users}
            className="border-l-4 border-l-violet-500/60"
          />
        </div>
      )}

      <Card className="mt-8 shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Call log</CardTitle>
              <CardDescription>
                Filter and review saved calls. Stats above reflect all calls;
                the table respects your filters.
              </CardDescription>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1 text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="grid flex-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="call-search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="call-search"
                    placeholder="Phone, name, session…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    disabled={isLoading || isError}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={directionFilter}
                  onValueChange={(v) =>
                    setDirectionFilter(v as "all" | CallDirection)
                  }
                  disabled={isLoading || isError}
                >
                  <SelectTrigger className="w-full min-w-[140px]">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All directions</SelectItem>
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Outcome</Label>
                <Select
                  value={outcomeFilter}
                  onValueChange={(v) =>
                    setOutcomeFilter(v as "all" | CallRecordStatus)
                  }
                  disabled={isLoading || isError}
                >
                  <SelectTrigger className="w-full min-w-[140px]">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="no_answer">No answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="rounded-xl border bg-card/50">
            <div className="overflow-x-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="h-11 px-4 whitespace-nowrap">Dialed</th>
                    <th className="h-11 px-4 whitespace-nowrap">Number</th>
                    <th className="h-11 px-4 whitespace-nowrap">Direction</th>
                    <th className="h-11 px-4 whitespace-nowrap">Outcome</th>
                    <th className="h-11 px-4 whitespace-nowrap">Duration</th>
                    <th className="h-11 px-4 whitespace-nowrap min-w-[200px]">
                      Recording
                    </th>
                    <th className="h-11 px-4 whitespace-nowrap min-w-[140px]">
                      Agent
                    </th>
                    <th className="h-11 px-4 whitespace-nowrap min-w-[100px]">
                      Flags
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && !isError && filteredCalls.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="h-32 px-4 text-center text-muted-foreground"
                      >
                        {data?.calls.length === 0
                          ? "No calls yet. Place a call from the dialer to see it here."
                          : "No calls match your filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredCalls.map((row) => (
                      <CallTableRow key={row.id} row={row} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {!isLoading && !isError && (
              <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {filteredCalls.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">
                  {data?.calls.length ?? 0}
                </span>{" "}
                calls
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Visual-only “recording” (no audio file, no playback). Duration matches the saved call. */
function CallRecordingCell({
  durationSeconds,
  callId
}: {
  durationSeconds: number;
  callId: string;
}) {
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < callId.length; i++) {
      seed = (seed + callId.charCodeAt(i) * (i + 1)) % 997;
    }
    seed = (seed + durationSeconds * 31) % 997;
    const count = 14;
    const out: { key: string; h: number }[] = [];
    let n = seed;
    for (let k = 0; k < count; k++) {
      const v = n % 12;
      out.push({ h: 4 + v, key: `${callId}-r-${n}` });
      n = (n + 7919) % 1_000_003;
    }
    return out;
  }, [callId, durationSeconds]);

  return (
    <div className="flex max-w-[240px] items-center gap-2">
      <span className="sr-only">
        Recording placeholder, length {formatDuration(durationSeconds)}
      </span>
      <div
        className="flex h-8 shrink-0 items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/40 px-1.5"
        title="No audio file (placeholder)"
      >
        <Play className="size-3.5 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex h-6 items-end gap-px" aria-hidden>
          {bars.map(({ h, key }) => (
            <div
              key={key}
              className="w-0.5 shrink-0 rounded-sm bg-primary/35"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
        <p className="text-[10px] font-medium tabular-nums text-muted-foreground">
          {formatDuration(durationSeconds)}
        </p>
      </div>
    </div>
  );
}

function CallTableRow({ row }: { row: CallApiRow }) {
  return (
    <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3 align-middle text-muted-foreground tabular-nums">
        {formatDateTime(row.dialedAt)}
      </td>
      <td className="px-4 py-3 align-middle font-mono text-xs sm:text-sm">
        {row.phoneNumber}
      </td>
      <td className="px-4 py-3 align-middle">
        <Badge
          variant={row.direction === "incoming" ? "secondary" : "outline"}
          className="capitalize"
        >
          {row.direction === "incoming" ? (
            <ArrowDownLeft className="mr-1" />
          ) : (
            <ArrowUpRight className="mr-1" />
          )}
          {row.direction}
        </Badge>
      </td>
      <td className="px-4 py-3 align-middle">
        <Badge
          variant={outcomeBadgeVariant(row.outcome)}
          className="capitalize"
        >
          {row.outcome.replace(/_/g, " ")}
        </Badge>
      </td>
      <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
        {formatDuration(row.durationSeconds)}
      </td>
      <td className="px-4 py-3 align-middle">
        <CallRecordingCell
          durationSeconds={row.durationSeconds}
          callId={row.id}
        />
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium leading-tight">
            {row.userName || "—"}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Ext. {row.extensionId}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-wrap gap-1">
          {row.wasHold && (
            <Badge variant="outline" className="text-[10px]">
              Hold
            </Badge>
          )}
          {row.wasMuted && (
            <Badge variant="outline" className="text-[10px]">
              Muted
            </Badge>
          )}
          {!row.wasHold && !row.wasMuted && (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
