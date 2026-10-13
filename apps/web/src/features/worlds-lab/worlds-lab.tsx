"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Activity } from "../design-lab/data";
import { FlipWorld } from "./flip";
import { RallyWorld } from "./rally";
import { RoamWorld } from "./roam";
import { LoopWorld } from "./loop";
import { TempoWorld } from "./tempo";
import {
  conceptIds,
  concepts,
  references,
  snapshot,
  type ConceptId,
} from "./model";
import type { WorldProps } from "./types";
import "./worlds-lab.css";

const worlds = {
  flip: FlipWorld,
  rally: RallyWorld,
  roam: RoamWorld,
  loop: LoopWorld,
  tempo: TempoWorld,
};
export function WorldsLab() {
  const [concept, setConcept] = useState<ConceptId>("flip");
  const [cutoff, setCutoff] = useState(3),
    [referenceId, setReferenceId] = useState("ghost");
  const [playing, setPlaying] = useState(false);
  const [detail, setDetail] = useState<{
    title: string;
    content: ReactNode;
  } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const reference =
    references.find((r) => r.id === referenceId) ?? references[0];
  const week = snapshot(cutoff, reference);
  useEffect(() => {
    function restore() {
      const next = new URLSearchParams(window.location.search).get("concept");
      setConcept(
        conceptIds.includes(next as ConceptId) ? (next as ConceptId) : "flip",
      );
      setCutoff(3);
      setReferenceId("ghost");
      setPlaying(false);
      setEvaluating(false);
      setDetail(null);
    }
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let step = 0;
    const id = window.setInterval(() => {
      step += 1;
      setCutoff(step);
      if (step === 3) {
        setPlaying(false);
        window.clearInterval(id);
      }
    }, 1250);
    return () => window.clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
    if (!detail && dialog.current?.open) dialog.current.close();
  }, [detail]);
  function select(next: ConceptId) {
    if (next === concept) return;
    setConcept(next);
    setCutoff(3);
    setPlaying(false);
    setReferenceId("ghost");
    setDetail(null);
    setEvaluating(false);
    window.history.pushState(null, "", `/design/worlds?concept=${next}`);
    window.scrollTo(0, 0);
  }
  function activity(a: Activity) {
    setDetail({
      title: a.title,
      content: (
        <>
          <p className="world-eyebrow">
            {a.day} · {a.date}, 2026 · sample import
          </p>
          <div className="world-receipt-number">
            {a.km}
            <small>km</small>
          </div>
          <p>{a.minutes} minutes · Running · Counted once</p>
          <p>{a.note}</p>
          <p className="world-receipt-source">
            This activity contributes {a.km} km to the illustrative week. The
            sample has three imports totalling 19.2 km. No tracker connection is
            made here.
          </p>
        </>
      ),
    });
  }
  const props: WorldProps = {
    week,
    reference,
    playing,
    onCutoff: (n) => {
      setCutoff(n);
      setPlaying(false);
    },
    onReference: (id) => {
      setReferenceId(id);
      setPlaying(false);
    },
    onReplay: () => {
      if (playing) setPlaying(false);
      else {
        setCutoff(0);
        setPlaying(true);
      }
    },
    onActivity: activity,
    onGroups: () =>
      setDetail({
        title: "A little company, when you want it.",
        content: (
          <>
            <p>
              Your week is the main event. Sunday Miles is an optional
              nine-person sample group.
            </p>
            <p>
              Comparisons use accumulated running distance at the same weekly
              cutoff. These concepts don't join or modify a group.
            </p>
          </>
        ),
      }),
  };
  const World = worlds[concept];
  return (
    <div className="worlds-lab" data-concept={concept}>
      <header className="world-lab-header">
        <div className="world-lab-title">
          <Link href="/design/evolution">← Design lab</Link>
          <strong>Five product worlds</strong>
          <span>Interactive concepts</span>
        </div>
        <nav
          aria-label="Choose a product concept"
          className="world-concept-picker"
        >
          {conceptIds.map((id) => (
            <button
              key={id}
              aria-pressed={concept === id}
              onClick={() => select(id)}
            >
              {concepts[id].name}
              <span>{concepts[id].metaphor}</span>
            </button>
          ))}
        </nav>
        <div className="world-lab-meta">
          <span>Illustrative week · 12–19 Oct 2026 UTC · sample imports</span>
          <button
            onClick={() => setEvaluating(!evaluating)}
            aria-expanded={evaluating}
          >
            {evaluating ? "Back to the experience" : "Compare the ideas"} ↗
          </button>
        </div>
      </header>
      {evaluating ? (
        <main className="world-evaluation">
          <h1>Five different things to interact with.</h1>
          <div className="world-evaluation-grid">
            {conceptIds.map((id) => (
              <article key={id}>
                <strong>{concepts[id].name}</strong>
                <h2>{concepts[id].metaphor}</h2>
                <p>{concepts[id].interaction}</p>
                <dl>
                  <dt>Character</dt>
                  <dd>{concepts[id].character}</dd>
                  <dt>Palette / typography</dt>
                  <dd>
                    {concepts[id].palette}
                    <br />
                    {concepts[id].type}
                  </dd>
                </dl>
                <p>{concepts[id].question}</p>
                <button
                  onClick={() => {
                    select(id);
                    setEvaluating(false);
                  }}
                >
                  Try {concepts[id].name} ↗
                </button>
              </article>
            ))}
          </div>
        </main>
      ) : (
        <World {...props} />
      )}
      <footer className="world-lab-footer">
        <span>
          Original characters · Individual progress first · Presentation
          prototypes
        </span>
        <Link href="/design/spatial">Spatial studies ↗</Link>
        <Link href="/design/rally">Rally · the focused direction ↗</Link>
      </footer>
      <dialog
        ref={dialog}
        className="world-dialog"
        aria-labelledby="world-detail-title"
        onClose={() => setDetail(null)}
        onCancel={() => setDetail(null)}
      >
        <header>
          <h2 id="world-detail-title">{detail?.title}</h2>
          <button aria-label="Close detail" onClick={() => setDetail(null)}>
            ×
          </button>
        </header>
        <div>{detail?.content}</div>
        <button className="world-dialog-done" onClick={() => setDetail(null)}>
          Back to my week
        </button>
      </dialog>
    </div>
  );
}
