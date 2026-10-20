import {createElement,useCallback,useEffect,useId,useState,type ComponentType} from "react";
import {AccessibilityInfo,AppState} from "react-native";
import {useFocusEffect} from "expo-router";
import {G,Path,Rect,Defs,LinearGradient,Stop,Mask} from "react-native-svg";
import {polishedCapsuleScene,polishedLaneScale,type CapsuleNode} from "@fitness-battle/shared";

const elements={g:G,path:Path,rect:Rect,defs:Defs,linearGradient:LinearGradient,stop:Stop,mask:Mask};
function draw(node:CapsuleNode,key:number):React.ReactNode{
  const Element=elements[node.tag] as ComponentType<Record<string,unknown>>;
  return createElement(Element,{...node.attrs,key},node.children?.map(draw));
}
export function PolishedRacer({x,y,you,time}: {x:number;y:number;you:boolean;time?:number}){
  const id=useId();
  return <G transform={`translate(${x} ${y}) scale(${polishedLaneScale(you)})`} pointerEvents="none">
    {polishedCapsuleScene(id,you,time).map(draw)}
  </G>;
}
/** One field clock, suspended when the screen/app is inactive or motion is reduced. */
export function usePolishedWakeTime(){
  const [reduced,setReduced]=useState(true),[foreground,setForeground]=useState(AppState.currentState==="active"),[focused,setFocused]=useState(false);
  const [time,setTime]=useState<number|undefined>(undefined);
  useFocusEffect(useCallback(()=>{setFocused(true);return()=>setFocused(false);},[]));
  useEffect(()=>{
    let alive=true,changed=false;
    void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(alive&&!changed)setReduced(value);}).catch(()=>{});
    const motion=AccessibilityInfo.addEventListener("reduceMotionChanged",value=>{changed=true;setReduced(value);});
    const app=AppState.addEventListener("change",state=>setForeground(state==="active"));
    return()=>{alive=false;motion.remove();app.remove();};
  },[]);
  useEffect(()=>{
    if(reduced||!foreground||!focused){setTime(undefined);return;}
    let raf=0,published=0;const start=performance.now();
    const tick=(now:number)=>{if(now-published>=1000/30){published=now;setTime((now-start)/1000);}raf=requestAnimationFrame(tick);};
    raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);
  },[reduced,foreground,focused]);
  return time;
}
