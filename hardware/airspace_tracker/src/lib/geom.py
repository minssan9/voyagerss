from cadgen import build123d as bd


def box(x0, x1, y0, y1, z0, z1):
    return bd.Pos((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2) * bd.Box(x1 - x0, y1 - y0, z1 - z0)


def cyl_z(x, y, z0, z1, d):
    return bd.Pos(x, y, (z0 + z1) / 2) * bd.Cylinder(d / 2, z1 - z0)


def cyl_x(y, z, x0, x1, d):
    return bd.Pos((x0 + x1) / 2, y, z) * bd.Rot(0, 90, 0) * bd.Cylinder(d / 2, x1 - x0)


def cyl_y(x, z, y0, y1, d):
    return bd.Pos(x, (y0 + y1) / 2, z) * bd.Rot(90, 0, 0) * bd.Cylinder(d / 2, y1 - y0)


def hex_z(x, y, z0, z1, across_flats):
    prism = bd.extrude(bd.RegularPolygon(across_flats / 2, 6, major_radius=False), amount=z1 - z0)
    return bd.Pos(x, y, z0) * prism


def union(shapes):
    result = shapes[0]
    for s in shapes[1:]:
        result = result + s
    return result
