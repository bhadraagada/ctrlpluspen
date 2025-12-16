import logging
import os

import drawing
import numpy as np
import svgwrite
from rnn import rnn


class Hand(object):

    def __init__(self):
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
        self.nn = rnn(
            log_dir='logs',
            checkpoint_dir='checkpoints',
            prediction_dir='predictions',
            learning_rates=[.0001, .00005, .00002],
            batch_sizes=[32, 64, 64],
            patiences=[1500, 1000, 500],
            beta1_decays=[.9, .9, .9],
            validation_batch_size=32,
            optimizer='rms',
            num_training_steps=100000,
            warm_start_init_step=17900,
            regularization_constant=0.0,
            keep_prob=1.0,
            enable_parameter_averaging=False,
            min_steps_to_checkpoint=2000,
            log_interval=20,
            logging_level=logging.CRITICAL,
            grad_clip=10,
            lstm_size=400,
            output_mixture_components=20,
            attention_mixture_components=10
        )
        self.nn.restore()

    def write(self, filename, lines, biases=None, styles=None, stroke_colors=None,
              stroke_widths=None, paper_style='college', ink_style='pen'):
        valid_char_set = set(drawing.alphabet)
        for line_num, line in enumerate(lines):
            if len(line) > 75:
                raise ValueError(
                    f"Line {line_num} has {len(line)} characters (max 75)")
            for char in line:
                if char not in valid_char_set:
                    raise ValueError(
                        f"Invalid character '{char}' in line {line_num}")

        strokes = self._sample(lines, biases=biases, styles=styles)
        self._draw(strokes, lines, filename, stroke_colors=stroke_colors,
                   stroke_widths=stroke_widths, paper_style=paper_style, ink_style=ink_style)

    def _sample(self, lines, biases=None, styles=None):
        num_samples = len(lines)
        max_tsteps = 40*max([len(i) for i in lines])
        biases = biases if biases is not None else [0.5]*num_samples

        x_prime = np.zeros([num_samples, 1200, 3])
        x_prime_len = np.zeros([num_samples])
        chars = np.zeros([num_samples, 120])
        chars_len = np.zeros([num_samples])

        if styles is not None:
            for i, (cs, style) in enumerate(zip(lines, styles)):
                x_p = np.load('styles/style-{}-strokes.npy'.format(style))
                c_p = np.load('styles/style-{}-chars.npy'.format(style)
                              ).tostring().decode('utf-8')
                c_p = str(c_p) + " " + cs
                c_p = drawing.encode_ascii(c_p)
                c_p = np.array(c_p)
                x_prime[i, :len(x_p), :] = x_p
                x_prime_len[i] = len(x_p)
                chars[i, :len(c_p)] = c_p
                chars_len[i] = len(c_p)
        else:
            for i in range(num_samples):
                encoded = drawing.encode_ascii(lines[i])
                chars[i, :len(encoded)] = encoded
                chars_len[i] = len(encoded)

        [samples] = self.nn.session.run(
            [self.nn.sampled_sequence],
            feed_dict={
                self.nn.prime: styles is not None,
                self.nn.x_prime: x_prime,
                self.nn.x_prime_len: x_prime_len,
                self.nn.num_samples: num_samples,
                self.nn.sample_tsteps: max_tsteps,
                self.nn.c: chars,
                self.nn.c_len: chars_len,
                self.nn.bias: biases
            }
        )
        samples = [sample[~np.all(sample == 0.0, axis=1)]
                   for sample in samples]
        return samples

    def _draw(self, strokes, lines, filename, stroke_colors=None, stroke_widths=None,
              paper_style='college', ink_style='pen'):

        # Paper style configurations
        paper_configs = {
            'college': {'line_height': 50, 'margin_left': 120},
            'wide': {'line_height': 60, 'margin_left': 120},
            'narrow': {'line_height': 40, 'margin_left': 120},
            'graph': {'line_height': 30, 'margin_left': 50}
        }

        config = paper_configs.get(paper_style, paper_configs['college'])
        line_height = config['line_height']
        margin_left = config['margin_left']
        margin_right = 80

        view_width = 850
        view_height = line_height * (len(strokes) + 3)

        dwg = svgwrite.Drawing(filename=filename)
        dwg.viewbox(width=view_width, height=view_height)

        # Paper background with cream color
        paper_colors = {
            'white': '#ffffff',
            'cream': '#fefcf3',
            'yellow': '#fffacd',
            'aged': '#f5f0e8'
        }
        paper = dwg.rect(insert=(0, 0), size=(view_width, view_height),
                         fill=paper_colors['cream'])
        dwg.add(paper)

        # Add subtle paper texture with noise pattern
        noise_pattern = dwg.defs.add(dwg.pattern(id='noise', patternUnits='userSpaceOnUse',
                                                 size=(100, 100)))
        for _ in range(80):
            x = np.random.uniform(0, 100)
            y = np.random.uniform(0, 100)
            noise_pattern.add(dwg.circle(
                center=(x, y), r=0.3, fill='#e8e4d8', opacity=0.4))

        texture_rect = dwg.rect(insert=(0, 0), size=(view_width, view_height),
                                fill='url(#noise)', opacity=0.15)
        dwg.add(texture_rect)

        # 3-hole punch circles
        hole_radius = 8
        hole_y_positions = [view_height * 0.15,
                            view_height * 0.5, view_height * 0.85]
        for y_pos in hole_y_positions:
            hole = dwg.circle(center=(25, y_pos), r=hole_radius,
                              fill='#ffffff', stroke='#d0d0d0', stroke_width=1.5)
            dwg.add(hole)
            # Add shadow inside hole
            inner_shadow = dwg.circle(center=(25, y_pos), r=hole_radius-2,
                                      fill='none', stroke='#b0b0b0', stroke_width=1, opacity=0.5)
            dwg.add(inner_shadow)

        # Draw lines based on paper style
        if paper_style == 'graph':
            # Graph paper - vertical and horizontal lines
            for i in range(0, view_height, line_height):
                opacity = 0.4 if i % (line_height * 5) == 0 else 0.25
                dwg.add(dwg.line(start=(0, i), end=(view_width, i),
                                 stroke='#c8d6e5', stroke_width=1, opacity=opacity))
            for i in range(0, view_width, line_height):
                opacity = 0.4 if i % (line_height * 5) == 0 else 0.25
                dwg.add(dwg.line(start=(i, 0), end=(i, view_height),
                                 stroke='#c8d6e5', stroke_width=1, opacity=opacity))
        else:
            # Ruled paper - horizontal lines with slight imperfections
            for i in range(len(strokes) + 3):
                y_pos = i * line_height + 40
                # Add slight randomness to make lines imperfect
                x_offset = np.random.uniform(-0.5, 0.5)
                y_jitter = np.random.uniform(-0.3, 0.3)
                dwg.add(dwg.line(
                    start=(margin_left + x_offset, y_pos + y_jitter),
                    end=(view_width - margin_right +
                         x_offset, y_pos + y_jitter),
                    stroke='#b8d4e8',
                    stroke_width=1.2,
                    opacity=0.5
                ))

        # Red margin line with slight imperfection
        margin_line = dwg.polyline(
            points=[(margin_left, 0 + np.random.uniform(-0.5, 0.5)),
                    (margin_left, view_height * 0.33 +
                     np.random.uniform(-0.5, 0.5)),
                    (margin_left, view_height * 0.66 +
                     np.random.uniform(-0.5, 0.5)),
                    (margin_left, view_height + np.random.uniform(-0.5, 0.5))],
            stroke='#ff6b6b',
            stroke_width=1.8,
            fill='none',
            opacity=0.7
        )
        dwg.add(margin_line)

        # Ink color configurations
        ink_colors = {
            'pen': '#1a1a2e',
            'blue_pen': '#0f3460',
            'pencil': '#666666',
            'gel_black': '#000000',
            'gel_blue': '#1e3a8a'
        }

        default_color = ink_colors.get(ink_style, ink_colors['pen'])
        stroke_colors = stroke_colors or [default_color] * len(lines)
        stroke_widths = stroke_widths or [
            2.5 if ink_style != 'pencil' else 2.0] * len(lines)

        # Draw handwriting - start at proper position on first line
        initial_coord = np.array([margin_left + 30, line_height - 8])

        for offsets, line, color, width in zip(strokes, lines, stroke_colors, stroke_widths):
            if not line:
                initial_coord[1] += line_height
                continue

            offsets[:, :2] *= 1.3  # Scale up for better visibility
            strokes_coords = drawing.offsets_to_coords(offsets)
            strokes_coords = drawing.denoise(strokes_coords)
            strokes_coords[:, :2] = drawing.align(strokes_coords[:, :2])

            strokes_coords[:, 1] *= -1

            # Position at initial coordinate
            min_x = strokes_coords[:, 0].min()
            min_y = strokes_coords[:, 1].min()
            strokes_coords[:, 0] = strokes_coords[:, 0] - \
                min_x + initial_coord[0]
            strokes_coords[:, 1] = strokes_coords[:, 1] - \
                min_y + initial_coord[1]

            prev_eos = 1.0
            p = "M{},{} ".format(0, 0)
            for x, y, eos in zip(*strokes_coords.T):
                p += '{}{},{} '.format('M' if prev_eos == 1.0 else 'L', x, y)
                prev_eos = eos

            path = svgwrite.path.Path(p)

            # Different ink styles
            if ink_style == 'pencil':
                path = path.stroke(color=color, width=width, linecap='round',
                                   opacity=0.7).fill("none")
            else:
                path = path.stroke(color=color, width=width,
                                   linecap='round').fill("none")

            dwg.add(path)
            initial_coord[1] += line_height

        dwg.save()
