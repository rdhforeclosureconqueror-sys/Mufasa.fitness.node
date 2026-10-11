"use strict";

const path = require("path");
const { createUserStore } = require("../repositories/userStore");
const { createMembershipService } = require("../services/membershipService");
const { validateCheckoutConfig, rejectRawPaymentCredentialFields, resolveMembershipReturnUrl, getPublicBillingPlan } = require("../validation/billingValidation");
const { resolvePlanIdFromStripePrice, PLAN_IDS } = require("./membershipPlans");

const COURTESY_TRIAL_DAYS = 7;
const COURTESY_TRIAL_MS = COURTESY_TRIAL_DAYS * 86400000;

function createMembershipTierBridge(options = {}) {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();
  const dataDir = path.resolve(options.dataDir || env.POCKET_PT_DATA_DIR || path.join(rootDir, "data"));
  const userStore = options.userStore || createUserStore({ userDir: path.join(dataDir, "users") });
  userStore.ensureDirs?.();
  const membershipService = options.membershipService || createMembershipService({ userStore, stripeClient: options.stripeClient });
  const requireCanonicalAuth=(req,res,next)=>req.auth?.userId?next():res.status(401).json({ok:false,requestId:req.requestId||null,error:{code:"UNAUTHENTICATED",message:"Authentication required"}});

  function courtesyTrial(userId){
    const trial=userStore.loadUser(userId)?.courtesyTrial;
    if(!trial?.acceptedAt||!trial?.endsAt)return{status:"not_started",accepted:false,active:false,expired:false,startedAt:null,endsAt:null,days:7,cardRequired:false};
    const endsAt=Number(trial.endsAt),active=Number.isFinite(endsAt)&&Date.now()<endsAt;
    return{status:active?"active":"expired",accepted:true,active,expired:!active,startedAt:Number(trial.startedAt||trial.acceptedAt)||null,acceptedAt:Number(trial.acceptedAt)||null,endsAt:Number.isFinite(endsAt)?endsAt:null,days:7,accessLevel:"unleashed",cardRequired:false};
  }
  function expireCourtesyMembershipIfNeeded(userId,trial){
    const membership=membershipService.getMembership(userId);
    if(trial.expired&&membership.plan==="courtesy_trial"&&membership.status==="trialing")return membershipService.updateMembership(userId,{status:"inactive",plan:"free",trialEnd:trial.endsAt});
    return membership;
  }
  function acceptCourtesyTrial(userId){
    const existing=courtesyTrial(userId);if(existing.accepted){expireCourtesyMembershipIfNeeded(userId,existing);return existing;}
    const now=Date.now(),endsAt=now+COURTESY_TRIAL_MS;
    userStore.updateUser(userId,user=>{user.courtesyTrial={acceptedAt:now,startedAt:now,endsAt,accessLevel:"unleashed",cardRequired:false,source:"pocketpt_no_card_trial_v1"};return user;});
    membershipService.updateMembership(userId,{status:"trialing",plan:"courtesy_trial",trialStart:now,trialEnd:endsAt,stripeCustomerId:null,stripeSubscriptionId:null,stripePriceId:null});
    return courtesyTrial(userId);
  }
  function effectiveTier(userId){
    const trial=courtesyTrial(userId);let membership=expireCourtesyMembershipIfNeeded(userId,trial);const paidPlanId=resolvePlanIdFromStripePrice(membership.stripePriceId,env);
    if(membership.plan!=="courtesy_trial"&&membership.hasAccess)return{planId:paidPlanId,status:membership.status,hasAccess:true,source:"membership",trial,stripePriceIdKnown:Boolean(membership.stripePriceId),legacyOrUnmapped:Boolean(membership.stripePriceId&&!paidPlanId)};
    if(trial.active)return{planId:PLAN_IDS.UNLEASHED||"unleashed",status:"trialing",hasAccess:true,source:"courtesy_trial",trial,stripePriceIdKnown:false,legacyOrUnmapped:false};
    return{planId:null,status:trial.expired?"trial_expired":"inactive",hasAccess:false,source:trial.expired?"courtesy_trial":"none",trial,stripePriceIdKnown:false,legacyOrUnmapped:false};
  }
  function sendBridgeError(res,req,error){const status=Number.isInteger(error?.status)?error.status:500,safe=status>=400&&status<=599?status:500;return res.status(safe).json({ok:false,requestId:req.requestId||null,error:{code:error?.code||"MEMBERSHIP_CHECKOUT_FAILED",message:safe>=500?"Membership checkout could not be initialized safely.":(error?.message||"Membership checkout request is invalid."),details:safe<500?(error?.details||null):null}});}
  function register(app){
    app.get("/api/billing/plans",(req,res)=>{res.set("Cache-Control","no-store");return res.status(200).json({ok:true,data:getPublicBillingPlan(env),requestId:req.requestId||null});});
    app.get("/api/me/trial-access",requireCanonicalAuth,(req,res)=>{const trial=courtesyTrial(req.auth.userId);expireCourtesyMembershipIfNeeded(req.auth.userId,trial);res.set("Cache-Control","private, no-store");return res.status(200).json({ok:true,data:trial,requestId:req.requestId||null});});
    app.post("/api/me/trial-access/accept",requireCanonicalAuth,(req,res)=>{const trial=acceptCourtesyTrial(req.auth.userId);res.set("Cache-Control","private, no-store");return res.status(trial.active?201:200).json({ok:true,data:trial,requestId:req.requestId||null});});
    app.get("/api/me/membership-tier",requireCanonicalAuth,(req,res)=>{res.set("Cache-Control","private, no-store");return res.status(200).json({ok:true,data:effectiveTier(req.auth.userId),requestId:req.requestId||null});});
    app.post("/api/billing/tier-checkout-session",requireCanonicalAuth,async(req,res)=>{try{rejectRawPaymentCredentialFields(req.body);const trial=courtesyTrial(req.auth.userId);expireCourtesyMembershipIfNeeded(req.auth.userId,trial);if(!trial.accepted)return res.status(409).json({ok:false,requestId:req.requestId||null,error:{code:"TRIAL_NOT_STARTED",message:"Start the 7-day PocketPT trial before selecting a paid membership."}});if(trial.active)return res.status(409).json({ok:false,requestId:req.requestId||null,error:{code:"TRIAL_STILL_ACTIVE",message:"Your 7-day PocketPT trial is still active. Choose a membership when the trial ends."}});const checkoutConfig=validateCheckoutConfig(env,req.body?.planId),returnUrl=resolveMembershipReturnUrl({env,req,planId:checkoutConfig.planId}),checkout=await membershipService.createCheckoutSession({userId:req.auth.userId,email:req.auth.email,secretKey:checkoutConfig.secretKey,priceId:checkoutConfig.priceId,returnUrl});return res.status(checkout.duplicateProtected?200:201).json({ok:true,data:{...checkout,selectedPlanId:checkoutConfig.planId,selectedPlan:{id:checkoutConfig.plan.id,name:checkoutConfig.plan.name,priceLabel:checkoutConfig.plan.priceLabel,interval:checkoutConfig.plan.interval}},requestId:req.requestId||null});}catch(error){return sendBridgeError(res,req,error);}});
  }
  return Object.freeze({register,membershipService,courtesyTrial,acceptCourtesyTrial,effectiveTier});
}
module.exports={createMembershipTierBridge,COURTESY_TRIAL_DAYS};
