"use client";
import { AppParagraph, AppHeading } from "@/ui/section";

import { awardCards, type CompeteState } from "@fitness-battle/shared";
import { motion, useReducedMotion } from "motion/react";

export function AwardShelf({ state }: { state: CompeteState }) {
  const reduced = useReducedMotion();
  const cards = awardCards(state);
  if (cards.length === 0) {
    return <AppParagraph typographyRole="body" className="fb-copy">No week awards yet.</AppParagraph>;
  }
  return (
    <div className="award-row" aria-label="Week awards">
      {cards.map((card) => (
        <motion.article
          layout={!reduced}
          key={card.id}
          className="award-card"
        >
          <AppParagraph typographyRole="label" className="fb-kicker">{card.sportName}</AppParagraph>
          <AppHeading level={2} role="heading">{card.headline}</AppHeading>
          <strong>{card.place}</strong>
          <AppParagraph typographyRole="body" className="fb-copy">
            {card.weekLabel}
            <br />
            {card.effort} effort · {card.delta} effort score
          </AppParagraph>
        </motion.article>
      ))}
    </div>
  );
}
