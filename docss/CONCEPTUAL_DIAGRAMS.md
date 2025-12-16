# 3 Requirement and Analysis (Ref Project)

This document covers **Requirement and Analysis (3.1–3.5)** and **Conceptual Diagrams (3.6)** for the `ref/` handwriting synthesis system.

Diagrams are written in **PlantUML** so they can be rendered directly in VS Code (PlantUML extension) or any PlantUML renderer.

---

## 3.1 Problem Definition

### 3.1.1 Problem Analysis

The goal is to build a system that converts **input text** into **human-like handwriting** by generating a continuous sequence of pen strokes. The key challenges are:

- **Sequence generation:** handwriting is a long, variable-length time series with dependencies across timesteps.
- **Continuous outputs:** pen motion is continuous (x/y) plus a discrete pen-up/pen-down state.
- **Alignment:** text characters must be aligned to stroke segments (often unknown a priori), requiring attention-like mechanisms.
- **Style variability:** handwriting style differs per writer and even within the same writer; controlling style and “neatness” matters.
- **Rendering:** generated offsets must be converted into readable SVG/graphics.

In this `ref/` implementation, these challenges are addressed with:

- **RNN-based model** with LSTM layers and an attention window over characters.
- **Mixture Density Network (MDN / GMM head)** to model continuous coordinates.
- **Style priming** via pre-saved style samples (`styles/style-*-strokes.npy`, `styles/style-*-chars.npy`).
- **Bias parameter** to control output neatness/diversity.

### 3.1.2 Existing Problem

Traditional approaches (fonts / rule-based stroke synthesis) often produce:

- Unnatural strokes and spacing,
- Lack of personalization,
- Limited variability and poor realism.

### 3.1.3 Proposed System

The proposed system is a stroke-based handwriting generator:

1. **Input:** text lines (ASCII) + optional (style, bias)
2. **Encoding:** convert text to integer IDs (`drawing.encode_ascii`)
3. **Generation:** RNN + attention + MDN predicts stroke offsets and pen state
4. **Post-process:** denoise + align + convert offsets → coordinates
5. **Render:** export SVG via `svgwrite`

---

## 3.2 Requirement Specification

### Functional Requirements

- **FR1:** Accept one or more text lines as input (max length constraint enforced in `demo.py`).
- **FR2:** Generate stroke sequences $(\Delta x, \Delta y, eos)$ for each line.
- **FR3:** Support **bias** as a controllable parameter affecting neatness/diversity.
- **FR4:** Support **style priming** using a small set of reference strokes/characters.
- **FR5:** Render generated handwriting into **SVG** output.
- **FR6:** Allow training from processed dataset arrays (`data/processed/*.npy`).
- **FR7:** Save and restore model checkpoints.
- **FR8:** Record training logs.

### Non-Functional Requirements

- **NFR1 (Performance):** Training/inference should run on CPU; GPU is optional.
- **NFR2 (Reproducibility):** Config and checkpoints allow runs to be reproduced.
- **NFR3 (Usability):** Provide simple scripts for training and demo generation.
- **NFR4 (Maintainability):** Modular separation of data, model, and rendering utilities.

---

## 3.3 Planning and Scheduling

An implementation-ready plan aligned to this repository’s workflow:

1. **Dataset setup**

- Collect raw handwriting strokes + transcripts (or use provided processed data)
- Run preprocessing to produce `x.npy`, `x_len.npy`, `c.npy`, `c_len.npy`

2. **Model training**

- Run `train_model.py` for a fixed number of steps
- Monitor logs; periodically save checkpoints

3. **Sampling & demo**

- Restore a checkpoint
- Generate samples with/without priming; tune bias
- Render SVG outputs

4. **Testing & validation**

- Visual inspection of SVGs
- Sanity checks on data shapes and lengths

---

## 3.4 Software and Hardware Requirements

### Software Requirements

- **Operating System:** Windows / Linux
- **Python:** 3.x (commonly used with TF 1.x codebases)
- **Core Libraries:**
  - TensorFlow 1.x compatible runtime
  - NumPy
  - svgwrite
  - Matplotlib (for visualization)

### Hardware Requirements

- **Minimum:** CPU-only machine, 8GB RAM (more recommended for training)
- **Recommended:** NVIDIA GPU + CUDA-compatible setup for faster training
- **Storage:** enough for datasets + checkpoints + logs (hundreds of MB to GB depending on dataset)

---

## 3.5 Preliminary Product Description

The system provides two main capabilities:

- **Training:** learns a handwriting synthesis model from stroke/text sequences and saves checkpoints.
- **Generation:** synthesizes handwriting from new text, with:
  - **Priming** (style imitation via reference samples)
  - **Bias control** (neatness vs diversity)
  - **SVG export** for downstream use

The output is a set of SVG files containing realistic stroke paths suitable for preview, printing, or embedding in documents.

---

# 3.6 Conceptual Diagrams (Ref Project)

The following diagrams describe the same system visually.

---

## 3.6.1 Event Table

| Event ID | Trigger / Event          | Input                     | Processing (High-level)                                  | Output                 |
| -------- | ------------------------ | ------------------------- | -------------------------------------------------------- | ---------------------- |
| E1       | Generate synthetic data  | `--num_samples`           | `synthesize_training_data.py` creates stroke/text arrays | `data/processed/*.npy` |
| E2       | Prepare/validate dataset | raw strokes + ascii       | `prepare_data.py` normalizes/splits/serializes           | processed `.npy`       |
| E3       | Train model              | processed `.npy`          | `train_model.py` → `rnn.fit()` training loop             | checkpoints + logs     |
| E4       | Generate handwriting     | text lines (+ style/bias) | `demo.py` samples `nn.sampled_sequence`                  | stroke sequences       |
| E5       | Render/export            | strokes                   | `drawing.py` + `svgwrite` renders strokes                | `.svg` images          |

---

## 3.6.2 Use Case Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

actor "User" as User
actor "Dataset Provider" as Provider

rectangle "Handwriting Synthesis System (ref/)" {
  usecase "Generate / Prepare Data" as UC1
  usecase "Train RNN+Attention Model" as UC2
  usecase "Restore Checkpoint" as UC3
  usecase "Generate Handwriting (Sample)" as UC4
  usecase "Prime Style (Few-shot)" as UC5
  usecase "Set Bias (Neatness Control)" as UC6
  usecase "Render & Export SVG" as UC7
  usecase "View Logs" as UC8
}

Provider --> UC1
User --> UC1
User --> UC2
User --> UC3
User --> UC4
User --> UC7
User --> UC8

UC5 .> UC4 : <<extend>>
UC6 .> UC4 : <<extend>>
UC3 .> UC2 : <<include>>
UC7 .> UC4 : <<include>>
@enduml
```

---

## 3.6.3 Entity Relationship Diagram (ERD)

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

' Conceptual ER diagram (storage is filesystem-based)
entity "ProcessedDataset" as Dataset {
  * dataset_id
  --
  x.npy
  x_len.npy
  c.npy
  c_len.npy
}

entity "StrokeSequence" as Stroke {
  * sample_id
  --
  x: (t,3)
  y: (t,3)
  pen_state
}

entity "TextSequence" as Text {
  * sample_id
  --
  c: int[]
  c_len
}

entity "StyleSample" as Style {
  * style_id
  --
  style-*-strokes.npy
  style-*-chars.npy
}

entity "Checkpoint" as Ckpt {
  * step
  --
  model-*.index
  model-*.data
  model-*.meta
}

entity "LogFile" as Log {
  * run_id
  --
  log_*.txt
}

entity "OutputSVG" as Out {
  * output_id
  --
  *.svg
}

Dataset ||--o{ Stroke : contains
Dataset ||--o{ Text : contains
Style ||--o{ Out : influences
Ckpt ||--o{ Out : used_for_generation
Log }o--|| Ckpt : "records"
@enduml
```

---

## 3.6.4 Class Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false
skinparam classAttributeIconSize 0

abstract class TFBaseModel {
  + fit()
  + {abstract} calculate_loss()
  + save_checkpoint()
  + restore()
}

class rnn {
  + calculate_loss()
  + parse_parameters()
  + NLL()
}

class DataReader {
  + train_batch_generator()
  + val_batch_generator()
  + test_batch_generator()
}

class DataFrame {
  + batch_generator()
  + train_test_split()
}

class LSTMAttentionCell {
  + zero_state()
  + __call__()
}

class Hand {
  + write(filename, lines, biases, styles)
}

TFBaseModel <|-- rnn
rnn --> DataReader
rnn --> LSTMAttentionCell
DataReader --> DataFrame
Hand --> rnn
@enduml
```

---

## 3.6.5 Object Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

object ":Hand" as hand
object ":rnn" as model {
  lstm_size = 400
  output_mixtures = 20
  attn_mixtures = 10
}
object ":DataReader" as reader
object ":tf.Session" as session
object "batch" as batch {
  x[bs,t,3]
  c[bs,k]
}

hand --> model
model --> reader
model --> session
reader ..> batch
@enduml
```

---

## 3.6.6 Activity Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

start
:Check processed data exists;
if (data/processed/*.npy present?) then (yes)
else (no)
  :Run synthesize_training_data.py;
  :Run prepare_data.py;
endif

:Initialize DataReader;
:Initialize rnn model;
:Build TF graph + session;

repeat
  :Fetch train batch;
  :Run train step (forward + NLL + backprop);
  :Fetch val batch;
  :Compute validation loss;

  if (checkpoint interval reached?) then (yes)
    :Save checkpoint;
  endif

repeat while (step < max_steps and no early-stop)

:Training complete;
stop
@enduml
```

---

## 3.6.7 Sequence Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

actor User
participant "train_model.py" as Train
participant "DataReader" as DR
participant "rnn (TFBaseModel)" as Model
participant "tf.Session" as Sess
participant "Filesystem" as FS

User -> Train : python train_model.py --num_steps N
Train -> DR : DataReader(data_dir)
Train -> Model : rnn(reader=DR, ...)
Model -> Sess : Session(graph)

loop each step
  Model -> DR : next(train_batch)
  DR --> Model : feed_dict data
  Model -> Sess : run([loss, train_op])
  Sess --> Model : loss

  alt log interval
    Model -> FS : append logs/log_*.txt
  end

  alt checkpoint interval
    Model -> FS : save checkpoints/model-STEP.*
  end
end

Train <-- Model : fit() returns
@enduml
```

---

## 3.6.8 State-Flow Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

[*] --> Uninitialized
Uninitialized --> GraphBuilt : build_graph()
GraphBuilt --> Training : fit()

Training --> Validating : evaluate batch
Validating --> Training : continue

Training --> Checkpointing : min_steps_to_checkpoint
Checkpointing --> Training

Training --> EarlyStopped : patience exhausted
Training --> Finished : reached max_steps
Training --> Error : exception

EarlyStopped --> Finished
Error --> [*]
Finished --> [*]
@enduml
```

---

## 3.6.9 Context Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

rectangle "User" as User
rectangle "Handwriting Synthesis System (ref/)" as Sys
rectangle "Online Handwriting Dataset\n(IAM-OnDB / similar)" as Data
rectangle "Local Filesystem\n(data/, checkpoints/, logs/, styles/, img/)" as FS
rectangle "TensorFlow Runtime" as TF
rectangle "GPU / CPU" as HW

User --> Sys : commands (train / demo)
Data --> Sys : raw strokes + ascii
Sys --> FS : save processed data, checkpoints, outputs
Sys --> TF : build & run graph
TF --> HW : compute
Sys --> User : generated SVG output
@enduml
```

---

## 3.6.10 Data-Flow Diagram (DFD)

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

rectangle "Raw Data\n(strokes + ascii)" as Raw
rectangle "Preprocessing\nprepare_data.py" as Prep
rectangle "Processed Dataset\n(data/processed/*.npy)" as Proc
rectangle "Batching\nDataReader" as Batch
rectangle "Model\nrnn + Attention + MDN" as Model
rectangle "Sampled Strokes\n(x,y,pen_state)" as Strokes
rectangle "Renderer\ndrawing.py + svgwrite" as Render
rectangle "Outputs\nSVG/Images" as Out

Raw --> Prep
Prep --> Proc
Proc --> Batch
Batch --> Model
Model --> Strokes
Strokes --> Render
Render --> Out
@enduml
```

---

## 3.6.11 Component Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

component "Data Prep" as C1 {
  [synthesize_training_data.py]
  [prepare_data.py]
}

component "Training" as C2 {
  [train_model.py]
  [tf_base_model.py]
  [rnn.py]
}

component "Model Cells" as C3 {
  [rnn_cell.py]
  [rnn_ops.py]
  [tf_utils.py]
}

component "Generation/Demo" as C4 {
  [demo.py]
}

component "Rendering" as C5 {
  [drawing.py]
}

database "Filesystem" as FS {
  folder "data/processed"
  folder "checkpoints"
  folder "logs"
  folder "styles"
  folder "img"
}

C1 --> FS
C2 --> FS
C4 --> FS
C2 --> C3
C4 --> C2
C4 --> C5
@enduml
```

---

## 3.6.12 Package Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

package "ref" {
  package "data" {
    [data_frame.py]
    [prepare_data.py]
    [synthesize_training_data.py]
  }

  package "model" {
    [tf_base_model.py]
    [rnn.py]
    [rnn_cell.py]
    [rnn_ops.py]
    [tf_utils.py]
  }

  package "rendering" {
    [drawing.py]
    [demo.py]
  }
}

"data" ..> "model" : provides batches
"model" ..> "rendering" : provides sampled strokes
@enduml
```

---

## 3.6.13 Deployment Diagram

```plantuml
@startuml
skinparam monochrome true
skinparam shadowing false

node "Local PC (Windows)" as PC {
  node "Python Environment" as PY {
    artifact "ref/*.py" as Code
    artifact "TensorFlow 1.x" as TF
  }

  node "Compute" as HW {
    node "CPU" as CPU
    node "GPU (optional)" as GPU
  }

  folder "data/" as Data
  folder "checkpoints/" as Ckpt
  folder "logs/" as Logs
  folder "styles/" as Styles
  folder "img/" as Img
}

Code --> TF
TF --> CPU
TF --> GPU
Code --> Data
Code --> Ckpt
Code --> Logs
Code --> Styles
Code --> Img
@enduml
```
