export interface WeeklyPeer { id:string; name:string; place:number; fieldSize:number; distanceM:number; movingSec:number; congrats:boolean; repeat:boolean; mutual:boolean; status:'off'|'saved'|'mutual'|'paired'|'expired'|'unpaired' }
export interface WeeklySocial { fieldId:string|null; peers:WeeklyPeer[] }
export function repeatStatus(status:WeeklyPeer['status']):string {
  return {off:'',saved:'Preference saved. Mutual choices guide a future field.',mutual:'You both want another round. Pairing is not guaranteed.',paired:'You share another field.',expired:'Couldn’t pair you this time.',unpaired:'Couldn’t pair you this time.'}[status];
}
