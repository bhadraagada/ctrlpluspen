# Module 5: Program Listing

---

## 5.1 Cost Estimation

### User Inputs:

1. User Registration & Profile Setup
2. Login (Google OAuth / Email)
3. Text Input for Handwriting Synthesis (up to 1600 characters)
4. Style Selection (0-12 handwriting styles)
5. Bias/Neatness Adjustment (0.0-1.5 range)
6. Stroke Color Selection (color picker)
7. Stroke Width Adjustment (1-5 pixels)
8. Paper Type Selection (white, cream, aged, lined, grid, recycled)
9. Ink Type Selection (ballpoint, gel, fountain, marker, pencil)
10. Wear Level Adjustment (0.0-1.0)
11. Batch Generation Configuration (multiple styles)
12. Gallery Filtering & Search
13. Favorite/Tag Management

### User Outputs:

1. Generated Handwriting SVG Display
2. Realistic PNG Rendering Preview
3. Gallery Grid View with Thumbnails
4. Download Options (SVG/PNG/PDF)
5. Credit Balance Display
6. Generation Status Indicators
7. Batch Job Progress Tracking
8. Error Messages & Validation Feedback

### User Enquiries:

1. Search Gallery (by text, tags, date)
2. Filter by Style/Status
3. View Generation Details
4. Check Credit Balance

### Number of Files (Internal Logical Files):

1. Users
2. SavedGenerations
3. BatchJobs
4. SynthesisUsage
5. Accounts (OAuth)
6. Sessions

### Number of External Interfaces:

1. Authentication Provider (Google OAuth 2.0)
2. Handwriting Synthesis API (Python FastAPI)
3. File Storage Provider (UploadThing)
4. Background Job Processor (Inngest)

---

### Domain Characteristic Table

| MEASUREMENT PARAMETER | COUNT (value >= 0) | WEIGHTING FACTOR |
|-----------------------|-------------------|------------------|
|                       |                   | Simple | Average | Complex |
| Number of User Inputs | 13 | | | X |
| Number of User Outputs | 8 | | X | |
| Number of User Inquiries | 4 | | | X |
| Number of Files | 6 | | X | |
| Number of External Interfaces | 4 | | | X |

---

### Complexity Adjustment Table

| ITEM | COMPLEXITY ADJUSTMENT QUESTIONS | SCALE (0-5) |
|------|--------------------------------|-------------|
| 1 | Does the system require reliable backup and recovery? | 4 |
| 2 | Are data communications required? | 5 |
| 3 | Are there distributed processing functions? | 5 |
| 4 | Is performance critical? | 4 |
| 5 | Will the system run in an existing, heavily utilized operational environment? | 3 |
| 6 | Does the system require on-line data entry? | 5 |
| 7 | Does the on-line data entry require the input transaction to be built over multiple screens or operations? | 4 |
| 8 | Are the master files updated on-line? | 5 |
| 9 | Are the inputs, outputs, files or inquiries complex? | 4 |
| 10 | Is the internal processing complex? | 5 |
| 11 | Is the code to be designed reusable? | 5 |
| 12 | Are conversion and installation included in the design? | 4 |
| 13 | Is the system designed for multiple installations in different organizations? | 3 |
| 14 | Is the application designed to facilitate change and ease of use by the user? | 5 |

**Total Complexity Adjustment Factor (CAF):** 61

---

### Function Point Calculation

**Unadjusted Function Points (UFP):**

| Parameter | Count | Simple | Average | Complex | Total |
|-----------|-------|--------|---------|---------|-------|
| User Inputs | 13 | - | - | 13 x 6 | 78 |
| User Outputs | 8 | - | 8 x 5 | - | 40 |
| User Inquiries | 4 | - | - | 4 x 6 | 24 |
| Files | 6 | - | 6 x 10 | - | 60 |
| External Interfaces | 4 | - | - | 4 x 10 | 40 |
| **UFP Total** | | | | | **242** |

**Value Adjustment Factor (VAF):**
VAF = 0.65 + (0.01 x CAF) = 0.65 + (0.01 x 61) = **1.26**

**Adjusted Function Points (AFP):**
AFP = UFP x VAF = 242 x 1.26 = **305.0**

---

**RESULT**

| PROJECT FUNCTION POINTS | 305.0 |
|------------------------|-------|

---

## 5.2 Schema Design

### Database Tables Overview

The application uses PostgreSQL with Prisma ORM. The schema consists of the following main tables:

- _prisma_migrations
- accounts
- users
- saved_generations
- batch_jobs
- synthesis_usage
- sessions
- verification_tokens

---

### Users Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| name | VARCHAR(255) | NULLABLE | Display name |
| email | VARCHAR(255) | UNIQUE, NULLABLE | Email address |
| emailVerified | TIMESTAMP | NULLABLE | Verification date |
| image | VARCHAR(500) | NULLABLE | Profile image URL |
| password | VARCHAR(255) | NULLABLE | Bcrypt hashed password |
| credits | INTEGER | DEFAULT 10 | Available synthesis credits |
| createdAt | TIMESTAMP | DEFAULT NOW() | Account creation |
| updatedAt | TIMESTAMP | ON UPDATE | Last modification |

---

### SavedGenerations Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| userId | VARCHAR(25) | FOREIGN KEY -> Users | Owner reference |
| status | ENUM | DEFAULT 'COMPLETED' | PENDING, GENERATING, COMPLETED, FAILED |
| text | TEXT | NOT NULL | Input text content |
| style | INTEGER | NOT NULL | Style index (0-12) |
| bias | FLOAT | NOT NULL | Neatness value (0.0-1.5) |
| strokeColor | VARCHAR(50) | DEFAULT 'black' | CSS color value |
| strokeWidth | INTEGER | DEFAULT 2 | Stroke width (1-5) |
| fileUrl | VARCHAR(500) | NULLABLE | UploadThing URL |
| fileKey | VARCHAR(100) | UNIQUE, NULLABLE | UploadThing file key |
| svgContent | TEXT | NULLABLE | Raw SVG markup |
| realisticPng | TEXT | NULLABLE | Base64 encoded PNG |
| paperType | VARCHAR(20) | NULLABLE | Paper type identifier |
| inkType | VARCHAR(20) | NULLABLE | Ink type identifier |
| wearLevel | FLOAT | NULLABLE | Degradation (0.0-1.0) |
| isFavorite | BOOLEAN | DEFAULT FALSE | Favorite flag |
| tags | TEXT[] | DEFAULT [] | Array of tag strings |
| batchJobId | VARCHAR(25) | FOREIGN KEY -> BatchJobs | Batch reference |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:** userId, status, batchJobId

---

### BatchJobs Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| userId | VARCHAR(25) | FOREIGN KEY -> Users | Owner reference |
| name | VARCHAR(255) | NULLABLE | Job display name |
| text | TEXT | NOT NULL | Source text |
| totalVariants | INTEGER | NOT NULL | Number of variants |
| creditsUsed | INTEGER | DEFAULT 0 | Credits consumed |
| status | ENUM | DEFAULT 'PENDING' | PENDING, PROCESSING, COMPLETED, FAILED |
| completedCount | INTEGER | DEFAULT 0 | Completed count |
| createdAt | TIMESTAMP | DEFAULT NOW() | Creation timestamp |

**Indexes:** userId, status

---

### SynthesisUsage Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| userId | VARCHAR(25) | FOREIGN KEY -> Users | User reference |
| creditsUsed | INTEGER | NOT NULL | Credits consumed |
| linesCount | INTEGER | NOT NULL | Lines generated |
| charactersCount | INTEGER | NOT NULL | Characters processed |
| style | INTEGER | NOT NULL | Style used |
| bias | FLOAT | NOT NULL | Bias value |
| success | BOOLEAN | DEFAULT TRUE | Success status |
| createdAt | TIMESTAMP | DEFAULT NOW() | Usage timestamp |

**Indexes:** userId, createdAt

---

### Accounts Table (OAuth)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| userId | VARCHAR(25) | FOREIGN KEY -> Users | User reference |
| type | VARCHAR(50) | NOT NULL | Account type |
| provider | VARCHAR(50) | NOT NULL | OAuth provider |
| providerAccountId | VARCHAR(255) | NOT NULL | Provider's user ID |
| access_token | TEXT | NULLABLE | OAuth access token |
| refresh_token | TEXT | NULLABLE | OAuth refresh token |
| expires_at | INTEGER | NULLABLE | Token expiration |
| token_type | VARCHAR(50) | NULLABLE | Token type |
| scope | VARCHAR(255) | NULLABLE | OAuth scopes |
| id_token | TEXT | NULLABLE | ID token |

**Unique Constraint:** (provider, providerAccountId)

---

### Sessions Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(25) | PRIMARY KEY | CUID identifier |
| sessionToken | VARCHAR(255) | UNIQUE | Session token |
| userId | VARCHAR(25) | FOREIGN KEY -> Users | User reference |
| expires | TIMESTAMP | NOT NULL | Expiration time |

---

### Entity Relationship Diagram

```
┌─────────────────┐       ┌──────────────────────┐
│     Users       │       │      Accounts        │
├─────────────────┤       ├──────────────────────┤
│ id (PK)         │──┐    │ id (PK)              │
│ name            │  │    │ userId (FK) ─────────┼──┐
│ email           │  │    │ provider             │  │
│ password        │  │    │ providerAccountId    │  │
│ credits         │  │    │ access_token         │  │
│ createdAt       │  │    │ refresh_token        │  │
│ updatedAt       │  │    └──────────────────────┘  │
└─────────────────┘  │                              │
         │           │    ┌──────────────────────┐  │
         │           └────┤     Sessions         │  │
         │                ├──────────────────────┤  │
         │                │ id (PK)              │  │
         │                │ userId (FK) ─────────┼──┤
         │                │ sessionToken         │  │
         │                │ expires              │  │
         │                └──────────────────────┘  │
         │                                          │
         ▼                                          │
┌─────────────────┐       ┌──────────────────────┐  │
│   BatchJobs     │       │  SavedGenerations    │  │
├─────────────────┤       ├──────────────────────┤  │
│ id (PK)         │──┐    │ id (PK)              │  │
│ userId (FK) ────┼──┼────│ userId (FK) ─────────┼──┤
│ name            │  │    │ batchJobId (FK) ─────┼──┘
│ text            │  │    │ status               │
│ totalVariants   │  │    │ text                 │
│ creditsUsed     │  │    │ style                │
│ status          │  │    │ bias                 │
│ completedCount  │  │    │ strokeColor          │
│ createdAt       │  │    │ svgContent           │
└─────────────────┘  │    │ realisticPng         │
                     │    │ isFavorite           │
                     │    │ tags                 │
                     │    │ createdAt            │
                     │    └──────────────────────┘
                     │
                     │    ┌──────────────────────┐
                     │    │   SynthesisUsage     │
                     │    ├──────────────────────┤
                     │    │ id (PK)              │
                     └────│ userId (FK)          │
                          │ creditsUsed          │
                          │ linesCount           │
                          │ charactersCount      │
                          │ style                │
                          │ bias                 │
                          │ success              │
                          │ createdAt            │
                          └──────────────────────┘
```

---

## 5.3 User Manual With Screenshots

### 5.3.1 Getting Started

**Registration:**
1. Navigate to the application URL
2. Click "Sign Up" button
3. Enter your full name, email, and password
4. Alternatively, click "Continue with Google" for OAuth login
5. Upon successful registration, you receive 10 free credits

**Login:**
1. Navigate to the login page
2. Enter your email and password
3. Click "Sign In" or use Google OAuth
4. You will be redirected to the dashboard

---

### 5.3.2 Generating Handwriting

**Step 1: Enter Text**
- Navigate to the "Synthesis" tab on the dashboard
- Enter your text in the text area (maximum 1600 characters)
- Text supports multiple lines (up to 20 lines, 75 characters per line)
- Supported characters: a-z, A-Z (except Q, X, Z), 0-9, common punctuation

**Step 2: Configure Style Options**
- **Style Selection:** Choose from 13 unique handwriting styles (0-12)
- **Bias/Neatness:** Adjust the slider (0.0 = messy, 1.5 = very neat)
- **Stroke Color:** Click the color picker to select ink color
- **Stroke Width:** Adjust stroke thickness (1-5 pixels)

**Step 3: Generate**
- Click the "Generate Handwriting" button
- Wait for the synthesis to complete (typically 2-5 seconds)
- The generated handwriting SVG will appear in the preview area
- 1 credit is deducted per generation

**Step 4: Save or Download**
- Click "Save to Gallery" to store the generation
- Click "Download SVG" to download the vector file
- Click "Download PNG" to download as an image

---

### 5.3.3 Realistic Rendering

**Make it Look Handwritten:**
1. From the gallery, select a saved generation
2. Click "Make Realistic" button
3. Configure realistic rendering options:
   - **Paper Type:** white, cream, aged, lined, grid, recycled
   - **Ink Type:** ballpoint, gel, fountain, marker, pencil
   - **Wear Level:** 0.0 (pristine) to 1.0 (heavily worn)
4. Click "Apply" to generate the realistic PNG
5. Download the realistic version

---

### 5.3.4 Batch Generation

**Generate Multiple Variants:**
1. Navigate to "Batch" tab
2. Enter your text content
3. Select multiple styles you want to generate
4. Configure other parameters (bias, colors)
5. Click "Generate Batch"
6. Monitor progress in the batch jobs panel
7. View all variants in the gallery when complete

**Note:** Batch generation requires sufficient credits for all selected variants.

---

### 5.3.5 Gallery Management

**Viewing Generations:**
- Access the "Gallery" tab to see all saved generations
- Use grid or list view toggle
- Filter by: All, Favorites, By Style, By Date

**Managing Generations:**
- Click the heart icon to mark as favorite
- Click the tag icon to add tags
- Click the trash icon to delete
- Click on a generation to view details

**Search:**
- Use the search bar to find generations by text content
- Filter by tags using the tag dropdown
- Sort by date (newest/oldest)

---

### 5.3.6 Credits System

**Checking Balance:**
- Your credit balance is displayed in the navigation bar
- Each synthesis generation costs 1 credit
- New users receive 10 free credits

**Managing Credits:**
- Navigate to "Credits" or "Settings" page
- View usage history
- Purchase additional credits if needed

---

## 5.4 Test Cases Design

### 5.4.1 Authentication Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_001 | Verify user registration with valid details | User does not exist | 1) Open registration page. 2) Enter valid full name, email, password. 3) Submit form. | New user is created with unique userId; createdAt set to current time; credits = 10 | As expected | Pass |
| TC_002 | Verify registration fails for duplicate email | A user with same email exists | 1) Open registration page. 2) Enter existing email + valid details. 3) Submit. | Registration rejected; "email already in use" error shown. | As expected | Pass |
| TC_003 | Verify login with valid credentials | User account exists and verified | 1) Open login. 2) Enter valid email & password (or Google OAuth). 3) Submit. | User session created; redirected to Dashboard. | As expected | Pass |
| TC_004 | Verify login fails with wrong password | User exists | 1) Open login. 2) Enter valid email + wrong password. 3) Submit. | Error shown; no session created. | As expected | Pass |
| TC_005 | Verify Google OAuth login | User has Google account | 1) Click "Continue with Google". 2) Complete OAuth flow. | User authenticated; account linked if new. | As expected | Pass |

---

### 5.4.2 Synthesis Generation Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_006 | Generate handwriting with valid text | User logged in; credits > 0 | 1) Enter "Hello World". 2) Select style 9. 3) Click Generate. | SVG generated; displayed in preview; 1 credit deducted. | As expected | Pass |
| TC_007 | Verify empty text rejection | User logged in | 1) Leave text field empty. 2) Click Generate. | Validation error: "Text cannot be empty" | As expected | Pass |
| TC_008 | Verify invalid character rejection | User logged in | 1) Enter "Hello @World". 2) Click Generate. | Validation error listing invalid characters. | As expected | Pass |
| TC_009 | Verify line limit enforcement | User logged in | 1) Enter text with 25 lines. 2) Click Generate. | Validation error: "Maximum 20 lines allowed" | As expected | Pass |
| TC_010 | Verify character limit per line | User logged in | 1) Enter line with 80 characters. 2) Click Generate. | Validation error: "Line exceeds 75 characters" | As expected | Pass |
| TC_011 | Verify insufficient credits error | User logged in; credits = 0 | 1) Enter valid text. 2) Click Generate. | Error: "Insufficient credits"; generation blocked. | As expected | Pass |
| TC_012 | Verify style range (0-12) | User logged in | 1) Attempt style = 15 via API. | Validation error: style must be 0-12 | As expected | Pass |
| TC_013 | Verify bias range (0.0-1.5) | User logged in | 1) Set bias = 2.0. 2) Click Generate. | Validation error: bias must be 0.0-1.5 | As expected | Pass |

---

### 5.4.3 Gallery Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_014 | Save generation to gallery | User logged in; generation exists | 1) Generate handwriting. 2) Click "Save to Gallery". | Generation saved with unique id; appears in gallery. | As expected | Pass |
| TC_015 | View gallery items | User logged in; has saved items | 1) Navigate to Gallery tab. | All user's generations displayed in grid view. | As expected | Pass |
| TC_016 | Mark generation as favorite | User logged in; item exists | 1) Click heart icon on item. | isFavorite set to true; icon filled. | As expected | Pass |
| TC_017 | Add tags to generation | User logged in; item exists | 1) Click tag icon. 2) Enter "important". 3) Save. | Tag added to generation's tags array. | As expected | Pass |
| TC_018 | Delete generation | User logged in; item exists | 1) Click trash icon. 2) Confirm deletion. | Generation removed from database; removed from view. | As expected | Pass |
| TC_019 | Filter by favorites | User has favorites | 1) Click "Favorites" filter. | Only items with isFavorite=true shown. | As expected | Pass |
| TC_020 | Search generations by text | User has generations | 1) Enter search term. 2) Press Enter. | Only matching generations displayed. | As expected | Pass |

---

### 5.4.4 Realistic Rendering Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_021 | Apply realistic rendering | User logged in; generation saved | 1) Select generation. 2) Click "Make Realistic". 3) Select paper=cream, ink=ballpoint. 4) Apply. | Realistic PNG generated; realisticPng field populated. | As expected | Pass |
| TC_022 | Verify paper type options | User on realistic modal | 1) Open paper type dropdown. | Options: white, cream, aged, lined, grid, recycled. | As expected | Pass |
| TC_023 | Verify ink type options | User on realistic modal | 1) Open ink type dropdown. | Options: ballpoint, gel, fountain, marker, pencil. | As expected | Pass |
| TC_024 | Verify wear level bounds | User on realistic modal | 1) Adjust wear level slider. | Slider constrained to 0.0-1.0 range. | As expected | Pass |
| TC_025 | Download realistic PNG | Realistic rendering complete | 1) Click "Download PNG". | PNG file downloaded with paper texture and ink effects. | As expected | Pass |

---

### 5.4.5 Batch Processing Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_026 | Create batch job | User logged in; credits >= variants | 1) Enter text. 2) Select 3 styles. 3) Click "Generate Batch". | BatchJob created with status=PENDING; 3 generations queued. | As expected | Pass |
| TC_027 | Verify batch progress tracking | Batch job processing | 1) View batch jobs panel. | Progress bar updates; completedCount increments. | As expected | Pass |
| TC_028 | Verify batch completion | All variants generated | 1) Wait for batch to complete. | Status=COMPLETED; all generations in gallery. | As expected | Pass |
| TC_029 | Verify insufficient credits for batch | User credits < variants | 1) Select 5 styles. 2) Have only 3 credits. | Error: "Insufficient credits for batch"; job not created. | As expected | Pass |
| TC_030 | Verify variant limit (1-13) | User logged in | 1) Try to select 15 styles via API. | Validation error: max 13 variants allowed. | As expected | Pass |

---

### 5.4.6 API Integration Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_031 | Verify API health check | API server running | 1) GET /health endpoint. | Response: status=healthy, model info returned. | As expected | Pass |
| TC_032 | Verify unauthorized API access | No session token | 1) Call protected endpoint without auth. | 401 Unauthorized error returned. | As expected | Pass |
| TC_033 | Verify API rate limiting | Multiple rapid requests | 1) Send 100 requests in 10 seconds. | Rate limiting applied; 429 Too Many Requests after threshold. | As expected | Pass |
| TC_034 | Verify CORS configuration | Request from allowed origin | 1) Make request from frontend domain. | Request allowed; proper CORS headers returned. | As expected | Pass |
| TC_035 | Verify file upload limits | User uploading file | 1) Try to upload 10MB SVG file. | Error: file exceeds 4MB limit. | As expected | Pass |

---

### 5.4.7 Security Test Cases

| Test Case ID | Test Case Description | Pre-Conditions | Test Steps | Expected Result | Actual Result | Status |
|--------------|----------------------|----------------|------------|-----------------|---------------|--------|
| TC_036 | Verify ownership check on gallery | User A and User B exist | 1) User A tries to access User B's generation by ID. | NOT_FOUND error returned (not FORBIDDEN). | As expected | Pass |
| TC_037 | Verify password hashing | User registered | 1) Check database for password field. | Password stored as bcrypt hash, not plaintext. | As expected | Pass |
| TC_038 | Verify session expiration | Session exists | 1) Wait for session to expire. 2) Try to access protected route. | Redirect to login; session invalidated. | As expected | Pass |
| TC_039 | Verify XSS prevention | User logged in | 1) Enter `<script>alert('xss')</script>` as text. | Text escaped/sanitized; no script execution. | As expected | Pass |
| TC_040 | Verify SQL injection prevention | User logged in | 1) Enter `'; DROP TABLE users; --` as text. | Query parameterized; no SQL injection. | As expected | Pass |

---
