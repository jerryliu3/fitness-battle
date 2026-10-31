import { useState } from "react";
import { Switch, View } from "react-native";
import { onboardingOvertakeCourse, onboardingOvertakeMoment } from "@fitness-battle/shared";
import { CompetitionMoment } from "./competition-moment";
import { SHELL_COLORS as c } from "../theme";
import { AppText } from "../ui/section";
export function OnboardingOvertake() {
  const [dimension,setDimension]=useState<"2d"|"4d">("4d"),[replay,setReplay]=useState(0),[autoStart,setAutoStart]=useState(true);
  const play = () => { setAutoStart(true); setReplay(n=>n+1); };
  return <View style={{gap:12}}><View style={{flexDirection:"row",gap:12,alignItems:"center",justifyContent:"flex-end"}}><AppText role="label">2D field</AppText><Switch accessibilityLabel="3D course" value={dimension==="4d"} onValueChange={value=>setDimension(value?"4d":"2d")} trackColor={{false:c.line,true:c.ink}}/><AppText role="label">3D course</AppText></View><CompetitionMoment key={replay} autoStart={autoStart} embedded dimension={dimension} course={onboardingOvertakeCourse} moment={onboardingOvertakeMoment} remaining={1} onConfirm={play}/></View>;
}
