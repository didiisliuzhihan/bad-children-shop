"""Toy 04 / Popcorn — the resentful maid. Editable, reference-led 3D master.

Run: C:/工具/blender.exe --background --python blender/build_popcorn_maid.py
The original supplied images are packed in the .blend. Nothing is published or
registered in the shop by this script. No story, voice or quest is invented.
"""
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
exec(compile((ROOT/'blender/build_assets.py').read_text(encoding='utf8').split('\nreset()\nblue=')[0], 'base_helpers', 'exec'))
import bmesh, hashlib, os
from mathutils import noise
from mathutils.bvhtree import BVHTree

reset()
random.seed(404)
DRAFT = ROOT/'assets'/'drafts'/'toy04'
DRAFT.mkdir(parents=True, exist_ok=True)
RENDERS = ROOT/'previews'/'toy04'
RENDERS.mkdir(parents=True, exist_ok=True)
OUT = DRAFT  # Do not silently place an unfinished toy in the public asset set.
root = empty('toy_popcorn_maid')
root['display_name_zh'] = '爆米花· 幽怨女仆'
root['display_name_en'] = 'Miss Popcorn'
root['catalog_status'] = 'DRAFT — media supplied; awaiting copy and model review'
root['reference_units'] = 'Stylized collectible, approximately 3.5 Blender units tall'
corn_root = empty('01_POPCORN_sculpt', parent=root)
face_root = empty('02_PLUM_expression', parent=root)
uniform = empty('03_MAID_uniform', parent=root)
jewelry = empty('04_SILVER_chain_and_key', parent=root)
bow_root = empty('05_HEADBAND_and_bow', parent=root)

def lin(h):
    v=[int(h.strip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(c/12.92 if c <= .04045 else ((c+.055)/1.055)**2.4 for c in v)

def material(name, color, rough=.32, coat=.3, metal=0):
    return mat('04 | '+name,lin(color),rough,metal=metal,coat=coat)

corn = material('Buttercream popped vinyl', '#F5DF9D', .31, .36)
blue = material('Forget-me-not blue lacquer', '#49B2E0', .245, .42)
white = material('Milk porcelain apron', '#FFFEF1', .29, .3)
black = material('Licorice lacquer ribbon', '#171917', .20, .5)
plum = material('Blackcurrant glossy eyes', '#421139', .19, .52)
mouth_mat = material('Blackcurrant mouth', '#481C42', .29, .28)
heart_mat = material('Cherry red hearts', '#D52A2B', .26, .32)
hands_mat = material('Butter-yellow hands and feet', '#ECD799', .34, .25)
silver = material('Polished silver ball-chain', '#D6DBDC', .21, .25, .92)
base_mat = material('Warm stone display plinth', '#B8BCBB', .34, .22)

def mesh(name,verts,faces,m,parent):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data)
    bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    return finish(obj,name,m,parent)

def fuse(name,parts,voxel=.014):
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts:p.select_set(True)
    bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join()
    obj=parts[0];obj.name=name
    rem=obj.modifiers.new('Continuous popped-corn volume','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;rem.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=rem.name)
    mod=obj.modifiers.new('Softened kernel junctions','SMOOTH');mod.factor=1.1;mod.iterations=5
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def smooth_loop(points, count=6):
    result=[]
    for i,p1 in enumerate(points):
        p0=Vector(points[i-1]);p1=Vector(p1);p2=Vector(points[(i+1)%len(points)]);p3=Vector(points[(i+2)%len(points)])
        for j in range(count):
            t=j/count
            result.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
    return result

def puff_shape(name, points, origin, depth, m, parent, bulge=.045):
    """Closed, gently domed molded piece from an X/Z silhouette, facing -Y."""
    outline=smooth_loop(points);cx=sum(p[0] for p in outline)/len(outline);cz=sum(p[1] for p in outline)/len(outline)
    verts=[];faces=[];n=len(outline)
    layers=[(1,0),(.98,-depth*.55),(.90,-depth),(.63,-depth-bulge*.72),(.28,-depth-bulge)]
    for scale,y in layers:
        for x,z in outline:verts.append((origin[0]+cx+(x-cx)*scale,origin[1]+y,origin[2]+cz+(z-cz)*scale))
    for k in range(len(layers)-1):
        for i in range(n):a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    verts.append((origin[0]+cx,origin[1]-depth-bulge,origin[2]+cz));center=len(verts)-1
    for i in range(n):faces.append(((len(layers)-1)*n+i,(len(layers)-1)*n+(i+1)%n,center))
    faces.append(tuple(reversed(range(n))))
    return mesh(name,verts,faces,m,parent)

def ribbon_panel(name, outline, yfunc, thickness=.035, m=white, parent=uniform):
    obj=puff_shape(name,outline,(0,0,0),thickness,m,parent,bulge=.008)
    for v in obj.data.vertices:v.co.y+=yfunc(v.co.x,v.co.z)
    return obj

# The three views show one continuous popcorn silhouette, not a stack of balls.
# Front is -Y. Large kernel volumes define the outline; small displacement below
# adds the irregular popped surface and survives GLB export as real geometry.
lobes=[
    ((-.03,.025,1.56),(.99,.61,.77)),
    ((-.17,.04,2.55),(.65,.52,.72)),
    ((-.36,-.07,2.32),(.47,.46,.55)),
    ((-.96,.055,1.64),(.48,.44,.55)),
    ((-1.05,.12,1.15),(.29,.34,.29)),
    ((-.86,.055,2.10),(.27,.35,.34)),
    ((.89,.16,1.50),(.48,.49,.49)),
    ((1.12,.08,1.19),(.32,.35,.32)),
    ((1.09,.10,1.86),(.32,.38,.34)),
    ((.87,.12,2.16),(.28,.34,.33)),
    ((.79,.14,2.43),(.27,.30,.30)),
    ((.36,-.11,2.09),(.40,.44,.37)),
    ((.70,-.25,1.69),(.31,.32,.44)),
    ((.42,-.29,1.93),(.37,.34,.35)),
    ((-.05,.50,1.55),(.75,.39,.62)),
    ((-.66,.47,1.95),(.40,.35,.42)),
    ((.42,.48,2.05),(.40,.33,.40)),
    ((.66,.52,1.48),(.39,.33,.46)),
    ((-.51,.52,1.32),(.38,.32,.38)),
    ((.08,.57,1.97),(.29,.31,.43)),
    ((-.33,-.43,1.94),(.21,.21,.22)),
    ((-.55,-.41,1.78),(.22,.18,.24)),
    ((-.09,-.51,1.76),(.22,.18,.23)),
    ((-.40,.68,1.47),(.24,.20,.24)),
    ((.25,.70,1.71),(.22,.18,.22)),
]
parts=[sphere('Kernel volume %02d'%i,p,s,corn,corn_root,40,28) for i,(p,s) in enumerate(lobes)]
body=fuse('Popcorn — continuous sculpted buttercream',parts,.013)
print('TOY04: kernel union complete',len(body.data.vertices),flush=True)
# Noise and color in object-local space are evaluated in world coordinates, so
# the vertex tint aligns with the white lobes in front and back.
white_centers=[((-.04,.09,2.95),.65),((.32,-.46,2.01),.50),((.86,.13,2.40),.44),((.98,-.20,1.63),.45),((-.45,.69,1.87),.49),((.42,.67,1.65),.50),((.35,.54,2.17),.40)]
colors=body.data.color_attributes.new(name='KernelTint',type='FLOAT_COLOR',domain='POINT')
body.data.color_attributes.active_color=colors
butter=Vector(lin('#F1D282'));milk=Vector(lin('#FFFDE9'))
normals=[v.normal.copy() for v in body.data.vertices]
for v in body.data.vertices:
    p=body.matrix_world@v.co
    # Two scales of low-amplitude dimpling. Keep the eye area smooth enough to
    # read as a cast collectible instead of rough stone.
    n=noise.noise(p*10.1,noise_basis='PERLIN_ORIGINAL');fine=noise.noise(p*19.1)
    frontmask=math.exp(-((p.x/.75)**4+((p.z-1.40)/.43)**4))*max(0,min(1,(-p.y-.25)*3))
    d=(n*.016+fine*.003)*(1-frontmask*.62)
    v.co+=normals[v.index]*d
    w=max(math.exp(-((p-Vector(c)).length/r)**4) for c,r in white_centers)
    w=max(0,min(1,w*.85+.14+noise.noise(p*5.7)*.10))
    c=butter.lerp(milk,w);colors.data[v.index].color=(*c,1)
vc=corn.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='KernelTint'
corn.node_tree.links.new(vc.outputs['Color'],corn.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
body['surface_detail']='Real displaced geometry + linear vertex-color butter/cream marbling; no unsupported procedural texture dependency.'
print('TOY04: vertex sculpt and tint complete',flush=True)
dec=body.modifiers.new('Nondestructive mobile topology','DECIMATE');dec.ratio=.28;dec.use_collapse_triangulate=True

# Conform expression pieces to the sculpt, including in profile. A flat
# extrusion would leave the outer edges / eyebrows hovering above the cheek.
surface=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
body_inv=body.matrix_world.inverted()
def face_y(x,z):
    start=body_inv@Vector((x,-2,z));direction=(body_inv.to_3x3()@Vector((0,1,0))).normalized()
    loc,normal,index,distance=surface.ray_cast(start,direction,5)
    return (body.matrix_world@loc).y if loc is not None else -.52

# Lacquer eyes: a narrowed heavy upper edge, fuller lower lobe, glossy plum.
eye_outline=[(-.205,.11),(-.20,-.07),(-.14,-.19),(-.02,-.215),(.13,-.17),(.205,-.065),(.19,.09),(.10,.135)]
for s in [-1,1]:
    pts=[(x*(-s),z) for x,z in eye_outline]
    eye=puff_shape('Left eye' if s<0 else 'Right eye',pts,(s*.405,-.558,1.35),.055,plum,face_root,.039)
    for v in eye.data.vertices:v.co.y+=face_y(v.co.x,v.co.z)+.558+.005
    path('Heavy skeptical lid '+str(s),[(x,face_y(x,z)-.035,z) for x,z in [(s*.205,1.449),(s*.385,1.465),(s*.575,1.50)]],.020,plum,face_root)
path('Small resentful frown',[(x,face_y(x,z)-.012,z) for x,z in [(-.112,1.19),(-.065,1.229),(0,1.244),(.065,1.229),(.112,1.19)]],.023,mouth_mat,face_root)

# Flared blue dress: elliptic rings with a turned-under rounded hem.
def elliptic_rings(name, rings, m, parent=uniform, n=96):
    verts=[];faces=[]
    for z,rx,ry in rings:
        for i in range(n):a=i*math.tau/n;verts.append((rx*math.cos(a),ry*math.sin(a),z))
    for k in range(len(rings)-1):
        for i in range(n):a=k*n+i;b=k*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces+=[tuple(reversed(range(n))),tuple((len(rings)-1)*n+i for i in range(n))]
    return mesh(name,verts,faces,m,parent)

elliptic_rings('Blue flared skirt with rounded hem',[(.285,.87,.49),(.292,.914,.521),(.325,.928,.534),(.39,.91,.527),(.61,.864,.499),(.84,.84,.49),(.905,.805,.47),(.919,.76,.43)],blue)
elliptic_rings('Apron white waist ribbon',[(.579,.871,.51),(.588,.889,.527),(.63,.88,.525),(.65,.864,.509)],white)
def dress_front(x,z):
    rx=.92-(z-.32)*.15;ry=.536-(z-.32)*.082
    return -ry*math.sqrt(max(.05,1-(x/rx)**2))-.012

# Apron lower panel and bib follow the dress curvature, avoiding floating plates.
ribbon_panel('Apron — lower rounded panel',[(-.448,.352),(.448,.352),(.467,.380),(.425,.617),(-.425,.617),(-.467,.380)],dress_front)
ribbon_panel('Apron — bib left strap',[(-.43,.59),(-.28,.59),(-.30,.92),(-.43,.947)],dress_front)
ribbon_panel('Apron — bib right strap',[(.28,.59),(.43,.59),(.43,.947),(.30,.92)],dress_front)
for s in [-1,1]:
    # Peter Pan collar leaves, meeting at the center with soft scalloped edges.
    outline=[(s*x,z) for x,z in [(0,.911),(.345,.938),(.345,.864),(.275,.79),(.16,.778),(.055,.825)]]
    ribbon_panel('Peter Pan collar '+str(s),outline,dress_front,.047)
    for k in range(3):
        x=s*(.459+.011*math.sin(k));z=.904-k*.099
        sphere('Apron ruffle %s %s'%(s,k),(x,dress_front(x,z)-.027,z),(.079,.053,.072),white,uniform,24,16)
    arm=sphere('Puffed blue sleeve '+str(s),(s*.93,-.005,.862),(.199,.24,.22),blue,uniform,36,24)
    arm.rotation_euler[1]=s*-.32
    path('White sleeve cuff '+str(s),[(s*1.005,-.196,.739),(s*1.105,-.111,.755),(s*1.126,.055,.774)],.022,white,uniform)
    finger_parts=[]
    for j,(dx,z,sc) in enumerate([(0,.58,(.103,.115,.14)),(.104,.589,(.082,.095,.112)),(-.073,.539,(.064,.089,.099))]):
        finger_parts.append(sphere('Mitten finger',(s*(1.01+dx),.014,z),sc,hands_mat,uniform,24,16))
    fuse('Little butter mitten '+str(s),finger_parts,.013)
    sphere('Little foot '+str(s),(s*.245,.00,.235),(.138,.16,.18),hands_mat,uniform,32,20)

heart_outline=[]
for i in range(48):
    a=i*math.tau/48
    heart_outline.append((16*math.sin(a)**3/16,(13*math.cos(a)-5*math.cos(2*a)-2*math.cos(3*a)-math.cos(4*a))/16))
for x in [-.25,0,.25]:
    outline=[(x+u*.06,.455+v*.06) for u,v in heart_outline]
    ribbon_panel('Red heart on apron '+str(x),outline,lambda a,b:dress_front(a,b)-.054,.011,heart_mat)

# Back apron bow, visible in the supplied rear view.
for s in [-1,1]:
    path('Back bow loop '+str(s),[(0,.564,.63),(s*.13,.591,.76),(s*.275,.54,.745),(s*.274,.56,.637),(s*.12,.59,.619),(0,.57,.63)],.027,white,uniform)
    path('Back bow hanging ribbon '+str(s),[(s*.02,.578,.63),(s*.063,.586,.52),(s*.116,.58,.403)],.026,white,uniform)
sphere('Back apron knot',(0,.58,.64),(.068,.037,.049),white,uniform,24,16)

# Black headband wraps the top kernel in depth, not a flat strip on a billboard.
bandpts=[]
for x,z in [(-.60,2.92),(-.46,3.087),(-.19,3.218),(.07,3.115),(.34,2.90)]:
    y=.04-.52*math.sqrt(max(.01,1-((x+.17)/.65)**2-((z-2.55)/.72)**2))-.018
    bandpts.append((x,y,z))
path('Black crown headband',bandpts,.039,black,bow_root)
for s in [-1,1]:
    outline=[(s*x,z) for x,z in [(.015,.02),(.092,.18),(.25,.22),(.325,.10),(.296,-.11),(.16,-.13),(.03,-.055)]]
    puff_shape('Black bow loop '+str(s),outline,(-.12,-.105,3.22),.12,black,bow_root,.025)
sphere('Black bow central knot',(-.12,-.211,3.22),(.079,.077,.094),black,bow_root,32,20)

# Silver chain: actual individual ball links and connecting wire, draped across
# the apron from upper-left chest to right waist. Every part is editable.
chain_points=[]
for i in range(91):
    t=i/90;x=-.475+t*1.30;z=.91-.83*t+.57*t*t;y=dress_front(x,z)-.092
    chain_points.append((x,y,z))
path('Silver chain core wire',chain_points[::10]+[chain_points[-1]],.006,silver,jewelry)
for i,p in enumerate(chain_points):sphere('Silver chain ball %03d'%i,p,(.0125,.0125,.0125),silver,jewelry,12,8)
torus('Left chain fastening',chain_points[0],.024,.008,silver,jewelry,True)

# Hanging clover-bow key, attached to the chain rather than floating next to it.
key=empty('Clover key — complete assembly',(.672,-.567,.558),jewelry)
key.rotation_euler[1]=-.10
torus('Key connector ring',(0,0,.065),.037,.010,silver,key,True)
clover=[]
for i in range(97):
    a=math.tau*i/96;r=.071+.029*math.cos(3*(a-math.pi/2))
    clover.append((r*math.cos(a),-.009,r*math.sin(a)-.06))
path('Three-lobed open key bow',clover,.015,silver,key)
path('Key shaft',[(0,-.009,-.124),(.002,-.009,-.25),(.003,-.009,-.392)],.018,silver,key)
box('Key collar',(0,-.009,-.205),(.058,.046,.037),silver,.009,key)
box('Key bit upper',(-.034,-.009,-.32),(.063,.038,.043),silver,.007,key)
box('Key bit lower',(-.029,-.009,-.38),(.055,.038,.039),silver,.007,key)

cylinder('Thin circular grey display stand',(0,.03,.068),.66,.095,base_mat,root,False,96)

# Pack all original references in the editable project. They are not exported
# as image planes, are not recolored, and cannot be mistaken for 3D geometry.
refspec=[('front','toy4-popcorn-maid-reference.png'),('three-view','toy4-popcorn-maid-three-view.png'),('card-original','toy4-popcorn-maid-card-original.png')]
refreport=[]
for label,filename in refspec:
    p=ROOT/'assets/source/references'/filename
    img=bpy.data.images.load(str(p),check_existing=True);img.pack();img.use_fake_user=True
    refreport.append({'role':label,'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pixels':list(img.size)})
notes=bpy.data.texts.new('READ ME — Toy 04')
notes.write('爆米花· 幽怨女仆 / Miss Popcorn\n\nReference-led, editable 3D collectible.\nGroups: popcorn sculpt, expression, uniform, silver jewelry, headband.\nAll three original reference images are packed.\nThe card scene is the supplied original image, not this studio render.\nStory photo and audio supplied; story copy pending review. No live catalog record created.\nThe mobile decimator remains nondestructive in this .blend.\n')

studio((0,0,1.72),(3.4,-9,3.65),4.02)
scene=bpy.context.scene;scene.cycles.samples=int(os.environ.get('BC_MODEL_SAMPLES','48'))
scene.render.resolution_x=1400;scene.render.resolution_y=1400
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.35
scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.72,.76,.80,1)
scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.5
for o in scene.objects:
    if o.type=='LIGHT':
        o.data.color=(1,.96,.90) if o.name=='Key' else (.88,.94,1)
        o.data.energy*=.85

# Save master + two GLBs, but keep the shipping candidate in drafts/toy04.
for obj in root.children_recursive:
    if obj.type=='CURVE':obj.data.use_fill_caps=True
print('TOY04: full assembly complete; exporting editable master and GLBs',flush=True)
export('toy_popcorn_maid',root,False)
# Batch only the delivery copy by material. The master stays fully decomposed
# into editable parts, while the phone renders ~10 groups instead of 140+.
staging=empty('toy_popcorn_maid_delivery');groups={};copies=[]
dg=bpy.context.evaluated_depsgraph_get()
for source in root.children_recursive:
    if source.type not in {'MESH','CURVE','FONT'}:continue
    data=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg)
    data.transform(source.matrix_world)
    obj=bpy.data.objects.new(source.name+' [shipping]',data);bpy.context.collection.objects.link(obj);obj.parent=staging;copies.append(obj)
    keymat=tuple(m.name for m in data.materials)
    groups.setdefault(keymat,[]).append(obj)
for names,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    objects[0].name='Material batch | '+names[0]
bpy.ops.object.select_all(action='DESELECT')
for obj in [staging]+list(staging.children_recursive):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(DRAFT/'toy_popcorn_maid.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
stats['toy_popcorn_maid']['deliveryBytes']=(DRAFT/'toy_popcorn_maid.glb').stat().st_size
stats['toy_popcorn_maid']['deliveryMaterialBatches']=len(groups)
stats['toy_popcorn_maid']['sourceMeshTrianglesAfterModifiers']=stats['toy_popcorn_maid'].pop('triangles')
stats['toy_popcorn_maid']['deliveryTriangles']=sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in staging.children_recursive if obj.type=='MESH')
# Remove just the temporary in-memory export copies. Source meshes, masters,
# reference images and all files remain intact.
for obj in list(staging.children_recursive)+[staging]:bpy.data.objects.remove(obj,do_unlink=True)
report={'status':'draft-not-in-catalog','name_zh':root['display_name_zh'],'name_en':'Miss Popcorn','model':stats['toy_popcorn_maid'],'references':refreport,'story_photo':'assets/drafts/toy04/toy4-popcorn-story.jpg','voice':'assets/drafts/toy04/toy4-popcorn-voice.mp3','quest':'惹怒她记得说“别急，你好漂亮”','source_blend':'blender/toy_popcorn_maid.blend','source_glb':'assets/source/models/toy_popcorn_maid.glb','candidate_glb':'assets/drafts/toy04/toy_popcorn_maid.glb'}
(ROOT/'assets/toy4-model-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')

floor_mat=material('Studio pearl-grey floor','#D6D8D6',.68,.02)
floor=box('Studio floor — not part of export',(0,0,-.019),(200,200,.02),floor_mat,0)
scene.render.film_transparent=False
target=Vector((0,0,1.7))
def render_view(name,position,ortho=4.0):
    scene.camera.location=position;scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=ortho
    scene.render.filepath=str(RENDERS/(name+'.png'));bpy.ops.render.render(write_still=True)

render_view('toy04-three-quarter',(3.3,-9,3.25),4.35)
if os.environ.get('BC_MODEL_QUICK')!='1':
    render_view('toy04-front',(0,-10,2.55),4.35)
    render_view('toy04-side',(-10,0,2.55),4.35)
    render_view('toy04-back',(0,10,2.55),4.35)
scene.camera.location=(3.3,-9,3.25);scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/toy_popcorn_maid.blend'))
print('TOY04 DRAFT COMPLETE',json.dumps(report,ensure_ascii=False))
