extends CharacterBody3D
class_name RugbyPlayer

enum Role { ATTACKER, SUPPORT, DEFENDER }
@export var role: Role = Role.ATTACKER
@export var movement_speed: float = 5.2
@export var team_color := Color.WHITE
const RUN_SCENE: PackedScene = preload("res://assets/characters/rashad/rashad_rugby_kit.glb")
const WALK_SCENE: PackedScene = preload("res://assets/characters/rashad/rashad_walk_corrected.glb")
var velocity_target := Vector3.ZERO
var control_enabled := true
var turbo_energy: float = 100.0
var turbo_touch := false
var turbo_keyboard := false
var turbo_active := false
var turbo_exhausted := false
var turbo_recovery_delay := 0.0
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
	_add_local_clip(RUN_SCENE, "Run", "mixamo_com")
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
		var speed := movement_speed * (0.48 if left_shift_held else 1.0)
		var turbo_requested := Input.is_physical_key_pressed(KEY_CTRL) or turbo_touch or turbo_keyboard
		_update_turbo(delta, turbo_requested and input_vector.length() > 0.1 and control_enabled)
		if turbo_active:
			speed = movement_speed * 1.4
		velocity_target = direction.limit_length(1.0) * speed
	else:
		_update_turbo(delta, false)
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
	if role != Role.DEFENDER:
		return
	for child in visual.find_children("*", "MeshInstance3D", true, false):
		var instance: MeshInstance3D = child as MeshInstance3D
		if instance.mesh == null:
			continue
		for surface in range(instance.mesh.get_surface_count()):
			var original: Material = instance.get_active_material(surface)
			if original == null:
				continue
			if not String(original.resource_name).to_lower().contains("avaturn_look_0"):
				continue
			var kit: StandardMaterial3D = original.duplicate() as StandardMaterial3D
			if kit == null:
				continue
			kit.albedo_texture = null
			kit.albedo_color = Color("#C51E36")
			kit.metallic = 0.0
			kit.roughness = 0.85
			instance.set_surface_override_material(surface, kit)
			print("[DEFENSIVE KIT V1.1] RED | ", name)



func _update_turbo(delta: float, requested: bool) -> void:
	turbo_active = requested and not turbo_exhausted and turbo_energy > 0.0
	if turbo_active:
		turbo_energy = maxf(0.0, turbo_energy - delta * 100.0 / 3.0)
		turbo_recovery_delay = 1.0
		if turbo_energy <= 0.0:
			turbo_exhausted = true
			turbo_active = false
	else:
		turbo_recovery_delay = maxf(0.0, turbo_recovery_delay - delta)
		if turbo_recovery_delay <= 0.0:
			turbo_energy = minf(100.0, turbo_energy + delta * 100.0 / 6.0)
		if turbo_energy >= 25.0 and not requested:
			turbo_exhausted = false

func reset_turbo() -> void:
	turbo_keyboard = false
	turbo_energy = 100.0
	turbo_touch = false
	turbo_active = false
	turbo_exhausted = false
	turbo_recovery_delay = 0.0


var left_shift_held := false

func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		if event.keycode == KEY_SHIFT and event.location == KEY_LOCATION_LEFT:
			left_shift_held = event.pressed
