"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {APP_ICON_PATHS,APP_ICON_VIEW_BOX,getAppColors,RACE_CATEGORIES,RACE_DISTANCES,compileReplayRunner,loadReplayField,raceClock,raceSourceUrl,replayCourseBearing,replayFeatures,replayFrameInterval,replayOvertakes,replayTelemetry,replayTimeline,validateReplayCourse,type ReplayData,type ReplayPage} from "@fitness-battle/shared";
import {webEnv} from "@/lib/env";
import {addMapboxAttribution,mapboxAttributionOptions} from "@/components/maps/mapbox-attribution";
import {useAppearance,useAppearanceMode} from "@/theme/appearance-provider";
import {AppHeading} from "@/ui/section";
import {useRaceFavorites} from "../favorites";

function MapIcon({name}:{name:keyof typeof APP_ICON_PATHS}) {
  return <svg width="21" height="21" viewBox={APP_ICON_VIEW_BOX[name] ?? "0 0 24 24"} aria-hidden="true"><path d={APP_ICON_PATHS[name]} fill="currentColor" fillRule="evenodd" /></svg>;
}

export function ReplayPlayer({scope,initialIds}:{scope:{edition:string;distance:string;sex:string;clock:string};initialIds:string}) {
  const {setPreference}=useAppearance();
  const mode=useAppearanceMode();
  const nextMode=mode==="dark" ? "light" : "dark";
  const colors=useMemo(()=>getAppColors(mode),[mode]);
  const saved=useRaceFavorites(),[ids,setIds]=useState<string|null>(initialIds),[attempt,setAttempt]=useState(0);
  const [data,setData]=useState<ReplayData|null>(null),[busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[error,setError]=useState("");
  const [time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(64),[wall,setWall]=useState(false),[reduced,setReduced]=useState(true),[mapError,setMapError]=useState("");
  const abort=useRef<AbortController|null>(null),container=useRef<HTMLDivElement>(null),map=useRef<mapboxgl.Map|null>(null);
  const [mapAttempt,setMapAttempt]=useState(0),[ready,setReady]=useState(false),[focused,setFocused]=useState<number|null>(null);
  const [following,setFollowing]=useState(false);
  const [tilted,setTilted]=useState(false);
  const [profileId,setProfileId]=useState<number|null>(null);
  const latestCameraTarget=useRef<{center:[number,number];bearing:number}|undefined>(undefined);
  const popup=useRef<mapboxgl.Popup|null>(null);
  const [popupContent,setPopupContent]=useState<HTMLDivElement|null>(null);
  const cameraRunnerId=useRef<number|null>(null);
  const [immersive,setImmersive]=useState(false),[picker,setPicker]=useState(!initialIds),[search,setSearch]=useState("");
  const trackSaved=useRef(false);
  const [tracked,setTracked]=useState(() => initialIds.split(",").filter(Boolean).map(Number).slice(0,4));
  const [category,setCategory]=useState(scope.sex),[clock,setClock]=useState(scope.clock);
  const scopeKey=new URLSearchParams({...scope,sex:category,clock}).toString(),distance=RACE_DISTANCES.find(d=>d.slug===scope.distance)!.stored;
  useEffect(()=>{setData(null);setTime(0);setWall(false);setFocused(null);setFollowing(false);setProfileId(null);},[scopeKey]);
  useEffect(()=>{const controller=new AbortController();abort.current=controller;setBusy(true);setError("");setProgress(0);setPlaying(false);
    void loadReplayField(async after=>{const params=new URLSearchParams(scopeKey);params.set("after",String(after));if(ids) params.set("ids",ids);
      const response=await fetch(`/api/rankings/replay?${params}`,{signal:controller.signal});if(!response.ok) throw new Error(response.status===404 ? "Reviewed course and timing profiles are not available for this field." : "Replay could not load.");const page=await response.json() as ReplayPage;
      return ids==="" ? {...page,next:null} : page;
    },()=>controller.signal.aborted,setProgress).then(value=>{if(!controller.signal.aborted){if(!validateReplayCourse(value.course,distance)) throw new Error("Course alignment needs review.");setData(previous=>previous?.version===value.version ? {...value,course:previous.course} : value);
      const available=new Set(value.runners.map(runner=>runner.id));
      if(trackSaved.current) {
        trackSaved.current=false;
        setTracked((ids ?? "").split(",").map(Number).filter(id=>available.has(id)).slice(0,4));
      } else {
        setTracked(current=>current.filter(id=>available.has(id)));
      }}})
      .catch(e=>{if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "Replay unavailable.");}).finally(()=>{if(!controller.signal.aborted) setBusy(false);});
    return ()=>controller.abort();
  },[scopeKey,ids,attempt,distance]);
  const runners=useMemo(()=>data?.runners.flatMap(r=>{const compiled=compileReplayRunner(r,distance);return compiled ? [compiled] : [];}) ?? [],[data,distance]);
  const timeline=useMemo(()=>replayTimeline(runners,wall),[runners,wall]);
  const course=data?.course;
  const bounds=useMemo(()=>{
    if(!course) return null;
    const result=new mapboxgl.LngLatBounds();
    for(const [lng,lat] of course.points) result.extend([lng,lat]);
    return result;
  },[course]);
  const features=useMemo(()=>data ? replayFeatures(data.course,runners,time,timeline.origin) : null,[data,runners,time,timeline.origin]);
  const latest=useRef(features);latest.current=features;
  useEffect(()=>{const preference=window.matchMedia("(prefers-reduced-motion: reduce)");const changed=()=>{setReduced(preference.matches);if(preference.matches) setPlaying(false);};changed();preference.addEventListener("change",changed);return ()=>preference.removeEventListener("change",changed);},[]);
  useEffect(()=>{const hidden=()=>{if(document.hidden) setPlaying(false);};document.addEventListener("visibilitychange",hidden);return ()=>document.removeEventListener("visibilitychange",hidden);},[]);
  useEffect(()=>{
    if(!playing || reduced) return;
    let previous=performance.now(), lastPaint=previous, elapsed=0, frame=0;
    const interval=replayFrameInterval(runners.length);
    function advance(now:number) {
      elapsed+=Math.max(0,Math.min(now-previous,250))*speed;
      previous=now;
      if(now-lastPaint>=interval) {
        const delta=elapsed;
        setTime(value=>Math.min(timeline.duration,value+delta));
        elapsed=0;lastPaint=now;
      }
      frame=requestAnimationFrame(advance);
    }
    frame=requestAnimationFrame(advance);
    return ()=>cancelAnimationFrame(frame);
  },[playing,reduced,speed,timeline.duration,runners.length]);
  useEffect(()=>{
    if(!immersive) return;
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    function exit(event:KeyboardEvent){if(event.key==="Escape") setImmersive(false);}
    window.addEventListener("keydown",exit);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",exit);};
  },[immersive]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>map.current?.resize());
    return ()=>cancelAnimationFrame(frame);
  },[immersive,picker]);
  useEffect(()=>{
    if(time>=timeline.duration) setPlaying(false);
    if(data && time>timeline.duration) setTime(timeline.duration);
  },[data,time,timeline.duration]);
  useEffect(()=>{
    if(!course || !container.current || !webEnv.mapboxAccessToken) return;setReady(false);setMapError("");let instance:mapboxgl.Map;
    try {instance=new mapboxgl.Map({container:container.current,accessToken:webEnv.mapboxAccessToken,style:"mapbox://styles/mapbox/standard",center:course.points[0].slice(0,2) as [number,number],zoom:11,...mapboxAttributionOptions});}
    catch {setMapError("This browser could not start the map.");return;}
    map.current=instance;addMapboxAttribution(instance);
    instance.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");

    instance.on("dragstart",event=>{
      if(instance.isZooming() || ("originalEvent" in event && typeof TouchEvent !== "undefined" &&
        event.originalEvent instanceof TouchEvent && event.originalEvent.touches.length>1)) return;
      latestCameraTarget.current=undefined;
      setFollowing(false);
    });
    instance.on("zoomend",()=>{if(latestCameraTarget.current) instance.jumpTo(latestCameraTarget.current);});
    instance.on("error",()=>{setMapError("Some map data could not load. Check your connection and Mapbox access.");setPlaying(false);});
    instance.on("load",()=>{instance.addSource("course",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:course.points.map(p=>p.slice(0,2))}}});
      instance.addLayer({id:"course-outline",type:"line",source:"course",slot:"top",paint:{"line-color":colors.white,"line-width":6,"line-emissive-strength":1}});
      instance.addLayer({id:"course",type:"line",source:"course",slot:"top",paint:{"line-color":colors.textOnAction,"line-width":3,"line-emissive-strength":1}});
      instance.addSource("runners",{type:"geojson",data:latest.current ?? {type:"FeatureCollection",features:[]}});
      instance.addLayer({id:"runners",type:"circle",source:"runners",slot:"top",paint:{"circle-radius":4,"circle-emissive-strength":1,"circle-color":"#fff","circle-stroke-width":2,"circle-stroke-color":colors.ink}});
      if(bounds) instance.fitBounds(bounds,{padding:40,duration:0});
      setReady(true);
    });
    instance.on("click",event=>{
      if(!instance.getLayer("runners")) return;
      const id=instance.queryRenderedFeatures([
        [event.point.x-12,event.point.y-12],[event.point.x+12,event.point.y+12],
      ],{layers:["runners"]})[0]?.id;
      if(typeof id === "number") {setFocused(id);setProfileId(id);}
      else setProfileId(null);
    });
    const observer=new IntersectionObserver(entries=>{if(!entries[0]?.isIntersecting) setPlaying(false);});observer.observe(container.current);
    return ()=>{observer.disconnect();instance.remove();map.current=null;};
  },[bounds,course,mapAttempt]);
  useEffect(()=>{if(ready && features) (map.current?.getSource("runners") as mapboxgl.GeoJSONSource | undefined)?.setData(features);},[ready,features]);
  useEffect(()=>{
    if(!ready) return;
    const instance=map.current;
    instance?.setConfigProperty("basemap","lightPreset",mode==="dark" ? "night" : "day");
    instance?.setPaintProperty("course","line-color",mode==="dark" ? colors.tennis : colors.textOnAction);
    instance?.setPaintProperty("course-outline","line-color",mode==="dark" ? colors.textOnAction : colors.white);
  },[colors,mode,ready]);
  useEffect(()=>{
    if(ready) map.current?.setPitch(tilted ? 55 : 0);
  },[ready,tilted]);
  const accentColors=[colors.tennis,"#4ed1fc","#fc8d66","#dba9ff"];
  useEffect(()=>{
    if(!ready) return;
    const palette=[colors.tennis,"#4ed1fc","#fc8d66","#dba9ff"];
    const markerColor:mapboxgl.ExpressionSpecification=["match",["get","id"],
      ...tracked.flatMap((id,index)=>[id,palette[index]]),colors.muted] as mapboxgl.ExpressionSpecification;
    map.current?.setPaintProperty("runners","circle-color","#fff");
    map.current?.setPaintProperty("runners","circle-stroke-color",tracked.length ? markerColor : colors.muted);
    map.current?.setPaintProperty("runners","circle-stroke-width",["case",["==",["get","id"],focused ?? -1],3,2]);
    map.current?.setPaintProperty("runners","circle-radius",["case",["==",["get","id"],focused ?? -1],6,4]);
  },[ready,focused,tracked,colors]);
  const source=data ? raceSourceUrl(data.course.sourceUrl) : null;
  const visibleRunners=useMemo(()=>runners.filter(r=>r.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0,100),[runners,search]);
  const trackedRunners=useMemo(()=>tracked.flatMap(id=>runners.find(r=>r.id===id) ?? []),[runners,tracked]);
  const activeRunner=runners.find(runner=>runner.id===focused) ?? trackedRunners[0] ?? null;
  const overtakes=useMemo(()=>activeRunner ? replayOvertakes(activeRunner,runners,timeline.origin) : [],[activeRunner,runners,timeline.origin]);
  const passedCount=useMemo(()=>overtakes.filter(event=>event.timeMs<=time).length,[overtakes,time]);
  const nextPass=overtakes.find(event=>event.timeMs>time);
  const recentPasses=useMemo(()=>{
    const first=overtakes.findIndex(event=>event.timeMs>=time-1000);
    return overtakes.slice(Math.max(0,first<0 ? overtakes.length-5 : first-2),Math.max(0,first<0 ? overtakes.length-5 : first-2)+5);
  },[overtakes,time]);
  const jumpToPass=(moment:number)=>{setPlaying(false);setTime(Math.max(0,Math.min(timeline.duration,moment)));};
  const cameraRunner=runners.find(runner=>runner.id===focused) ?? trackedRunners[0] ?? runners[0];
  const cameraFeature=following && cameraRunner ? features?.features.find(feature=>feature.id===cameraRunner.id) : undefined;
  const cameraTarget=course && cameraFeature ? {
    center:cameraFeature.geometry.coordinates,bearing:replayCourseBearing(course,cameraFeature.properties.distanceM),
  } : undefined;
  useEffect(()=>{
    latestCameraTarget.current=cameraTarget;
    const instance=map.current;
    if(!ready || !instance || !following || !cameraRunner) { cameraRunnerId.current=null; return; }
    if(!cameraTarget || instance.isZooming()) return;
    if(cameraRunnerId.current!==cameraRunner.id) {
      instance.jumpTo({...cameraTarget,zoom:Math.max(14,instance.getZoom())});
      cameraRunnerId.current=cameraRunner.id;
    } else {
      instance.jumpTo(cameraTarget);
    }
  },[cameraRunner,cameraTarget,following,ready]);
  function deselectRunner(id:number) {
    setTracked(current=>current.filter(value=>value!==id));
    if(focused===id) setFocused(null);
    if(profileId===id) setProfileId(null);
    if(cameraRunner?.id===id) setFollowing(false);
  }
  const profileRunner=runners.find(runner=>runner.id===profileId);
  const profileMetrics=profileRunner ? replayTelemetry(profileRunner,time,timeline.origin) : null;
  const profileCoordinate=features?.features.find(feature=>feature.id===profileId)?.geometry.coordinates;
  useEffect(()=>{
    if(!ready || profileId===null || !map.current) return;
    const element=document.createElement("div");
    const next=new mapboxgl.Popup({closeButton:false,closeOnClick:false,closeOnMove:false,focusAfterOpen:false,offset:12,className:"replay-runner-popup"})
      .setDOMContent(element);
    popup.current=next;
    setPopupContent(element);
    return ()=>{next.remove();popup.current=null;setPopupContent(null);};
  },[ready,profileId,course]);
  useEffect(()=>{
    const current=popup.current,instance=map.current;
    if(!current || !instance) return;
    if(!profileCoordinate) { current.remove(); return; }
    current.setLngLat(profileCoordinate);
    if(!current.isOpen()) current.addTo(instance);
  },[popupContent,profileCoordinate]);
  function toggleTrack(id:number) {
    setTracked(current=>current.includes(id) ? current.filter(value=>value!==id) : current.length<4 ? [...current,id] : current);
    setFocused(id);
  }
  function loadField() {
    setPicker(true);
    if(data && data.runners.length>=data.totalAvailable) return;
    trackSaved.current=false;
    setIds(null);
  }
  return <div className={`race-replay-player${immersive ? " race-replay-immersive" : ""}`}>
    <header className="replay-toolbar">
      <AppHeading level={1} role="display">{data?.course.attribution.replace(/ Course(?: \(.*\))?$/, "") || "Race replay"}</AppHeading>
      <div className="replay-header-tools">
          <button aria-label="Runners" title="Runners" aria-expanded={picker} onClick={()=>setPicker(value=>!value)}><MapIcon name="crew" /><span>Runners</span></button>
          <button type="button" onClick={()=>setPreference(nextMode)}>{nextMode==="dark" ? "Dark mode" : "Light mode"}</button>
          <button aria-label={immersive ? "Exit full screen" : "Full screen"} title={immersive ? "Exit full screen" : "Full screen"} onClick={()=>setImmersive(value=>!value)}><MapIcon name="expand" /><span>{immersive ? "Exit full screen" : "Full screen"}</span></button>
      </div>
    </header>
    <div className="replay-workspace" data-picker={picker || undefined}>
      {picker && <aside className="replay-runner-panel" aria-label="Replay runners">
        <AppHeading level={2}>Runners</AppHeading>
        <div className="replay-runner-filters">
          <label>Category<select value={category} onChange={e=>{setCategory(e.target.value);trackSaved.current=false;setIds("");setTracked([]);}}><option value="all">All categories</option>{RACE_CATEGORIES.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <label>Timing<select value={clock} onChange={e=>{setClock(e.target.value);trackSaved.current=false;setIds("");setTracked([]);}}><option value="chip">Chip</option><option value="gun">Official</option></select></label>
        </div>
        <div className="replay-roster-actions">
          {(!data || data.runners.length<data.totalAvailable) && <button disabled={busy} onClick={loadField}>Load timed field</button>}
          {!!saved.ids.length && <button disabled={busy || !saved.ready} onClick={()=>{const selection=saved.ids.join(",");
          if(ids===selection && data) {
            const available=new Set(data.runners.map(runner=>runner.id));
            setTracked(saved.ids.filter(id=>available.has(id)).slice(0,4));
          } else {
            trackSaved.current=true;
            setIds(selection);
          }}}>Load saved in this race</button>}
        </div>
        <label>Find a loaded runner<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name" /></label>
        <p className="rankings-note">Track up to four runners. {runners.length.toLocaleString()} loaded{data ? ` of ${data.totalAvailable.toLocaleString()}` : ""}.</p>
        <div className="replay-roster">
          {visibleRunners.map(r=><label key={r.id}><input type="checkbox" checked={tracked.includes(r.id)} disabled={!tracked.includes(r.id) && tracked.length>=4} onChange={()=>toggleTrack(r.id)} /><span>{r.name}</span><small>{raceClock(r.splits.finishMs)}</small></label>)}
          {!visibleRunners.length && <p className="rankings-note">{search ? "No loaded runners match." : "Load the timed field to browse runners."}</p>}
          {visibleRunners.length===100 && <p className="rankings-note">Search by name to narrow the list.</p>}
        </div>
      </aside>}
      <div className="replay-stage">
        {data && webEnv.mapboxAccessToken ? <div ref={container} className="race-replay-map" aria-label="Estimated race positions" /> :
          <div className="race-replay-map replay-map-placeholder" role="status">{busy ? "Loading course…" : data ? "Map access is not configured." : "Course unavailable"}</div>}
        {mapError && <p role="alert">{mapError} <button onClick={()=>setMapAttempt(n=>n+1)}>Retry map</button></p>}
        {busy && <p role="status">Loading {progress.toLocaleString()} timing profiles… <button onClick={()=>{abort.current?.abort();setBusy(false);setError("Replay loading cancelled.");}}>Cancel</button></p>}
        {error && <p role="alert">{error} <button onClick={()=>setAttempt(n=>n+1)}>Retry</button></p>}
        <div className="replay-map-tools" role="group" aria-label="Map controls">
          <button aria-label="Fit course" title="Fit course" disabled={!ready || !bounds} onClick={()=>{latestCameraTarget.current=undefined;setFollowing(false);if(bounds) map.current?.fitBounds(bounds,{padding:40,duration:0});}}><MapIcon name="distance" /></button>
          <button aria-label="Follow runner" title={cameraRunner ? `Follow ${cameraRunner.name}` : "Follow runner"} disabled={!ready || !cameraRunner} aria-pressed={following}
            onClick={()=>setFollowing(value=>!value)}><MapIcon name={following ? "navigationArrowFill" : "navigationArrow"} /></button>
          <button aria-label="3D map" title="3D map" disabled={!ready} aria-pressed={tilted} onClick={()=>setTilted(value=>!value)}>3D</button>
        </div>
        {profileRunner && popupContent && createPortal(<section className="replay-map-profile" aria-label="Selected runner">
          <div><strong>{profileRunner.name}</strong><button type="button" aria-label={`Deselect ${profileRunner.name}`} onClick={()=>deselectRunner(profileRunner.id)}>×</button></div>
          <span>{profileMetrics ? `${raceClock(profileMetrics.elapsedMs)} elapsed · ${(profileMetrics.distanceM/1000).toFixed(2)} km` : "Position unavailable"}</span>
        </section>,popupContent)}
        <div className="replay-map-dock">
        {activeRunner && <section className="replay-overtake-studio" aria-label="Estimated overtake moments">
          <div className="replay-overtake-head">
            <div><span className="replay-eyebrow">RACE MOMENTS · {activeRunner.name}</span><strong><span className="replay-overtake-number">{passedCount.toLocaleString()}</span> estimated overtakes</strong><small>Through {raceClock(time)} · {overtakes.length.toLocaleString()} across this loaded field</small></div>
            {nextPass && <button type="button" className="replay-next-moment" onClick={()=>jumpToPass(nextPass.timeMs)}>Next pass <span>{raceClock(nextPass.timeMs)} →</span></button>}
          </div>
          <div className="replay-moments" aria-label="Nearby estimated passing moments">
            {recentPasses.map((event,index)=><button type="button" key={`${event.otherId}-${index}-${event.timeMs}`} onClick={()=>jumpToPass(event.timeMs)} className={event.timeMs<=time ? "replay-moment-past" : ""}>
              <span>↗ {event.otherName}</span><strong>{raceClock(event.timeMs)}</strong><small>{(event.distanceM/1000).toFixed(1)} km</small>
            </button>)}
            {!overtakes.length && <span className="rankings-note">No passing moments inferred from the loaded splits. Load the field for broader coverage.</span>}
          </div>
          <p className="replay-moment-disclaimer">Estimated from split times and interpolated pace, not observed GPS passes. Counts depend on loaded runners and timing clock.</p>
        </section>}
    {trackedRunners.length>0 && <section aria-label="Tracked runner metrics" className="replay-telemetry">
      {trackedRunners.map(r=>{
        const metrics=replayTelemetry(r,time,timeline.origin);
        return <article key={r.id} data-focused={focused===r.id || undefined}>
          <div className="replay-telemetry-heading"><button onClick={()=>setFocused(r.id)} aria-pressed={focused===r.id}><i style={{background:accentColors[tracked.indexOf(r.id)]}} />{r.name}</button><button type="button" aria-label={`Deselect ${r.name}`} onClick={()=>deselectRunner(r.id)}>×</button></div>
          <dl><div><dt>Elapsed</dt><dd>{metrics ? raceClock(metrics.elapsedMs) : "—"}</dd></div><div><dt>Distance</dt><dd>{metrics ? `${(metrics.distanceM/1000).toFixed(2)} km` : "—"}</dd></div><div><dt>Current pace</dt><dd>{metrics?.currentPaceMsPerKm!=null ? `${raceClock(metrics.currentPaceMsPerKm)}/km` : "—"}</dd></div></dl>
        </article>;
      })}
    </section>}
        <div className="replay-transport">
          <div className="replay-transport-top">
            <strong className="replay-time-counter">{timeline.origin!==null ? new Date(timeline.origin+time).toLocaleTimeString() : raceClock(time)}</strong>
            <button className="replay-play" disabled={reduced || !runners.length} onClick={()=>{if(time>=timeline.duration) setTime(0);setPlaying(v=>!v);}} aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"}><MapIcon name={playing ? "pause" : "play"} /></button>
            <div className="replay-timeline-track">
              <input aria-label="Replay time" type="range" min={0} max={Math.max(timeline.duration,1)} step="any" value={time} disabled={!runners.length} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}} />
              <div className="replay-moment-ticks" aria-hidden="true">{overtakes.filter((_,i)=>i%Math.max(1,Math.ceil(overtakes.length/90))===0).map((event,index)=><span key={index} style={{left:`${100*event.timeMs/Math.max(timeline.duration,1)}%`}} />)}</div>
            </div>
            <label>Speed<select value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[1,4,16,32,64,128,256].map(value=><option key={value} value={value}>{value}×</option>)}</select></label>
            <label>Clock<select value={wall ? "wall" : "elapsed"} onChange={e=>{setWall(e.target.value==="wall");setTime(0);setPlaying(false);}}><option value="elapsed">{clock==="chip" ? "Chip elapsed" : "Official elapsed"}</option><option value="wall" disabled={!timeline.wallAvailable}>Race-day time</option></select></label>
          </div>
          {reduced && <small>Use the timeline to inspect positions with Reduced Motion on.</small>}
        </div>
        </div>
      </div>
    </div>
    {!immersive && <p className="rankings-note">Current pace comes from the active timing split.{data && <> {data.course.attribution}{source && <> · <a href={source} target="_blank" rel="noreferrer">Course source</a></>}</>}</p>}
  </div>;
}
