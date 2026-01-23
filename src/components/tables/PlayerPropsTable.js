// PlayerPropsTable.js - Reusable table for displaying player props
import React from "react";

function formatOdds(price) {
  if (price == null) return "-";
  return price > 0 ? `+${price}` : `${price}`;
}

function PlayerPropsTable({ props, marketLabel }) {
  const styles = {
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      textAlign: "left",
      padding: "12px",
      borderBottom: "1px solid #334155",
      color: "#94a3b8",
      fontSize: "13px",
      fontWeight: "600",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid #1e293b",
    },
    playerName: {
      fontWeight: "500",
      color: "#fff",
    },
    line: {
      color: "#3b82f6",
      fontWeight: "600",
    },
    oddsPositive: {
      color: "#22c55e",
      fontWeight: "500",
    },
    oddsNegative: {
      color: "#ef4444",
      fontWeight: "500",
    },
    bookmaker: {
      color: "#94a3b8",
      fontSize: "12px",
    },
    noData: {
      textAlign: "center",
      padding: "40px",
      color: "#94a3b8",
    },
  };

  if (!props || props.length === 0) {
    return (
      <div style={styles.noData}>
        No {marketLabel || "props"} available for this game.
      </div>
    );
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Player</th>
          <th style={styles.th}>Line</th>
          <th style={styles.th}>Over Odds</th>
          <th style={styles.th}>Book</th>
        </tr>
      </thead>
      <tbody>
        {props.map((prop, idx) => (
          <tr key={idx}>
            <td style={{ ...styles.td, ...styles.playerName }}>{prop.player}</td>
            <td style={{ ...styles.td, ...styles.line }}>{prop.line}</td>
            <td
              style={{
                ...styles.td,
                ...(prop.price > 0 ? styles.oddsPositive : styles.oddsNegative),
              }}
            >
              {formatOdds(prop.price)}
            </td>
            <td style={{ ...styles.td, ...styles.bookmaker }}>{prop.bookmaker}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default PlayerPropsTable;
