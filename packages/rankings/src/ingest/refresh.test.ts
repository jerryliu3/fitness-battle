import {describe,expect,it} from "vitest";
import {parseRefreshCatalog,planRaceRefresh,refreshMappingHash,publicFinalResultSet} from "./refresh";
const mapping={raceId:"1",eventId:"2",resultSetId:"3",distance:"10k",name:"Road race",editionYear:2025,date:"2025-10-01",attribution:"Official source",reuseNotes:"Public source reviewed",reviewedAt:"2026-11-09"};
const candidate={key:"runsignup:1:2:3",raceId:"1",eventId:"2",resultSetId:"3",raceName:"Road race",resultSetName:"Finishers",modifiedAt:100};
describe("reviewed refresh planning",()=>{
  it("does not schedule unmapped discoveries",()=>{
    expect(planRaceRefresh([candidate],[],{})).toEqual([]);
  });
  it("reprepares changed provider data or changed mapping, not unchanged jobs",()=>{
    const mappings=parseRefreshCatalog({version:1,events:[mapping]});
    const prepared={"runsignup:1:2:3":{modifiedAt:100,mappingHash:refreshMappingHash(mappings[0]!),sqlPath:"result.sql",jsonlPath:"result.jsonl",preparedAt:"2026-11-09"}};
    expect(planRaceRefresh([candidate],mappings,prepared)).toHaveLength(0);
    expect(planRaceRefresh([{...candidate,modifiedAt:101}],mappings,prepared)).toHaveLength(1);
    expect(planRaceRefresh([candidate],[{...mappings[0]!,distance:"5k"}],prepared)).toHaveLength(1);
  });
  it("rejects duplicate mappings and unsupported edition dates",()=>{
    expect(()=>parseRefreshCatalog({version:1,events:[mapping,mapping]})).toThrow();
    expect(()=>parseRefreshCatalog({version:1,events:[{...mapping,date:"2025-02-29"}]})).toThrow();
    expect(()=>parseRefreshCatalog({version:1,events:[{...mapping,date:"2024-10-01"}]})).toThrow();
    expect(()=>parseRefreshCatalog({version:1,events:[{...mapping,reuseNotes:""}]})).toThrow();
  });
  it("requires explicitly public final results and a provider count",()=>{
    const set={individual_result_set_id:3,public_results:"T",preliminary_results:"F",num_finishers:100};
    expect(publicFinalResultSet({individual_results_sets:[set]},"3")).toEqual({count:100});
    expect(()=>publicFinalResultSet({individual_results_sets:[{...set,public_results:"F"}]},"3")).toThrow();
    expect(()=>publicFinalResultSet({individual_results_sets:[{...set,preliminary_results:"T"}]},"3")).toThrow();
    expect(()=>publicFinalResultSet({individual_results_sets:[{...set,num_finishers:undefined}]},"3")).toThrow();
  });
});
