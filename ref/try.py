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
    "",
    "Am I your fire",
    "Your one desire?",
    "Yes I know it's too late",
    "But I want it that way",
    "",
    "Tell me why",
    "Ain't nothin' but a heartache",
    "Tell me why",
    "Ain't nothin' but a mistake",
    "Tell me why",
    "I never wanna hear you say",
    "I want it that way",
    "",
    "Now I can see that we've fallen apart",
    "From the way that it used to be, yeah",
    "No matter the distance, I want you to know",
    "That deep down inside of me...",
    "",
    "You are my fire",
    "The one desire",
    "You are, you are, you are, you are...",
    "",
    "Ain't nothin' but a heartache",
    "Ain't nothin' but a mistake",
    "I never wanna hear you say",
    "I want it that way",
    "",
    "Tell me why",
    "Ain't nothin' but a heartache",
    "Tell me why",
    "Ain't nothin' but a mistake",
    "Tell me why",
    "I never wanna hear you say",
    "I want it that way",
    "",
    "'Cause I want it that way"
]

# Parameters you can customize:
biases = [0.75 for _ in lines]  # Same randomness for all lines
styles = [9 for _ in lines]     # Same style (9) for all lines
stroke_colors = ['black' for _ in lines]  # All black
stroke_widths = [2 for _ in lines]        # Same thickness

# Generate the SVG
hand.write(
    filename='img/my_custom_output.svg',
    lines=lines,
    biases=biases,
    styles=styles,
    stroke_colors=stroke_colors,
    stroke_widths=stroke_widths
)
