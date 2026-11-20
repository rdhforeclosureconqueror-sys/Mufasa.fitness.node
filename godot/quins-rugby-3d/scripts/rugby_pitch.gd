extends Node3D
# First visual milestone: generic coaching drill, not the protected RAVENS playbook.
# Rugby logic and coach formations will be delivered through an authenticated adapter.
var attackers: Array[Node3D] = []
var defenders: Array[Node3D] = []
var phase := 0
var elapsed := 0.0
var running := true
var label: Label

const ATTACK_START := [
 Vector3(-19,0,-5), Vector3(-21,0,-2), Vector3(-21,0,1),
 Vector3(-23,0,-3), Vector3(-23,0,0), Vector3(-25,0,-6),
 Vector3(-25,0,3), Vector3(-25,0,-1),
 Vector3(-14,0,1), Vector3(-12,0,5), Vector3(-10,0,10),
 Vector3(-8,0,7), Vector3(-6,0,12), Vector3(-4,0,17), Vector3(-2,0,14)
]
const DEFENSE_START := [
 Vector3(5,0,-16),Vector3(5,0,-12),Vector3(5,0,-8),
 Vector3(5,0,-4),Vector3(5,0,0),Vector3(5,0,4),
 Vector3(5,0,8),Vector3(5,0,12),Vector3(5,0,16),
 Vector3(9,0,-14),Vector3(9,0,-8),Vector3(9,0,-2),
 Vector3(9,0,4),Vector3(9,0,10),Vector3(9,0,16)
]
func _ready() -> void:
 _make_pitch()
 _make_camera()
 _make_ui()
 for i in range(15):
  attackers.append(_player(i + 1, Color(0.89,0.7,0.28), ATTACK_START[i]))
  defenders.append(_player(i + 1, Color(0.75,0.22,0.25), DEFENSE_START[i]))
func _box(parent: Node3D, size: Vector3, pos: Vector3, color: Color) -> MeshInstance3D:
 var mesh := BoxMesh.new()
 mesh.size = size
 var item := MeshInstance3D.new()
 item.mesh = mesh
 item.position = pos
 var mat := StandardMaterial3D.new()
 mat.albedo_color = color
 item.material_override = mat
 parent.add_child(item)
 return item
func _make_pitch() -> void:
 _box(self,Vector3(105,0.3,68),Vector3(0,-0.3,0),Color(0.09,0.31,0.19))
 for x in [-45,-22,0,22,45]:
  _box(self,Vector3(0.25,0.03,65),Vector3(x,-0.11,0),Color(0.89,0.91,0.86))
 for z in [-32,32]:
  _box(self,Vector3(102,0.03,0.25),Vector3(0,-0.11,z),Color(0.89,0.91,0.86))
 var light := DirectionalLight3D.new()
 light.rotation_degrees = Vector3(-55,-25,0)
 add_child(light)
 var env := WorldEnvironment.new()
 env.environment = Environment.new()
 env.environment.background_mode = Environment.BG_COLOR
 env.environment.background_color = Color(0.08,0.12,0.16)
 add_child(env)
func _player(number:int, color:Color, pos:Vector3) -> Node3D:
 var root := Node3D.new()
 root.position = pos
 add_child(root)
 var body := CapsuleMesh.new()
 body.radius = 0.55
 body.height = 2.2
 var mesh := MeshInstance3D.new()
 mesh.mesh = body
 mesh.position.y = 1.2
 var mat := StandardMaterial3D.new()
 mat.albedo_color = color
 mesh.material_override = mat
 root.add_child(mesh)
 var number_label := Label3D.new()
 number_label.text = str(number)
 number_label.font_size = 80
 number_label.pixel_size = 0.004
 number_label.position = Vector3(0,2.6,0)
 number_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
 root.add_child(number_label)
 return root
func _make_camera() -> void:
 var camera := Camera3D.new()
 camera.position = Vector3(0,65,75)
 camera.rotation_degrees = Vector3(-42,0,0)
 camera.fov = 58
 camera.current = true
 add_child(camera)
func _make_ui() -> void:
 var layer := CanvasLayer.new()
 add_child(layer)
 var column := VBoxContainer.new()
 column.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
 column.position = Vector2(16,16)
 layer.add_child(column)
 label = Label.new()
 label.text = "QUIN NATION 3D · Generic pitch prototype"
 column.add_child(label)
 var button := Button.new()
 button.text = "Next phase"
 button.pressed.connect(_next_phase)
 column.add_child(button)
 var reset := Button.new()
 reset.text = "Reset"
 reset.pressed.connect(func(): phase = 0)
 column.add_child(reset)
func _next_phase() -> void:
 phase = (phase + 1) % 4
 elapsed = 0
func _process(delta:float) -> void:
 elapsed += delta
 var t := clampf(elapsed * 1.3,0,1)
 for i in range(15):
  var target := ATTACK_START[i]
  if phase == 1 and i == 11: target = Vector3(1,0,7) # center carry
  if phase >= 2:
   if i == 11: target = Vector3(1,0,7)
   if i == 6 or i == 7: target = Vector3(-0.8,0,7 + (i-6)*1.6) # cleaners
   if i == 8: target = Vector3(-3,0,7) # scrum half
   if i == 9: target = Vector3(-7,0,11) # fly half depth
   if i == 10: target = Vector3(-10,0,17)
  if phase == 3 and i == 9: target = Vector3(0,0,11)
  attackers[i].position = attackers[i].position.lerp(target,minf(delta*2.5,1))
  var d := DEFENSE_START[i]
  if phase >= 2:
   d.x = 4.5 + (i % 2) * 2
   d.z = 7 + (i - 7) * (2.8 if phase == 2 else 3.5)
  defenders[i].position = defenders[i].position.lerp(d,minf(delta*1.6,1))
 label.text = "QUIN NATION 3D · " + ["Set shape","Carry","Ruck + fold","Release + realign"][phase]
