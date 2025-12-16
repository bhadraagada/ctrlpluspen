# Handwriting Synthesis Training with Synthetic Data

This guide shows you how to train the handwriting generation model from scratch using synthetically generated data, without needing to download the IAM ONDB dataset.

## Quick Start

### 1. Generate Synthetic Training Data

```bash
cd ref
conda run -n ref_env python synthesize_training_data.py --num_samples 2000 --num_writers 100
```

This will create synthetic handwriting samples in `data/processed/` with the following files:

- `x.npy` - Stroke sequences (2000, 1200, 3)
- `x_len.npy` - Length of each stroke sequence
- `c.npy` - Encoded text labels (2000, 75)
- `c_len.npy` - Length of each text sequence
- `w_id.npy` - Writer IDs for style variation

### 2. Verify the Data (Optional)

```bash
conda run -n ref_env python verify_synthetic_data.py
```

This will show statistics about the generated data and create a visualization.

### 3. Train the Model

```bash
conda run -n ref_env python train_model.py --num_steps 50000
```

Training options:

- `--data_dir`: Path to training data (default: `data/processed`)
- `--checkpoint_dir`: Where to save model checkpoints (default: `checkpoints`)
- `--log_dir`: Where to save training logs (default: `logs`)
- `--lstm_size`: LSTM hidden size (default: 400)
- `--batch_size`: Training batch size (default: 32)
- `--learning_rate`: Initial learning rate (default: 0.0001)
- `--num_steps`: Total training steps (default: 50000)

### 4. Generate Handwriting

After training, generate handwriting samples:

```bash
conda run -n ref_env python demo.py
```

## Data Format

The model expects the following numpy arrays:

### Stroke Data (`x.npy`)

- Shape: `(N, MAX_STROKE_LEN, 3)` where N is number of samples
- Each stroke point has: `[x_offset, y_offset, end_of_stroke]`
- `MAX_STROKE_LEN = 1200` points maximum
- Offsets are normalized to median unit norm

### Character Data (`c.npy`)

- Shape: `(N, MAX_CHAR_LEN)` where N is number of samples
- Each character is encoded as an integer using the alphabet
- `MAX_CHAR_LEN = 75` characters maximum
- Alphabet includes: space, punctuation, digits, A-Z, a-z

### Lengths

- `x_len.npy`: Actual length of each stroke sequence (before padding)
- `c_len.npy`: Actual length of each text sequence (before padding)

### Writer IDs (`w_id.npy`)

- Integer IDs for different "writers" to learn style variations
- Helps the model learn diverse handwriting styles

## Synthetic Data Generation

The `synthesize_training_data.py` script:

1. **Generates stroke patterns** for each character based on:

   - Character type (uppercase, lowercase, digit, punctuation)
   - Writer ID (for style variation)
   - Random variations (skew, stretch, noise)

2. **Applies transformations** to make strokes realistic:

   - Skewing (-15° to +15°)
   - Stretching (0.8x to 1.2x in both axes)
   - Gaussian noise
   - Alignment and denoising

3. **Creates complete words** by concatenating character strokes

4. **Validates samples** by checking stroke magnitudes

## Customizing Synthetic Data

### Add More Text Samples

Edit `synthesize_training_data.py` and modify the `sample_texts` list:

```python
sample_texts = [
    "Your custom text here",
    "Another sentence",
    # Add more samples...
]
```

### Adjust Generation Parameters

```python
# Generate more realistic strokes
skew_angle = np.random.uniform(-20, 20)  # Increase skew range
noise_scale = np.random.uniform(0.05, 0.2)  # Adjust noise

# Create longer samples
num_samples = 5000  # More training data
num_writers = 200   # More style diversity
```

### Generate Large Dataset

For better results, generate more data:

```bash
# Generate 10,000 samples with 200 writer styles
conda run -n ref_env python synthesize_training_data.py \
    --num_samples 10000 \
    --num_writers 200
```

## Training Tips

1. **Start with fewer steps** to test (e.g., 5000 steps)
2. **Monitor the loss** in the logs directory
3. **Checkpoint frequently** - model saves every 500 steps
4. **Increase batch size** if you have enough memory
5. **Generate more data** if model doesn't converge

## Model Architecture

The RNN model uses:

- **LSTM cells** with attention mechanism
- **Mixture Density Network** for stroke generation
- **Attention over character sequence** to align strokes with text
- **20 Gaussian mixture components** for output
- **10 mixture components** for attention

## Output Files

### During Training

- `checkpoints/checkpoint` - Checkpoint metadata
- `checkpoints/model-XXXX.{data,index,meta}` - Model weights
- `logs/` - Training logs with loss values

### After Generation

- Generated handwriting images
- Style files for conditioning

## Troubleshooting

### "Data files not found"

Run `synthesize_training_data.py` first to generate data.

### "Model diverged / NaN loss"

- Reduce learning rate: `--learning_rate 0.00005`
- Reduce batch size: `--batch_size 16`
- Generate cleaner synthetic data

### "Out of memory"

- Reduce batch size: `--batch_size 16`
- Reduce LSTM size: `--lstm_size 200`

### "Poor quality handwriting"

- Train longer: `--num_steps 100000`
- Generate more diverse data: `--num_samples 5000 --num_writers 200`
- Improve synthetic stroke patterns in `synthesize_training_data.py`

## Next Steps

1. **Train with synthetic data** to verify the pipeline works
2. **Improve stroke generation** for more realistic patterns
3. **Add real handwriting data** if available (mix with synthetic)
4. **Fine-tune hyperparameters** based on results
5. **Experiment with conditioning** on different writer styles

## References

- Original paper: "Generating Sequences with Recurrent Neural Networks" (Graves, 2013)
- IAM On-Line Handwriting Database format
- TensorFlow RNN implementation

## License

See main project LICENSE file.
