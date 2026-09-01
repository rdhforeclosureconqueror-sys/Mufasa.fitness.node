"use strict";

const ALLOWED_SERVICES = new Set(["personal_training","yoga","pranayama","meditation","sound_bowl","integrated"]);
const ALLOWED_LOCATIONS = new Set(["gym","outside","mixed","unsure"]);
const ALLOWED_PAYMENT = new Set(["per_session","weekly_prepaid","monthly_prepaid"]);
const ALLOWED_BUDGETS = new Set(["under_200","200_349","350_499","500_699","700_plus","flexible"]);
const clean = (v,max=500) => String(v == null ? "" : v).trim().slice(0,max);

function createPrivateCoachingQuoteService({ userStore, clock = () => Date.now() }) {
  function validate(input={}) {
    const services = Array.from(new Set(Array.isArray(input.services) ? input.services.map(clean) : [])).filter(v=>ALLOWED_SERVICES.has(v));
    if (!services.length) throw new Error("Choose at least one coaching service");
    const locationPreference=clean(input.locationPreference);
    if(!ALLOWED_LOCATIONS.has(locationPreference)) throw new Error("Choose a training location preference");
    const sessionsPerWeek=Number(input.sessionsPerWeek);
    if(![1,2,3].includes(sessionsPerWeek)) throw new Error("Choose 1, 2, or 3 sessions per week");
    const paymentPreference=clean(input.paymentPreference);
    if(!ALLOWED_PAYMENT.has(paymentPreference)) throw new Error("Choose how you prefer to pay");
    const budgetRange=clean(input.budgetRange);
    if(!ALLOWED_BUDGETS.has(budgetRange)) throw new Error("Choose a budget range");
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