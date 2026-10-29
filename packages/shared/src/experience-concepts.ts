/** Presentation-only storyboards. All values are fictional; no account actions. */
export const EXPERIENCE_CONCEPTS = {
  onboarding: {
    label: "Onboarding", name: "Your first little win", note: "Learn by moving. One decision at a time, with Ember alongside you.",
    steps: [
      { eyebrow: "A LITTLE MOVEMENT. A LITTLE MAGIC.", title: "Good things start with you.", body: "Meet Ember. Your tiny teammate for the everyday effort that adds up.", action: "Let’s find your field" },
      { eyebrow: "MAKE IT YOURS", title: "What moves you?", body: "Pick a sport to try. You can join more fields later.", action: "That’s my sport" },
      { eyebrow: "TRY A LITTLE PASS", title: "Your effort moves you forward.", body: "Slide the sample session into your week. Watch how your place changes.", action: "I’ve got it" },
      { eyebrow: "YOU KNOW THE WAY", title: "Your starting line is here.", body: "Train in your own time. Your counted effort joins the field. A new round starts each Monday, Eastern time.", action: "Finish preview" },
    ],
  },
  overtake: {
    label: "Overtaking", name: "Make the pass the hero", note: "Receipt → chase → photo finish → payoff. Keep you and your rival in the shot.",
    steps: [
      { eyebrow: "SESSION IN. MOMENTUM UP.", title: "That effort went somewhere.", body: "A fictional 3.2 km run just landed. Let’s see what moved in your field.", action: "See my move" },
      { eyebrow: "THE CHASE", title: "There’s Alex. Here you come.", body: "The camera frames both racers, even if Alex was offscreen in the original field.", action: "Watch the pass" },
      { eyebrow: "PHOTO FINISH", title: "A little ahead feels pretty good.", body: "Slow down at the crossing. Give the pass a beat before the next one.", action: "Land the moment" },
      { eyebrow: "ONE EFFORT. A NEW PLACE.", title: "Look at you go.", body: "You moved from fourth to third in this sample field. Every place comes from the same weekly totals.", action: "Finish preview" },
    ],
  },
  week: {
    label: "End of week", name: "A week worth remembering", note: "Revisit the effort, reveal the finish, then carry something into Monday.",
    steps: [
      { eyebrow: "THE WEEK YOU SHOWED UP", title: "Small days. Quite a week.", body: "Three sessions. Three moments you made time for yourself. Let’s follow the trail.", action: "Unpack my week" },
      { eyebrow: "YOUR FINISH", title: "Third place. All your effort.", body: "The sample field is settled. Your finish gets a moment of its own.", action: "See what added up" },
      { eyebrow: "THE BIGGER PICTURE", title: "More than a place.", body: "A 4-week activity streak and 12.4 km of counted running. Your consistency is part of the story too.", action: "Turn the page" },
      { eyebrow: "A FRESH START", title: "New week. Same you, growing.", body: "This sample athlete is registered for the next round. In the app, this step would reflect your actual registration.", action: "Finish preview" },
    ],
  },
} as const;
export type ExperienceConceptId = keyof typeof EXPERIENCE_CONCEPTS;
export function experienceConceptId(value: unknown): ExperienceConceptId {
  return value === "overtake" || value === "week" ? value : "onboarding";
}
