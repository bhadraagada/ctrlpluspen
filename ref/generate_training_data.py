"""
Generate synthetic handwriting training data for ref1 model
This script uses the pre-trained ref model to synthesize handwriting samples
"""
import os
import numpy as np
from demo import Hand
import argparse

def generate_sentences(num_samples=1000):
    """Generate random sentences for training"""
    
    # Common words for sentence generation
    words = [
        "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
        "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
        "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
        "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
        "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
        "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
        "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
        "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
        "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
        "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
    ]
    
    sentences = []
    for _ in range(num_samples):
        # Random sentence length between 5-15 words
        length = np.random.randint(5, 16)
        sentence = ' '.join(np.random.choice(words, size=length))
        # Capitalize first letter
        sentence = sentence[0].upper() + sentence[1:]
        # Add period
        sentence += '.'
        # Limit to 75 characters (ref model limit)
        if len(sentence) > 75:
            sentence = sentence[:72] + '...'
        sentences.append(sentence)
    
    return sentences

def synthesize_handwriting_data(num_samples=1000, output_dir='../ref1/data/'):
    """
    Generate synthetic handwriting data using the ref model
    
    Args:
        num_samples: Number of handwriting samples to generate
        output_dir: Directory to save the generated data
    """
    print(f"Initializing handwriting model...")
    hand = Hand()
    
    print(f"Generating {num_samples} sentences...")
    sentences = generate_sentences(num_samples)
    
    print("Synthesizing handwriting strokes...")
    all_strokes = []
    
    # Generate strokes in batches to show progress
    batch_size = 50
    num_batches = (num_samples + batch_size - 1) // batch_size
    
    for batch_idx in range(num_batches):
        start_idx = batch_idx * batch_size
        end_idx = min(start_idx + batch_size, num_samples)
        batch_sentences = sentences[start_idx:end_idx]
        
        # Use different styles and biases for variety
        styles = np.random.randint(0, 13, size=len(batch_sentences))
        biases = np.random.uniform(0.3, 0.9, size=len(batch_sentences))
        
        # Sample strokes for this batch
        strokes = hand._sample(batch_sentences, biases=biases.tolist(), styles=styles.tolist())
        all_strokes.extend(strokes)
        
        print(f"Batch {batch_idx + 1}/{num_batches} completed ({end_idx}/{num_samples} samples)")
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Save strokes as numpy array
    strokes_file = os.path.join(output_dir, 'strokes.npy')
    np.save(strokes_file, np.array(all_strokes, dtype=object), allow_pickle=True)
    print(f"Saved strokes to {strokes_file}")
    
    # Save sentences as text file
    sentences_file = os.path.join(output_dir, 'sentences.txt')
    with open(sentences_file, 'w') as f:
        for sentence in sentences:
            f.write(sentence + '\n')
    print(f"Saved sentences to {sentences_file}")
    
    print(f"\nData generation complete!")
    print(f"Generated {len(all_strokes)} handwriting samples")
    print(f"Average stroke length: {np.mean([len(s) for s in all_strokes]):.1f}")
    print(f"Max stroke length: {max([len(s) for s in all_strokes])}")
    print(f"Min stroke length: {min([len(s) for s in all_strokes])}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Generate synthetic handwriting training data')
    parser.add_argument('--num_samples', type=int, default=1000,
                        help='Number of handwriting samples to generate (default: 1000)')
    parser.add_argument('--output_dir', type=str, default='../ref1/data/',
                        help='Directory to save generated data (default: ../ref1/data/)')
    
    args = parser.parse_args()
    
    synthesize_handwriting_data(
        num_samples=args.num_samples,
        output_dir=args.output_dir
    )
