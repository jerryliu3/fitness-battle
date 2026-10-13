"use client";

import { useCompete } from "@/components/compete-context";
import "./admin.css";
import {
  SPORTS,
  adminSnapshot,
  formatEffort,
  formatVolume,
  sportById,
  type PoolPlayer,
  type SportId,
} from "@fitness-battle/shared";
import Link from "next/link";
import { useMemo, useState } from "react";

function sportName(sport: SportId): string {
  return sportById(sport).name;
}

function slug(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "peer";
}

export default function AdminPage() {
  const { state, dispatch } = useCompete();
  const [peerName, setPeerName] = useState("Ada");
  const [peerElo, setPeerElo] = useState("1000");
  const [peerSport, setPeerSport] = useState<SportId>("running");
  const [sessionWho, setSessionWho] = useState("you");
  const [sessionSport, setSessionSport] = useState<SportId>("running");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionKm, setSessionKm] = useState("5");
  const [sessionMin, setSessionMin] = useState("30");
  const [sessionHr, setSessionHr] = useState("");
  const [sessionVerified, setSessionVerified] = useState(true);
  const [clockInput, setClockInput] = useState("");

  const view = useMemo(
    () => (state ? adminSnapshot(state) : null),
    [state],
  );

  if (!state || !view) {
    return <p className="fb-copy">Loading this device’s week…</p>;
  }

  const startValue =
    sessionStart ||
    new Date(new Date(view.now).getTime() - 60_000).toISOString();
  const clockValue = clockInput || view.now;

  function pin(iso: string) {
    dispatch({ type: "debug-set-clock", now: iso });
  }

  function addPeer() {
    const group = view!.groups.find((item) => item.sport === peerSport);
    if (!group?.waveStart || !group.weekEnd) return;
    const elo = Number(peerElo);
    const id = `${slug(peerName)}-${state!.peerActivities.length + view!.peers.length + 1}`;
    const peer: PoolPlayer = {
      id,
      name: peerName.trim().slice(0, 32) || "Peer",
      elo: Number.isFinite(elo) ? elo : 1000,
      sport: peerSport,
      waveStart: group.waveStart,
      weekEnd: group.weekEnd,
    };
    dispatch({ type: "debug-set-peers", peers: [...view!.peers, peer] });
  }

  function removePeer(id: string) {
    dispatch({
      type: "debug-set-peers",
      peers: view!.peers.filter((peer) => peer.id !== id),
    });
  }

  function addSession() {
    const km = Number(sessionKm);
    const minutes = Number(sessionMin);
    const hr = sessionHr.trim() === "" ? null : Number(sessionHr);
    dispatch({
      type: "debug-add-session",
      sport: sessionSport,
      peerId: sessionWho === "you" ? undefined : sessionWho,
      startedAt: new Date(startValue).toISOString(),
      distanceM: Number.isFinite(km) ? Math.round(km * 1000) : 0,
      movingSec: Number.isFinite(minutes) ? Math.round(minutes * 60) : 0,
      avgHr: hr != null && Number.isFinite(hr) ? hr : null,
      verified: sessionVerified,
    });
  }

  return (
    <div className="fb-admin">
      <header>
        <p className="fb-kicker">This device</p>
        <h1>Week lab</h1>
        <p className="fb-copy">
          Groups, sessions, and the clock live in this browser. Joining here
          does not seat you with another person’s phone. Use it to log work,
          move time, and close Sunday the way the app does on a real Monday.
        </p>
        <p className="fb-copy">
          <Link href="/you">Back to Athlete</Link>
        </p>
      </header>

      <section className="fb-card">
        <h2>Clock</h2>
        <p className="fb-admin-clock">
          Scoring instant: {view.now} {view.pinned ? "(pinned)" : "(wall clock)"}
        </p>
        <p className="fb-copy">Wall clock: {view.wall}</p>
        <p className="fb-copy">
          Moving forward past a Sunday close settles every open sport, writes
          season history, and opens the next wave. Releasing the pin returns
          to the wall clock and does not undo Elo.
        </p>
        <div className="fb-admin-actions">
          {[1, 6, 24, 72].map((hours) => (
            <button
              key={hours}
              type="button"
              className="fb-btn-line"
              onClick={() => dispatch({ type: "debug-advance", hours })}
            >
              +{hours}h
            </button>
          ))}
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => dispatch({ type: "debug-clear-clock" })}
          >
            Release pin
          </button>
          <button
            type="button"
            className="fb-btn"
            onClick={() => dispatch({ type: "debug-close-week" })}
          >
            Close open weeks
          </button>
        </div>
        <form
          className="fb-admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const next = new Date(clockValue);
            if (!Number.isNaN(next.getTime())) pin(next.toISOString());
          }}
        >
          <label className="fb-field">
            Pin an exact UTC instant
            <input
              value={clockValue}
              onChange={(event) => setClockInput(event.target.value)}
            />
          </label>
          <button type="submit" className="fb-btn-line">
            Pin clock
          </button>
        </form>
      </section>

      <section className="fb-card">
        <h2>Groups</h2>
        <p className="fb-copy">
          Each sport is its own wave: it opens at the UTC midnight you join and
          closes the next Sunday 00:00 UTC. The table is the race so far. The
          Elo arrow is the Sunday projection, when synthetic rivals are scored
          at their full-week total. Restart leaves the open wave unscored and
          joins again at the pinned clock. Freeze holds Elo for
          the primary sport’s current wave ({view.freezesLeft} left). Filled
          seats are synthetics with a full-week estimate, clipped to how much
          of the wave has elapsed. At Sunday they are scored at that week total.
        </p>
        {view.groups.map((group) => (
          <article key={group.sport}>
            <h3>
              {sportName(group.sport)}
              {group.sport === view.primary ? " · primary" : ""}
            </h3>
            {group.waveStart ? (
              <p className="fb-copy">
                {group.waveStart} → {group.weekEnd} · {group.daysLeft} days left
                · {group.peerIds.length} peers + {group.syntheticIds.length}{" "}
                synthetics
                {group.frozen ? " · frozen" : ""} · place {group.youPlace ?? "—"}{" "}
                · open Elo {Math.round(group.openElo)} →{" "}
                {Math.round(group.projectedOpen)} · verified{" "}
                {Math.round(group.verifiedElo)} → {Math.round(group.projectedVerified)}
              </p>
            ) : (
              <p className="fb-copy">Not in a group.</p>
            )}
            <div className="fb-admin-actions">
              <button
                type="button"
                className="fb-btn-line"
                onClick={() =>
                  dispatch({ type: "set-primary", sport: group.sport })
                }
              >
                Make primary
              </button>
              {group.optedIn ? (
                <button
                  type="button"
                  className="fb-btn-line"
                  onClick={() => dispatch({ type: "opt-out", sport: group.sport })}
                >
                  Leave
                </button>
              ) : (
                <button
                  type="button"
                  className="fb-btn"
                  onClick={() => dispatch({ type: "opt-in", sport: group.sport })}
                >
                  Join
                </button>
              )}
              <button
                type="button"
                className="fb-btn-line"
                onClick={() =>
                  dispatch({ type: "debug-reseat", sport: group.sport })
                }
              >
                Reseat
              </button>
              <button
                type="button"
                className="fb-btn-line"
                onClick={() =>
                  dispatch({ type: "debug-restart-wave", sport: group.sport })
                }
              >
                Restart wave
              </button>
              {group.waveStart && group.weekEnd ? (
                <>
                  <button
                    type="button"
                    className="fb-btn-line"
                    onClick={() => pin(group.waveStart!)}
                  >
                    Jump to start
                  </button>
                  <button
                    type="button"
                    className="fb-btn-line"
                    onClick={() =>
                      pin(
                        new Date(
                          new Date(group.weekEnd!).getTime() - 60_000,
                        ).toISOString(),
                      )
                    }
                  >
                    Jump to last minute
                  </button>
                </>
              ) : null}
            </div>
            {group.rows.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Name</th>
                    <th>Kind</th>
                    <th>Effort</th>
                    <th>Volume</th>
                    <th>Elo</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.place}</td>
                      <td>{row.name}</td>
                      <td>{row.kind}</td>
                      <td>{formatEffort(row.effort)}</td>
                      <td>
                        {formatVolume(group.sport, row.distanceM, row.movingSec)}
                      </td>
                      <td>{Math.round(row.elo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </article>
        ))}
        {view.groups.some((group) => group.optedIn) ? (
          <button
            type="button"
            className="fb-btn-line"
            onClick={() => dispatch({ type: "freeze" })}
          >
            Freeze primary wave
          </button>
        ) : null}
      </section>

      <section className="fb-card">
        <h2>Simulated peers</h2>
        <p className="fb-copy">
          A peer is seated only when their sport matches an open group and their
          wave overlaps it. Adding or removing someone reseats every open sport
          and drops sessions for peers who leave the roster.
        </p>
        <form
          className="fb-admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            addPeer();
          }}
        >
          <label className="fb-field">
            Name
            <input
              value={peerName}
              onChange={(event) => setPeerName(event.target.value)}
            />
          </label>
          <label className="fb-field">
            Elo
            <input
              inputMode="numeric"
              value={peerElo}
              onChange={(event) => setPeerElo(event.target.value)}
            />
          </label>
          <label className="fb-field">
            Sport
            <select
              value={peerSport}
              onChange={(event) => setPeerSport(event.target.value as SportId)}
            >
              {SPORTS.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="fb-btn">
            Add and reseat
          </button>
        </form>
        {view.peers.length === 0 ? (
          <p className="fb-copy">No simulated peers on this device.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Sport</th>
                <th>Elo</th>
                <th>Wave</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {view.peers.map((peer) => (
                <tr key={peer.id}>
                  <td>{peer.name}</td>
                  <td>{sportName(peer.sport)}</td>
                  <td>{Math.round(peer.elo)}</td>
                  <td>
                    {peer.waveStart.slice(0, 10)} → {peer.weekEnd.slice(0, 10)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="fb-btn-line"
                      onClick={() => removePeer(peer.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="fb-card">
        <h2>Sessions</h2>
        <p className="fb-copy">
          Manual sessions count when they start inside the wave and before the
          scoring instant. Verified sessions score on both tracks. An
          unverified session scores on the open track only. Strength uses
          minutes; distance can stay 0.
        </p>
        <form
          className="fb-admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            addSession();
          }}
        >
          <label className="fb-field">
            Who
            <select
              value={sessionWho}
              onChange={(event) => setSessionWho(event.target.value)}
            >
              <option value="you">{view.name}</option>
              {view.peers.map((peer) => (
                <option key={peer.id} value={peer.id}>
                  {peer.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fb-field">
            Sport
            <select
              value={sessionSport}
              onChange={(event) =>
                setSessionSport(event.target.value as SportId)
              }
            >
              {SPORTS.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          <label className="fb-field">
            Start (UTC)
            <input
              value={startValue}
              onChange={(event) => setSessionStart(event.target.value)}
            />
          </label>
          <label className="fb-field">
            Distance (km)
            <input
              inputMode="decimal"
              value={sessionKm}
              onChange={(event) => setSessionKm(event.target.value)}
            />
          </label>
          <label className="fb-field">
            Minutes
            <input
              inputMode="decimal"
              value={sessionMin}
              onChange={(event) => setSessionMin(event.target.value)}
            />
          </label>
          <label className="fb-field">
            Heart rate
            <input
              inputMode="numeric"
              value={sessionHr}
              onChange={(event) => setSessionHr(event.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="fb-field">
            Verified
            <input
              type="checkbox"
              checked={sessionVerified}
              onChange={(event) => setSessionVerified(event.target.checked)}
            />
          </label>
          <button type="submit" className="fb-btn">
            Add session
          </button>
        </form>
        <table>
          <thead>
            <tr>
              <th>Who</th>
              <th>Sport</th>
              <th>Start</th>
              <th>Volume</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {view.activities.map((activity) => (
              <tr key={activity.id}>
                <td>{view.name}</td>
                <td>{sportName(activity.sport)}</td>
                <td>{activity.startedAt}</td>
                <td>
                  {formatVolume(
                    activity.sport,
                    activity.distanceM,
                    activity.movingSec,
                  )}
                  {activity.source === "manual" ? "" : ` · ${activity.source}`}
                  {activity.verified ? "" : " · unverified"}
                </td>
                <td>
                  {activity.source === "manual" ? (
                    <button
                      type="button"
                      className="fb-btn-line"
                      onClick={() =>
                        dispatch({
                          type: "debug-remove-session",
                          activityId: activity.id,
                        })
                      }
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {view.peerActivities.map((row) => (
              <tr key={row.activity.id}>
                <td>
                  {view.peers.find((peer) => peer.id === row.peerId)?.name ??
                    row.peerId}
                </td>
                <td>{sportName(row.activity.sport)}</td>
                <td>{row.activity.startedAt}</td>
                <td>
                  {formatVolume(
                    row.activity.sport,
                    row.activity.distanceM,
                    row.activity.movingSec,
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="fb-btn-line"
                    onClick={() =>
                      dispatch({
                        type: "debug-remove-session",
                        activityId: row.activity.id,
                      })
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="fb-card">
        <h2>Reconciled weeks</h2>
        {view.results.length === 0 ? (
          <p className="fb-copy">
            Nothing has closed on this device yet. Join, log a session, then
            close the open weeks.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Wave</th>
                <th>Sport</th>
                <th>Track</th>
                <th>Place</th>
                <th>Elo</th>
              </tr>
            </thead>
            <tbody>
              {view.results.map((result) => (
                <tr key={result.id}>
                  <td>{result.periodStart.slice(0, 10)}</td>
                  <td>{sportName(result.sport)}</td>
                  <td>
                    {result.track}
                    {result.frozen ? " · frozen" : ""}
                  </td>
                  <td>
                    {result.place} / {result.fieldSize}
                  </td>
                  <td>
                    {Math.round(result.eloBefore)} → {Math.round(result.eloAfter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
