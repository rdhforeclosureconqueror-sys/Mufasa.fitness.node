extends CanvasLayer
## V8C mobile card foundation. Scene adapters must bind existing actions.
## No gameplay state is owned by this layer.
signal card_closed

var _root: Control
var _shade: ColorRect
var _panel: PanelContainer
var _title: Label
var _entries: VBoxContainer
var _focus_return: Control

static func is_mobile() -> bool:
	return DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")

func _ready() -> void:
	layer = 20
	_root = Control.new()
	add_child(_root)
	_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_shade = ColorRect.new()
	_root.add_child(_shade)
	_shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_shade.color = Color("#071a22cc")
	_shade.mouse_filter = Control.MOUSE_FILTER_STOP
	var center := CenterContainer.new()
	_shade.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel = PanelContainer.new()
	center.add_child(_panel)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#10291f")
	style.border_color = Color("#dec48a")
	style.set_border_width_all(2)
	style.set_corner_radius_all(16)
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	_panel.add_theme_stylebox_override("panel", style)
	var body := VBoxContainer.new()
	_panel.add_child(body)
	body.add_theme_constant_override("separation", 12)
	_title = Label.new()
	_title.add_theme_font_size_override("font_size", 30)
	_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(_title)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(scroll)
	_entries = VBoxContainer.new()
	_entries.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_entries.add_theme_constant_override("separation", 10)
	scroll.add_child(_entries)
	var close := Button.new()
	close.text = "CLOSE"
	close.custom_minimum_size.y = 64
	close.add_theme_font_size_override("font_size", 24)
	close.pressed.connect(close_card)
	body.add_child(close)
	get_viewport().size_changed.connect(_resize_card)
	_resize_card()
	_shade.hide()

func _resize_card() -> void:
	var viewport_size := get_viewport().get_visible_rect().size
	_panel.custom_minimum_size.x = minf(720.0, maxf(120.0, viewport_size.x - 40.0))
	var scroll := _entries.get_parent() as ScrollContainer
	scroll.custom_minimum_size.y = minf(340.0, maxf(60.0, viewport_size.y - 180.0))

func open_card(heading: String, entries: Array[Dictionary], focus_return: Control = null) -> void:
	_focus_return = focus_return
	_title.text = heading
	for child in _entries.get_children():
		_entries.remove_child(child)
		child.queue_free()
	for entry in entries:
		var button := Button.new()
		button.text = str(entry.get("label", ""))
		button.custom_minimum_size.y = 72
		button.add_theme_font_size_override("font_size", 26)
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.disabled = not bool(entry.get("enabled", true))
		var action: Callable = entry.get("action", Callable())
		button.pressed.connect(_activate.bind(action))
		_entries.add_child(button)
	_shade.show()
	(_entries.get_parent() as ScrollContainer).scroll_vertical = 0
	if _entries.get_child_count() > 0:
		(_entries.get_child(0) as Control).grab_focus()

func _activate(action: Callable) -> void:
	close_card()
	if action.is_valid():
		action.call()

func close_card() -> void:
	_shade.hide()
	if is_instance_valid(_focus_return) and _focus_return.is_visible_in_tree():
		_focus_return.grab_focus()
	_focus_return = null
	card_closed.emit()

func is_open() -> bool:
	return is_instance_valid(_shade) and _shade.visible
