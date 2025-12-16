import os

from demo_realistic_paper import Hand

hand = Hand()

lines = [
    "You are my fire",
    "The one desire",
    "Believe when I say",
    "I want it that way",
    "",
    "But we are two worlds apart.",
    "'Can't reach to your heart",
    "When you say",
    "That I want it that way",
]

os.makedirs('img/realistic', exist_ok=True)

paper_styles = ['college', 'wide', 'narrow', 'graph']
ink_styles = ['pen', 'blue_pen', 'pencil', 'gel_black', 'gel_blue']
selected_styles = [0, 3, 7, 9, 11]
biases = [0.6, 0.75, 0.9]

count = 0
total = len(paper_styles) * len(ink_styles) * \
    len(selected_styles) * len(biases)

print(f"Generating {total} realistic handwriting samples...")

for paper in paper_styles:
    for ink in ink_styles:
        for style in selected_styles:
            for bias in biases:
                count += 1
                filename = f'img/realistic/paper_{paper}_ink_{ink}_style_{style}_bias_{bias}.svg'
                print(f"[{count}/{total}] {filename}")

                hand.write(
                    filename=filename,
                    lines=lines,
                    biases=[bias] * len(lines),
                    styles=[style] * len(lines),
                    paper_style=paper,
                    ink_style=ink
                )

print(f"\n✓ Generated {total} realistic samples in img/realistic/")
