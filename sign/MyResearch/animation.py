# animation_opengl.py
import numpy as np
from OpenGL.GL import *
from OpenGL.GLU import *
import glfw


class SignAnimatorOpenGL:
    def __init__(self, width=900, height=700):
        self.width = width
        self.height = height

        # smoothing
        self.prev_pose = None
        self.prev_left = None
        self.prev_right = None
        self.smooth_factor = 0.75

        if not glfw.init():
            raise Exception("GLFW init failed")

        self.window = glfw.create_window(
            self.width, self.height, "Full Body Sign Avatar", None, None
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

    # ================= HELPERS =================
    def scale(self, p):
        return (p[0] * self.width, p[1] * self.height)

    def draw_circle(self, c, r, col):
        glColor3f(*col)
        glBegin(GL_TRIANGLE_FAN)
        glVertex2f(*c)
        for a in range(0, 361, 10):
            rad = np.radians(a)
            glVertex2f(c[0] + np.cos(rad) * r, c[1] + np.sin(rad) * r)
        glEnd()

    def draw_bone(self, p1, p2, thickness, col):
        glLineWidth(thickness)
        glColor3f(*col)
        glBegin(GL_LINES)
        glVertex2f(*p1)
        glVertex2f(*p2)
        glEnd()

        self.draw_circle(p1, thickness * 1.2, col)
        self.draw_circle(p2, thickness * 1.2, col)

    # ================= BODY =================
    def draw_body(self, pose):
        skin = (0.92, 0.75, 0.65)
        shirt = (0.2, 0.55, 0.85)
        pants = (0.15, 0.15, 0.45)

        p = lambda i: self.scale(pose[i])

        # shoulders & hips
        l_sh, r_sh = p(11), p(12)
        l_hp, r_hp = p(23), p(24)

        # torso (polygon)
        glColor3f(*shirt)
        glBegin(GL_POLYGON)
        glVertex2f(l_sh[0], l_sh[1])
        glVertex2f(r_sh[0], r_sh[1])
        glVertex2f(r_hp[0], r_hp[1])
        glVertex2f(l_hp[0], l_hp[1])
        glEnd()

        # neck
        neck = ((l_sh[0] + r_sh[0]) / 2, (l_sh[1] + r_sh[1]) / 2 - 25)
        self.draw_bone(neck, p(0), 6, skin)

        # arms
        self.draw_bone(l_sh, p(13), 8, skin)
        self.draw_bone(p(13), p(15), 6, skin)
        self.draw_bone(r_sh, p(14), 8, skin)
        self.draw_bone(p(14), p(16), 6, skin)

        # legs
        self.draw_bone(l_hp, p(25), 9, pants)
        self.draw_bone(p(25), p(27), 7, pants)
        self.draw_bone(r_hp, p(26), 9, pants)
        self.draw_bone(p(26), p(28), 7, pants)

    # ================= HEAD =================
    def draw_head(self, pose):
        skin = (0.92, 0.75, 0.65)
        x, y = self.scale(pose[0])

        self.draw_circle((x, y), 40, skin)
        self.draw_circle((x - 12, y - 5), 4, (0, 0, 0))
        self.draw_circle((x + 12, y - 5), 4, (0, 0, 0))

        glColor3f(0, 0, 0)
        glBegin(GL_LINE_STRIP)
        for a in range(0, 181, 12):
            rad = np.radians(a)
            glVertex2f(x + np.cos(rad) * 14, y + np.sin(rad) * 6 + 15)
        glEnd()

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
                p1 = self.scale(hand[f[i]])
                p2 = self.scale(hand[f[i + 1]])
                self.draw_bone(p1, p2, 4, skin)

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
