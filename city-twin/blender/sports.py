"""Procedural campus sports geometry, in metres, without Blender API calls.

Campus plan coordinates (x, z) become Blender coordinates (x, -z, z_up).
The caller supplies the materials and the only scene-writing callback:
``add_obj(name, verts, faces, material)``.
"""

from math import asin, ceil, cos, pi, sin, sqrt


# Track levels: surface / field / painted lines.
TRACK_Z = 0.10
FIELD_Z = 0.12
LINE_Z = 0.14
COURT_Z = 0.10
COURT_LINE_Z = 0.14
SEGMENTS = 160
TAU = 2.0 * pi


class _Batch:
    """Collect disconnected parts into one mesh per category/material."""

    def __init__(self):
        self.verts = []
        self.faces = []

    def face(self, points):
        start = len(self.verts)
        self.verts.extend(points)
        self.faces.append(tuple(range(start, start + len(points))))

    def indexed(self, verts, faces):
        start = len(self.verts)
        self.verts.extend(verts)
        self.faces.extend(tuple(start + i for i in face) for face in faces)


def _center(center):
    x, z = center
    return float(x), -float(z)


def _point(center, x, y, z):
    cx, cy = _center(center)
    return (cx + x, cy + y, z)


def _normal(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = sqrt(dx * dx + dy * dy)
    if length < 1e-9:
        raise ValueError("A sports marking segment must have non-zero length")
    return -dy / length, dx / length


def _quad(batch, corners, center, z):
    """A counter-clockwise horizontal quad, as seen from above."""
    batch.face([_point(center, x, y, z) for x, y in corners])


def _rectangle(batch, center, x0, y0, x1, y1, z):
    _quad(batch, ((x0, y0), (x1, y0), (x1, y1), (x0, y1)), center, z)


def _strip(batch, center, a, b, width, z):
    nx, ny = _normal(a, b)
    hx, hy = nx * width * 0.5, ny * width * 0.5
    _quad(batch, (
        (a[0] - hx, a[1] - hy), (b[0] - hx, b[1] - hy),
        (b[0] + hx, b[1] + hy), (a[0] + hx, a[1] + hy),
    ), center, z)


def _polyline(batch, center, points, width, z, closed=False):
    for a, b in zip(points, points[1:]):
        _strip(batch, center, a, b, width, z)
    if closed:
        _strip(batch, center, points[-1], points[0], width, z)


def _ellipse_point(rx, ry, angle):
    return rx * cos(angle), ry * sin(angle)


def _ellipse_band(batch, center, outer_rx, outer_ry, inner_rx, inner_ry,
                  z, segments=SEGMENTS):
    """Separate ring quads avoid degenerate pole fans and need no operators."""
    for i in range(segments):
        a = TAU * i / segments
        b = TAU * (i + 1) / segments
        outer_a = _ellipse_point(outer_rx, outer_ry, a)
        outer_b = _ellipse_point(outer_rx, outer_ry, b)
        inner_a = _ellipse_point(inner_rx, inner_ry, a)
        inner_b = _ellipse_point(inner_rx, inner_ry, b)
        _quad(batch, (outer_a, outer_b, inner_b, inner_a), center, z)


def _ellipse_disk(batch, center, rx, ry, z, segments=SEGMENTS):
    cx, cy = _center(center)
    vertices = [(cx, cy, z)]
    vertices.extend(_point(center, rx * cos(TAU * i / segments),
                           ry * sin(TAU * i / segments), z)
                    for i in range(segments))
    faces = [(0, i + 1, (i + 1) % segments + 1)
             for i in range(segments)]
    batch.indexed(vertices, faces)


def _ellipse_line(batch, center, rx, ry, width, z, segments=SEGMENTS,
                  start=0.0, end=TAU):
    """A constant-width ribbon following an ellipse or ellipse arc."""
    closed = abs(end - start - TAU) < 1e-9
    count = segments if closed else max(2, segments)
    for i in range(count):
        a = start + (end - start) * i / segments
        b = start + (end - start) * (i + 1) / segments
        _strip(batch, center, _ellipse_point(rx, ry, a),
               _ellipse_point(rx, ry, b), width, z)


def _circle(batch, center, x, y, radius, z, segments=64):
    points = [_ellipse_point(radius, radius, TAU * i / segments)
              for i in range(segments)]
    batch.face([_point(center, x + px, y + py, z) for px, py in points])


def _circle_line(batch, center, x, y, radius, width, z, segments=64,
                 start=0.0, end=TAU):
    arc_center = (center[0] + x, center[1] - y)
    _ellipse_line(batch, arc_center, radius, radius, width, z, segments,
                  start, end)


def _box(batch, center, xyz, dimensions):
    """An axis-aligned closed bar/slab; useful for frames and equipment."""
    x, y, z = xyz
    hx, hy, hz = (d * 0.5 for d in dimensions)
    if min(hx, hy, hz) <= 0.0:
        raise ValueError("Box dimensions must be positive")
    vertices = [
        _point(center, x - hx, y - hy, z - hz),
        _point(center, x + hx, y - hy, z - hz),
        _point(center, x + hx, y + hy, z - hz),
        _point(center, x - hx, y + hy, z - hz),
        _point(center, x - hx, y - hy, z + hz),
        _point(center, x + hx, y - hy, z + hz),
        _point(center, x + hx, y + hy, z + hz),
        _point(center, x - hx, y + hy, z + hz),
    ]
    batch.indexed(vertices, (
        (3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5),
        (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7),
    ))


def _beam(batch, center, a, b, thickness, depth=None):
    """A straight square/rectangular bar between arbitrary 3D endpoints."""
    dx, dy, dz = (b[i] - a[i] for i in range(3))
    length = sqrt(dx * dx + dy * dy + dz * dz)
    if length < 1e-9:
        raise ValueError("A sports equipment bar must have non-zero length")
    ux, uy, uz = dx / length, dy / length, dz / length
    # Choose a stable transverse axis, including for vertical posts.
    if abs(uz) < 0.999:
        vx, vy, vz = -uy, ux, 0.0
    else:
        vx, vy, vz = 1.0, 0.0, 0.0
    vlen = sqrt(vx * vx + vy * vy + vz * vz)
    vx, vy, vz = vx / vlen, vy / vlen, vz / vlen
    wx = uy * vz - uz * vy
    wy = uz * vx - ux * vz
    wz = ux * vy - uy * vx
    hv = thickness * 0.5
    hw = (depth if depth is not None else thickness) * 0.5
    vertices = []
    for px, py, pz in (a, b):
        for sv, sw in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            vertices.append(_point(
                center, px + sv * hv * vx + sw * hw * wx,
                py + sv * hv * vy + sw * hw * wy,
                pz + sv * hv * vz + sw * hw * wz,
            ))
    batch.indexed(vertices, (
        (3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5),
        (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7),
    ))


def _hoop(batch, center, x, y, z, radius=0.225, tube=0.018,
          segments=24):
    for i in range(segments):
        a = TAU * i / segments
        b = TAU * (i + 1) / segments
        _beam(batch, center,
              (x + radius * cos(a), y + radius * sin(a), z),
              (x + radius * cos(b), y + radius * sin(b), z), tube)


def _football_goal(metal, net, center, side):
    """7.32 x 2.44 m goal, facing the centre line at local x=0."""
    mouth_x = side * 24.0
    back_x = side * 25.8
    half_width = 3.66
    height = 2.44
    frame = 0.10
    for y in (-half_width, half_width):
        _beam(metal, center, (mouth_x, y, FIELD_Z),
              (mouth_x, y, FIELD_Z + height), frame)
        _beam(metal, center, (mouth_x, y, FIELD_Z + height),
              (back_x, y, FIELD_Z + height - 0.3), 0.065)
        _beam(metal, center, (mouth_x, y, FIELD_Z),
              (back_x, y, FIELD_Z), 0.065)
        _beam(metal, center, (back_x, y, FIELD_Z),
              (back_x, y, FIELD_Z + height - 0.3), 0.065)
    _beam(metal, center, (mouth_x, -half_width, FIELD_Z + height),
          (mouth_x, half_width, FIELD_Z + height), frame)
    _beam(metal, center, (back_x, -half_width, FIELD_Z + height - 0.3),
          (back_x, half_width, FIELD_Z + height - 0.3), 0.065)

    # Open lattice rather than a solid white plane: back, roof and both sides.
    for i in range(17):
        y = -half_width + 2.0 * half_width * i / 16.0
        _beam(net, center, (back_x, y, FIELD_Z + 0.025),
              (back_x, y, FIELD_Z + height - 0.3), 0.014)
        _beam(net, center, (mouth_x, y, FIELD_Z + height - 0.035),
              (back_x, y, FIELD_Z + height - 0.3), 0.014)
    for i in range(1, 9):
        t = i / 9.0
        z = FIELD_Z + (height - 0.3) * t
        _beam(net, center, (back_x, -half_width, z),
              (back_x, half_width, z), 0.014)
        x = mouth_x + (back_x - mouth_x) * t
        roof_z = FIELD_Z + height - 0.3 * t
        _beam(net, center, (x, -half_width, roof_z),
              (x, half_width, roof_z), 0.014)
    for y in (-half_width, half_width):
        for i in range(1, 6):
            t = i / 6.0
            x = mouth_x + (back_x - mouth_x) * t
            _beam(net, center, (x, y, FIELD_Z + 0.02),
                  (x, y, FIELD_Z + height - 0.3 * t), 0.014)
        for i in range(1, 8):
            t = i / 8.0
            _beam(net, center, (mouth_x, y, FIELD_Z + height * t),
                  (back_x, y, FIELD_Z + (height - 0.3) * t), 0.014)


def _build_track(track, field, line, metal, net):
    center = (-88.0, -222.0)
    rx, rz = 54.0, 99.0
    lane_width = 1.15
    # The six 1.15 m lanes fit inside the specified outer ellipse.
    for lane in range(6):
        outer = lane_width * (6 - lane)
        inner = outer - lane_width
        _ellipse_band(track, center, rx - inner, rz - inner,
                      rx - outer, rz - outer, TRACK_Z)
    inner_rx = rx - 6.0 * lane_width
    inner_rz = rz - 6.0 * lane_width
    _ellipse_disk(field, center, inner_rx, inner_rz, FIELD_Z)
    # Seven boundaries delineate all six lanes, including both outer edges.
    for boundary in range(7):
        inset = boundary * lane_width
        _ellipse_line(line, center, rx - inset, rz - inset, 0.075, LINE_Z)

    # Football markings remain inside the 47.1 x 92.1 m inner ellipse.
    _rectangle(line, center, -24.0, -36.0, 24.0, -35.88, LINE_Z)
    _rectangle(line, center, -24.0, 35.88, 24.0, 36.0, LINE_Z)
    for x in (-24.0, 24.0):
        _strip(line, center, (x, -36.0), (x, 36.0), 0.12, LINE_Z)
    _strip(line, center, (-24.0, 0.0), (24.0, 0.0), 0.12, LINE_Z)
    _circle_line(line, center, 0.0, 0.0, 9.15, 0.12, LINE_Z, 96)
    _circle(line, center, 0.0, 0.0, 0.16, LINE_Z)
    for side in (-1, 1):
        # Penalty and goal areas, plus the central penalty mark.
        for depth, half_y in ((16.5, 20.16), (5.5, 9.16)):
            x = side * 24.0
            inner_x = side * (24.0 - depth)
            _polyline(line, center, ((x, -half_y), (inner_x, -half_y),
                      (inner_x, half_y), (x, half_y)), 0.12, LINE_Z)
        _circle(line, center, side * 13.0, 0.0, 0.13, LINE_Z)
        _football_goal(metal, net, center, side)


def _basketball_arc(line, center, hoop_x, radius, width, side):
    """The circular part of a three-point line, clipped at the sidelines."""
    baseline_x = side * 14.0
    corner_y = 6.6  # Approximately 0.9 m in from each 15 m-wide sideline.
    if corner_y >= radius:
        raise ValueError("Invalid basketball three-point geometry")
    dx = sqrt(radius * radius - corner_y * corner_y)
    arc_end_x = hoop_x - side * dx
    angle = asin(corner_y / radius)
    # Right-hand baskets bulge towards -X; left-hand baskets towards +X.
    if side > 0:
        start, end = pi - angle, pi + angle
    else:
        start, end = -angle, angle
    for sign in (-1, 1):
        _strip(line, center, (baseline_x, sign * corner_y),
               (arc_end_x, sign * corner_y), width, COURT_LINE_Z)
    arc_center = (center[0] + hoop_x, center[1])
    segments = max(12, int(ceil(48.0 * abs(end - start) / pi)))
    _ellipse_line(line, arc_center, radius, radius, width, COURT_LINE_Z,
                  segments, start, end)


def _basketball_hoop(metal, line, center, side):
    ground = COURT_Z
    board_x = side * 12.725
    post_x = side * 14.65
    rim_x = side * 12.0
    rim_z = 3.05
    _box(metal, center, (post_x, 0.0, ground + 0.075), (0.65, 0.65, 0.15))
    _beam(metal, center, (post_x, 0.0, ground),
          (post_x, 0.0, 3.60), 0.16)
    _beam(metal, center, (post_x, 0.0, 3.42),
          (board_x, 0.0, 3.42), 0.12)
    _beam(metal, center, (post_x, 0.0, 2.55),
          (board_x, 0.0, 3.15), 0.085)
    _box(metal, center, (board_x, 0.0, 3.45), (0.065, 1.80, 1.05))
    # Painted target on the court-facing surface of the backboard.
    face_x = board_x - side * 0.037
    for y in (-0.295, 0.295):
        _beam(line, center, (face_x, y, 3.05), (face_x, y, 3.50), 0.035)
    for z in (3.05, 3.50):
        _beam(line, center, (face_x, -0.295, z),
              (face_x, 0.295, z), 0.035)
    _beam(metal, center, (board_x - side * 0.04, 0.0, rim_z),
          (rim_x + side * 0.225, 0.0, rim_z), 0.045)
    _hoop(metal, center, rim_x, 0.0, rim_z)


def _build_basketball(court, line, metal):
    centers = ((12.0, -288.0), (-18.0, -288.0),
               (12.0, -314.0), (-18.0, -314.0))
    # Local coordinates: 28 m along X, 15 m along Y; centres leave 2 m gaps.
    for center in centers:
        _rectangle(court, center, -14.0, -7.5, 14.0, 7.5, COURT_Z)
        # Boundary, halfway line and centre circle.
        _polyline(line, center, ((-14.0, -7.5), (14.0, -7.5),
                  (14.0, 7.5), (-14.0, 7.5)), 0.10,
                  COURT_LINE_Z, closed=True)
        _strip(line, center, (0.0, -7.5), (0.0, 7.5), 0.10,
               COURT_LINE_Z)
        _circle_line(line, center, 0.0, 0.0, 1.80, 0.10,
                     COURT_LINE_Z, 64)
        for side in (-1, 1):
            # 5.8 m deep x 4.9 m wide key and free-throw line/circle.
            key_x = side * 8.2
            _polyline(line, center, ((side * 14.0, -2.45),
                      (side * 14.0, 2.45), (key_x, 2.45),
                      (key_x, -2.45), (side * 14.0, -2.45)),
                      0.10, COURT_LINE_Z)
            _circle_line(line, center, key_x, 0.0, 1.80, 0.10,
                         COURT_LINE_Z, 64)
            _basketball_arc(line, center, side * 12.0, 6.75, 0.10, side)
            _basketball_hoop(metal, line, center, side)


def _tennis_net(line, metal, center):
    half_length = 5.50  # Doubles posts; the marked playing court is 11 x 24 m.
    top = COURT_Z + 1.07
    bottom = COURT_Z + 0.12
    for y in (-5.92, 5.92):
        _beam(metal, center, (0.0, y, COURT_Z),
              (0.0, y, COURT_Z + 1.14), 0.085)
    # Net grid is real open geometry, not a texture or an opaque quad.
    for i in range(49):
        y = -half_length + 2.0 * half_length * i / 48.0
        _beam(line, center, (0.0, y, bottom), (0.0, y, top), 0.014)
    for i in range(6):
        z = bottom + (top - bottom) * i / 5.0
        _beam(line, center, (0.0, -5.92, z),
              (0.0, 5.92, z), 0.014)
    _beam(line, center, (0.0, -5.92, top),
          (0.0, 5.92, top), 0.055)


def _build_tennis(court_alt, line, metal):
    # Like the basketball courts, the long side is X; the 22 m centre pitch
    # would otherwise overlap 24 m-long courts placed along Blender Y.
    for center in ((58.0, -258.0), (58.0, -280.0)):
        _rectangle(court_alt, center, -12.0, -5.5, 12.0, 5.5, COURT_Z)
        _polyline(line, center, ((-12.0, -5.5), (12.0, -5.5),
                  (12.0, 5.5), (-12.0, 5.5)), 0.08,
                  COURT_LINE_Z, closed=True)
        # Singles sidelines and service lines, all within the exact footprint.
        for y in (-4.115, 4.115):
            _strip(line, center, (-12.0, y), (12.0, y), 0.06,
                   COURT_LINE_Z)
        for x in (-6.40, 6.40):
            _strip(line, center, (x, -5.5), (x, 5.5), 0.06,
                   COURT_LINE_Z)
        _strip(line, center, (-6.40, 0.0), (6.40, 0.0), 0.06,
               COURT_LINE_Z)
        for x in (-12.0, 12.0):
            _strip(line, center, (x, 0.0), (x * 0.975, 0.0), 0.06,
                   COURT_LINE_Z)
        _tennis_net(line, metal, center)


def build_sports(add_obj, materials):
    """Build all sports surfaces and equipment through ``add_obj`` only.

    ``materials`` may contain track, field, line, court, court_alt, metal,
    and seat. Optional keys fall back to a related supplied material.
    No files, Blender operators, scene state, or rendering APIs are used.
    """
    track = materials["track"]
    field = materials.get("field", materials["court"])
    line = materials["line"]
    court = materials["court"]
    court_alt = materials.get("court_alt", court)
    metal = materials.get("metal", court_alt)
    # ``seat`` is accepted by the contract but no seating was requested.

    track_mesh, field_mesh = _Batch(), _Batch()
    track_lines, court_lines = _Batch(), _Batch()
    court_mesh, court_alt_mesh = _Batch(), _Batch()
    metal_mesh, net_mesh = _Batch(), _Batch()

    _build_track(track_mesh, field_mesh, track_lines, metal_mesh, net_mesh)
    _build_basketball(court_mesh, court_lines, metal_mesh)
    _build_tennis(court_alt_mesh, court_lines, metal_mesh)

    objects = (
        ("SPORTS_track_6_lanes", track_mesh, track),
        ("SPORTS_track_infield", field_mesh, field),
        ("SPORTS_track_markings", track_lines, line),
        ("SPORTS_courts", court_mesh, court),
        ("SPORTS_tennis_courts", court_alt_mesh, court_alt),
        ("SPORTS_court_markings_nets", court_lines, line),
        ("SPORTS_metal_frames", metal_mesh, metal),
        ("SPORTS_football_goal_nets", net_mesh, line),
    )
    count = 0
    for name, batch, material in objects:
        if not batch.faces:
            continue
        add_obj(name, batch.verts, batch.faces, material)
        count += 1
    print("build_sports: generated {} objects".format(count))
    return count
