"""Run with Blender 4.2 LTS: blender --background --python scripts/motion/convert-phase-e.py"""
import bpy, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),"../..")); OUT=os.path.join(ROOT,"public/motion/assets/phase-e"); os.makedirs(OUT,exist_ok=True)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def import_fbx(name): bpy.ops.import_scene.fbx(filepath=os.path.join(ROOT,"exercise-generation/3dmode",name),use_anim=True,automatic_bone_orientation=False,global_scale=1.0)
def export(name): bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name),export_format='GLB',export_yup=True,export_apply=False,export_skins=True,export_animations=True,export_nla_strips=False,export_all_influences=True,export_morph=False)
reset(); import_fbx("Ch18_nonPBR.fbx")
for obj in bpy.data.objects:
    if obj.animation_data: obj.animation_data_clear()
for action in list(bpy.data.actions): bpy.data.actions.remove(action)
export("canonical-avatar.glb")
reset(); import_fbx("Silly Dancing.fbx")
for obj in list(bpy.data.objects):
    if obj.type not in {'ARMATURE','EMPTY'}: bpy.data.objects.remove(obj,do_unlink=True)
export("animation-fixture.glb")
