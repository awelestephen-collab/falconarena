"use client";

import React, { useState } from "react";
import {
  Building2,
  ListChecks,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  FalconLocation,
  GameQuestion,
  GameRoomState,
  QuestionMode,
} from "@/lib/types";

export function GameStudioModal({
  room,
  onClose,
  onSave,
}: {
  room: GameRoomState;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    teamTalkEnabled: boolean;
    defaultTeamTalkSec: number;
    personalModeEnabled: boolean;
    allowPlayerSquadChoice: boolean;
    locations: FalconLocation[];
    questions: GameQuestion[];
  }) => Promise<void>;
}) {
  const [tab, setTab] = useState<"questions" | "locations" | "rules">(
    "questions"
  );
  const [title, setTitle] = useState(room.title);
  const [teamTalkEnabled, setTeamTalkEnabled] = useState(room.teamTalkEnabled);
  const [defaultTeamTalkSec, setDefaultTeamTalkSec] = useState(
    room.defaultTeamTalkSec
  );
  const [personalModeEnabled, setPersonalModeEnabled] = useState(
    room.personalModeEnabled
  );
  const [allowPlayerSquadChoice, setAllowPlayerSquadChoice] = useState(
    room.allowPlayerSquadChoice
  );
  const [locations, setLocations] = useState<FalconLocation[]>(room.locations);
  const [questions, setQuestions] = useState<GameQuestion[]>(room.questions);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    const newQ: GameQuestion = {
      id: `custom-${Date.now()}`,
      mode: "speed_trivia",
      category: "Falcon Custom Round",
      prompt: "New question or Rebus puzzle for Falcon Corporation staff?",
      subtitle: "Speed Round — Faster answers earn more points!",
      rebusClue: "",
      timeLimitSec: 20,
      teamTalkSec: 6,
      pointsMultiplier: 1,
      correctOptionId: 0,
      options: [
        { id: 0, text: "Option A (Correct)" },
        { id: 1, text: "Option B" },
        { id: 2, text: "Option C" },
        { id: 3, text: "Option D" },
      ],
      funFact: "",
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, patch: Partial<GameQuestion>) => {
    const next = [...questions];
    next[index] = { ...next[index], ...patch };
    setQuestions(next);
  };

  const updateOptionText = (qIndex: number, optId: number, text: string) => {
    const next = [...questions];
    next[qIndex] = {
      ...next[qIndex],
      options: next[qIndex].options.map((o) =>
        o.id === optId ? { ...o, text } : o
      ),
    };
    setQuestions(next);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const updateLocation = (index: number, patch: Partial<FalconLocation>) => {
    const next = [...locations];
    next[index] = { ...next[index], ...patch };
    setLocations(next);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      title,
      teamTalkEnabled,
      defaultTeamTalkSec,
      personalModeEnabled,
      allowPlayerSquadChoice,
      locations,
      questions,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-white">
              Falcon Arena Studio &amp; Admin Settings
            </h2>
            <p className="text-xs text-slate-400">
              Customize questions, Rebus puzzles, the 4 Falcon Corporation
              locations, and gameplay rules.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-950/50">
          <button
            onClick={() => setTab("questions")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              tab === "questions"
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Questions &amp; Rebus Rounds ({questions.length})
          </button>
          <button
            onClick={() => setTab("locations")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              tab === "locations"
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-4 h-4" />4 Falcon Locations
          </button>
          <button
            onClick={() => setTab("rules")}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              tab === "rules"
                ? "border-sky-400 text-sky-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Settings2 className="w-4 h-4" />
            Team Talk &amp; Display Rules
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {tab === "questions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Session / Event Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-semibold"
                  />
                </div>
                <button
                  onClick={addQuestion}
                  className="mt-5 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Round
                </button>
              </div>

              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-sky-400 uppercase">
                      Round #{idx + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={q.mode}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            mode: e.target.value as QuestionMode,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-semibold"
                      >
                        <option value="rebus_puzzle">
                          🧩 Rebus Puzzle (Players Type Their Own Answer)
                        </option>
                        <option value="speed_trivia">
                          ⚡ Speed Trivia (4 Multiple-Choice Options)
                        </option>
                        <option value="majority_wins">
                          🔥 Majority Wins (Most Popular Vote Wins)
                        </option>
                        <option value="icebreaker_poll">
                          📊 Live Icebreaker Poll (Everyone Scores)
                        </option>
                      </select>

                      <select
                        value={q.pointsMultiplier || 1}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            pointsMultiplier: Number(e.target.value) as 1 | 2,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-semibold"
                      >
                        <option value={1}>1x Standard Points</option>
                        <option value={2}>2x Double Energy Points</option>
                      </select>

                      <input
                        type="number"
                        min={5}
                        max={90}
                        value={q.timeLimitSec}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            timeLimitSec: Number(e.target.value) || 20,
                          })
                        }
                        className="w-16 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white text-center"
                        title="Time limit in seconds"
                      />
                      <span className="text-xs text-slate-400">sec</span>

                      <button
                        onClick={() => removeQuestion(idx)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        title="Remove round"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Visual Rebus Clue Box (Optional — leave blank for standard
                      questions)
                    </label>
                    <textarea
                      rows={2}
                      value={q.rebusClue || ""}
                      onChange={(e) =>
                        updateQuestion(idx, { rebusClue: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-mono text-xs"
                      placeholder="e.g. STAND / I  (for 'I Understand')"
                    />
                  </div>

                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(idx, { prompt: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-semibold"
                    placeholder="Enter question or prompt..."
                  />

                  {q.mode === "rebus_puzzle" ? (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-emerald-400">
                        Official Rebus Solution (Revealed when countdown timer
                        reaches 0)
                      </label>
                      <input
                        type="text"
                        value={q.officialAnswer || ""}
                        onChange={(e) =>
                          updateQuestion(idx, {
                            officialAnswer: e.target.value,
                            acceptedAnswers: [e.target.value.toLowerCase()],
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-bold"
                        placeholder="e.g. Forget it"
                      />
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2"
                        >
                          {q.mode === "speed_trivia" && (
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctOptionId === opt.id}
                              onChange={() =>
                                updateQuestion(idx, { correctOptionId: opt.id })
                              }
                              className="w-4 h-4 accent-emerald-500"
                              title="Mark as correct option"
                            />
                          )}
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) =>
                              updateOptionText(idx, opt.id, e.target.value)
                            }
                            className="w-full bg-transparent text-xs text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "locations" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Configure the 4 Falcon Corporation operational locations. Staff
                tag their location when joining so the live{" "}
                <strong className="text-white">4-Location Cup</strong> tracks
                each site&apos;s performance.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {locations.map((loc, idx) => (
                  <div
                    key={loc.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${loc.color}22`,
                          color: loc.color,
                        }}
                      >
                        Location #{idx + 1}
                      </span>
                      <input
                        type="color"
                        value={loc.color}
                        onChange={(e) =>
                          updateLocation(idx, { color: e.target.value })
                        }
                        className="w-7 h-7 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Full Location Name
                      </label>
                      <input
                        type="text"
                        value={loc.name}
                        onChange={(e) =>
                          updateLocation(idx, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Short Badge Name
                      </label>
                      <input
                        type="text"
                        value={loc.shortName}
                        onChange={(e) =>
                          updateLocation(idx, { shortName: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Site Description / Address
                      </label>
                      <input
                        type="text"
                        value={loc.subtitle}
                        onChange={(e) =>
                          updateLocation(idx, { subtitle: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "rules" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-white text-sm">
                    &ldquo;Team Talk&rdquo; Huddle Timer
                  </div>
                  <p className="text-xs text-slate-400">
                    Gives Squads and Locations a brief countdown to discuss the
                    question before answer buttons unlock.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={defaultTeamTalkSec}
                    onChange={(e) =>
                      setDefaultTeamTalkSec(Number(e.target.value) || 0)
                    }
                    className="w-16 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm text-center"
                  />
                  <span className="text-xs text-slate-400">sec</span>
                  <input
                    type="checkbox"
                    checked={teamTalkEnabled}
                    onChange={(e) => setTeamTalkEnabled(e.target.checked)}
                    className="w-5 h-5 accent-sky-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-white text-sm">
                    Mobile &ldquo;Personal Mode&rdquo; on Staff Screens
                  </div>
                  <p className="text-xs text-slate-400">
                    Displays the full question text, Rebus clues, and option
                    labels directly on every player&apos;s phone/laptop—ideal
                    for hybrid play across Lekki HQ, Ikorodu, Port Harcourt, and
                    Lekki Free Trade Zone.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={personalModeEnabled}
                  onChange={(e) => setPersonalModeEnabled(e.target.checked)}
                  className="w-5 h-5 accent-sky-500"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-white text-sm">
                    Allow Players to Choose or Switch Squads on Join
                  </div>
                  <p className="text-xs text-slate-400">
                    When unchecked, the platform automatically balances incoming
                    players evenly across the 6 Falcon Squads.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={allowPlayerSquadChoice}
                  onChange={(e) => setAllowPlayerSquadChoice(e.target.checked)}
                  className="w-5 h-5 accent-sky-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-sky-500/20"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
