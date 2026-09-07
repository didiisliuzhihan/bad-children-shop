"""Toy 03: reference-derived editable 3D resin collectible for the reveal animation.
The user's original rendered image is the card artwork, NOT this render.
Run: blender --background --python blender/build_stressed_jimao.py
Back/hidden surfaces are inferred from the supplied single three-quarter view.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
exec(compile((ROOT/'blender/build_assets.py').read_text(encoding='utf8').split('\nreset()\nblue=')[0],'base_helpers','exec'))
reset()
def lin(h):
    rgb=[int(h.strip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def material(name,color,rough=.45,coat=.18):
    return mat('03 | '+name,lin(color),rough,coat=coat)
orange=material('tangerine soft resin','#ffad42',.56,.065)
earmat=material('honey floppy ears','#ffb655',.54,.065)
pink=material('rose cheeks','#ef8d96',.53,.08)
lid=material('tired mauve eyelids','#cd8fb3',.43,.18)
lidrim=material('soft eyelid rim','#bc789f',.43,.17)
white=material('warm eye whites','#faf6ef',.32,.24)
black=material('inky glass pupils','#172336',.18,.5)
blue=material('glossy blueberry nose','#3d69b4',.22,.48)
red=material('cherry red smiling lips','#cf354c',.23,.52)
mouthmat=material('deep plum mouth interior','#401c37',.56,.06)
tongue=material('little pink tongue','#e76987',.33,.28)
cloudmat=material('lavender rose cloud','#e9b5d0',.6,.08)
boltmat=material('warm glowing lemon lightning','#ffef68',.27,.28)
bs=boltmat.node_tree.nodes.get('Principled BSDF')
bs.inputs['Emission Color'].default_value=(*lin('#fff071'),1)
bs.inputs['Emission Strength'].default_value=.75
root=empty('toy_stressed_jimao')
root['reference']='assets/source/references/toy3-model-reference.png'
root['cardArtwork']='assets/delivery/toy_stressed_jimao_card.png'
root['construction']='True 3D geometry. Continuous cloud-lightning-head contact; hidden back inferred.'

def mesh(name,verts,faces,m,parent=root):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    import bmesh
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    return finish(o,name,m,parent)

def superellipsoid(name,loc,scale,m,exponent=.88,seg=64,rings=40):
    def sp(v):return math.copysign(abs(v)**exponent,v)
    verts=[];faces=[]
    for j in range(rings+1):
        lat=-math.pi/2+math.pi*j/rings
        for i in range(seg):
            a=math.tau*i/seg
            verts.append((loc[0]+scale[0]*sp(math.cos(lat))*sp(math.sin(a)),loc[1]+scale[1]*sp(math.cos(lat))*sp(math.cos(a)),loc[2]+scale[2]*sp(math.sin(lat))))
    for j in range(rings):
        for i in range(seg):
            a=j*seg+i;b=j*seg+(i+1)%seg;faces.append((a,a+seg,b+seg,b))
    return mesh(name,verts,faces,m)

def fuse(name,parts,voxel=.025):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=parts[0];o.name=name
    m=o.modifiers.new('Seamless sculpted union','REMESH');m.mode='VOXEL';m.voxel_size=voxel;m.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Clay smoothing','SMOOTH');m.factor=1.2;m.iterations=5;bpy.ops.object.modifier_apply(modifier=m.name)
    return o

# Low, four-foot body with joined shoulder/leg transitions, not separate bead legs.
parts=[sphere('body_core',(0,.10,.44),(.53,.40,.43),orange,root,48,32)]
for x,y in [(-.30,-.15),(.30,-.15),(-.31,.30),(.31,.30)]:
    parts.append(sphere('rounded_paw',(x,y,.21),(.205,.21,.235),orange,root,36,24))
body=fuse('body_with_four_molded_paws',parts,.018)
head=superellipsoid('oversized_soft_square_head',(0,0,1.23),(.76,.565,.675),orange,.85)
# Broad teardrop ears: rounded tips and narrower attachment at the crown.
for s in [-1,1]:
    ear=sphere('floppy_ear_'+str(s),(s*.766,.035,1.215),(.235,.20,.427),earmat,root,48,32)
    for v in ear.data.vertices:
        t=v.co.z/.427;v.co.x*=1-.20*t
    ear.rotation_euler[1]=-s*.23

# The face follows the curved head instead of floating in front of it.
def face_y(x,z):
    f=max(.05,1-(abs(x)/.78)**2.35-(abs(z-1.23)/.69)**2.35)
    return -.565*f**.425
for s in [-1,1]:
    x=s*.305;z=1.405;y=face_y(x,z)-.025
    sphere('eye_white_'+str(s),(x,y,z),(.177,.102,.198),white,root,48,32)
    sphere('sleepy_pupil_'+str(s),(x-.035,y-.091,z+.012),(.064,.038,.080),black,root,40,28)
    # Spherical caps form true three-dimensional eyelids with a diagonal sleepy cut.
    for upper in [True,False]:
        verts=[];faces=[];cols=40;rows=12
        for j in range(rows+1):
            f=j/rows
            for i in range(cols+1):
                u=-1+2*i/cols;edge=math.sqrt(max(0,1-u*u))
                cut=(.37-.11*u) if upper else (-.50-.06*u)
                zz=cut+(edge-cut)*f if upper else cut+(-edge-cut)*f
                xx=u*math.sqrt(max(.001,1-zz*zz)) if f>.98 else u
                # Clip parametrization to an elliptical cap.
                zz=max(-edge,min(edge,zz));front=math.sqrt(max(0,1-u*u-zz*zz))
                verts.append((x+u*.180,y-.006-.109*front,z+zz*.202))
        for j in range(rows):
            for i in range(cols):
                a=j*(cols+1)+i;faces.append((a,a+1,a+cols+2,a+cols+1))
        o=mesh(('upper' if upper else 'lower')+'_sleepy_lid_'+str(s),verts,faces,lid)
        mod=o.modifiers.new('Molded lid thickness','SOLIDIFY');mod.thickness=.008
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        pts=[]
        for i in range(21):
            u=-.94+1.88*i/20;zz=(.37-.11*u) if upper else (-.50-.06*u)
            front=math.sqrt(max(0,1-u*u-zz*zz))
            pts.append((x+u*.180,y-.012-.111*front,z+zz*.202))
        path('eyelid_edge_'+str(s)+'_'+str(upper),pts,.012,lidrim if upper else lid,root)
    cx=s*.443;cz=1.105
    cheek=sphere('pink_cheek_'+str(s),(cx,face_y(cx,cz)-.014,cz),(.108,.023,.112),pink,root,40,28)
    cheek.rotation_euler[2]=-s*.28
sphere('blueberry_button_nose',(0,-.636,1.23),(.158,.118,.122),blue,root,48,32)

# Wide open, slightly lopsided grin. Sculpted lip loop, two teeth and tongue.
outline=[(-.215,1.075),(-.123,1.063),(0,1.040),(.145,1.080),(.223,1.055),(.237,1.005),(.170,.913),(.075,.876),(-.041,.878),(-.153,.918),(-.218,.994)]
mouth_y=-.549
verts=[(0,mouth_y+.006,.982)]+[(x,mouth_y,z) for x,z in outline]
faces=[(0,i+1,(i+1)%len(outline)+1) for i in range(len(outline))]
cavity=mesh('open_plum_mouth',verts,faces,mouthmat)
mod=cavity.modifiers.new('Inset mouth depth','SOLIDIFY');mod.thickness=.025;bpy.context.view_layer.objects.active=cavity;bpy.ops.object.modifier_apply(modifier=mod.name)
lipcurve=path('continuous_red_smiling_lip',[(x,mouth_y-.024,z) for x,z in outline],.041,red,root)
lipcurve.data.splines[0].use_cyclic_u=True
for x in [-.044,.044]:
    box('little_front_tooth',(x,mouth_y-.016,1.024),(.072,.036,.074),white,.020,root)
sphere('pink_tongue',(0,mouth_y-.019,.924),(.068,.027,.024),tongue,root,40,24)

# Lightning is thick solid geometry whose endpoints penetrate cloud and head.
bolt_outline=[(-.084,2.205),(.080,2.205),(.018,2.075),(.148,2.075),(-.046,1.855),(-.008,1.995),(-.132,1.995)]
verts=[]
for y in [-.020,.090]:verts.extend((x,y,z) for x,z in bolt_outline)
n=len(bolt_outline);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]
faces += [(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
bolt=mesh('connected_lemon_lightning',verts,faces,boltmat)
mod=bolt.modifiers.new('Soft lightning corners','BEVEL');mod.width=.018;mod.segments=4;bpy.context.view_layer.objects.active=bolt;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=bolt.modifiers.new('Lightning normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
cloudparts=[]
for i,(x,y,z,sx,sy,sz) in enumerate([(-.31,.055,2.31,.20,.18,.18),(-.19,.06,2.46,.19,.18,.21),(0,.02,2.43,.265,.22,.257),(.245,.065,2.34,.23,.18,.22),(.32,.105,2.41,.17,.17,.16),(.13,.085,2.28,.22,.16,.15),(-.105,.085,2.285,.25,.18,.15)]):
    cloudparts.append(sphere('cloud_lobe_'+str(i),(x,y,z),(sx,sy,sz),cloudmat,root,36,24))
fuse('seamless_lavender_cloud',cloudparts,.016)

# Store the supplied reference inside the editable master as an image datablock.
ref=ROOT/'assets/source/references/toy3-model-reference.png'
if ref.exists():
    im=bpy.data.images.load(str(ref),check_existing=True);im.pack()

studio((0,0,1.32),(3.25,-7.5,3.15),3.2)
scene=bpy.context.scene;scene.cycles.samples=40
scene.render.resolution_x=1000;scene.render.resolution_y=1100
scene.view_settings.view_transform='AgX'
scene.render.film_transparent=True
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.72,.83,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.25
for o in root.children_recursive:
    if o.type=='MESH' and len(o.data.polygons)>600:
        mod=o.modifiers.new('Mobile delivery topology','DECIMATE');mod.ratio=.52;mod.use_collapse_triangulate=True
export('toy_stressed_jimao',root,True)
# Non-exported ground for a visual review render, stored in the master too.
ground=material('preview powder blue floor','#c4dbe9',.75,0)
box('preview_floor',(0,0,-.055),(200,200,.05),ground,0)
scene.render.film_transparent=False
scene.render.filepath=str(SOURCE/'toy-stressed-jimao-studio.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/toy_stressed_jimao.blend'))
(ROOT/'assets/toy3-model-report.json').write_text(json.dumps(stats,indent=2),encoding='utf8')
print('TOY03 COMPLETE',json.dumps(stats))
