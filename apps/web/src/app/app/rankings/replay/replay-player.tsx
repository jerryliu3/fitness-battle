"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {SHELL_COLORS,RACE_CATEGORIES,RACE_DISTANCES,compileReplayRunner,loadReplayField,raceClock,raceSourceUrl,replayFeatures,replayTimeline,validateReplayCourse,type ReplayData,type ReplayPage} from "@fitness-battle/shared";
import {webEnv} from "@/lib/env";
import {addMapboxAttribution,mapboxAttributionOptions} from "@/components/maps/mapbox-attribution";
import {useRaceFavorites} from "../favorites";

export function ReplayPlayer({scope,initialIds}:{scope:{edition:string;distance:string;sex:string;clock:string};initialIds:string}) {
  const saved=useRaceFavorites(),[ids,setIds]=useState<string|null>(initialIds),[attempt,setAttempt]=useState(0);
  const [data,setData]=useState<ReplayData|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState("");
  const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(128),[wall,setWall]=useState(false),[reduced,setReduced]=useState(true),[mapError,setMapError]=useState("");
  const abort=useRef<AbortController|null>(null),container=useRef<HTMLDivElement>(null),map=useRef<mapboxgl.Map|null>(null);
  const [mapAttempt,setMapAttempt]=useState(0),[ready,setReady]=useState(false),[focused,setFocused]=useState<number|null>(null);
  const [category,setCategory]=useState(scope.sex),[clock,setClock]=useState(scope.clock);
  const scopeKey=new URLSearchParams({...scope,sex:category,clock}).toString(),distance=RACE_DISTANCES.find(d=>d.slug===scope.distance)!.stored;
  useEffect(()=>{const controller=new AbortController();abort.current=controller;setBusy(true);setData(null);setError("");setProgress(0);setTime(0);setPlaying(false);setWall(false);
    void loadReplayField(async after=>{const params=new URLSearchParams(scopeKey);params.set("after",String(after));if(ids!==null) params.set("ids",ids);
      const response=await fetch(`/api/rankings/replay?${params}`,{signal:controller.signal});if(!response.ok) throw new Error(response.status===404 ? "Reviewed course and timing profiles are not available for this field." : "Replay could not load.");return response.json() as Promise<ReplayPage>;
    },()=>controller.signal.aborted,setProgress).then(value=>{if(!controller.signal.aborted){if(!validateReplayCourse(value.course,distance)) throw new Error("Course alignment needs review.");setData(value);}})
      .catch(e=>{if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Replay unavailable.");}).finally(()=>{if(!controller.signal.aborted) setBusy(false);});
    return ()=>controller.abort();
  },[scopeKey,ids,attempt,distance]);
  const runners=useMemo(()=>data?.runners.flatMap(r=>{const compiled=compileReplayRunner(r,distance);return compiled ? [compiled] : [];}) ?? [],[data,distance]);
  const timeline=useMemo(()=>replayTimeline(runners,wall),[runners,wall]);
  const features=useMemo(()=>data ? replayFeatures(data.course,runners,time,timeline.origin) : null,[data,runners,time,timeline.origin]);
  const latest=useRef(features);latest.current=features;
  useEffect(()=>{const preference=window.matchMedia("(prefers-reduced-motion: reduce)");const changed=()=>{setReduced(preference.matches);if(preference.matches) setPlaying(false);};changed();preference.addEventListener("change",changed);return ()=>preference.removeEventListener("change",changed);},[]);
  useEffect(()=>{const hidden=()=>{if(document.hidden) setPlaying(false);};document.addEventListener("visibilitychange",hidden);return ()=>document.removeEventListener("visibilitychange",hidden);},[]);
  useEffect(()=>{if(!playing || reduced) return;let previous=performance.now();const timer=window.setInterval(()=>{const now=performance.now(),delta=Math.min(now-previous,1000)*speed;previous=now;setTime(value=>Math.min(timeline.duration,value+delta));},runners.length>1000 ? 500 : 200);return ()=>clearInterval(timer);},[playing,reduced,speed,timeline.duration,runners.length]);
  useEffect(()=>{if(time>=timeline.duration) setPlaying(false);},[time,timeline.duration]);
  useEffect(()=>{
    if(!data || !container.current || !webEnv.mapboxAccessToken) return;setReady(false);setMapError("");let instance:mapboxgl.Map;
    try {instance=new mapboxgl.Map({container:container.current,accessToken:webEnv.mapboxAccessToken,style:"mapbox://styles/mapbox/standard",center:data.course.points[0].slice(0,2) as [number,number],zoom:11,...mapboxAttributionOptions});}
    catch {setMapError("This browser could not start the map.");return;}
    map.current=instance;addMapboxAttribution(instance);
    instance.on("error",()=>{setMapError("Some map data could not load. Check your connection and Mapbox access.");setPlaying(false);});
    instance.on("load",()=>{instance.addSource("course",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:data.course.points.map(p=>p.slice(0,2))}}});
      instance.addLayer({id:"course",type:"line",source:"course",paint:{"line-color":SHELL_COLORS.muted,"line-width":4}});
      instance.addSource("runners",{type:"geojson",data:latest.current ?? {type:"FeatureCollection",features:[]}});
      instance.addLayer({id:"runners",type:"circle",source:"runners",paint:{"circle-radius":5,"circle-color":SHELL_COLORS.tennis,"circle-stroke-width":1,"circle-stroke-color":SHELL_COLORS.ink}});
      const bounds=new mapboxgl.LngLatBounds();for(const point of data.course.points) bounds.extend([point[0],point[1]]);instance.fitBounds(bounds,{padding:40,duration:0});setReady(true);
    });
    instance.on("click","runners",event=>{const id=Number(event.features?.[0]?.properties?.id);if(Number.isSafeInteger(id)) setFocused(id);});
    const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting) setPlaying(false);});observer.observe(container.current);
    return ()=>{observer.disconnect();instance.remove();map.current=null;};
  },[data,mapAttempt]);
  useEffect(()=>{if(ready && features) (map.current?.getSource("runners") as mapboxgl.GeoJSONSource | undefined)?.setData(features);},[ready,features]);
  useEffect(()=>{if(ready) map.current?.setPaintProperty("runners","circle-color",["case",["==",["get","id"],focused ?? -1],SHELL_COLORS.tennis,SHELL_COLORS.muted]);},[ready,focused]);
  const focusedRunner=useMemo(()=>runners.find(r=>r.id===focused),[runners,focused]),source=data ? raceSourceUrl(data.course.sourceUrl) : null;
  return <div className="race-replay-player"><p className="rankings-note">Estimated positions between recorded checkpoints, along a reviewed edition course. These are not runner GPS tracks or exact overtakes. Missing timing intervals are hidden.</p>
    <p className="rankings-note">Only saved results from this edition, category and clock can appear.</p><div className="race-replay-actions"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{RACE_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label><label>Timing<select value={clock} onChange={e=>setClock(e.target.value)}><option value="chip">Chip</option><option value="gun">Official</option></select></label><button disabled={busy} onClick={()=>setIds(null)}>Load entire timing field</button><button disabled={busy || !saved.ready || !saved.ids.length} onClick={()=>setIds(saved.ids.join(","))}>Follow saved runners</button>{initialIds && <button disabled={busy} onClick={()=>setIds(initialIds)}>Selected runners</button>}</div>
    {busy && <p role="status">Loading {progress.toLocaleString()} timing profiles… <button onClick={()=>{abort.current?.abort();setBusy(false);setError("Replay loading cancelled.");}}>Cancel</button></p>}
    {error && <p role="alert">{error} <button onClick={()=>setAttempt(n=>n+1)}>Retry</button></p>}
    {data && <><p className="rankings-note">{runners.length.toLocaleString()} loaded profiles · {data.totalAvailable.toLocaleString()} available in this category and clock. {data.runners.length-runners.length>0 ? `${data.runners.length-runners.length} profiles need reconciliation.` : ""} {features?.features.length.toLocaleString()} positions available at this time.</p>
      {!webEnv.mapboxAccessToken ? <p role="alert">Map access is not configured.</p> : <div ref={container} className="race-replay-map" aria-label="Estimated race positions" />}{mapError && <p role="alert">{mapError} <button onClick={()=>setMapAttempt(n=>n+1)}>Retry map</button></p>}
      <div className="race-replay-controls"><button disabled={reduced || !runners.length} onClick={()=>{if(time>=timeline.duration) setTime(0);setPlaying(v=>!v);}}>{playing ? "Pause" : "Play"}</button><strong>{timeline.origin!==null ? new Date(timeline.origin+time).toLocaleString() : raceClock(time)}</strong><label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[16,64,128,512].map(value=><option key={value} value={value}>{value}×</option>)}</select></label><label>Clock<select value={wall ? "wall" : "elapsed"} onChange={e=>{setWall(e.target.value==="wall");setTime(0);setPlaying(false);}}><option value="elapsed">{clock==="chip" ? "Chip elapsed comparison" : "Official elapsed comparison"}</option><option value="wall" disabled={!timeline.wallAvailable}>Race-day time</option></select></label></div>
      <label className="race-replay-seek">Replay time<input type="range" min={0} max={Math.max(timeline.duration,1)} step={1000} value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}} /></label>
      {reduced && <p className="rankings-note">Reduced Motion is on. Use the timeline to inspect positions.</p>}{!timeline.wallAvailable && <p className="rankings-note">Race-day time needs chip timing and an actual start timestamp for every loaded runner.</p>}
      {focusedRunner && <p>{focusedRunner.name}</p>}{runners.length<=100 && <p className="rankings-note">{runners.map(r=><button key={r.id} onClick={()=>setFocused(r.id)} aria-pressed={focused===r.id}>{r.name}</button>)}</p>}
      <p className="rankings-source">{data.course.attribution}{source && <> · <a href={source} target="_blank" rel="noreferrer">Course source ↗</a></>}</p>
    </>}
  </div>;
}
