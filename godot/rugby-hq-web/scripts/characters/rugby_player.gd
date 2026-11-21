extends CharacterBody3D
class_name RugbyPlayer

enum Role { ATTACKER, SUPPORT, DEFENDER }
@export var role: Role = Role.ATTACKER
@export var movement_speed: float = 5.2
@export var team_color := Color.WHITE
const RUN_SCENE: PackedScene = preload("res://assets/characters/rashad/rashad_run_corrected.glb")
const WALK_SCENE: PackedScene = preload("res://assets/characters/rashad/rashad_walk_corrected.glb")
var velocity_target := Vector3.ZERO
var control_enabled := true
var touch_direction := Vector2.ZERO
var telemetry: Dictionary = {}
var _animation_player: AnimationPlayer
var _idle_name := ""
var _last_animation := ""
@onready var visual: Node3D = $AvatarModel

func _ready() -> void:
	_ensure_input_actions()
	_animation_player = get_node_or_null("AvatarModel/AnimationPlayer") as AnimationPlayer
	if _animation_player:
		for clip_name in _animation_player.get_animation_list():
			if String(clip_name).begins_with("Idle"):
				_idle_name = clip_name
				var library := _animation_player.get_animation_library(&"")
				var idle := _animation_player.get_animation(clip_name).duplicate(true) as Animation
				_clean_clip(idle)
				library.remove_animation(clip_name)
				library.add_animation(clip_name, idle)
	_add_local_clip(RUN_SCENE, "Run", "PocketPT_Run_Corrected")
	_add_local_clip(WALK_SCENE, "Walk", "Animation")
	_apply_team_tint()
	var tag := get_node_or_null("NameTag") as Label3D
	if tag:
		tag.text = ["ATTACKER", "SUPPORT", "DEFENDER"][role]
	_face_visual_direction(Vector3.FORWARD, 1.0)
	_play_animation(_idle_name)

func _physics_process(delta: float) -> void:
	var input_vector := Vector2.ZERO
	if role == Role.ATTACKER:
		input_vector = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		if touch_direction.length_squared() > input_vector.length_squared():
			input_vector = touch_direction
		var camera := get_viewport().get_camera_3d()
		var basis_for_input := camera.global_basis if camera else Basis.IDENTITY
		var right := basis_for_input.x
		var back := basis_for_input.z
		right.y = 0.0
		back.y = 0.0
		var direction := right.normalized() * input_vector.x + back.normalized() * input_vector.y
		var speed := movement_speed * (0.48 if Input.is_action_pressed("walk") else 1.0)
		velocity_target = direction.limit_length(1.0) * speed
	if not control_enabled:
		velocity_target = Vector3.ZERO
	velocity.x = move_toward(velocity.x, velocity_target.x, 18.0 * delta)
	velocity.z = move_toward(velocity.z, velocity_target.z, 18.0 * delta)
	velocity.y = -0.1 if is_on_floor() else velocity.y - 24.0 * delta
	var before := global_position
	move_and_slide()
	var displacement := global_position - before
	displacement.y = 0.0
	var actual_speed := displacement.length() / maxf(delta, 0.000001)
	if actual_speed > 0.15:
		_face_visual_direction(displacement, delta)
		_play_animation("Run" if actual_speed > movement_speed * 0.72 else "Walk")
	else:
		_play_animation(_idle_name)
	telemetry = {"input": input_vector, "desired_velocity": velocity_target,
		"velocity": velocity, "displacement": displacement, "actual_speed": actual_speed,
		"on_floor": is_on_floor(), "collisions": get_slide_collision_count(),
		"body_yaw": rotation.y, "visual_forward": visual.global_basis.z, "animation": _last_animation}

func _face_visual_direction(direction: Vector3, delta: float) -> void:
	var local_direction := global_basis.inverse() * direction
	local_direction.y = 0.0
	if local_direction.length_squared() < 0.000001:
		return
	# This exact Rashad GLB matches the reference model (SHA256 verified).
	# Its authored forward is +Z. Turn visuals only; never the physics body.
	var yaw := atan2(local_direction.x, local_direction.z)
	visual.rotation.y = lerp_angle(visual.rotation.y, yaw, minf(1.0, 12.0 * delta))

func set_ai_velocity(direction: Vector3, speed_scale: float = 1.0) -> void:
	direction.y = 0.0
	velocity_target = direction.normalized() * movement_speed * speed_scale

func set_team_appearance(color: Color) -> void:
	team_color = color
	var bib := find_child("TeamBib", true, false) as MeshInstance3D
	if bib and bib.material_override is StandardMaterial3D:
		(bib.material_override as StandardMaterial3D).albedo_color = color
	_apply_team_tint()

func _ensure_input_actions() -> void:
	var bindings := {"move_left": KEY_A, "move_right": KEY_D, "move_forward": KEY_W, "move_back": KEY_S, "pass_ball": KEY_SPACE, "reset_drill": KEY_R, "walk": KEY_SHIFT}
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		var key := InputEventKey.new()
		key.physical_keycode = bindings[action]
		if not InputMap.action_has_event(action, key):
			InputMap.action_add_event(action, key)
	var arrows := {"move_forward": KEY_UP, "move_back": KEY_DOWN, "move_left": KEY_LEFT, "move_right": KEY_RIGHT}
	for action in arrows:
		var key := InputEventKey.new()
		key.keycode = arrows[action]
		if not InputMap.action_has_event(action, key):
			InputMap.action_add_event(action, key)
func _play_animation(animation_name: StringName) -> void:
	if _animation_player and _animation_player.has_animation(animation_name) and _last_animation != animation_name:
		_last_animation = animation_name
		_animation_player.play(animation_name, 0.18)

func _clean_clip(animation: Animation) -> void:
	animation.loop_mode = Animation.LOOP_LINEAR
	for t in range(animation.get_track_count() - 1, -1, -1):
		var path := str(animation.track_get_path(t))
		if not path.begins_with("Armature/Skeleton3D:"):
			animation.remove_track(t)
			continue
		if path.ends_with(":Hips") and animation.track_get_type(t) == Animation.TYPE_POSITION_3D and animation.track_get_key_count(t) > 0:
			var first: Vector3 = animation.track_get_key_value(t, 0)
			for k in animation.track_get_key_count(t):
				var value: Vector3 = animation.track_get_key_value(t, k)
				value.x = first.x
				value.z = first.z
				animation.track_set_key_value(t, k, value)

func _add_local_clip(source: PackedScene, clip_name: StringName, source_name: StringName) -> void:
	if not _animation_player:
		return
	var source_scene := source.instantiate()
	var source_player := source_scene.find_child("AnimationPlayer", true, false) as AnimationPlayer
	if source_player and source_player.has_animation(source_name):
		var animation := source_player.get_animation(source_name).duplicate(true) as Animation
		for t in animation.get_track_count():
			var path := str(animation.track_get_path(t)).replace("RASHAD_TARGET_ARMATURE/Skeleton3D", "Armature/Skeleton3D")
			animation.track_set_path(t, NodePath(path))
		_clean_clip(animation)
		var library := _animation_player.get_animation_library(&"")
		if library and not library.has_animation(clip_name):
			library.add_animation(clip_name, animation)
	source_scene.free()

func _apply_team_tint() -> void:
	var skeleton := get_node_or_null("AvatarModel/Armature/Skeleton3D") as Skeleton3D
	if skeleton == null or skeleton.find_child("TeamBib", true, false):
		return
	var attachment := BoneAttachment3D.new()
	attachment.name = "TeamBibAttachment"
	attachment.bone_name = "Spine2"
	skeleton.add_child(attachment)
	var bib := MeshInstance3D.new()
	bib.name = "TeamBib"
	var bib_mesh := BoxMesh.new()
	bib_mesh.size = Vector3(0.52, 0.4, 0.24)
	bib.mesh = bib_mesh
	var material := StandardMaterial3D.new()
	material.albedo_color = team_color
	material.roughness = 0.8
	bib.material_override = material
	attachment.add_child(bib)
	bib.position = Vector3(0, -0.08, 0.13)
