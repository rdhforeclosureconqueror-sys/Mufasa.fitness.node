extends Node3D

const PLAYER_SCENE = preload("res://scenes/characters/rashad_player.tscn")

const MobileCardLayer = preload("res://scripts/ui/mobile_card_layer.gd")
var _mobile_cards: MobileCardLayer
var _mobile_phase_selector: OptionButton
var _mobile_decision_button: Button
var _mobile_review_button: Button

var attackers: Array[Node3D] = []
var defenders: Array[Node3D] = []
var ribbons: Node3D
var camera: Camera3D
var status: Label
var camera_mode := 3
var phase := 0
var playing := false
var progress := 0.0

var start_positions: Array[Vector3] = []
var end_positions: Array[Vector3] = []

func _ready() -> void:
	_build_environment()
	_build_pitch()
	_build_teams()

	ribbons = Node3D.new()
	ribbons.name = "RunningRibbons"
	add_child(ribbons)

	camera = Camera3D.new()
	add_child(camera)
	camera.current = true
	_position_camera()

	_build_hud()
	_load_phase(0)
	_verify_avatars()
	_position_camera()

	print("[PLAYBOOK] Arena initialized")
	print("[PLAYBOOK] Attackers: ", attackers.size())
	print("[PLAYBOOK] Defenders: ", defenders.size())


func _build_environment() -> void:
	var world := WorldEnvironment.new()
	var environment := Environment.new()

	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("#92b8cf")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color.WHITE
	environment.ambient_light_energy = 0.8

	world.environment = environment
	add_child(world)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-55, -25, 0)
	sun.light_energy = 1.3
	sun.shadow_enabled = true
	add_child(sun)


func _material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return material


func _box(size: Vector3, position_value: Vector3, color: Color) -> void:
	var instance := MeshInstance3D.new()
	var mesh := BoxMesh.new()

	mesh.size = size
	instance.mesh = mesh
	instance.material_override = _material(color)

	add_child(instance)
	instance.position = position_value


func _build_pitch() -> void:
	_box(Vector3(70, 0.15, 110), Vector3(0, -0.1, 0), Color("#24653e"))

	for i in range(10):
		if i % 2 == 0:
			_box(
				Vector3(68, 0.015, 10),
				Vector3(0, -0.015, -45 + i * 10),
				Color("#2c7447")
			)

	for z in [-50, -40, -22, 0, 22, 40, 50]:
		_box(
			Vector3(68, 0.025, 0.15),
			Vector3(0, 0.015, z),
			Color.WHITE
		)

	for x in [-34, 34]:
		_box(
			Vector3(0.15, 0.025, 100),
			Vector3(x, 0.015, 0),
			Color.WHITE
		)

	for z in [-50, 50]:
		for x in [-2.8, 2.8]:
			_box(
				Vector3(0.18, 10, 0.18),
				Vector3(x, 5, z),
				Color.WHITE
			)

		_box(
			Vector3(5.6, 0.18, 0.18),
			Vector3(0, 3, z),
			Color.WHITE
		)


func _spawn_player(number: int, attacking: bool) -> Node3D:
	var player := PLAYER_SCENE.instantiate() as RugbyPlayer

	player.role = RugbyPlayer.Role.SUPPORT if attacking else RugbyPlayer.Role.DEFENDER

	add_child(player)

	player.control_enabled = false
	player.set_physics_process(false)
	player.set_process_input(false)
	player.collision_layer = 0
	player.collision_mask = 0

	var tag := player.get_node_or_null("NameTag") as Label3D

	if tag:
		tag.text = str(number)
		tag.font_size = 36
		tag.modulate = Color("#ffe08a") if attacking else Color("#ff7777")
		tag.no_depth_test = true
		tag.billboard = BaseMaterial3D.BILLBOARD_ENABLED

	var marker := MeshInstance3D.new()
	var disc := CylinderMesh.new()

	disc.top_radius = 0.38
	disc.bottom_radius = 0.38
	disc.height = 0.035

	marker.mesh = disc
	marker.material_override = _material(
		Color("#f5cc62") if attacking else Color("#e34b4b")
	)

	player.add_child(marker)
	marker.position.y = 0.035

	player._face_visual_direction(
		Vector3.FORWARD if attacking else Vector3.BACK,
		1.0
	)

	return player


func _build_teams() -> void:
	for i in range(15):
		attackers.append(_spawn_player(i + 1, true))
		defenders.append(_spawn_player(i + 1, false))


func _position_camera() -> void:
	if _is_reaction_phase():
		camera.near = 0.05
		camera.far = 250.0
		match camera_mode:
			0:
				camera.position = Vector3(0, 8, 19)
				camera.look_at(Vector3(0, 0, 1.5))
				camera.fov = 55.0
			1:
				camera.position = Vector3(22, 11, 4)
				camera.look_at(Vector3(0, 0, 1.5))
				camera.fov = 55.0
			2:
				camera.position = Vector3(-17, 17, 17)
				camera.look_at(Vector3(0, 0, 1.5))
				camera.fov = 55.0
			_:
				camera.position = Vector3(0, 27, 15)
				camera.look_at(Vector3(0, 0, 1.5))
				camera.fov = 48.0
		print("[DRILL CAMERA] Mode: ", camera_mode)
		return
	camera.fov = 50.0
	camera.near = 0.05
	camera.far = 250.0

	var focus := attackers[9].global_position

	if camera_mode == 0:
		camera.position = focus + Vector3(4, 3, 7)
		camera.look_at(focus + Vector3(0, 1.0, 0))

	elif camera_mode == 1:
		camera.position = Vector3(30, 12, 10)
		camera.look_at(Vector3(0, 1, 10))
		camera.fov = 65.0

	elif camera_mode == 2:
		camera.position = Vector3(0, 12, 38)
		camera.look_at(Vector3(0, 1, 5))
		camera.fov = 70.0

	else:
		camera.position = Vector3(0, 90, 0.1)
		camera.look_at(Vector3(0, 0, 0))
		camera.fov = 65.0

	print("[PLAYBOOK CAMERA] Mode: ", camera_mode)


func _button(parent: Control, title_value: String, action: Callable) -> Button:
	var button := Button.new()

	button.text = title_value
	button.custom_minimum_size = Vector2(115, 42)
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(action)

	parent.add_child(button)
	return button


func _build_hud() -> void:
	var hud := CanvasLayer.new()
	add_child(hud)

	var panel := VBoxContainer.new()
	hud.add_child(panel)
	panel.position = Vector2(20, 15)

	var title := Label.new()
	title.text = "QUIN NATION | PLAYBOOK ARENA"
	title.add_theme_font_size_override("font_size", 24)
	panel.add_child(title)

	status = Label.new()
	status.add_theme_font_size_override("font_size", 18)
	panel.add_child(status)

	var controls := HBoxContainer.new()
	panel.add_child(controls)

	var selector := OptionButton.new()
	selector.add_item("Formation")
	selector.add_item("Crash / Backdoor")
	selector.add_item("Wide Release")
	selector.add_item("2v2 | Read the defense")
	selector.add_item("2v1 | Draw the defender")
	selector.add_item("3v2 | Find the spare runner")
	selector.custom_minimum_size = Vector2(175, 42)
	controls.add_child(selector)
	selector.item_selected.connect(_load_phase)

	_button(controls, "WATCH", func():
		if _is_reaction_phase():
			_start_reaction()
			return
		_load_phase(phase)
		playing = true
	)

	_button(controls, "CAMERA", func():
		camera_mode = (camera_mode + 1) % 4
		_position_camera()
	)

	var ribbons_button := _button(controls, "RIBBONS", func():
		ribbons.visible = not ribbons.visible
	)

	_button(controls, "RESET", func():
		_load_phase(phase)
	)

	var training_button := _button(controls, "TRAINING", func():
		get_tree().change_scene_to_file.call_deferred("res://scenes/training_drill.tscn")
	)

	_setup_reaction_hud(hud)
	if MobileCardLayer.is_mobile():
		_setup_mobile_playbook(panel, controls, selector, ribbons_button, training_button)


func _load_phase(index: int) -> void:
	if index != phase:
		defense_look = -1
		defense_deck.clear()
	phase = index
	previewing_defense = false
	playing = false
	progress = 0.0

	start_positions.clear()
	end_positions.clear()

	for child in ribbons.get_children():
		ribbons.remove_child(child)
		child.queue_free()

	var reaction := _is_reaction_phase()
	var three_on_two := phase == THREE_V_TWO_PHASE
	reaction_support_choice.set_item_text(0, "Target outside" if three_on_two else "Support outside")
	reaction_support_choice.set_item_text(1, "Target inside" if three_on_two else "Support inside")
	reaction_support_choice.set_item_disabled(2, three_on_two)
	if three_on_two and reaction_support_choice.selected == 2:
		reaction_support_choice.select(0)
	reaction_panel.visible = reaction
	if is_instance_valid(_mobile_decision_button):
		_mobile_decision_button.visible = reaction
		_mobile_review_button.hide()
	reaction_ball.visible = reaction
	reaction_try_line.visible = reaction
	for i in range(attackers.size()):
		attackers[i].visible = not reaction or i in [REACTION_CARRIER, REACTION_SUPPORT] or (phase == THREE_V_TWO_PHASE and i == EXTRA_SUPPORT)
		defenders[i].visible = not reaction or i == REACTION_INSIDE_DEFENDER or (phase != TWO_V_ONE_PHASE and i == REACTION_OUTSIDE_DEFENDER)
	if reaction:
		_load_reaction()
		return

	var attack_slots: Array[Vector2] = [
		Vector2(-15.2, 0.8), Vector2(-14, 0.8), Vector2(-12.8, 0.8),
		Vector2(-14.6, 2.0), Vector2(-13.4, 2.0), Vector2(-16, 2.2),
		Vector2(-12, 2.2), Vector2(-14, 3.3), Vector2(-11, 4.8),
		Vector2(-4, 7), Vector2(-31, 11), Vector2(4, 9), Vector2(13, 11),
		Vector2(31, 15), Vector2(0, 19)
	]
	var defense_slots: Array[Vector2] = _recognize_scrum_formation(attack_slots)
	for i in range(15):
		var origin := Vector3(attack_slots[i].x, 0.03, attack_slots[i].y)
		attackers[i].position = origin
		defenders[i].position = Vector3(defense_slots[i].x, 0.03, defense_slots[i].y)
		var attacking_player := attackers[i] as RugbyPlayer
		var defending_player := defenders[i] as RugbyPlayer
		attacking_player._face_visual_direction(Vector3.FORWARD, 1.0)
		defending_player._face_visual_direction(Vector3.BACK, 1.0)
		attacking_player._play_animation(attacking_player._idle_name)
		defending_player._play_animation(defending_player._idle_name)
		start_positions.append(origin)
		end_positions.append(origin)
	print("[RAVENS V8A] FORMATION READY | 8+7 vs 8+7")

	if phase == 1:
		_assign_route(10, Vector3(-7, 0.03, 1), Color("#f5cc62"))
		_assign_route(13, Vector3(1, 0.03, -3), Color("#ff947e"))
		_assign_route(6, Vector3(8, 0.03, 3), Color("#72c9ff"))

	elif phase == 2:
		_assign_route(6, Vector3(-3, 0.03, 0), Color("#f5cc62"))
		_assign_route(15, Vector3(7, 0.03, -4), Color("#ff947e"))
		_assign_route(11, Vector3(17, 0.03, 2), Color("#72c9ff"))
		_assign_route(14, Vector3(29, 0.03, -12), Color("#8df1a5"))

	status.text = [
		"FORMATION | 15 v 15",
		"DEMO | Crash and Backdoor",
		"DEMO | Wide Release"
	][phase]

	_position_camera()
	print("[PLAYBOOK] Phase loaded: ", phase)


func _assign_route(number: int, destination: Vector3, color: Color) -> void:
	var index := number - 1
	end_positions[index] = destination

	_draw_ribbon(
		start_positions[index],
		destination,
		color
	)


func _draw_ribbon(origin: Vector3, destination: Vector3, color: Color) -> void:
	var start := Vector3(origin.x, 0.065, origin.z)
	var finish := Vector3(destination.x, 0.065, destination.z)

	var direction := (finish - start).normalized()
	var side := direction.cross(Vector3.UP).normalized()

	var length := start.distance_to(finish)

	if length < 0.1:
		return

	var neck := finish - direction * 1.25

	var mesh := ImmediateMesh.new()
	mesh.surface_begin(Mesh.PRIMITIVE_TRIANGLES, _material(color))

	var a := start + side * 0.22
	var b := start - side * 0.22
	var c := neck + side * 0.22
	var d := neck - side * 0.22

	for vertex in [a, b, c, b, d, c]:
		mesh.surface_add_vertex(vertex)

	mesh.surface_add_vertex(neck + side * 0.65)
	mesh.surface_add_vertex(neck - side * 0.65)
	mesh.surface_add_vertex(finish)

	mesh.surface_end()

	var instance := MeshInstance3D.new()
	instance.mesh = mesh

	var material := _material(color)
	material.cull_mode = BaseMaterial3D.CULL_DISABLED
	instance.material_override = material

	ribbons.add_child(instance)


func _process(delta: float) -> void:
	if _is_reaction_phase():
		if previewing_defense:
			_update_defense_preview(delta)
		elif playing:
			_update_reaction(delta)
		return
	if camera_mode == 0:
		var focus := attackers[9].global_position
		camera.position = focus + Vector3(4, 3, 7)
		camera.look_at(focus + Vector3(0, 1.0, 0))
	if not playing:
		return

	progress = minf(progress + delta / 4.0, 1.0)

	for i in range(attackers.size()):
		var direction := end_positions[i] - start_positions[i]

		if direction.length() > 0.1:
			attackers[i].position = start_positions[i].lerp(
				end_positions[i],
				progress
			)

			var player := attackers[i] as RugbyPlayer
			player._face_visual_direction(direction, delta)
			player._play_animation("Run")

	if progress >= 1.0:
		playing = false

		for node in attackers:
			var player := node as RugbyPlayer
			player._play_animation(player._idle_name)

		status.text = "DEMONSTRATION COMPLETE"
		print("[PLAYBOOK] Demonstration complete")

func _verify_avatars() -> void:
	var mesh_count := 0
	var animated_count := 0

	for node in attackers + defenders:
		var player := node as RugbyPlayer
		var avatar := player.get_node_or_null("AvatarModel") as Node3D

		if avatar:
			avatar.show()

			var meshes := avatar.find_children(
				"*", "MeshInstance3D", true, false
			)

			for mesh in meshes:
				var visual_mesh := mesh as MeshInstance3D
				visual_mesh.show()

				if visual_mesh.mesh != null:
					mesh_count += 1

			var animation := avatar.find_child(
				"AnimationPlayer", true, false
			) as AnimationPlayer

			if animation and animation.has_animation("Run"):
				animated_count += 1

	print("[AVATAR AUDIT] Meshes: ", mesh_count)
	print("[AVATAR AUDIT] Run-enabled players: ", animated_count)

	if mesh_count > 0 and animated_count == 30:
		print("[AVATAR AUDIT] PASS")


# V8B.1: Initial responsibilities, not permanent man marking.
var defensive_assignments: Dictionary = {}

func _recognize_scrum_formation(attack_slots: Array[Vector2]) -> Array[Vector2]:
	defensive_assignments.clear()
	var slots: Array[Vector2] = []
	# Opposing scrum geometry: front row, locks and flankers mirror across the scrum axis.
	var axis: float = attack_slots[1].x
	for i in range(15):
		var origin: Vector2 = attack_slots[i]
		var target: Vector2
		var responsibility: String
		var opponent: int = i + 1
		if i < 8:
			target = Vector2(2.0 * axis - origin.x, -origin.y)
			responsibility = "PACK"
			# Physical opposite numbers differ in the mirrored scrum.
			opponent = [3, 2, 1, 5, 4, 7, 6, 8][i]
		elif i == 8:
			target = Vector2(origin.x, -origin.y)
			responsibility = "SCRUM_HALF"
		elif i == 14:
			target = Vector2(origin.x, -23.0)
			responsibility = "DEEP_COVER"
			opponent = 0
		elif i == 10 or i == 13:
			# Opposing wings defend the same physical channel, not the same jersey.
			opponent = 14 if i == 10 else 11
			target = Vector2(attack_slots[opponent - 1].x, -12.0)
			responsibility = "WING_CHANNEL"
		else:
			target = Vector2(origin.x, -6.0)
			responsibility = "BACKLINE_CHANNEL"
		slots.append(target)
		defensive_assignments[i + 1] = {"role": responsibility, "opponent": opponent, "target": target}
		print("[V8B.1] D", i + 1, " | ", responsibility, " | A", opponent, " | ", target)
	print("[V8B.1] ASSIGNMENTS READY | ", defensive_assignments.size())
	return slots


const REACTION_PHASE := 3
const TWO_V_ONE_PHASE := 4
const THREE_V_TWO_PHASE := 5
const EXTRA_SUPPORT := 12
const REACTION_CARRIER := 9
const REACTION_SUPPORT := 11
const REACTION_INSIDE_DEFENDER := 11
const REACTION_OUTSIDE_DEFENDER := 12
const REACTION_DURATION := 4.0
const RELEASE_TIME := 1.35
const KICK_RELEASE_TIME := 0.95
const KICK_FLIGHT_TIME := 0.9
const CATCH_TIME := 1.72
const DRILL_TRY_LINE := -7.0
const TOUCH_DISTANCE := 1.0

var reaction_panel: VBoxContainer
var reaction_support_choice: OptionButton
var reaction_draw_choice: OptionButton
var reaction_finish_choice: OptionButton
var reaction_ball: MeshInstance3D
var reaction_lane := 4.0
var reaction_draw := -1.0
var reaction_finish := 0
var reaction_lead := -1
var reaction_release := Vector3.ZERO
var receiver_cut := 0.0
var reaction_try_line: MeshInstance3D

enum DefenseLook { PRESS, BLITZ, DRIFT, HOLD }
const DEFENSE_LABELS := ["Press and cover", "Double blitz", "Outside drift", "Press with deep cover"]
var defense_look := -1
var defense_deck: Array[int] = []
var previewing_defense := false
var reaction_feedback: RichTextLabel
var reaction_space_inside: MeshInstance3D
var reaction_space_outside: MeshInstance3D
var feedback_catch_point := Vector3.ZERO
var feedback_catch_defense: Array[Vector3] = []
var reaction_reviews: Dictionary = {}
var selected_pass_space := 0.0
var other_pass_space := 0.0
var pass_timing_choice: OptionButton
var pass_timing := 0

func _is_reaction_phase() -> bool:
	return phase in [REACTION_PHASE, TWO_V_ONE_PHASE, THREE_V_TWO_PHASE]

func _reaction_title() -> String:
	if phase == THREE_V_TWO_PHASE:
		return "3v2"
	return "2v1" if phase == TWO_V_ONE_PHASE else "2v2"

func _reaction_defenders() -> Array[Node3D]:
	var active: Array[Node3D] = [defenders[REACTION_INSIDE_DEFENDER]]
	if phase != TWO_V_ONE_PHASE:
		active.append(defenders[REACTION_OUTSIDE_DEFENDER])
	return active

func _defense_label(look: int) -> String:
	if phase == TWO_V_ONE_PHASE:
		return "Carrier rush" if look == DefenseLook.PRESS else "Hold the pass lane"
	return DEFENSE_LABELS[look]

func _reaction_choice(parent: Control, options: Array[String]) -> OptionButton:
	var choice := OptionButton.new()
	for option in options:
		choice.add_item(option)
	parent.add_child(choice)
	return choice

func _setup_reaction_hud(hud: CanvasLayer) -> void:
	reaction_panel = VBoxContainer.new()
	hud.add_child(reaction_panel)
	reaction_panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_BOTTOM)
	reaction_panel.grow_horizontal = Control.GROW_DIRECTION_BOTH
	reaction_panel.grow_vertical = Control.GROW_DIRECTION_BEGIN
	reaction_panel.position.y -= 16.0
	var feedback_panel := PanelContainer.new()
	reaction_panel.add_child(feedback_panel)
	reaction_feedback = RichTextLabel.new()
	reaction_feedback.bbcode_enabled = true
	reaction_feedback.fit_content = true
	reaction_feedback.scroll_active = false
	reaction_feedback.custom_minimum_size = Vector2(550, 146)
	reaction_feedback.add_theme_font_size_override("normal_font_size", 16)
	reaction_feedback.add_theme_color_override("default_color", Color("#edf6ed"))
	feedback_panel.add_child(reaction_feedback)
	var futuristic_panel := StyleBoxFlat.new()
	futuristic_panel.bg_color = Color("#071a22f3")
	futuristic_panel.border_color = Color("#37d8d4")
	futuristic_panel.set_border_width_all(2)
	futuristic_panel.set_corner_radius_all(14)
	futuristic_panel.shadow_color = Color("#00d9ff55")
	futuristic_panel.shadow_size = 12
	feedback_panel.add_theme_stylebox_override("panel", futuristic_panel)
	feedback_panel.hide()
	for color in [Color("#63de9a"), Color("#4d91ca")]:
		var marker := MeshInstance3D.new()
		var disc := CylinderMesh.new()
		disc.top_radius = 1.0
		disc.bottom_radius = 1.0
		disc.height = 0.025
		marker.mesh = disc
		marker.material_override = _material(color)
		marker.visible = false
		add_child(marker)
		if reaction_space_inside == null:
			reaction_space_inside = marker
		else:
			reaction_space_outside = marker
	var choices := HBoxContainer.new()
	reaction_panel.add_child(choices)
	reaction_support_choice = _reaction_choice(choices, ["Support outside", "Support inside", "Support behind"])
	reaction_draw_choice = _reaction_choice(choices, ["Draw inside", "Draw outside"])
	reaction_finish_choice = _reaction_choice(choices, ["Pass", "Run", "Dummy", "Kick and chase"])
	var actions := HBoxContainer.new()
	reaction_panel.add_child(actions)
	pass_timing_choice = _reaction_choice(actions, ["Pass: Auto timing", "Pass: Early", "Pass: After draw"])
	reaction_finish_choice.item_selected.connect(func(_index: int): _update_pass_timing_control())
	_button(actions, "NEW LOOK / PREVIEW", _preview_new_defense)
	_button(actions, "PLAY / REPLAY", _start_reaction)
	reaction_ball = MeshInstance3D.new()
	var mesh := SphereMesh.new()
	mesh.radius = 0.23
	mesh.height = 0.46
	reaction_ball.mesh = mesh
	reaction_ball.scale = Vector3(1.4, 1.0, 1.0)
	reaction_ball.material_override = _material(Color("#fff1ce"))
	add_child(reaction_ball)
	reaction_try_line = MeshInstance3D.new()
	var stripe := BoxMesh.new()
	stripe.size = Vector3(21.0, 0.012, 0.08)
	reaction_try_line.mesh = stripe
	reaction_try_line.material_override = _material(Color("#fff1ce"))
	reaction_try_line.position = Vector3(0, 0.02, DRILL_TRY_LINE)
	add_child(reaction_try_line)

func _load_reaction() -> void:
	_update_pass_timing_control()
	selected_pass_space = 0.0
	other_pass_space = 0.0
	(reaction_feedback.get_parent() as Control).hide()
	reaction_space_inside.visible = false
	reaction_space_outside.visible = false
	attackers[REACTION_CARRIER].position = Vector3(0, 0.03, 7.0)
	_selected_support().position = Vector3(reaction_lane, 0.03, 11.0)
	if phase == THREE_V_TWO_PHASE:
		var spare := _other_support() as RugbyPlayer
		spare.position = Vector3(-reaction_lane, 0.03, 11.0 if reaction_finish == 0 else 11.5)
		spare._play_animation(spare._idle_name)
	defenders[REACTION_INSIDE_DEFENDER].position = Vector3(0.0 if phase == TWO_V_ONE_PHASE else -2.5, 0.03, -2.0)
	defenders[REACTION_OUTSIDE_DEFENDER].position = Vector3(2.5, 0.03, -2.0)
	for node in [attackers[REACTION_CARRIER], attackers[REACTION_SUPPORT], defenders[REACTION_INSIDE_DEFENDER], defenders[REACTION_OUTSIDE_DEFENDER]]:
		var player := node as RugbyPlayer
		player._play_animation(player._idle_name)
	reaction_ball.position = _reaction_hands(attackers[REACTION_CARRIER])
	reaction_lead = -1
	receiver_cut = 0.0
	feedback_catch_defense.clear()
	reaction_release = Vector3.ZERO
	status.text = _reaction_title() + " | Preview the defense or choose your play"
	_position_camera()

func _deal_defense() -> void:
	if defense_deck.is_empty():
		if phase == TWO_V_ONE_PHASE:
			defense_deck.assign([DefenseLook.PRESS, DefenseLook.HOLD])
		else:
			defense_deck.assign(range(DEFENSE_LABELS.size()))
		defense_deck.shuffle()
		if defense_deck.back() == defense_look:
			defense_deck.push_front(defense_deck.pop_back())
	defense_look = defense_deck.pop_back()

func _preview_new_defense() -> void:
	_deal_defense()
	_load_phase(phase)
	previewing_defense = true
	status.text = _reaction_title() + " | Read the first steps"

func _update_defense_preview(delta: float) -> void:
	var time := minf(progress + delta, 1.15)
	var step := time - progress
	progress = time
	var carrier := attackers[REACTION_CARRIER]
	var runner := attackers[REACTION_SUPPORT]
	_reaction_move(carrier, Vector3(0.0, 0.03, 7.0 - 2.75 * progress), step)
	reaction_ball.position = _reaction_hands(carrier)
	var pair := _reaction_defenders()
	_move_reaction_defense(pair, carrier, runner, step, false)
	if progress >= 1.15:
		previewing_defense = false
		for node in [carrier] + pair:
			var player := node as RugbyPlayer
			player._play_animation(player._idle_name)
		status.text = _reaction_title() + " | Pick your response, then play"

func _selected_support() -> Node3D:
	return attackers[EXTRA_SUPPORT] if phase == THREE_V_TWO_PHASE and reaction_lane < 0.0 else attackers[REACTION_SUPPORT]

func _other_support() -> Node3D:
	return attackers[REACTION_SUPPORT] if reaction_lane < 0.0 else attackers[EXTRA_SUPPORT]

func _start_reaction() -> void:
	if defense_look < 0:
		_deal_defense()
	reaction_lane = [4.0, -4.0, 0.0][reaction_support_choice.selected]
	reaction_draw = -1.0 if reaction_draw_choice.selected == 0 else 1.0
	reaction_finish = reaction_finish_choice.selected
	pass_timing = pass_timing_choice.selected if phase == THREE_V_TWO_PHASE and reaction_finish == 0 else 0
	_load_phase(phase)
	playing = true
	status.text = _reaction_title() + " | Defense steps up"

func _reaction_hands(player: Node3D) -> Vector3:
	return player.position + Vector3(0.25, 1.45, -0.18)

func _pass_release_time() -> float:
	if phase == THREE_V_TWO_PHASE:
		if pass_timing == 1:
			return 0.55
		if pass_timing == 2:
			return RELEASE_TIME
	if phase == THREE_V_TWO_PHASE and defense_look == DefenseLook.BLITZ:
		return 0.55
	if phase == THREE_V_TWO_PHASE and defense_look in [DefenseLook.PRESS, DefenseLook.HOLD]:
		return 0.95
	if phase == REACTION_PHASE and defense_look == DefenseLook.BLITZ and reaction_finish == 0:
		return 0.55
	return 1.10 if phase == TWO_V_ONE_PHASE else RELEASE_TIME

func _pass_catch_time() -> float:
	return _pass_release_time() + CATCH_TIME - RELEASE_TIME

func _reaction_carrier_at(time: float) -> Vector3:
	var draw_step := smoothstep(0.32, 1.00, time)
	var outside_step := smoothstep(1.00, RELEASE_TIME, time) if phase != TWO_V_ONE_PHASE else smoothstep(0.92, _pass_release_time(), time)
	var x := reaction_draw * (2.35 * draw_step - 1.15 * outside_step)
	var z := 7.0 - 2.75 * time
	if reaction_finish == 0:
		z = maxf(z, -0.15)
	elif reaction_finish == 2:
		x += 4.0 * signf(reaction_lane if reaction_lane != 0.0 else -reaction_draw) * smoothstep(0.90, 1.85, time)
	return Vector3(x, 0.03, z)

func _reaction_move(node: Node3D, target: Vector3, delta: float) -> void:
	var direction := target - node.position
	node.position = target
	if direction.length_squared() > 0.000001:
		var player := node as RugbyPlayer
		player._face_visual_direction(direction, delta)
		player._play_animation("Run")

func _pass_support_at(time: float) -> Vector3:
	return _pass_lane_at(time, reaction_lane, true)


func _pass_lane_at(time: float, lane: float, receiving: bool) -> Vector3:
	# Get depth and width off the carrier's hip before the release.
	var carrier_x := _reaction_carrier_at(minf(time, _pass_release_time())).x
	var adjust := smoothstep(0.4, _pass_release_time(), time)
	var tracking := 0.45 if lane != 0.0 else 1.0
	var width := signf(lane) * 1.75 * adjust
	var x := lane + carrier_x * tracking + width
	var z := 11.0 - 2.75 * time
	if receiving and time >= _pass_catch_time():
		var exit_time := time - _pass_catch_time()
		x += receiver_cut * smoothstep(0.0, 1.30, exit_time)
		z -= 2.8 * exit_time
	return Vector3(x, 0.03, z)

func _read_receiver_exit(catch_point: Vector3, pair: Array[Node3D]) -> float:
	# Read both defenders at the catch. Compare two exits upfield.
	var outside_exit := catch_point + Vector3(4.0, 0, -3.0)
	var inside_exit := catch_point + Vector3(-4.0, 0, -3.0)
	var outside_space := INF
	var inside_space := INF
	for opponent in pair:
		outside_space = minf(outside_space, opponent.position.distance_squared_to(outside_exit))
		inside_space = minf(inside_space, opponent.position.distance_squared_to(inside_exit))
	return 4.0 if outside_space >= inside_space else -4.0

func _kick_landing() -> Vector3:
	var origin := _reaction_carrier_at(KICK_RELEASE_TIME)
	var side := signf(reaction_lane) if reaction_lane != 0.0 else -reaction_draw
	return Vector3(origin.x + side * 5.0, 0.25, origin.z - 4.5)

func _update_reaction(delta: float) -> void:
	var duration := REACTION_DURATION if reaction_finish == 3 else 5.25
	var time := minf(progress + delta, duration)
	var step := time - progress
	progress = time
	var carrier := attackers[REACTION_CARRIER]
	var runner := _selected_support()
	var chasing := reaction_finish == 3 and progress >= KICK_RELEASE_TIME
	if chasing:
		var landing := _kick_landing()
		landing.y = 0.03
		_reaction_move(carrier, carrier.position.move_toward(landing, 5.4 * step), step)
	else:
		_reaction_move(carrier, _reaction_carrier_at(time), step)

	var pair := _reaction_defenders()
	if reaction_finish == 0:
		if time >= _pass_catch_time() and receiver_cut == 0.0:
			feedback_catch_point = _pass_support_at(_pass_catch_time())
			feedback_catch_defense.assign(pair.map(func(opponent: Node3D): return opponent.position))
			receiver_cut = _read_receiver_exit(feedback_catch_point, pair)
		_reaction_move(runner, _pass_support_at(time), step)
	elif chasing:
		var landing := _kick_landing()
		landing.y = 0.03
		_reaction_move(runner, runner.position.move_toward(landing, 5.4 * step), step)
	else:
		var runner_x := carrier.position.x if reaction_lane == 0.0 else reaction_lane
		_reaction_move(runner, Vector3(runner_x, 0.03, 11.0 - 2.75 * time), step)

	if phase == THREE_V_TWO_PHASE:
		var spare := _other_support()
		if reaction_finish == 0:
			_reaction_move(spare, _pass_lane_at(time, -reaction_lane, false), step)
		else:
			_reaction_move(spare, Vector3(-reaction_lane, 0.03, 11.5 - 2.75 * time), step)
	_move_reaction_defense(pair, carrier, runner, step, time >= _pass_catch_time() and reaction_finish == 0)

	var release_time := KICK_RELEASE_TIME if reaction_finish == 3 else _pass_release_time()
	if progress >= release_time and reaction_finish in [0, 3]:
		if reaction_release == Vector3.ZERO:
			reaction_release = _reaction_carrier_at(release_time) + Vector3(0.25, 1.45, -0.18)
			if phase == THREE_V_TWO_PHASE and reaction_finish == 0:
				selected_pass_space = _receiver_clearance(runner.position, pair)
				other_pass_space = _receiver_clearance(_other_support().position, pair)
		if reaction_finish == 0:
			var flight := clampf((time - _pass_release_time()) / (_pass_catch_time() - _pass_release_time()), 0.0, 1.0)
			reaction_ball.position = reaction_release.lerp(_reaction_hands(runner), flight)
		else:
			var flight := clampf((time - release_time) / KICK_FLIGHT_TIME, 0.0, 1.0)
			var landing := _kick_landing()
			reaction_ball.position = reaction_release.lerp(landing, flight) + Vector3.UP * sin(PI * flight)
	else:
		reaction_ball.position = _reaction_hands(carrier)

	var outcome := ""
	var ball_carrier: Node3D = carrier
	if reaction_finish == 0 and time >= _pass_release_time():
		ball_carrier = runner if time >= _pass_catch_time() else null
	elif reaction_finish == 3 and time >= KICK_RELEASE_TIME:
		ball_carrier = null
	if ball_carrier:
		for opponent in pair:
			if opponent.position.distance_to(ball_carrier.position) < TOUCH_DISTANCE:
				outcome = _reaction_title() + " | Receiver touched" if ball_carrier == runner else _reaction_title() + " | Carrier touched"
				break
		if outcome.is_empty() and ball_carrier.position.z <= DRILL_TRY_LINE:
			outcome = _reaction_title() + " | Try"

	if chasing and time >= KICK_RELEASE_TIME + KICK_FLIGHT_TIME:
		var attack_gap := minf(carrier.position.distance_to(reaction_ball.position), runner.position.distance_to(reaction_ball.position))
		var defense_gap := INF
		for opponent in pair:
			defense_gap = minf(defense_gap, opponent.position.distance_to(reaction_ball.position))
		if minf(attack_gap, defense_gap) < 0.75:
			outcome = _reaction_title() + " | Attack recovered kick" if attack_gap < defense_gap else _reaction_title() + " | Defense recovered kick"
	if outcome.is_empty() and progress >= duration:
		outcome = _reaction_title() + " | Time expired"
	if progress >= duration or not outcome.is_empty():
		playing = false
		if phase == THREE_V_TWO_PHASE:
			var spare := _other_support() as RugbyPlayer
			spare._play_animation(spare._idle_name)
		for node in [carrier, runner] + pair:
			var player := node as RugbyPlayer
			player._play_animation(player._idle_name)
		status.text = _reaction_title() + " | Replay or change your choices" if outcome.is_empty() else outcome
		status.text += " | " + _defense_label(defense_look)
		_show_reaction_feedback(outcome, carrier, pair)

func _move_reaction_defense(pair: Array[Node3D], carrier: Node3D, runner: Node3D, step: float, caught: bool) -> void:
	var carrier_pos := carrier.position
	if phase == TWO_V_ONE_PHASE:
		_move_single_defender(pair[0], carrier, runner, step, caught)
		return
	var line_z := (pair[0].position.z + pair[1].position.z) * 0.5
	if reaction_lead < 0 and carrier_pos.z - line_z <= 4.57:
		reaction_lead = 0 if pair[0].position.distance_squared_to(carrier_pos) <= pair[1].position.distance_squared_to(carrier_pos) else 1
	var lead := maxi(reaction_lead, 0)
	var cover_side := -1.0 if lead == 1 else 1.0
	var targets: Array[Vector3] = []
	for i in range(2):
		var side := -1.0 if i == 0 else 1.0
		var target := Vector3(side * 2.5, 0.03, 2.2)
		var speed := 5.4
		match defense_look:
			DefenseLook.PRESS:
				if i == lead:
					target = carrier_pos
				else:
					target.x = cover_side * 4.0 if phase == THREE_V_TWO_PHASE else lerpf(carrier_pos.x, runner.position.x, 0.55)
			DefenseLook.BLITZ:
				target = carrier_pos + Vector3(side * 0.73, 0.0, 0.0)
				speed = 5.4
			DefenseLook.DRIFT:
				target.x = side * 2.5 + maxf(0.0, carrier_pos.x) * 0.45 + 2.1
				target.z = 0.8
				if carrier_pos.z <= 2.7 and i == 0:
					target = carrier_pos
			DefenseLook.HOLD:
				if i == 0:
					target = carrier_pos
					speed = 5.4
				else:
					target = Vector3(4.2, 0.03, -3.0)
					speed = 5.4

		if caught:
			var offset := -signf(receiver_cut) * 1.4 if i == lead else 0.0
			target = runner.position + Vector3(offset, 0, -0.75 if i != lead else 0.0)
		elif not previewing_defense and reaction_finish == 2 and i == lead and progress >= RELEASE_TIME and progress < CATCH_TIME:
			target.x = lerpf(target.x, runner.position.x, 0.45)
		elif not previewing_defense and reaction_finish == 3 and progress >= KICK_RELEASE_TIME:
			target = _kick_landing()
			target.y = 0.03
			speed = 5.4
		targets.append(pair[i].position.move_toward(target, speed * step))

	var center := (targets[0].x + targets[1].x) * 0.5
	if targets[1].x - targets[0].x < 1.45:
		targets[0].x = center - 0.725
		targets[1].x = center + 0.725
	for i in range(2):
		_reaction_move(pair[i], targets[i], step)

func _move_single_defender(opponent: Node3D, carrier: Node3D, runner: Node3D, step: float, caught: bool) -> void:
	var target := carrier.position
	var speed := 5.4
	if defense_look == DefenseLook.HOLD and not caught:
		target.x = lerpf(carrier.position.x, runner.position.x, 0.6)
		target.z = minf(0.1, carrier.position.z)
		speed = 5.4
		if carrier.position.distance_to(opponent.position) < 2.0:
			target = carrier.position
	if caught:
		target = runner.position
	elif not previewing_defense and reaction_finish == 3 and progress >= KICK_RELEASE_TIME:
		target = _kick_landing()
		target.y = 0.03
		speed = 5.4
	_reaction_move(opponent, opponent.position.move_toward(target, speed * step), step)

func _show_reaction_feedback(outcome: String, carrier: Node3D, pair: Array[Node3D]) -> void:
	# Use the choices snapped at Play even if a selector changed during the rep.
	var support_text := "Outside support" if reaction_lane > 0.0 else ("Inside support" if reaction_lane < 0.0 else "Support behind")
	var draw_text := "inside draw" if reaction_draw < 0.0 else "outside draw"
	var finish_text := ["pass", "run", "dummy", "kick and chase"][reaction_finish] as String
	var defense_read := [
		"One defender pressed the carrier while the other tracked the passing channel.",
		"Both defenders closed on the carrier, shrinking the time to release.",
		"The line slid outside, protecting width and leaving more room to check back inside.",
		"One defender pressed while the other stayed deep and outside.",
	][defense_look] as String
	if phase == TWO_V_ONE_PHASE:
		defense_read = "The defender rushed the carrier, leaving support free if the pass came out in time." if defense_look == DefenseLook.PRESS else "The defender held the passing channel and stepped in when the carrier closed the gap."
	var attack_read := ""
	var focus := carrier.position
	var defense_positions: Array[Vector3] = []
	defense_positions.assign(pair.map(func(opponent: Node3D): return opponent.position))
	var phase_text := "at the finish"
	var retry := ""
	var result := outcome.get_slice(" | ", 1).to_lower()
	if outcome.is_empty():
		result = "time ran out"
	if reaction_finish == 0:
		if reaction_release == Vector3.ZERO:
			attack_read = "Carrier was touched before the pass left his hands." if result == "carrier touched" else "The pass never left the carrier’s hands."
			phase_text = "when the carrier was stopped"
			retry = "Change the draw or support channel and compare when the defender commits."
		elif progress < _pass_catch_time():
			attack_read = "The pass left the carrier’s hands but had yet to reach support."
			retry = "Check how much depth the receiver has when the ball leaves."
		else:
			focus = feedback_catch_point
			defense_positions = feedback_catch_defense
			phase_text = "at the catch"
			var exit := "outside" if receiver_cut > 0.0 else "inside"
			attack_read = "Pass reached support. The receiver cut %s and %s." % [
				exit, "scored untouched" if result == "try" else ("was touched by cover" if result == "receiver touched" else "ran out of time")]
			retry = "Replay with different support to see how the catch point changes the space after the pass."
	elif reaction_finish == 3:
		attack_read = "Carrier was touched before the kick." if reaction_release == Vector3.ZERO else "The kick was released. Result: %s." % result
		if reaction_release != Vector3.ZERO:
			focus = _kick_landing()
		retry = "Change the support channel to change where the kick lands, then compare who gets there first."
	else:
		attack_read = "The carrier kept the ball and %s." % ("scored untouched" if result == "try" else ("was touched" if result == "carrier touched" else "ran out of time"))
		retry = "Compare this carry with a pass using the same draw to see when cover commits."

	var inside_gap := _reaction_channel_gap(focus, -4.0, defense_positions)
	var outside_gap := _reaction_channel_gap(focus, 4.0, defense_positions)
	var wider := "similar clearance inside and outside"
	if absf(inside_gap - outside_gap) >= 0.3:
		wider = "more room inside" if inside_gap > outside_gap else "more room outside"
	if reaction_lane > 0.0 and reaction_draw > 0.0:
		attack_read = "The carrier drew toward the outside support channel. " + attack_read
	if phase == TWO_V_ONE_PHASE and defense_look == DefenseLook.HOLD:
		retry = "Replay as a carry and check whether holding the passing lane opens a gap for the carrier."
	if phase == THREE_V_TWO_PHASE:
		var channel := "outside" if reaction_lane > 0.0 else "inside"
		if result == "try" and reaction_finish == 0:
			retry = "The %s runner received the ball. Replay with the other runner and compare the cover." % channel
		elif defense_look == DefenseLook.BLITZ:
			retry = "Draw the blitz one way and pass early to the runner on the opposite side."
		else:
			retry = "Read the cover defender. Draw toward the covered channel and pass to the spare runner."
	var key := Vector4i(phase, int(reaction_lane), int(reaction_draw), reaction_finish + 4 * pass_timing)
	if not reaction_reviews.has(key):
		reaction_reviews[key] = {}
	var results: Dictionary = reaction_reviews[key]
	results[defense_look] = result
	var comparison := PackedStringArray()
	for look in range(DEFENSE_LABELS.size()):
		if results.has(look):
			comparison.append("%s — %s" % [_defense_label(look), results[look]])
	var comparison_text := ""
	if comparison.size() > 1:
		comparison_text = "\nSame attack so far: " + "; ".join(comparison)
	var won := result in ["try", "attack recovered kick"]
	var outcome_title := "TRY SCORED" if result == "try" else ("KICK RECOVERED" if result == "attack recovered kick" else ("PASS SHUT DOWN" if reaction_finish == 0 and reaction_release == Vector3.ZERO else result.to_upper()))
	var outcome_color := "#63de9a" if won else "#ff827a"
	var best_side := "INSIDE" if inside_gap > outside_gap else "OUTSIDE"
	var space_sentence := wider.capitalize() + " (sampled clearance)"
	var next_action := retry.replace("Try a ", "").capitalize()
	var iq_message := attack_read + " Outcome alone does not establish decision quality."
	if phase == THREE_V_TWO_PHASE:
		iq_message = _three_on_two_read(result)
	reaction_feedback.text = "[font_size=22][color=%s]%s[/color][/font_size]  [color=#b8c7b8]%s / %s / %s[/color]\n[color=#f5d36b]READ[/color]  %s\n[color=#63de9a]SPACE[/color]  %s\n[color=#7cc8ff]IQ[/color]  %s\n[color=#f5d36b]NEXT[/color]  %s%s" % [
		outcome_color, outcome_title, support_text, draw_text, finish_text, defense_read, space_sentence, iq_message, next_action, comparison_text,
	]
	var marker_origin := focus + Vector3(0, 0.02, -3.0)
	reaction_space_inside.position = marker_origin + Vector3(-4.0, 0, 0)
	reaction_space_outside.position = marker_origin + Vector3(4.0, 0, 0)
	reaction_space_inside.visible = true
	reaction_space_outside.visible = true
	reaction_space_inside.scale = Vector3.ONE * (1.25 if best_side == "INSIDE" else 0.7)
	reaction_space_outside.scale = Vector3.ONE * (1.25 if best_side == "OUTSIDE" else 0.7)
	if is_instance_valid(_mobile_cards):
		_mobile_review_button.show()
		_open_mobile_review()
	else:
		(reaction_feedback.get_parent() as Control).show()

func _receiver_clearance(position: Vector3, opponents: Array[Node3D]) -> float:
	var clearance := INF
	for opponent in opponents:
		clearance = minf(clearance, position.distance_to(opponent.position))
	return clearance

func _three_on_two_read(result: String) -> String:
	if reaction_finish != 0:
		return "The attack reached the try line." if result == "try" else "Review where the defense committed before the finish."
	var timing := ["Auto timing", "Early pass", "Pass after the draw"][pass_timing] as String
	if reaction_release == Vector3.ZERO:
		return timing + ". The defense reached the carrier before release."
	if feedback_catch_defense.is_empty():
		return "The ball was released. The rep ended before the catch."
	var catch_space := INF
	for defender in feedback_catch_defense:
		catch_space = minf(catch_space, defender.distance_to(feedback_catch_point))
	var lane_read := "Both runners had similar room at release."
	if selected_pass_space > other_pass_space + 0.3:
		lane_read = "Your receiver had more room at release."
	elif other_pass_space > selected_pass_space + 0.3:
		lane_read = "The other runner had more room at release."
	var catch_read := "The receiver caught under pressure." if catch_space < 2.0 else "The receiver caught in space."
	return timing + ". " + lane_read + " " + catch_read

func _update_pass_timing_control() -> void:
	pass_timing_choice.visible = not is_instance_valid(_mobile_cards) and phase == THREE_V_TWO_PHASE and reaction_finish_choice.selected == 0

func _reaction_channel_gap(origin: Vector3, lateral: float, defenders_at_read: Array[Vector3]) -> float:
	var sample := Vector2(origin.x + lateral, origin.z - 3.0)
	var gap := INF
	for defender in defenders_at_read:
		gap = minf(gap, sample.distance_to(Vector2(defender.x, defender.z)))
	return gap

# V8C uses the canonical phase selector and reaction controls; no alternate simulation.
func _setup_mobile_playbook(panel: VBoxContainer, controls: HBoxContainer, selector: OptionButton, ribbons_button: Button, training_button: Button) -> void:
	_mobile_cards = MobileCardLayer.new()
	add_child(_mobile_cards)
	_mobile_phase_selector = selector
	selector.hide()
	ribbons_button.hide()
	training_button.hide()
	var row := HBoxContainer.new()
	panel.add_child(row)
	_button(row, "PICK PLAY", _open_mobile_playbook_menu)
	_button(row, "VIEW SETTINGS", _open_mobile_view_settings)
	_button(row, "TRAINING", func(): training_button.pressed.emit())
	_mobile_decision_button = _button(row, "DECISIONS", _open_mobile_decisions)
	_mobile_review_button = _button(row, "REVIEW", _open_mobile_review)
	_mobile_decision_button.hide()
	_mobile_review_button.hide()
	for container in [controls, row]:
		for child in container.get_children():
			if child is Button:
				var button := child as Button
				button.custom_minimum_size.y = 58
				button.add_theme_font_size_override("font_size", 22)
	# Keep Preview and Play/Replay in the original reaction area.
	(reaction_support_choice.get_parent() as Control).hide()
	pass_timing_choice.hide()

func _mobile_playbook_idle() -> bool:
	return not playing and not previewing_defense

func _open_mobile_playbook_menu() -> void:
	if not _mobile_playbook_idle():
		return
	var entries: Array[Dictionary] = [
		{"label": "Formation — 15v15", "action": _mobile_select_phase.bind(0)},
		{"label": "Set plays", "action": _open_mobile_phase_group.bind("SET PLAYS", 1, 2)},
		{"label": "Decision training", "action": _open_mobile_phase_group.bind("DECISION TRAINING", 3, 5)}
	]
	_mobile_cards.open_card("PICK YOUR PLAY", entries)

func _open_mobile_phase_group(heading: String, first: int, last: int) -> void:
	var entries: Array[Dictionary] = []
	for index in range(first, last + 1):
		entries.append({"label": _mobile_phase_selector.get_item_text(index), "action": _mobile_select_phase.bind(index)})
	_mobile_cards.open_card(heading, entries)

func _mobile_select_phase(index: int) -> void:
	if not _mobile_playbook_idle():
		return
	_mobile_phase_selector.select(index)
	_mobile_phase_selector.item_selected.emit(index)
	if _is_reaction_phase():
		_open_mobile_decisions()

func _open_mobile_view_settings() -> void:
	if not _mobile_playbook_idle():
		return
	var entries: Array[Dictionary] = [
		{"label": "Ribbons: " + ("ON" if ribbons.visible else "OFF"), "action": _mobile_toggle_ribbons}
	]
	_mobile_cards.open_card("VIEW SETTINGS", entries)

func _mobile_toggle_ribbons() -> void:
	ribbons.visible = not ribbons.visible

func _open_mobile_decisions() -> void:
	if not _mobile_playbook_idle() or not _is_reaction_phase():
		return
	var entries: Array[Dictionary] = [
		{"label": reaction_support_choice.get_item_text(reaction_support_choice.selected), "action": _open_mobile_decision_options.bind("SUPPORT / TARGET", reaction_support_choice)},
		{"label": reaction_draw_choice.get_item_text(reaction_draw_choice.selected), "action": _open_mobile_decision_options.bind("DRAW", reaction_draw_choice)},
		{"label": reaction_finish_choice.get_item_text(reaction_finish_choice.selected), "action": _open_mobile_decision_options.bind("FINISH", reaction_finish_choice)}
	]
	if phase == THREE_V_TWO_PHASE and reaction_finish_choice.selected == 0:
		entries.append({"label": pass_timing_choice.get_item_text(pass_timing_choice.selected), "action": _open_mobile_decision_options.bind("PASS TIMING", pass_timing_choice)})
	entries.append({"label": "CONFIRM — RETURN TO FIELD", "action": Callable()})
	_mobile_cards.open_card("PLAN YOUR RESPONSE", entries, _mobile_decision_button)

func _open_mobile_decision_options(heading: String, selector: OptionButton) -> void:
	var entries: Array[Dictionary] = []
	for index in range(selector.item_count):
		entries.append({"label": selector.get_item_text(index), "action": _mobile_select_decision.bind(selector, index), "enabled": not selector.is_item_disabled(index)})
	_mobile_cards.open_card(heading, entries)

func _mobile_select_decision(selector: OptionButton, index: int) -> void:
	if not _mobile_playbook_idle() or not _is_reaction_phase() or selector.is_item_disabled(index):
		return
	selector.select(index)
	selector.item_selected.emit(index)
	_open_mobile_decisions()

func _open_mobile_review() -> void:
	_mobile_cards.open_feedback("COACHING REVIEW", reaction_feedback.text, _mobile_review_button)
