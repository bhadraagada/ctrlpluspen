import os

from demo_realistic_paper import Hand

hand = Hand()

lines = [
    "You are my fire",
    "The one desire",
    "Believe when I say",
    "I want it that way",
]

os.makedirs('img/test', exist_ok=True)

print("Generating test sample...")

hand.write(
    filename='img/test/test_sample.svg',
    lines=lines,
    biases=[0.75] * len(lines),
    styles=[9] * len(lines),
    paper_style='college',
    ink_style='pen'
)

print("\n✓ Test sample generated: img/test/test_sample.svg")
