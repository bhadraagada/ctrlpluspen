import os

from demo import Hand

# Initialize the handwriting generator
hand = Hand()

# Your custom text (max 75 characters per line)
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
    "",
    "Tell me why",
    "Ain't nothin' but a heartache",
    "Tell me why",
    "Ain't nothin' but a mistake",
    "Tell me why",
    "I never wanna hear you say",
    "I want it that way",
]

# Create output directory if it doesn't exist
os.makedirs('img/variations', exist_ok=True)

# Available styles: 0-12
available_styles = list(range(13))

# Different bias/temperature values to try
bias_values = [0.5, 0.75, 1.0, 1.25]

print("Generating handwriting variations...")
print(f"Styles: {len(available_styles)}, Biases: {len(bias_values)}")
print(f"Total outputs: {len(available_styles) * len(bias_values)}")

# Generate for each style
for style in available_styles:
    for bias in bias_values:
        filename = f'img/variations/style_{style}_bias_{bias}.svg'
        print(f"Creating: {filename}")

        biases = [bias for _ in lines]
        styles = [style for _ in lines]

        hand.write(
            filename=filename,
            lines=lines,
            biases=biases,
            styles=styles,
            stroke_colors=['black' for _ in lines],
            stroke_widths=[2 for _ in lines]
        )

print("\n✓ All variations generated successfully!")
print("Check the 'img/variations/' directory")
