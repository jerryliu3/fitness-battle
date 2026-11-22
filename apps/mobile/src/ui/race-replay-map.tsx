import {useEffect,useMemo,useRef,useState,type ComponentRef,type ReactNode} from "react";
import {StyleSheet,View} from "react-native";
import Mapbox,{MapView,Camera,StyleImport,ShapeSource,LineLayer,CircleLayer,MarkerView} from "@rnmapbox/maps";
import {replayCourseBearing,type ReplayCourse,type replayFeatures} from "@fitness-battle/shared";
import {useAppTheme} from "../appearance";
import {mobileEnv} from "../lib/env";
import {AppText} from "./section";
import {MapAttribution} from "./map-attribution";
Mapbox.setAccessToken(mobileEnv.mapboxAccessToken);
export function ReplayMap({course,features,focused,tracked,followId,tilted,overlayTop,overlayBottom,profileId,profile,onSelect,onError}:{course:ReplayCourse;features:ReturnType<typeof replayFeatures>;focused:number|null;tracked:number[];followId:number|null;tilted:boolean;overlayTop:number;overlayBottom:number;profileId:number|null;profile:ReactNode;onSelect:(id:number)=>void;onError:()=>void}) {
  const {mode,colors}=useAppTheme();
  const [gesturing,setGesturing]=useState(false);
  const [failed,setFailed]=useState(false),[ready,setReady]=useState(false);
  const camera=useRef<ComponentRef<typeof Camera>>(null);
  const lastFollow=useRef<number|null>(null);
  const target=followId===null ? undefined : features.features.find(feature=>feature.id===followId);
  const profileCoordinate=features.features.find(feature=>feature.id===profileId)?.geometry.coordinates;
  useEffect(()=>{
    if(!ready || followId===null || !target) { lastFollow.current=null; return; }
    if(gesturing) return;
    camera.current?.setCamera({
      centerCoordinate:target.geometry.coordinates,
      heading:replayCourseBearing(course,target.properties.distanceM),
      ...(lastFollow.current!==followId ? {zoomLevel:14} : {}),
      animationDuration:0,
    });
    lastFollow.current=followId;
  },[course,followId,gesturing,ready,target]);
  useEffect(()=>{
    if(ready) camera.current?.setCamera({pitch:tilted ? 55 : 0,animationDuration:0});
  },[ready,tilted]);
  const route=useMemo(()=>({type:"Feature" as const,properties:{},geometry:{type:"LineString" as const,coordinates:course.points.map(p=>[p[0],p[1]])}}),[course]);
  const bounds=useMemo(()=>{
    const sw=[180,85],ne=[-180,-85];for(const p of course.points){sw[0]=Math.min(sw[0],p[0]);sw[1]=Math.min(sw[1],p[1]);ne[0]=Math.max(ne[0],p[0]);ne[1]=Math.max(ne[1],p[1]);}return {sw,ne,paddingTop:overlayTop+24,paddingBottom:overlayBottom+24,paddingLeft:40,paddingRight:40};
  },[course,overlayTop,overlayBottom]);
  if(!mobileEnv.mapboxAccessToken) return <AppText role="caption">Map access is not configured.</AppText>;
  return <View style={StyleSheet.absoluteFill}><MapView style={{flex:1}} zoomEnabled scrollEnabled={followId===null}
    onTouchStart={()=>setGesturing(true)}
    onTouchEnd={event=>{if(event.nativeEvent.touches.length===0) setGesturing(false);}}
    onTouchCancel={()=>setGesturing(false)}
    onDidFinishLoadingStyle={()=>setReady(true)} styleURL="mapbox://styles/mapbox/standard" attributionEnabled={false} logoEnabled logoPosition={{left:12,bottom:overlayBottom+8}} onMapLoadingError={()=>{setFailed(true);onError();}}>
    <Camera ref={camera} defaultSettings={{bounds,animationDuration:0}} />
    <StyleImport id="basemap" existing config={{lightPreset:mode==="dark" ? "night" : "day"}} />
    <ShapeSource id="race-course" shape={route}><LineLayer id="race-course-outline" slot="top" style={{lineColor:mode==="dark" ? colors.textOnAction : colors.white,lineWidth:6,lineEmissiveStrength:1}} /><LineLayer id="race-course-line" slot="top" style={{lineColor:mode==="dark" ? colors.actionPrimary : colors.textOnAction,lineWidth:3,lineEmissiveStrength:1}} /></ShapeSource>
    <ShapeSource id="race-runners" shape={features} hitbox={{width:44,height:44}} onPress={event=>{const id=Number(event.features[0]?.properties?.id);if(Number.isSafeInteger(id)) onSelect(id);}}><CircleLayer id="race-runner-points" slot="top" style={{circleEmissiveStrength:1,circleRadius:["case",["==",["get","id"],focused ?? -1],6,4],
      circleColor:"#ffffff",circleStrokeColor:["case",["==",["get","id"],tracked[0] ?? -1],colors.actionPrimary,
        ["==",["get","id"],tracked[1] ?? -1],"#4ed1fc",
        ["==",["get","id"],tracked[2] ?? -1],"#fc8d66",
        ["==",["get","id"],tracked[3] ?? -1],"#dba9ff",colors.muted],circleStrokeWidth:["case",["==",["get","id"],focused ?? -1],3,2]}} /></ShapeSource>
    {profile && profileCoordinate && <MarkerView coordinate={profileCoordinate} anchor={{x:0.5,y:1}} allowOverlap allowZElevate={false}>
      <View style={{paddingBottom:12}}>{profile}</View>
    </MarkerView>}
  </MapView><MapAttribution top={overlayTop+8} />{failed && <AppText role="caption">Some map data could not load. Check your connection and Mapbox access.</AppText>}</View>;
}
