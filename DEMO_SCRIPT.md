# Isomer Demo Script — Full Feature Walkthrough

Use this script to showcase every feature in order. Run the app first (see README), then follow the steps below.

---

## Before You Start

- **Frontend:** http://localhost:3000 (or 3001)
- **RAG backend:** running on port 8000
- **Browser:** one tab on the main app, optional second tab for Teacher dashboard

---

## 1. Topic Selection & Mind Map (RAG-Grounded)

**What you’re showing:** Topic-scoped retrieval; mind map built only from the selected chapter.

**Steps:**

1. Point out: *“The dropdown is populated from our RAG backend—each option is a chapter in the ingested textbook.”*
2. Select **“Complex numbers”** from **Topic / Chapter (RAG)**.
3. Click **“Generate Interactive Mind Map.”**
4. While it loads: *“The system retrieves only chunks tagged with ‘Complex numbers’ and asks the LLM to build a DAG from that content, so nodes match the material.”*
5. When the map appears: *“We get 8–12 nodes in five layers: overview, foundations, core concepts, practice, review. Each label is grounded in the retrieved text.”*
6. Briefly point out one or two nodes (e.g. “Imaginary unit i,” “Arithmetic of complex numbers”).

**Talking point:** *“This avoids the earlier problem where selecting ‘Trigonometry’ could return ‘Complex numbers’—we filter by chapter in the vector store.”*

---

## 2. Node Details (Extract & Summarize)

**What you’re showing:** RAG retrieval by node + chapter; streaming extraction that always tries to give relevant content.

**Steps:**

1. Click the node **“Core concepts: Arithmetic of complex numbers”** (or any core-concept node).
2. In the right panel, click **“Extract Node Details.”**
3. As it streams: *“The backend retrieves chunks for this node and chapter, then the model extracts or summarizes only from that context—no generic math from other topics.”*
4. When done: *“If the node label isn’t an exact heading in the text, the prompt still asks for the closest relevant content, so we don’t get ‘the textbook does not cover this’ when the material clearly does.”*

**Talking point:** *“Everything you see is grounded in the OER; we don’t hallucinate steps or formulas.”*

---

## 3. Checking Question (Self-Assessment)

**What you’re showing:** Per-node MCQ generation from the same grounded context.

**Steps:**

1. With the same node selected, scroll to the **“Generate Checking Question”** / checking-question section.
2. Click to generate a 4-option question.
3. After it appears, select an answer and submit.
4. Point out the correctness feedback and short explanation.

**Talking point:** *“The question and explanation are generated from the retrieved node content, so they stay aligned with what the student just read.”*

---

## 4. Chat (Grounded Q&A)

**What you’re showing:** Chat answers only from retrieved chunks; fallback to full chapter when needed.

**Steps:**

1. With a node still selected, switch to the **“Chat”** tab.
2. Ask: *“Explain arithmetic of complex numbers in simple terms.”*
3. Show the answer: *“The model used the chapter chunks we retrieved—combining your question and the node name—and answered only from that context.”*
4. Optionally ask something off-topic (e.g. “What about trigonometry?”) and point out: *“If the question isn’t in the context, it correctly says ‘The textbook does not cover this.’”*

**Talking point:** *“We first try semantic retrieval with your question and the node name; if that returns nothing, we fall back to all chunks for the chapter so the student still gets a grounded answer.”*

---

## 5. Mark as Done (Progress)

**What you’re showing:** Simple progress tracking for ADHD-friendly pacing.

**Steps:**

1. Click **“Mark as Done”** on the current node.
2. Point out the node turns green and the edge styling (incoming/outgoing highlight).

**Talking point:** *“Students can track which nodes they’ve completed, which helps with executive function and motivation.”*

---

## 6. Teacher Dashboard (Original vs Adapted)

**What you’re showing:** Teacher-in-the-loop validation; original text vs ADHD-adapted Isomer version.

**Steps:**

1. Open the **Teacher dashboard** (link on the main page or go to **/teacher**).
2. Select a chapter from the dropdown (e.g. **“Logic”**).
3. When chunks load: *“Teachers see the original textbook chunks on the left.”*
4. For one chunk, click **“Generate adapted version.”**
5. When it appears: *“On the right we show the Isomer version: bulleted summary, key terms, and a check-for-understanding question. Teachers can compare to ensure we didn’t distort the content.”*

**Talking point:** *“This supports our objective of scientific truth: teachers verify the adapted material before students see it.”*

---

## 7. Second Topic (Optional)

**What you’re showing:** Same pipeline for another chapter.

**Steps:**

1. Go back to the main app.
2. Select **“Primes and modular arithmetic”** (or **“Mathematical proofs”**).
3. Generate the mind map again.
4. Click one node and briefly show **Extract Node Details** and/or **Chat** again.

**Talking point:** *“The same RAG pipeline works for any ingested chapter; we’re not hard-coding topics.”*

---

## Quick Reference — Features in Order

| # | Feature              | Where              | Key point                          |
|---|----------------------|--------------------|------------------------------------|
| 1 | Topic + Mind map     | Main, dropdown + button | RAG filter by chapter          |
| 2 | Node details         | Right panel, “Extract Node Details” | Grounded extraction/summary |
| 3 | Checking question    | Same panel, MCQ    | Self-assessment from node content  |
| 4 | Chat                 | Chat tab           | Grounded Q&A + fallback            |
| 5 | Mark as Done         | “Mark as Done” btn | Progress tracking                  |
| 6 | Teacher dashboard    | /teacher           | Original vs adapted review         |
| 7 | Second topic         | Dropdown + generate| Same pipeline, different chapter   |

---

## If Something Fails

- **Dropdown empty:** RAG backend not running or ingest not done. Run `python ingest.py "..\public\isomer_demo_textbook.txt"` and restart uvicorn.
- **“Textbook does not cover this” in chat:** Refresh and try again; fallback should load full chapter. If it persists, check backend logs for 500s on `/retrieve`.
- **Node details empty:** Ensure a chapter is selected and the backend is up; try “Extract Node Details” again.
