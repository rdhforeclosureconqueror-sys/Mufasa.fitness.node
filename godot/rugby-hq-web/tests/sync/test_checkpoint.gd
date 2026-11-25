extends GutTest
var arena
var results: Array = []

func before_all():
	arena = load("res://playbook/playbook_arena.tscn").instantiate()
	add_child(arena)
	arena.set_process(false)
	await get_tree().process_frame

func after_all():
	var file := FileAccess.open("user://checkpoint-matrix.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(results, "  "))
	arena.free()

func after_each():
	# Formation changes queue ribbon frees; allow the deferred deletes to finish.
	await get_tree().process_frame

func setup_rep(phase: int, defense: int, target: int, draw: int, finish := 0, timing := 0):
	arena._load_phase(phase)
	arena.defense_look = defense
	arena.reaction_support_choice.select(target)
	arena.reaction_draw_choice.select(draw)
	arena.reaction_finish_choice.select(finish)
	arena.pass_timing_choice.select(timing)
	arena._start_reaction()

func run_rep() -> String:
	var steps := 0
	while arena.playing and steps < 900:
		arena._update_reaction(1.0 / 120.0)
		steps += 1
	assert_false(arena.playing, "rep reaches a simulation outcome")
	var status: String = arena.status.text
	var runner = arena._selected_support()
	var carrier = arena.attackers[arena.REACTION_CARRIER]
	var holder = runner if arena.reaction_finish == 0 and arena.progress >= arena._pass_catch_time() else carrier
	var pair = arena._reaction_defenders()
	if " | Try | " in status:
		assert_lte(holder.position.z, arena.DRILL_TRY_LINE, "try requires crossing line")
		for defender in pair:
			assert_gte(defender.position.distance_to(holder.position), arena.TOUCH_DISTANCE, "try requires no touch")
	elif "touched" in status:
		var touching := false
		for defender in pair:
			touching = touching or defender.position.distance_to(holder.position) < arena.TOUCH_DISTANCE
		assert_true(touching, "touch requires actual proximity")
	elif "recovered kick" in status:
		var attack_gap: float = minf(carrier.position.distance_to(arena.reaction_ball.position), runner.position.distance_to(arena.reaction_ball.position))
		var defense_gap := INF
		for defender in pair:
			defense_gap = minf(defense_gap, defender.position.distance_to(arena.reaction_ball.position))
		assert_lt(minf(attack_gap, defense_gap), 0.75, "recovery requires reaching ball")
		assert_eq("Attack recovered" in status, attack_gap < defense_gap, "nearest side recovers")
	else:
		assert_true("Time expired" in status, "no fabricated outcome")
	results.append({"phase":arena.phase,"defense":arena.defense_look,"target":arena.reaction_lane,"draw":arena.reaction_draw,"finish":arena.reaction_finish,"timing":arena.pass_timing,"status":status,"time":arena.progress})
	return status

func test_all_16_automatic_3v2_pass_combinations():
	var count := 0
	for defense in range(4):
		for target in range(2):
			for draw in range(2):
				setup_rep(5, defense, target, draw)
				run_rep()
				count += 1
	assert_eq(count, 16)

func test_receiver_selection_is_neutral_before_release():
	for defense in range(4):
		for draw in range(2):
			var snapshots: Array = []
			for target in range(2):
				setup_rep(5, defense, target, draw)
				for step in range(48):
					arena._update_reaction(1.0 / 120.0)
				snapshots.append([arena.attackers[11].position,arena.attackers[12].position,arena.defenders[11].position,arena.defenders[12].position])
			for index in range(4):
				assert_almost_eq(snapshots[0][index], snapshots[1][index], Vector3.ONE * 0.0001, "selection cannot move runners or defense before release")

func test_early_and_late_release_against_double_blitz():
	for target in range(2):
		for draw in range(2):
			setup_rep(5, 1, target, draw, 0, 1)
			run_rep()
			assert_ne(arena.reaction_release, Vector3.ZERO, "early release escapes carrier pressure")
			setup_rep(5, 1, target, draw, 0, 2)
			var late := run_rep()
			assert_eq(arena.reaction_release, Vector3.ZERO, "late carrier touched before release")
			assert_true("Carrier touched" in late)

func test_2v1_2v2_and_real_try_touch_kick_outcomes():
	var outcomes := {"try":0,"touch":0,"kick":0}
	for phase in [3,4]:
		for defense in ([0,3] if phase == 4 else [0,1,2,3]):
			for finish in range(4):
				for target in range(2):
					for draw in range(2):
						setup_rep(phase, defense, target, draw, finish)
						var outcome := run_rep()
						if " | Try | " in outcome: outcomes.try += 1
						if "touched" in outcome: outcomes.touch += 1
						if "recovered kick" in outcome: outcomes.kick += 1
	for key in outcomes:
		assert_gt(outcomes[key], 0, "matrix exercises real " + key)

func test_ball_transfer_receiver_exit_and_replay():
	setup_rep(5, 2, 1, 1)
	while arena.progress < arena._pass_catch_time() + 0.02 and arena.playing:
		arena._update_reaction(1.0 / 120.0)
	assert_almost_eq(arena.reaction_ball.position, arena._reaction_hands(arena._selected_support()), Vector3.ONE * 0.001)
	assert_true(absf(arena.receiver_cut) == 4.0, "receiver selects exit from actual defenders")
	var first := run_rep()
	var end: Vector3 = arena._selected_support().position
	setup_rep(5, 2, 1, 1)
	assert_eq(arena.reaction_release, Vector3.ZERO)
	assert_eq(arena.receiver_cut, 0.0)
	assert_true(arena.feedback_catch_defense.is_empty())
	assert_eq(run_rep(), first, "same choices replay same simulation")
	assert_almost_eq(arena._selected_support().position, end, Vector3.ONE * 0.001)

func test_full_formation_and_defensive_assignments():
	for phase in range(3):
		arena._load_phase(phase)
		assert_eq(arena.attackers.size(), 15)
		assert_eq(arena.defenders.size(), 15)
		assert_eq(arena.defensive_assignments.size(), 15)
		assert_eq(arena.start_positions.size(), 15)
		assert_true(arena.attackers.all(func(p): return p.visible))
		assert_true(arena.defenders.all(func(p): return p.visible))

func test_training_scenarios_and_double_wedge_reset():
	var drill = load("res://scenes/training_drill.tscn").instantiate()
	add_child(drill)
	drill.set_physics_process(false)
	await get_tree().process_frame
	for scenario in range(6):
		drill._change_scenario(scenario)
		assert_true(drill.waiting_to_start)
		assert_eq(drill.possession, drill.attacker)
		assert_true(drill.ball.visible)
		assert_eq(drill.ball.linear_velocity, Vector3.ZERO)
		assert_eq(drill.ball.collision_mask, 0)
		drill._start_scenario()
		drill._update_countdown(3.1)
		assert_false(drill.waiting_to_start)
		assert_true(drill._active_players().all(func(p): return p.control_enabled))
		if scenario == 5:
			assert_eq(drill._attack_roster().size(), 6)
			assert_eq(drill._defense_roster().size(), 4)
			drill._update_wedge_v7()
			assert_gt(drill.tactical_routes.size(), 0)
		drill._reset_drill()
		assert_false(drill._game_over)
	drill.free()

func test_animation_loops_and_no_horizontal_root_motion():
	var player = arena.attackers[0]
	for name in ["Walk", "Run"]:
		assert_true(player._animation_player.has_animation(name))
		var clip: Animation = player._animation_player.get_animation(name)
		assert_eq(clip.loop_mode, Animation.LOOP_LINEAR)
		for track in clip.get_track_count():
			assert_true(str(clip.track_get_path(track)).begins_with("Armature/Skeleton3D:"))
			if str(clip.track_get_path(track)).ends_with(":Hips") and clip.track_get_type(track) == Animation.TYPE_POSITION_3D:
				var origin: Vector3 = clip.track_get_key_value(track, 0)
				for key in clip.track_get_key_count(track):
					var value: Vector3 = clip.track_get_key_value(track, key)
					assert_almost_eq(Vector2(value.x,value.z), Vector2(origin.x,origin.z), Vector2.ONE * 0.0001)
