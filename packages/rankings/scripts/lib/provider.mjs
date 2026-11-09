import {rankingsWorkerEnv} from "./env.mjs";
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function providerJson(inputUrl) {
  const env=rankingsWorkerEnv();
  if (!env.callerId || !env.callerSecret) throw new Error("RunSignup caller credentials are not configured");
  const url=new URL(inputUrl);
  if(url.origin!=="https://api.runsignup.com") throw new Error("Unsupported provider origin");
  url.searchParams.set("rsu_api_reg",env.callerId);
  for(let attempt=0;attempt<3;attempt++) {
    let response;
    try {response=await fetch(url,{headers:{"X-RSU-API-REG-SECRET":env.callerSecret,accept:"application/json"},signal:AbortSignal.timeout(30000),redirect:"error"});}
    catch {if(attempt===2) throw new Error("RunSignup request failed or timed out");await pause(1000*(attempt+1));continue;}
    if(response.status===401 || response.status===403) throw new Error("RunSignup access is unavailable for these credentials");
    if(response.status===429 || response.status>=500) {if(attempt===2) throw new Error("RunSignup is unavailable or rate limited");await pause(1000*(attempt+1));continue;}
    if(!response.ok) throw new Error(`RunSignup returned HTTP ${response.status}`);
    try {return await response.json();} catch {throw new Error("RunSignup returned invalid JSON");}
  }
}
