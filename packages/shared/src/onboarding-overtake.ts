import { createRaceCourse } from "./race-course";
import type { CompetitionMoment } from "./competition-moments";
/** An illustrative public course and two fictional racers; never applied to account state. */
export const onboardingOvertakeCourse = createRaceCourse("Overtake tutorial · sample course", [[-73.974,40.764],[-73.970,40.770],[-73.965,40.773]]);
export const onboardingOvertakeMoment: CompetitionMoment = {
  id: "onboarding-overtake", sport: "running", unit: "km",
  lanes: [{id:"you",name:"You",initials:"YOU",you:true,value:.85},{id:"alex",name:"Alex",initials:"A",value:.5}],
  plan: {youId:"you",youBefore:.15,youAfter:.85,rankBefore:2,rankAfter:1,hasOvertake:true,anyRivalMoved:false,overtakenIds:["alex"],rivalSlideEnd:0,durationMs:6000,rivals:{alex:{id:"alex",name:"Alex",startValue:.5,endValue:.5,moved:false,overtaken:true}}},
};
