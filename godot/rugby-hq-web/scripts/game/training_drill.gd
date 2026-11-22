extends Node3D
class_name TrainingDrill

const ATTACKER_COLOR := Color(0.12, 0.62, 1.0)
const SUPPORT_COLOR := Color(1.0, 0.62, 0.12)
const DEFENDER_COLOR := Color(0.96, 0.2, 0.24)
const INSTRUCTIONS := "WASD / Arrows run | Shift walk | Space / PASS | R reset | Right-drag camera"
@onready var attacker: RugbyPlayer = $Players/Attacker
@onready var support: RugbyPlayer = $Players/Support
@onready var defender: RugbyPlayer = $Players/Defender
@onready var ball: RigidBody3D = $Ball
@onready var camera: Camera3D = $CameraRig/SpringArm3D/Camera3D
@onready var status_label: Label = $HUD/Status
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

func _ready() -> void:
	$HUD/PassButton.focus_mode = Control.FOCUS_NONE
	$HUD/PassButton.pressed.connect(_pass_ball)
	$HUD/RestartButton.focus_mode = Control.FOCUS_NONE
	$HUD/RestartButton.pressed.connect(_reset_drill)
	# Touch supplies a separate vector: it cannot release keyboard-held actions.
	$HUD/VirtualJoystick.action_enabled = false
	$HUD/VirtualJoystick.direction_changed.connect(func(value: Vector2): attacker.touch_direction = value)
	$HUD/VirtualJoystick.visible = DisplayServer.is_touchscreen_available()
	attacker.set_team_appearance(ATTACKER_COLOR)
	support.set_team_appearance(SUPPORT_COLOR)
	defender.set_team_appearance(DEFENDER_COLOR)
	for player in [attacker, support, defender]:
		ball.add_collision_exception_with(player)
		$CameraRig/SpringArm3D.add_excluded_object(player.get_rid())
	$CameraRig/SpringArm3D.add_excluded_object(ball.get_rid())
	_diagnostics = "--rugby-diagnostics" in OS.get_cmdline_user_args()
	_reset_drill()

func _input(event: InputEvent) -> void:
	# Handle gameplay keys before GUI focus can consume Space as ui_accept.
	if event.is_action_pressed("pass_ball") and not event.is_echo():
		_pass_ball()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("reset_drill") and not event.is_echo():
		_reset_drill()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		$CameraRig.rotation.y -= event.relative.x * 0.003
		$CameraRig/SpringArm3D.rotation.x = clampf($CameraRig/SpringArm3D.rotation.x - event.relative.y * 0.003, -0.7, -0.12)

func _physics_process(delta: float) -> void:
	_pass_cooldown = maxf(0.0, _pass_cooldown - delta)
	_tackle_cooldown = maxf(0.0, _tackle_cooldown - delta)
	if not _game_over:
		_update_ai(delta)
		_update_ball(delta)
		if possession and possession != defender and possession.global_position.z <= -11.0:
			_end_play("TRY! R to restart")
	$CameraRig.global_position = $CameraRig.global_position.lerp(attacker.global_position + Vector3(0, 1.8, 0), 1.0 - exp(-8.0 * delta))
	if _diagnostics:
		status_label.text = _message + "\n" + INSTRUCTIONS + "\n" + str(attacker.telemetry)

func _update_ai(_delta: float) -> void:
	var runner_target := attacker.global_position + Vector3(-3.3, 0.0, 1.0)
	runner_target.x = clampf(runner_target.x, -14.5, 14.5)
	runner_target.z = clampf(runner_target.z, -10.5, 10.5)
	var runner_delta := runner_target - support.global_position
	support.set_ai_velocity(runner_delta, clampf(runner_delta.length() / 2.0, 0.0, 1.0))
	var threat := pass_target if pass_target else possession
	if threat == null:
		threat = attacker
	var defensive_target := threat.global_position
	defensive_target.z = minf(defensive_target.z, -0.3)
	var defensive_delta := defensive_target - defender.global_position
	defender.set_ai_velocity(defensive_delta, clampf(defensive_delta.length() / 1.4, 0.0, 0.72))
	if possession and possession != defender and _tackle_cooldown <= 0.0 and defender.global_position.distance_to(possession.global_position) < 0.85:
		_set_possession(defender)
		_end_play("Defender won the ball. R to restart")

func _update_ball(delta: float) -> void:
	if possession:
		ball.global_position = _ball_hold_position(possession)
		ball.rotation = Vector3(0, possession.visual.global_rotation.y, 0.3)
		return
	_flight_time += delta
	var catcher: RugbyPlayer
	if pass_target and ball.global_position.distance_to(_ball_hold_position(pass_target)) < 0.85:
		catcher = pass_target
	elif _flight_time > 0.22 and ball.global_position.distance_to(defender.global_position + Vector3.UP) < 0.65:
		catcher = defender
	if catcher:
		_set_possession(catcher)
		if catcher == defender:
			_end_play("Intercepted! R to restart")
		else:
			_update_status("%s caught it! Space to pass again" % catcher.name)
	elif _flight_time > 3.0 or ball.global_position.y < -1.0:
		_end_play("Loose ball. R to restart")

func _pass_ball() -> void:
	if _game_over:
		_update_status("Play ended. Tap RESTART to try again.")
		return
	if possession == null:
		_update_status("Ball in flight. Wait for the catch.")
		return
	if possession == defender:
		_update_status("Defender has the ball. Tap RESTART.")
		return
	if _pass_cooldown > 0.0:
		_update_status("Pass recovering. Try again.")
		return
	pass_sender = possession
	pass_target = support if possession == attacker else attacker
	var launch := _ball_hold_position(possession)
	var flight_duration := clampf(launch.distance_to(_ball_hold_position(pass_target)) / 9.5, 0.35, 0.85)
	var lead := Vector3(pass_target.velocity.x, 0, pass_target.velocity.z) * flight_duration * 0.65
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
	_pass_cooldown = 0.45
	pass_count += 1
	_update_status("Pass to %s" % pass_target.name)

func _set_possession(player: RugbyPlayer) -> void:
	possession = player
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
	_game_over = false
	pass_target = null
	pass_sender = null
	_pass_cooldown = 0.0
	_tackle_cooldown = 1.0
	_flight_time = 0.0
	for player in [attacker, support, defender]:
		player.velocity = Vector3.ZERO
		player.velocity_target = Vector3.ZERO
		player.control_enabled = true
		player.touch_direction = Vector2.ZERO
		player.rotation = Vector3.ZERO
		player._face_visual_direction(Vector3.FORWARD, 1.0)
	attacker.global_position = Vector3(0.0, 0.03, 5.0)
	support.global_position = Vector3(-3.4, 0.03, 6.0)
	defender.global_position = Vector3(0.0, 0.03, -3.0)
	_set_possession(attacker)
	$CameraRig.rotation = Vector3.ZERO
	$CameraRig/SpringArm3D.rotation.x = -0.32
	$CameraRig.global_position = attacker.global_position + Vector3(0, 1.8, 0)
	_update_status("QUIN NATION | 2 v 1 | Attacker has possession")

func _end_play(message: String) -> void:
	_game_over = true
	for player in [attacker, support, defender]:
		player.control_enabled = false
		player.velocity_target = Vector3.ZERO
		player.velocity = Vector3.ZERO
	_update_status(message)

func _update_status(message: String) -> void:
	_message = message
	status_label.text = message + "\n" + INSTRUCTIONS
