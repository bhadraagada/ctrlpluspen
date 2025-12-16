"""
Train the handwriting generation model using synthetic data.
"""
from __future__ import print_function
import os
import sys

# Ensure we're in the ref directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from rnn import DataReader, rnn


def train_model(
    data_dir='data/processed',
    checkpoint_dir='checkpoints',
    log_dir='logs',
    lstm_size=400,
    batch_size=32,
    learning_rate=0.0001,
    num_training_steps=50000
):
    """
    Train the handwriting generation RNN model.
    
    Args:
        data_dir: Directory containing x.npy, x_len.npy, c.npy, c_len.npy
        checkpoint_dir: Directory to save model checkpoints
        log_dir: Directory to save training logs
        lstm_size: Size of LSTM hidden units
        batch_size: Training batch size
        learning_rate: Initial learning rate
        num_training_steps: Total number of training steps
    """
    
    print("="*60)
    print("Handwriting Generation Model Training")
    print("="*60)
    print(f"\nConfiguration:")
    print(f"  Data directory: {data_dir}")
    print(f"  Checkpoint directory: {checkpoint_dir}")
    print(f"  Log directory: {log_dir}")
    print(f"  LSTM size: {lstm_size}")
    print(f"  Batch size: {batch_size}")
    print(f"  Learning rate: {learning_rate}")
    print(f"  Training steps: {num_training_steps}")
    print("="*60 + "\n")
    
    # Check if data exists
    required_files = ['x.npy', 'x_len.npy', 'c.npy', 'c_len.npy']
    for fname in required_files:
        fpath = os.path.join(data_dir, fname)
        if not os.path.exists(fpath):
            print(f"ERROR: Required file not found: {fpath}")
            print("\nPlease generate synthetic data first:")
            print("  python synthesize_training_data.py --num_samples 2000")
            sys.exit(1)
    
    print("Loading data...")
    dr = DataReader(data_dir=data_dir)
    
    print("\nInitializing model...")
    nn = rnn(
        reader=dr,
        log_dir=log_dir,
        checkpoint_dir=checkpoint_dir,
        prediction_dir='predictions',
        
        # Learning rate schedule
        learning_rates=[learning_rate, learning_rate * 0.5, learning_rate * 0.2],
        batch_sizes=[batch_size, batch_size * 2, batch_size * 2],
        patiences=[1500, 1000, 500],
        beta1_decays=[.9, .9, .9],
        
        # Model hyperparameters
        lstm_size=lstm_size,
        output_mixture_components=20,
        attention_mixture_components=10,
        
        # Training settings
        validation_batch_size=32,
        optimizer='rms',
        num_training_steps=num_training_steps,
        warm_start_init_step=0,
        regularization_constant=0.0,
        keep_prob=1.0,
        enable_parameter_averaging=False,
        min_steps_to_checkpoint=500,  # Checkpoint more frequently
        log_interval=20,
        grad_clip=10,
    )
    
    print("\nStarting training...")
    print("="*60)
    print("Building computational graph... (this may take 1-2 minutes)")
    sys.stdout.flush()
    nn.fit()
    
    print("\n" + "="*60)
    print("Training completed!")
    print(f"Checkpoints saved to: {checkpoint_dir}/")
    print(f"Logs saved to: {log_dir}/")
    print("\nTo generate handwriting, use:")
    print("  python demo.py --model_checkpoint checkpoints/model-XXXX")
    print("="*60)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Train handwriting generation model')
    parser.add_argument('--data_dir', type=str, default='data/processed',
                        help='Directory containing training data')
    parser.add_argument('--checkpoint_dir', type=str, default='checkpoints',
                        help='Directory to save checkpoints')
    parser.add_argument('--log_dir', type=str, default='logs',
                        help='Directory to save logs')
    parser.add_argument('--lstm_size', type=int, default=400,
                        help='LSTM hidden size')
    parser.add_argument('--batch_size', type=int, default=32,
                        help='Training batch size')
    parser.add_argument('--learning_rate', type=float, default=0.0001,
                        help='Initial learning rate')
    parser.add_argument('--num_steps', type=int, default=50000,
                        help='Number of training steps')
    
    args = parser.parse_args()
    
    train_model(
        data_dir=args.data_dir,
        checkpoint_dir=args.checkpoint_dir,
        log_dir=args.log_dir,
        lstm_size=args.lstm_size,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate,
        num_training_steps=args.num_steps
    )
