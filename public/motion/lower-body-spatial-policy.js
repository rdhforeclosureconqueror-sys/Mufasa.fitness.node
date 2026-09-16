(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;else root.PocketPTLowerBodySpatialPolicy=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="1.0.0-body-relative-wide-lunge",OPERATOR="standing-asymmetric-wide-lunge-v1";
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
  function degreesAtJoint(a,joint,b){const u={x:a.x-joint.x,y:a.y-joint.y,z:a.z-joint.z},v={x:b.x-joint.x,y:b.y-joint.y,z:b.z-joint.z},ul=Math.hypot(u.x,u.y,u.z),vl=Math.hypot(v.x,v.y,v.z);if(!(ul>0&&vl>0))return null;return Math.acos(clamp((u.x*v.x+u.y*v.y+u.z*v.z)/(ul*vl),-1,1))*180/Math.PI;}
  function resolve(input={}){
    const left=input.left||{},right=input.right||{},classification=input.classification||{},range=classification.stanceWidthLegLengthRatio||{},leftLength=finite(left.upperLength,0)+finite(left.lowerLength,0),rightLength=finite(right.upperLength,0)+finite(right.lowerLength,0);
    if(!(leftLength>0&&rightLength>0))return Object.freeze({status:"failed",code:"LOWER_BODY_LEG_LENGTH_UNAVAILABLE",firstFailedSemanticConstraint:"stance_width_scales_from_leg_length"});
    const effectiveLegLength=(leftLength+rightLength)/2,minimum=finite(range.minimum,1.2),maximum=finite(range.maximum,1.5),requestedRatio=finite(range.preferred,1.35);
    if(requestedRatio<minimum||requestedRatio>maximum)return Object.freeze({status:"failed",code:"LOWER_BODY_STANCE_RATIO_OUT_OF_RANGE",firstFailedSemanticConstraint:"stance_width_scales_from_leg_length"});
    const leadLeg=classification.leadLeg==="right"?"right":"left",trailLeg=leadLeg==="left"?"right":"left",lead=leadLeg==="left"?left:right,trail=trailLeg==="left"?left:right,stanceWidth=effectiveLegLength*requestedRatio,sign=leadLeg==="left"?1:-1,centerX=finite(input.center?.x,0),groundY=finite(input.groundY,0),centerZ=finite(input.center?.z,0);
    const leadAnchor=Object.freeze({x:centerX+sign*stanceWidth/2,y:groundY,z:centerZ}),trailAnchor=Object.freeze({x:centerX-sign*stanceWidth/2,y:groundY,z:centerZ}),leadUpper=finite(lead.upperLength,0),leadLower=finite(lead.lowerLength,0),trailLength=finite(trail.upperLength,0)+finite(trail.lowerLength,0),leadHip=Object.freeze({x:leadAnchor.x-sign*leadUpper,y:groundY+leadLower,z:centerZ}),trailReach=Math.hypot(leadHip.x-trailAnchor.x,leadHip.y-groundY);
    if(trailReach>trailLength*.999)return Object.freeze({status:"failed",code:"LOWER_BODY_TRAILING_LEG_UNREACHABLE",requestedStanceWidthRatio:requestedRatio,resolvedStanceWidth:stanceWidth,leftLegLength:leftLength,rightLegLength:rightLength,firstFailedSemanticConstraint:"trailing_leg_remains_long_and_straight"});
    const currentLeadHip=lead.hip||{x:0,y:0,z:0},rootDelta=Object.freeze({x:leadHip.x-finite(currentLeadHip.x,0),y:leadHip.y-finite(currentLeadHip.y,0),z:leadHip.z-finite(currentLeadHip.z,0)});
    return Object.freeze({status:"ready",operator:OPERATOR,scaleReference:"effective-leg-length",leadLeg,trailLeg,leftLegLength:leftLength,rightLegLength:rightLength,effectiveLegLength,requestedStanceWidthRatio:requestedRatio,resolvedStanceWidth:stanceWidth,actualHeelToHeelDistance:stanceWidth,leadKneeAngleRequestedDegrees:finite(classification.leadKneeAngleDegrees?.preferred,90),leadKneeAngleMeasuredDegrees:90,leadKneeToAnkleHorizontalError:0,trailingKneeAngleDegrees:180,leftFootContact:true,rightFootContact:true,pelvisHeightSource:"lead-leg-geometry:knee-over-ankle-and-thigh-horizontal",leadAnchor,trailAnchor,rootDelta,firstFailedSemanticConstraint:null});
  }
  return Object.freeze({VERSION,OPERATOR,resolve,degreesAtJoint});
});
