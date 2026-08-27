# animation_opengl.py
import numpy as np
from OpenGL.GL import *
from OpenGL.GLU import *
import glfw
import math


class SignAnimatorOpenGL:
    def __init__(self, width=900, height=700):
        self.width = width
        self.height = height

        self.prev_pose = None
        self.prev_left = None
        self.prev_right = None
        self.smooth_factor = 0.75

        if not glfw.init():
            raise Exception("GLFW init failed")

        self.window = glfw.create_window(
            self.width, self.height, "Full Body Sign Avatar (IK)", None, None
        )
        glfw.make_context_current(self.window)

        glViewport(0, 0, self.width, self.height)
        glMatrixMode(GL_PROJECTION)
        glLoadIdentity()
        gluOrtho2D(0, self.width, self.height, 0)
        glMatrixMode(GL_MODELVIEW)
        glLoadIdentity()

        glClearColor(0.05, 0.05, 0.08, 1)

    # ================= SMOOTHING =================
    def smooth(self, prev, curr):
        if prev is None:
            return curr
        return [
            (
                prev[i][0] * self.smooth_factor + curr[i][0] * (1 - self.smooth_factor),
                prev[i][1] * self.smooth_factor + curr[i][1] * (1 - self.smooth_factor),
            )
            for i in range(len(curr))
        ]

    # ================= BASIC DRAW =================
    def scale(self, p):
        return (p[0] * self.width, p[1] * self.height)

    def circle(self, c, r, col):
        glColor3f(*col)
        glBegin(GL_TRIANGLE_FAN)
        glVertex2f(*c)
        for a in range(0, 361, 10):
            rad = np.radians(a)
            glVertex2f(c[0] + np.cos(rad) * r, c[1] + np.sin(rad) * r)
        glEnd()

    def bone(self, p1, p2, w, col):
        glLineWidth(w)
        glColor3f(*col)
        glBegin(GL_LINES)
        glVertex2f(*p1)
        glVertex2f(*p2)
        glEnd()
        self.circle(p1, w * 1.1, col)
        self.circle(p2, w * 1.1, col)

    # ================= IK SOLVER =================
    def solve_ik(self, shoulder, wrist, upper_len, lower_len, bend_dir=1):
        dx = wrist[0] - shoulder[0]
        dy = wrist[1] - shoulder[1]
        dist = math.hypot(dx, dy)
        dist = max(min(dist, upper_len + lower_len - 1), abs(upper_len - lower_len) + 1)

        a = math.acos(
            (upper_len**2 + dist**2 - lower_len**2) / (2 * upper_len * dist)
        )
        base = math.atan2(dy, dx)
        angle = base + bend_dir * a

        elbow = (
            shoulder[0] + math.cos(angle) * upper_len,
            shoulder[1] + math.sin(angle) * upper_len,
        )
        return elbow

    # ================= BODY =================
    def draw_body(self, pose):
        skin = (0.92, 0.75, 0.65)
        shirt = (0.25, 0.55, 0.85)
        pants = (0.15, 0.15, 0.45)

        p = lambda i: self.scale(pose[i])

        nose = p(0)
        l_sh, r_sh = p(11), p(12)
        l_hp, r_hp = p(23), p(24)
        l_wr, r_wr = p(15), p(16)

        # Neck
        neck = ((l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2 - 22)
        self.bone(neck, nose, 5, skin)
        self.bone(neck, l_sh, 6, skin)
        self.bone(neck, r_sh, 6, skin)

        # Torso
        glColor3f(*shirt)
        glBegin(GL_POLYGON)
        glVertex2f(l_sh[0] - 10, l_sh[1] + 5)
        glVertex2f(r_sh[0] + 10, r_sh[1] + 5)
        glVertex2f(r_hp[0] - 15, r_hp[1])
        glVertex2f(l_hp[0] + 15, l_hp[1])
        glEnd()

        self.circle(l_sh, 14, skin)
        self.circle(r_sh, 14, skin)

        # ---- IK ARMS ----
        upper = 70
        lower = 60

        l_el = self.solve_ik(l_sh, l_wr, upper, lower, bend_dir=1)
        r_el = self.solve_ik(r_sh, r_wr, upper, lower, bend_dir=-1)

        self.bone(l_sh, l_el, 9, skin)
        self.bone(l_el, l_wr, 7, skin)

        self.bone(r_sh, r_el, 9, skin)
        self.bone(r_el, r_wr, 7, skin)

        # Legs (static)
        self.bone(l_hp, p(25), 10, pants)
        self.bone(p(25), p(27), 8, pants)
        self.bone(r_hp, p(26), 10, pants)
        self.bone(p(26), p(28), 8, pants)

    # ================= HEAD =================
    def draw_head(self, pose):
        skin = (0.92, 0.75, 0.65)
        x, y = self.scale(pose[0])
        self.circle((x, y), 40, skin)
        self.circle((x - 12, y - 6), 4, (0, 0, 0))
        self.circle((x + 12, y - 6), 4, (0, 0, 0))

    # ================= HAND =================
    def draw_hand(self, hand):
        if len(hand) < 21:
            return
        skin = (0.9, 0.7, 0.6)
        fingers = [
            [0, 1, 2, 3, 4],
            [0, 5, 6, 7, 8],
            [0, 9, 10, 11, 12],
            [0, 13, 14, 15, 16],
            [0, 17, 18, 19, 20],
        ]
        for f in fingers:
            for i in range(len(f) - 1):
                self.bone(
                    self.scale(hand[f[i]]),
                    self.scale(hand[f[i + 1]]),
                    4,
                    skin,
                )

    # ================= FRAME =================
    def draw_frame(self, data):
        idx = 2
        pose, left, right = [], [], []

        try:
            for _ in range(33):
                pose.append((float(data[idx]), float(data[idx + 1])))
                idx += 4
            for _ in range(21):
                left.append((float(data[idx]), float(data[idx + 1])))
                idx += 3
            for _ in range(21):
                right.append((float(data[idx]), float(data[idx + 1])))
                idx += 3
        except:
            return

        pose = self.smooth(self.prev_pose, pose)
        left = self.smooth(self.prev_left, left)
        right = self.smooth(self.prev_right, right)

        self.prev_pose, self.prev_left, self.prev_right = pose, left, right

        glClear(GL_COLOR_BUFFER_BIT)
        self.draw_body(pose)
        self.draw_head(pose)
        self.draw_hand(left)
        self.draw_hand(right)

        glfw.swap_buffers(self.window)
        glfw.poll_events()

    def should_close(self):
        return glfw.window_should_close(self.window)

    def terminate(self):
        glfw.terminate()
