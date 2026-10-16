import type {Metadata} from "next";
import {LaunchStudy} from "@/app/design/_studies/mascot-studio/launch-study";
export const metadata:Metadata={title:"Ember · Launch & landing",robots:{index:false,follow:false}};
export default function LaunchPage(){return <LaunchStudy/>;}
