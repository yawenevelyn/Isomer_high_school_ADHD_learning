# Isomer — RAG-Powered Learning Platform for High School Teachers

Isomer is an **AI for High School Teachers** course project: a RAG-powered learning platform that turns textbook content into an interactive, ADHD-friendly mind map with **grounded** retrieval so the AI answers only from the textbook (no “generic” or wrong-topic answers).

---

## Project Objectives

| Objective | Description |
|-----------|-------------|
| **A. High-fidelity content** | Use textbook content with structure preserved (formulas, tables). |
| **B. Grounded RAG** | Retrieval-augmented generation so the AI uses the textbook as the **only** source of truth. |
| **C. ADHD-centric adaptation** | Interactive chunking, bullet summaries, key terms, and “Check for Understanding” questions. |
| **D. Teacher-in-the-loop** | Dashboard to review **original** vs **adapted (Isomer)** content before students see it. |

---

## Features

- **Topic/chapter selection** — Choose a chapter from the dropdown (six topics in the default demo). Mind map, node details, and chat are **grounded** in that chapter via RAG.
- **Generate mind map** — Builds a DAG (8–12 nodes) from the selected chapter or full material. Node labels are aligned with concepts in the source so each node has supporting content.
- **Node details** — “Extract Node Details” uses RAG to retrieve chunks for the node/chapter and streams a focused section. The prompt asks for relevant content even when the node label is not an exact heading, so nodes stay informative.
- **Grounded chat** — Chat answers from retrieved textbook chunks. Retrieval uses the user’s question plus the current node name; if that returns nothing, the app falls back to all chunks for the selected chapter so the model always has context. “The textbook does not cover this” is used only when the question is clearly outside the provided context.
- **Checking questions** — 4-option MCQ per node with explanation.
- **Teacher dashboard** — `/teacher`: pick a chapter, view **original** textbook chunks and **Isomer (adapted)** versions (bullets, key terms, check question) side-by-side for scientific truth review.

---

## Data source (default demo)

The project ships with **`public/isomer_demo_textbook.txt`**, a short multi-topic source used for the demo. It has six chapters, each with a clear heading and a few paragraphs:

| Chapter | Content summary |
|---------|------------------|
| Primes and modular arithmetic | Prime definition, Fundamental Theorem, Sieve of Eratosthenes, modular arithmetic and inverses |
| Logic | Implications, truth tables, Boolean algebra, De Morgan’s theorems |
| Mathematical proofs | Theorems, direct proof, induction, proof by contradiction |
| Infinity and infinite processes | Countability, uncountable sets, Cantor’s diagonal argument |
| Basic counting | Permutations, combinations, factorial |
| Complex numbers | Imaginary unit *i*, form *a* + *bi*, arithmetic, Argand plane |

Ingesting this file (`python ingest.py "..\public\isomer_demo_textbook.txt"`) populates the **Topic / Chapter (RAG)** dropdown and grounds mind map, node details, and chat on these topics. The full textbook `High_School_Mathematics_Extensions.txt` is optional and can be ingested instead or as well.

---

## Tech Stack

| Area | Stack |
|------|--------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4, React Flow |
| AI | Vercel AI SDK, OpenAI (gpt-4o-mini, gpt-4o) |
| RAG backend | Python FastAPI, ChromaDB, OpenAI text-embedding-3-small, LangChain text splitter |

---

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+ (for RAG backend)
- **OpenAI API key** (frontend and backend)

---

## How to Run

### Run pipeline (full demo — do this when asked to "run the project")

1. **Start the Next.js frontend**  
   From the folder that contains `package.json` (`Isomer_high_school_ADHD_learning`):
   ```bash
   cd Isomer_high_school_ADHD_learning
   npm run dev
   ```
   (Run in background if needed.) Note the URL (e.g. http://localhost:3000 or 3001).

2. **Ingest the demo textbook and start the RAG backend**  
   In a separate terminal:
   ```bash
   cd Isomer_high_school_ADHD_learning/backend
   .\venv\Scripts\Activate.ps1
   $env:OPENAI_API_KEY = "sk-your-actual-key-here"
   python ingest.py "..\public\isomer_demo_textbook.txt"
   uvicorn main:app --reload --port 8000
   ```
   (Ingest only when changing the data source; run uvicorn in background so it stays up.)

3. **Use the app**  
   Open the frontend URL. Use the **Topic / Chapter (RAG)** dropdown (e.g. Primes and modular arithmetic, Logic, Mathematical proofs, Infinity and infinite processes, Basic counting, Complex numbers), click **Generate Interactive Mind Map**, then use node details, checking questions, chat, and **Teacher dashboard** (`/teacher`).

---

### 1. Frontend (Next.js)

```bash
cd Isomer_high_school_ADHD_learning
npm install
```

Create `.env.local` in the project root:

```env
OPENAI_API_KEY=sk-your-key-here
```

```bash
npm run dev
```

Open the URL shown in the terminal (e.g. [http://localhost:3000](http://localhost:3000) or **http://localhost:3001** if 3000 is in use). Without the RAG backend you can still generate mind maps from the demo or full text file; the chapter dropdown appears when the RAG backend is running.

### 2. RAG backend (Python) — required for grounded retrieval and teacher dashboard

```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
```

Set the same API key:

```bash
# Windows (PowerShell)
$env:OPENAI_API_KEY="sk-your-key-here"

# macOS/Linux
export OPENAI_API_KEY=sk-your-key-here
```

**Ingest the demo textbook (recommended for the 6-topic demo):**

```bash
python ingest.py "..\public\isomer_demo_textbook.txt"
```

Or ingest the full textbook:

```bash
python ingest.py
```
(Default path: `../public/High_School_Mathematics_Extensions.txt`.)

**Start the FastAPI server:**

```bash
uvicorn main:app --reload --port 8000
```

Leave it running. The Next.js app will call `http://localhost:8000` (or `RAG_API_URL` if set).

### 3. Verify RAG (optional)

From `backend/` with the venv active:

```bash
python verify_rag.py
```

This lists chapters in the DB and runs sample retrievals (by chapter and by semantic query) so you can confirm the right chapters are returned.

### 4. Use the app

- On the main page, if the RAG backend is running you’ll see a **Topic / Chapter (RAG)** dropdown with the six demo topics. Select a chapter (e.g. “Complex numbers”).
- Click **Generate Interactive Mind Map** — the map is built from that chapter’s chunks only.
- Click a node → **Extract Node Details** (RAG) and **Chat** (grounded) both use the selected chapter. Chat uses your question plus the node name for retrieval and falls back to the full chapter if needed.
- Open **Teacher dashboard** (link on the main page or `/teacher`) to review original vs adapted chunks.

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` / `npm run start` | Production build and run |
| `npm run lint` | ESLint |
| `python backend/ingest.py` | Ingest textbook into ChromaDB |
| `python backend/verify_rag.py` | Verify RAG retrieval |

---

## Project Structure

```
Isomer_high_school_ADHD_learning/
├── app/
│   ├── api/
│   │   ├── chapters/route.ts         # GET: list chapters (from RAG backend)
│   │   ├── flowchart/
│   │   │   ├── route.ts              # POST: flowchart (optional chapter → RAG)
│   │   │   ├── node-details/route.ts # POST: node details (RAG)
│   │   │   ├── chat/route.ts         # POST: grounded chat (RAG)
│   │   │   ├── transform/route.ts    # POST: ADHD transform (proxy to backend)
│   │   │   └── checking-question/   # POST: MCQ for node
│   │   └── teacher/chunks/route.ts   # GET: chunks for teacher dashboard
│   ├── teacher/page.tsx              # Teacher dashboard (original vs adapted)
│   ├── components/                   # flowchart-chat, checking-question, memoized-markdown
│   ├── page.tsx                      # Main mind map page
│   └── ...
├── backend/
│   ├── main.py                       # FastAPI: /chapters, /retrieve, /chat, /transform, /ingest
│   ├── rag_service.py                # ChromaDB, TextbookChunk, ingest, retrieve, grounded response, ADHD transform
│   ├── ingest.py                     # CLI: ingest textbook into ChromaDB
│   ├── verify_rag.py                 # Verification script for RAG retrieval
│   ├── requirements.txt
│   └── chroma_db/                    # Created after first ingest
├── public/
│   ├── isomer_demo_textbook.txt      # Default demo: 6 topics (Primes, Logic, Proofs, Infinity, Counting, Complex numbers)
│   └── High_School_Mathematics_Extensions.txt   # Optional full textbook
├── .env.local                        # OPENAI_API_KEY
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key (frontend + backend) |
| `RAG_API_URL` | No | Default `http://localhost:8000` (FastAPI RAG backend) |

---

## Data flow (RAG)

1. **Ingest** — Textbook text (e.g. `isomer_demo_textbook.txt`) → split by chapter headers (demo-style or full-book) → `RecursiveCharacterTextSplitter` → embed with `text-embedding-3-small` → store in ChromaDB with metadata `chapter_title`.
2. **Mind map** — User selects chapter → frontend POSTs `chapter_title` → Next.js calls backend `/retrieve` with `chapter_title` → flowchart is generated from those chunks only. Prompt asks for node labels that match concepts in the material.
3. **Node details** — Retrieve by node name + chapter → stream an extraction/summary from those chunks; prompt asks for relevant content even when the node label is not an exact heading.
4. **Chat** — User message + node name + chapter → `/retrieve` (semantic query + chapter filter). If no chunks returned, fallback `/retrieve` with empty query and same chapter to load full chapter. Context is passed to the model; answer uses only context; “The textbook does not cover this” only when the question is clearly outside that context.

---

## License

See [LICENSE](LICENSE) in the repository.
