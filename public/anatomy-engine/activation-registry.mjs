// Provisional biomechanical hypotheses; no evidence review or release approval yet.
const seeds={
  "push_up": [
    "pectoralis_major",
    "triceps_brachii anterior_deltoid",
    "rectus_abdominis"
  ],
  "incline_push_up": [
    "pectoralis_major",
    "triceps_brachii anterior_deltoid",
    "rectus_abdominis"
  ],
  "bench_press": [
    "pectoralis_major",
    "triceps_brachii anterior_deltoid",
    ""
  ],
  "dumbbell_bench_press": [
    "pectoralis_major",
    "triceps_brachii anterior_deltoid",
    ""
  ],
  "bodyweight_squat": [
    "rectus_femoris vastus_lateralis vastus_medialis gluteus_maximus",
    "",
    "erector_spinae"
  ],
  "goblet_squat": [
    "vastus_lateralis vastus_medialis gluteus_maximus",
    "rectus_femoris",
    "erector_spinae"
  ],
  "back_squat": [
    "vastus_lateralis vastus_medialis gluteus_maximus",
    "rectus_femoris",
    "erector_spinae"
  ],
  "front_squat": [
    "vastus_lateralis vastus_medialis gluteus_maximus",
    "rectus_femoris",
    "erector_spinae"
  ],
  "barbell_deadlift": [
    "gluteus_maximus biceps_femoris semitendinosus",
    "vastus_lateralis vastus_medialis",
    "erector_spinae"
  ],
  "dumbbell_rdl": [
    "gluteus_maximus biceps_femoris semitendinosus",
    "",
    "erector_spinae"
  ],
  "glute_bridge": [
    "gluteus_maximus",
    "biceps_femoris semitendinosus",
    ""
  ],
  "barbell_row": [
    "latissimus_dorsi trapezius",
    "biceps_brachii posterior_deltoid",
    "erector_spinae"
  ],
  "bent_over_barbell_row": [
    "latissimus_dorsi trapezius",
    "biceps_brachii posterior_deltoid",
    "erector_spinae"
  ],
  "band_row": [
    "latissimus_dorsi trapezius",
    "biceps_brachii posterior_deltoid",
    ""
  ],
  "plank": [
    "rectus_abdominis external_oblique",
    "",
    ""
  ],
  "dead_bug": [
    "rectus_abdominis external_oblique",
    "",
    ""
  ],
  "wide_grip_lat_pulldown": [
    "latissimus_dorsi",
    "biceps_brachii",
    ""
  ],
  "romanian_deadlift": [
    "gluteus_maximus biceps_femoris semitendinosus",
    "",
    "erector_spinae"
  ],
  "barbell_lunge": [
    "gluteus_maximus vastus_lateralis vastus_medialis",
    "rectus_femoris",
    "gluteus_medius"
  ],
  "machine_chest_press": [
    "pectoralis_major",
    "triceps_brachii anterior_deltoid",
    ""
  ]
};
export function getActivation(id){
 if(!Object.hasOwn(seeds,id))return {status:'missing',mappings:[],candidates:[]};
 const candidates=seeds[id].flatMap((group,i)=>group.split(' ').filter(Boolean).map(muscleId=>({muscleId,role:['primary','secondary','stabilizer'][i],side:'bilateral'})));
 return {status:'unverified',mappings:[],candidates,evidence:[],reviewRequired:true};
}
export const activationIds=()=>Object.keys(seeds);
