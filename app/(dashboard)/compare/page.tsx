"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, GitCompare, Trash2, Trophy, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";

interface ComparisonSession {
  id: string;
  targetName: string;
  summaryMetrics: {
    messageCount?: number;
    totalTokens?: number;
    avgResponseTimeMs?: number;
    errorCount?: number;
  } | null;
}

interface ComparisonResults {
  responseTime: { a: number; b: number; diff: number; diffPercent: number };
  tokenUsage: { a: number; b: number; diff: number; diffPercent: number };
  errorRate: { a: number; b: number; diff: number };
  messageCount: { a: number; b: number; diff: number };
  winner: "A" | "B" | "tie";
}

interface Comparison {
  id: string;
  name: string;
  description?: string;
  status: string;
  sessionA: ComparisonSession;
  sessionB: ComparisonSession;
  results: ComparisonResults | null;
  createdAt: string;
}

const STATUS_VARIANT: Record<string, "success" | "error" | "warning" | "neutral"> = {
  completed: "success",
  failed: "error",
  pending: "warning",
};

export default function ComparePage() {
  const router = useRouter();
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchComparisons = useCallback(async () => {
    try {
      const response = await fetch(`/api/compare?page=${page}&limit=20`);
      if (!response.ok) {
        if (response.status === 404) {
          setComparisons([]);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await response.json();
      if (data.success) {
        setComparisons(data.data || []);
        if (data.pagination) setTotalPages(data.pagination.totalPages);
      }
    } catch {
      setComparisons([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchComparisons();
  }, [fetchComparisons]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comparison?")) return;
    setDeleting(id);
    try {
      const response = await fetch(`/api/compare/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) setComparisons((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const getWinnerLabel = (c: Comparison) => {
    if (!c.results) return null;
    if (c.results.winner === "tie") return "Tie";
    return c.results.winner === "A" ? c.sessionA.targetName : c.sessionB.targetName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading comparisons...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comparisons"
        description="Side-by-side A/B testing of sessions"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Compare" },
        ]}
        actions={
          <Link href="/compare/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Comparison
            </Button>
          </Link>
        }
      />

      {comparisons.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No comparisons yet"
          description="Compare two completed sessions to see which target performed better."
          action={{
            label: "Create Comparison",
            onClick: () => router.push("/compare/new"),
          }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Session A</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">vs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Session B</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Winner</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Diffs</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {comparisons.map((c) => {
                  const winner = getWinnerLabel(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/compare/${c.id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-100">{c.name}</div>
                        {c.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">{c.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{c.sessionA.targetName}</td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        <ArrowRight className="h-3.5 w-3.5 inline" />
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">{c.sessionB.targetName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[c.status] || "neutral"} size="sm">
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {c.results && (
                          <span className="inline-flex items-center gap-1 text-xs">
                            {c.results.winner !== "tie" && (
                              <Trophy className="h-3 w-3 text-amber-400" />
                            )}
                            <span className={c.results.winner === "tie" ? "text-gray-400" : "text-emerald-400"}>
                              {winner}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.results && (
                          <div className="flex gap-3 text-[10px]">
                            <span className="text-gray-500">
                              Resp:{" "}
                              <span className={c.results.responseTime.diffPercent < 0 ? "text-emerald-400" : c.results.responseTime.diffPercent > 0 ? "text-red-400" : "text-gray-400"}>
                                {c.results.responseTime.diffPercent > 0 ? "+" : ""}
                                {c.results.responseTime.diffPercent.toFixed(1)}%
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Tok:{" "}
                              <span className={c.results.tokenUsage.diffPercent < 0 ? "text-emerald-400" : c.results.tokenUsage.diffPercent > 0 ? "text-red-400" : "text-gray-400"}>
                                {c.results.tokenUsage.diffPercent > 0 ? "+" : ""}
                                {c.results.tokenUsage.diffPercent.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Link href={`/compare/${c.id}`}>
                            <Button variant="icon" size="sm">
                              <GitCompare className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Tooltip content="Delete">
                            <Button
                              variant="icon"
                              size="sm"
                              loading={deleting === c.id}
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
