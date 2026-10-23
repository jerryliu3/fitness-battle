"use client";

import {
  APP_TIMEZONE,
  competitionTrack,
  formatEloDelta,
  sportById,
  type PeriodResult,
  type SportId,
  type UnitSystem,
} from "@fitness-battle/shared";
import { ResultCard } from "./result-card";
import { useMemo, useState } from "react";

function weekLabel(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: APP_TIMEZONE,
  });
  const end = new Date(new Date(periodEnd).getTime() - 1).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      timeZone: APP_TIMEZONE,
    },
  );
  return `${start} – ${end}`;
}

export function SeasonHistory({
  results,
  primary,
  units = "us",
}: {
  results: PeriodResult[];
  primary: SportId;
  units?: UnitSystem;
}) {
  const [sportFilter, setSportFilter] = useState<SportId | "all">(primary);


  const sports = useMemo(() => {
    const ids = [...new Set(results.map((row) => row.sport))];
    return ids.sort();
  }, [results]);

  const rows = useMemo(() => {
    return results.filter((row) => {
      if (sportFilter !== "all" && row.sport !== sportFilter) return false;
      if (row.track !== competitionTrack(row.sport)) return false;
      return true;
    }).sort((a,b)=>b.periodStart.localeCompare(a.periodStart));
  }, [results, sportFilter]);

  if (results.length === 0) {
    return (
      <section className="sp-history" id="season-history">
        <div className="fd-roster-head">
          <h3>Past weeks</h3>
        </div>
        <div className="sp-empty">
          <h2>No closed weeks yet</h2>
          <p className="fb-copy">
            When a competition week ends, your place and effort score change land here — your weekly result.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="sp-history" id="season-history">
      <div className="fd-roster-head">
        <h3>Past weeks</h3>
        <span>{new Set(rows.map(row=>row.periodStart)).size} weeks</span>
      </div>

      <div className="fb-chips">
        <button
          type="button"
          className={sportFilter === "all" ? "fb-chip on" : "fb-chip"}
          onClick={() => setSportFilter("all")}
        >
          All sports
        </button>
        {sports.map((sport) => (
          <button
            key={sport}
            type="button"
            className={sportFilter === sport ? "fb-chip on" : "fb-chip"}
            onClick={() => setSportFilter(sport)}
          >
            {sportById(sport).name}
          </button>
        ))}
      </div>
      <div className="weekly-chapters">
        {!rows.length?<p className="fb-note">No closed weeks match this selection.</p>:null}
        {rows.map((row,index)=>{
          const month=new Date(Date.parse(row.periodEnd)-1).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:APP_TIMEZONE});
          const previous=rows[index-1];
          const previousMonth=previous?new Date(Date.parse(previous.periodEnd)-1).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:APP_TIMEZONE}):null;
          return <div key={row.id}>{month!==previousMonth?<h4 className="fb-kicker chapter-month">{month}</h4>:null}<details className="weekly-chapter"><summary><span className={`chapter-place${row.place===1?" is-first":""}`}>#{row.place}</span><span className="chapter-label"><b>{weekLabel(row.periodStart,row.periodEnd)}</b><small>{sportById(row.sport).name} · {row.track==="verified"?"GPS":"Open"} · {row.place} of {row.fieldSize}{row.frozen?" · frozen":""}</small></span><span className="chapter-delta">{formatEloDelta(row.eloBefore,row.eloAfter)}<small>score</small></span></summary><ResultCard result={row} units={units}/></details></div>;
        })}
      </div>
    </section>
  );
}
