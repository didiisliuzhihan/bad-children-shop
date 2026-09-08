"""Toy 05 / 我没招了鸦 — editable reference reconstruction, never auto-published.
Run C:/工具/blender.exe --background --python blender/build_tired_crow.py
Front = -Y; Blender masters, full GLB, texture maps and supplied art are kept.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
exec(compile((ROOT/'blender/build_assets.py').read_text(encoding='utf8').split('\nreset()\nblue=')[0],'asset_helpers','exec'))
import bmesh, os, hashlib, numpy as np
from mathutils import noise
reset(); random.seed(505)
DRAFT=ROOT/'assets/drafts/toy05'; DRAFT.mkdir(parents=True,exist_ok=True)
RENDERS=ROOT/'previews/toy05'; RENDERS.mkdir(parents=True,exist_ok=True)
TEX=ROOT/'assets/source/textures/toy05'; TEX.mkdir(parents=True,exist_ok=True)
OUT=DRAFT
root=empty('toy_tired_crow');root['display_name_zh']='我没招了鸦';root['catalog_status']='APPROVAL CANDIDATE — do not integrate or publish without explicit user approval'
chair=empty('01_RED_armchair',parent=root);bird=empty('02_SLUMPED_crow',parent=root)
face=empty('03_EXHAUSTED_expression',parent=root);linen=empty('04_IVORY_towels',parent=root);feet=empty('05_DANGLING_feet',parent=root)

def linear(h):
    return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in [int(h[i:i+2],16)/255 for i in (1,3,5)])
def material(name,h,rough,coat=.1):
    m=mat('05 | '+name,linear(h),rough,coat=coat);m.node_tree.nodes.get('Principled BSDF').inputs['Coat Roughness'].default_value=.34;return m
crow=material('Slate indigo satin vinyl','#44485D',.44,.10)
lidmat=material('Heavy slate eyelids','#383D50',.40,.1)
beakmat=material('Soft graphite beak','#45495F',.40,.09)
mouthmat=material('Beak seam','#272C3F',.48,.02)
eyewhite=material('Cool ivory eye whites','#E4E7F0',.32,.1)
pupil=material('Ink-black sleepy pupils','#090B15',.26,.17)
red=material('Distressed warm red upholstery','#BD504C',.55,.035)
towel=material('Cream terry cotton','#F3EBD8',.78,.015)
footmat=material('Slate feet','#3B4056',.40,.08)

def image_file(name,pixels,noncolor=False):
    h,w,_=pixels.shape;img=bpy.data.images.new(name,width=w,height=h,alpha=True)
    if noncolor:img.colorspace_settings.name='Non-Color'
    img.pixels.foreach_set(pixels.astype(np.float32).ravel());img.filepath_raw=str(TEX/(name+'.png'));img.file_format='PNG';img.save();img.pack();return img

def surface_maps(m,kind):
    """Exportable PBR textures, not render-only procedural shader nodes."""
    n=512;y,x=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(505 if kind=='terry' else 506)
    field=np.zeros((n,n))
    for freq,amp in [(2,.6),(5,.27),(11,.12),(27,.06)]:
        for j in range(5):
            a,b=rng.integers(1,freq+1,2);field+=np.sin(math.tau*(a*x+b*y)+rng.random()*math.tau)*amp/5
    if kind=='terry':
        weave=np.sin(math.tau*x*67+np.sin(math.tau*y*43)*.75)*np.sin(math.tau*y*79)
        height=field*.15+weave*.025+rng.random((n,n))*.065;normal_strength=1.9
    else:
        height=field*.32+np.sin(math.tau*(x*59+y*3))*.012+rng.random((n,n))*.019;normal_strength=2.7
    dx=(np.roll(height,-1,1)-np.roll(height,1,1))*normal_strength;dy=(np.roll(height,-1,0)-np.roll(height,1,0))*normal_strength
    norm=np.stack([-dx,-dy,np.ones_like(dx)],axis=-1);norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
    rgba=np.concatenate([norm*.5+.5,np.ones((n,n,1))],axis=2)
    im=image_file(kind+'-micro-normal',rgba,True)
    tree=m.node_tree;tx=tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.label='Mobile-safe micro normal'
    normal=tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.46 if kind=='terry' else .27
    tree.links.new(tx.outputs['Color'],normal.inputs['Color']);tree.links.new(normal.outputs['Normal'],tree.nodes.get('Principled BSDF').inputs['Normal'])
    # Small tonal variation is baked to a color texture, preserving the base hue.
    base=np.array([int(('#F0E5C8' if kind=='terry' else '#B64747')[i:i+2],16)/255 for i in (1,3,5)])
    variation=1+field*(.033 if kind=='terry' else .13)
    rgb=np.clip(variation[...,None]*base,0,1);rgba=np.concatenate([rgb,np.ones((n,n,1))],axis=2)
    im=image_file(kind+'-base-color',rgba);tx=tree.nodes.new('ShaderNodeTexImage');tx.image=im
    tx.label='Preserved swatch source; continuous vertex paint drives the sculpt'
surface_maps(red,'upholstery');surface_maps(towel,'terry')

def mesh(name,verts,faces,m,parent):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(data);bm.free()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);return finish(obj,name,m,parent)
def subdiv(obj,n=2):
    mod=obj.modifiers.new('Soft sculpt subdivision','SUBSURF');mod.levels=n;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name);return obj
def detail(obj,amount=.006,scale=9):
    for v in obj.data.vertices:
        p=obj.matrix_world@v.co;v.co+=v.normal*(noise.noise(p*scale)*amount+noise.noise(p*scale*2.8)*amount*.24)
    obj.data.update();return obj
def softbox(name,pos,size,m,parent,bevel=.2):
    obj=box(name,pos,size,m,bevel,parent)
    subdiv(obj,3);detail(obj,.009,9);return obj
def fuse(name,objects,voxel=.015):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();obj=objects[0];obj.name=name
    rem=obj.modifiers.new('Continuous molded volume','REMESH');rem.mode='VOXEL';rem.voxel_size=voxel;rem.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=rem.name)
    smooth=obj.modifiers.new('Rounded joins','SMOOTH');smooth.factor=.9;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
    for p in obj.data.polygons:p.use_smooth=True
    return obj
def spline(points,values=None,steps=8):
    out=[];rv=[]
    pts=[Vector(p) for p in points]
    for i in range(len(pts)-1):
        p0,p1,p2,p3=pts[max(i-1,0)],pts[i],pts[i+1],pts[min(i+2,len(pts)-1)]
        for j in range(steps):
            t=j/steps;out.append(tuple(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)))
            if values:rv.append(values[i]*(1-t)+values[i+1]*t)
    out.append(tuple(pts[-1]));
    if values:rv.append(values[-1])
    return (out,rv) if values else out

# Rear shell: broad rounded shoulders, continuous pillow top, and gently raked
# profile. The seat and arm supports meet the shell, including from the back.
back=softbox('Chair — tall padded rear shell',(0,.57,1.53),(3.10,.56,2.90),red,chair,.34)
for v in back.data.vertices:
    worldz=v.co.z+back.location.z
    v.co.x*=1-.085*max(0,(worldz-1.9)/1.2)**2
    v.co.y+=.12*(worldz/3)**2
seat=softbox('Chair — low thick seat cushion',(0,-.18,.32),(3.13,1.98,.48),red,chair,.22)
for s in [-1,1]:
    arm=softbox('Chair — rolled armrest '+str(s),(s*1.34,-.27,.79),(.50,1.92,1.15),red,chair,.22)
    for v in arm.data.vertices:
        # Arm rises toward the rear where it joins the back, a lounge-chair L.
        wy=v.co.y+arm.location.y;v.co.z+=.16*max(0,(wy+.9)/1.8)
        v.co.x+=s*.035*math.cos(v.co.z*2)
fuse('Chair — continuous upholstered shell',list(chair.children),.018)

# Pear-shaped torso and head are ONE continuous surface. Narrow, recessed
# upper head and broad low belly create the resigned, slumped silhouette.
profile=[(.47,.36,.29,-.03),(.57,.76,.49,-.09),(.78,1.01,.66,-.12),(1.13,1.12,.74,-.12),(1.50,1.10,.73,-.06),(1.84,1.025,.66,.02),(2.19,.925,.58,.10),(2.52,.875,.53,.12),(2.82,.805,.48,.17),(3.03,.66,.39,.18),(3.13,.38,.28,.18),(3.17,.02,.02,.18)]
def radial(z):
    for k,(a,b) in enumerate(zip(profile,profile[1:])):
        if a[0]<=z<=b[0]:
            t=(z-a[0])/(b[0]-a[0]);previous=profile[max(0,k-1)];following=profile[min(len(profile)-1,k+2)]
            result=[]
            for j in [1,2,3]:
                m0=(b[j]-previous[j])/(b[0]-previous[0])*(b[0]-a[0]);m1=(following[j]-a[j])/(following[0]-a[0])*(b[0]-a[0])
                result.append((2*t**3-3*t*t+1)*a[j]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*b[j]+(t**3-t*t)*m1)
            return tuple(result)
    return profile[0][1:] if z<profile[0][0] else profile[-1][1:]
verts=[];faces=[];nz=100;ns=128
for j in range(nz+1):
    z=profile[0][0]+(profile[-1][0]-profile[0][0])*j/nz;rx,ry,cy=radial(z)
    for i in range(ns):
        a=math.tau*i/ns;verts.append((rx*math.cos(a),cy+ry*math.sin(a),z))
for j in range(nz):
    for i in range(ns):a=j*ns+i;b=j*ns+(i+1)%ns;faces.append((a,b,b+ns,a+ns))
faces.extend([tuple(reversed(range(ns))),tuple(nz*ns+i for i in range(ns))])
body=mesh('Crow — single slumped pear body',verts,faces,crow,bird)
def front_y(x,z):
    rx,ry,cy=radial(z);return cy-ry*math.sqrt(max(.025,1-(x/rx)**2))

# The drooping wings are teardrop-shaped, not tubes. Elliptical cross-sections
# twist round the chair arms and taper to a soft tip near the seat.
for s in [-1,1]:
    coords=[(s*.85,-.12,1.85),(s*1.04,-.34,1.68),(s*1.36,-.63,1.33),(s*1.56,-.76,.92),(s*1.60,-.84,.68),(s*1.53,-.91,.57)]
    widths=[.05,.17,.245,.225,.12,.006];depths=[.045,.09,.115,.13,.085,.006]
    pts,ww=spline(coords,widths,8);_,dd=spline(coords,depths,8);vv=[];ff=[];n=24
    for j,p in enumerate(pts):
        p=Vector(p);t=(Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)])).normalized();a=t.cross(Vector((0,1,0))).normalized();b=t.cross(a).normalized()
        for k in range(n):ang=k*math.tau/n;vv.append(tuple(p+a*ww[j]*math.cos(ang)+b*dd[j]*math.sin(ang)))
    for j in range(len(pts)-1):
        for k in range(n):a=j*n+k;b=j*n+(k+1)%n;ff.append((a,b,b+n,a+n))
    ff.extend([tuple(reversed(range(n))),tuple((len(pts)-1)*n+k for k in range(n))]);mesh('Limp wing draped over arm '+str(s),vv,ff,crow,bird)

# Eye whites and lids share a curved base, so the half-closed expression reads
# in profile too. The pupil stays under the heavy lid, slightly rolled upward.
for s in [-1,1]:
    x=s*.455;z=2.55;y=front_y(x,z)-.034
    group=empty('Sleepy eye assembly '+str(s),(x,y,z),face);group.rotation_euler[2]=s*.25
    eye=hemisphere('Cool lower eye white '+str(s),1,eyewhite,False,group,segments=64,rings=28);eye.scale=(.285,.135,.255)
    sphere('Upper tucked pupil '+str(s),(.065,-.137,-.013),(.086,.030,.094),pupil,group,36,24)
    vv=[];ff=[];n=64;rings=22
    for j in range(rings+1):
        a=(math.pi*.5+.11)*j/rings
        for i in range(n):
            q=math.tau*i/n;lx=.302*math.sin(a)*math.cos(q);ly=.164*math.sin(a)*math.sin(q);lz=.270*math.cos(a)
            lz-=s*lx*.16;vv.append((lx,ly-.014,lz))
    for j in range(rings):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;ff.append((a,b,b+n,a+n))
    ff.append(tuple(rings*n+i for i in range(n)));mesh('Weighted upper eyelid '+str(s),vv,ff,lidmat,group)

# A short triangular crow beak: rounded ridge, tucked lower half, and a real
# seam on the underside. No smile, nostril holes or new expression added.
def beak_half(name,upper=True):
    vv=[];ff=[];n=48;rings=36
    for j in range(rings+1):
        t=j/rings;width=.228*(1-t**1.5)+.014;cy=-.425-.355*t;z=2.36+.020*t
        for i in range(n):
            a=math.tau*i/n;u=math.cos(a);v=math.sin(a)
            zz=(.204*(1-t)**.7*max(v,0)+.01*min(v,0)) if upper else (.018*max(v,0)+.122*(1-t)**.5*min(v,0))
            vv.append((width*u,cy,z+zz))
    for j in range(rings):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;ff.append((a,b,b+n,a+n))
    ff.extend([tuple(reversed(range(n))),tuple(rings*n+i for i in range(n))]);mesh(name,vv,ff,beakmat,face)
beak_half('Rounded triangular upper beak');beak_half('Small tucked lower beak',False)
path('Fine closed beak seam',[(-.205,-.49,2.351),(-.135,-.70,2.363),(0,-.796,2.372),(.135,-.70,2.363),(.205,-.49,2.351)],.009,mouthmat,face)

# Cloth wrap conforms to the barrel belly, with the left overlap sitting above
# the right sheet. Grid-based surfaces preserve a full, substantial fabric edge.
def cloth_patch(name,xmin,xmax,zmin,zmax,top_slope=0,offset=0):
    nx=72;nz=66;vv=[];ff=[]
    for j in range(nz+1):
        v=j/nz
        for i in range(nx+1):
            u=i/nx;edge=min(u,1-u,v,1-v)
            x=xmin+(xmax-xmin)*u;z=zmin+(zmax-zmin)*v
            cx=(xmin+xmax)/2;cz=(zmin+zmax)/2;rr=.073
            qx=max(0,abs(x-cx)-((xmax-xmin)/2-rr));qz=max(0,abs(z-cz)-((zmax-zmin)/2-rr));q=math.hypot(qx,qz)
            if q>rr:
                x-=math.copysign(qx*(1-rr/q),x-cx);z-=math.copysign(qz*(1-rr/q),z-cz)
            z+=top_slope*(u-.5)
            # Rounded corners of the cloth; shallow tension folds only.
            x+=.028*math.sin(math.pi*v)*(1 if u<.5 else -1)*abs(u-.5)*2
            fold=.016*math.sin(9*u+4*v)+.015*math.sin(18*u-8*v)*math.sin(math.pi*v)
            # Broad, shallow diagonal compression folds — not a flat apron.
            fold-=.030*math.exp(-((v-(.72-.26*u))/.085)**2)*math.sin(math.pi*u)
            fold+=.017*math.exp(-((v-(.55-.25*u))/.07)**2)*math.sin(math.pi*u)
            fold+=noise.noise(Vector((x*17,z*17,3)))*.003
            y=front_y(x,min(1.8,max(.6,z)))-.067-offset+fold
            vv.append((x,y,z))
    for j in range(nz):
        for i in range(nx):a=j*(nx+1)+i;ff.append((a,a+1,a+nx+2,a+nx+1))
    obj=mesh(name,vv,ff,towel,linen)
    solid=obj.modifiers.new('Cotton hem thickness','SOLIDIFY');solid.thickness=.080;solid.offset=0
    bevel=obj.modifiers.new('Soft fabric edge','BEVEL');bevel.width=.028;bevel.segments=4
    return obj
cloth_patch('Towel — full belly underwrap',-1.035,1.035,.64,1.76,top_slope=-.065)
cloth_patch('Towel — folded left overlap',-1.025,.42,.64,1.80,top_slope=.075,offset=.054)

# Turban: full soft crown, broad crossing wraps and two oversized rolled ends.
cap=sphere('Towel — wrapped crown',(0,.11,3.22),(.83,.63,.40),towel,linen,96,64);detail(cap,.014,9)
for v in cap.data.vertices:
    # Raise the visible lower edge to follow the diagonal forehead opening.
    if v.co.y<-.08 and v.co.z<0:v.co.z+=.28*(-v.co.y/.63)*(-v.co.z/.40)
def ribbon(name,points,widths,depths):
    pts,ww=spline(points,widths,12);_,dd=spline(points,depths,12);vv=[];ff=[];n=40
    for j,co in enumerate(pts):
        p=Vector(co);t=(Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(j-1,0)])).normalized();a=t.cross(Vector((0,1,0))).normalized();b=t.cross(a).normalized()
        for i in range(n):
            ang=i*math.tau/n;point=p+a*ww[j]*math.cos(ang)+b*dd[j]*math.sin(ang)
            point+=b*.009*math.sin(j*.34+i*.6);vv.append(tuple(point))
    for j in range(len(pts)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;ff.append((a,b,b+n,a+n))
    ff.extend([tuple(reversed(range(n))),tuple((len(pts)-1)*n+i for i in range(n))]);obj=mesh(name,vv,ff,towel,linen);detail(obj,.006,21);return obj
ribbon('Towel — lower crossing fold',[(.88,.01,2.93),(.73,-.20,3.04),(.48,-.35,3.23),(.10,-.43,3.41),(-.43,-.29,3.51),(-.80,.10,3.27)],[.045,.15,.155,.16,.145,.025],[.035,.06,.065,.07,.065,.025])
ribbon('Towel — broad diagonal forehead wrap',[(-.87,.045,2.88),(-.79,-.18,2.97),(-.48,-.40,3.18),(-.03,-.48,3.39),(.40,-.34,3.54),(.68,.025,3.42)],[.035,.20,.22,.195,.15,.015],[.025,.085,.075,.065,.055,.016])
for s in [-1,1]:
    roll=sphere('Towel — side rolled end '+str(s),(s*1.00,.115,3.30),(.34,.335,.49),towel,linen,96,64);roll.rotation_euler[1]=s*-.30
    for v in roll.data.vertices:
        # A shallow curl indentation, cast into the rolled cloth itself.
        x,y,z=v.co;ang=math.atan2(z/.49,x/.34);radius=math.sqrt((x/.34)**2+(z/.49)**2)
        seam=.020*math.exp(-((radius-(.46+.115*math.sin(ang*1.0))) / .095)**2)*max(0,-y/.335)
        v.co.y+=seam;v.co+=v.normal*noise.noise(v.co*24)*.008
    roll['detail']='Closed cloth roll with a recessed curl, no floating spiral trim'

# Dangling ankles with three expressive toes; all toe roots join the foot.
for s in [-1,1]:
    x=s*.60
    footparts=[]
    ankle_pts=[(x,-.64,.64),(x,-1.12,.49),(x,-1.34,.30),(x,-1.355,.12)]
    pts,rr=spline(ankle_pts,[.10,.08,.065,.015],7);footparts.append(tapered('Drooping ankle '+str(s),pts,rr,footmat,feet,18))
    for j,(dx,zend) in enumerate([(-.18,.51),(-.015,.62),(.18,.54)]):
        pts,rr=spline([(x,-1.345,.24),(x+dx*.44,-1.39,.36),(x+dx,-1.40,zend),(x+dx*1.06,-1.375,zend+.035)],[.056,.049,.029,.007],6)
        footparts.append(tapered('Soft three-toed foot %s %s'%(s,j),pts,rr,footmat,feet,16))
    fuse('Joined three-toed foot '+str(s),footparts,.006)

# Deterministic UV unwrap for real exported texture maps. Dense topology is
# editable in .blend; shipping meshes receive a nondestructive reduction.
for m in [red,towel]:
    vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='SculptTint';m.node_tree.links.new(vc.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
for obj in root.children_recursive:
    if obj.type=='CURVE':obj.data.use_fill_caps=True
    if obj.type!='MESH':continue
    if obj.data.materials and obj.data.materials[0] in [red,towel]:
        fabric=obj.data.materials[0]==towel;base=Vector(linear('#F3EBD8' if fabric else '#BD504C'))
        colors=obj.data.color_attributes.new(name='SculptTint',type='FLOAT_COLOR',domain='POINT');obj.data.color_attributes.active_color=colors
        for v in obj.data.vertices:
            p=obj.matrix_world@v.co;variation=1+(noise.noise(p*4)*.018 if fabric else noise.noise(p*5)*.12+noise.noise(p*18)*.035)
            colors.data[v.index].color=(*(base*variation),1)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.018);bpy.ops.object.mode_set(mode='OBJECT')
    if len(obj.data.polygons)>2000:
        mod=obj.modifiers.new('Mobile surface reduction — nondestructive','DECIMATE');mod.ratio=.20 if obj.parent==chair else (.28 if obj.parent==feet else .48);mod.use_collapse_triangulate=True

refreport=[]
for role,name in [('render','toy5-crow-reference.png'),('three-view','toy5-crow-three-view.png'),('card-original','toy5-crow-card-original.png')]:
    p=ROOT/'assets/source/references'/name;img=bpy.data.images.load(str(p),check_existing=True);img.pack();img.use_fake_user=True
    refreport.append({'role':role,'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'pixels':list(img.size)})
notes=bpy.data.texts.new('READ ME — Toy 05');notes.write('我没招了鸦\nReference-led editable reconstruction. English name and story remain pending.\nFront is -Y. Groups separate chair, continuous bird, eyelids/beak, overlapping towels and toes.\nOriginal reference and card artwork are packed unchanged. Exportable PBR cotton and upholstery maps are packed and kept on disk.\nThis is a local draft, not inserted into the live catalogue.\n')
studio((0,0,1.9),(4,-9,4),4.65)
scene=bpy.context.scene;scene.cycles.samples=int(os.environ.get('BC_MODEL_SAMPLES','32'));scene.render.resolution_x=1200;scene.render.resolution_y=1200
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.1
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.8,.85,.9,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.42
for obj in scene.objects:
    if obj.type=='LIGHT':obj.data.energy*=.8;obj.data.color=(1,.96,.89) if obj.name=='Key' else (.9,.94,1)
print('TOY05: sculpt and PBR maps ready, saving editable master',flush=True)
export('toy_tired_crow',root,False)
# Export a material-batched delivery copy. Source parts remain individually editable.
staging=empty('toy_tired_crow_delivery');groups={};dg=bpy.context.evaluated_depsgraph_get()
for source in root.children_recursive:
    if source.type not in {'MESH','CURVE'}:continue
    data=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg);data.transform(source.matrix_world)
    obj=bpy.data.objects.new(source.name+' [delivery]',data);bpy.context.collection.objects.link(obj);obj.parent=staging
    groups.setdefault(tuple(m.name for m in data.materials),[]).append(obj)
for materials,objects in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    if len(objects)>1:bpy.ops.object.join()
    objects[0].name='Material batch | '+materials[0]
bpy.ops.object.select_all(action='DESELECT')
for obj in [staging]+list(staging.children_recursive):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(DRAFT/'toy_tired_crow.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in staging.children_recursive if o.type=='MESH')
for obj in list(staging.children_recursive)+[staging]:bpy.data.objects.remove(obj,do_unlink=True)
report={'status':'approval-candidate-do-not-publish','revision':'02','name_zh':'我没招了鸦','name_en':None,'tagline':None,'story_media':None,'references':refreport,'source_blend':'blender/toy_tired_crow.blend','source_glb':'assets/source/models/toy_tired_crow.glb','candidate_glb':'assets/drafts/toy05/toy_tired_crow.glb','texture_directory':'assets/source/textures/toy05','material_batches':len(groups),'delivery_triangles':triangles,'delivery_bytes':(DRAFT/'toy_tired_crow.glb').stat().st_size}
(DRAFT/'model-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
floor_mat=material('Pearl studio floor','#E8EBEE',.65,.02);box('Studio floor — excluded from model export',(0,0,.045),(200,200,.045),floor_mat,0)
scene.render.film_transparent=False;target=Vector((0,0,1.93))
def render_view(name,pos,scale=4.55):
    scene.camera.location=pos;scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=scale;scene.render.filepath=str(RENDERS/(name+'.png'));bpy.ops.render.render(write_still=True)
render_view('toy05-three-quarter',(-4,-10,4.0))
if os.environ.get('BC_MODEL_QUICK')!='1':
    render_view('toy05-front',(0,-10,2.6));render_view('toy05-side',(-10,0,2.6));render_view('toy05-back',(0,10,2.6))
scene.camera.location=(-4,-10,4.0);scene.camera.rotation_euler=(target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_location=target;space.region_3d.view_distance=6.5;space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion();space.region_3d.view_perspective='ORTHO';space.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/toy_tired_crow.blend'))
print('TOY05 DRAFT COMPLETE',json.dumps(report,ensure_ascii=False),flush=True)
