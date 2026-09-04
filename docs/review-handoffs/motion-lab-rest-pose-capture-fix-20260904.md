# Motion Lab rest-pose capture fix

## Finding
Motion Lab did not own a durable authored rest-pose snapshot. Motion Spec compilation treated whatever local transforms existed at compile time as rest-relative truth. That allowed prior animation/mixer state or any pre-compile mutation to contaminate the baseline.

## Fix
- capture the avatar root/bone local position, quaternion, and scale immediately after a successful avatar load;
- stop all active motion before capture;
- restore the protected snapshot before every Motion Spec compilation and again after compilation;
- fail closed with `rest_pose_missing` if a Motion Spec is compiled without a captured rest pose;
- clear the snapshot when the avatar unloads;
- expose capture/restore diagnostics and a manual recapture API for debugging.

## Validation requested
Run `node --test test/motion-lab-rest-pose-guard.test.js` plus existing Motion Lab/Motion Spec tests. Manually verify: load avatar -> mutate/play/stop -> load synthesized motion -> compiled motion begins from the same authored rest basis.
