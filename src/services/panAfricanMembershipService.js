"use strict";
// Membership is assigned through trusted administrative provisioning only.
// User-selected interests, URL parameters, and client-supplied profile data never grant access.
function isVerifiedPanAfricanMember(user){
 const membership=user?.communityMemberships?.panAfrican;
 return membership?.status==="approved" &&
   typeof membership.approvedBy==="string" && membership.approvedBy.trim().length>0 &&
   typeof membership.approvedAt==="string" && Number.isFinite(Date.parse(membership.approvedAt));
}
function getPanAfricanAccess(userStore,userId){
 if(!userId) return {authorized:false,reason:"authentication_required"};
 const user=userStore.loadUser(userId);
 if(!user) return {authorized:false,reason:"account_not_found"};
 return {authorized:isVerifiedPanAfricanMember(user),reason:isVerifiedPanAfricanMember(user)?"verified_member":"membership_not_verified"};
}
module.exports={isVerifiedPanAfricanMember,getPanAfricanAccess};
