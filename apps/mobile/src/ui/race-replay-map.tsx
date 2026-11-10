import {useMemo,useState} from "react";
import {View} from "react-native";
import Mapbox,{MapView,Camera,ShapeSource,LineLayer,CircleLayer} from "@rnmapbox/maps";
import type {ReplayCourse,replayFeatures} from "@fitness-battle/shared";
import {useThemeColors} from "../theme";
import {mobileEnv} from "../lib/env";
import {AppText} from "./section";
import {MapAttribution} from "./map-attribution";
Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export function ReplayMap({course,features,focused,onSelect,onError}:{course:ReplayCourse;features:ReturnType<typeof replayFeatures>;focused:number|null;onSelect:(id:number)=>void;onError:()=>void}) {
  const colors=useThemeColors();
  const [failed,setFailed]=useState(false);
  const route=useMemo(()=>({type:"Feature" as const,properties:{},geometry:{type:"LineString" as const,coordinates:course.points.map(p=>[p[0],p[1]])}}),[course]);
  const bounds=useMemo(()=>{
    const sw=[180,85],ne=[-180,-85];for(const p of course.points){sw[0]=Math.min(sw[0],p[0]);sw[1]=Math.min(sw[1],p[1]);ne[0]=Math.max(ne[0],p[0]);ne[1]=Math.max(ne[1],p[1]);}return {sw,ne,paddingTop:40,paddingBottom:40,paddingLeft:40,paddingRight:40};
  },[course]);
  if(!mobileEnv.mapboxAccessToken) return <AppText role="caption">Map access is not configured.</AppText>;
  return <View style={{height:380,borderRadius:20,overflow:"hidden"}}><MapView style={{flex:1}} styleURL="mapbox://styles/mapbox/standard" attributionEnabled={false} logoEnabled onMapLoadingError={()=>{setFailed(true);onError();}}>
    <Camera defaultSettings={{bounds,animationDuration:0}} />
    <ShapeSource id="race-course" shape={route}><LineLayer id="race-course-line" style={{lineColor:colors.muted,lineWidth:4}} /></ShapeSource>
    <ShapeSource id="race-runners" shape={features} hitbox={{width:44,height:44}} onPress={event=>{const id=Number(event.features[0]?.properties?.id);if(Number.isSafeInteger(id)) onSelect(id);}}><CircleLayer id="race-runner-points" style={{circleRadius:5,circleColor:["case",["==",["get","id"],focused ?? -1],colors.tennis,colors.muted],circleStrokeColor:colors.ink,circleStrokeWidth:1}} /></ShapeSource>
  </MapView><MapAttribution top={12} />{failed && <AppText role="caption">Some map data could not load. Check your connection and Mapbox access.</AppText>}</View>;
}
