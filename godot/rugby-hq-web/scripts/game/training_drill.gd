extends Node3D
class_name TrainingDrill

var decision_telemetry = preload("res://scripts/game/rugby_decision_telemetry.gd").new()

const ATTACKER_COLOR := Color(0.12, 0.62, 1.0)
const SUPPORT_COLOR := Color(1.0, 0.62, 0.12)
const DEFENDER_COLOR := Color(0.96, 0.2, 0.24)
const INSTRUCTIONS := "Arrows x2: Turbo | Tap: Pass | 2x: Dummy | Hold: Skip | E: Dummy | R: Restart"
@onready var attacker: RugbyPlayer = $Players/Attacker
@onready var support: RugbyPlayer = $Players/Support
@onready var defender: RugbyPlayer = $Players/Defender
@onready var ball: RigidBody3D = $Ball
@onready var camera: Camera3D = $CameraRig/SpringArm3D/Camera3D
@onready var status_label: Label = $HUD/Status
var controlled_player: RugbyPlayer
var follow_ball := true
var control_mode_button: Button
var possession: RugbyPlayer
var pass_target: RugbyPlayer
var pass_sender: RugbyPlayer
var _pass_cooldown := 0.0
var _tackle_cooldown := 0.0
var _flight_time := 0.0
var _game_over := false
var pass_count := 0
var _message := ""
var _diagnostics := false
var last_touch := Vector2.ZERO
var _pass_touch_index := -1
const PASS_TAP_WINDOW := 0.14
const TURBO_TAP_MS := 250
var _pass_pending := false
var _pass_timer := 0.0
var _pass_owner: RugbyPlayer
var _arrow_taps: Dictionary = {}
var _turbo_keys: Dictionary = {}
var _dummy_cooldown := 0.0
var _dummy_time := 0.0
var _dummy_target: RugbyPlayer
var dummy_count := 0

var scenario_mode := 0
var support_two: RugbyPlayer
var defender_two: RugbyPlayer
const MobileCardLayer = preload("res://scripts/ui/mobile_card_layer.gd")
var _mobile_cards: MobileCardLayer
var _mobile_play_button: Button
var _mobile_settings_buttons: Array[Button] = []
var _mobile_help_button: Button
var _mobile_menu: HBoxContainer
var scenario_selector: OptionButton
var start_play_button: Button
var receiver_selector: OptionButton
var waiting_to_start := true

var countdown_label: Label
var countdown_running := false
var countdown_generation := 0
var pending_receiver: RugbyPlayer

var carrier_selector: OptionButton
var difficulty_selector: OptionButton
var kick_button: Button
var starting_lane := 0
var defense_scale := 0.85
var kick_in_flight := false
var kick_sender: RugbyPlayer
var countdown_remaining := 0.0
var go_remaining := 0.0
var support_lane := -1.0
var support_two_lane := 1.0



var _turbo_button: Button
var _turbo_meter: ProgressBar
var _controller_selector: OptionButton
var _mobile_controller := false
var _last_joystick_tap: int = -10000
var _joystick_held := false
var _joystick_hint: Label

var tactical_camera: Camera3D
var tactical_camera_button: Button
var tactical_camera_mode := 0
const TACTICAL_CAMERA_NAMES := [
	"FOLLOW",
	"WIDE",
	"SIDELINE",
	"OVERHEAD"
]

var preview_angles_enabled := false
var adaptive_v41_mode := 0
var preview_angles_button: Button
var preview_angles_mesh: ImmediateMesh
var preview_angles_instance: MeshInstance3D
var preview_angles_material: StandardMaterial3D
var preview_angles_timer := 0.0

const SKIP_HOLD_SECONDS := 0.35
var pass_gesture_held := false
var pass_gesture_elapsed := 0.0
var pass_gesture_owner: RugbyPlayer
var pass_gesture_second := false
var pass_gesture_consumed := false
var pass_gesture_source := ""

var tactical_routes: Dictionary = {}
var tactical_route_steps: Dictionary = {}
var wedge_attack: Array[RugbyPlayer] = []
var wedge_defense: Array[RugbyPlayer] = []
var timing_v6_scales: Dictionary = {}
var timing_v6_states: Dictionary = {}
var timing_v6_pass_velocity := Vector3.ZERO

func _ready() -> void:
	print("[ADAPTIVE V4.1] INITIALIZED")
	print("[TIMING V6] INITIALIZED")
	controlled_player = attacker
	_setup_turbo_hud()
	_setup_possession_control()
	_setup_playbook_navigation()
	$HUD/PassButton.focus_mode = Control.FOCUS_NONE
	$HUD/PassButton.button_down.connect(
		func(): _begin_pass_gesture("button")
	)
	$HUD/PassButton.button_up.connect(
		func(): _release_pass_gesture("button")
	)
	# Touch supplies a separate vector: it cannot release keyboard-held actions.
	$HUD/VirtualJoystick.action_enabled = false
	$HUD/VirtualJoystick.direction_changed.connect(func(value: Vector2): controlled_player.touch_direction = value)
	_setup_controller_profiles()
	_setup_scenario_engine()
	_setup_wedge_v7()
	_setup_countdown()
	_setup_gameplay_v2()
	_setup_tactical_camera()
	_setup_preview_angles()
	attacker.set_team_appearance(ATTACKER_COLOR)
	support.set_team_appearance(SUPPORT_COLOR)
	defender.set_team_appearance(DEFENDER_COLOR)
	for player in _active_players():
		ball.add_collision_exception_with(player)
		$CameraRig/SpringArm3D.add_excluded_object(player.get_rid())
	$CameraRig/SpringArm3D.add_excluded_object(ball.get_rid())
	_diagnostics = "--rugby-diagnostics" in OS.get_cmdline_user_args()
	_reset_drill()
	_setup_mobile_play_card()

func _input(event: InputEvent) -> void:
	# Modal GUI must receive its own input; do not invoke raw gameplay gestures.
	if is_instance_valid(_mobile_cards) and _mobile_cards.is_open():
		return
	# Keep native menu touch emulation, but consume its duplicate PASS/RESTART
	# mouse events. These two controls also work with a second joystick finger.
	if event is InputEventMouseButton and event.device == -1:
		if $HUD/PassButton.get_global_rect().has_point(event.position) or $HUD/RestartButton.get_global_rect().has_point(event.position):
			get_viewport().set_input_as_handled()
			return
	if event is InputEventScreenTouch:
		last_touch = event.position
		if event.pressed and $HUD/PassButton.get_global_rect().has_point(event.position):
			if _pass_touch_index == -1:
				_pass_touch_index = event.index
				_begin_pass_gesture("touch")
			get_viewport().set_input_as_handled()
			return
		if not event.pressed and event.index == _pass_touch_index:
			_pass_touch_index = -1
			_release_pass_gesture("touch")
			get_viewport().set_input_as_handled()
			return
		if event.pressed and $HUD/RestartButton.get_global_rect().has_point(event.position):
			_reset_drill()
			get_viewport().set_input_as_handled()
			return
	if event is InputEventKey and event.pressed and not event.is_echo():
		if event.keycode in [KEY_K, KEY_KP_0, KEY_0] or (event.keycode == KEY_SHIFT and event.location == KEY_LOCATION_RIGHT):
			_kick_ball()
			get_viewport().set_input_as_handled()
			return
	_handle_advanced_keys(event)
	# Handle gameplay keys before GUI focus can consume Space as ui_accept.
	if event.is_action_pressed("pass_ball") and not event.is_echo():
		_begin_pass_gesture("keyboard")
		get_viewport().set_input_as_handled()
	elif event.is_action_released("pass_ball"):
		_release_pass_gesture("keyboard")
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("reset_drill") and not event.is_echo():
		_reset_drill()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		$CameraRig.rotation.y -= event.relative.x * 0.003
		$CameraRig/SpringArm3D.rotation.x = clampf($CameraRig/SpringArm3D.rotation.x - event.relative.y * 0.003, -0.7, -0.12)

func _physics_process(delta: float) -> void:
	_update_tactical_camera(delta)
	_update_preview_angles(delta)
	_update_countdown(delta)
	if waiting_to_start:
		_update_turbo_hud()
		return
	decision_telemetry.tick(delta, self)
	_update_advanced_gestures(delta)
	_update_turbo_hud()
	_pass_cooldown = maxf(0.0, _pass_cooldown - delta)
	_tackle_cooldown = maxf(0.0, _tackle_cooldown - delta)
	if not _game_over:
		_update_ai(delta)
		if not _game_over:
			_update_extra_players()
		if not _game_over:
			_update_ball(delta)
		if not _game_over and possession and not _is_defense(possession) and possession.global_position.z <= -11.0:
			_end_play("TRY! R to restart")
	$CameraRig.global_position = $CameraRig.global_position.lerp(controlled_player.global_position + Vector3(0, 1.8, 0), 1.0 - exp(-8.0 * delta))
	if _diagnostics:
		status_label.text = _message + "\n" + INSTRUCTIONS + "\n" + str(controlled_player.telemetry)

func _update_ai(_delta: float) -> void:
	if scenario_mode == 5:
		_update_wedge_v7()
		return
	if kick_in_flight:
		if controlled_player != attacker:
			attacker.set_ai_velocity(ball.global_position - attacker.global_position)
		if controlled_player != support:
			support.set_ai_velocity(ball.global_position - support.global_position)
		defender.set_ai_velocity(ball.global_position - defender.global_position, defense_scale)
		return

	_run_support(attacker, 0.0)
	_run_support(support, support_lane)

	var threat: RugbyPlayer = possession

	if threat == null and _flight_time < 0.25:
		threat = pass_sender

	var target := ball.global_position

	if threat:
		target = threat.global_position

		if scenario_mode > 0:
			if defender_two.global_position.distance_to(target) + 0.5 < defender.global_position.distance_to(target):
				var receiver := _selected_receiver()
				if receiver:
					target = receiver.global_position + Vector3(0, 0, -1.5)

	if _dummy_time > 0.0 and _dummy_target and possession:
		target = _dummy_target.global_position

	defender.set_ai_velocity(target - defender.global_position, defense_scale)

	if possession and not _is_defense(possession) and _tackle_cooldown <= 0.0:
		if defender.global_position.distance_to(possession.global_position) < 0.85:
			_set_possession(defender)
			_end_play("Defender won the ball. R to restart")


func _update_ball(delta: float) -> void:
	if kick_in_flight:
		_update_kick_recovery(delta)
		return
	if possession:
		ball.global_position = _ball_hold_position(possession)
		ball.rotation = Vector3(0, possession.visual.global_rotation.y, 0.3)
		return
	_flight_time += delta
	var catcher: RugbyPlayer
	if pass_target and ball.global_position.distance_to(_ball_hold_position(pass_target)) < 1.05:
		catcher = pass_target
	elif _flight_time > 0.22 and ball.global_position.distance_to(defender.global_position + Vector3.UP) < 0.65:
		catcher = defender
	if catcher == null and scenario_mode > 0 and _flight_time > 0.22:
		if ball.global_position.distance_to(defender_two.global_position + Vector3.UP) < 0.65:
			catcher = defender_two
	if catcher == null and scenario_mode == 5 and _flight_time > 0.22:
		for opponent in wedge_defense:
			if ball.global_position.distance_to(opponent.global_position + Vector3.UP) < 0.65:
				catcher = opponent
				break
	if catcher:
		_set_possession(catcher)
		if _is_defense(catcher):
			_end_play("Intercepted! R to restart")
		else:
			_update_status("%s caught it! Space to pass again" % catcher.name)
	elif _flight_time > 3.0 or ball.global_position.y < -1.0:
		_end_play("Loose ball. R to restart")

func _pass_ball() -> void:
	if waiting_to_start or _game_over or possession == null or _is_defense(possession) or _pass_cooldown > 0.0:
		return
	pass_target = pending_receiver if pending_receiver else _selected_receiver()
	pending_receiver = null

	if pass_target == null:
		_update_status("No receiver on that side")
		return

	pass_sender = possession
	decision_telemetry.record("PASS_RELEASE", self)
	var launch := _ball_hold_position(possession)
	var flight_duration := clampf(launch.distance_to(_ball_hold_position(pass_target)) / 13.0, 0.25, 0.65)
	timing_v6_pass_velocity = Vector3(pass_target.velocity.x, 0, pass_target.velocity.z)
	var lead := timing_v6_pass_velocity * flight_duration
	var destination := _ball_hold_position(pass_target) + lead
	possession = null
	ball.collision_layer = 2
	ball.collision_mask = 1
	ball.freeze = false
	ball.sleeping = false
	ball.global_position = launch
	var gravity := float(ProjectSettings.get_setting("physics/3d/default_gravity", 9.8))
	ball.linear_velocity = (destination - launch) / flight_duration + Vector3.UP * gravity * flight_duration * 0.5
	ball.angular_velocity = Vector3(0, 0, 7)
	_flight_time = 0.0
	_pass_cooldown = 0.18
	pass_count += 1
	_update_status("Pass to %s" % pass_target.name)

func _set_possession(player: RugbyPlayer) -> void:
	decision_telemetry.record("POSSESSION_CHANGE", self, {"receiver": str(player.name)})
	kick_in_flight = false
	kick_sender = null
	possession = player
	if follow_ball and not _is_defense(player):
		_transfer_control(player)
	pass_target = null
	pass_sender = null
	ball.freeze = true
	# A carried rigid body must not become a moving obstacle to its carrier.
	ball.collision_layer = 0
	ball.collision_mask = 0
	ball.linear_velocity = Vector3.ZERO
	ball.angular_velocity = Vector3.ZERO
	ball.global_position = _ball_hold_position(player)
	ball.visible = true
	_flight_time = 0.0

func _ball_hold_position(player: RugbyPlayer) -> Vector3:
	var forward := player.visual.global_basis.z.normalized()
	var right := forward.cross(Vector3.UP).normalized()
	return player.global_position + Vector3.UP * 1.12 + right * 0.65 + forward * 0.25

func _reset_drill() -> void:
	_pass_touch_index = -1
	decision_telemetry.active = false
	timing_v6_scales.clear()
	timing_v6_states.clear()
	timing_v6_pass_velocity = Vector3.ZERO
	_transfer_control(attacker)
	kick_in_flight = false
	kick_sender = null
	_reset_advanced_gestures()
	for player in _attack_roster():
		player.reset_turbo()
	_last_joystick_tap = -10000
	_joystick_held = false
	$HUD/VirtualJoystick.cancel_controller_touch()
	_game_over = false
	pass_target = null
	pass_sender = null
	_pass_cooldown = 0.0
	_tackle_cooldown = 1.0
	_flight_time = 0.0
	for player in _active_players():
		player.velocity = Vector3.ZERO
		player.velocity_target = Vector3.ZERO
		player.control_enabled = true
		player.touch_direction = Vector2.ZERO
		player.rotation = Vector3.ZERO
		player._face_visual_direction(Vector3.FORWARD, 1.0)
	attacker.global_position = Vector3(0.0, 0.03, 5.0)
	support.global_position = Vector3(-3.4, 0.03, 6.0)
	defender.global_position = Vector3(0.0, 0.03, -3.0)
	_reset_extra_positions()
	_apply_starting_lane()
	_build_tactical_routes()
	_refresh_control_tags()
	_set_possession(attacker)
	$CameraRig.rotation = Vector3.ZERO
	$CameraRig/SpringArm3D.rotation.x = -0.32
	$CameraRig.global_position = attacker.global_position + Vector3(0, 1.8, 0)
	_prepare_scenario()
	decision_telemetry.active = false

func _end_play(message: String) -> void:
	decision_telemetry.finish(message, self)
	_reset_advanced_gestures()
	controlled_player.turbo_touch = false
	_game_over = true
	for player in _active_players():
		player.control_enabled = false
		player.velocity_target = Vector3.ZERO
		player.velocity = Vector3.ZERO
	_update_status(message)

func _update_status(message: String) -> void:
	_message = message
	status_label.text = message if is_instance_valid(_mobile_cards) else message + "\n" + INSTRUCTIONS


func _setup_turbo_hud() -> void:
	_turbo_button = Button.new()
	_turbo_button.name = "TurboButton"
	_turbo_button.text = "TURBO"
	_turbo_button.focus_mode = Control.FOCUS_NONE
	_turbo_button.add_theme_font_size_override("font_size", 22)
	$HUD.add_child(_turbo_button)
	_turbo_button.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	_turbo_button.offset_left = -150.0
	_turbo_button.offset_right = -25.0
	_turbo_button.offset_top = -190.0
	_turbo_button.offset_bottom = -120.0
	_turbo_button.button_down.connect(func(): controlled_player.turbo_touch = true)
	_turbo_button.button_up.connect(func(): controlled_player.turbo_touch = false)

	_turbo_meter = ProgressBar.new()
	_turbo_meter.name = "SprintEnergy"
	_turbo_meter.max_value = 100.0
	_turbo_meter.value = 100.0
	_turbo_meter.show_percentage = true
	_turbo_meter.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$HUD.add_child(_turbo_meter)
	_turbo_meter.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_turbo_meter.offset_left = -100.0
	_turbo_meter.offset_right = 100.0
	_turbo_meter.offset_top = 85.0
	_turbo_meter.offset_bottom = 110.0

func _update_turbo_hud() -> void:
	if _turbo_meter:
		_turbo_meter.value = controlled_player.turbo_energy
	if _turbo_button:
		_turbo_button.text = "RECOVER" if controlled_player.turbo_exhausted else "TURBO"
		_turbo_button.modulate = Color(0.5, 1.0, 0.6) if controlled_player.turbo_active else Color.WHITE


func _setup_controller_profiles() -> void:
	var joystick = $HUD/VirtualJoystick
	joystick.pressed.connect(_on_joystick_pressed)
	joystick.released.connect(_on_joystick_released)

	_controller_selector = OptionButton.new()
	_controller_selector.name = "ControllerMode"
	_controller_selector.focus_mode = Control.FOCUS_NONE
	_controller_selector.add_item("AUTO", 0)
	_controller_selector.add_item("DESKTOP", 1)
	_controller_selector.add_item("MOBILE", 2)
	$HUD.add_child(_controller_selector)
	_controller_selector.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	_controller_selector.offset_left = -155.0
	_controller_selector.offset_right = -25.0
	_controller_selector.offset_top = 15.0
	_controller_selector.offset_bottom = 55.0
	_controller_selector.item_selected.connect(_apply_controller_profile)

	var restart := Button.new()
	restart.name = "RestartButton"
	restart.text = "RESTART"
	restart.focus_mode = Control.FOCUS_NONE
	$HUD.add_child(restart)
	restart.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	restart.offset_left = -155.0
	restart.offset_right = -25.0
	restart.offset_top = 60.0
	restart.offset_bottom = 100.0
	restart.pressed.connect(_reset_drill)

	_joystick_hint = Label.new()
	_joystick_hint.text = "2x TAP + HOLD: TURBO"
	_joystick_hint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$HUD.add_child(_joystick_hint)
	_joystick_hint.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
	_joystick_hint.offset_left = 20.0
	_joystick_hint.offset_top = -245.0
	_joystick_hint.offset_right = 250.0
	_joystick_hint.offset_bottom = -215.0

	_apply_controller_profile(0)

func _apply_controller_profile(index: int) -> void:
	_reset_advanced_gestures()
	$HUD/VirtualJoystick.cancel_controller_touch()
	controlled_player.touch_direction = Vector2.ZERO
	controlled_player.turbo_touch = false
	_last_joystick_tap = -10000
	_joystick_held = false

	_mobile_controller = index == 2 or (index == 0 and DisplayServer.is_touchscreen_available())

	$HUD/VirtualJoystick.visible = _mobile_controller
	_turbo_button.visible = not _mobile_controller
	_joystick_hint.visible = _mobile_controller

func _on_joystick_pressed() -> void:
	if not _mobile_controller or _game_over:
		return

	var now := Time.get_ticks_msec()
	_joystick_held = true

	if now - _last_joystick_tap <= 250:
		controlled_player.turbo_touch = true
		_last_joystick_tap = -10000
	else:
		controlled_player.turbo_touch = false
		_last_joystick_tap = now

func _on_joystick_released() -> void:
	_joystick_held = false
	controlled_player.turbo_touch = false

func _handle_advanced_keys(event: InputEvent) -> void:
	if not event is InputEventKey:
		return
	if event.is_echo():
		return

	var key: int = event.keycode

	if key in [KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT]:
		if event.pressed and not _game_over:
			var now := Time.get_ticks_msec()
			var previous: int = _arrow_taps.get(key, -10000)
			if now - previous <= TURBO_TAP_MS:
				_turbo_keys[key] = true
				_arrow_taps.erase(key)
			else:
				_arrow_taps[key] = now
		elif not event.pressed:
			_turbo_keys.erase(key)

		controlled_player.turbo_keyboard = not _turbo_keys.is_empty()

	if key == KEY_E and event.pressed:
		_clear_pass_gesture()
		pending_receiver = null
		_pass_pending = false
		_pass_owner = null
		_dummy_pass()

func _pass_gesture_valid() -> bool:
	return (
		not waiting_to_start
		and not _game_over
		and possession != null
		and not _is_defense(possession)
		and not kick_in_flight
		and _pass_cooldown <= 0.0
	)


func _begin_pass_gesture(source: String) -> void:
	if pass_gesture_held:
		return
	if not _pass_gesture_valid():
		if _game_over:
			_update_status("Play ended. Tap RESTART to try again.")
		elif waiting_to_start:
			_update_status("Tap START PLAY and wait for GO.")
		elif possession == null:
			_update_status("Ball in flight. Wait for the catch.")
		elif _is_defense(possession):
			_update_status("Defender has the ball. Tap RESTART.")
		else:
			_update_status("Pass recovering. Try again.")
		return

	pass_gesture_held = true
	pass_gesture_elapsed = 0.0
	pass_gesture_consumed = false
	pass_gesture_source = source
	pass_gesture_owner = possession

	pass_gesture_second = (
		_pass_pending
		and _pass_timer > 0.0
		and _pass_owner == possession
	)

	_pass_pending = false
	_pass_owner = null
	pending_receiver = null


func _release_pass_gesture(source: String) -> void:
	if not pass_gesture_held:
		return

	if source != pass_gesture_source:
		return

	pass_gesture_held = false

	if pass_gesture_consumed:
		_clear_pass_gesture()
		return

	if not _pass_gesture_valid() or possession != pass_gesture_owner:
		_clear_pass_gesture()
		return

	if pass_gesture_elapsed >= SKIP_HOLD_SECONDS:
		_execute_skip_pass()
		_clear_pass_gesture()
		return

	if pass_gesture_second:
		_clear_pass_gesture()
		print("[PASS IQ] DUMMY")
		_dummy_pass()
		return

	_pass_pending = true
	_pass_timer = PASS_TAP_WINDOW
	_pass_owner = possession
	_clear_pass_gesture()


func _clear_pass_gesture() -> void:
	pass_gesture_held = false
	pass_gesture_elapsed = 0.0
	pass_gesture_owner = null
	pass_gesture_second = false
	pass_gesture_consumed = false
	pass_gesture_source = ""


func _register_pass_tap() -> void:
	_begin_pass_gesture("legacy")
	_release_pass_gesture("legacy")


func _update_advanced_gestures(delta: float) -> void:
	_dummy_cooldown = maxf(0.0, _dummy_cooldown - delta)
	_dummy_time = maxf(0.0, _dummy_time - delta)

	if pass_gesture_held:
		if pass_gesture_consumed:
			return

		if not _pass_gesture_valid() or possession != pass_gesture_owner:
			_clear_pass_gesture()
			return

		pass_gesture_elapsed += delta

		if pass_gesture_elapsed >= SKIP_HOLD_SECONDS:
			pass_gesture_consumed = true
			_execute_skip_pass()

		return

	if _pass_pending:
		_pass_timer -= delta

		if _pass_timer <= 0.0:
			_pass_pending = false
			var owner := _pass_owner
			_pass_owner = null

			if possession == owner and _pass_gesture_valid():
				_execute_short_pass()


func _passing_options() -> Array[RugbyPlayer]:
	var candidates: Array[RugbyPlayer] = []

	if possession == null:
		return candidates

	var teammates: Array[RugbyPlayer] = _attack_roster()

	for teammate in teammates:
		if teammate == possession:
			continue

		# Attack direction is negative Z.
		# Require a level or deeper receiving position.
		if teammate.global_position.z < possession.global_position.z:
			continue

		candidates.append(teammate)

	candidates.sort_custom(
		func(a: RugbyPlayer, b: RugbyPlayer) -> bool:
			return (
				a.global_position.distance_squared_to(possession.global_position)
				< b.global_position.distance_squared_to(possession.global_position)
			)
	)

	if scenario_mode == 5:
		var preferred: Array[RugbyPlayer] = []
		if possession == attacker:
			preferred = [support, support_two]
		elif possession == support_two:
			preferred = [wedge_attack[0], wedge_attack[1]]
		elif possession == wedge_attack[1]:
			preferred = [wedge_attack[2]]
		var ordered: Array[RugbyPlayer] = []
		for receiver in preferred:
			if receiver in candidates:
				ordered.append(receiver)
		for receiver in candidates:
			if receiver not in ordered:
				ordered.append(receiver)
		return ordered
	return candidates


func _execute_short_pass() -> void:
	var options := _passing_options()

	if options.is_empty():
		_update_status("No legal support receiver")
		return

	pending_receiver = options[0]

	print("[PASS IQ] SHORT | ", pending_receiver.name)

	decision_telemetry.record(
		"SHORT_PASS_SELECTED",
		self,
		{"receiver": str(pending_receiver.name)}
	)

	_pass_ball()


func _execute_skip_pass() -> void:
	var options := _passing_options()

	if options.is_empty():
		_update_status("No legal support receiver")
		return

	if options.size() == 1:
		_execute_short_pass()
		return

	pending_receiver = options[1]

	print("[PASS IQ] SKIP | ", pending_receiver.name)

	decision_telemetry.record(
		"SKIP_PASS_SELECTED",
		self,
		{
			"bypassed": str(options[0].name),
			"receiver": str(pending_receiver.name)
		}
	)

	_pass_ball()


func _dummy_pass() -> void:
	if waiting_to_start or _game_over or possession == null or _is_defense(possession):
		return

	if _dummy_cooldown > 0.0:
		_update_status("Dummy recovering")
		return

	if _pass_cooldown > 0.0:
		return

	_dummy_cooldown = 2.0
	dummy_count += 1
	decision_telemetry.record("DUMMY_EXECUTED", self)

	var distance := defender.global_position.distance_to(possession.global_position)

	if distance >= 1.0 and distance <= 4.0:
		_dummy_target = _selected_receiver()

		if _dummy_target == null:
			_update_status("DUMMY! No support on that side")
			return
		_dummy_time = 0.4
		decision_telemetry.record("DUMMY_REACTION_TRIGGERED", self)
		_update_status("DUMMY! Defender drawn toward support")
	else:
		_update_status("DUMMY! Defender not committed")

func _reset_advanced_gestures() -> void:
	_clear_pass_gesture()
	pending_receiver = null
	_pass_pending = false
	_pass_timer = 0.0
	_pass_owner = null
	_arrow_taps.clear()
	_turbo_keys.clear()
	controlled_player.turbo_keyboard = false
	_dummy_cooldown = 0.0
	_dummy_time = 0.0
	_dummy_target = null
	dummy_count = 0

func _setup_scenario_engine() -> void:
	var player_scene := preload("res://scenes/characters/rashad_player.tscn")

	support_two = player_scene.instantiate() as RugbyPlayer
	support_two.name = "SupportTwo"
	support_two.role = RugbyPlayer.Role.SUPPORT
	$Players.add_child(support_two)
	support_two.set_team_appearance(SUPPORT_COLOR)

	defender_two = player_scene.instantiate() as RugbyPlayer
	defender_two.name = "DefenderTwo"
	defender_two.role = RugbyPlayer.Role.DEFENDER
	$Players.add_child(defender_two)
	defender_two.set_team_appearance(DEFENDER_COLOR)

	for player in [support_two, defender_two]:
		ball.add_collision_exception_with(player)
		$CameraRig/SpringArm3D.add_excluded_object(player.get_rid())

	scenario_selector = OptionButton.new()
	scenario_selector.name = "ScenarioSelector"
	scenario_selector.focus_mode = Control.FOCUS_NONE
	scenario_selector.add_item("2 v 1", 0)
	scenario_selector.add_item("2 v 2", 1)
	scenario_selector.add_item("2 v 3", 2)
	scenario_selector.add_item("THREE DEEP", 3)
	scenario_selector.add_item("WEDGE | 2v3", 4)
	scenario_selector.add_item("DOUBLE WEDGE | 6v4", 5)
	$HUD.add_child(scenario_selector)
	scenario_selector.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	scenario_selector.offset_left = -100
	scenario_selector.offset_right = 100
	scenario_selector.offset_top = 120
	scenario_selector.offset_bottom = 158
	scenario_selector.item_selected.connect(_change_scenario)

	start_play_button = Button.new()
	start_play_button.text = "START PLAY"
	start_play_button.focus_mode = Control.FOCUS_NONE
	$HUD.add_child(start_play_button)
	start_play_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	start_play_button.offset_left = -100
	start_play_button.offset_right = 100
	start_play_button.offset_top = -24
	start_play_button.offset_bottom = 24
	start_play_button.pressed.connect(_start_scenario)

	receiver_selector = OptionButton.new()
	receiver_selector.focus_mode = Control.FOCUS_NONE
	receiver_selector.add_item("PASS LEFT")
	receiver_selector.add_item("PASS RIGHT")
	$HUD.add_child(receiver_selector)
	receiver_selector.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	receiver_selector.offset_left = -150
	receiver_selector.offset_right = -25
	receiver_selector.offset_top = -245
	receiver_selector.offset_bottom = -200
	receiver_selector.hide()

	_set_extra_active(support_two, false)
	_set_extra_active(defender_two, false)


func _active_players() -> Array[RugbyPlayer]:
	if scenario_mode == 5:
		var roster: Array[RugbyPlayer] = _attack_roster()
		roster.append_array(_defense_roster())
		return roster
	var players: Array[RugbyPlayer] = [attacker, support, defender]

	if scenario_mode > 0 and defender_two:
		players.append(defender_two)

	if scenario_mode >= 2 and support_two:
		players.append(support_two)

	return players


func _set_extra_active(player: RugbyPlayer, enabled: bool) -> void:
	player.visible = enabled
	player.set_physics_process(enabled)
	player.control_enabled = enabled
	player.collision_layer = 1 if enabled else 0
	player.collision_mask = 1 if enabled else 0
	player.velocity = Vector3.ZERO
	player.velocity_target = Vector3.ZERO


func _change_scenario(index: int) -> void:
	scenario_mode = index
	_set_tactical_camera(1 if index >= 3 else 0)
	starting_lane = 0
	_refresh_carrier_options()
	_reset_drill()


func _reset_extra_positions() -> void:
	for extra in wedge_attack + wedge_defense:
		_set_extra_active(extra, scenario_mode == 5)
	_set_extra_active(defender_two, scenario_mode > 0)
	_set_extra_active(support_two, scenario_mode >= 2)

	defender_two.global_position = Vector3(3.5, 0.03, -3.0)
	support_two.global_position = Vector3(3.4, 0.03, 6.0)

	if scenario_mode > 0:
		defender.global_position = Vector3(-2.0, 0.03, -3.0)

	defender_two._face_visual_direction(Vector3.BACK, 1.0)
	support_two._face_visual_direction(Vector3.FORWARD, 1.0)

	receiver_selector.select(0)
	receiver_selector.hide()


func _prepare_scenario() -> void:
	countdown_generation += 1
	countdown_running = false
	countdown_label.hide()
	countdown_remaining = 0.0
	go_remaining = 0.0
	carrier_selector.disabled = false
	difficulty_selector.disabled = false
	pending_receiver = null
	waiting_to_start = true
	scenario_selector.disabled = false
	if is_instance_valid(_mobile_play_button):
		_mobile_play_button.disabled = false
		for button in _mobile_settings_buttons:
			button.disabled = false
		_mobile_help_button.disabled = false
		_mobile_menu.show()
		_mobile_play_button.text = scenario_selector.get_item_text(scenario_selector.selected) + " ▾"
	start_play_button.show()
	control_mode_button.disabled = false

	for player in _active_players():
		player.control_enabled = false
		player.velocity = Vector3.ZERO
		player.velocity_target = Vector3.ZERO

	_update_status("QUIN NATION | " + ["2 v 1", "2 v 2", "2 v 3", "THREE DEEP", "WEDGE", "DOUBLE WEDGE"][scenario_mode] + " | READY")


func _start_scenario() -> void:
	if countdown_running or not waiting_to_start:
		return

	countdown_running = true
	countdown_remaining = 3.0
	go_remaining = 0.0

	scenario_selector.disabled = true
	if is_instance_valid(_mobile_play_button):
		_mobile_play_button.disabled = true
		for button in _mobile_settings_buttons:
			button.disabled = true
		_mobile_help_button.disabled = true
		_mobile_menu.hide()
	carrier_selector.disabled = true
	difficulty_selector.disabled = true
	start_play_button.hide()
	control_mode_button.disabled = true

	countdown_label.text = "3"
	countdown_label.show()
	_update_status("GET READY")


func _selected_receiver() -> RugbyPlayer:
	if possession == null:
		return null

	var candidates: Array[RugbyPlayer] = _attack_roster()

	candidates.erase(possession)

	if candidates.size() == 1:
		return candidates[0]

	var direction := _action_direction()
	var side := 0

	if direction.x < -0.25:
		side = -1
	elif direction.x > 0.25:
		side = 1

	var preferred: RugbyPlayer = null
	var nearest: RugbyPlayer = null
	var preferred_distance := INF
	var nearest_distance := INF

	for teammate in candidates:
		var offset := teammate.global_position - possession.global_position
		var distance := offset.length()

		if distance < nearest_distance:
			nearest_distance = distance
			nearest = teammate

		var matches_side := side == 0 or (side < 0 and offset.x < -0.15) or (side > 0 and offset.x > 0.15)

		if matches_side and distance < preferred_distance:
			preferred_distance = distance
			preferred = teammate

	return preferred if preferred else nearest


func _update_extra_players() -> void:
	if scenario_mode in [0, 5]:
		return

	if kick_in_flight:
		if scenario_mode >= 2 and controlled_player != support_two:
			support_two.set_ai_velocity(ball.global_position - support_two.global_position)

		defender_two.set_ai_velocity(ball.global_position - defender_two.global_position, defense_scale)
		return

	if scenario_mode >= 2:
		_run_support(support_two, support_two_lane)

	var target := ball.global_position

	if possession:
		target = possession.global_position

		if defender.global_position.distance_to(target) <= defender_two.global_position.distance_to(target) + 0.5:
			var receiver := _selected_receiver()

			if receiver:
				target = receiver.global_position + Vector3(0, 0, -1.5)

	defender_two.set_ai_velocity(target - defender_two.global_position, defense_scale)

	if possession and not _is_defense(possession) and _tackle_cooldown <= 0.0:
		if defender_two.global_position.distance_to(possession.global_position) < 0.85:
			_set_possession(defender_two)
			_end_play("Cover defender won the ball. R to restart")


func _setup_countdown() -> void:
	countdown_label = Label.new()
	countdown_label.name = "PlayCountdown"
	countdown_label.z_index = 100
	countdown_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	countdown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	countdown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	countdown_label.add_theme_font_size_override("font_size", 100)
	countdown_label.add_theme_color_override("font_color", Color(1.0, 0.84, 0.35))
	countdown_label.add_theme_color_override("font_outline_color", Color.BLACK)
	countdown_label.add_theme_constant_override("outline_size", 12)

	$HUD.add_child(countdown_label)

	countdown_label.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	countdown_label.offset_left = -150
	countdown_label.offset_right = 150
	countdown_label.offset_top = -90
	countdown_label.offset_bottom = 90
	countdown_label.hide()


func _setup_gameplay_v2() -> void:
	carrier_selector = OptionButton.new()
	carrier_selector.focus_mode = Control.FOCUS_NONE
	$HUD.add_child(carrier_selector)
	carrier_selector.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	carrier_selector.offset_left = -105
	carrier_selector.offset_right = 105
	carrier_selector.offset_top = 165
	carrier_selector.offset_bottom = 205
	carrier_selector.item_selected.connect(_change_starting_lane)

	difficulty_selector = OptionButton.new()
	difficulty_selector.focus_mode = Control.FOCUS_NONE
	difficulty_selector.add_item("LEARNING")
	difficulty_selector.add_item("TRAINING")
	difficulty_selector.add_item("MATCH")
	difficulty_selector.select(1)
	$HUD.add_child(difficulty_selector)
	difficulty_selector.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	difficulty_selector.offset_left = -105
	difficulty_selector.offset_right = 105
	difficulty_selector.offset_top = 212
	difficulty_selector.offset_bottom = 252
	difficulty_selector.item_selected.connect(_change_difficulty)

	kick_button = Button.new()
	kick_button.text = "KICK"
	kick_button.focus_mode = Control.FOCUS_NONE
	kick_button.add_theme_font_size_override("font_size", 22)
	$HUD.add_child(kick_button)
	kick_button.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	kick_button.offset_left = -150
	kick_button.offset_right = -25
	kick_button.offset_top = -270
	kick_button.offset_bottom = -200
	kick_button.pressed.connect(_kick_ball)

	_refresh_carrier_options()


func _refresh_carrier_options() -> void:
	carrier_selector.clear()
	if scenario_mode == 5:
		carrier_selector.add_item("BALL: #10")
		carrier_selector.select(0)
		return
	carrier_selector.add_item("BALL: A1")
	carrier_selector.add_item("BALL: A2")

	if scenario_mode >= 2:
		carrier_selector.add_item("BALL: A3")

	carrier_selector.select(starting_lane)


func _change_starting_lane(index: int) -> void:
	starting_lane = index
	_reset_drill()


func _change_difficulty(index: int) -> void:
	defense_scale = [0.70, 0.85, 1.0][index]


func _apply_starting_lane() -> void:
	if scenario_mode == 5:
		_place_wedge_v7()
		return
	var slots: Array[Vector3] = [
		Vector3(0, 0.03, 5),
		Vector3(-3.4, 0.03, 6)
	]

	if scenario_mode >= 2:
		slots.append(Vector3(3.4, 0.03, 6))

	if scenario_mode == 3:
		slots = [
			Vector3(-5.0, 0.03, 2.0),
			Vector3(0.0, 0.03, 5.0),
			Vector3(5.0, 0.03, 8.0)
		]
		defender.global_position = Vector3(-3.0, 0.03, -5.0)
		defender_two.global_position = Vector3(3.0, 0.03, -5.0)

	if scenario_mode == 4:
		slots = [
			Vector3(-4.0, 0.03, 3.0),
			Vector3(0.0, 0.03, 5.0),
			Vector3(-7.0, 0.03, 7.0)
		]
		defender.global_position = Vector3(-3.0, 0.03, -6.0)
		defender_two.global_position = Vector3(3.0, 0.03, -6.0)

	attacker.global_position = slots[starting_lane]

	var tag := attacker.get_node("NameTag") as Label3D
	tag.text = "A%d - YOU" % (starting_lane + 1)

	var remaining: Array[int] = []

	for i in range(slots.size()):
		if i != starting_lane:
			remaining.append(i)

	support.global_position = slots[remaining[0]]
	support_lane = signf(support.global_position.x - attacker.global_position.x)
	var support_tag := support.get_node("NameTag") as Label3D
	support_tag.text = "A%d" % (remaining[0] + 1)

	if scenario_mode >= 2:
		support_two.global_position = slots[remaining[1]]
		support_two_lane = signf(support_two.global_position.x - attacker.global_position.x)

		if support_two_lane == support_lane:
			support_two_lane *= 2.0

		var second_tag := support_two.get_node("NameTag") as Label3D
		second_tag.text = "A%d" % (remaining[1] + 1)


func _update_countdown(delta: float) -> void:
	if countdown_running:
		countdown_remaining = maxf(0.0, countdown_remaining - delta)

		if countdown_remaining > 0.0:
			countdown_label.text = str(ceili(countdown_remaining))
			countdown_label.show()
			return

		countdown_running = false
		waiting_to_start = false
		countdown_label.text = "GO!"
		countdown_label.show()
		go_remaining = 0.5

		for player in _active_players():
			player.control_enabled = true

		decision_telemetry.begin()
		_update_status("PLAY LIVE")

	elif go_remaining > 0.0:
		go_remaining -= delta

		if go_remaining <= 0.0:
			countdown_label.hide()


func _action_direction() -> Vector3:
	if possession == null:
		return Vector3.FORWARD

	var direction := possession.velocity_target

	if possession == controlled_player:
		var movement := Input.get_vector("move_left", "move_right", "move_forward", "move_back")

		if controlled_player.touch_direction.length_squared() > movement.length_squared():
			movement = controlled_player.touch_direction

		if movement.length() > 0.1:
			var right := get_viewport().get_camera_3d().global_basis.x
			var back := get_viewport().get_camera_3d().global_basis.z
			right.y = 0.0
			back.y = 0.0
			direction = right.normalized() * movement.x + back.normalized() * movement.y

	direction.y = 0.0

	if direction.length() < 0.1:
		direction = possession.visual.global_basis.z
		direction.y = 0.0

	if direction.length() < 0.1:
		return Vector3.FORWARD

	return direction.normalized()


func _run_support(runner: RugbyPlayer, lane: float) -> void:
	if runner == controlled_player:
		return
	if possession == runner:
		timing_v6_scales.erase(runner)
		timing_v6_states.erase(runner)
		runner.set_ai_velocity(_support_escape_direction(runner))
		return
	var points: Array = tactical_routes.get(runner, [])
	if points.is_empty():
		return
	var step: int = tactical_route_steps.get(runner, 0)
	var offset: Vector3 = points[step] - runner.global_position
	offset.y = 0.0
	if offset.length() < 0.65 and step < points.size() - 1:
		step += 1
		tactical_route_steps[runner] = step
		offset = points[step] - runner.global_position
		offset.y = 0.0
	var route_distance := offset.length()
	if route_distance > 1.2:
		offset = _adaptive_v41_direction(runner, offset, step) * route_distance
	# Preserve receiving depth while the ball is held.
	if possession and not _is_defense(possession):
		if runner.global_position.z <= possession.global_position.z + 0.7 and offset.z < 0.0:
			offset.z = 0.0
	_timing_v6_drive(runner, offset, step, points)

func _assigned_support_target(runner: RugbyPlayer, lane: float) -> Vector3:
	var target := attacker.global_position

	if scenario_mode in [3, 4]:
		var anchor: RugbyPlayer = possession if possession else attacker

		if anchor == defender or anchor == defender_two:
			return runner.global_position

		target = anchor.global_position

		if scenario_mode == 3:
			var depth := 2.0 if runner == support else 4.0
			target += Vector3(lane * 3.5, 0.0, depth)
		else:
			if runner == support:
				target += Vector3(1.8, 0.0, 0.65)
			else:
				target += Vector3(5.0, 0.0, 3.0)

		target.x = clampf(target.x, -14.0, 14.0)
	else:
		target += Vector3(lane * 3.3, 0.0, 1.0)
		target.x = clampf(target.x, -14.5, 14.5)

	target.z = clampf(target.z, -10.5, 10.5)
	return target


func _kick_ball() -> void:
	if waiting_to_start or _game_over or possession == null:
		return

	if _is_defense(possession):
		return

	var direction := _action_direction()

	_clear_pass_gesture()
	_pass_pending = false
	_pass_owner = null
	pending_receiver = null

	kick_sender = possession
	kick_in_flight = true
	decision_telemetry.record("KICK_RELEASE", self)

	var launch := possession.global_position + Vector3.UP * 0.35 + direction * 0.8

	possession = null
	pass_target = null
	pass_sender = null

	ball.freeze = false
	ball.collision_layer = 2
	ball.collision_mask = 1
	ball.sleeping = false
	ball.global_position = launch
	ball.linear_velocity = direction * 12.0 + Vector3.UP * 0.8
	ball.angular_velocity = Vector3(8, 0, 3)

	_flight_time = 0.0
	_update_status("GRUBBER! Chase the ball")


func _update_kick_recovery(delta: float) -> void:
	_flight_time += delta

	if _flight_time > 0.25:
		var closest: RugbyPlayer = null
		var closest_distance := INF

		for player in _active_players():
			if player == kick_sender and _flight_time < 0.6:
				continue

			var offset := ball.global_position - player.global_position
			var height := offset.y
			offset.y = 0.0

			if height < 1.5 and height > -0.2 and offset.length() < 0.95:
				if offset.length() < closest_distance:
					closest = player
					closest_distance = offset.length()

		if closest:
			decision_telemetry.record("KICK_RECOVERY", self, {"receiver": str(closest.name)})
			_set_possession(closest)

			if _is_defense(closest):
				_end_play("Defense recovered the kick")
			else:
				_tackle_cooldown = 0.15
				_update_status("Kick recovered! Keep attacking")

			return

	if _flight_time > 7.0 or ball.global_position.y < -1.0:
		_end_play("Loose kick. R to restart")


var _support_iq_log_time := -10000
var _support_iq_last_runner: RugbyPlayer

func _support_escape_direction(runner: RugbyPlayer) -> Vector3:
	var opponents: Array[RugbyPlayer] = _defense_roster()

	var best_direction := Vector3.FORWARD
	var best_score := -INF
	var best_angle := 0.0
	var origin := runner.global_position

	var current_direction := runner.velocity_target
	current_direction.y = 0.0

	if current_direction.length() < 0.1:
		current_direction = Vector3.FORWARD

	current_direction = current_direction.normalized()

	for step in range(-12, 13):
		var angle := float(step) * 5.0

		var direction := Vector3.FORWARD.rotated(
			Vector3.UP,
			deg_to_rad(angle)
		)

		var score := direction.dot(Vector3.FORWARD) * 2.0
		score += direction.dot(current_direction) * 0.4

		var minimum_clearance := 20.0
		var risk := 0.0

		for sample in range(1, 7):
			var horizon := float(sample) * 0.2

			var future := origin + direction * runner.movement_speed * horizon

			if future.z < -11.0:
				future.z = -11.0

			if absf(future.x) > 14.3:
				score -= 60.0

			for opponent in opponents:
				var momentum := opponent.velocity
				momentum.y = 0.0

				var predicted := opponent.global_position + momentum * minf(horizon, 0.35)

				var offset := future - predicted
				offset.y = 0.0

				var reach := opponent.movement_speed * defense_scale * maxf(0.0, horizon - 0.35)

				var clearance := offset.length() - reach

				minimum_clearance = minf(minimum_clearance, clearance)

				if clearance < 1.5:
					risk += (1.5 - clearance) * 12.0

		score += clampf(minimum_clearance, -3.0, 3.0) * 5.0
		score -= risk

		if score > best_score:
			best_score = score
			best_direction = direction
			best_angle = angle

	var now := Time.get_ticks_msec()

	if runner != _support_iq_last_runner or now - _support_iq_log_time >= 250:
		print(
			"[SUPPORT IQ] Player: ", runner.name,
			" | Angle: ", best_angle,
			" | Direction X: ", best_direction.x,
			" | Score: ", snappedf(best_score, 0.01)
		)

		_support_iq_log_time = now
		_support_iq_last_runner = runner

	return best_direction


func _run_wedge_assignment(runner: RugbyPlayer) -> void:
	var anchor: RugbyPlayer = possession if possession else attacker

	if anchor == defender or anchor == defender_two:
		runner.set_ai_velocity(Vector3.ZERO)
		return

	var target := anchor.global_position

	if runner == support:
		# CRASH: close toward the inside seam.
		target.x += 1.8
		target.z += 0.65
	else:
		# BACKDOOR: preserve width and receiving depth.
		target.x += 5.0
		target.z += 3.0

	target.x = clampf(target.x, -14.0, 14.0)
	target.z = clampf(target.z, -10.5, 10.5)

	var offset := target - runner.global_position
	offset.y = 0.0

	runner.set_ai_velocity(
		offset,
		clampf(offset.length(), 0.0, 1.0)
	)


func _setup_tactical_camera() -> void:
	tactical_camera = Camera3D.new()
	tactical_camera.name = "TacticalCamera"
	tactical_camera.fov = 65.0
	tactical_camera.near = 0.05
	tactical_camera.far = 200.0
	add_child(tactical_camera)

	tactical_camera_button = Button.new()
	tactical_camera_button.text = "CAM: FOLLOW"
	tactical_camera_button.focus_mode = Control.FOCUS_NONE

	$HUD.add_child(tactical_camera_button)

	tactical_camera_button.set_anchors_and_offsets_preset(
		Control.PRESET_CENTER_TOP
	)

	tactical_camera_button.offset_left = -80.0
	tactical_camera_button.offset_right = 80.0
	tactical_camera_button.offset_top = 82.0
	tactical_camera_button.offset_bottom = 124.0

	tactical_camera_button.pressed.connect(
		func():
			_set_tactical_camera(
				(tactical_camera_mode + 1) % 4
			)
	)

	_set_tactical_camera(0)


func _set_tactical_camera(mode: int) -> void:
	if not is_instance_valid(tactical_camera):
		return

	tactical_camera_mode = mode

	tactical_camera_button.text = (
		"CAM: " + TACTICAL_CAMERA_NAMES[mode]
	)

	if mode == 0:
		camera.make_current()
	else:
		_update_tactical_camera(1.0)
		tactical_camera.make_current()

	print(
		"[TACTICAL CAMERA] ",
		TACTICAL_CAMERA_NAMES[mode]
	)


func _update_tactical_camera(delta: float) -> void:
	if not is_instance_valid(tactical_camera):
		return

	if tactical_camera_mode == 0:
		return

	var players := _active_players()

	if players.is_empty():
		return

	var center := Vector3.ZERO

	for player in players:
		center += player.global_position

	center /= float(players.size())

	var radius := 4.0

	for player in players:
		radius = maxf(
			radius,
			player.global_position.distance_to(center)
		)

	radius = maxf(
		radius,
		ball.global_position.distance_to(center)
	)

	var viewport_size := get_viewport().get_visible_rect().size
	var aspect := viewport_size.x / maxf(viewport_size.y, 1.0)

	var vertical_half := deg_to_rad(32.5)
	var horizontal_half := atan(tan(vertical_half) * aspect)
	var limiting_half := minf(vertical_half, horizontal_half)

	var distance := maxf(
		12.0,
		(radius + 2.5) / sin(limiting_half)
	)

	var direction := Vector3(0.0, 0.85, 1.0)

	match tactical_camera_mode:
		1:
			direction = Vector3(0.0, 0.85, 1.0)
		2:
			direction = Vector3(1.0, 0.65, 0.0)
		3:
			direction = Vector3(0.0, 1.0, 0.12)

	var target := center + Vector3(0.0, 0.7, 0.0)

	var destination := (
		target + direction.normalized() * distance
	)

	var smoothing := 1.0 - exp(-7.0 * delta)

	tactical_camera.global_position = (
		tactical_camera.global_position.lerp(
			destination,
			smoothing
		)
	)

	tactical_camera.look_at(target, Vector3.UP)


func _setup_preview_angles() -> void:
	preview_angles_mesh = ImmediateMesh.new()
	preview_angles_instance = MeshInstance3D.new()
	preview_angles_instance.name = "TacticalRunningRibbons"
	preview_angles_instance.mesh = preview_angles_mesh
	preview_angles_instance.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF

	preview_angles_material = StandardMaterial3D.new()
	preview_angles_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	preview_angles_material.vertex_color_use_as_albedo = true
	preview_angles_material.cull_mode = BaseMaterial3D.CULL_DISABLED

	add_child(preview_angles_instance)
	preview_angles_instance.hide()

	preview_angles_button = Button.new()
	preview_angles_button.name = "PreviewAnglesButton"
	preview_angles_button.text = "ANGLES: OFF"
	preview_angles_button.focus_mode = Control.FOCUS_NONE

	$HUD.add_child(preview_angles_button)

	preview_angles_button.set_anchors_and_offsets_preset(
		Control.PRESET_TOP_RIGHT
	)

	preview_angles_button.offset_left = -155.0
	preview_angles_button.offset_right = -25.0
	preview_angles_button.offset_top = 108.0
	preview_angles_button.offset_bottom = 150.0

	preview_angles_button.pressed.connect(
		_toggle_preview_angles
	)


func _toggle_preview_angles() -> void:
	adaptive_v41_mode = (adaptive_v41_mode + 1) % 3
	preview_angles_enabled = adaptive_v41_mode != 0
	preview_angles_button.text = ["ANGLES: OFF", "ASSIGNED", "ADAPTIVE"][adaptive_v41_mode]

	preview_angles_instance.visible = preview_angles_enabled
	preview_angles_timer = 0.0

	if preview_angles_enabled:
		_update_preview_angles(1.0)

	print("[TACTICAL PREVIEW] ", preview_angles_enabled)


func _update_preview_angles(delta: float) -> void:
	if not is_instance_valid(preview_angles_instance):
		return

	if not preview_angles_enabled:
		return

	preview_angles_timer -= delta

	if preview_angles_timer > 0.0:
		return

	preview_angles_timer = 0.10
	preview_angles_mesh.clear_surfaces()

	if _game_over:
		return

	preview_angles_mesh.surface_begin(
		Mesh.PRIMITIVE_TRIANGLES,
		preview_angles_material
	)

	var gold := Color("#f5cc62")
	var orange := Color("#ff947e")
	var blue := Color("#72c9ff")

	_draw_tactical_route(attacker, gold)

	_draw_support_preview(support, support_lane, orange)

	if scenario_mode >= 2:
		_draw_support_preview(
			support_two,
			support_two_lane,
			blue
		)

	if scenario_mode == 5:
		for i in range(wedge_attack.size()):
			_draw_tactical_route(wedge_attack[i], [orange, blue, Color("#7ae5a0")][i])
	preview_angles_mesh.surface_end()


func _draw_support_preview(runner: RugbyPlayer, lane: float, color: Color) -> void:
	_draw_tactical_route(runner, color)

func _draw_preview_arrow(
	origin: Vector3,
	destination: Vector3,
	color: Color
) -> void:
	origin.y = 0.09
	destination.y = 0.09

	destination.x = clampf(destination.x, -14.5, 14.5)
	destination.z = clampf(destination.z, -11.0, 11.0)

	var offset := destination - origin
	var length := offset.length()

	if length < 0.15:
		return

	var direction := offset.normalized()
	var side := direction.cross(Vector3.UP).normalized()

	var head_length := minf(0.75, length * 0.45)
	var neck := destination - direction * head_length

	var a := origin + side * 0.12
	var b := origin - side * 0.12
	var c := neck + side * 0.12
	var d := neck - side * 0.12

	_preview_triangle(a, b, c, color)
	_preview_triangle(b, d, c, color)

	_preview_triangle(
		neck + side * 0.36,
		neck - side * 0.36,
		destination,
		color
	)


func _preview_triangle(
	a: Vector3,
	b: Vector3,
	c: Vector3,
	color: Color
) -> void:
	for point in [a, b, c]:
		preview_angles_mesh.surface_set_color(color)
		preview_angles_mesh.surface_add_vertex(point)

func _build_tactical_routes() -> void:
	tactical_routes.clear()
	tactical_route_steps.clear()
	if scenario_mode == 5:
		_build_wedge_v7_routes()
		return
	var players: Array[RugbyPlayer] = [attacker, support]
	if scenario_mode >= 2:
		players.append(support_two)
	var slots: Array[RugbyPlayer] = players.duplicate()
	# Restore slot order regardless of starting carrier.
	slots.remove_at(0)
	slots.insert(starting_lane, attacker)
	for i in range(slots.size()):
		var runner: RugbyPlayer = slots[i]
		var p := runner.global_position
		var points: Array[Vector3] = [p]
		match scenario_mode:
			0:
				points.append(p + Vector3(0, 0, -3))
				points.append(Vector3(p.x + (-1.5 if i == 1 else 0.0), p.y, -10.0))
			1:
				points.append(p + Vector3(1.0 if i == 1 else -0.5, 0, -3))
				points.append(Vector3(-0.5 if i == 1 else 1.5, p.y, -10.0))
			2:
				points.append(p + Vector3(0, 0, -3))
				points.append(Vector3(p.x * 1.5, p.y, -10.0))
			3:
				points.append(p + Vector3(0, 0, -3))
				points.append(Vector3(p.x, p.y, -10.0))
			4:
				if i == 0:
					points.append(Vector3(-3, p.y, -1))
					points.append(Vector3(-3, p.y, -10))
				elif i == 1:
					points.append(Vector3(-0.8, p.y, 2.5))
					points.append(Vector3(-1.8, p.y, -2))
					points.append(Vector3(-1.8, p.y, -10))
				else:
					points.append(Vector3(-5.5, p.y, 8))
					points.append(Vector3(-2.5, p.y, 7.5))
					points.append(Vector3(2.0, p.y, 5.5))
					points.append(Vector3(5.5, p.y, 1.0))
					points.append(Vector3(6.5, p.y, -10))
		tactical_routes[runner] = points
		tactical_route_steps[runner] = 1
		if scenario_mode == 4:
			var tag := runner.get_node("NameTag") as Label3D
			tag.text = ["10 PLAYMAKER", "13 CRASH", "6 BACKDOOR"][i] + (" - YOU" if runner == attacker else "")
	print("[TACTICAL ROUTES V3] Scenario ", scenario_mode, " | Routes: ", tactical_routes.size())

func _draw_tactical_route(runner: RugbyPlayer, color: Color) -> void:
	var points: Array = tactical_routes.get(runner, [])
	for i in range(1, points.size()):
		if adaptive_v41_mode == 2:
			_adaptive_v41_dashes(points[i - 1], points[i], color)
		else:
			_draw_preview_arrow(points[i - 1], points[i], color)
	if adaptive_v41_mode == 2 and runner != controlled_player and runner != possession and not kick_in_flight and not points.is_empty():
		var step: int = tactical_route_steps.get(runner, 1)
		var offset: Vector3 = points[step] - runner.global_position
		offset.y = 0.0
		if offset.length() < 0.65 and step < points.size() - 1:
			step += 1
			offset = points[step] - runner.global_position
			offset.y = 0.0
		var direction := _adaptive_v41_direction(runner, offset, step)
		if possession and not _is_defense(possession):
			if runner.global_position.z <= possession.global_position.z + 0.7 and direction.z < 0.0:
				direction.z = 0.0
		_draw_preview_arrow(runner.global_position, runner.global_position + direction.normalized() * minf(3.5, offset.length()), color)

func _adaptive_v41_direction(runner: RugbyPlayer, offset: Vector3, step: int) -> Vector3:
	var assigned := offset.normalized()
	var points: Array = tactical_routes.get(runner, [])
	if offset.length() <= 1.2 or (scenario_mode in [4, 5] and points.size() == 6 and step <= 3):
		return assigned
	var best := assigned
	var best_score := -INF
	for index in range(-5, 6):
		var direction := assigned.rotated(Vector3.UP, deg_to_rad(float(index) * 5.0))
		var score := direction.dot(assigned) * 12.0
		for sample in range(1, 4):
			var horizon := float(sample) * 0.2
			var future := runner.global_position + direction * minf(runner.movement_speed * horizon, offset.length())
			if absf(future.x) > 14.0 or absf(future.z) > 10.5:
				score -= 100.0
			for other in _active_players():
				if other == runner:
					continue
				var predicted := other.global_position + other.velocity * horizon
				predicted.y = future.y
				var clearance := future.distance_to(predicted)
				if _is_defense(other):
					score += minf(clearance, 4.0) * 0.6
					score -= maxf(0.0, 1.5 - clearance) * 4.0
				else:
					score -= maxf(0.0, 1.5 - clearance) * 3.0
			if possession and not _is_defense(possession):
				if future.z < possession.global_position.z + possession.velocity.z * horizon + 0.5:
					score -= 6.0
		if score > best_score:
			best_score = score
			best = direction
	return best

func _adaptive_v41_dashes(origin: Vector3, destination: Vector3, color: Color) -> void:
	var offset := destination - origin
	offset.y = 0.0
	var length := offset.length()
	if length < 0.1:
		return
	var direction := offset.normalized()
	var side := direction.cross(Vector3.UP).normalized() * 0.065
	var distance := 0.0
	while distance < length:
		var a := origin + direction * distance
		var b := origin + direction * minf(distance + 0.35, length)
		a.y = 0.075
		b.y = 0.075
		_preview_triangle(a + side, a - side, b + side, color.darkened(0.25))
		_preview_triangle(a - side, b - side, b + side, color.darkened(0.25))
		distance += 0.65

func _setup_possession_control() -> void:
	control_mode_button = Button.new()
	control_mode_button.text = "CONTROL: BALL"
	control_mode_button.focus_mode = Control.FOCUS_NONE
	$HUD.add_child(control_mode_button)
	control_mode_button.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	control_mode_button.offset_left = -155
	control_mode_button.offset_right = -25
	control_mode_button.offset_top = 158
	control_mode_button.offset_bottom = 198
	control_mode_button.pressed.connect(_toggle_possession_control)
	print("[POSSESSION V5] INITIALIZED")

func _toggle_possession_control() -> void:
	if not waiting_to_start or countdown_running:
		return
	follow_ball = not follow_ball
	control_mode_button.text = "CONTROL: BALL" if follow_ball else "CONTROL: FIXED"
	_reset_drill()

func _refresh_control_tags() -> void:
	for runner in tactical_routes.keys():
		var tag := runner.get_node("NameTag") as Label3D
		tag.text = tag.text.replace(" - YOU", "")
		if runner == controlled_player:
			tag.text += " - YOU"

func _transfer_control(next_player: RugbyPlayer) -> void:
	if next_player == null or next_player == controlled_player:
		return
	var previous := controlled_player
	if previous:
		next_player.touch_direction = previous.touch_direction
		next_player.turbo_touch = previous.turbo_touch
		next_player.turbo_keyboard = previous.turbo_keyboard
		previous.touch_direction = Vector2.ZERO
		previous.turbo_touch = false
		previous.turbo_keyboard = false
		previous.turbo_active = false
		previous.role = RugbyPlayer.Role.SUPPORT
		previous.velocity_target = Vector3.ZERO
		# Resume at a forward waypoint instead of running back to the start.
		var points: Array = tactical_routes.get(previous, [])
		if points.size() > 1:
			var step: int = tactical_route_steps.get(previous, 1)
			while step < points.size() - 1 and points[step].z > previous.global_position.z:
				step += 1
			tactical_route_steps[previous] = step
	timing_v6_scales.erase(next_player)
	timing_v6_states.erase(next_player)
	controlled_player = next_player
	controlled_player.role = RugbyPlayer.Role.ATTACKER
	_refresh_control_tags()
	if previous:
		decision_telemetry.record("CONTROL_TRANSFER", self, {"from": str(previous.name), "to": str(next_player.name)})
		print("[POSSESSION V5] CONTROL ", previous.name, " -> ", next_player.name)


func _timing_v6_drive(runner: RugbyPlayer, offset: Vector3, step: int, points: Array) -> void:
	var direction := offset.normalized()
	var scale := clampf(offset.length(), 0.0, 1.0)
	var state := "BUILD"
	if possession == null and pass_target == runner:
		# Preserve the velocity used by the existing pass lead calculation.
		runner.set_ai_velocity(timing_v6_pass_velocity, timing_v6_pass_velocity.length() / maxf(runner.movement_speed, 0.01))
		_timing_v6_record(runner, "RECEIVE", timing_v6_pass_velocity.length() / maxf(runner.movement_speed, 0.01))
		return
	if possession and not _is_defense(possession):
		var depth := runner.global_position.z - possession.global_position.z
		var carrier_speed := maxf(0.0, -possession.velocity.z)
		var pressure := possession.global_position.distance_to(defender.global_position)
		for opponent in _defense_roster():
			pressure = minf(pressure, possession.global_position.distance_to(opponent.global_position))
		var pace := clampf(0.45 + carrier_speed / maxf(runner.movement_speed, 0.01) * 0.55, 0.45, 1.0)
		if scenario_mode in [4, 5] and points.size() == 6 and step <= 3:
			pace = minf(pace, 0.75)
			state = "WRAP"
		elif pressure < 3.5 and depth > 1.5:
			pace = 1.0
			state = "ACCELERATE"
		elif depth > 3.0:
			pace = maxf(pace, 0.85)
			state = "RECOVER"
		if direction.z < -0.05:
			var allowed := maxf(0.0, carrier_speed + (depth - 0.9) / 0.45)
			var cap := allowed / maxf(-direction.z * runner.movement_speed, 0.01)
			if cap < pace:
				pace = cap
				state = "HOLD_DEPTH"
		scale = minf(scale, pace)
	if offset.length() < 0.05:
		state = "HOLD_DEPTH"
	var previous: float = timing_v6_scales.get(runner, 0.0)
	# Ease acceleration; apply restrictive depth caps immediately.
	scale = minf(scale, previous + 2.5 / float(Engine.physics_ticks_per_second))
	runner.set_ai_velocity(offset, scale)
	_timing_v6_record(runner, state, scale)

func _timing_v6_record(runner: RugbyPlayer, state: String, scale: float) -> void:
	timing_v6_scales[runner] = scale
	if timing_v6_states.get(runner, "") != state:
		timing_v6_states[runner] = state
		decision_telemetry.record("SUPPORT_TIMING", self, {"runner": str(runner.name), "state": state, "target_scale": scale})

func _attack_roster() -> Array[RugbyPlayer]:
	var roster: Array[RugbyPlayer] = [attacker, support]
	if scenario_mode >= 2:
		roster.append(support_two)
	if scenario_mode == 5:
		roster.append_array(wedge_attack)
	return roster

func _defense_roster() -> Array[RugbyPlayer]:
	var roster: Array[RugbyPlayer] = [defender]
	if scenario_mode > 0:
		roster.append(defender_two)
	if scenario_mode == 5:
		roster.append_array(wedge_defense)
	return roster

func _is_defense(player: RugbyPlayer) -> bool:
	return player != null and player in _defense_roster()

func _setup_wedge_v7() -> void:
	var scene := preload("res://scenes/characters/rashad_player.tscn")
	for i in range(5):
		var player := scene.instantiate() as RugbyPlayer
		player.name = ["Wedge15", "Wedge11", "Wedge14", "Defense3", "Defense4"][i]
		player.role = RugbyPlayer.Role.SUPPORT if i < 3 else RugbyPlayer.Role.DEFENDER
		$Players.add_child(player)
		player.set_team_appearance(SUPPORT_COLOR if i < 3 else DEFENDER_COLOR)
		if i < 3:
			wedge_attack.append(player)
		else:
			wedge_defense.append(player)
		ball.add_collision_exception_with(player)
		$CameraRig/SpringArm3D.add_excluded_object(player.get_rid())
		_set_extra_active(player, false)
	print("[DOUBLE WEDGE V7] INITIALIZED")

func _place_wedge_v7() -> void:
	var slots := [Vector3(-9,0.03,2), Vector3(-5,0.03,4), Vector3(-12,0.03,6), Vector3(3,0.03,7), Vector3(-2,0.03,9), Vector3(12,0.03,9)]
	var labels := ["10 PLAYMAKER", "13 CRASH", "6 BACKDOOR", "15 CRASH", "11 BACKDOOR", "14 WIDE"]
	var roster := _attack_roster()
	for i in range(roster.size()):
		roster[i].global_position = slots[i]
		var tag := roster[i].get_node("NameTag") as Label3D
		tag.text = labels[i]
	var defense := _defense_roster()
	for i in range(defense.size()):
		defense[i].global_position = Vector3(-10.5 + 7.0 * i, 0.03, -6)
		defense[i]._face_visual_direction(Vector3.BACK, 1.0)
		var tag := defense[i].get_node("NameTag") as Label3D
		tag.text = "D%d" % (i + 1)

func _build_wedge_v7_routes() -> void:
	var routes := [
		[Vector3(-8,0.03,-2), Vector3(-8,0.03,-10)],
		[Vector3(-6,0.03,1), Vector3(-7,0.03,-4), Vector3(-7,0.03,-10)],
		[Vector3(-10,0.03,7), Vector3(-7,0.03,7), Vector3(-3,0.03,5), Vector3(0,0.03,1), Vector3(0,0.03,-10)],
		[Vector3(2,0.03,4), Vector3(1,0.03,-2), Vector3(1,0.03,-10)],
		[Vector3(0,0.03,10), Vector3(3,0.03,9), Vector3(6,0.03,7), Vector3(8,0.03,3), Vector3(8,0.03,-10)],
		[Vector3(13,0.03,5), Vector3(13,0.03,-10)]
	]
	var roster := _attack_roster()
	for i in range(roster.size()):
		var points: Array[Vector3] = [roster[i].global_position]
		for point in routes[i]:
			points.append(point)
		tactical_routes[roster[i]] = points
		tactical_route_steps[roster[i]] = 1
	print("[DOUBLE WEDGE V7] ROSTER 6 ATTACK / 4 DEFENSE | ROUTES 6")

func _update_wedge_v7() -> void:
	for runner in _attack_roster():
		if runner == controlled_player:
			continue
		if kick_in_flight:
			runner.set_ai_velocity(ball.global_position - runner.global_position)
		else:
			_run_support(runner, 0.0)
	var target := ball.global_position if possession == null else possession.global_position
	var defense := _defense_roster()
	var nearest: RugbyPlayer = defense[0]
	for opponent in defense:
		if opponent.global_position.distance_squared_to(target) < nearest.global_position.distance_squared_to(target):
			nearest = opponent
	for i in range(defense.size()):
		var opponent := defense[i]
		var destination := target
		if not kick_in_flight and opponent != nearest:
			destination = Vector3(clampf(target.x + float(i - defense.find(nearest)) * 4.0, -14.0, 14.0), target.y, target.z - 1.5)
		if opponent == nearest and _dummy_time > 0.0 and _dummy_target and possession:
			destination = _dummy_target.global_position
		opponent.set_ai_velocity(destination - opponent.global_position, defense_scale)
		if possession and not _is_defense(possession) and _tackle_cooldown <= 0.0 and opponent.global_position.distance_to(possession.global_position) < 0.85:
			_set_possession(opponent)
			_end_play("Defense won the ball. R to restart")
			return


func _setup_playbook_navigation() -> void:
	var return_button := Button.new()
	return_button.name = "ReturnToPlaybookButton"
	return_button.text = "PLAYBOOK ARENA"
	return_button.focus_mode = Control.FOCUS_NONE
	return_button.add_theme_font_size_override("font_size", 15)
	$HUD.add_child(return_button)
	return_button.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	return_button.offset_left = -190.0
	return_button.offset_right = -25.0
	return_button.offset_top = 206.0
	return_button.offset_bottom = 250.0
	return_button.pressed.connect(_return_to_playbook, CONNECT_DEFERRED)
	print("[ARENA NAVIGATION V8A.2] READY")

func _return_to_playbook() -> void:
	var result: Error = get_tree().change_scene_to_file("res://playbook/playbook_arena.tscn")
	if result != OK:
		_update_status("Unable to open Playbook Arena")

# V8C first adapter: reuse the real scenario selector and its existing signal.
func _setup_mobile_play_card() -> void:
	if not MobileCardLayer.is_mobile():
		return
	_mobile_cards = MobileCardLayer.new()
	add_child(_mobile_cards)
	_mobile_cards.card_closed.connect(_restore_mobile_play_controls)
	_mobile_play_button = Button.new()
	_mobile_play_button.name = "MobilePickYourPlay"
	_mobile_play_button.focus_mode = Control.FOCUS_NONE
	_mobile_play_button.add_theme_font_size_override("font_size", 24)
	$HUD.add_child(_mobile_play_button)
	_mobile_play_button.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_mobile_play_button.offset_left = -145.0
	_mobile_play_button.offset_right = 145.0
	_mobile_play_button.offset_top = 126.0
	_mobile_play_button.offset_bottom = 164.0
	_mobile_play_button.text = scenario_selector.get_item_text(scenario_selector.selected) + " ▾"
	_mobile_play_button.pressed.connect(_open_mobile_play_card)
	scenario_selector.hide()
	carrier_selector.hide()
	difficulty_selector.hide()
	_controller_selector.hide()
	preview_angles_button.hide()
	control_mode_button.hide()
	$HUD/ReturnToPlaybookButton.hide()
	status_label.text = _message
	_mobile_settings_buttons.append(_mobile_shortcut("DRILL SETTINGS", 15.0, _open_mobile_drill_settings))
	_mobile_settings_buttons.append(_mobile_shortcut("TRAINING MODE", 79.0, _open_mobile_training_mode))
	_mobile_settings_buttons.append(_mobile_shortcut("SETTINGS / PLAYBOOK", 143.0, _open_mobile_advanced_settings))
	_mobile_help_button = _mobile_shortcut("CONTROLS", 207.0, _open_mobile_controls)
	_setup_mobile_layout()

func _open_mobile_play_card() -> void:
	if not waiting_to_start or countdown_running or scenario_selector.disabled:
		return
	var entries: Array[Dictionary] = []
	for index in range(scenario_selector.item_count):
		var selected_prefix := "• " if index == scenario_selector.selected else ""
		entries.append({"label": selected_prefix + scenario_selector.get_item_text(index), "action": _select_mobile_play.bind(index), "enabled": not scenario_selector.is_item_disabled(index)})
	_open_mobile_card("PICK YOUR PLAY", entries, _mobile_play_button)

func _select_mobile_play(index: int) -> void:
	if scenario_selector.disabled or not waiting_to_start or countdown_running:
		return
	scenario_selector.select(index)
	scenario_selector.item_selected.emit(index)
	_mobile_play_button.text = scenario_selector.get_item_text(scenario_selector.selected) + " ▾"

func _restore_mobile_play_controls() -> void:
	$HUD/VirtualJoystick.visible = _mobile_controller

func _mobile_shortcut(label: String, top: float, action: Callable) -> Button:
	var button := Button.new()
	button.text = label
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 22)
	$HUD.add_child(button)
	button.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	button.offset_left = -280.0
	button.offset_right = -25.0
	button.offset_top = top
	button.offset_bottom = top + 58.0
	button.pressed.connect(action)
	return button

func _open_mobile_card(heading: String, entries: Array[Dictionary], focus_return: Control = null) -> void:
	# Configuration is restricted to ready state. Help is also restricted until a safe pause is implemented.
	if not waiting_to_start or countdown_running:
		return
	_reset_advanced_gestures()
	_pass_touch_index = -1
	$HUD/VirtualJoystick.cancel_controller_touch()
	controlled_player.touch_direction = Vector2.ZERO
	controlled_player.turbo_touch = false
	_joystick_held = false
	$HUD/VirtualJoystick.hide()
	_mobile_cards.open_card(heading, entries, focus_return)

func _mobile_option_entries(selector: OptionButton) -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	for index in range(selector.item_count):
		var prefix := "• " if index == selector.selected else ""
		entries.append({"label": prefix + selector.get_item_text(index), "action": _select_mobile_option.bind(selector, index), "enabled": not selector.disabled and not selector.is_item_disabled(index)})
	return entries

func _select_mobile_option(selector: OptionButton, index: int) -> void:
	if not waiting_to_start or countdown_running or selector.disabled:
		return
	if index < 0 or index >= selector.item_count or selector.is_item_disabled(index):
		return
	selector.select(index)
	selector.item_selected.emit(index)

func _open_mobile_drill_settings() -> void:
	_open_mobile_card("DRILL SETTINGS — BALL CARRIER", _mobile_option_entries(carrier_selector))

func _open_mobile_training_mode() -> void:
	_open_mobile_card("TRAINING MODE", _mobile_option_entries(difficulty_selector))

func _open_mobile_advanced_settings() -> void:
	var entries: Array[Dictionary] = [
		{"label": "Controller profile", "action": _open_mobile_controller_profile},
		{"label": preview_angles_button.text, "action": _mobile_existing_button.bind(preview_angles_button), "enabled": not preview_angles_button.disabled},
		{"label": control_mode_button.text, "action": _mobile_existing_button.bind(control_mode_button), "enabled": not control_mode_button.disabled},
		{"label": "PLAYBOOK ARENA", "action": _mobile_existing_button.bind($HUD/ReturnToPlaybookButton)}
	]
	_open_mobile_card("ADVANCED SETTINGS", entries)

func _open_mobile_controller_profile() -> void:
	_open_mobile_card("CONTROLLER PROFILE", _mobile_option_entries(_controller_selector))

func _mobile_existing_button(button: Button) -> void:
	if waiting_to_start and not countdown_running and not button.disabled:
		button.pressed.emit()

func _open_mobile_controls() -> void:
	var entries: Array[Dictionary] = [
		{"label": "Joystick: move your player", "enabled": false},
		{"label": "Double tap and hold joystick: turbo", "enabled": false},
		{"label": "Tap PASS: pass; double tap: dummy", "enabled": false},
		{"label": "Hold PASS: skip pass; KICK: kick", "enabled": false},
		{"label": "START PLAY: begin; RESTART: reset", "enabled": false}
	]
	_open_mobile_card("MOBILE CONTROLS", entries)

# V8C compact ready-state shortcuts; keep the field free during the rep.
func _setup_mobile_layout() -> void:
	_mobile_menu = HBoxContainer.new()
	$HUD.add_child(_mobile_menu)
	_mobile_menu.set_anchors_and_offsets_preset(Control.PRESET_CENTER_TOP)
	_mobile_menu.grow_horizontal = Control.GROW_DIRECTION_BOTH
	_mobile_menu.add_theme_constant_override("separation", 8)
	var shortcuts: Array[Button] = [_mobile_play_button]
	shortcuts.append_array(_mobile_settings_buttons)
	shortcuts.append(_mobile_help_button)
	for button in shortcuts:
		button.reparent(_mobile_menu, false)
		button.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		button.custom_minimum_size = Vector2(0, 70)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size", 24)
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_mobile_settings_buttons[0].text = "DRILL"
	_mobile_settings_buttons[1].text = "MODE"
	_mobile_settings_buttons[2].text = "SETTINGS"
	get_viewport().size_changed.connect(_resize_mobile_layout)
	_resize_mobile_layout()

func _resize_mobile_layout() -> void:
	var viewport_size := get_viewport().get_visible_rect().size
	var width := maxf(1.0, viewport_size.x)
	var height := maxf(1.0, viewport_size.y)
	var menu_width := minf(width - 32.0, 1100.0)
	_mobile_menu.offset_left = -menu_width * 0.5
	_mobile_menu.offset_right = menu_width * 0.5
	_mobile_menu.offset_top = 76.0
	_mobile_menu.offset_bottom = 146.0
	# These bounds also drive the existing raw PASS/RESTART touch hit tests.
	var action_size := clampf(height * 0.15, 80.0, 108.0)
	var action_width := clampf(width * 0.14, 145.0, 190.0)
	_mobile_place_bottom_right($HUD/PassButton, action_width, action_size, 20.0)
	_mobile_place_bottom_right(kick_button, action_width, action_size, 32.0 + action_size)
	var joystick_size := clampf(height * 0.27, 144.0, 180.0)
	var joystick: Control = $HUD/VirtualJoystick
	joystick.offset_left = 20.0
	joystick.offset_right = 20.0 + joystick_size
	joystick.offset_top = -20.0 - joystick_size
	joystick.offset_bottom = -20.0
	_joystick_hint.hide()
	var restart: Button = $HUD/RestartButton
	restart.offset_left = -170.0
	restart.offset_right = -20.0
	restart.offset_top = 8.0
	restart.offset_bottom = 72.0
	restart.add_theme_font_size_override("font_size", 24)
	tactical_camera_button.offset_left = -110.0
	tactical_camera_button.offset_right = 110.0
	tactical_camera_button.offset_top = 8.0
	tactical_camera_button.offset_bottom = 72.0
	tactical_camera_button.add_theme_font_size_override("font_size", 24)
	start_play_button.offset_top = -38.0
	start_play_button.offset_bottom = 38.0
	start_play_button.offset_left = -125.0
	start_play_button.offset_right = 125.0
	start_play_button.add_theme_font_size_override("font_size", 28)
	status_label.offset_left = 16.0
	status_label.offset_right = maxf(120.0, width * 0.5 - 120.0)
	status_label.offset_top = 8.0
	status_label.offset_bottom = 72.0
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_font_size_override("font_size", 24)

func _mobile_place_bottom_right(button: Button, button_width: float, button_height: float, bottom: float) -> void:
	button.offset_left = -20.0 - button_width
	button.offset_right = -20.0
	button.offset_top = -bottom - button_height
	button.offset_bottom = -bottom
	button.add_theme_font_size_override("font_size", 30)
