import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({user:vi.fn(),client:vi.fn()}));
vi.mock("@/lib/auth/request-user",()=>({resolveRequestUserId:mock.user}));
vi.mock("@/lib/supabase/request",()=>({createRequestClient:mock.client}));
import { GET } from "./route";
function database(previousError=false){
 const queries:{table:string;filters:[string,unknown][]}[]=[];
 const from=vi.fn((table:string)=>{
  const filters:[string,unknown][]=[];queries.push({table,filters});
  const result=()=>({data:table==="crew_members"?(filters.some(([key])=>key==="user_id")?[{crew_id:"crew",crews:{id:"crew",sport:"running"}}]:[{crew_id:"crew",user_id:"self",display_name:"You",status:"active"},{crew_id:"crew",user_id:"peer",display_name:"Peer",status:"active"}]):table==="profiles"?[{id:"peer",avatar_url:"https://example.com/peer.jpg"}]:[],error:null});
  const query={select:vi.fn(()=>query),eq:vi.fn((key,value)=>{filters.push([key,value]);return query;}),in:vi.fn((key,value)=>{filters.push([key,value]);return query;}),is:vi.fn(()=>query),order:vi.fn(()=>query),limit:vi.fn(()=>query),then:(resolve:(value:ReturnType<typeof result>)=>unknown)=>Promise.resolve(result()).then(resolve)};
  return query;
 });
 const rpc=vi.fn(async(name:string)=>name==="crew_previous_week_totals"?{data:previousError?null:[{user_id:"self",distance_m:2000,moving_sec:900,session_count:1},{user_id:"peer",distance_m:3000,moving_sec:1200,session_count:1}],error:previousError?{message:"function_unavailable"}:null}:{data:[{user_id:"self",distance_m:1000,moving_sec:600,session_count:1}],error:null});
 return {from,rpc,queries};
}
describe("crew comparison reads",()=>{
 beforeEach(()=>{vi.clearAllMocks();mock.user.mockResolvedValue("self");});
 it("returns last-week aggregates and scoped member portraits through the authenticated request client",async()=>{
  const db=database();mock.client.mockResolvedValue(db);const request=new Request("http://localhost/api/crews");const response=await GET(request),body=await response.json();
  expect(response.status).toBe(200);expect(mock.client).toHaveBeenCalledWith(request);
  expect(body.previousProgressAvailable).toEqual({crew:true});expect(body.previousProgress.reduce((sum:number,r:{distance_m:number})=>sum+r.distance_m,0)).toBe(5000);
  expect(body.members[1].avatar_url).toBe("https://example.com/peer.jpg");
  expect(db.rpc).toHaveBeenCalledWith("crew_previous_week_totals",{p_crew_id:"crew"});
  expect(db.queries.find(q=>q.table==="profiles")?.filters).toContainEqual(["id",["self","peer"]]);
 });
 it("keeps current progress readable while the additive comparison migration is unavailable",async()=>{
  mock.client.mockResolvedValue(database(true));const response=await GET(new Request("http://localhost/api/crews")),body=await response.json();
  expect(response.status).toBe(200);expect(body.previousProgressAvailable.crew).toBe(false);expect(body.previousProgress).toEqual([]);expect(body.progress[0].distance_m).toBe(1000);
 });
 it("does not touch the database for an unauthenticated caller",async()=>{mock.user.mockResolvedValue(null);expect((await GET(new Request("http://localhost/api/crews"))).status).toBe(401);expect(mock.client).not.toHaveBeenCalled();});
});
