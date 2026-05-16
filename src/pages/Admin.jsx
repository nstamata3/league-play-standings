import { useState, useEffect } from "react";
import { storage } from "../storage";

export default function Admin() {
  const STORAGE_KEY = "nylbc-players-2023";

  const [players, setPlayers] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [playerFirst, setPlayerFirst] = useState("");
  const [playerLast, setPlayerLast] = useState("");
  const [partnerFirst, setPartnerFirst] = useState("");
  const [partnerLast, setPartnerLast] = useState("");

  useEffect(() => {
    (async () => {
      const res = await storage.get(STORAGE_KEY);
      if (res?.value) {
        setPlayers(JSON.parse(res.value));
      }
    })();
  }, []);

  const savePlayers = async (list) => {
    setPlayers(list);
    await storage.set(STORAGE_KEY, JSON.stringify(list));
  };

  const addPlayer = async () => {
    if (!teamName || !playerFirst || !playerLast) return;

    const newPlayer = {
      id: crypto.randomUUID(),
      teamNumber: players.length + 1,
      teamName,
      playerFirst,
      playerLast,
      partnerFirst,
      partnerLast
    };

    const updated = [...players, newPlayer];
    await savePlayers(updated);

    // reset form
    setTeamName("");
    setPlayerFirst("");
    setPlayerLast("");
    setPartnerFirst("");
    setPartnerLast("");
  };

  const removePlayer = async (id) => {
    const updated = players.filter((p) => p.id !== id);
    await savePlayers(updated);
  };

  return (
    <div style={{ padding: 24, color: "#f5f0e0", fontFamily: "Georgia, serif" }}>
      <h2 style={{ color: "#d4af37" }}>Admin – Participants</h2>

      {/* Form */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Team Name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
        <input
          placeholder="Player First"
          value={playerFirst}
          onChange={(e) => setPlayerFirst(e.target.value)}
        />
        <input
          placeholder="Player Last"
          value={playerLast}
          onChange={(e) => setPlayerLast(e.target.value)}
        />
        <input
          placeholder="Partner First"
          value={partnerFirst}
          onChange={(e) => setPartnerFirst(e.target.value)}
        />
        <input
          placeholder="Partner Last"
          value={partnerLast}
          onChange={(e) => setPartnerLast(e.target.value)}
        />

        <button onClick={addPlayer}>Add Team</button>
      </div>

      {/* Table */}
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>Player</th>
            <th>Partner</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>{p.teamNumber}</td>
              <td>{p.teamName}</td>
              <td>{p.playerFirst} {p.playerLast}</td>
              <td>
                {p.partnerFirst} {p.partnerLast}
              </td>
              <td>
                <button onClick={() => removePlayer(p.id)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
