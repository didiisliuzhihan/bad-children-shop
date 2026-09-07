"""Rebuild the sheep girl from the supplied front reference, preserving v1 masters.
Run: blender --background --python blender/rebuild_machine_v2.py
All facial details, hair, hood and plaits are editable three-dimensional geometry.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Reuse the project's modeling, animation and GLB export helpers only.
helpers=(ROOT/'blender'/'build_assets.py').read_text(encoding='utf8').split('\nreset()\nblue=')[0]
exec(compile(helpers,'build_assets_helpers','exec'))
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender'/'gashapon_machine.blend'))
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
    for mod in list(o.modifiers):
        if mod.type=='DECIMATE':o.modifiers.remove(mod)

def linear(hexcode):
    values=[int(hexcode.lstrip('#')[i:i+2],16)/255 for i in (0,2,4)]
    return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values)

def material(name,hexcode,rough=.53,coat=.06):
    m=mat(name,linear(hexcode),rough,coat=coat)
    m.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.22
    return m

ivory=material('V2 | warm cream hood','#e8dcc4',.63,.03)
ivoryShadow=material('V2 | folded cream fabric','#d7c8af',.66,.02)
skinV=material('V2 | soft peach skin','#f2c2a8',.57,.03)
hairV=material('V2 | dark chocolate hair','#241f1b',.68,.015)
hairSoft=material('V2 | soft hair ridges','#39302a',.57,.03)
lash=material('V2 | plum upper eyelashes','#352333',.64,.02)
eyebrow=material('V2 | warm eyebrow','#8a4c40',.63,0)
eyeWhite=material('V2 | ivory sclera','#f9f7df',.4,.16)
irisMaterial=material('V2 | green iris','#88b355',.43,.12)
pupilMaterial=material('V2 | deep leaf pupil','#396225',.47,.06)
catchlight=material('V2 | eye highlight','#fffbe7',.36,.05)
blush=material('V2 | warm rose cheek marks','#d56f62',.61,0)
smileMat=material('V2 | soft coral smile','#c96350',.56,.03)
hornV=material('V2 | warm umber horns','#594739',.66,.015)
tie=material('V2 | mulberry hair tie','#583552',.59,0)
earPink=material('V2 | inner sheep ears','#d79186',.68,0)
redV=material('V2 | brick red molded plastic','#bc2d17',.45,.11)
blueV=material('V2 | blue molded plastic','#6196b0',.5,.08)
navyV=material('V2 | recessed blue interior','#1d3c50',.58,.02)

for o in root.children_recursive:
    if o.type!='MESH':continue
    if any(p in o.name for p in ['banner','body_accent','knob_face','knob_rim','knob_icon','dispense_bowl','status_lamp']):
        o.data.materials.clear();o.data.materials.append(redV)
    if o.name in ['body_main','body_top_lip','display_bezel']:
        o.data.materials.clear();o.data.materials.append(blueV)
    if o.name in ['display_screen','dispense_slot']:
        o.data.materials.clear();o.data.materials.append(navyV)
    if o.name=='knob_backplate':o.data.materials.clear();o.data.materials.append(redV)

top=empty('character_topper_v2',(0,0,0),root)
top['reference']='assets/source/references/扭蛋机建模图片.png'
top['construction']='Full mesh reconstruction; front reference proportions. Unseen sides inferred.'

def mesh_object(name,verts,faces,m,parent=top,colors=None):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m,parent)
    if colors:
        attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
        for i,col in enumerate(colors):attr.data[i].color=(*col,1)
    return o

def colored_material(base,name):
    m=base.copy();m.name=name
    node=m.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Color'
    m.node_tree.links.new(node.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

def lerp(a,b,t):return tuple(x+(y-x)*max(0,min(1,t)) for x,y in zip(a,b))

def smooth_samples(points,radii,steps=8):
    out=[];rr=[];pts=[Vector(p) for p in points]
    for i in range(len(pts)-1):
        p0=pts[max(i-1,0)];p1=pts[i];p2=pts[i+1];p3=pts[min(i+2,len(pts)-1)]
        for j in range(steps):
            t=j/steps
            out.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
            rr.append(radii[i]+(radii[i+1]-radii[i])*t)
    out.append(tuple(pts[-1]));rr.append(radii[-1]);return out,rr

def ribbon(name,points,widths,depth,m=hairV):
    pts,widths=smooth_samples(points,widths,8);verts=[];faces=[];sides=14
    for i,(co,w) in enumerate(zip(pts,widths)):
        tangent=Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])
        side=Vector((tangent.z,0,-tangent.x)).normalized()
        thickness=depth*max(.025,min(1,w/.12))*.65
        for j in range(sides):
            a=math.tau*j/sides;p=Vector(co)+side*w*math.cos(a)+Vector((0,thickness*math.sin(a),0));verts.append(tuple(p))
    for i in range(len(pts)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(range(sides-1,-1,-1)));faces.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    o=mesh_object(name,verts,faces,m)
    mod=o.modifiers.new('Smooth sculpted lock','SUBSURF');mod.levels=1;mod.render_levels=1
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def face_y(x,z):
    latitude=(z-5.045)/.612
    width=.705*(1-.10*max(0,-latitude))
    q=max(.02,1-(x/width)**2-latitude**2)
    nose=.031*math.exp(-((x/.08)**2+((z-4.90)/.11)**2))
    cheeks=.016*sum(math.exp(-(((x-s*.37)/.17)**2+((z-4.86)/.17)**2)) for s in [-1,1])
    return -.205-.42*math.sqrt(q)-nose-cheeks

# Rounded cheek silhouette and skin blush are a continuous mesh with vertex color.
verts=[];faces=[];colors=[];segments=96;rings=56
base=linear('#f2c6b0');cheekCol=linear('#e89b91')
for j in range(rings+1):
    lat=-math.pi/2+math.pi*j/rings
    for i in range(segments):
        a=math.tau*i/segments
        z=5.045+.612*math.sin(lat)
        width=.705*(1-.10*max(0,-math.sin(lat)))
        x=width*math.cos(lat)*math.cos(a)
        y=-.205+.42*math.cos(lat)*math.sin(a)
        if math.sin(a)<0:
            y-=.031*math.exp(-((x/.08)**2+((z-4.9)/.11)**2))
            y-=.016*sum(math.exp(-(((x-s*.37)/.17)**2+((z-4.86)/.17)**2)) for s in [-1,1])
        pigment=.62*sum(math.exp(-(((x-s*.40)/.18)**2+((z-4.83)/.125)**2)) for s in [-1,1])
        pigment+=.1*math.exp(-((x/.10)**2+((z-4.90)/.12)**2))
        verts.append((x,y,z));colors.append(lerp(base,cheekCol,pigment if math.sin(a)<0 else 0))
for j in range(rings):
    for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
mesh_object('girl_face_continuous_blush',verts,faces,colored_material(skinV,'V2 | painted porcelain face'),colors=colors)

sphere('hood_sculpted_back',(0,.20,5.15),(.925,.575,1.015),ivory,top,64,40)
sphere('hair_back_volume',(0,-.02,5.13),(.77,.435,.79),hairV,top,56,36)
# The face is in front of these volumes; the soft rim frames the forehead and cheeks.
rim=[(-.67,-.15,4.48),(-.80,-.31,4.69),(-.835,-.395,5.04),(-.79,-.42,5.35),(-.665,-.43,5.63),(-.47,-.455,5.78),(-.27,-.465,5.84),(-.05,-.435,5.855),(.18,-.445,5.845),(.42,-.45,5.79),(.62,-.43,5.66),(.76,-.41,5.41),(.82,-.385,5.08),(.80,-.29,4.73),(.66,-.13,4.49)]
rimPts,rimR=smooth_samples(rim,[.105,.114,.12,.125,.125,.125,.12,.12,.12,.125,.124,.12,.12,.112,.08],6)
for i in range(len(rimPts)):
    x,y,z=rimPts[i];rimPts[i]=(x+.008*math.sin(i*.87),y-.008*math.sin(i*.9),z+.01*math.sin(i*.74))
tapered('hood_continuous_soft_scalloped_rim',rimPts,rimR,ivory,top,18)

for s in [-1,1]:
    sphere('human_ear',(s*.677,-.20,4.90),(.132,.096,.174),skinV,top,28,20)
    ear=sphere('sheep_ear_outer',(s*.99,.045,5.29),(.295,.115,.155),ivory,top,40,24);ear.rotation_euler[1]=s*-.15
    inner=sphere('sheep_ear_inner',(s*1.00,-.057,5.268),(.21,.027,.09),earPink,top,32,20);inner.rotation_euler[1]=s*-.15
    hp=[(s*.62,.22,5.74),(s*.79,.20,5.99),(s*.93,.20,6.18),(s*.985,.21,6.36),(s*.962,.23,6.49)]
    pp,rr=smooth_samples(hp,[.177,.145,.103,.065,.0025],10)
    tapered('sheep_horn_tapered',pp,rr,hornV,top,20)
    badge=box('hood_square_eye',(s*.245,-.283,6.046),(.106,.056,.125),hairV,.033,top);badge.rotation_euler[1]=s*.18

# Broad swept locks with flattened cross-sections, not cylindrical fringe pieces.
locks=[
 ('fringe_center',[(-.07,-.475,5.73),(-.06,-.565,5.55),(.005,-.665,5.32),(.13,-.66,5.225)],[.105,.19,.17,.01],.081),
 ('fringe_left',[(-.29,-.405,5.75),(-.35,-.555,5.51),(-.315,-.65,5.285),(-.23,-.655,5.20)],[.10,.172,.113,.003],.071),
 ('fringe_right',[(.205,-.40,5.74),(.235,-.57,5.50),(.30,-.667,5.29),(.415,-.625,5.215)],[.09,.165,.117,.005],.079),
 ('fringe_left_sweep',[(-.51,-.335,5.66),(-.55,-.49,5.43),(-.56,-.563,5.23),(-.435,-.619,5.14)],[.075,.148,.12,.006],.069),
 ('fringe_right_sweep',[(.445,-.34,5.69),(.51,-.48,5.46),(.56,-.56,5.27),(.60,-.535,5.155)],[.07,.145,.118,.006],.065),
 ('sideburn_left',[(-.64,-.22,5.55),(-.713,-.351,5.29),(-.69,-.465,5.06),(-.571,-.503,4.905)],[.04,.142,.106,.008],.065),
 ('sideburn_right',[(.64,-.2,5.55),(.71,-.343,5.30),(.694,-.466,5.08),(.581,-.50,4.92)],[.04,.14,.108,.008],.066)
]
for name,pts,ww,d in locks:ribbon(name,pts,ww,d)

def eye_patch(name,cx,cz,rx,rz,outline=False,iris=False,pupil=False):
    verts=[];faces=[];cols=[];n=64;nr=10
    for j in range(nr+1):
        r=j/nr
        for i in range(n):
            a=math.tau*i/n
            x=cx+rx*r*math.cos(a);z=cz+rz*r*math.sin(a)
            if outline:z+=.026*(abs(math.cos(a))**2)*r
            y=face_y(x,z)-(.003 if outline else .009 if iris else .014)-.004*(1-r*r)
            verts.append((x,y,z))
            if iris:
                tone=(z-cz+rz)/(2*rz)
                col=lerp(linear('#afcc73'),linear('#427333'),tone)
                col=lerp(col,linear('#365b27'),max(0,(r-.85)/.15)*.43)
            else:col=linear('#f9f7df')
            cols.append(col)
    for j in range(nr):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    m=colored_material(irisMaterial,'V2 | gradient green iris') if iris else eyeWhite
    return mesh_object(name,verts,faces,m,colors=cols if iris else None)

for s in [-1,1]:
    cx=s*.287;cz=5.016
    eye_patch('almond_eye_white',cx,cz,.197,.182,outline=True)
    eye_patch('green_iris_gradient',cx+.006,cz+.006,.142,.163,iris=True)
    # Soft clover-shaped pupil, in the same green family as the reference.
    outline=[]
    for i in range(64):
        a=math.tau*i/64;r=.074*(1+.12*math.cos(3*a+.2));x=cx+.009+r*math.cos(a);z=cz+.025+r*1.2*math.sin(a);outline.append((x,face_y(x,z)-.019,z))
    center=(cx+.009,face_y(cx+.009,cz+.025)-.024,cz+.025)
    mesh_object('clover_green_pupil',[center]+outline,[(0,i+1,(i+1)%64+1) for i in range(64)],pupilMaterial)
    sphere('eye_round_glint',(cx+.052,face_y(cx+.052,cz+.088)-.03,cz+.088),(.025,.006,.027),catchlight,top,24,16)
    # A generous upper lash with a raised outer flick; no heavy bottom outline.
    lashPts=[]
    for x,z in [(cx-s*.195,cz+.06),(cx-s*.117,cz+.159),(cx+.018*s,cz+.183),(cx+s*.14,cz+.147),(cx+s*.205,cz+.106),(cx+s*.24,cz+.145)]:lashPts.append((x,face_y(x,z)-.015,z))
    pp,rr=smooth_samples(lashPts,[.009,.016,.022,.025,.018,.002],6);tapered('upper_plum_lash',pp,rr,lash,top,12)
    browPts=[(s*.145,face_y(s*.145,5.278)-.025,5.278),(s*.275,face_y(s*.275,5.318)-.021,5.318),(s*.395,face_y(s*.395,5.298)-.013,5.298)]
    pp,rr=smooth_samples(browPts,[.006,.011,.002],8);tapered('soft_eyebrow',pp,rr,eyebrow,top,10)
    for j in range(2):
        x=s*(.409+j*.066)
        pts=[(x,face_y(x,4.819)-.014,4.819),(x+s*.02,face_y(x+s*.02,4.863)-.014,4.863)]
        path('small_rose_cheek_mark',pts,.0105,blush,top)

smilePts=[]
sphere('soft_nose_tip',(0,face_y(0,4.9)-.004,4.9),(.037,.018,.044),skinV,top,32,20)
for x,z in [(-.143,4.781),(-.083,4.739),(0,4.727),(.08,4.745),(.14,4.787)]:smilePts.append((x,face_y(x,z)-.018,z))
pp,rr=smooth_samples(smilePts,[.009,.014,.015,.014,.009],7);tapered('gentle_smile',pp,rr,smileMat,top,12)

# Soft cape shoulders, folded collar and the tiny skull clasp.
sphere('cream_cloak_body',(0,.09,4.175),(.555,.395,.405),ivory,top,48,32)
for s in [-1,1]:
    shoulder=sphere('cape_shoulder',(s*.405,.08,4.13),(.196,.305,.323),ivory,top,36,24);shoulder.rotation_euler[1]=s*-.2
    path('cape_side_fold',[(s*.28,-.255,4.41),(s*.335,-.272,4.22),(s*.35,-.265,3.98)],.018,ivoryShadow,top)
    ribbon('folded_collar',[(s*.45,-.235,4.52),(s*.305,-.32,4.48),(s*.17,-.383,4.39),(s*.045,-.40,4.30)],[.085,.092,.082,.022],.045,ivory)
    path('necklace_cord',[(s*.21,-.351,4.415),(s*.175,-.415,4.295),(s*.07,-.441,4.20)],.015,hairV,top)
sphere('skull_clasp',(0,-.458,4.196),(.119,.050,.117),ivory,top,36,24)
for x in [-.043,.043]:sphere('skull_eye_socket',(x,-.509,4.220),(.027,.009,.034),hairV,top,20,12)
for x in [-.043,0,.043]:box('skull_little_tooth',(x,-.474,4.102),(.032,.051,.068),ivory,.013,top)

# Interlocking diagonal plaits with separate tips and purple ties.
for s in [-1,1]:
    sphere('braid_root',(s*.628,-.10,4.69),(.145,.145,.224),hairV,top,28,20)
    for j in range(7):
        z=4.63-j*.088
        for k in [-1,1]:
            x=s*(.627-.015*j)+k*.037*(1-j*.035)
            strand=sphere('interlaced_braid_strand',(x,-.226-(.022 if k==(-1 if j%2 else 1) else 0),z),(.075-j*.003,.082,.111),hairV,top,24,16)
            strand.rotation_euler[1]=k*.51
    x=s*.535
    torus('purple_braid_tie',(x,-.221,4.047),.071,.013,tie,top)
    ribbon('tapered_braid_tail',[(x,-.219,4.039),(x+s*.019,-.232,3.965),(x+s*.025,-.21,3.88)],[.065,.067,.003],.063)

# A reference image is packed in the editable Blender master, outside the export root.
refImage=bpy.data.images.load(str(ROOT/'assets'/'source'/'references'/'扭蛋机建模图片.png'),check_existing=True)
refImage.pack()
reference=bpy.data.objects.new('REFERENCE | supplied front render',None);bpy.context.collection.objects.link(reference)
reference.empty_display_type='IMAGE';reference.data=refImage;reference.empty_display_size=6.4;reference.location=(4,1,3.2);reference.rotation_euler=(math.pi/2,0,0);reference.hide_render=True

studio((0,0,3.24),(.05,-13,3.55),7.0)
sc=bpy.context.scene;sc.cycles.samples=64;sc.render.resolution_x=1000;sc.render.resolution_y=1200
sc.view_settings.view_transform='AgX'
export('gashapon_machine_v2',root)
(ROOT/'assets'/'machine-v2-report.json').write_text(json.dumps(stats,indent=2))
# Preserve a separate editable character master too.
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'sheep_girl_v2.blend'))
sc.render.filepath=str(ROOT/'assets'/'source'/'models'/'machine-v2-front.png');bpy.ops.render.render(write_still=True)
camera=sc.camera;camera.location=(.02,-10,5.18);camera.rotation_euler=(Vector((0,0,5.17))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=3.08
sc.render.resolution_x=1100;sc.render.resolution_y=1100;sc.render.filepath=str(ROOT/'assets'/'source'/'models'/'sheep-girl-v2-front.png');bpy.ops.render.render(write_still=True)
print('V2 REBUILD COMPLETE',json.dumps(stats))
