"use client";

import React, { useState } from "react";
import {
  Building2,
  Download,
  Flame,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import {
  computeIndividualStandings,
  computeLocationStandings,
  computeSquadStandings,
} from "@/lib/game-engine";
import { GameRoomState } from "@/lib/types";

export function TripleLeaderboard({
  room,
  compact = false,
}: {
  room: GameRoomState;
  compact?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "locations" | "squads" | "individuals"
  >("overview");
  const [metricMode, setMetricMode] = useState<"average" | "total">("average");

  const locationStandings = computeLocationStandings(room, metricMode);
  const squadStandings = computeSquadStandings(room, metricMode);
  const individualStandings = computeIndividualStandings(room);

  const maxLocationVal = Math.max(
    1,
    ...locationStandings.map((l) =>
      metricMode === "average" ? l.averageScore : l.totalScore
    )
  );
  const maxSquadVal = Math.max(
    1,
    ...squadStandings.map((s) =>
      metricMode === "average" ? s.averageScore : s.totalScore
    )
  );

  const exportCsv = () => {
    const headers = [
      "Rank",
      "Name",
      "Location",
      "Squad",
      "Department",
      "Score",
      "Correct Answers",
      "Total Answered",
      "Best Streak",
    ];
    const rows = individualStandings.map((p, idx) => {
      const loc =
        room.locations.find((l) => l.id === p.locationId)?.shortName ||
        p.locationId;
      const sq =
        room.squads.find((s) => s.id === p.squadId)?.name || p.squadId;
      return [
        idx + 1,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${loc}"`,
        `"${sq}"`,
        `"${p.department}"`,
        p.score,
        p.correctCount,
        p.answeredCount,
        p.bestStreak,
      ].join(",");
    });
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `falcon-arena-results-${room.pin}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            All-in-One Cup View
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "locations"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />4 Locations Cup
          </button>
          <button
            onClick={() => setActiveTab("squads")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "squads"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Squad Standings
          </button>
          <button
            onClick={() => setActiveTab("individuals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "individuals"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/25"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Individual Standings ({individualStandings.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setMetricMode("average")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                metricMode === "average"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Fair comparison across locations of different headcount sizes"
            >
              Avg pts / Staff
            </button>
            <button
              onClick={() => setMetricMode("total")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                metricMode === "total"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Total Points
            </button>
          </div>

          {!compact && (
            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div
        className={`grid gap-5 ${
          activeTab === "overview" ? "lg:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {/* 1. 4-Location Inter-Office Cup */}
        {(activeTab === "overview" || activeTab === "locations") && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-400" />
                  Falcon 4-Location Cup
                </h3>
                <p className="text-xs text-slate-400">
                  {metricMode === "average"
                    ? "Normalized by average score per staff member"
                    : "Ranked by cumulative location points"}
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                4 Sites Live
              </span>
            </div>

            <div className="space-y-3.5">
              {locationStandings.map((item, idx) => {
                const primaryValue =
                  metricMode === "average"
                    ? item.averageScore
                    : item.totalScore;
                const barWidth = Math.max(
                  6,
                  Math.round((primaryValue / maxLocationVal) * 100)
                );
                return (
                  <div
                    key={item.location.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                            idx === 0
                              ? "bg-amber-400 text-slate-950"
                              : idx === 1
                              ? "bg-slate-300 text-slate-950"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {item.location.shortName}
                            <span className="text-[11px] font-medium text-slate-400">
                              ({item.playerCount} staff)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.topPlayerName
                              ? `Site MVP: ${item.topPlayerName} • ${item.accuracyPercent}% acc`
                              : item.location.subtitle}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-white">
                          {primaryValue.toLocaleString()}{" "}
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">
                            {metricMode === "average" ? "avg" : "pts"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {metricMode === "average"
                            ? `${item.totalScore.toLocaleString()} total pts`
                            : `${item.averageScore.toLocaleString()} avg/staff`}
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: item.location.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Squads / Teams Leaderboard */}
        {(activeTab === "overview" || activeTab === "squads") && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Falcon Squad Standings
                </h3>
                <p className="text-xs text-slate-400">
                  Cross-location teams competing together
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {room.squads.length} Squads
              </span>
            </div>

            <div className="space-y-3">
              {squadStandings.map((item, idx) => {
                const primaryValue =
                  metricMode === "average"
                    ? item.averageScore
                    : item.totalScore;
                const barWidth = Math.max(
                  6,
                  Math.round((primaryValue / maxSquadVal) * 100)
                );
                return (
                  <div
                    key={item.squad.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.squad.icon}</span>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">
                              #{idx + 1}
                            </span>
                            {item.squad.name}
                            <span className="text-[11px] text-slate-400 font-normal">
                              ({item.playerCount})
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.topPlayerName
                              ? `Lead: ${item.topPlayerName}`
                              : item.squad.motto}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-white">
                          {primaryValue.toLocaleString()}{" "}
                          <span className="text-[10px] text-slate-400 uppercase">
                            {metricMode === "average" ? "avg" : "pts"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: item.squad.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Individual Standings */}
        {(activeTab === "overview" || activeTab === "individuals") && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-400" />
                  Individual Leaderboard
                </h3>
                <p className="text-xs text-slate-400">
                  Speed + Accuracy + Answer Streaks
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {individualStandings.length} Staff
              </span>
            </div>

            {individualStandings.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                Waiting for Falcon staff to join and score points...
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {individualStandings
                  .slice(0, activeTab === "individuals" ? 200 : 10)
                  .map((player, idx) => {
                    const loc = room.locations.find(
                      (l) => l.id === player.locationId
                    );
                    const sq = room.squads.find(
                      (s) => s.id === player.squadId
                    );
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              idx === 0
                                ? "bg-amber-400 text-slate-950"
                                : idx === 1
                                ? "bg-slate-300 text-slate-950"
                                : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="text-lg shrink-0">
                            {player.avatar}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                              {player.name}
                              {player.streak >= 2 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                                  <Flame className="w-3 h-3 fill-orange-400" />
                                  {player.streak}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{
                                  backgroundColor: loc?.color || "#38bdf8",
                                }}
                              />
                              <span>{loc?.shortName || player.locationId}</span>
                              <span>•</span>
                              <span>
                                {sq?.icon} {sq?.name}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-sky-300">
                            {player.score.toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {player.correctCount}/{player.answeredCount} hit
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
