extends Node
var _elapsed := 0.0
var _qa := false

func _ready() -> void:
	if not OS.has_feature("web"):
		set_process(false)
		return
	_qa = "--web-qa" in OS.get_cmdline_user_args()
	_report_ready.call_deferred()
	set_process(_qa)

func _report_ready() -> void:
	JavaScriptBridge.eval("window.rugbyReady && window.rugbyReady()", true)

func _point(control: Control) -> Array:
	var point := get_viewport().get_screen_transform() * control.get_global_rect().get_center()
	return [point.x, point.y]

func _vector(value: Vector3) -> Array:
	return [value.x, value.y, value.z]

func _process(delta: float) -> void:
	_elapsed += delta
	if _elapsed < 0.1:
		return
	_elapsed = 0.0
	var scene = get_parent()
	var state: Dictionary
	if scene is TrainingDrill:
		var p = scene.controlled_player
		var ap = p._animation_player
		var skeleton = p.get_node("AvatarModel/Armature/Skeleton3D")
		var leg = skeleton.get_bone_pose_rotation(skeleton.find_bone("LeftUpLeg"))
		state = {"scene": "training", "position": _vector(p.position), "controlled": String(p.name),
			"forward": [p.visual.global_basis.z.x,p.visual.global_basis.z.z], "body_yaw": p.rotation.y,
			"speed": p.telemetry.get("actual_speed",0), "animation": String(ap.current_animation),
			"animation_time": ap.current_animation_position if ap.current_animation != "" else 0.0, "leg": [leg.x,leg.y,leg.z,leg.w],
			"holder": String(scene.possession.name) if scene.possession else "", "passes": scene.pass_count,
			"ball": _vector(scene.ball.position), "ball_visible": scene.ball.is_visible_in_tree(),
			"walls": scene.get_node("Perimeter").get_child_count(), "bones": skeleton.get_bone_count(),
			"players": scene._active_players().size(), "status": scene._message, "over": scene._game_over,
			"waiting": scene.waiting_to_start, "countdown": scene.countdown_running, "scenario": scene.scenario_mode,
			"joystick_visible": scene.get_node("HUD/VirtualJoystick").is_visible_in_tree(),
			"button_screen": _point(scene.get_node("HUD/PassButton")),
			"restart_screen": _point(scene.get_node("HUD/RestartButton")),
			"start_screen": _point(scene.start_play_button), "last_touch": [scene.last_touch.x, scene.last_touch.y]}
	else:
		state = {"scene": "playbook", "phase": scene.phase, "playing": scene.playing,
			"progress": scene.progress, "status": scene.status.text, "defense": scene.defense_look,
			"pass_timing": scene.pass_timing, "receiver_cut": scene.receiver_cut,
			"release": _vector(scene.reaction_release), "ball": _vector(scene.reaction_ball.position),
			"ball_visible": scene.reaction_ball.visible, "attackers": scene.attackers.filter(func(p): return p.visible).size(),
			"defenders": scene.defenders.filter(func(p): return p.visible).size()}
	var controls: Array = []
	for control in scene.find_children("*", "BaseButton", true, false):
		if not control.is_visible_in_tree():
			continue
		var entry := {"name": String(control.name), "text": control.text, "center": _point(control), "disabled": control.disabled}
		if control is OptionButton:
			entry["options"] = []
			for index in control.item_count:
				entry["options"].append(control.get_item_text(index))
			entry["selected"] = control.selected
			var popup: PopupMenu = control.get_popup()
			if popup.visible:
				entry["popup_items"] = []
				for index in control.item_count:
					var local_point := Vector2(popup.position) + Vector2(popup.size.x * 0.5, 4.0 + (popup.size.y - 8.0) * (index + 0.5) / control.item_count)
					var screen_point := get_viewport().get_screen_transform() * local_point
					entry["popup_items"].append([screen_point.x, screen_point.y])
		controls.append(entry)
	state["controls"] = controls
	state["viewport"] = [get_viewport().get_visible_rect().size.x,get_viewport().get_visible_rect().size.y]
	JavaScriptBridge.get_interface("window").rugbyReport(JSON.stringify(state))
