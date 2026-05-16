import { useEffect, useMemo, useState } from "react";
import { storage } from "../storage";

const PLAYERS_KEY = "nylbc-players-2023";
const MATCHES_KEY = "nylbc-matches-2023";

const asBlank = (v) => (v === null || v === undefined || v === "" ? "" : String(v));
const isBlank = (v) => asBlank(v) === "";
const isForfeit = (v) => asBlank(v).toUpperCase() === "F";
const toNum = (v) => {
  const s = asBlank(v);
  if (s === "" || isForfeit(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Set 1 / Set 2 result for Team A (mirrors the worksheet pattern)
function setResultA(scoreA, scoreB) {
  if (isBlank(scoreA)) return " ";
  if (isForfeit(scoreA)) return "FORFEIT";
  if (isForfeit(scoreB)) return "WIN";
  const a = toNum(scoreA);
  const b = toNum(scoreB);
  if (a === null || b === null) return " ";
  if (a > b) return "WIN";
  if (a < b) return "LOSS";
  return "DRAW";
}

function setResultB(resultA, scoreA, scoreB) {
  if (resultA === " " || resultA === "") return " ";
  if (isForfeit(scoreB)) return "FORFEIT";
  if (resultA === "FORFEIT") return "WIN";
  if (isForfeit(scoreA)) return "WIN";
  const a = toNum(scoreA);
  const b = toNum(scoreB);
  if (a === null || b === null) return " ";
  if (b > a) return "WIN";
  if (b < a) return "LOSS";
  return "DRAW";
}

function setPoints(result) {
  if (result === "WIN") return 4;
  if (result === "DRAW") return 2;
  return 0; // blank, LOSS, FORFEIT
}

function tiebreakScoreB(scoreA) {
  if (scoreA === "W") return "L";
  if (scoreA === "L") return "W";
  return " ";
}

// Mirrors the worksheet’s “only valid if set points tied, else N/A” logic. 
function tiebreakResultA(set1ResA, set1PtsA, set2ResA, set2PtsA, set1PtsB, set2PtsB, scoreA) {
  if (set1ResA === " " || set1ResA === "") return " ";
  if (set1PtsA + set2PtsA !== set1PtsB + set2PtsB) return "N/A";
  return scoreA === "W" ? "WIN" : "LOSS";
}

// Mirrors worksheet’s N/A cases and the W/L → WIN/LOSS mapping. 
function tiebreakResultB(set1ScoreA, set2ScoreA, set1ResA, set1PtsA, set2PtsA, set1PtsB, set2PtsB, scoreB) {
  if (isForfeit(set1ScoreA) && isForfeit(set2ScoreA)) return "N/A";
  if (set1ResA === " " || set1ResA === "") return " ";
  if (set1PtsA + set2PtsA !== set1PtsB + set2PtsB) return "N/A";
  return scoreB === "W" ? "WIN" : "LOSS";
}

// Mirrors the match result logic pattern (FORFEIT handling, set points compare, tie uses tiebreak). 
function matchResultA(set1ResA, set2ResA, set1ResB, set2ResB, ptsA, ptsB, tbResA) {
  if (set1ResA === " " || set1ResA === "") return " ";
  if (set1ResA === "FORFEIT" || set2ResA === "FORFEIT") return "FORFEIT";
  if (set1ResB === "FORFEIT" || set2ResB === "FORFEIT") return "WIN";
  if (ptsA > ptsB) return "WIN";
  if (ptsA < ptsB) return "LOSS";
  return tbResA === "WIN" ? "WIN" : "LOSS";
}

function matchPointsA(matchResA) {
  if (matchResA === "WIN") return 2;
  if (matchResA === "DRAW") return 2;
  return 0;
}

// Mirrors the “Team B match result” logic pattern. 
function matchResultB(set1ResA, set1ResB, set2ResB, matchResA, ptsA, ptsB, tbResB) {
  if (set1ResA === " " || set1ResA === "") return " ";
  if (set1ResB === "FORFEIT" || set2ResB === "FORFEIT") return "FORFEIT";
  if (matchResA === "FORFEIT" || ptsA < ptsB) return "WIN";
  if (ptsA > ptsB) return "LOSS";
  return tbResB === "WIN" ? "WIN" : "LOSS";
}

function matchPointsB(matchResB) {
  if (matchResB === "WIN") return 2;
  if (matchResB === "DRAW") return 1;
  return 0;
}

// Mirrors “Total Points Team A” handling for forfeits and totals. 
function totalPointsA(set1ResA, set2ResA, matchResA, matchResB) {
  if (matchResA === "FORFEIT") return 0;
  if (matchResB === "FORFEIT") return 10;
  const s1 = setPoints(set1ResA);
  const s2 = setPoints(set2ResA);
  const mp = matchResA === "WIN" ? 2 : matchResA === "DRAW" ? 1 : 0;
  return s1 + s2 + mp;
}

export default function MatchWorksheet() {
  const [players, setPlayers] = useState([]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const p = await storage.get(PLAYERS_KEY);
      const list = p?.value ? JSON.parse(p.value) : [];
      setPlayers(list);

      const m = await storage.get(MATCHES_KEY);
      if (m?.value) {
        setRows(JSON.parse(m.value));
      } else {
        // Default visible rows (like a fresh worksheet view)
        setRows(
          Array.from({ length: 16 }, (_, i) => ({
            id: crypto.randomUUID(),
            matchNo: String(i + 1),
            teamAId: "",
            teamBId: "",
            s1a: "",
            s1b: "",
            s2a: "",
            s2b: "",
            tba: " " // 'W' | 'L' | ' '
          }))
        );
      }
    })();
  }, []);

  const teamLabel = (t) => {
    if (!t) return "";
    const partner = t.partnerFirst ? ` & ${t.partnerFirst} ${t.partnerLast}` : "";
    return `${t.teamNumber} - ${t.teamName} (${t.playerFirst} ${t.playerLast}${partner})`;
  };

  const getTeam = (id) => players.find((p) => p.id === id);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const saveAll = async () => {
    setSaving(true);
    await storage.set(MATCHES_KEY, JSON.stringify(rows));
    setSaving(false);
    showToast("Worksheet saved");
  };

  const computed = useMemo(() => {
    return rows.map((r) => {
      const s1ResA = setResultA(r.s1a, r.s1b);
      const s1ResB = setResultB(s1ResA, r.s1a, r.s1b);
      const s2ResA = setResultA(r.s2a, r.s2b);
      const s2ResB = setResultB(s2ResA, r.s2a, r.s2b);

      const s1PtsA = setPoints(s1ResA);
      const s1PtsB = setPoints(s1ResB);
      const s2PtsA = setPoints(s2ResA);
      const s2PtsB = setPoints(s2ResB);

      const ptsA = s1PtsA + s2PtsA;
      const ptsB = s1PtsB + s2PtsB;

      const tbScoreA = (r.tba || " ").toUpperCase();
      const tbScoreB = tiebreakScoreB(tbScoreA);
      const tbResA = tiebreakResultA(s1ResA, s1PtsA, s2ResA, s2PtsA, s1PtsB, s2PtsB, tbScoreA);
      const tbResB = tiebreakResultB(r.s1a, r.s2a, s1ResA, s1PtsA, s2PtsA, s1PtsB, s2PtsB, tbScoreB);

      const mResA = matchResultA(s1ResA, s2ResA, s1ResB, s2ResB, ptsA, ptsB, tbResA);
      const mPtsA = matchPointsA(mResA);
      const mResB = matchResultB(s1ResA, s1ResB, s2ResB, mResA, ptsA, ptsB, tbResB);
      const mPtsB = matchPointsB(mResB);

      const totA = totalPointsA(s1ResA, s2ResA, mResA, mResB);
      const totB = s1PtsB + s2PtsB + mPtsB;

      return {
        ...r,
        s1ResA, s1PtsA, s1ResB, s1PtsB,
        s2ResA, s2PtsA, s2ResB, s2PtsB,
        tbScoreA, tbScoreB, tbResA, tbResB,
        mResA, mPtsA, mResB, mPtsB,
        totA, totB
      };
    });
  }, [rows]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px", color: "#f5f0e0", fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontWeight: 300, letterSpacing: 3 }}>MATCH WORKSHEET</h1>
        <div style={{ flex: 1 }} />
        <button
          onClick={saveAll}
          style={{
            background: "rgba(126,200,126,0.15)",
            border: "1px solid rgba(126,200,126,0.4)",
            borderRadius: 6,
            padding: "8px 14px",
            color: "#7ec87e",
            cursor: "pointer",
            letterSpacing: 1
          }}
        >
          {saving ? "SAVING…" : "SAVE"}
        </button>
      </div>

      <div style={{ color: "rgba(212,175,55,0.6)", fontSize: 12, marginBottom: 14 }}>
        Select teams from your participant list, enter scores (numbers or “F” for forfeit) for Set 1/2, and choose tiebreaker W/L. All other cells compute automatically. [1](https://nflit-my.sharepoint.com/personal/nikiforos_stamatakis_nfl_com/Documents/Forms/DispForm.aspx?ID=584032&web=1)
      </div>

      <div style={{ overflowX: "auto", border: "1px solid rgba(212,175,55,0.15)", borderRadius: 10, background: "rgba(0,0,0,0.25)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr>
              <th colSpan={5} style={topHdr} />
              <th colSpan={6} style={topHdr}>SET 1</th>
              <th colSpan={6} style={topHdr}>SET 2</th>
              <th colSpan={4} style={topHdr}>TIEBREAKER</th>
              <th colSpan={4} style={topHdr}>MATCH</th>
              <th colSpan={2} style={topHdr}>TOTAL POINTS</th>
            </tr>
            <tr>
              <th style={hdr}>#</th>
              <th style={hdr}>Team A</th>
              <th style={hdr}>Team B</th>
              <th style={hdr}>Players (A)</th>
              <th style={hdr}>Players (B)</th>

              <th colSpan={3} style={hdr}>Team A</th>
              <th colSpan={3} style={hdr}>Team B</th>
              <th colSpan={3} style={hdr}>Team A</th>
              <th colSpan={3} style={hdr}>Team B</th>
              <th colSpan={2} style={hdr}>Team A</th>
              <th colSpan={2} style={hdr}>Team B</th>
              <th colSpan={2} style={hdr}>Team A</th>
              <th colSpan={2} style={hdr}>Team B</th>
              <th style={hdr}>Team A</th>
              <th style={hdr}>Team B</th>
            </tr>
            <tr>
              <th style={subHdr} />
              <th style={subHdr} />
              <th style={subHdr} />
              <th style={subHdr} />
              <th style={subHdr} />

              <th style={subHdr}>Score</th><th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr}>Score</th><th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr}>Score</th><th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr}>Score</th><th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr}>Score</th><th style={subHdr}>Result</th>
              <th style={subHdr}>Score</th><th style={subHdr}>Result</th>
              <th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr}>Result</th><th style={subHdr}>Pts</th>
              <th style={subHdr} />
              <th style={subHdr} />
            </tr>
          </thead>

          <tbody>
            {computed.map((r, idx) => {
              const teamA = getTeam(r.teamAId);
              const teamB = getTeam(r.teamBId);

              return (
                <tr key={r.id} style={{ background: idx % 2 ? "rgba(212,175,55,0.03)" : "transparent" }}>
                  <td style={cell}>
                    <input style={inpSmall} value={r.matchNo} onChange={(e) => updateRow(r.id, "matchNo", e.target.value)} />
                  </td>

                  <td style={cell}>{teamA?.teamName || ""}</td>
                  <td style={cell}>{teamB?.teamName || ""}</td>

                  <td style={cell}>
                    <select style={sel} value={r.teamAId} onChange={(e) => updateRow(r.id, "teamAId", e.target.value)}>
                      <option value="">Select…</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>{teamLabel(p)}</option>
                      ))}
                    </select>
                  </td>

                  <td style={cell}>
                    <select style={sel} value={r.teamBId} onChange={(e) => updateRow(r.id, "teamBId", e.target.value)}>
                      <option value="">Select…</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>{teamLabel(p)}</option>
                      ))}
                    </select>
                  </td>

                  {/* SET 1 */}
                  <td style={cell}><input style={inp} value={r.s1a} onChange={(e) => updateRow(r.id, "s1a", e.target.value)} placeholder="# or F" /></td>
                  <td style={cellRes}>{r.s1ResA}</td>
                  <td style={cellPts}>{r.s1PtsA}</td>
                  <td style={cell}><input style={inp} value={r.s1b} onChange={(e) => updateRow(r.id, "s1b", e.target.value)} placeholder="# or F" /></td>
                  <td style={cellRes}>{r.s1ResB}</td>
                  <td style={cellPts}>{r.s1PtsB}</td>

                  {/* SET 2 */}
                  <td style={cell}><input style={inp} value={r.s2a} onChange={(e) => updateRow(r.id, "s2a", e.target.value)} placeholder="# or F" /></td>
                  <td style={cellRes}>{r.s2ResA}</td>
                  <td style={cellPts}>{r.s2PtsA}</td>
                  <td style={cell}><input style={inp} value={r.s2b} onChange={(e) => updateRow(r.id, "s2b", e.target.value)} placeholder="# or F" /></td>
                  <td style={cellRes}>{r.s2ResB}</td>
                  <td style={cellPts}>{r.s2PtsB}</td>

                  {/* TIEBREAKER (W/L only like the sheet’s score cells) */}
                  <td style={cell}>
                    <select style={selSmall} value={r.tbScoreA} onChange={(e) => updateRow(r.id, "tba", e.target.value)}>
                      <option value=" "> </option>
                      <option value="W">W</option>
                      <option value="L">L</option>
                    </select>
                  </td>
                  <td style={cellRes}>{r.tbResA}</td>
                  <td style={cell}>{r.tbScoreB}</td>
                  <td style={cellRes}>{r.tbResB}</td>

                  {/* MATCH */}
                  <td style={cellResStrong}>{r.mResA}</td>
                  <td style={cellPtsStrong}>{r.mPtsA}</td>
                  <td style={cellResStrong}>{r.mResB}</td>
                  <td style={cellPtsStrong}>{r.mPtsB}</td>

                  {/* TOTAL */}
                  <td style={cellTot}>{r.totA}</td>
                  <td style={cellTot}>{r.totB}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: toast.type === "error" ? "rgba(224,112,112,0.15)" : "rgba(126,200,126,0.12)",
          border: `1px solid ${toast.type === "error" ? "rgba(224,112,112,0.4)" : "rgba(126,200,126,0.35)"}`,
          borderRadius: 8, padding: "12px 20px",
          color: toast.type === "error" ? "#e07070" : "#7ec87e",
          fontSize: 14,
          backdropFilter: "blur(10px)",
          zIndex: 300
        }}>
          {toast.type === "error" ? "⚠ " : "✓ "}{toast.msg}
        </div>
      )}
    </div>
  );
}

const topHdr = {
  padding: "10px 8px",
  fontSize: 11,
  letterSpacing: 2,
  color: "rgba(212,175,55,0.75)",
  background: "rgba(212,175,55,0.08)",
  borderBottom: "1px solid rgba(212,175,55,0.2)",
  textAlign: "center"
};

const hdr = {
  padding: "8px 6px",
  fontSize: 10,
  letterSpacing: 1.6,
  color: "rgba(212,175,55,0.65)",
  background: "rgba(0,0,0,0.22)",
  borderBottom: "1px solid rgba(212,175,55,0.14)",
  textAlign: "center",
  whiteSpace: "nowrap"
};

const subHdr = {
  padding: "6px 6px",
  fontSize: 10,
  color: "rgba(245,240,224,0.45)",
  background: "rgba(0,0,0,0.18)",
  borderBottom: "1px solid rgba(212,175,55,0.10)",
  textAlign: "center",
  whiteSpace: "nowrap"
};

const cell = {
  padding: "6px 6px",
  borderBottom: "1px solid rgba(212,175,55,0.07)",
  textAlign: "center",
  fontSize: 12
};

const cellRes = { ...cell, color: "rgba(245,240,224,0.65)", fontSize: 11, letterSpacing: 0.6 };
const cellPts = { ...cell, color: "#d4af37", fontWeight: 600 };
const cellResStrong = { ...cell, color: "#d4af37", fontWeight: 700, letterSpacing: 0.8 };
const cellPtsStrong = { ...cell, color: "#7ec87e", fontWeight: 700 };
const cellTot = { ...cell, color: "#f5f0e0", fontWeight: 700, fontSize: 13 };

const inp = {
  width: 42,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(212,175,55,0.3)",
  borderRadius: 4,
  padding: "3px 6px",
  color: "#f5f0e0",
  outline: "none",
  fontFamily: "Georgia, serif",
  textAlign: "center"
};

const inpSmall = { ...inp, width: 36 };

const sel = {
  width: 260,
  maxWidth: 260,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(212,175,55,0.25)",
  borderRadius: 6,
  padding: "6px 8px",
  color: "#f5f0e0",
  outline: "none",
  fontFamily: "Georgia, serif"
};

const selSmall = { ...sel, width: 54, maxWidth: 54, padding: "4px 6px" };