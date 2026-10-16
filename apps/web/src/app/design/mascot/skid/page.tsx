import type {Metadata} from "next";
import {LaunchStudy} from "@/app/design/_studies/mascot-studio/launch-study";
export const metadata:Metadata={title:"Ember · Front-foot skid",robots:{index:false,follow:false}};
export default function SkidPage(){return <LaunchStudy sliding/>;}
