"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { AthleteCard } from "./athlete-card";
import { CONCEPTS, DEFAULT_PHOTO, ORIGINAL_CONCEPTS, PHOTO_CONCEPTS, PHOTOS, type CardPhoto, type ConceptId } from "./catalog";
import styles from "./athlete-cards.module.css";

type View = "explore" | "compare" | "page" | "photos";

export function AthleteCardLab() {
  const [selected, setSelected] = useState<ConceptId>("shield-window");
  const [view, setView] = useState<View>("explore");
  const [ready, setReady] = useState(false);
  const [photoId, setPhotoId] = useState("park");
  const [crop, setCrop] = useState({ x: 50, y: 40 });
  const [upload, setUpload] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadRequest = useRef(0);
  useEffect(() => {
    const query = new URL(window.location.href).searchParams;
    const concept = CONCEPTS.find(c => c.id === query.get("concept"));
    if (concept) setSelected(concept.id);
    const nextView = query.get("view");
    if (nextView === "compare" || nextView === "page" || (nextView === "photos" && (!concept || "family" in concept))) setView(nextView);
    const photo = PHOTOS.find(p => p.id === query.get("photo"));
    if (photo) setPhotoId(photo.id);
    setReady(true);
    return () => { uploadRequest.current++; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    url.searchParams.set("concept", selected);
    url.searchParams.set("view", view);
    url.searchParams.set("photo", photoId === "upload" ? "park" : photoId);
    window.history.replaceState(null, "", url);
  }, [selected, view, photoId, ready]);
  useEffect(() => () => { if (upload) URL.revokeObjectURL(upload); }, [upload]);

  const concept = CONCEPTS.find(c => c.id === selected)!;
  const cropCollection = "family" in concept;
  const collection = cropCollection ? PHOTO_CONCEPTS : ORIGINAL_CONCEPTS;
  const source = PHOTOS.find(p => p.id === photoId) ?? PHOTOS[0];
  const photo: CardPhoto = photoId === "upload" && upload ? { src: upload, kind: "photo", ...crop } : { ...source, ...crop };
  const cropPhoto = photo.kind === "cutout" ? DEFAULT_PHOTO : photo;
  const preparedCutout: CardPhoto = { ...PHOTOS[2], x: 50, y: 50 };

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const ticket = ++uploadRequest.current;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      if (ticket !== uploadRequest.current) { URL.revokeObjectURL(url); return; }
      setUpload(url); setPhotoId("upload"); setCrop({ x: 50, y: 50 }); setPhotoError("");
    } catch {
      URL.revokeObjectURL(url);
      if (ticket === uploadRequest.current) setPhotoError("This image could not be opened. Try a JPG, PNG or WebP photo.");
    }
  }

  function chooseCollection(cropped: boolean) {
    setSelected(cropped ? "shield-window" : "contender");
    if (!cropped && view === "photos") setView("explore");
  }

  return <main className={styles.lab}>
    <header className={styles.masthead}><Link href="/design" aria-label="Overtaek design lab" className={styles.wordmark}>overtaek<span>↗</span></Link><span>ATHLETE / CARD STUDY</span><Link href="/app/athlete">Back to Athlete ↗</Link></header>
    <div className={styles.labBody}>
      <div className={styles.intro}><div><h1>Athlete cards</h1><p>{cropCollection ? "A place for any profile photo." : "Your records. Your history. Your card."}</p></div><div className={styles.viewControls} role="group" aria-label="Preview layout">{([['explore', 'Explore'], ['compare', 'Compare all'], ['page', 'In Athlete'], ...(cropCollection ? [['photos', 'Photo & cutout']] as const : [])] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</div></div>
      <div className={styles.collectionControls} role="group" aria-label="Card collection"><button type="button" aria-pressed={cropCollection} onClick={() => chooseCollection(true)}>Photo crops</button><button type="button" aria-pressed={!cropCollection} onClick={() => chooseCollection(false)}>Original four</button></div>
      <nav className={styles.concepts} aria-label="Card concepts">{collection.map((c, i) => <button key={c.id} type="button" aria-pressed={c.id === selected} onClick={() => { setSelected(c.id); if (view === "compare") setView("explore"); }}><span>0{i + 1}</span>{c.name}<span className={styles.conceptDot} /></button>)}</nav>
      {cropCollection && <section className={styles.photoTools} aria-label="Photo preview controls">
        <div className={styles.photoSource}><label>Photo<select aria-label="Photo source" value={photoId} onChange={e => { uploadRequest.current++; setPhotoId(e.target.value); setCrop({ x: e.target.value === "race" ? 65 : 50, y: 40 }); setPhotoError(""); }}>{PHOTOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}{upload && <option value="upload">Your photo</option>}</select></label><button type="button" onClick={() => fileInput.current?.click()}>Try your photo</button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a local profile photo" hidden onChange={chooseFile} /></div>
        <div className={styles.cropControls}><label>Left / right<input aria-label="Horizontal photo crop" type="range" min="0" max="100" disabled={photo.kind !== "photo"} value={crop.x} onChange={e => setCrop(v => ({ ...v, x: Number(e.target.value) }))} /></label><label>Up / down<input aria-label="Vertical photo crop" type="range" min="0" max="100" disabled={photo.kind !== "photo"} value={crop.y} onChange={e => setCrop(v => ({ ...v, y: Number(e.target.value) }))} /></label></div>
        <p>{photo.kind === "cutout" ? "This portrait already has a transparent background. Ordinary photos keep their background." : "Only the crop changes. Your photo stays in this browser."}</p>{photoError && <p role="alert">{photoError}</p>}
      </section>}
      {view === "compare" || view === "photos" ? <div className={styles.comparison}>{view === "compare" ? collection.map((c, i) => <section key={c.id}><div className={styles.compareLabel}><h2><span>0{i + 1}</span> {c.name}</h2><button type="button" onClick={() => { setSelected(c.id); setView("explore"); }}>Explore ↗</button></div><AthleteCard concept={c.id} photo={photo} /><p>{c.material}</p></section>) : ([{ label: "Photo crop", photo: cropPhoto }, { label: "Prepared cutout", photo: preparedCutout }]).map(item => <section key={item.label}><div className={styles.compareLabel}><h2>{item.label}</h2><span>{concept.name}</span></div><AthleteCard key={selected} concept={selected} photo={item.photo} /><p>{item.photo.kind === "none" ? "Initials when a photo is unavailable" : item.photo.kind === "photo" ? "Background preserved · crop only" : "Existing transparency · no removal service"}</p></section>)}</div> : <div className={styles.explorer}>
        {view === "page" ? <div className={styles.phonePreview}><div className={styles.phoneHeader}><Link href="/app/athlete" aria-label="Return to Athlete">←</Link><h2>Athlete</h2><span /></div><AthleteCard key={selected} concept={selected} photo={photo} compact /><div className={styles.phoneSettings}><Link href="/app/athlete">Edit profile <span>↗</span></Link>{["Data Sync", "Preferences", "Notifications", "How scoring works", "Account"].map(label => <div key={label}>{label}<span>›</span></div>)}</div></div> : <div className={styles.heroStage}><AthleteCard key={selected} concept={selected} photo={photo} /><span className={styles.stageCaption}>MOVE IT. TURN IT. MAKE IT YOURS.</span></div>}
        <aside className={styles.conceptDetails} aria-live="polite"><span className={styles.conceptIndex}>0{collection.findIndex(c => c.id === selected) + 1} / 04</span><h2>{concept.name}</h2><p className={styles.material}>{concept.material}</p><p className={styles.description}>{concept.description}</p><dl><div><dt>On the front</dt><dd>{concept.front}</dd></div><div><dt>{cropCollection ? "Your photo" : "Turn it over"}</dt><dd>{cropCollection ? "A bounded image area accepts ordinary photos, prepared cutouts or initials. Type and stats stay outside the photo." : "Dated personal bests, lifetime overtakes, active weeks and your current week streak."}</dd></div><div><dt>On Athlete</dt><dd>{concept.fit}</dd></div></dl><button className={styles.compareAction} type="button" onClick={() => setView(view === "page" ? "explore" : "page")}>{view === "page" ? "Explore the card" : "See it on Athlete"}<span>↗</span></button></aside>
      </div>}
      <details className={styles.scope}><summary>Data & integration notes</summary><div><p>Cards combine personal bests with existing Overtaek history. The running percentile compares Open runners; its cohort, eligibility and refresh rules need a product decision before integration. There is no new overall fitness rating or score calculation in this study.</p><p>The new photo layouts use image cropping only, with no subject masking, background removal or text over photos. The prepared cutout is a separate existing asset. Local photo choices are held in memory and never uploaded. Native integration still needs a WebView host and device verification.</p></div></details>
    </div>
  </main>;
}
