# Bhadra Gada Black Book (Sem 6)

**Topic:** Handwriting Synthesis using RNN + Reinforcement Learning (RL)

---

## Index (Table of Contents)

1. **Introduction**

- 1.1 Background
- 1.2 Objectives
- 1.3 Purpose, Scope and Applicability
  - 1.3.1 Purpose
  - 1.3.2 Scope
  - 1.3.3 Applicability
- 1.4 Achievements
- 1.5 Organization of Report

2. **Survey of Technologies**

3. **Requirement and Analysis**

- 3.1 Problem Definition
  - 3.1.1 Problem Analysis
  - 3.1.2 Existing Problem
  - 3.1.3 Proposed System
- 3.2 Requirement Specification
- 3.3 Planning and Scheduling
- 3.4 Software and Hardware Requirements
- 3.5 Preliminary Product Description
- 3.6 Conceptual Diagrams
  - 3.6.1 Event Table
  - 3.6.2 Use Case Diagram
  - 3.6.3 Entity Relationship Diagram
  - 3.6.4 Class Diagram
  - 3.6.5 Object Diagram
  - 3.6.6 Activity Diagram
  - 3.6.7 Sequence Diagram
  - 3.6.8 State-Flow Diagram
  - 3.6.9 Context Diagram
  - 3.6.10 Data-Flow Diagram
  - 3.6.11 Component Diagram
  - 3.6.12 Package Diagram
  - 3.6.13 Deployment Diagram

4. **System Coding**

- 4.1 Code
- 4.2 Data Dictionary
- 4.3 Program Description
- 4.4 Naming Conventions
- 4.5 Validations

5. **Cost Estimation**

6. **Conclusion**

- 6.1 Conclusion
- 6.2 Limitations of the System
- 6.3 Future Scope of the Project

7. **Bibliography**

---

# 1. Introduction

## 1.1 Background

Handwriting is still an important way for people to communicate, even with the rise of digital text.
Many applications, including digital note-taking, document storage, tools for people with motor
disabilities, historical document restoration, and custom stationery, benefit from good modeling
and creation of human handwriting. Traditional methods for handwriting creation often use fixed
fonts or basic rules, resulting in outputs that lack natural stroke movements and personal style.

Recent progress in deep learning, particularly with models like Recurrent Neural Networks
(RNNs) that use Long Short-Term Memory (LSTM) or Gated Recurrent Unit (GRU) cells, allows
for better modeling of pen stroke movements. Mixture Density Networks (MDNs) combined with
RNNs can predict continuous pen paths, leading to smoother stroke sequences instead of pixel-
based images. Reinforcement Learning (RL) can then enhance generative models to improve
higher-level style goals, like stroke smoothness, character spacing, and style matching. This
approach uses reward signals, allowing for greater control over the quality and personalization of
generated handwriting.

This project builds on these methods to create a system that produces realistic and personalized
handwriting from digital text input. The system will generate stroke sequences that can be saved
as SVG or image files. It will also support style conditioning and limited style cloning from small
samples of a person's handwriting.

## 1.2 Objectives

The main goal of this project is to create a strong handwriting synthesis system that produces
human-like handwriting from text input. It will use RNN-based sequence models with
reinforcement learning to improve style. Specific objectives include:

- **Stroke-level handwriting generation:** Create an RNN-based generative model
  (LSTM/GRU) that can produce stroke sequences represented as (x, y, pen_state) tuples
  from input text while maintaining natural timing.

- **Style conditioning & personalization:** Introduce a way to condition the generation on a
  style embedding. This will allow for the creation of multiple handwriting styles and support
  few-shot style cloning from a small number of sample strokes.

- **Reinforcement learning fine-tuning:** Use reinforcement learning techniques to fine-
  tune the generator. This will involve reward functions that assess style similarity, stroke
  smoothness, legibility, and other qualities to improve the match with target styles.

- **Rendering & export:** Set up a rendering process that converts stroke sequences into high-
  quality SVG and raster images. These images will be suitable for display, printing, or
  further processing.

- **User interface & demo:** Create a simple interface or demo script that lets users input text,
  choose or upload a handwriting sample, and receive downloadable synthesized
  handwriting outputs.

- **Evaluation & metrics:** Create methods for both quantitative and qualitative evaluation.
  This will include stroke-level loss, sequence likelihood, and perceptual/human evaluation
  studies. Additionally, establish clear metrics, such as stroke MSE, structural similarity, and
  user preference studies, to assess performance and style matching.

## 1.3 Purpose, Scope and Applicability

### 1.3.1 Purpose

The goal of this project is to research, design, and build a practical handwriting synthesis system.
It combines sequence modeling and reinforcement learning to create realistic and personalized
handwriting.

The system aims to:

- Produce natural-looking handwriting for digital text while keeping it readable.
- Allow users to replicate a person's style using just a few sample strokes.
- Offer a flexible platform for various applications, such as assistive communication,
  personalized note rendering, enhancing historical documents, and creative uses like digital
  stationery and art.

### 1.3.2 Scope

The project will focus on the following functional and technical boundaries:

**In-scope:**

- Development of an RNN-based stroke generator (LSTM/GRU) and an MDN or similar
  output head to model continuous pen movements.

- Style conditioning: learning and applying style embeddings to control generation.
- RL-based fine-tuning stage where reward functions encourage stylistic fidelity and stroke
  quality.

- Data preprocessing pipeline for online handwriting datasets (e.g., IAM-OnDB, IWFHR, or
  similar), including deterministic conversion to stroke sequences and train, validation, and
  test splits.

- Rendering module to convert strokes to SVG and PNG outputs.
- A demo interface (CLI or minimal web page) to input text, choose style, and download
  outputs.

- Evaluation scripts and basic user study guidelines for perceptual evaluation.

**Out of scope:**

- Full end-to-end training of very large transformer-based handwriting synthesis models,
  which may be suggested as future work.

- Heavy productionization concerns, such as distributed training or model serving at scale.
- Use of synthetic fonts as the main training data; synthetic data may be used only as optional
  augmentation, not primary training data.

- OCR or handwriting recognition features unless used only for metric comparisons in
  evaluation.

### 1.3.3 Applicability

The system and methods developed in this project can be used in various practical and research
situations:

- Assistive Technology: Provide personalized handwriting output for users with motor
  impairments who want to keep a personal handwriting style in digital communications or
  printed materials.

- Digital Note-taking & Personalization: Work with note-taking apps or digital stationery
  tools to convert typed text into handwriting styles that users prefer.

- Historical Document Restoration & Simulation: Help in recreating or simulating
  handwriting styles for archival research, annotations, or restoration tasks.

- Creative & Commercial Applications: Create stylized handwritten content for
  marketing, greetings, or any creative field where unique handwriting is appreciated.

- Research & Education: Act as a testbed for experiments in sequence modeling, style
  transfer, and reinforcement learning for generative tasks.

The project will provide a reproducible research artifact that includes a codebase, trained smaller-
scale models, data processing scripts, and evaluation notebooks. This artifact can be expanded into
full-scale training or integrated into applications with additional engineering work.
