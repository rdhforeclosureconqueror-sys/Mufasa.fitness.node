// Candidate group relationships, never exercise-specific activation.
const groups={
  "abdominals": [
    "rectus_abdominis",
    "external_oblique"
  ],
  "hamstrings": [
    "biceps_femoris",
    "semitendinosus"
  ],
  "calves": [
    "gastrocnemius",
    "soleus"
  ],
  "shoulders": [
    "anterior_deltoid",
    "posterior_deltoid"
  ],
  "adductors": [
    "adductors"
  ],
  "glutes": [
    "gluteus_maximus",
    "gluteus_medius"
  ],
  "quadriceps": [
    "rectus_femoris",
    "vastus_lateralis",
    "vastus_medialis"
  ],
  "biceps": [
    "biceps_brachii"
  ],
  "forearms": [
    "forearm_flexors",
    "forearm_extensors"
  ],
  "abductors": [
    "gluteus_medius"
  ],
  "triceps": [
    "triceps_brachii"
  ],
  "chest": [
    "pectoralis_major"
  ],
  "lower_back": [
    "erector_spinae"
  ],
  "traps": [
    "trapezius"
  ],
  "middle_back": [
    "trapezius"
  ],
  "lats": [
    "latissimus_dorsi"
  ],
  "neck": []
};
const normalize=v=>String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
export function translateClassification(classification={}){
 const candidates=[],unresolved=[],missingRoles=[];
 for(const [role,field] of [['primary','primaryMuscles'],['secondary','secondaryMuscles'],['stabilizer','stabilizers']]){
 const values=classification[field];
 if(!Array.isArray(values)||!values.length){missingRoles.push(role);continue;}
 for(const label of new Set(values.map(normalize))){
 const ids=Object.hasOwn(groups,label)?groups[label]:[];
 if(!ids.length){unresolved.push({label,role});continue;}
 candidates.push({label,role,muscleIds:[...ids],status:'unverified',coverage:'partial_possible'});
 }}
 return {status:candidates.length?'unverified':'missing',candidates,unresolved,missingRoles,mappings:[]};
}
export const supportedGroups=()=>Object.keys(groups);
