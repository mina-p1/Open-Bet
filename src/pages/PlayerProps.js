// PlayerProps.js - Popup view, split by team, with Over/Under + Prediction column
import React, { useEffect, useMemo, useState } from "react";
import Loader from "../components/layout/Loader";

const MARKET_LABELS = {
  player_points: "Points",
  player_rebounds: "Rebounds",
  player_assists: "Assists",
  player_threes: "3-Pointers",
  player_points_rebounds_assists: "PRA",
};

const MARKET_ORDER = [
  "player_points",
  "player_rebounds",
  "player_assists",
  "player_threes",
  "player_points_rebounds_assists",
];

function formatCommence(timeStr) {
  if (!timeStr) return "";
  const d = new Date(timeStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOdds(price) {
  if (price == null) return "-";
  return price > 0 ? `+${price}` : `${price}`;
}

function PlayerProps() {
  const [propsData, setPropsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedGameId, setSelectedGameId] = useState(null);
  const [activeMarket, setActiveMarket] = useState("player_points");
  const [selectedBook, setSelectedBook] = useState("ALL");

  // Load snapshot
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const API_BASE_URL =
      process.env.NODE_ENV === "production"
        ? "https://open-bet-capstone.onrender.com"
        : "http://127.0.0.1:5050";

    fetch(`${API_BASE_URL}/api/player-props`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) {
          setError(
            typeof data.error === "string" ? data.error : JSON.stringify(data)
          );
        } else {
          setPropsData(Array.isArray(data) ? data : []);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load player props.");
        setIsLoading(false);
      });
  }, []);

  // Group by game
  const gamesMap = useMemo(() => {
    const map = {};
    propsData.forEach((p) => {
      if (!map[p.game_id]) {
        map[p.game_id] = {
          game_id: p.game_id,
          home_team: p.home_team,
          away_team: p.away_team,
          commence_time: p.commence_time,
          props: [],
        };
      }
      map[p.game_id].props.push(p);
    });
    return map;
  }, [propsData]);

  const games = Object.values(gamesMap).sort(
    (a, b) => new Date(a.commence_time) - new Date(b.commence_time)
  );

  const selectedGame =
    selectedGameId && gamesMap[selectedGameId]
      ? gamesMap[selectedGameId]
      : null;

  // When you open a game, default to FanDuel if available, else All
  useEffect(() => {
    if (!selectedGame) return;
    setActiveMarket("player_points");

    const books = new Set(
      selectedGame.props.map((p) => p.bookmaker).filter(Boolean)
    );
    if (books.has("FanDuel")) {
      setSelectedBook("FanDuel");
    } else {
      setSelectedBook("ALL");
    }
  }, [selectedGameId, selectedGame]);

  // Bookmakers in this game
  const availableBooks = useMemo(() => {
    if (!selectedGame) return [];
    const set = new Set();
    selectedGame.props.forEach((p) => {
      if (p.bookmaker) set.add(p.bookmaker);
    });
    return Array.from(set).sort();
  }, [selectedGame]);

  // Markets with data for this game + bookmaker
  const availableMarkets = useMemo(() => {
    if (!selectedGame) return [];
    const found = new Set();
    selectedGame.props.forEach((p) => {
      if (
        MARKET_ORDER.includes(p.market) &&
        (selectedBook === "ALL" || p.bookmaker === selectedBook)
      ) {
        found.add(p.market);
      }
    });
    return MARKET_ORDER.filter((m) => found.has(m));
  }, [selectedGame, selectedBook]);

  // Build rows for the current market split into HOME / AWAY sections
  const currentMarketRows = useMemo(() => {
    if (!selectedGame) return { home: [], away: [] };

    const homeRows = {};
    const awayRows = {};

    selectedGame.props.forEach((p) => {
      if (p.market !== activeMarket) return;
      if (selectedBook !== "ALL" && p.bookmaker !== selectedBook) return;
      if (!p.player || p.line == null) return;

      // require a valid side; default unknown to away so at least shown
      const teamSide =
        p.team_side === "HOME" || p.team_side === "AWAY"
          ? p.team_side
          : "AWAY";

      const targetMap = teamSide === "HOME" ? homeRows : awayRows;
      const key = `${p.player}-${p.line}-${p.bookmaker}`;

      if (!targetMap[key]) {
        targetMap[key] = {
          player: p.player,
          line: p.line,
          bookmaker: p.bookmaker,
          over_price: null,
          under_price: null,
          prop_prediction: p.prop_prediction || null,
          edge_vs_line:
            typeof p.edge_vs_line === "number" ? p.edge_vs_line : null,
        };
      }

      const row = targetMap[key];
      const ouName = (p.over_under || "").toLowerCase();
      if (ouName === "over") {
        row.over_price = p.price;
      } else if (ouName === "under") {
        row.under_price = p.price;
      }

      // If any later record has a prediction/edge (e.g., from a different book), keep it
      if (!row.prop_prediction && p.prop_prediction) {
        row.prop_prediction = p.prop_prediction;
      }
      if (
        row.edge_vs_line == null &&
        typeof p.edge_vs_line === "number"
      ) {
        row.edge_vs_line = p.edge_vs_line;
      }
    });

    const toSortedArray = (map) =>
      Object.values(map).sort((a, b) => a.player.localeCompare(b.player));

    return {
      home: toSortedArray(homeRows),
      away: toSortedArray(awayRows),
    };
  }, [selectedGame, activeMarket, selectedBook]);

  // ---- Styles ----
  const styles = {
    container: {
      padding: "20px",
      maxWidth: "1200px",
      margin: "0 auto",
      color: "#fff",
      position: "relative",
    },
    header: { marginBottom: "20px" },
    title: { fontSize: "28px", fontWeight: "bold", marginBottom: "8px" },
    subtitle: { color: "#aaa", fontSize: "14px" },
    error: { color: "#ff6b6b", padding: "20px", textAlign: "center" },
    gamesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "16px",
    },
    gameCard: {
      background: "#1e293b",
      borderRadius: "12px",
      padding: "16px",
      cursor: "pointer",
      border: "2px solid transparent",
      transition: "all 0.2s",
    },
    gameCardHover: "#3b82f6",
    gameTeams: { fontSize: "16px", fontWeight: "600", marginBottom: "8px" },
    gameTime: { fontSize: "13px", color: "#94a3b8" },
    noData: {
      textAlign: "center",
      padding: "40px",
      color: "#94a3b8",
    },
    modalOverlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.85)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    },
    modalContent: {
      background: "#0f172a",
      borderRadius: "16px",
      width: "95%",
      maxWidth: "1050px",
      maxHeight: "90vh",
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
      display: "flex",
      flexDirection: "column",
    },
    modalHeader: {
      padding: "16px 20px",
      borderBottom: "1px solid #1e293b",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalTitle: { fontSize: "18px", fontWeight: "600" },
    modalSub: { fontSize: "13px", color: "#94a3b8" },
    closeBtn: {
      border: "none",
      background: "#1e293b",
      color: "#e5e7eb",
      borderRadius: "999px",
      padding: "6px 10px",
      cursor: "pointer",
      fontSize: "13px",
    },
    modalBody: {
      padding: "16px 20px 20px",
      overflowY: "auto",
    },
    tabsRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      marginBottom: "16px",
      alignItems: "center",
      justifyContent: "space-between",
    },
    tabs: { display: "flex", flexWrap: "wrap", gap: "8px" },
    tab: {
      padding: "6px 12px",
      borderRadius: "999px",
      border: "none",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: "500",
      background: "#1f2937",
      color: "#9ca3af",
    },
    tabActive: { background: "#3b82f6", color: "#fff" },
    select: {
      background: "#0f172a",
      color: "#e5e7eb",
      borderRadius: "999px",
      border: "1px solid #374151",
      padding: "6px 10px",
      fontSize: "13px",
    },
    teamSection: {
      marginTop: "8px",
      marginBottom: "18px",
      width: "100%",
    },
    teamTitle: {
      fontSize: "14px",
      fontWeight: "600",
      marginBottom: "6px",
      color: "#9ca3af",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      background: "#020617",
      borderRadius: "10px",
      overflow: "hidden",
    },
    th: {
      textAlign: "left",
      padding: "8px 10px",
      borderBottom: "1px solid #1f2933",
      color: "#9ca3af",
      fontSize: "12px",
      fontWeight: "600",
    },
    td: {
      padding: "8px 10px",
      borderBottom: "1px solid #111827",
      fontSize: "13px",
    },
    playerName: { fontWeight: "500", color: "#e5e7eb" },
    line: { color: "#60a5fa", fontWeight: "600" },
    oddsPos: { color: "#22c55e", fontWeight: "500" },
    oddsNeg: { color: "#ef4444", fontWeight: "500" },
    bookCell: { color: "#9ca3af", fontSize: "12px" },
    rowTables: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "16px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Player Props</h1>
        <p style={styles.subtitle}>
          Click a game to open a popup with player prop lines. Use the tabs and
          bookmaker dropdown to explore different markets.
        </p>
      </div>

      {isLoading && <Loader />}
      {error && <div style={styles.error}>Error: {error}</div>}

      {!isLoading && !error && games.length === 0 && (
        <div style={styles.noData}>
          No player props available right now. Check back closer to game time.
        </div>
      )}

      {!isLoading && !error && games.length > 0 && (
        <div style={styles.gamesGrid}>
          {games.map((game) => (
            <div
              key={game.game_id}
              style={styles.gameCard}
              onClick={() => setSelectedGameId(game.game_id)}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = styles.gameCardHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "transparent")
              }
            >
              <div style={styles.gameTeams}>
                {game.away_team} @ {game.home_team}
              </div>
              <div style={styles.gameTime}>
                {formatCommence(game.commence_time)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {selectedGame && (
        <div
          style={styles.modalOverlay}
          onClick={() => setSelectedGameId(null)}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>
                  {selectedGame.away_team} @ {selectedGame.home_team}
                </div>
                <div style={styles.modalSub}>
                  {formatCommence(selectedGame.commence_time)}
                </div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedGameId(null)}
              >
                ✕ Close
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.tabsRow}>
                <div style={styles.tabs}>
                  {availableMarkets.map((m) => (
                    <button
                      key={m}
                      style={{
                        ...styles.tab,
                        ...(activeMarket === m ? styles.tabActive : {}),
                      }}
                      onClick={() => setActiveMarket(m)}
                    >
                      {MARKET_LABELS[m]}
                    </button>
                  ))}
                  {availableMarkets.length === 0 && (
                    <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                      No prop markets for this game yet.
                    </span>
                  )}
                </div>

                {availableBooks.length > 0 && (
                  <div>
                    <label style={{ fontSize: "12px", marginRight: "6px" }}>
                      Bookmaker:
                    </label>
                    <select
                      style={styles.select}
                      value={selectedBook}
                      onChange={(e) => setSelectedBook(e.target.value)}
                    >
                      <option value="ALL">All</option>
                      {availableBooks.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={styles.rowTables}>
                {/* Home table */}
                <div style={styles.teamSection}>
                  <div style={styles.teamTitle}>
                    {selectedGame.home_team} – Home
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Player</th>
                        <th style={styles.th}>Line</th>
                        <th style={styles.th}>Over Odds</th>
                        <th style={styles.th}>Under Odds</th>
                        <th style={styles.th}>Book</th>
                        <th style={styles.th}>Prediction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMarketRows.home.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ ...styles.td, ...styles.playerName }}>
                            {row.player}
                          </td>
                          <td style={{ ...styles.td, ...styles.line }}>
                            {row.line}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(row.over_price > 0
                                ? styles.oddsPos
                                : styles.oddsNeg),
                            }}
                          >
                            {row.over_price != null
                              ? formatOdds(row.over_price)
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(row.under_price > 0
                                ? styles.oddsPos
                                : styles.oddsNeg),
                            }}
                          >
                            {row.under_price != null
                              ? formatOdds(row.under_price)
                              : "-"}
                          </td>
                          <td style={{ ...styles.td, ...styles.bookCell }}>
                            {row.bookmaker}
                          </td>
                          <td style={styles.td}>
                            {row.prop_prediction ? (
                              <span
                                style={{
                                  color:
                                    row.edge_vs_line > 0
                                      ? "#22c55e"
                                      : row.edge_vs_line < 0
                                      ? "#ef4444"
                                      : "#e5e7eb",
                                  fontWeight: 500,
                                }}
                              >
                                {`Proj: ${row.prop_prediction.expected_value}`}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Away table */}
                <div style={styles.teamSection}>
                  <div style={styles.teamTitle}>
                    {selectedGame.away_team} – Away
                  </div>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Player</th>
                        <th style={styles.th}>Line</th>
                        <th style={styles.th}>Over Odds</th>
                        <th style={styles.th}>Under Odds</th>
                        <th style={styles.th}>Book</th>
                        <th style={styles.th}>Prediction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMarketRows.away.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ ...styles.td, ...styles.playerName }}>
                            {row.player}
                          </td>
                          <td style={{ ...styles.td, ...styles.line }}>
                            {row.line}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(row.over_price > 0
                                ? styles.oddsPos
                                : styles.oddsNeg),
                            }}
                          >
                            {row.over_price != null
                              ? formatOdds(row.over_price)
                              : "-"}
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...(row.under_price > 0
                                ? styles.oddsPos
                                : styles.oddsNeg),
                            }}
                          >
                            {row.under_price != null
                              ? formatOdds(row.under_price)
                              : "-"}
                          </td>
                          <td style={{ ...styles.td, ...styles.bookCell }}>
                            {row.bookmaker}
                          </td>
                          <td style={styles.td}>
                            {row.prop_prediction ? (
                              <span
                                style={{
                                  color:
                                    row.edge_vs_line > 0
                                      ? "#22c55e"
                                      : row.edge_vs_line < 0
                                      ? "#ef4444"
                                      : "#e5e7eb",
                                  fontWeight: 500,
                                }}
                              >
                                {`Proj: ${row.prop_prediction.expected_value}`}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {currentMarketRows.home.length === 0 &&
                currentMarketRows.away.length === 0 &&
                availableMarkets.length > 0 && (
                  <div style={styles.noData}>
                    No {MARKET_LABELS[activeMarket]} props for{" "}
                    {selectedBook === "ALL" ? "this game" : selectedBook}.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerProps;
