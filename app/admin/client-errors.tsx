import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { webScrollStyle } from "@/constants/layout";
import { C } from "@/constants/colors";
import { AuthGuard, useAuth } from "@/lib/auth";
import { alertConfirm, alertError, alertMessage } from "@/lib/alertCompat";
import { apiRequest } from "@/lib/query-client";

type ClientErrorEventRow = {
  id: number;
  kind: string;
  severity: string;
  title: string | null;
  message: string;
  status: number | null;
  code: string | null;
  route: string | null;
  method: string | null;
  requestUrl: string | null;
  userId: number | null;
  sessionId: string | null;
  platform: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  payloadJson: string | null;
  stack: string | null;
  componentStack: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedBy: number | null;
};

type SeverityFilter = "all" | "error" | "warning" | "info";
type KindFilter = "all" | "api_error" | "ui_alert" | "render_error" | "auth_error" | "action_error";
type SourceFilter = "all" | "upload" | "video_playback" | "other";
type ViewMode = "grouped" | "timeline";

type GroupedRow = {
  key: string;
  representative: ClientErrorEventRow;
  count: number;
  uniqueUsers: number;
  uniqueSessions: number;
  firstSeen: string | null;
  lastSeen: string | null;
  rows: ClientErrorEventRow[];
};

const FETCH_LIMIT = 400;
const POLL_INTERVAL_MS = 30_000;

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "upload", label: "Upload" },
  { id: "video_playback", label: "Playback" },
  { id: "other", label: "Other" },
];

const SEVERITY_FILTERS: { id: SeverityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "error", label: "Errors" },
  { id: "warning", label: "Warnings" },
  { id: "info", label: "Info" },
];

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All kinds" },
  { id: "api_error", label: "API" },
  { id: "ui_alert", label: "UI" },
  { id: "render_error", label: "Render" },
  { id: "auth_error", label: "Auth" },
  { id: "action_error", label: "Action" },
];

function isAdminRole(role?: string | null) {
  return (role ?? "").toUpperCase() === "ADMIN";
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const h = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  const sec = `${d.getSeconds()}`.padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}:${sec}`;
}

function formatRelative(iso?: string | null) {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDateTime(iso);
}

function prettyLabel(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parsePayloadExtra(row: ClientErrorEventRow): Record<string, unknown> | null {
  if (!row.payloadJson) return null;
  try {
    const parsed = JSON.parse(row.payloadJson) as unknown;
    return parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function payloadSource(row: ClientErrorEventRow): string | null {
  const extra = parsePayloadExtra(row);
  const source = extra?.source;
  return typeof source === "string" && source.trim() ? source.trim() : null;
}

function payloadStage(row: ClientErrorEventRow): string | null {
  const extra = parsePayloadExtra(row);
  const stage = extra?.stage;
  return typeof stage === "string" && stage.trim() ? stage.trim() : null;
}

function matchesSourceFilter(row: ClientErrorEventRow, filter: SourceFilter): boolean {
  if (filter === "all") return true;
  const source = payloadSource(row);
  if (filter === "upload") return source === "upload";
  if (filter === "video_playback") return source === "video_playback";
  return source !== "upload" && source !== "video_playback";
}

function tryFormatJson(value?: string | null): string | null {
  if (!value) return null;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function severityKey(value: string | null | undefined): "error" | "warning" | "info" {
  const v = (value ?? "").toLowerCase();
  if (v === "warning") return "warning";
  if (v === "info") return "info";
  return "error";
}

function severityBadgeStyle(severity?: string | null) {
  switch (severityKey(severity)) {
    case "warning":
      return styles.badgeWarning;
    case "info":
      return styles.badgeInfo;
    default:
      return styles.badgeError;
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  if (typeof document !== "undefined") {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand?.("copy") ?? false;
      document.body.removeChild(ta);
      return ok;
    } catch {
      /* ignore */
    }
  }
  return false;
}

function buildFixPromptForGroup(group: GroupedRow): string {
  const rep = group.representative;
  const lines: string[] = [];
  lines.push("# Fix this RawStock client error");
  lines.push("");
  lines.push(`**Kind:** ${rep.kind} · **Severity:** ${rep.severity}`);
  lines.push(`**Occurrences:** ${group.count} (${group.uniqueUsers} users, ${group.uniqueSessions} sessions)`);
  if (group.firstSeen) lines.push(`**First seen:** ${group.firstSeen}`);
  if (group.lastSeen) lines.push(`**Last seen:** ${group.lastSeen}`);
  if (rep.fingerprint) lines.push(`**Fingerprint:** \`${rep.fingerprint}\``);
  lines.push("");
  if (rep.title) lines.push(`## Title\n${rep.title}`);
  lines.push("## Message");
  lines.push(rep.message);
  lines.push("");
  lines.push("## Where it happened");
  if (rep.route) lines.push(`- Route: \`${rep.route}\``);
  if (rep.requestUrl) lines.push(`- Request: \`${rep.method ?? "GET"} ${rep.requestUrl}\``);
  if (rep.status != null) lines.push(`- HTTP status: ${rep.status}`);
  if (rep.code) lines.push(`- API code: \`${rep.code}\``);
  if (rep.platform) lines.push(`- Platform: ${rep.platform}`);
  if (rep.userAgent) lines.push(`- User agent: ${rep.userAgent}`);
  lines.push("");
  if (rep.stack) {
    lines.push("## Stack");
    lines.push("```");
    lines.push(rep.stack);
    lines.push("```");
    lines.push("");
  }
  if (rep.componentStack) {
    lines.push("## Component stack");
    lines.push("```");
    lines.push(rep.componentStack);
    lines.push("```");
    lines.push("");
  }
  const payload = tryFormatJson(rep.payloadJson);
  if (payload) {
    lines.push("## Payload / breadcrumbs");
    lines.push("```json");
    lines.push(payload);
    lines.push("```");
    lines.push("");
  }
  lines.push("## What I want");
  lines.push(
    "1. Investigate the root cause in this repo (server route, React component, or client lib).",
  );
  lines.push("2. Apply a minimal, targeted fix and explain why it resolves this fingerprint.");
  lines.push("3. If it is a transient network/timeout, harden the client with proper retry/UX feedback so users no longer see a silent failure.");
  lines.push("4. Reply with the diff summary and the files changed.");
  return lines.join("\n");
}

function buildBulkFixPrompt(groups: GroupedRow[]): string {
  const top = groups.slice(0, 5);
  const header = [
    "# Fix the top client errors in RawStock",
    "",
    `There are currently ${groups.length} unresolved error fingerprints. The 5 most recent groups are below, ordered by last seen.`,
    "",
    "For each one, investigate the root cause and propose a minimal, targeted fix in this repo. Group them in your reply by fingerprint, with: diagnosis → suggested fix → files to touch. If multiple share a root cause, say so.",
    "",
    "---",
    "",
  ].join("\n");
  return header + top.map((g, i) => `## ${i + 1}. ${buildFixPromptForGroup(g)}`).join("\n\n---\n\n");
}

function groupRows(rows: ClientErrorEventRow[]): GroupedRow[] {
  const byKey = new Map<string, GroupedRow>();
  for (const row of rows) {
    const key =
      (row.fingerprint && row.fingerprint.trim()) ||
      `${row.kind}|${row.status ?? ""}|${row.code ?? ""}|${row.route ?? ""}|${row.message}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      existing.rows.push(row);
      if (row.userId != null) existing.uniqueUsers = -1;
      if (row.sessionId) existing.uniqueSessions = -1;
      if (row.createdAt && (!existing.lastSeen || row.createdAt > existing.lastSeen)) {
        existing.lastSeen = row.createdAt;
        existing.representative = row;
      }
      if (row.createdAt && (!existing.firstSeen || row.createdAt < existing.firstSeen)) {
        existing.firstSeen = row.createdAt;
      }
    } else {
      byKey.set(key, {
        key,
        representative: row,
        count: 1,
        uniqueUsers: 0,
        uniqueSessions: 0,
        firstSeen: row.createdAt,
        lastSeen: row.createdAt,
        rows: [row],
      });
    }
  }
  for (const group of byKey.values()) {
    group.uniqueUsers = new Set(
      group.rows.map((r) => (r.userId == null ? `anon:${r.sessionId ?? "?"}` : `u:${r.userId}`)),
    ).size;
    group.uniqueSessions = new Set(group.rows.map((r) => r.sessionId ?? "")).size;
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const ta = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
    const tb = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
    return tb - ta;
  });
}

export default function AdminClientErrorsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const qc = useQueryClient();

  const {
    data: rows = [],
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery<ClientErrorEventRow[]>({
    queryKey: ["/api/admin/client-errors", FETCH_LIMIT, showResolved],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/admin/client-errors?limit=${FETCH_LIMIT}${showResolved ? "&includeResolved=1" : ""}`,
        );
        return (await res.json()) as ClientErrorEventRow[];
      } catch (err) {
        alertError("Client Errors", err, "Failed to load client errors.");
        throw err;
      }
    },
    enabled: isAdmin,
    retry: false,
    refetchInterval: autoRefresh ? POLL_INTERVAL_MS : false,
  });

  const resolveMutation = useMutation({
    mutationFn: async (fingerprint: string) => {
      const res = await apiRequest("POST", "/api/admin/client-errors/resolve", { fingerprint });
      return (await res.json()) as { ok: boolean; resolved: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/client-errors"] });
    },
    onError: (err) => alertError("Mark resolved", err, "Failed to mark resolved."),
  });

  const handleCopyPrompt = async (group: GroupedRow) => {
    const prompt = buildFixPromptForGroup(group);
    const ok = await copyToClipboard(prompt);
    if (ok) {
      alertMessage("Copied", "Paste into Cursor chat to start the fix flow.");
    } else {
      alertError("Copy failed", null, "Could not access clipboard. Long-press to copy from the details view.");
    }
  };

  const handleStartFixFlow = async (groups: GroupedRow[]) => {
    if (groups.length === 0) {
      alertMessage("Nothing to fix", "No unresolved errors right now.");
      return;
    }
    const prompt = buildBulkFixPrompt(groups);
    const ok = await copyToClipboard(prompt);
    if (ok) {
      alertMessage(
        "Fix flow ready",
        `Top ${Math.min(5, groups.length)} of ${groups.length} unresolved errors copied as a prompt. Paste into Cursor to start fixing.`,
      );
    } else {
      alertError("Copy failed", null, "Could not access clipboard. Open a single error and copy from there.");
    }
  };

  const handleMarkResolved = (group: GroupedRow) => {
    const fingerprint = group.representative.fingerprint;
    if (!fingerprint) {
      alertMessage("Cannot resolve", "This error has no fingerprint to match against.");
      return;
    }
    alertConfirm(
      "Mark resolved",
      `Hide all ${group.count} occurrences of this fingerprint?`,
      () => resolveMutation.mutate(fingerprint),
      { confirmLabel: "Resolve" },
    );
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (severityFilter !== "all" && severityKey(row.severity) !== severityFilter) return false;
      if (kindFilter !== "all" && (row.kind ?? "").toLowerCase() !== kindFilter) return false;
      if (!matchesSourceFilter(row, sourceFilter)) return false;
      if (!q) return true;
      const extra = parsePayloadExtra(row);
      const haystack = [
        row.message,
        row.title,
        row.route,
        row.requestUrl,
        row.code,
        row.kind,
        row.fingerprint,
        row.status != null ? String(row.status) : "",
        payloadSource(row),
        payloadStage(row),
        extra?.flow != null ? String(extra.flow) : "",
        extra?.surface != null ? String(extra.surface) : "",
        extra?.r2Key != null ? String(extra.r2Key) : "",
        extra?.urlExt != null ? String(extra.urlExt) : "",
        row.payloadJson,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, severityFilter, kindFilter, sourceFilter, search]);

  const summary = useMemo(() => {
    const acc = { error: 0, warning: 0, info: 0 };
    for (const row of rows) acc[severityKey(row.severity)] += 1;
    return acc;
  }, [rows]);

  const grouped = useMemo(() => groupRows(filteredRows), [filteredRows]);

  if (!user || !isAdmin) {
    return (
      <AuthGuard>
        <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
          <View style={styles.header}>
            <Pressable style={styles.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Client Errors</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>This screen is accessible by administrators only.</Text>
          </View>
        </View>
      </AuthGuard>
    );
  }

  const lastUpdatedLabel = dataUpdatedAt ? formatRelative(new Date(dataUpdatedAt).toISOString()) : "-";

  return (
    <AuthGuard>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Client Errors</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={[styles.iconBtn, autoRefresh && styles.iconBtnActive]}
              onPress={() => setAutoRefresh((v) => !v)}
            >
              <Ionicons
                name={autoRefresh ? "pause-outline" : "play-outline"}
                size={16}
                color={autoRefresh ? C.bg : C.text}
              />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => void refetch()} disabled={isFetching}>
              <Ionicons name="refresh" size={16} color={C.text} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={webScrollStyle(styles.scroll)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {grouped.length > 0 ? (
            <Pressable
              style={styles.fixFlowBanner}
              onPress={() => void handleStartFixFlow(grouped)}
            >
              <View style={styles.fixFlowIcon}>
                <Ionicons name="construct" size={18} color={C.bg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fixFlowTitle}>Start fix flow</Text>
                <Text style={styles.fixFlowSubtitle}>
                  Copy a Cursor-ready prompt for the top {Math.min(5, grouped.length)} of{" "}
                  {grouped.length} fingerprints and paste into chat to start fixing.
                </Text>
              </View>
              <Ionicons name="copy-outline" size={18} color={C.bg} />
            </Pressable>
          ) : null}

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.error}</Text>
                <Text style={styles.summaryLabel}>Errors</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.warning}</Text>
                <Text style={styles.summaryLabel}>Warnings</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{summary.info}</Text>
                <Text style={styles.summaryLabel}>Info</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{rows.length}</Text>
                <Text style={styles.summaryLabel}>Loaded</Text>
              </View>
            </View>
            <Text style={styles.summaryHint}>
              {isFetching
                ? "Refreshing..."
                : `Updated ${lastUpdatedLabel}${autoRefresh ? " · auto 30s" : ""}`}
            </Text>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={C.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Filter by message, route, code..."
              placeholderTextColor={C.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScrollContent}
          >
            {SEVERITY_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, severityFilter === f.id && styles.chipActive]}
                onPress={() => setSeverityFilter(f.id)}
              >
                <Text style={[styles.chipText, severityFilter === f.id && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
            <View style={styles.chipDivider} />
            {KIND_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, kindFilter === f.id && styles.chipActive]}
                onPress={() => setKindFilter(f.id)}
              >
                <Text style={[styles.chipText, kindFilter === f.id && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
            <View style={styles.chipDivider} />
            {SOURCE_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, sourceFilter === f.id && styles.chipActive]}
                onPress={() => setSourceFilter(f.id)}
              >
                <Text style={[styles.chipText, sourceFilter === f.id && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
            <View style={styles.chipDivider} />
            <Pressable
              style={[styles.chip, showResolved && styles.chipActive]}
              onPress={() => setShowResolved((v) => !v)}
            >
              <Text style={[styles.chipText, showResolved && styles.chipTextActive]}>
                {showResolved ? "Showing resolved" : "Show resolved"}
              </Text>
            </Pressable>
          </ScrollView>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, viewMode === "grouped" && styles.toggleBtnActive]}
              onPress={() => setViewMode("grouped")}
            >
              <Ionicons
                name="layers-outline"
                size={14}
                color={viewMode === "grouped" ? C.bg : C.text}
              />
              <Text style={[styles.toggleText, viewMode === "grouped" && styles.toggleTextActive]}>
                Grouped ({grouped.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === "timeline" && styles.toggleBtnActive]}
              onPress={() => setViewMode("timeline")}
            >
              <Ionicons
                name="time-outline"
                size={14}
                color={viewMode === "timeline" ? C.bg : C.text}
              />
              <Text style={[styles.toggleText, viewMode === "timeline" && styles.toggleTextActive]}>
                Timeline ({filteredRows.length})
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <Text style={styles.messageText}>Loading...</Text>
          ) : viewMode === "grouped" ? (
            grouped.length === 0 ? (
              <Text style={styles.messageText}>No matching client errors.</Text>
            ) : (
              grouped.map((group) => (
                <GroupCard
                  key={group.key}
                  group={group}
                  expanded={expandedKey === group.key}
                  onToggle={() => setExpandedKey(expandedKey === group.key ? null : group.key)}
                  onCopyPrompt={() => void handleCopyPrompt(group)}
                  onResolve={() => handleMarkResolved(group)}
                  isResolving={resolveMutation.isPending}
                />
              ))
            )
          ) : filteredRows.length === 0 ? (
            <Text style={styles.messageText}>No matching client errors.</Text>
          ) : (
            filteredRows.map((row) => (
              <TimelineCard
                key={row.id}
                row={row}
                expanded={expandedKey === `row-${row.id}`}
                onToggle={() =>
                  setExpandedKey(expandedKey === `row-${row.id}` ? null : `row-${row.id}`)
                }
              />
            ))
          )}
        </ScrollView>
      </View>
    </AuthGuard>
  );
}

function GroupCard({
  group,
  expanded,
  onToggle,
  onCopyPrompt,
  onResolve,
  isResolving,
}: {
  group: GroupedRow;
  expanded: boolean;
  onToggle: () => void;
  onCopyPrompt: () => void;
  onResolve: () => void;
  isResolving: boolean;
}) {
  const rep = group.representative;
  const payload = expanded ? tryFormatJson(rep.payloadJson) : null;
  const isResolved = Boolean(rep.resolvedAt);
  return (
    <Pressable style={[styles.card, isResolved && styles.cardResolved]} onPress={onToggle}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>last {formatRelative(group.lastSeen)}</Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, severityBadgeStyle(rep.severity)]}>
            <Text style={styles.badgeText}>{prettyLabel(rep.severity || "error")}</Text>
          </View>
          <View style={[styles.badge, styles.badgeKind]}>
            <Text style={styles.badgeText}>{prettyLabel(rep.kind || "unknown")}</Text>
          </View>
          {payloadSource(rep) ? (
            <View style={[styles.badge, styles.badgeSource]}>
              <Text style={styles.badgeText}>{prettyLabel(payloadSource(rep)!)}</Text>
            </View>
          ) : null}
          {payloadStage(rep) ? (
            <View style={[styles.badge, styles.badgeStage]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {payloadStage(rep)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.badge, styles.badgeCount]}>
            <Text style={styles.badgeText}>×{group.count}</Text>
          </View>
          {isResolved ? (
            <View style={[styles.badge, styles.badgeResolved]}>
              <Text style={styles.badgeText}>RESOLVED</Text>
            </View>
          ) : null}
        </View>
      </View>

      {rep.title ? <Text style={styles.cardTitle}>{rep.title}</Text> : null}
      <Text style={styles.cardMessage} numberOfLines={expanded ? undefined : 3}>
        {rep.message}
      </Text>

      <View style={styles.metaInline}>
        {rep.route ? <Text style={styles.metaPill}>{rep.route}</Text> : null}
        {rep.status != null ? (
          <Text style={styles.metaPill}>HTTP {rep.status}</Text>
        ) : null}
        {rep.code ? <Text style={styles.metaPill}>{rep.code}</Text> : null}
        {rep.platform ? <Text style={styles.metaPill}>{rep.platform}</Text> : null}
      </View>

      <Text style={styles.groupStats}>
        {group.uniqueUsers} {group.uniqueUsers === 1 ? "user" : "users"} · {group.uniqueSessions}{" "}
        {group.uniqueSessions === 1 ? "session" : "sessions"} · first{" "}
        {formatRelative(group.firstSeen)}
      </Text>

      <View style={styles.cardActionsRow}>
        <Pressable
          style={[styles.cardActionBtn, styles.cardActionPrimary]}
          onPress={(e) => {
            e.stopPropagation?.();
            onCopyPrompt();
          }}
        >
          <Ionicons name="copy-outline" size={14} color={C.bg} />
          <Text style={[styles.cardActionText, styles.cardActionPrimaryText]}>
            Copy fix prompt
          </Text>
        </Pressable>
        <Pressable
          style={[styles.cardActionBtn, styles.cardActionSecondary, isResolved && styles.cardActionDisabled]}
          onPress={(e) => {
            e.stopPropagation?.();
            if (!isResolved) onResolve();
          }}
          disabled={isResolving || isResolved}
        >
          <Ionicons
            name={isResolved ? "checkmark-done" : "checkmark-circle-outline"}
            size={14}
            color={C.text}
          />
          <Text style={styles.cardActionText}>{isResolved ? "Resolved" : "Mark resolved"}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Fingerprint</Text>
          <Text style={styles.detailValue}>{rep.fingerprint ?? "-"}</Text>

          <Text style={styles.detailLabel}>Request</Text>
          <Text style={styles.detailValue}>
            {rep.method ?? "-"} {rep.requestUrl ?? "-"}
          </Text>

          {payload ? (
            <>
              <Text style={styles.detailLabel}>Payload</Text>
              <Text style={styles.codeBlock}>{payload}</Text>
            </>
          ) : null}

          {rep.stack ? (
            <>
              <Text style={styles.detailLabel}>Stack</Text>
              <Text style={styles.codeBlock}>{rep.stack}</Text>
            </>
          ) : null}

          {rep.componentStack ? (
            <>
              <Text style={styles.detailLabel}>Component Stack</Text>
              <Text style={styles.codeBlock}>{rep.componentStack}</Text>
            </>
          ) : null}

          {rep.userAgent ? (
            <>
              <Text style={styles.detailLabel}>User Agent</Text>
              <Text style={styles.detailValue}>{rep.userAgent}</Text>
            </>
          ) : null}

          <Text style={styles.detailLabel}>Recent occurrences</Text>
          {group.rows.slice(0, 5).map((r) => (
            <Text key={r.id} style={styles.occurrenceLine}>
              {formatDateTime(r.createdAt)} · user {r.userId ?? "anon"} · session{" "}
              {(r.sessionId ?? "-").slice(0, 8)}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={styles.expandHint}>Tap for stack, payload, and recent occurrences</Text>
      )}
    </Pressable>
  );
}

function TimelineCard({
  row,
  expanded,
  onToggle,
}: {
  row: ClientErrorEventRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const payload = expanded ? tryFormatJson(row.payloadJson) : null;
  return (
    <Pressable style={styles.card} onPress={onToggle}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>
          {formatRelative(row.createdAt)} · {formatDateTime(row.createdAt)}
        </Text>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, severityBadgeStyle(row.severity)]}>
            <Text style={styles.badgeText}>{prettyLabel(row.severity || "error")}</Text>
          </View>
          <View style={[styles.badge, styles.badgeKind]}>
            <Text style={styles.badgeText}>{prettyLabel(row.kind || "unknown")}</Text>
          </View>
        </View>
      </View>

      {row.title ? <Text style={styles.cardTitle}>{row.title}</Text> : null}
      <Text style={styles.cardMessage} numberOfLines={expanded ? undefined : 3}>
        {row.message}
      </Text>

      <View style={styles.metaInline}>
        {row.route ? <Text style={styles.metaPill}>{row.route}</Text> : null}
        {row.status != null ? <Text style={styles.metaPill}>HTTP {row.status}</Text> : null}
        {row.code ? <Text style={styles.metaPill}>{row.code}</Text> : null}
        {row.userId != null ? (
          <Text style={styles.metaPill}>user {row.userId}</Text>
        ) : (
          <Text style={styles.metaPill}>anon</Text>
        )}
      </View>

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>Request</Text>
          <Text style={styles.detailValue}>
            {row.method ?? "-"} {row.requestUrl ?? "-"}
          </Text>

          <Text style={styles.detailLabel}>Session</Text>
          <Text style={styles.detailValue}>{row.sessionId ?? "-"}</Text>

          <Text style={styles.detailLabel}>Fingerprint</Text>
          <Text style={styles.detailValue}>{row.fingerprint ?? "-"}</Text>

          {payload ? (
            <>
              <Text style={styles.detailLabel}>Payload</Text>
              <Text style={styles.codeBlock}>{payload}</Text>
            </>
          ) : null}

          {row.stack ? (
            <>
              <Text style={styles.detailLabel}>Stack</Text>
              <Text style={styles.codeBlock}>{row.stack}</Text>
            </>
          ) : null}

          {row.componentStack ? (
            <>
              <Text style={styles.detailLabel}>Component Stack</Text>
              <Text style={styles.codeBlock}>{row.componentStack}</Text>
            </>
          ) : null}

          {row.userAgent ? (
            <>
              <Text style={styles.detailLabel}>User Agent</Text>
              <Text style={styles.detailValue}>{row.userAgent}</Text>
            </>
          ) : null}
        </View>
      ) : (
        <Text style={styles.expandHint}>Tap to show details</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  iconBtnActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: "700", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  summaryCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: { alignItems: "center", flex: 1 },
  summaryValue: { color: C.text, fontSize: 22, fontWeight: "800" },
  summaryLabel: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  summaryHint: { color: C.textMuted, fontSize: 11, marginTop: 10, textAlign: "right" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "web" ? 8 : 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
    paddingVertical: 4,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null),
  },
  chipScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface,
  },
  chipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chipText: { color: C.text, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: C.bg },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: C.borderDim,
    marginHorizontal: 4,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderDim,
    backgroundColor: C.surface,
  },
  toggleBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  toggleText: { color: C.text, fontSize: 12, fontWeight: "700" },
  toggleTextActive: { color: C.bg },
  messageBox: {
    marginTop: 40,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
  },
  messageText: { color: C.textMuted, textAlign: "center", marginTop: 24 },
  fixFlowBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.accent,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  fixFlowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  fixFlowTitle: { color: C.bg, fontSize: 14, fontWeight: "800" },
  fixFlowSubtitle: { color: C.bg, fontSize: 11, marginTop: 2, opacity: 0.85 },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.borderDim,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  cardResolved: { opacity: 0.55 },
  cardActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardActionPrimary: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  cardActionSecondary: {
    backgroundColor: C.surface2,
    borderColor: C.borderDim,
  },
  cardActionDisabled: { opacity: 0.5 },
  cardActionText: { color: C.text, fontSize: 11, fontWeight: "700" },
  cardActionPrimaryText: { color: C.bg },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardDate: { color: C.textMuted, fontSize: 11, flex: 1 },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeError: { backgroundColor: "#ef444433" },
  badgeWarning: { backgroundColor: "#f59e0b33" },
  badgeInfo: { backgroundColor: "#3b82f633" },
  badgeKind: { backgroundColor: C.surface2 },
  badgeSource: { backgroundColor: "#1a3a2a", maxWidth: 120 },
  badgeStage: { backgroundColor: "#2a2a3a", maxWidth: 160 },
  badgeCount: { backgroundColor: C.accent },
  badgeResolved: { backgroundColor: C.surface3, borderWidth: 1, borderColor: C.borderDim },
  badgeText: { color: C.text, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 10 },
  cardMessage: { color: C.text, fontSize: 13, lineHeight: 19, marginTop: 6 },
  metaInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  metaPill: {
    color: C.textSec,
    fontSize: 11,
    backgroundColor: C.surface2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  groupStats: {
    color: C.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
  expandHint: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 10,
  },
  detailBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borderDim,
    paddingTop: 12,
    gap: 6,
  },
  detailLabel: { color: C.text, fontSize: 11, fontWeight: "700", marginTop: 4, letterSpacing: 0.3 },
  detailValue: { color: C.textSec, fontSize: 12, lineHeight: 17 },
  codeBlock: {
    color: C.textSec,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "Courier" }),
    backgroundColor: C.surface2,
    borderRadius: 8,
    padding: 10,
  },
  occurrenceLine: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
