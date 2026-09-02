"use strict";

const ALLOWED_SERVICES = new Set(["personal_training","yoga","pranayama","meditation","sound_bowl","integrated"]);
const ALLOWED_LOCATIONS = new Set(["gym","outside","mixed","unsure"]);
const ALLOWED_PAYMENT = new Set(["per_session","weekly_prepaid","monthly_prepaid"]);
const ALLOWED_BUDGETS = new Set(["under_200","200_349","350_499","500_699","700_plus","flexible"]);
const clean = (v,max=500) => String(v == null ? "" : v).trim().slice(0,max);
function validationError(message,code,details){const error=new Error(message);error.code=code;error.status=422;error.details=details;return error;}

function createPrivateCoachingQuoteService({ userStore, clock = () => Date.now() }) {
  function validate(input={}) {
    const receivedServices=Array.isArray(input.services)?input.services.map(value=>clean(value,80)):[];
    const services = Array.from(new Set(receivedServices)).filter(v=>ALLOWED_SERVICES.has(v));
    if (!services.length) throw validationError("Choose at least one coaching service","PRIVATE_COACHING_SERVICES_INVALID",{receivedServices,bodyKeys:Object.keys(input||{}).filter(key=>key!=="notes")});
    const locationPreference=clean(input.locationPreference);
    if(!ALLOWED_LOCATIONS.has(locationPreference)) throw validationError("Choose a training location preference","PRIVATE_COACHING_LOCATION_INVALID",{received:locationPreference});
    const sessionsPerWeek=Number(input.sessionsPerWeek);
    if(![1,2,3].includes(sessionsPerWeek)) throw validationError("Choose 1, 2, or 3 sessions per week","PRIVATE_COACHING_FREQUENCY_INVALID",{received:sessionsPerWeek});
    const paymentPreference=clean(input.paymentPreference);
    if(!ALLOWED_PAYMENT.has(paymentPreference)) throw validationError("Choose how you prefer to pay","PRIVATE_COACHING_PAYMENT_INVALID",{received:paymentPreference});
    const budgetRange=clean(input.budgetRange);
    if(!ALLOWED_BUDGETS.has(budgetRange)) throw validationError("Choose a budget range","PRIVATE_COACHING_BUDGET_INVALID",{received:budgetRange});
    return { services, locationPreference, sessionsPerWeek, paymentPreference, budgetRange,
      systemInterest:["yes","maybe","no"].includes(clean(input.systemInterest))?clean(input.systemInterest):"maybe",
      notes:clean(input.notes,1200)||null,
      quoteStatus:"requested", pricingPresented:false, paymentRequired:false,
      submittedAt:new Date(clock()).toISOString(), updatedAt:new Date(clock()).toISOString() };
  }
  function save(userId,input){let quote;userStore.updateUser(userId,user=>{quote=validate(input);user.privateCoachingQuote=quote;return user;});return quote;}
  function get(userId){const user=userStore.loadUser(userId);return user?.privateCoachingQuote || null;}
  return {save,get};
}
module.exports={createPrivateCoachingQuoteService};