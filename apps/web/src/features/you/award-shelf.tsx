"use client";

import { awardCards, type CompeteState } from "@fitness-battle/shared";

export function AwardShelf({ state }: { state: CompeteState }) {
  const cards = awardCards(state);
  if (cards.length === 0) {
    return <p className="fb-copy">No week awards yet.</p>;
  }
  return (
    <div className="award-row" aria-label="Week awards">
      {cards.map((card) => (
        <article key={card.id} className="award-card">
          <p className="fb-kicker">{card.sportName}</p>
          <h2>{card.headline}</h2>
          <strong>{card.place}</strong>
          <p className="fb-copy">
            {card.weekLabel}
            <br />
            {card.effort} effort · {card.delta} rating
          </p>
        </article>
      ))}
    </div>
  );
}
