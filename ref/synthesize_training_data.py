"""
Synthesize handwriting training data for the RNN model.
This script generates synthetic stroke sequences and corresponding text labels
in the format expected by the training pipeline.
"""
from __future__ import print_function
import os
import numpy as np
import drawing


def generate_simple_character_strokes(char, writer_id=0):
    """
    Generate simple stroke patterns for characters.
    This is a basic implementation - you can enhance with more realistic patterns.
    """
    np.random.seed(writer_id * 1000 + ord(char))
    
    # Base stroke patterns for different character types
    if char == ' ':
        # Space is just a horizontal movement
        strokes = np.array([[5.0, 0.0, 1.0]])
    
    elif char.isupper():
        # Uppercase letters - taller strokes
        height = 15 + np.random.randn() * 2
        width = 8 + np.random.randn() * 1.5
        num_points = int(15 + np.random.randint(-3, 4))
        
        # Create a wavy pattern for uppercase
        x_coords = np.linspace(0, width, num_points)
        y_coords = np.sin(x_coords) * 2 + height * np.random.rand(num_points)
        
        strokes = np.zeros((num_points, 3))
        strokes[:, 0] = x_coords
        strokes[:, 1] = y_coords
        strokes[-1, 2] = 1.0  # End of stroke marker
        
    elif char.islower():
        # Lowercase letters - shorter strokes
        height = 8 + np.random.randn() * 1.5
        width = 6 + np.random.randn() * 1
        num_points = int(10 + np.random.randint(-2, 3))
        
        x_coords = np.linspace(0, width, num_points)
        y_coords = np.sin(x_coords * 1.5) * 1.5 + height * np.random.rand(num_points)
        
        strokes = np.zeros((num_points, 3))
        strokes[:, 0] = x_coords
        strokes[:, 1] = y_coords
        strokes[-1, 2] = 1.0
        
    elif char.isdigit():
        # Digits - medium sized
        height = 12 + np.random.randn() * 1.5
        width = 7 + np.random.randn() * 1
        num_points = int(12 + np.random.randint(-2, 3))
        
        x_coords = np.linspace(0, width, num_points)
        y_coords = np.cos(x_coords) * 2 + height * np.random.rand(num_points)
        
        strokes = np.zeros((num_points, 3))
        strokes[:, 0] = x_coords
        strokes[:, 1] = y_coords
        strokes[-1, 2] = 1.0
        
    else:
        # Punctuation and other characters
        height = 6 + np.random.randn() * 1
        width = 4 + np.random.randn() * 0.5
        num_points = int(6 + np.random.randint(-1, 2))
        
        x_coords = np.linspace(0, width, num_points)
        y_coords = np.random.randn(num_points) * 1.5 + height * np.random.rand(num_points)
        
        strokes = np.zeros((num_points, 3))
        strokes[:, 0] = x_coords
        strokes[:, 1] = y_coords
        strokes[-1, 2] = 1.0
    
    # Convert to offsets
    coords = np.vstack([np.array([[0, 0, 0]]), strokes])
    offsets = drawing.coords_to_offsets(coords)
    
    return offsets


def generate_word_strokes(word, writer_id=0):
    """
    Generate stroke sequence for a complete word/sentence.
    """
    all_strokes = []
    cumulative_x = 0
    
    for char in word:
        # Generate strokes for this character
        char_strokes = generate_simple_character_strokes(char, writer_id)
        
        # Add horizontal offset for positioning
        char_strokes_shifted = char_strokes.copy()
        if len(all_strokes) > 0:
            char_strokes_shifted[1:, 0] += cumulative_x
        
        all_strokes.append(char_strokes)
        
        # Update cumulative position
        cumulative_x += np.sum(char_strokes[:, 0])
    
    # Concatenate all strokes
    word_strokes = np.vstack(all_strokes)
    
    # Apply variations based on writer style
    np.random.seed(writer_id)
    
    # Add writer-specific variations
    skew_angle = np.random.uniform(-15, 15)
    x_stretch = np.random.uniform(0.8, 1.2)
    y_stretch = np.random.uniform(0.8, 1.2)
    noise_scale = np.random.uniform(0.1, 0.3)
    
    # Convert to coords for transformations
    coords = drawing.offsets_to_coords(word_strokes)
    
    # Apply transformations
    coords = drawing.skew(coords, skew_angle)
    coords = drawing.stretch(coords, x_stretch, y_stretch)
    coords = drawing.add_noise(coords, noise_scale)
    
    # Align and denoise
    coords = drawing.align(coords)
    coords = drawing.denoise(coords)
    
    # Convert back to offsets and normalize
    offsets = drawing.coords_to_offsets(coords)
    offsets = drawing.normalize(offsets)
    
    return offsets


def generate_synthetic_dataset(num_samples=1000, num_writers=50, output_dir='data/processed'):
    """
    Generate a complete synthetic dataset for training.
    """
    print(f"Generating {num_samples} synthetic handwriting samples...")
    
    # Sample sentences and words
    sample_texts = [
        "The quick brown fox jumps over the lazy dog",
        "Hello world",
        "Machine learning is fascinating",
        "Handwriting synthesis with neural networks",
        "Python programming",
        "Deep learning models",
        "Artificial intelligence research",
        "Data science and analytics",
        "Computer vision applications",
        "Natural language processing",
        "The weather is nice today",
        "I love to code",
        "This is a test sentence",
        "Random words and phrases",
        "Training data generation",
        "Synthetic handwriting samples",
        "Neural network architecture",
        "Recurrent neural networks",
        "Long short term memory",
        "Attention mechanisms",
    ]
    
    # Initialize arrays
    x = np.zeros([num_samples, drawing.MAX_STROKE_LEN, 3], dtype=np.float32)
    x_len = np.zeros([num_samples], dtype=np.int16)
    c = np.zeros([num_samples, drawing.MAX_CHAR_LEN], dtype=np.int8)
    c_len = np.zeros([num_samples], dtype=np.int8)
    w_id = np.zeros([num_samples], dtype=np.int16)
    valid_mask = np.zeros([num_samples], dtype=np.bool_)
    
    for i in range(num_samples):
        if i % 50 == 0:
            print(f"Progress: {i}/{num_samples}")
        
        # Select random text and writer
        text = np.random.choice(sample_texts)
        writer_id = np.random.randint(0, num_writers)
        
        # Optionally truncate or use substring
        if len(text) > drawing.MAX_CHAR_LEN - 1:
            text = text[:drawing.MAX_CHAR_LEN - 1]
        
        # Generate strokes for this text
        try:
            strokes = generate_word_strokes(text, writer_id)
            
            # Truncate if needed
            if len(strokes) > drawing.MAX_STROKE_LEN:
                strokes = strokes[:drawing.MAX_STROKE_LEN]
            
            # Validate (check for reasonable stroke magnitudes)
            stroke_norms = np.linalg.norm(strokes[:, :2], axis=1)
            valid_mask[i] = ~np.any(stroke_norms > 60)
            
            if not valid_mask[i]:
                print(f"Sample {i} invalid - stroke norm too large")
                continue
            
            # Store stroke data
            x[i, :len(strokes), :] = strokes
            x_len[i] = len(strokes)
            
            # Encode and store character data
            encoded_text = drawing.encode_ascii(text)
            c[i, :len(encoded_text)] = encoded_text
            c_len[i] = len(encoded_text)
            
            # Store writer ID
            w_id[i] = writer_id
            
        except Exception as e:
            print(f"Error generating sample {i}: {e}")
            valid_mask[i] = False
            continue
    
    # Create output directory
    if not os.path.isdir(output_dir):
        os.makedirs(output_dir)
    
    # Filter and save valid samples
    num_valid = np.sum(valid_mask)
    print(f"\nGenerated {num_valid} valid samples out of {num_samples}")
    
    print("Saving data arrays...")
    np.save(os.path.join(output_dir, 'x.npy'), x[valid_mask])
    np.save(os.path.join(output_dir, 'x_len.npy'), x_len[valid_mask])
    np.save(os.path.join(output_dir, 'c.npy'), c[valid_mask])
    np.save(os.path.join(output_dir, 'c_len.npy'), c_len[valid_mask])
    np.save(os.path.join(output_dir, 'w_id.npy'), w_id[valid_mask])
    
    print(f"Data saved to {output_dir}/")
    print("\nArray shapes:")
    print(f"  x: {x[valid_mask].shape}")
    print(f"  x_len: {x_len[valid_mask].shape}")
    print(f"  c: {c[valid_mask].shape}")
    print(f"  c_len: {c_len[valid_mask].shape}")
    print(f"  w_id: {w_id[valid_mask].shape}")
    
    return num_valid


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate synthetic handwriting training data')
    parser.add_argument('--num_samples', type=int, default=1000, help='Number of samples to generate')
    parser.add_argument('--num_writers', type=int, default=50, help='Number of different writer styles')
    parser.add_argument('--output_dir', type=str, default='data/processed', help='Output directory')
    
    args = parser.parse_args()
    
    generate_synthetic_dataset(
        num_samples=args.num_samples,
        num_writers=args.num_writers,
        output_dir=args.output_dir
    )
    
    print("\n✓ Synthetic dataset generated successfully!")
    print("\nYou can now train the model using:")
    print("  python ref/rnn.py --mode train --data_dir data/processed")
