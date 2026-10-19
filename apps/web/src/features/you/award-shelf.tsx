"use client";

import { awardCards, type CompeteState } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";

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
          layout={!reduced}
          key={card.id}
          className="award-card"
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
