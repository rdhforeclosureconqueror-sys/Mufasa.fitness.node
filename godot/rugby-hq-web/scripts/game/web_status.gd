extends Node
var _elapsed := 0.0
var _qa := false
func _ready() -> void:
	if not OS.has_feature("web"):
		set_process(false)
		return
	_qa = "--web-qa" in OS.get_cmdline_user_args()
	JavaScriptBridge.eval("window.rugbyReady && window.rugbyReady()", true)
	set_process(_qa)
func _process(delta: float) -> void:
	_elapsed += delta
	if _elapsed < 0.1:
		return
	_elapsed = 0.0
	var drill = get_parent()
	var p = drill.attacker
	var ap = p._animation_player
	var skeleton = p.get_node("AvatarModel/Armature/Skeleton3D")
	var leg = skeleton.get_bone_pose_rotation(skeleton.find_bone("LeftUpLeg"))
	var button_screen = get_viewport().get_screen_transform() * drill.get_node("HUD/PassButton").get_global_rect().get_center()
	var state := {"position": [p.position.x,p.position.y,p.position.z],
		"forward": [p.visual.global_basis.z.x,p.visual.global_basis.z.z],
		"speed": p.telemetry.get("actual_speed",0), "animation": String(ap.current_animation),
		"animation_time": ap.current_animation_position, "leg": [leg.x,leg.y,leg.z,leg.w],
		"holder": String(drill.possession.name) if drill.possession else "",
		"passes": drill.pass_count, "ball": [drill.ball.position.x,drill.ball.position.y,drill.ball.position.z],
		"ball_visible": drill.ball.is_visible_in_tree(), "walls": drill.get_node("Perimeter").get_child_count(),
		"players": drill.get_node("Players").get_child_count(), "bones": skeleton.get_bone_count(),
		"button_screen": [button_screen.x,button_screen.y], "mouse": [get_viewport().get_mouse_position().x,get_viewport().get_mouse_position().y], "button_hover": drill.get_node("HUD/PassButton").is_hovered(), "over": drill._game_over, "viewport": [get_viewport().get_visible_rect().size.x,get_viewport().get_visible_rect().size.y], "pass_center": [drill.get_node("HUD/PassButton").get_global_rect().get_center().x,drill.get_node("HUD/PassButton").get_global_rect().get_center().y]}
	JavaScriptBridge.get_interface("window").rugbyReport(JSON.stringify(state))
