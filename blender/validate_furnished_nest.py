"""Read-only mesh and light-path validation of the exported room's source scene."""
from pathlib import Path
from collections import Counter
import bpy, json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/furnished_nest.blend'))
roof=bpy.data.objects['Planar mitered rose roof']
normals=[Vector((3.05,0,-1.25)).normalized(),Vector((0,-3.05,-1.25)).normalized()]
large=[p for p in roof.data.polygons if p.area>2]
assert len(large)>=2
assert all(max(abs(p.normal.dot(n)) for n in normals)>.9999 for p in large),'Roof plane is warped'
edges=Counter(edge for p in roof.data.polygons for edge in p.edge_keys)
assert all(count==2 for count in edges.values()),'Roof has an unjoined/open seam'
pan_heights=[]
def bounds(o):
    points=[o.matrix_world@Vector(c) for c in o.bound_box]
    return ([min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)])
for i in range(2):
    lo,hi=bounds(bpy.data.objects['Hollow lavender pan '+str(i)]);a,b=bounds(bpy.data.objects['Upper pan handle '+str(i)])
    ratio=((a[2]+b[2])/2-lo[2])/(hi[2]-lo[2]);assert ratio>.65;pan_heights.append(ratio)
dg=bpy.context.evaluated_depsgraph_get();direction=Vector((1.1,.2,0))-Vector((2.48,10.83,17));direction.normalize()
def first_hit(target):
    origin=Vector(target)-direction*40
    for _ in range(12):
        result=bpy.context.scene.ray_cast(dg,origin,direction)
        if not result[0]:return None
        if not result[4].get('noShadow'):return result[4].name
        origin=result[1]+direction*.001
    raise AssertionError('Too many non-shadow intersections')
lit=first_hit((1.1,.2,0));shade=first_hit((3.1,.2,0))
assert lit and (lit.startswith('Honey floor plank') or lit=='Oval ivory rug'),('Sun does not reach floor through window',lit)
assert shade=='Planar mitered rose roof',('Window light has no roof shadow boundary',shade)
assert 'Yellow tilted pillow' not in bpy.data.objects
assert not any(o.name.startswith(('Stair baluster','Stair sloping handrail')) for o in bpy.data.objects)
assert 'Landing handrail' in bpy.data.objects
assert bpy.data.objects['Warm tapered lamp shade']['hollow_shade']
assert not bpy.data.objects['Luminous arched window pane'].visible_shadow
report={'planarRoofFaces':len(large),'closedRoofSeam':True,'panHandleHeightFractions':pan_heights,'windowLitRayHit':lit,'adjacentShadowRayHit':shade,'browserQA':False}
(ROOT/'assets/drafts/nest-02/geometry-light-check.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
