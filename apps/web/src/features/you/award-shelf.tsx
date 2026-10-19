"use client";

import { awardCards, type CompeteState } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";
import { playCue } from "@/lib/haptics";

export function AwardShelf({ state }: { state: CompeteState }) {
  const reduced = useReducedMotion();
  const cards = awardCards(state);
  if (cards.length === 0) {
    return <p className="fb-copy">No week awards yet.</p>;
  }
  return (
    <div className="award-row" aria-label="Week awards">
      {cards.map((card) => (
        <motion.article
          layout
          key={card.id}
          className="award-card"
          whileTap={reduced ? undefined : { scale: 0.98 }}
          onClick={() => void playCue("light")}
          style={{ cursor: "pointer" }}
        >
          <p className="fb-kicker">{card.sportName}</p>
          <h2>{card.headline}</h2>
          <strong>{card.place}</strong>
          <p className="fb-copy">
            {card.weekLabel}
            <br />
            {card.effort} effort · {card.delta} effort score
          </p>
        </motion.article>
      ))}
    </div>
  );
}
