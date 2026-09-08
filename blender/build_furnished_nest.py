"""Room 02: sculpted clay cutaway, editable furniture, real roof aperture.
Blender Z-up, front -Y; glTF Y-up, front +Z. Originals/old room are retained.
"""
from pathlib import Path
import bpy, math, json, shutil, hashlib, os
import numpy as np
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/drafts/nest-02'; TEX=OUT/'textures'; PREVIEW=ROOT/'previews/community/room'
for folder in (OUT,TEX,PREVIEW):folder.mkdir(parents=True,exist_ok=True)
ref=Path('C:/作品集网站/杂/scene/初始房间2号.png')
if not (OUT/'reference.png').exists():shutil.copyfile(ref,OUT/'reference.png')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
root=bpy.data.objects.new('FURNISHED_NEST_ROOM',None);bpy.context.collection.objects.link(root)
root['room_id']='furnished-nest-v2';root['floor_y_web']=0.0

def rgb(h):
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in [int(h[i:i+2],16)/255 for i in (1,3,5)])
def mat(name,h,rough=.47,metal=0,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb(h),1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    p.inputs['Coat Weight'].default_value=.12 if not metal else .05;p.inputs['Coat Roughness'].default_value=.38
    if emit:p.inputs['Emission Color'].default_value=(*rgb(h),1);p.inputs['Emission Strength'].default_value=emit
    return m
def finish(o,name,m=None):
    o.name=name;o.parent=root
    if m:o.data.materials.append(m)
    return o
def bevel(o,width=.05,segments=4):
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('Soft clay rounded edges','BEVEL');mod.width=width;mod.segments=segments;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Weighted smooth normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def box(name,pos,size,m,r=.06):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,name,m);return bevel(o,min(r,min(size)*.45))
def sphere(name,pos,size,m):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28,ring_count=16,location=pos);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for f in o.data.polygons:f.use_smooth=True
    return finish(o,name,m)
def cylinder(name,pos,radius,depth,m,rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=radius,depth=depth,location=pos,rotation=rotation);o=bpy.context.object;finish(o,name,m);return bevel(o,min(.03,depth*.25),3)
def mesh(name,verts,faces,m):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,m)
def extrude(name,outline,low,high,m,r=.05):
    n=len(outline);verts=[(x,y,z) for z in (low,high) for x,y in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return bevel(mesh(name,verts,faces,m),r)
def tube(name,points,r,m,closed=False,smooth=True):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=10;c.bevel_depth=r;c.bevel_resolution=3
    if smooth:
        s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
        for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    else:
        s=c.splines.new('POLY');s.points.add(len(points)-1)
        for p,co in zip(s.points,points):p.co=(*co,1)
    s.use_cyclic_u=closed;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,m)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o
def rod(name,a,b,r,m):
    a=Vector(a);b=Vector(b);o=cylinder(name,(a+b)/2,r,(b-a).length,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
def map_image(name,data,noncolor=False):
    h,w,_=data.shape;im=bpy.data.images.new(name,width=w,height=h,alpha=True)
    if noncolor:im.colorspace_settings.name='Non-Color'
    im.pixels.foreach_set(data.astype(np.float32).ravel());im.filepath_raw=str(TEX/(name+'.png'));im.file_format='PNG';im.save();im.pack();return im
def texture_material(name,colors,kind):
    n=512;y,x=np.mgrid[:n,:n]/n;rng=np.random.default_rng(81);noise=rng.normal(0,.012,(n,n))
    if kind=='wood':
        field=.023*np.sin((y+.035*np.sin(x*9))*95)+.008*np.sin(y*370+x*7)+noise*.15
        color=np.clip(np.array(rgb(colors[0]))[None,None,:]*(1+field[...,None]),0,1)
    elif kind=='weave':
        triangle=2*np.abs((x*16)%1-.5);stripe=((y*40+triangle*.8)%len(colors)).astype(int)
        color=np.array([rgb(c) for c in colors])[stripe]*(1+noise[...,None])
        field=.04*np.sin(x*2*math.pi*128)*np.sin(y*2*math.pi*128)
    else:
        field=rng.random((n,n))*.15;color=np.array(rgb(colors[0]))[None,None,:]*(.85+field[...,None])
    m=mat(name,colors[0],.85 if kind!='wood' else .45);nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
    base=map_image(name+'-base',np.concatenate([color,np.ones((n,n,1))],axis=2));t=nodes.new('ShaderNodeTexImage');t.image=base;links.new(t.outputs['Color'],p.inputs['Base Color'])
    normal=np.stack([-np.gradient(field,axis=1)*2,-np.gradient(field,axis=0)*2,np.ones_like(field)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
    ni=map_image(name+'-normal',np.concatenate([normal*.5+.5,np.ones((n,n,1))],axis=2),True);t=nodes.new('ShaderNodeTexImage');t.image=ni;q=nodes.new('ShaderNodeNormalMap');q.inputs['Strength'].default_value=.6;links.new(t.outputs['Color'],q.inputs['Color']);links.new(q.outputs['Normal'],p.inputs['Normal']);return m
def flat_uv(o,axes,spans):
    uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Surface UV')
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(v[axes[0]]/spans[0]+.5,v[axes[1]]/spans[1]+.5)

wall=mat('Milky ivory soft clay','#f7f1df',.52);pink=mat('Rose clay roof and platform','#dcaeae',.48);wood=mat('Honey rounded wood','#c7a37d',.43)
cream=mat('Cream enamel','#f9f1dd',.36);white=mat('Cream shelf paint','#f1e9dc',.48);gold=mat('Honey brass','#c2944c',.31,.48)
purple=mat('Lilac vinyl sofa','#a860cd',.44);purple_light=mat('Lilac cushions','#b16cda',.5);piping=mat('Sofa piping','#8747ad',.47)
yellow=mat('Lemon cushion','#f7df69',.54);orange=mat('Marigold flower cushion','#eaa155',.5);potmat=mat('Lavender pans','#aaa0b4',.38,.16)
dark=mat('Soft espresso details','#70543d',.46);burner=mat('Golden hob flame','#ffcc34',.38,emit=4);oven=mat('Warm oven glass','#d9691f',.3,emit=1.5);shade=mat('Warm lamp shade','#ffefc4',.43,emit=.65)
paper_mats=[mat('Gallery '+str(i),c,.68) for i,c in enumerate(['#d1ab53','#dcc0d6','#bf7997','#a872b3','#ecd5ba'])]
floor_mats=[texture_material('Honey plank '+str(i),[c],'wood') for i,c in enumerate(['#e1c596','#ead3a8','#ddbd8e'])]
throwmat=texture_material('Woven zigzag throw',['#f0d0d1','#b678a6','#eed6b4','#a58b9e','#dcc4d3'],'weave')
rugmat=texture_material('Ivory boucle rug',['#f6efe3'],'rug')

# Thick square plinth with a true stair recess; no decorative webpage frame.
outline=[(-5,-5),(.6,-5),(.6,-3.35),(3.15,-3.35),(3.15,-5),(5,-5),(5,5),(-5,5)]
extrude('Rounded pink platform with stair recess',outline,-1.75,-.14,pink,.15)
for j in range(12):
    yy=-4.8+(j+.5)*9.6/12;segments=[(-4.8,4.8)] if yy> -3.3 else [(-4.8,.57),(3.18,4.8)]
    for i,(a,b) in enumerate(segments):
        o=box('Honey floor plank %02d-%d'%(j,i),((a+b)/2,yy,-.10),(b-a-.02,.78,.20),floor_mats[j%3],.055);flat_uv(o,(0,1),(b-a,.8))
for j in range(3):
    high=-.55*(j+1);yy=-3.35-(j+.5)*.55
    box('Stair tread '+str(j),(1.875,yy,(-1.78+high)/2),(2.50,.57,high+1.78),pink,.07)
box('Left soft clay wall',(-4.87,0,2.75),(.35,9.9,5.5),wall,.12)
box('Rear soft clay wall',(0,4.87,2.75),(9.9,.35,5.5),wall,.12)
box('Left interior skirting',(-4.64,0,.13),(.12,9.5,.22),wood,.025)
box('Rear interior skirting',(0,4.64,.13),(9.5,.12,.22),wood,.025)

# Two planar roof faces meet along ONE shared straight miter, no warped corner.
A=(-5.0,-4.95,5.45);B=(-5.0,5.0,5.45);C=(-3.75,3.75,8.5);D=(-3.75,-4.95,8.5);E=(4.95,5.0,5.45);F=(4.95,3.75,8.5)
roof=mesh('Planar mitered rose roof',[A,B,C,D,E,F],[(0,1,2,3),(1,4,5,2)],pink)
bpy.context.view_layer.objects.active=roof;mod=roof.modifiers.new('Roof thickness','SOLIDIFY');mod.thickness=.25;mod.offset=0;bpy.ops.object.modifier_apply(modifier=mod.name)
v=Vector((0,-1.25,3.05)).normalized();u=Vector((1,0,0));normal=u.cross(v).normalized();origin=Vector((1.65,5.0,5.45))
def wp(x,y,depth=0):return origin+u*x+v*y+normal*depth
arch=[(-.88,.45),(.88,.45),(.88,1.57)]+[(.88*math.cos(a),1.57+.88*math.sin(a)) for a in np.linspace(0,math.pi,25)[1:]]
n=len(arch);verts=[tuple(wp(x,y,depth)) for depth in (-.7,.7) for x,y in arch]
faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
cutter=mesh('TEMP arched roof window cut',verts,faces,None)
bpy.context.view_layer.objects.active=roof;mod=roof.modifiers.new('Real arched window opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True);bevel(roof,.10)
roof['planar_miter']=True;roof['window_aperture']=True
tube('Golden arched window frame',[tuple(wp(x,y,.08)) for x,y in arch],.105,gold,True,False)
# A luminous pane sits behind the opening. It is visible but never casts a shadow,
# so both Cycles and the web renderer let the real sunlight reach the floor.
windowmat=mat('Window warm sky','#ffe4a0',.6,emit=.85)
pane=mesh('Luminous arched window pane',[tuple(wp(x,y,-.16)) for x,y in arch],[tuple(range(n))],windowmat)
pane['noShadow']=True;pane.visible_shadow=False
rod('Arched window sill',wp(-.91,.43,.10),wp(.91,.43,.10),.115,gold)
# Raised roof ribs lie flat on the left roof plane.
for yy in [-3.55,-1.15,1.25]:
    rib=box('Left roof rib',(-4.21,yy,6.94),(.15,.28,2.66),cream,.035);rib.rotation_euler.y=math.atan(1.25/3.05)

# Small scattered brick-like clay accents, flush-mounted rather than floating.
for yy,zz in [(-4.05,4.6),(-3.6,3.8),(-4.1,2.9),(3.6,4.7),(3.85,3.8),(-3.2,4.95)]:
    box('Left wall clay brick',(-4.64,yy,zz),(.055,.48,.24),paper_mats[int(abs(yy))%5],.018)
for xx,zz in [(-2.8,4.9),(-2.5,4.2),(.2,4.4),(3.4,4.9),(4.25,4.35),(3.85,3.8)]:
    box('Rear wall clay brick',(xx,4.64,zz),(.48,.055,.24),paper_mats[4],.018)

# Left-wall tapestry behind a genuinely sculpted, upholstered two-seat sofa.
o=box('Woven wall hanging',(-4.60,.55,3.52),(.10,3.95,2.9),throwmat,.045);flat_uv(o,(1,2),(3.95,2.9))
sx=-3.59;sy=.55
for yy in [sy-1.52,sy+1.52]:
    for xx in [sx-.60,sx+.54]:cylinder('Sofa wooden foot',(xx,yy,.17),.12,.27,wood)
box('Sofa lower body',(sx,sy,.62),(1.97,4.04,.68),purple,.23)
box('Sofa rounded back',(sx-.78,sy,1.87),(.42,3.98,2.43),purple,.20)
box('Sofa back cushion',(sx-.50,sy,1.95),(.47,3.51,1.95),purple_light,.22)
for yy in [sy-.92,sy+.92]:box('Sofa plump seat',(sx+.08,yy,1.04),(1.55,1.74,.39),purple_light,.16)
for yy in [sy-1.94,sy+1.94]:
    box('Sofa rounded arm',(sx+.03,yy,1.30),(1.98,.38,1.47),purple,.19)
    tube('Sofa arm piping',[(sx+.94,yy-.20,.70),(sx+.94,yy-.20,1.79),(sx+.76,yy-.20,1.95),(sx-.68,yy-.20,1.95)],.026,piping)
o=box('Lilac tilted pillow',(sx-.18,sy+1.03,1.80),(.36,.87,.96),purple_light,.13);o.rotation_euler.x=.15
for i in range(7):
    a=i*math.tau/7;o=sphere('Marigold pillow petal',(sx+.22,sy+.30+math.sin(a)*.42,1.85+math.cos(a)*.42),(.15,.20,.30),orange);o.rotation_euler.x=-a
sphere('Flower pillow centre',(sx+.34,sy+.30,1.85),(.16,.22,.22),yellow)

# A soft oval rug: physical thickness and an exportable boucle normal map.
rug=sphere('Oval ivory rug',(-.80,-.40,.035),(1.7,2.10,.045),rugmat)

# Mini stove, with hollow pans and handles attached near the upper wall.
cx=-3.64;cy=-3.60
box('Stove enamel body',(cx,cy,1.01),(1.90,1.84,1.99),cream,.12)
box('Stove back guard',(cx-.83,cy,2.23),(.15,1.76,.55),cream,.06)
box('Stove hob',(cx,cy,2.05),(1.96,1.87,.13),white,.05)
box('Oven front inset',(cx+.955,cy,.93),(.03,1.52,1.06),wood,.045)
box('Glowing oven glass',(cx+.984,cy,.95),(.04,1.33,.81),oven,.055)
for yy in [cy-.76,cy+.76]:box('Oven frame side',(cx+1.015,yy,.95),(.10,.15,1.12),cream,.03)
for zz in [.43,1.48]:box('Oven frame crossbar',(cx+1.015,cy,zz),(.10,1.60,.15),cream,.03)
rod('Oven handle',(cx+1.11,cy-.57,1.42),(cx+1.11,cy+.57,1.42),.055,wood)
for yy in [cy-.66,cy-.23,cy+.23,cy+.66]:cylinder('Stove control knob',(cx+1.02,yy,1.77),.11,.10,wood,(0,math.pi/2,0))
def pan(index,x,y):
    z=2.21;cylinder('Hob burner glow '+str(index),(x,y,2.155),.39,.045,burner)
    for a in [0,math.pi/2,math.pi,3*math.pi/2]:rod('Hob grate',(x+math.cos(a)*.26,y+math.sin(a)*.26,2.19),(x+math.cos(a)*.49,y+math.sin(a)*.49,2.19),.035,dark)
    # Closed profile contains exterior, rounded rim and interior basin.
    profile=[(0,0),(.30,0),(.40,.055),(.43,.39),(.41,.44),(.36,.43),(.35,.13),(0,.13)];verts=[]
    for radius,zz in profile:
        for k in range(48):a=k*math.tau/48;verts.append((x+radius*math.cos(a),y+radius*math.sin(a),z+zz))
    faces=[]
    for j in range(len(profile)-1):
        for k in range(48):faces.append((j*48+k,j*48+(k+1)%48,(j+1)*48+(k+1)%48,(j+1)*48+k))
    o=mesh('Hollow lavender pan '+str(index),verts,faces,potmat)
    for f in o.data.polygons:f.use_smooth=True
    cylinder('Golden soup '+str(index),(x,y,z+.32),.357,.015,yellow)
    handle_z=z+.33
    rod('Upper pan handle '+str(index),(x+.37,y,handle_z),(x+.91,y,handle_z+.055),.075,potmat)
    o['handle_height_fraction']=.75
pan(0,cx-.02,cy-.48);pan(1,cx-.08,cy+.49)

# Brass arched floor lamp, hollow shade aimed onto the tapestry/couch.
lx=-3.00;ly=3.28
cylinder('Floor lamp base',(lx,ly,.11),.35,.20,gold)
tube('Brass arched lamp stem',[(lx,ly,.18),(lx,ly,3.9),(lx,ly,4.95),(lx+.12,ly-.30,5.20),(lx+.34,ly-.69,5.06)],.045,gold)
bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=.63,radius2=.32,depth=.70,end_fill_type='NOTHING',location=(lx+.34,ly-.73,4.71),rotation=(0,.25,math.pi/4))
lamp=bpy.context.object;finish(lamp,'Warm tapered lamp shade',shade)
mod=lamp.modifiers.new('Hollow shade wall thickness','SOLIDIFY');mod.thickness=.035;bpy.ops.object.modifier_apply(modifier=mod.name);bevel(lamp,.012)
lamp['hollow_shade']=True
diffuser=sphere('Lamp lit diffuser',(lx+.26,ly-.73,4.34),(.22,.22,.10),mat('Lamp diffuser glow','#ffe9a0',.45,emit=3.5))
diffuser['noShadow']=True;diffuser.visible_shadow=False

# Wall picture cluster and low open bookcase on the rear wall.
for i,(xx,zz,ww,hh) in enumerate([(-2.04,3.86,.69,1.27),(-1.14,4.45,.54,.91),(-1.11,3.33,.53,.95),(-.32,3.94,.43,.72),(-.23,2.81,.70,1.04)]):
    box('Picture frame '+str(i),(xx,4.59,zz),(ww+.11,.10,hh+.11),dark,.032)
    box('Picture print '+str(i),(xx,4.525,zz),(ww,.025,hh),paper_mats[i],.025)
bx=2.63;by=4.02;bw=3.57;bd=1.12
for xx in [bx-bw/2+.18,bx+bw/2-.18]:
    for yy in [by-bd/2+.13,by+bd/2-.13]:cylinder('Bookcase foot',(xx,yy,.14),.10,.24,wood)
box('Bookcase back',(bx,by+.51,1.07),(bw,.12,1.93),white,.04)
for xx in [bx-bw/2,bx+bw/2,bx-.08]:box('Bookcase upright',(xx,by,1.08),(.14,bd,1.96),white,.035)
box('Bookcase bottom',(bx,by,.26),(bw,bd,.13),white,.035)
box('Bookcase honey top',(bx,by,2.12),(bw+.18,bd+.12,.18),wood,.055)
box('Bookcase right shelf',(bx+.88,by,1.12),(1.64,bd,.11),white,.025)
bookcols=['#af6689','#d697b0','#897f9e','#dec898','#c58765','#a98b82']
books=[mat('Book cloth '+str(i),c,.7) for i,c in enumerate(bookcols)]
for i in range(6):box('Upright book '+str(i),(bx-1.48+i*.21,by-.19,.74),(.16,.61,.90-(i%3)*.09),books[i],.02)
for i in range(3):box('Stacked book '+str(i),(bx+.84,by-.05,1.35+i*.17),(1.13,.75,.14),books[4-i],.025)
box('Storage cube',(bx+.99,by-.08,.59),(.68,.67,.62),wood,.055)
box('Storage cube handle',(bx+.99,by-.43,.63),(.19,.025,.09),dark,.018)

# Keep only the straight front landing rail. The broken stair-side rail is removed.
for xx in [-2.30,-1.56,-.82,-.08,.52]:rod('Landing baluster',(xx,-4.70,.03),(xx,-4.70,.94),.045,wood)
rod('Landing handrail',(-2.42,-4.70,1.01),(.64,-4.70,1.01),.085,wood)

obstacles=[{'id':'sofa','x':sx,'z':-sy,'halfX':1.06,'halfZ':2.18},{'id':'stove','x':cx,'z':-cy,'halfX':1.10,'halfZ':.99},{'id':'bookcase','x':bx,'z':-by,'halfX':1.9,'halfZ':.63},{'id':'floor-lamp','x':lx,'z':-ly,'radius':.38},{'id':'stairs','x':1.875,'z':4.21,'halfX':1.30,'halfZ':.90},{'id':'landing-rail','x':-.90,'z':4.70,'halfX':1.55,'halfZ':.10}]
root['obstacles_web']=json.dumps(obstacles);root['roof_join']='two planar slopes, shared straight miter';root['window_light_web']=json.dumps({'position':[2.48,17,-10.83],'target':[1.1,0,-.2]})

# Export excludes photographic background and camera; user-supplied checkerboard is never used as a backdrop.
bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
for o in root.children:o.select_set(True)
bpy.context.view_layer.objects.active=root
gltf=OUT/'furnished_nest.glb';bpy.ops.export_scene.gltf(filepath=str(gltf),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
shutil.copyfile(gltf,ROOT/'assets/delivery/room_furnished_nest.glb')

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=int(os.environ.get('BC_NEST_SAMPLES','48'));scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Soft pastel studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(*rgb('#c9d7e2'),1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.4;scene.world=world
def light(name,kind,pos,color,power,size,target=(0,0,1)):
    d=bpy.data.lights.new(name,kind);d.energy=power;d.color=color
    if kind=='AREA':d.shape='DISK';d.size=size
    elif kind=='SUN':d.angle=size
    else:d.shadow_soft_size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
light('Front softbox','AREA',(2,-7,11),(1,.91,.81),500,7)
light('Gentle cool fill','AREA',(9,-1,6),(.79,.88,1),220,7)
light('Sun through real arch','SUN',(2.48,10.83,17),(1,.83,.53),3.0,.035,(1.1,.2,0))
light('Lamp pool','POINT',(lx+.34,ly-.73,4.22),(1,.72,.30),110,.22)
light('Oven pool','POINT',(cx+1.20,cy,1.05),(1,.39,.035),35,.22)
light('Hob pool','POINT',(cx+.12,cy,2.40),(1,.65,.08),20,.15)
ground=mat('PREVIEW studio background','#c8d8dc',.86);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-1.80));bpy.context.object.data.materials.append(ground);bpy.context.object.name='PREVIEW_ONLY_ground'
data=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',data);bpy.context.collection.objects.link(camera);scene.camera=camera;camera.location=(14,-16,13);look=Vector((0,0,3.1));camera.rotation_euler=(look-camera.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=17.6
scene.render.filepath=str(PREVIEW/'furnished-nest-model.png');bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/furnished_nest.blend'));bpy.ops.render.render(write_still=True)
# Separate scale-check render only. These residents are not baked into the room GLB or saved .blend.
for toy_id,file,height,location in [('tired_crow','toy_tired_crow.glb',1.9,(-.55,-1.80,0)),('miss_popcorn','toy_popcorn_maid.glb',2.0,(2.4,.5,0))]:
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/delivery'/file));imported=set(bpy.data.objects)-before
    points=[o.matrix_world@Vector(corner) for o in imported if o.type=='MESH' for corner in o.bound_box]
    lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);size=hi-lo;center=(hi+lo)/2
    factor=min(height/size.z,1.8/math.hypot(size.x,size.y))*1.5
    group=bpy.data.objects.new('PREVIEW_ONLY_resident_'+toy_id,None);bpy.context.collection.objects.link(group)
    for o in imported:
        if o.parent not in imported:world_matrix=o.matrix_world.copy();o.parent=group;o.matrix_world=world_matrix
    group.scale=(factor,)*3;group.location=Vector(location)-Vector((center.x,center.y,lo.z))*factor
scene.render.filepath=str(PREVIEW/'furnished-nest-with-toys.png');bpy.ops.render.render(write_still=True)
# Second mood render is a preview only; the saved editable scene stays in daylight.
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(*rgb('#7793bf'),1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.10
bpy.data.lights['Front softbox'].energy=90;bpy.data.lights['Front softbox'].color=(.58,.73,1)
bpy.data.lights['Gentle cool fill'].energy=95
bpy.data.lights['Sun through real arch'].energy=.5;bpy.data.lights['Sun through real arch'].color=(.42,.62,1)
bpy.data.lights['Lamp pool'].energy=170
for material,color,strength in [(windowmat,'#8bade3',.5),(shade,'#ffdf99',1.0)]:
    p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb(color),1);p.inputs['Emission Color'].default_value=(*rgb(color),1);p.inputs['Emission Strength'].default_value=strength
ground.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*rgb('#263447'),1)
scene.render.filepath=str(PREVIEW/'furnished-nest-night-with-toys.png');bpy.ops.render.render(write_still=True)
report={'roomId':'furnished-nest-v2','meshes':len([o for o in root.children if o.type=='MESH']),'glbBytes':gltf.stat().st_size,'sha256':hashlib.sha256(gltf.read_bytes()).hexdigest(),'obstacles':obstacles,'published':False}
(OUT/'room-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(report,ensure_ascii=False))
