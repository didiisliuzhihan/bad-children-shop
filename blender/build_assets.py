"""Original, editable production assets for Bad Children Shop.
Run with: blender --background --python blender/build_assets.py
The .blend masters, uncompressed GLBs and delivery GLBs are all preserved.
"""
import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'/'delivery'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets'/'source'/'models'; SOURCE.mkdir(parents=True,exist_ok=True)
random.seed(48)

def mat(name,color,rough=.4,metal=0,trans=0,coat=.2):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    p.inputs['Transmission Weight'].default_value=trans;p.inputs['Coat Weight'].default_value=coat
    p.inputs['IOR'].default_value=1.45
    return m

def reset():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def finish(o,name,m,parent=None):
    o.name=name
    if m:o.data.materials.append(m)
    if parent:o.parent=parent
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o

def empty(name,loc=(0,0,0),parent=None):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.parent=parent;return o

def sphere(name,loc,scale,m,parent=None,seg=32,rings=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
    o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,m,parent)

def box(name,loc,size,m,bevel=.1,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Soft molded edges','BEVEL');mod.width=bevel;mod.segments=4
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)

def cylinder(name,loc,radius,depth,m,parent=None,front=False,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=bpy.context.object
    if front:o.rotation_euler[0]=math.pi/2
    mod=o.modifiers.new('Rounded lip','BEVEL');mod.width=min(.035,depth*.3);mod.segments=3
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)

def torus(name,loc,major,minor,m,parent=None,front=False):
    bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=10,location=loc,major_radius=major,minor_radius=minor)
    o=bpy.context.object
    if front:o.rotation_euler[0]=math.pi/2
    return finish(o,name,m,parent)

def path(name,points,radius,m,parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
    return finish(o,name,m,parent)

def tapered(name,points,radii,m,parent=None,sides=16):
    verts=[];faces=[]
    for i,(co,r) in enumerate(zip(points,radii)):
        p=Vector(co);t=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        t.normalize();ref=Vector((0,1,0));a=t.cross(ref).normalized();b=t.cross(a).normalized()
        for j in range(sides):verts.append(tuple(p+r*(math.cos(j*math.tau/sides)*a+math.sin(j*math.tau/sides)*b)))
    for i in range(len(points)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(range(sides-1,-1,-1)));faces.append(tuple((len(points)-1)*sides+j for j in range(sides)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    mod=o.modifiers.new('Organic surface','SUBSURF');mod.levels=1
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m,parent)

def text(name,value,loc,size,m,parent=None):
    c=bpy.data.curves.new(name,'FONT');c.body=value;c.align_x='CENTER';c.align_y='CENTER';c.size=size;c.extrude=.003;c.bevel_depth=.001;c.resolution_u=6
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0)
    return finish(o,name,m,parent)

def hemisphere(name,r,m,upper=True,parent=None,loc=(0,0,0),segments=48,rings=14):
    verts=[];faces=[];sign=1 if upper else -1
    for j in range(rings+1):
        a=.001+(math.pi/2-.001)*j/rings
        for i in range(segments):
            t=i*math.tau/segments;verts.append((r*math.sin(a)*math.cos(t),r*math.sin(a)*math.sin(t),sign*r*math.cos(a)))
    for j in range(rings):
        for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;face=(a,b,b+segments,a+segments);faces.append(face if upper else tuple(reversed(face)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc
    return finish(o,name,m,parent)

def animation(o,name,keys,prop):
    for frame,value in keys:setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=frame)
    a=o.animation_data.action;a.name=name
    track=o.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,a)
    o.animation_data.action=None

def studio(target=(0,0,2.8),camera=(7,-13,8),ortho=7.5):
    sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True
    sc.render.resolution_x=1000;sc.render.resolution_y=1200;sc.render.resolution_percentage=100
    sc.world.color=(.2,.25,.3)
    for name,loc,power,size,col in [('Key',(-4,-6,9),900,6,(1,.9,.79)),('Fill',(5,-1,6),650,5,(.65,.81,1)),('Rim',(1,4,7),1100,4,(.8,.9,1))]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=col;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=camera);o=bpy.context.object;o.name='Product portrait';o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=ortho;sc.camera=o
    sc.render.film_transparent=True

stats={}
def export(name,root,render=False):
    sc=bpy.context.scene;sc.render.fps=30;sc.frame_set(1)
    # Keep the editable high-resolution topology in the .blend and use a
    # nondestructive reduction modifier for the shipping geometry.
    ratio={'gashapon_machine':.39,'toy_jimao':.68,'toy_kuku_sunflower':.42}.get(name,1)
    if ratio<1:
        for o in root.children_recursive:
            if o.type=='MESH' and len(o.data.polygons)>160:
                mod=o.modifiers.new('Mobile geometry budget','DECIMATE');mod.ratio=ratio;mod.use_collapse_triangulate=True
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/f'{name}.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    for o in [root]+list(root.children_recursive):o.select_set(True)
    args=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=True,export_extras=True)
    bpy.ops.export_scene.gltf(filepath=str(SOURCE/f'{name}.glb'),**args)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,**args)
    dg=bpy.context.evaluated_depsgraph_get()
    stats[name]={'triangles':sum(sum(len(p.vertices)-2 for p in o.evaluated_get(dg).data.polygons) for o in root.children_recursive if o.type=='MESH'),'deliveryBytes':(OUT/f'{name}.glb').stat().st_size}
    if render:
        sc.render.filepath=str(OUT/f'{name}.png');bpy.ops.render.render(write_still=True)

reset()
blue=mat('Powder blue molded plastic',(.24,.48,.61),.42)
edge=mat('Cool porcelain trim',(.59,.75,.82),.35)
red=mat('Brick ember enamel',(.50,.024,.012),.31,coat=.35)
ink=mat('Ink navy',(.009,.027,.042),.36)
glass=mat('Optical blue glass',(.78,.91,.98),.065,trans=1,coat=.3)
cream=mat('Warm ivory soft vinyl',(.83,.74,.60),.48)
hair=mat('Espresso hair',(.038,.028,.026),.43)
skin=mat('Peach porcelain skin',(.92,.60,.43),.4)
pink=mat('Peach blush',(.84,.26,.24),.5)
green=mat('Pistachio iris',(.25,.49,.14),.22,coat=.5)
white=mat('Milk white',(.93,.96,.89),.25)
horn=mat('Brown horn tips',(.14,.095,.072),.4)
steel=mat('Brushed nickel',(.52,.66,.69),.3,.65)
root=empty('gashapon_machine')
box('body_main',(0,0,.95),(2.15,1.53,1.55),blue,.16,root)
box('body_accent_trim',(0,-.005,.19),(2.28,1.64,.27),red,.12,root)
box('body_top_lip',(0,0,1.71),(2.22,1.6,.13),edge,.06,root)
for x in [-.8,.8]:
    for y in [-.52,.52]:cylinder('rubber_foot',(x,y,.075),.14,.11,ink,root)
box('display_bezel',(-.4,-.775,1.04),(1.03,.14,1.0),edge,.12,root)
box('display_screen',(-.4,-.862,1.04),(.84,.055,.84),ink,.11,root)
box('dispense_slot',(-.4,-.903,.84),(.68,.032,.39),ink,.07,root)
text('display_copy','A LITTLE BAD',(-.4,-.907,1.26),.093,edge,root)
text('display_copy_2','A LOT TO LOVE',(-.4,-.907,1.12),.079,edge,root)
hemisphere('dispense_bowl',.44,red,False,root,(-.4,-1.01,.55))
torus('dispense_bowl_lip',(-.4,-1.01,.55),.43,.042,red,root)
knob=empty('knob_dial',(.66,-.94,1.15),root)
cylinder('knob_backplate',(0,.025,0),.36,.07,steel,knob,True)
cylinder('knob_face',(0,-.04,0),.31,.16,red,knob,True)
torus('knob_rim',(0,-.139,0),.244,.038,red,knob,True)
bar=box('knob_icon_forbidden',(0,-.16,0),(.48,.12,.105),red,.044,knob);bar.rotation_euler[1]=-.72
cylinder('status_lamp',(.73,-.805,.55),.078,.05,red,root,True)
text('serial_label','BC / 001',(.67,-.815,.34),.068,ink,root)
for x in [-.94,.94]:
    for z in [.42,1.49]:
        cylinder('inset_screw',(x,-.78,z),.025,.018,steel,root,True,20)
        box('screw_slot',(x,-.798,z),(.027,.007,.004),ink,.001,root)
for z in [.75,.85,.95,1.05,1.15]:box('side_vent',(1.083,.15,z),(.014,.52,.025),ink,.008,root)
dome=sphere('dome_glass',(0,0,2.7),(1.12,.79,1.05),glass,root,48,28)
torus('dome_base_ring',(0,0,1.78),.88,.05,steel,root)
capMats=[mat('Capsule porcelain '+str(i),c,.34,coat=.38) for i,c in enumerate([(.55,.7,.76),(.86,.80,.59),(.54,.63,.47),(.67,.72,.83)])]
pool=empty('capsules_pool',(0,0,2.5),root)
for i in range(18):
    angle=i*2.399; r=.65*math.sqrt((i%6+1)/6); z=(i//6)*.38-.36
    sphere(f'capsule_placeholder_{i:02}',(r*math.cos(angle),r*.67*math.sin(angle),z),(.235,.235,.235),capMats[i%4],pool,12,8)
box('banner_shop_sign',(0,-.025,3.79),(2.17,1.16,.31),red,.12,root)
box('banner_inset',(0,-.609,3.79),(1.94,.02,.21),red,.04,root)
text('brand_embossed','BAD CHILDREN SHOP',(0,-.632,3.79),.147,ink,root)

# Hand-built collectible topper, inspired by the supplied horned-hood reference.
top=empty('character_topper',(0,0,0),root)
sphere('hood_body',(0,.03,4.2),(.59,.44,.48),cream,top)
hood=sphere('hood_main',(0,.065,5.10),(.91,.59,.96),cream,top)
sphere('hair_cap',(0,-.22,5.06),(.72,.45,.76),hair,top)
sphere('face',(0,-.445,4.97),(.65,.27,.59),skin,top,48,32)
for s in [-1,1]:
    sphere('human_ear',(s*.65,-.35,4.91),(.13,.10,.18),skin,top)
    e=sphere('hood_ear',(s*.89,.0,5.20),(.29,.13,.17),cream,top);e.rotation_euler[1]=s*.23
    sphere('hood_ear_inner',(s*.93,-.104,5.18),(.18,.035,.09),pink,top)
    tapered('hood_horn',[(s*.66,.04,5.69),(s*.89,.07,5.84),(s*.97,.11,6.06),(s*.94,.12,6.25)],[.18,.15,.095,.005],horn,top)
    sphere('hood_eye',(s*.23,-.508,5.78),(.068,.047,.083),hair,top)
    sphere('eye_white',(s*.27,-.689,5.00),(.178,.065,.202),white,top)
    sphere('eye_iris',(s*.27,-.746,5.00),(.125,.04,.151),green,top)
    sphere('eye_pupil',(s*.27,-.783,5.008),(.063,.018,.09),hair,top)
    sphere('eye_catchlight',(s*.27-.033,-.805,5.073),(.038,.012,.038),white,top,16,10)
    path('upper_eyelid',[(s*.11,-.737,5.07),(s*.23,-.756,5.185),(s*.41,-.709,5.11)],.025,hair,top)
    sphere('face_blush',(s*.42,-.654,4.82),(.116,.018,.065),pink,top)
    for j in range(2):path('cheek_freckle',[(s*(.37+j*.065),-.675,4.85),(s*(.385+j*.065),-.683,4.80)],.010,red,top)
    for j in range(5):
        x=s*(.60+.045*math.sin(j*1.8));z=4.58-j*.118
        o=sphere('braid_segment',(x,-.29,z),(.105,.12,.13),hair,top,20,12);o.rotation_euler[1]=s*(.45 if j%2 else -.45)
    torus('braid_tie',(s*.60,-.29,4.015),.083,.017,ink,top)
    sphere('braid_tip',(s*.60,-.29,3.96),(.071,.09,.13),hair,top)
for i in range(7):
    x=(i-3)*.18
    tapered('bang',[(x*.85,-.32,5.64),(x,-.58,5.50),(x+.05,-.693,5.24),(x+.09,-.66,5.15+abs(x)*.15)],[.145,.14,.09,.004],hair,top,12)
path('smile',[(-.135,-.72,4.765),(0,-.738,4.728),(.135,-.72,4.772)],.021,pink,top)
sphere('nose_tip',(0,-.722,4.872),(.063,.048,.065),skin,top)
for s in [-1,1]:path('hood_drawstring',[(s*.14,-.37,4.41),(s*.20,-.459,4.25),(s*.08,-.461,4.13)],.022,cream,top)
sphere('skull_charm',(0,-.449,4.18),(.115,.039,.105),cream,top)
for x in [-.044,.044]:sphere('skull_eye',(x,-.487,4.20),(.03,.008,.038),hair,top,16,8)
for x in [-.043,0,.043]:box('skull_tooth',(x,-.45,4.09),(.032,.05,.057),cream,.011,top)
animation(knob,'knob_drag',[(1,(0,0,0)),(31,(0,math.pi*1.3,0))],'rotation_euler')
animation(pool,'capsules_idle_spin',[(1,(0,0,0)),(121,(0,0,math.tau))],'rotation_euler')
drop=empty('dispense_capsule',(-.4,-.15,2.4),root)
sphere('opaque_delivery_capsule',(0,0,0),(.30,.30,.30),capMats[0],drop,24,16)
animation(drop,'capsule_dispense',[(1,(-.4,-.15,2.4)),(10,(-.4,-.3,1.8)),(22,(-.4,-.93,.86)),(28,(-.4,-1,.68)),(34,(-.4,-1,.83)),(46,(-.4,-1,.69))],'location')
studio();export('gashapon_machine',root)

reset()
orange=mat('Jimao golden tangerine',(.98,.43,.08),.42,coat=.24)
lightorange=mat('Jimao honey muzzle',(1,.57,.15),.4)
navy=mat('Jimao glossy blueberry',(.018,.10,.27),.22,coat=.5)
root=empty('toy_jimao')
sphere('neck_body_base',(0,.05,.33),(.43,.33,.38),orange,root)
sphere('head_main',(0,0,.90),(.68,.44,.57),orange,root,48,30)
sphere('muzzle',(0,-.315,.75),(.38,.14,.24),lightorange,root)
e=sphere('ear_left',(-.65,-.015,.92),(.19,.15,.41),orange,root);e.rotation_euler[1]=-.2
e=sphere('ear_right',(.64,.005,1.14),(.185,.155,.38),lightorange,root);e.rotation_euler[1]=-.31
for s in [-1,1]:
    sphere('eye_'+str(s),(s*.245,-.407,1.04),(.077,.06,.094),navy,root)
    sphere('catchlight_'+str(s),(s*.245-.017,-.462,1.075),(.018,.009,.023),white,root,16,10)
    sphere('cheek_blush_'+str(s),(s*.398,-.364,.816),(.083,.022,.074),pink,root,24,12)
sphere('nose',(0,-.491,.914),(.131,.088,.093),navy,root)
path('mouth_groove',[(-.139,-.456,.797),(-.10,-.476,.71),(0,-.485,.685),(.105,-.472,.72),(.149,-.453,.796)],.015,navy,root)
studio((0,0,.75),(2,-5,2.25),2.3);export('toy_jimao',root,True)

reset()
yellow=mat('Kuku glossy marigold',(.95,.67,.075),.18,coat=.58)
pinkface=mat('Kuku rose milk',(1,.46,.52),.2,coat=.5)
leaf=mat('Kuku jade leaves',(.20,.48,.12),.22,coat=.45)
boot=mat('Kuku moss wellies',(.31,.53,.17),.22,coat=.5)
dot=mat('Wellie lime polka dots',(.59,.76,.31),.3)
tears=mat('Glossy blue teardrop',(.16,.58,.85),.08,trans=.28,coat=.6)
root=empty('toy_kuku_sunflower')
sphere('body_torso',(0,.035,.58),(.30,.22,.36),leaf,root)
for s in [-1,1]:
    cylinder('boot_shaft',(s*.18,0,.29),.155,.42,boot,root)
    sphere('leg_boot',(s*.18,-.065,.125),(.20,.27,.15),boot,root)
    for x,y,z in [(s*.18,-.323,.14),(s*.18-.075,-.167,.36),(s*.18+.065,-.164,.25)]:sphere('boot_dot',(x,y,z),(.034,.009,.037),dot,root,16,8)
for i in range(8):
    a=math.tau*i/8
    o=sphere(f'petal_{i}',(math.cos(a)*.48,.055,1.20+math.sin(a)*.48),(.265,.19,.31),yellow,root,28,20)
    o.rotation_euler[1]=math.pi/2-a
sphere('head_face',(0,-.13,1.20),(.46,.20,.47),pinkface,root,48,30)
for s in [-1,1]:
    sphere('eye_'+str(s),(s*.183,-.319,1.285),(.127,.074,.155),hair,root)
    sphere('catchlight_'+str(s),(s*.183-.028,-.385,1.35),(.035,.014,.035),white,root,20,12)
    sphere('cheek_'+str(s),(s*.273,-.309,1.09),(.077,.016,.039),pink,root)
    o=sphere('leaf_arm_'+str(s),(s*.69,-.015,1.16),(.275,.105,.14),leaf,root);o.rotation_euler[1]=s*.16
    path('leaf_vein_'+str(s),[(s*.46,-.111,1.16),(s*.7,-.123,1.19),(s*.9,-.05,1.19)],.012,dot,root)
    tapered('tear_'+str(s),[(s*.235,-.378,1.17),(s*.242,-.375,1.075),(s*.239,-.363,1.025)],[.008,.038,.023],tears,root,16)
sphere('beak_nose',(0,-.353,1.128),(.087,.078,.05),yellow,root)
path('antenna_stem',[(.06,.12,1.58),(.04,.12,1.91),(-.15,.1,2.04)],.025,leaf,root)
for i in range(7):
    a=i*math.tau/7
    o=sphere('antenna_petal',(-.16+math.cos(a)*.143,.09,2.07+math.sin(a)*.143),(.07,.037,.11),yellow,root,20,12);o.rotation_euler[1]=math.pi/2-a
sphere('antenna_flower_head',(-.16,.045,2.07),(.108,.045,.11),yellow,root)
for x in [-.197,-.123]:sphere('antenna_eye',(x,-.0,2.093),(.012,.008,.018),hair,root,12,8)
path('antenna_smile',[(-.203,-.002,2.047),(-.16,-.009,2.025),(-.117,-.002,2.047)],.008,hair,root)
studio((0,0,1),(2,-5,2.4),2.8);export('toy_kuku_sunflower',root,True)

reset();root=empty('capsule_shell')
top=hemisphere('shell_top',.8,glass,True,root)
bottom=hemisphere('shell_bottom',.8,edge,False,root)
torus('shell_top_seam',(0,0,0),.798,.017,glass,top)
torus('shell_bottom_seam',(0,0,0),.798,.027,edge,bottom)
animation(top,'shell_open',[(1,(0,0,0)),(31,(-1.1,.05,.45))],'location')
animation(bottom,'shell_open',[(1,(0,0,0)),(31,(1.1,.0,-.35))],'location')
studio((0,0,0),(2,-5,2),3);export('capsule_shell',root)
(ROOT/'assets'/'asset-report.json').write_text(json.dumps(stats,indent=2))
print('ASSET REPORT',json.dumps(stats))
