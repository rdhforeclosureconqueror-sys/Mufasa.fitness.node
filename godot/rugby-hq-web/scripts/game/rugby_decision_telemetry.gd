extends RefCounted

const SAMPLE_INTERVAL := 0.1
const MAX_SAMPLES := 6000

var elapsed := 0.0
var sample_clock := 0.0
var active := false
var samples: Array[Dictionary] = []
var decisions: Array[Dictionary] = []
var last_report: Dictionary = {}
var _previous_turbo := false

func begin() -> void:
	elapsed = 0.0
	sample_clock = 0.0
	samples.clear()
	decisions.clear()
	_previous_turbo = false
	active = true

func vector_data(value: Vector3) -> Dictionary:
	return {
		"x": snappedf(value.x, 0.001),
		"y": snappedf(value.y, 0.001),
		"z": snappedf(value.z, 0.001)
	}

func snapshot(drill: Node) -> Dictionary:
	var carrier: Node3D = drill.possession
	var defender: Node3D = drill.defender
	var attacker: Node3D = drill.attacker
	var support: Node3D = drill.support

	var data := {
		"time": snappedf(elapsed, 0.001),
		"possession": str(carrier.name) if carrier else "IN_FLIGHT",
		"attacker_position": vector_data(attacker.global_position),
		"support_position": vector_data(support.global_position),
		"defender_position": vector_data(defender.global_position),
		"attacker_velocity": vector_data(attacker.velocity),
		"support_velocity": vector_data(support.velocity),
		"defender_velocity": vector_data(defender.velocity),
		"ball_position": vector_data(drill.ball.global_position),
		"controlled_player": str(drill.controlled_player.name),
		"turbo_energy": drill.controlled_player.turbo_energy,
		"turbo_active": drill.controlled_player.turbo_active
	}

	var timing: Dictionary = {}
	for runner in drill.tactical_routes.keys():
		var horizontal := Vector3(runner.velocity.x, 0.0, runner.velocity.z)
		timing[str(runner.name)] = {"state": "MANUAL" if runner == drill.controlled_player else ("CARRIER" if runner == carrier else ("CHASE" if drill.kick_in_flight else drill.timing_v6_states.get(runner, "UNSET"))), "actual_speed": horizontal.length(), "target_scale": drill.timing_v6_scales.get(runner, 0.0)}
	data["support_timing"] = timing
	var roster: Dictionary = {}
	for player in drill._active_players():
		roster[str(player.name)] = {"position": vector_data(player.global_position), "velocity": vector_data(player.velocity), "defense": drill._is_defense(player)}
	data["roster"] = roster

	if carrier and not drill._is_defense(carrier):
		var receiver: Node3D = support if carrier == attacker else attacker
		var separation := defender.global_position - carrier.global_position
		var support_offset := receiver.global_position - carrier.global_position

		separation.y = 0.0

		var defender_velocity: Vector3 = defender.velocity
		defender_velocity.y = 0.0

		data["defender_distance"] = separation.length()
		data["defender_approach_speed"] = defender_velocity.dot(-separation.normalized())
		data["support_width"] = absf(support_offset.x)
		data["support_depth"] = support_offset.z
		data["support_distance"] = support_offset.length()
		data["distance_to_try_line"] = maxf(0.0, carrier.global_position.z + 11.0)

	return data

func record(kind: String, drill: Node, details: Dictionary = {}) -> void:
	if not active:
		return

	var entry := snapshot(drill)
	entry["event"] = kind
	entry["details"] = details.duplicate(true)
	decisions.append(entry)

	print("[RUGBY TELEMETRY] ", kind, " at ", elapsed)

func tick(delta: float, drill: Node) -> void:
	if not active:
		return

	elapsed += delta
	sample_clock += delta

	var turbo: bool = drill.controlled_player.turbo_active

	if turbo != _previous_turbo:
		record("TURBO_START" if turbo else "TURBO_END", drill)
		_previous_turbo = turbo

	if sample_clock >= SAMPLE_INTERVAL:
		sample_clock = fmod(sample_clock, SAMPLE_INTERVAL)

		if samples.size() < MAX_SAMPLES:
			samples.append(snapshot(drill))

func finish(outcome: String, drill: Node) -> void:
	if not active:
		return

	record("PLAY_END", drill, {"outcome": outcome})
	active = false

	last_report = {
		"schema_version": 1,
		"outcome": outcome,
		"duration_seconds": elapsed,
		"sample_count": samples.size(),
		"sample_limit_reached": samples.size() >= MAX_SAMPLES,
		"decision_count": decisions.size(),
		"decisions": decisions.duplicate(true),
		"samples": samples.duplicate(true)
	}

	var path := "user://rugby_last_play.json"
	var file := FileAccess.open(path, FileAccess.WRITE)

	if file:
		file.store_string(JSON.stringify(last_report, "  "))
		file.close()
		print("[RUGBY TELEMETRY] REPORT SAVED: ", ProjectSettings.globalize_path(path))
		print("[RUGBY TELEMETRY] Samples: ", samples.size(), " Events: ", decisions.size())
	else:
		push_warning("Rugby telemetry report could not be saved.")
