"""Generate handwriting samples across multiple styles and bias values.

This mirrors the idea of ref/generate_all_variations.py but targets the ref2
TensorFlow v2 implementation.

Outputs are written to: ref2/img/variations/

Run (from repo root):
  conda run -n ref2-hwsyn python .\ref2\generate_all_variations.py
"""

from __future__ import annotations

import os
from pathlib import Path

from handwriting_synthesis.hand import Hand


def main() -> None:
    # Your custom text (paper notes: keep <= ~75 characters per line)
    lines = [
        "You are my fire",
        "The one desire",
        "Believe when I say",
        "I want it that way",
        "",
        "But we are two worlds apart.",
        "Can't reach to your heart",
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

    repo_dir = Path(__file__).resolve().parent
    # ref2 uses relative paths in handwriting_synthesis/config.py (e.g. "model/")
    # so ensure the working directory is the ref2 folder before instantiating Hand.
    os.chdir(repo_dir)
    output_dir = repo_dir / "img" / "variations"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Available styles are 0-12 (inclusive) for the bundled style priming files.
    available_styles = list(range(13))

    # Bias controls neatness/legibility (higher bias -> typically neater)
    bias_values = [0.5, 0.75, 1.0, 1.25]

    print("Generating handwriting variations (ref2)...")
    print(f"Output dir: {output_dir}")
    print(f"Styles: {len(available_styles)}, Biases: {len(bias_values)}")
    print(f"Total outputs: {len(available_styles) * len(bias_values)}")

    hand = Hand()

    for style in available_styles:
        for bias in bias_values:
            filename = output_dir / f"style_{style}_bias_{bias}.svg"
            print(f"Creating: {filename.name}")

            biases = [bias for _ in lines]
            styles = [style for _ in lines]

            hand.write(
                filename=str(filename),
                lines=lines,
                biases=biases,
                styles=styles,
                stroke_colors=["black" for _ in lines],
                stroke_widths=[2 for _ in lines],
            )

    print("\n✓ All variations generated successfully!")
    print(f"Check: {output_dir}")


if __name__ == "__main__":
    main()
