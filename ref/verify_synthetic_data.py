"""
Quick test to verify the synthetic training data and visualize a sample.
"""
import numpy as np
import drawing
import os

# Load the generated data
data_dir = 'data/processed'

print("Loading synthetic training data...")
x = np.load(os.path.join(data_dir, 'x.npy'))
x_len = np.load(os.path.join(data_dir, 'x_len.npy'))
c = np.load(os.path.join(data_dir, 'c.npy'))
c_len = np.load(os.path.join(data_dir, 'c_len.npy'))
w_id = np.load(os.path.join(data_dir, 'w_id.npy'))

print("\nDataset Statistics:")
print(f"  Number of samples: {len(x)}")
print(f"  Stroke shape: {x.shape}")
print(f"  Character shape: {c.shape}")
print(f"  Number of unique writers: {len(np.unique(w_id))}")
print(f"\nAverage stroke length: {np.mean(x_len):.1f}")
print(f"  Min stroke length: {np.min(x_len)}")
print(f"  Max stroke length: {np.max(x_len)}")
print(f"\nAverage text length: {np.mean(c_len):.1f}")
print(f"  Min text length: {np.min(c_len)}")
print(f"  Max text length: {np.max(c_len)}")

# Sample a few examples
print("\n" + "="*60)
print("Sample Examples:")
print("="*60)

for i in range(min(5, len(x))):
    sample_strokes = x[i, :x_len[i]]
    sample_text = c[i, :c_len[i]]
    
    # Decode text
    decoded_text = ''.join([chr(drawing.num_to_alpha.get(int(ch), 0)) for ch in sample_text])
    
    print(f"\nSample {i+1}:")
    print(f"  Text: '{decoded_text}'")
    print(f"  Writer ID: {w_id[i]}")
    print(f"  Stroke length: {x_len[i]}")
    print(f"  Character length: {c_len[i]}")
    
    # Optionally visualize
    if i == 0:
        print("\n  Visualizing first sample...")
        try:
            drawing.draw(
                sample_strokes,
                ascii_seq=sample_text,
                save_file='outputs/sample_synthetic_handwriting.png'
            )
        except Exception as e:
            print(f"  Could not visualize: {e}")

print("\n" + "="*60)
print("✓ Data verification complete!")
print("\nThe synthetic dataset is ready for training.")
print("\nTo train the model, run:")
print("  python ref/rnn.py --mode train --data_dir data/processed")
