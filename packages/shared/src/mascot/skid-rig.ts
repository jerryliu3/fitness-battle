import { EMBER_REST, rotateEmberPoint, type EmberPose } from "./model";
import { launchFootPoints } from "./launch-shape";

/** Place the left/front sole on a fixed ground rail while the torso pivots. */
export function emberSkidOffset(p:EmberPose,flight:number,crouch:number,weight:number): readonly [number,number] {
  if(!Number.isFinite(weight)||weight<=0)return [0,0];
  const sole=launchFootPoints(p,"crest-launch",flight,crouch,weight)[1];
  const target=launchFootPoints({...EMBER_REST},"crest-launch",0,0)[1];
  const transformed=rotateEmberPoint(180+(sole[0]-180)*p.scaleX*Math.cos(p.yaw*1.12),235+(sole[1]-235)*p.scaleY,[180,235],p.rotation);
  const t=Math.min(1,weight);
  return [(target[0]-transformed[0]-p.x)*t,(target[1]-transformed[1]-p.y)*t];
}
