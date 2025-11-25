import React, { useState } from "react";

// helper functions
function formatAmerican(num, isHome, isSpread) {
    if (num === undefined || num === null || num === "-") return "-";
    const n = Number(num);
    if (isNaN(n)) return num;
    if (isSpread) return (n > 0 ? `+${n}` : `${n}`);
    return n > 0 ? `+${n}` : `${n}`;
}
function formatOdds(num) {
    if (num === undefined || num === null || num === "-") return "-";
    const n = Number(num);
    if (isNaN(n)) return num;
    return n > 0 ? `+${n}` : `${n}`;
}
function formatTimestamp(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York'
    });
}
function getBookmaker(game, key) {
    if (!game.bookmakers) return null;
    return game.bookmakers.find(bk => bk.key === key);
}
function getMarket(book, marketKey) {
    if (!book || !book.markets) return null;
    return book.markets.find(mkt => mkt.key === marketKey);
}
function getOutcome(market, teamName) {
    if (!market || !market.outcomes) return null;
    return market.outcomes.find(o => o.name === teamName);
}
function getOutcomeTotals(market, type) {
    if (!market || !market.outcomes) return null;
    return market.outcomes.find(o => o.name === type);
}

function getEasternToday() {
    const now = new Date();
    const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const [{ value: month },,{ value: day },,{ value: year }] = dtf.formatToParts(now);
    return new Date(`${year}-${month}-${day}T00:00:00-05:00`);
}

//dropdown for the bookmaker picker (pick a sportsbook)
function BookmakerDropdown({ bookmakerList, current, onChange }) {
    if (!bookmakerList.length) return null;
    return (
        <div style={{
            position: "absolute", top: 24, right: 36, zIndex: 4
        }}>
            <select
                value={current}
                onChange={e => onChange(e.target.value)}
                style={{
                    background: "#152540",
                    color: "#fff",
                    border: "2px solid #2774cf",
                    borderRadius: 9,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "7px 15px 7px 9px",
                    appearance: "none",
                    minWidth: 130,
                    boxShadow: "0 1px 7px #1d223133"
                }}>
                {bookmakerList.map(bk => (
                    <option key={bk} value={bk}>
                        {bk.toUpperCase()}
                    </option>
                ))}
            </select>
        </div>
    );
}

// datebar/date picker function:
function DateBar({ selectedDate, setSelectedDate }) {
    function changeDate(days) {
        const est = new Date(selectedDate);
        est.setDate(est.getDate() + days);
        setSelectedDate(est);
    }
    const estDtf = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: "short", month: "short", day: "numeric", year: "numeric"
    });
    const nowEst = getEasternToday();
    const isToday =
        selectedDate.getFullYear() === nowEst.getFullYear() &&
        selectedDate.getMonth() === nowEst.getMonth() &&
        selectedDate.getDate() === nowEst.getDate();
    const label = estDtf.format(selectedDate);

    return (
        <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            marginTop: 0, marginBottom: 34
        }}>
            <button
                onClick={() => changeDate(-1)}
                style={{
                    background: "none", border: "none", fontSize: 26, color: "#57BFFF",
                    cursor: "pointer", padding: "0 22px 0 0", userSelect: "none"
                }}
                aria-label="Previous day"
            >&#8592;</button>
            <div style={{
                fontWeight: 800,
                letterSpacing: ".01em",
                background: "#1d2231",
                borderRadius: 14,
                color: "#fff",
                fontSize: "1.14em",
                padding: "10px 38px",
                minWidth: 260,
                textAlign: "center",
                boxShadow: "0 1px 8px #181a250a"
            }}>
                {isToday ? `Today, ${label}` : label}
            </div>
            <button
                onClick={() => changeDate(1)}
                style={{
                    background: "none", border: "none", fontSize: 26, color: "#57BFFF",
                    cursor: "pointer", padding: "0 0 0 22px", userSelect: "none"
                }}
                aria-label="Next day"
            >&#8594;</button>
        </div>
    );
}

//NEW Displays the  Prediction
function PredictionDisplay({ prediction }) {
    if (!prediction) return (
        <div style={{
            marginTop: 15, padding: "12px", background: "#151e34", borderRadius: 8,
            textAlign: "center", color: "#8899aa", fontSize: 14, border: "1px dashed #2a3b55"
        }}>
            No prediction available for this matchup.
        </div>
    );

    return (
        <div style={{
            marginTop: 15,
            padding: "16px",
            background: "linear-gradient(135deg, #1e2538 0%, #161b29 100%)",
            borderRadius: 12,
            border: "1px solid #4f46e5", // Purple/Blue 
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.3s ease-in-out"
        }}>
            <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase",
                color: "#a5b4fc", marginBottom: 6
            }}>
                OpenBet Model Projection
            </div>
            <div style={{
                fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4,
                textShadow: "0 0 10px rgba(165, 180, 252, 0.3)"
            }}>
                {prediction.message}
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
                Predicted Margin: <span style={{ color: "#818cf8", fontWeight: 700 }}>{prediction.predicted_margin}</span> pts
            </div>
        </div>
    );
}

// the current game odds "card"
function OddsTile({ value, label, sub, isHome, isSpread }) {
    let mainValue = "-";
    let oddsValue = "-";
    if (label === "Spread") mainValue = formatAmerican(value, isHome, true);
    else if (label === "Moneyline") mainValue = formatAmerican(value, isHome, false);
    else mainValue = value !== undefined && value !== null ? value : "-";
    if (sub !== undefined) oddsValue = formatOdds(sub);

    return (
        <div style={{
            width: 98, height: 80,
            background: "#070a0fff",
            border: "2px solid #234283",
            borderRadius: 11,
            textAlign: "center",
            boxSizing: "border-box",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
        }}>
            <span style={{
                fontWeight: 650, color: "#60c0fd", fontSize: 15, marginBottom: 1, lineHeight: 1.1
            }}>{label}</span>
            <span style={{
                fontWeight: 900, fontSize: 24, color: "#fff", lineHeight: 1.13
            }}>{mainValue}</span>
            {oddsValue !== "-" &&
                <span style={{
                    fontWeight: 900, fontSize: 17,
                    color: "#3CB4FF", marginTop: 1, lineHeight: 1
                }}>{oddsValue}</span>
            }
        </div>
    );
}
function OddsRowAligned({ team, labelColor, spread, ml, total, totalLabel, isHome }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 1fr 1fr 1fr",
            alignItems: "center",
            gap: 12,
            marginBottom: 9,
            minHeight: 67,
        }}>
            <span style={{
                fontWeight: 700, color: labelColor, fontSize: "1.16em", textAlign: "left", paddingLeft: 7
            }}>{team}</span>
            <OddsTile value={spread?.point ?? "-"} sub={spread?.price} label="Spread" isHome={isHome} isSpread />
            <OddsTile value={ml?.price ?? "-"} label="Moneyline" isHome={isHome} />
            <OddsTile value={total?.point ?? "-"} sub={total?.price} label={totalLabel} isHome={isHome} />
        </div>
    );
}
// compare/expand for other book live odds
function CompareTable({ game }) {
    if (!game.bookmakers) return null;
    return (
        <table style={{
            width: "99%", background: "#151e34", color: "#fff", borderRadius: 11,
            margin: "0 auto 7px", fontSize: 15, borderCollapse: "collapse"
        }}>
            <thead>
                <tr>
                    <th style={{ color: "#57BFFF", padding: 7, textAlign: "center" }}>Bookmaker</th>
                    <th style={{ color: "#73d0fd" }}>{game.away_team}</th>
                    <th style={{ color: "#FFB085" }}>{game.home_team}</th>
                </tr>
            </thead>
            <tbody>
                {game.bookmakers.map(b => {
                    const spread = getMarket(b, "spreads");
                    const h2h = getMarket(b, "h2h");
                    const totals = getMarket(b, "totals");
                    const aSpread = getOutcome(spread, game.away_team);
                    const hSpread = getOutcome(spread, game.home_team);
                    const aML = getOutcome(h2h, game.away_team);
                    const hML = getOutcome(h2h, game.home_team);
                    const over = getOutcomeTotals(totals, "Over");
                    const under = getOutcomeTotals(totals, "Under");
                    return (
                        <tr key={b.key}>
                            <td style={{ padding: 7, fontWeight: 700, textAlign: "center" }}>{b.title || b.key.toUpperCase()}</td>
                            <td style={{ textAlign: "center", padding: 6 }}>
                                Spread: {formatAmerican(aSpread?.point, false, true)} ({formatOdds(aSpread?.price)}) <br />
                                ML: {formatAmerican(aML?.price, false, false)} <br />
                                O: {over?.point || "-"} ({formatOdds(over?.price)})
                            </td>
                            <td style={{ textAlign: "center", padding: 6 }}>
                                Spread: {formatAmerican(hSpread?.point, true, true)} ({formatOdds(hSpread?.price)}) <br />
                                ML: {formatAmerican(hML?.price, true, false)} <br />
                                U: {under?.point || "-"} ({formatOdds(under?.price)})
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function OddsCard({ game, bookmakerKey }) {
    const [compareOpen, setCompareOpen] = useState(false);
    const [predictionOpen, setPredictionOpen] = useState(false); // New 

    const book = getBookmaker(game, bookmakerKey);
    const mlMarket = getMarket(book, 'h2h');
    const spreadMarket = getMarket(book, 'spreads');
    const totalsMarket = getMarket(book, 'totals');
    const awayMl = getOutcome(mlMarket, game.away_team);
    const awaySpread = getOutcome(spreadMarket, game.away_team);
    const homeMl = getOutcome(mlMarket, game.home_team);
    const homeSpread = getOutcome(spreadMarket, game.home_team);
    const totalOver = getOutcomeTotals(totalsMarket, "Over");
    const totalUnder = getOutcomeTotals(totalsMarket, "Under");

    return (
        <div style={{
            background: '#23293a', borderRadius: 18, color: '#fff',
            padding: '1.3em 1.2em 1.45em 1.2em', minWidth: 450, maxWidth: 450, width: "100%",
            display: "flex", flexDirection: "column", boxShadow: "0 2px 16px #1d23366c"
        }}>
            <div style={{ fontWeight: 800, fontSize: '1.16em', marginBottom: 6, color: '#7EC6F7', textAlign: "left" }}>
                {game.away_team} @ {game.home_team}
            </div>
            <div style={{ marginBottom: 11, color: '#bbc8d3', fontSize: '1em' }}>
                Tip-off: {formatTimestamp(game.start_time || game.commence_time || game.event_time || "")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                <OddsRowAligned team={game.away_team} labelColor="#60c0fc" spread={awaySpread} ml={awayMl} total={totalOver} totalLabel="Over" isHome={false} />
                <OddsRowAligned team={game.home_team} labelColor="#FF8B64" spread={homeSpread} ml={homeMl} total={totalUnder} totalLabel="Under" isHome={true} />
            </div>

            {/* 2. UPDATED BUTTONS SECTION */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 14 }}>
                <button
                    style={{
                        padding: "7px 19px", borderRadius: 8, border: "none", background: "#378aff",
                        color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer"
                    }}
                    onClick={() => {
                        setCompareOpen(!compareOpen);
                        if (predictionOpen) setPredictionOpen(false); // Close other tab if open
                    }}
                >
                    {compareOpen ? "Hide Odds" : "Compare Books"}
                </button>

                {/* NEW PREDICTION BUTTON */}
                <button
                    style={{
                        padding: "7px 19px", borderRadius: 8, border: "none",
                        background: predictionOpen ? "#4f46e5" : "#6366f1", // Purple 
                        color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer",
                        boxShadow: "0 2px 5px rgba(99, 102, 241, 0.4)"
                    }}
                    onClick={() => {
                        setPredictionOpen(!predictionOpen);
                        if (compareOpen) setCompareOpen(false); // Close other tab if open
                    }}
                >
                    {predictionOpen ? "Hide Model" : "Our Prediction"}
                </button>
            </div>

            {/* 3. RENDERS PREDICTION COMPONENT */}
            {compareOpen && <div style={{ marginTop: 13 }}><CompareTable game={game} /></div>}
            {predictionOpen && <PredictionDisplay prediction={game.openbet_prediction} />}
        </div>
    );
}

// odds table (holding the odds card)
function OddsTable({ gamesData }) {
    const [selectedDate, setSelectedDate] = useState(getEasternToday);
    const [bookmakerKey, setBookmakerKey] = useState('fanduel');

    const estIsoString = selectedDate.toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    const [estMonth, estDay, estYear] = estIsoString.split('/');
    const estDateStr = `${estYear}-${estMonth.padStart(2, '0')}-${estDay.padStart(2, '0')}`;


    const filteredGames = gamesData.filter(game => {
        const tipoffIso = game.start_time || game.commence_time || game.event_time || "";
        if (!tipoffIso) return false;
        const gameDateObj = new Date(tipoffIso);
        const gameDateEst = gameDateObj.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
        const [gMonth, gDay, gYear] = gameDateEst.split('/');
        const gameEstDateStr = `${gYear}-${gMonth.padStart(2, '0')}-${gDay.padStart(2, '0')}`;
        return gameEstDateStr === estDateStr;
    });

    // List available bookmakers for the filtered games:
    const allBookmakerKeys = Array.from(
        new Set(filteredGames.flatMap(g => g.bookmakers ? g.bookmakers.map(b => b.key) : []))
    ).sort();

    return (
        <div style={{ position: 'relative' }}>
            <BookmakerDropdown bookmakerList={allBookmakerKeys} current={bookmakerKey} onChange={setBookmakerKey} />
            <DateBar selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            {filteredGames.length === 0 ? (
                <div style={{ color: "#99aacc", textAlign: "center", margin: "36px 0", fontSize: "1.1em" }}>
                    No odds available for today's games.
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '32px 38px',
                    margin: '36px auto',
                    maxWidth: 1340,
                    width: "100%",
                    justifyItems: "center",
                    padding: "0 1vw"
                }}>
                    {filteredGames.map((game, idx) =>
                        <OddsCard
                            key={game.id || idx}
                            game={game}
                            bookmakerKey={bookmakerKey}
                        />
                    )}
                </div>
            )}
        </div>
    );
}

export default OddsTable;
