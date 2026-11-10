import {useState} from "react";
import {RACE_CATEGORY_FILTERS} from "@fitness-battle/shared";
import {FocusButton,FocusSheet} from "./focus";
export function RaceCategoryFilter({value,onChange}:{value:string;onChange:(value:string)=>void}) {
 const [open,setOpen]=useState(false);
 return <><FocusButton label={`Category: ${RACE_CATEGORY_FILTERS.find(c=>c.value===value)?.label ?? "All runners"}`} secondary onPress={()=>setOpen(true)} /><FocusSheet open={open} title="Filter category" onClose={()=>setOpen(false)}>{RACE_CATEGORY_FILTERS.map(c=><FocusButton key={c.value} label={c.label} secondary={value!==c.value} onPress={()=>{onChange(c.value);setOpen(false);}} />)}</FocusSheet></>;
}
