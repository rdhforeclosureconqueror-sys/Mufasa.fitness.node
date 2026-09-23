"use strict";
const base={version:"1.0.0",worldVersion:"1.0.0",probabilityModelVersion:"lcg-1",seed:"phase-8",startTime:"2035-01-01T00:00:00.000Z",startingCash:1000,capacity:{total:2,reserved:0,active:0},scheduledEvents:[],customers:[{id:"customer-1",segment:"SMB",observable:["needs a digital artifact"],hidden:{budget:500,accepts:true},satisfaction:0}],opportunities:[{id:"opportunity-1",source:"SYNTHETIC_MARKET",customerRef:"customer-1",segment:"SMB",problem:"create artifact",observableEvidence:["customer stated need"],discoverable:{objection:"delivery confidence"},hiddenTruth:{willAccept:true},potentialValue:300,urgency:"MEDIUM",risk:"LOW",expiration:"2035-02-01T00:00:00.000Z",requiredCapability:"digital-artifact",confidence:"UNCERTAIN"}],capabilities:[{id:"digital-artifact",productionCost:50,capacityUnits:1,acceptanceCriteria:["valid"],qaContract:"INDEPENDENT_QA_REQUIRED",outputQuality:["valid"],refundTerms:"FULL_BEFORE_ACCEPTANCE"}]};
function make(id,changes={}){return {...structuredClone(base),id,...changes}}
const SCENARIOS=Object.freeze({
 GOLDEN_CYCLE:make("golden-cycle"),
 MARKET_REJECTION:make("market-rejection",{customers:[{...base.customers[0],hidden:{budget:100,accepts:false}}]}),
 TECHNICAL_FAILURE:make("technical-failure",{capabilities:[{...base.capabilities[0],technicalFailure:true}]}),
 QA_REJECTION:make("qa-rejection",{capabilities:[{...base.capabilities[0],outputQuality:["defective"]}]}),
 CAPACITY_CONFLICT:make("capacity-conflict",{capacity:{total:1,reserved:1,active:1}}),
 UNKNOWN_ECONOMICS:make("unknown-economics",{capabilities:[{...base.capabilities[0],unknownCost:true}]}),
 CUSTOMER_CANCELLATION_REFUND:make("customer-cancellation-refund"),
 PROFITABLE_BUT_PROHIBITED:make("profitable-but-prohibited",{opportunities:[{...base.opportunities[0],potentialValue:10000,prohibited:true}]}),
 CONTRADICTORY_MARKET_SIGNALS:make("contradictory-market-signals",{opportunities:[{...base.opportunities[0],observableEvidence:["strong stated need","recent refusal for same problem"]}]}),
 RECOVERY_REPLAN:make("recovery-replan",{capabilities:[{...base.capabilities[0],technicalFailure:true},{...base.capabilities[0],id:"digital-artifact-alternative",productionCost:75}]}),
 ADVERSARIAL:make("adversarial-organism",{capacity:{total:1,reserved:0,active:0},opportunities:[base.opportunities[0],{...base.opportunities[0],id:"opportunity-2",potentialValue:900}],capabilities:[{...base.capabilities[0],unknownCost:true,outputQuality:["defective"]}],scheduledEvents:[{id:"event-1",type:"CAPACITY_CHANGE",at:"2035-01-02T00:00:00.000Z",payload:{total:1}}]})
});
module.exports={SCENARIOS,scenarioList:()=>Object.values(SCENARIOS).map(x=>structuredClone(x))};
