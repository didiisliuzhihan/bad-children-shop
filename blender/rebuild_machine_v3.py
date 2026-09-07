"""V3 sunglasses sheep girl. All visible details are editable geometry.
Front silhouette is reconstructed from sheep-girl-sunglasses-reference.png.
The unseen back is inferred. V1/V2 master files are never overwritten.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
exec(compile((ROOT/'blender/build_assets.py').read_text(encoding='utf8').split('\nreset()\nblue=')[0],'base_helpers','exec'))
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/gashapon_machine.blend'))
root=bpy.data.objects['gashapon_machine']
old=bpy.data.objects.get('character_topper')
if old:
    for o in reversed(list(old.children_recursive)):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.objects.remove(old,do_unlink=True)
for name in ['display_copy','display_copy_2','serial_label']:
    o=bpy.data.objects.get(name)
    if o:bpy.data.objects.remove(o,do_unlink=True)
for o in list(bpy.data.objects):
    if o.type in {'LIGHT','CAMERA'}:bpy.data.objects.remove(o,do_unlink=True)
for o in root.children_recursive:
    if o.type=='MESH' and o.name in ['body_main','body_top_lip','display_bezel','banner_shop_sign']:
        for mod in list(o.modifiers):
            if mod.type=='DECIMATE':o.modifiers.remove(mod)
# Restore V1 powder blue (linear RGB) and its softly reflective plastic finish.
blue=bpy.data.materials.get('Powder blue molded plastic')
if blue:
    bsdf=blue.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(.24,.48,.61,1)
    bsdf.inputs['Roughness'].default_value=.38
    bsdf.inputs['Coat Weight'].default_value=.28
    bsdf.inputs['Coat Roughness'].default_value=.22

def lin(h):
    c=[int(h.strip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c)
def material(name,color,rough=.43,coat=.25,metal=0):
    return mat('V3 | '+name,lin(color),rough,metal,coat=coat)
cream=material('ivory soft clay','#f1ddc4',.48,.2)
fold=material('warm cream folds','#dfc7a9',.49,.18)
skin=material('warm porcelain skin','#f3c3b2',.45,.2)
hair=material('charcoal sculpted hair','#181914',.56,.09)
hairRidge=material('subtle hair strand','#20211b',.56,.06)
horn=material('soft umber horn','#675244',.56,.06)
earPink=material('rose inner ear','#dd9188',.52,.1)
lens=material('smoked black sunglasses','#101713',.31,.17)
frame=material('black acetate frame','#171a14',.29,.3)
frameEdge=material('acetate edge highlight','#303329',.32,.2)
silver=material('small silver hoops','#c9c8b9',.23,.1,.82)
tie=material('sand braid ties','#b99a77',.48,.12)
lip=material('tiny muted mouth','#9d4d48',.52,.1)
top=empty('character_topper_v3',parent=root)
top['reference']='assets/source/references/sheep-girl-sunglasses-reference.png'
top['construction']='Editable 3D geometry; reference-derived front silhouette, inferred back.'
for m in [hair,hairRidge,horn,lens]:m.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.26

def mesh(name,verts,faces,m,colors=None):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
    o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);finish(o,name,m,top)
    if colors:
        a=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
        for i,c in enumerate(colors):a.data[i].color=(*c,1)
    return o
def color_mat(m,name):
    m=m.copy();m.name=name;n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color'
    m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);return m
def mix(a,b,t):return tuple(x+(y-x)*max(0,min(1,t)) for x,y in zip(a,b))
def smooth(points,radii=None,steps=8,closed=False):
    pp=[Vector(p) for p in points];out=[];rr=[];n=len(pp)
    for i in range(n if closed else n-1):
        p0=pp[(i-1)%n] if closed else pp[max(0,i-1)];p1=pp[i];p2=pp[(i+1)%n];p3=pp[(i+2)%n] if closed else pp[min(n-1,i+2)]
        for j in range(steps):
            t=j/steps;out.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
            if radii:rr.append(radii[i]+(radii[(i+1)%n]-radii[i])*t)
    if not closed:
        out.append(tuple(pp[-1]))
        if radii:rr.append(radii[-1])
    return out,rr
def curve(name,pts,r,m,closed=False):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=3;c.bevel_depth=r;c.bevel_resolution=2
    sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(*v,1)
    sp.use_cyclic_u=closed;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);return finish(o,name,m,top)

def face_y(x,z):
    zz=(z-5.025)/.645;w=.715*(1-.075*max(0,-zz))
    return -.155-.445*math.sqrt(max(.015,1-(x/w)**2-zz*zz))-.016*math.exp(-((x/.07)**2+((z-4.83)/.10)**2))
vv=[];ff=[];cc=[];ns=72;nr=44
for j in range(nr+1):
    t=-math.pi/2+math.pi*j/nr;z=5.025+.645*math.sin(t);w=.715*(1-.075*max(0,-math.sin(t)))
    for i in range(ns):
        a=math.tau*i/ns;x=w*math.cos(t)*math.cos(a);y=-.155+.445*math.cos(t)*math.sin(a)
        pigment=.64*sum(math.exp(-(((x-s*.43)/.19)**2+((z-4.79)/.13)**2)) for s in [-1,1])
        if math.sin(a)<0:y-=.016*math.exp(-((x/.07)**2+((z-4.83)/.10)**2))
        vv.append((x,y,z));cc.append(mix(lin('#f3c6b6'),lin('#e78984'),pigment if math.sin(a)<0 else 0))
for j in range(nr):
    for i in range(ns):a=j*ns+i;b=j*ns+(i+1)%ns;ff.append((a,b,b+ns,a+ns))
mesh('round_face_with_diffused_blush',vv,ff,color_mat(skin,'V3 | blush vertex-color skin'),cc)
sphere('hood_back_volume',(0,.27,5.15),(.96,.53,1.04),cream,top,48,32)
sphere('hair_back_volume',(0,.00,5.15),(.765,.43,.79),hair,top,48,32)

# One broad sculpted hood surface, not a chain of spheres or a narrow tubular rim.
vv=[];ff=[];ns=128;nr=18
for j in range(nr+1):
    r=j/nr
    for i in range(ns):
        a=-.85+(math.pi+1.70)*i/(ns-1);topWeight=max(0,math.sin(a))
        scallop=.043*math.cos(11*a+.4)*topWeight**.8
        ix=.747*math.cos(a);iz=5.075+(.69+scallop)*math.sin(a)
        ox=(.99+scallop*.6)*math.cos(a);oz=5.19+(1.035+scallop*.4)*math.sin(a)
        x=ix*(1-r)+ox*r;z=iz*(1-r)+oz*r
        y=-.365*(1-r)+.045*r-.195*math.sin(math.pi*r)
        y-=.028*math.cos(11*a+r*2)*math.sin(math.pi*r)*topWeight
        vv.append((x,y,z))
for j in range(nr):
    for i in range(ns-1):a=j*ns+i;b=j*ns+i+1;ff.append((a,b,b+ns,a+ns))
hood=mesh('broad_scalloped_sheep_hood',vv,ff,cream)
mod=hood.modifiers.new('Rounded inner hood lip','SOLIDIFY');mod.thickness=.07;mod.offset=0
mod=hood.modifiers.new('Soft clay subdivision','SUBSURF');mod.levels=1

for s in [-1,1]:
    ear=sphere('soft_human_ear',(s*.691,-.405,4.94),(.12,.086,.158),skin,top,28,20);ear.rotation_euler[1]=s*-.12
    ear=sphere('sheep_ear',(s*1.025,.06,5.42),(.28,.105,.14),cream,top,32,20);ear.rotation_euler[1]=-s*.27
    inner=sphere('sheep_inner_ear',(s*1.045,-.035,5.401),(.204,.022,.081),earPink,top,28,16);inner.rotation_euler[1]=-s*.27
    pp,rr=smooth([(s*.65,.27,5.98),(s*.80,.24,6.15),(s*.85,.21,6.36),(s*.808,.17,6.53)],[.17,.14,.08,.004],8)
    tapered('curved_sheep_horn',pp,rr,horn,top,14)
    hoop=torus('silver_earring',(s*.725,-.505,4.79),.052,.012,silver,top,front=True);hoop.rotation_euler[2]=s*.3

# Thin swept bangs with fine molded hair grooves, tucked under the sheep hood.
locks=[
 ([-.04,-.23,-.40,-.55],[5.77,5.55,5.32,5.095],.13),
 ([-.02,-.14,-.27,-.35],[5.76,5.53,5.28,5.125],.125),
 ([.01,.045,.115,.19],[5.77,5.53,5.32,5.205],.105),
 ([.07,.18,.29,.37],[5.76,5.55,5.32,5.165],.112),
 ([.19,.35,.47,.565],[5.735,5.53,5.29,5.135],.115),
 ([-.31,-.49,-.64,-.68],[5.665,5.48,5.23,4.985],.11),
 ([.35,.50,.64,.685],[5.68,5.46,5.23,5.015],.11)
 ,([0,-.015,.005,.08],[5.77,5.51,5.29,5.145],.085)
 ,([.005,-.055,-.075,-.09],[5.765,5.51,5.29,5.16],.078)
]
for k,(xs,zs,width) in enumerate(locks):
    points=[(xs[i],[-.38,-.515,-.586,-.55][i],zs[i]) for i in range(4)]
    pts,_=smooth(points,steps=12);vv=[];ff=[];n=len(pts);sides=12
    def section(i,f):
        t=i/(n-1);p=Vector(pts[i]);tangent=Vector(pts[min(n-1,i+1)])-Vector(pts[max(0,i-1)]);side=Vector((tangent.z,0,-tangent.x)).normalized()
        w=width*(.10+.90*math.sin(math.pi*(.10+.90*t))**.6) if t<.98 else width*.015
        return p+side*w*f,w
    for i in range(n):
        for j in range(sides):
            a=math.tau*j/sides;p,w=section(i,math.cos(a));p.y+=.035*math.sin(a)*min(1,w/.06);vv.append(tuple(p))
    for i in range(n-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;ff.append((a,b,b+sides,a+sides))
    ff.extend([tuple(range(sides-1,-1,-1)),tuple((n-1)*sides+j for j in range(sides))]);mesh('swept_fringe_lock',vv,ff,hair)
    for strand in [-.65,-.32,0,.32,.65]:
        line=[]
        for i in range(3,n-3,2):
            p,w=section(i,strand);p.y-=.036*math.sqrt(1-strand*strand)*min(1,w/.06);line.append(tuple(p))
        curve('fine_fringe_ridge',line,.0012,hairRidge)

# Cat-eye sunglasses, wrapped in 3D around the face. Lenses and frames are separate.
def glasses_y(x):return -.709+.19*(abs(x)/.64)**2
contour=[(.055,5.065),(.145,5.17),(.34,5.205),(.57,5.214),(.628,5.177),(.57,4.997),(.433,4.89),(.267,4.868),(.132,4.935)]
for s in [-1,1]:
    outline,_=smooth([(s*x,glasses_y(x),z) for x,z in contour],steps=8,closed=True)
    cx=s*.325;cz=5.058;vv=[];ff=[];n=len(outline);rings=10
    for j in range(rings+1):
        r=j/rings
        for x,y,z in outline:
            xx=cx+(x-cx)*r;zz=cz+(z-cz)*r;vv.append((xx,glasses_y(xx)-.023*(1-r*r),zz))
    for j in range(rings):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;ff.append((a,b,b+n,a+n))
    mesh('opaque_smoked_cat_eye_lens',vv,ff,lens)
    curve('acetate_cat_eye_frame',outline,.027,frame,True)
    inset=[(cx+(x-cx)*.936,glasses_y(cx+(x-cx)*.936)-.008,cz+(z-cz)*.936) for x,y,z in outline]
    curve('subtle_inner_frame_bevel',inset,.005,frameEdge,True)
    curve('sunglasses_arm',[(s*.613,glasses_y(.613),5.16),(s*.70,-.34,5.17),(s*.735,-.10,5.095)],.023,frame)
pp,_=smooth([(-.072,-.719,5.078),(-.031,-.734,5.088),(0,-.74,5.095),(.031,-.734,5.088),(.072,-.719,5.078)],steps=4)
curve('sunglasses_bridge',pp,.027,frame)
sphere('small_nose',(0,face_y(0,4.85)-.005,4.85),(.029,.017,.033),skin,top,24,16)
sphere('tiny_neutral_mouth',(0,face_y(0,4.674)-.008,4.674),(.020,.006,.0065),lip,top,24,12)

# Simple hoodie: the new reference has neither forehead buttons nor a skull pendant.
sphere('cream_hoodie_body',(0,.075,4.08),(.555,.36,.45),cream,top,40,28)
for s in [-1,1]:
    shoulder=sphere('hoodie_shoulder',(s*.425,.065,4.01),(.16,.28,.32),cream,top,28,20);shoulder.rotation_euler[1]=s*-.12
    pp,rr=smooth([(s*.40,-.22,4.395),(s*.27,-.34,4.39),(s*.115,-.375,4.355),(s*.025,-.35,4.28)],[.076,.085,.082,.022],6)
    tapered('soft_folded_hoodie_collar',pp,rr,cream,top,12)
    for j in range(6):
        z=4.69-j*.096;x=s*(.645-.014*j)
        for k in [-1,1]:
            braid=sphere('interlaced_plait',(x+k*.04,-.435-(.018 if k==(-1 if j%2 else 1) else 0),z),(.075-j*.004,.077,.098),hair,top,24,16);braid.rotation_euler[1]=k*.54
            for d in [-.025,0,.025]:
                curve('plait_molded_hairline',[(x+k*.035+d,-.507,z+.055),(x+k*.04+d,-.519,z),(x-k*.005+d,-.498,z-.06)],.0012,hairRidge)
    x=s*.572
    torus('beige_braid_tie',(x,-.435,4.08),.066,.013,tie,top)
    tail=sphere('rounded_braid_tip',(x,-.434,3.986),(.065,.068,.12),hair,top,24,16)
    for d in [-.03,-.01,.01,.03]:curve('braid_tip_hairline',[(x+d,-.50,4.055),(x+d*.8,-.502,3.99),(x+d*.2,-.46,3.89)],.0012,hairRidge)

# Weld the hoodie and collar into a single softly sculpted garment.
garment=[o for o in top.children_recursive if o.type=='MESH' and o.name.startswith(('cream_hoodie_body','hoodie_shoulder','soft_folded_hoodie_collar'))]
bpy.ops.object.select_all(action='DESELECT')
for o in garment:o.select_set(True)
bpy.context.view_layer.objects.active=garment[0];bpy.ops.object.join();cloth=bpy.context.object;cloth.name='sculpted_cream_hoodie'
mod=cloth.modifiers.new('Continuous clay garment','REMESH');mod.mode='VOXEL';mod.voxel_size=.014;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=cloth.modifiers.new('Soft collar transitions','SMOOTH');mod.factor=.65;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=cloth.modifiers.new('Garment topology','DECIMATE');mod.ratio=.6;bpy.ops.object.modifier_apply(modifier=mod.name)
for p in cloth.data.polygons:p.use_smooth=True

refImage=bpy.data.images.load(str(ROOT/'assets/source/references/sheep-girl-sunglasses-reference.png'),check_existing=True);refImage.pack()
ref=bpy.data.objects.new('REFERENCE | V3 sunglasses girl',None);bpy.context.collection.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=refImage;ref.empty_display_size=3;ref.location=(3,1,5);ref.rotation_euler=(math.pi/2,0,0);ref.hide_render=True
studio((0,0,3.24),(.04,-13,3.55),7.0)
sc=bpy.context.scene;sc.cycles.samples=64;sc.view_settings.view_transform='AgX';sc.render.resolution_x=1000;sc.render.resolution_y=1200
export('gashapon_machine_v3',root)
(ROOT/'assets/machine-v3-report.json').write_text(json.dumps(stats,indent=2))
sc.render.filepath=str(SOURCE/'machine-v3-front.png');bpy.ops.render.render(write_still=True)
sc.camera.location=(0,-10,5.15);sc.camera.rotation_euler=(Vector((0,0,5.15))-sc.camera.location).to_track_quat('-Z','Y').to_euler();sc.camera.data.ortho_scale=3.05
sc.render.resolution_x=1100;sc.render.resolution_y=1100;sc.render.filepath=str(SOURCE/'sheep-girl-v3-front.png');bpy.ops.render.render(write_still=True)
# Character-only editing scene, with the reference and studio intact.
top.parent=None
for o in list(root.children_recursive)+[root]:
    bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/sheep_girl_v3.blend'))
# Shipping-only merge: retain every separate editable object in both .blend masters
# and the uncompressed GLB; reduce browser draw calls for the static topper.
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/gashapon_machine_v3.blend'))
root=bpy.data.objects['gashapon_machine'];top=bpy.data.objects['character_topper_v3']
bpy.ops.object.select_all(action='DESELECT')
parts=[o for o in top.children_recursive if o.type in {'MESH','CURVE'}]
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();bpy.context.object.name='sheep_girl_static_batched'
bpy.ops.object.select_all(action='DESELECT')
for o in [root]+list(root.children_recursive):o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'gashapon_machine_v3.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_apply=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
stats['gashapon_machine_v3']['deliveryBytes']=(OUT/'gashapon_machine_v3.glb').stat().st_size
stats['gashapon_machine_v3']['staticTopperBatched']=True
(ROOT/'assets/machine-v3-report.json').write_text(json.dumps(stats,indent=2))
print('V3 COMPLETE',json.dumps(stats))
