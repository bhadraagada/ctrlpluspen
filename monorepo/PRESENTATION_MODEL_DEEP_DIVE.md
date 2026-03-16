# Handwriting Project - Model Side Deep Dive

This file is a presentation-ready deep dive for the **model side** of this project: the handwriting synthesis model, OCR model, realistic rendering pipeline, training details, data flow, limitations, and likely viva questions.

---

## 1) Big Picture (Model Stack)

This project uses three model-related layers:

1. **Stroke-based handwriting synthesis model (TensorFlow)** in `apps/ref2`
2. **Production inference API (FastAPI)** in `apps/synthesis-api/main.py`
3. **Handwriting recognition model (TrOCR + fallback OCR)** in `apps/synthesis-api/trocr_ocr.py`

Core idea:

- Text -> stroke sequence generation (`dx, dy, eos`) -> SVG rendering
- Optional post-processing converts clean SVG -> realistic paper+ink PNG
- OCR path does reverse: image -> text

---

## 2) Core Synthesis Model (RNN + Attention + MDN)

### Where it lives

- `apps/ref2/handwriting_synthesis/rnn/RNN.py`
- `apps/ref2/handwriting_synthesis/rnn/LSTMAttentionCell.py`
- `apps/ref2/handwriting_synthesis/hand/Hand.py`

### Framework mode

- TensorFlow 2 with v1 compatibility mode (`tf.compat.v1` style graph/session flow)
- Uses placeholders, `dynamic_rnn`, and manual sampling loops

### Input and output representation

- **Input stroke format** per timestep: `[dx, dy, eos]`
  - `dx`, `dy`: pen movement offsets
  - `eos`: end-of-stroke probability/label
- **Conditioning input**: one-hot text character sequence
- **Generated output**: sequence of offsets + pen states, rendered to SVG paths

### Network architecture

- 3 stacked LSTM layers
- Hidden size: 400 units per layer
- Attention-enabled cell aligns text positions to current pen trajectory
- Output head is MDN-like (Mixture Density Network)

From implementation:

- Number of output mixtures: 20 (`num_output_mixture_components=20`)
- Attention mixtures: 10 (`attention_mixture_components=10`)
- Output parameter width: `20 * 6 + 1 = 121`

---

## 3) Attention Mechanism (Why text aligns correctly)

The model uses Graves-style location-based attention over character sequence:

- Maintains attention state variables (`alpha`, `beta`, `kappa`, `phi`, `w`)
- Computes a soft window over character indices
- Uses **monotonic progression** (`kappa` accumulates forward), so focus moves left-to-right through text

Why this matters:

- Reduces skipping and repeated characters
- Keeps generated strokes synchronized with input text order

---

## 4) MDN Output Head (Why writing looks natural)

Instead of predicting one next point, model predicts a **mixture distribution**:

- `pi`: mixture weights via softmax
- `mu1`, `mu2`: means for x/y offsets
- `sigma1`, `sigma2`: standard deviations via exp
- `rho`: correlation via tanh
- plus `e`: Bernoulli parameter for end-of-stroke

Loss is negative log-likelihood of observed stroke offset under the predicted 2D Gaussian mixture plus eos likelihood.

Benefits:

- Supports multi-modal trajectories (multiple valid ways to draw a character)
- Produces more human-like variation than deterministic next-point regression

---

## 5) Data, Dataset, and Preprocessing

### Dataset

- IAM On-Line Handwriting Database (documented in `apps/ref2/model/README.md`)

Required archives:

- `ascii-all.tar.gz`
- `lineStrokes-all.tar.gz`
- `original-xml-part.tar.gz`

### Data preparation pipeline

Main files:

- `apps/ref2/handwriting_synthesis/training/preparation/prepare.py`
- `apps/ref2/handwriting_synthesis/training/preparation/operations.py`
- `apps/ref2/handwriting_synthesis/drawing/operations.py`

Main steps:

1. Parse XML stroke points to coordinate sequences
2. Build aligned `(x, y, eos)` format
3. Denoise with Savitzky-Golay smoothing
4. Align writing slope/baseline
5. Convert absolute coordinates -> offsets
6. Normalize offsets for stable training
7. Encode text to integer labels
8. Filter out invalid/noisy samples

Important constraints from code:

- Max stroke length: 1200
- Max char length per line: 75
- A custom fixed alphabet is used

---

## 6) Training Pipeline and Optimization

### Training entry

- `apps/ref2/handwriting_synthesis/training/train.py`

### Batch and reader

- `apps/ref2/handwriting_synthesis/training/batch_generator.py`
- `apps/ref2/handwriting_synthesis/training/DataReader.py`
- split ratio around 95% train / 5% validation

### Key hyperparameters (from training code)

- Learning-rate schedule: `[1e-4, 5e-5, 2e-5]`
- Batch sizes: `[32, 64, 64]`
- Patience schedule: `[1500, 1000, 500]`
- Optimizer: RMSProp
- Gradient clipping: 10
- Hidden size: 400
- Output mixtures: 20
- Attention mixtures: 10

### Training engine

- Base trainer in `apps/ref2/handwriting_synthesis/tf/BaseModel.py`
- Handles checkpoint save/restore, summaries, staged LR schedule, and early-stop style logic

Checkpoint location:

- `apps/ref2/model/checkpoint`

Style priming files:

- `apps/ref2/model/style/style-<id>-strokes.npy`
- `apps/ref2/model/style/style-<id>-chars.npy`

---

## 7) Inference / Generation Path

Main runtime wrapper:

- `apps/ref2/handwriting_synthesis/hand/Hand.py`

Inference flow:

1. Initialize model + restore trained checkpoint
2. Encode input text to one-hot
3. Optionally prime model with selected style sample
4. Run autoregressive sampling loop for stroke offsets
5. Convert offsets to coordinates
6. Render SVG path output

Controls exposed to user/API:

- `style` (0-12)
- `bias` (neatness/randomness tradeoff)
- `stroke_color`
- `stroke_width`

Bias intuition:

- Higher bias typically gives neater, less random output
- Lower bias gives more variation and personality

---

## 8) Character Set and Text Constraints (Important Viva Point)

The synthesis model supports a fixed whitelist alphabet from training.

Implications:

- Some uppercase letters are unsupported (notably `Q`, `X`, `Z`)
- Input must be validated before inference

Validation exists at both levels:

- FastAPI layer (`apps/synthesis-api/main.py`)
- tRPC/frontend layer (`apps/frontend/src/server/api/routers/synthesis.ts`)

This is a data/model vocabulary limitation, not a frontend bug.

---

## 9) Production FastAPI Model Service

Main file:

- `apps/synthesis-api/main.py`

Core endpoints:

- `POST /synthesize` -> clean SVG generation
- `POST /synthesize/realistic` -> synthesis + realistic PNG
- `POST /process/realistic` -> convert existing SVG to realistic PNG
- `POST /ocr/recognize` -> handwriting OCR
- `GET /styles` -> style metadata
- `GET /health` and OCR health/info endpoints

Design choices:

- Lazy-load heavy models for startup speed
- Validate input lengths/chars early
- Return structured metadata (line count, char count, style, bias)

---

## 10) Realistic Rendering Pipeline (Post-Processing, Not Neural)

Main implementation:

- `apps/synthesis-api/post_processing.py`

This stage simulates pen-on-paper artifacts procedurally.

Pipeline:

1. SVG -> alpha mask
2. Generate paper texture (Perlin-like multi-octave noise)
3. Apply edge roughness
4. Apply feathering (ink spread)
5. Apply pressure variation
6. Apply paper show-through
7. Composite ink onto paper
8. Add scan/photo artifacts (lighting variation, sensor noise, optional blur)

Controls:

- Paper type: white, cream, aged, lined, grid, recycled
- Ink type: ballpoint, gel, fountain, marker, pencil
- Wear level: 0 to 1

This is a strong practical design: keeps core model focused on stroke generation while realism remains modular and tunable.

---

## 11) OCR Model Side (Recognition)

Main implementation:

- `apps/synthesis-api/trocr_ocr.py`

Primary OCR model:

- Hugging Face Transformers TrOCR model (`microsoft/trocr-large-handwritten` in runtime loader)

Pipeline:

1. Decode image (base64 -> PIL)
2. Optional advanced preprocessing:
   - deskew
   - denoise
   - sharpen
   - contrast enhancement
3. Line segmentation (projection profile + valley detection)
4. Line-wise TrOCR generation with beam search
5. Confidence estimation
6. Fallback to EasyOCR for low confidence cases
7. Optional spell correction

Output:

- Full recognized text
- Per-line text and confidence
- Number of lines
- Avg confidence
- Processing latency

---

## 12) End-to-End Data Flow (Model Perspective)

1. User submits text from frontend
2. tRPC validates + forwards to FastAPI
3. FastAPI validates + calls synthesis model
4. Model returns SVG strokes
5. Optional realistic conversion produces PNG
6. Frontend stores/serves outputs and metadata
7. OCR route supports verification and recognition workflows

---

## 13) Why This Architecture Is Good

- **Separation of concerns**: generation model, OCR model, and realism pipeline are independent
- **Modularity**: can improve OCR or realism without retraining generator
- **Production readiness**: API boundaries, validation, health checks, async batch support
- **Interpretability**: stroke-domain output is easier to reason about than black-box pixel synthesis

---

## 14) Known Limitations

1. Character coverage is limited to training alphabet
2. Style variety limited to bundled priming references unless retrained/expanded
3. Sequence models can degrade on very long lines or out-of-distribution text patterns
4. OCR quality depends heavily on image quality and line segmentation quality
5. Metadata mismatch can occur if info endpoint text is not synced with runtime model name

---

## 15) Strong Viva Answers (Quick)

**Q: Why LSTM+MDN, not diffusion?**

- Because handwriting generation is naturally sequential stroke prediction. MDN models multi-modal pen movement directly in coordinate space.

**Q: How is style controlled?**

- Via style priming files (`style-*.npy`) + bias control during sampling.

**Q: How does model know which letter to draw next?**

- Attention window over encoded characters advances monotonically through text.

**Q: Why both TrOCR and EasyOCR?**

- TrOCR is primary high-quality transformer recognizer; EasyOCR acts as practical fallback for low-confidence cases.

**Q: Is realistic rendering part of training?**

- No. It is post-processing and modular, applied after SVG generation.

---

## 16) 60-Second Model Explanation Script

"Our model side has three components. First, the generator is a TensorFlow LSTM-based sequence model with Graves-style attention and an MDN output layer. It takes text and generates pen offsets `(dx, dy, eos)` step-by-step, then renders those into SVG handwriting. Attention aligns strokes to character positions, while MDN gives natural variation in trajectories. Second, we have a FastAPI service that exposes this model through validated endpoints like `/synthesize`. Third, we have an OCR path using TrOCR for handwritten image-to-text, with EasyOCR fallback when confidence is low. We also add an optional post-processing stage that turns clean SVG into realistic pen-on-paper images using texture, ink, and scan artifact simulation. This modular design keeps generation, recognition, and realism independent and production-friendly." 

---

## 17) File Map (For Slides / Demo)

- Generator core: `apps/ref2/handwriting_synthesis/rnn/RNN.py`
- Attention cell: `apps/ref2/handwriting_synthesis/rnn/LSTMAttentionCell.py`
- Inference wrapper: `apps/ref2/handwriting_synthesis/hand/Hand.py`
- Training entry: `apps/ref2/handwriting_synthesis/training/train.py`
- Data prep: `apps/ref2/handwriting_synthesis/training/preparation/operations.py`
- API service: `apps/synthesis-api/main.py`
- OCR service: `apps/synthesis-api/trocr_ocr.py`
- Realism pipeline: `apps/synthesis-api/post_processing.py`
- Frontend API bridge: `apps/frontend/src/server/api/routers/synthesis.ts`

---

If presenting tomorrow, prioritize sections 1, 2, 3, 4, 9, and 11 first, then go into training and limitations if asked.
