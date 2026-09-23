"use strict";

const crypto=require("node:crypto");
const {createSearchConsoleAdapter,createGA4Adapter}=require("./adapters");
const {ScoutSourceHealth,ScoutLiveEvidence}=require("./contracts");

const SEARCH_SCOPE="https://www.googleapis.com/auth/webmasters.readonly";
const ANALYTICS_SCOPE="https://www.googleapis.com/auth/analytics.readonly";
const hash=value=>crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const VERIFIED_PROVIDER_READS=new WeakSet();
const markVerifiedProviderRead=result=>{if(result&&typeof result==="object"&&result.status==="READ")VERIFIED_PROVIDER_READS.add(result);return result};
const requireText=(value,name)=>{if(typeof value!=="string"||!value.trim())throw new Error(`${name}_required`);return value.trim()};

function googleConfigurationFromEnv(env=process.env){
 return Object.freeze({
  accessToken:env.GOOGLE_SCOUT_ACCESS_TOKEN||null,
  searchConsoleSiteUrl:env.GOOGLE_SEARCH_CONSOLE_SITE_URL||null,
  ga4PropertyId:env.GOOGLE_GA4_PROPERTY_ID||null,
  authorizationVerified:env.GOOGLE_SCOUT_AUTHORIZATION_VERIFIED==="true",
  searchConsoleResourceVerified:env.GOOGLE_SEARCH_CONSOLE_RESOURCE_VERIFIED==="true",
  ga4ResourceVerified:env.GOOGLE_GA4_RESOURCE_VERIFIED==="true"
 });
}

function googleRequest({fetchImpl=globalThis.fetch,accessToken,url,body}){
 if(typeof fetchImpl!=="function")throw new Error("fetch_implementation_required");
 const token=requireText(accessToken,"google_access_token");
 return fetchImpl(url,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(body)});
}

function createGoogleSearchConsoleSource({organizationId,fetchImpl=globalThis.fetch,accessToken,siteUrl,authorizationVerified=false,resourceVerified=false,clock=()=>new Date()}={}){
 requireText(organizationId,"organization");
 const reader=async({startDate,endDate,dimensions=["query","page"],rowLimit=25000,startRow=0}={})=>{
  const site=requireText(siteUrl,"search_console_site_url");
  const response=await googleRequest({fetchImpl,accessToken,url:`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,body:{startDate,endDate,dimensions,rowLimit,startRow}});
  if(!response.ok)throw new Error(`search_console_http_${response.status}`);
  const payload=await response.json(),observedAt=clock().toISOString(),recordRef=`gsc:${hash(payload)}`;
  return {status:"READ",records:payload.rows||[],evidenceRefs:[recordRef],providerMetadata:{observedAt,rowCount:(payload.rows||[]).length,responseAggregationType:payload.responseAggregationType||null}};
 };
 const adapter=createSearchConsoleAdapter({configuration:{authorizationVerified,resourceVerified},reader});
 return Object.freeze({...adapter,read:async request=>markVerifiedProviderRead(await adapter.read(request))});
}

function createGoogleAnalyticsSource({organizationId,fetchImpl=globalThis.fetch,accessToken,propertyId,authorizationVerified=false,resourceVerified=false,clock=()=>new Date()}={}){
 requireText(organizationId,"organization");
 const reader=async({dateRanges=[{startDate:"28daysAgo",endDate:"yesterday"}],dimensions=[{name:"sessionDefaultChannelGroup"},{name:"sessionSource"}],metrics=[{name:"sessions"},{name:"engagedSessions"},{name:"activeUsers"},{name:"eventCount"}],limit="10000",offset="0"}={})=>{
  const property=requireText(propertyId,"ga4_property_id").replace(/^properties\//,"");
  const response=await googleRequest({fetchImpl,accessToken,url:`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`,body:{dateRanges,dimensions,metrics,limit,offset}});
  if(!response.ok)throw new Error(`ga4_http_${response.status}`);
  const payload=await response.json(),observedAt=clock().toISOString(),recordRef=`ga4:${hash(payload)}`;
  return {status:"READ",records:payload.rows||[],evidenceRefs:[recordRef],providerMetadata:{observedAt,rowCount:Number(payload.rowCount||0),metadata:payload.metadata||null}};
 };
 const adapter=createGA4Adapter({configuration:{authorizationVerified,resourceVerified},reader});
 return Object.freeze({...adapter,read:async request=>markVerifiedProviderRead(await adapter.read(request))});
}

function verifiedGoogleEvidence({organizationId,sourceId,sourceVersion="1.0.0",readResult,clock=()=>new Date()}={}){
 if(!["GOOGLE_SEARCH_CONSOLE","GA4"].includes(sourceId))throw new Error("unsupported_google_scout_source");
 if(!VERIFIED_PROVIDER_READS.has(readResult)||readResult?.status!=="READ"||!Array.isArray(readResult.evidenceRefs)||!readResult.evidenceRefs.length)throw new Error("verified_google_read_required");
 const observedAt=readResult.providerMetadata?.observedAt||clock().toISOString(),sourceRecordRef=readResult.evidenceRefs[0];
 return Object.freeze({
  health:ScoutSourceHealth({id:`health:${sourceId}:${hash(sourceRecordRef).slice(0,12)}`,organizationId,sourceId,sourceVersion,status:"OPERATIONAL",authorizationState:"VERIFIED",lastSuccessfulRead:observedAt,lastVerifiedRecord:sourceRecordRef,freshness:"FRESH",rateLimitState:"CLEAR",paginationCompleteness:"COMPLETE",errorState:"NONE",firstFailure:"NONE",humanActionRequired:false,knownLimitations:["Provider records establish observed traffic or behavior, not purchase causality."],evidenceRefs:readResult.evidenceRefs,observedAt,version:1}),
  liveEvidence:ScoutLiveEvidence({id:`live:${sourceId}:${hash(sourceRecordRef).slice(0,12)}`,organizationId,sourceId,sourceVersion,sourceRecordRef,verificationState:"VERIFIED",evidenceClassification:"LIVE_FIRST_PARTY",observedAt,evidenceRefs:readResult.evidenceRefs,limitations:["Live first-party observation is not independent conversion or profitability evidence."],provenance:{provider:"GOOGLE",method:"OFFICIAL_READ_ONLY_API"},version:1})
 });
}

module.exports={SEARCH_SCOPE,ANALYTICS_SCOPE,googleConfigurationFromEnv,createGoogleSearchConsoleSource,createGoogleAnalyticsSource,verifiedGoogleEvidence};
