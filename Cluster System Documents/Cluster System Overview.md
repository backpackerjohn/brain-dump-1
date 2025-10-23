# AI Clustering System Design

## 1. Overview

The AI Clustering feature is designed to automatically group related "thoughts" from a user's brain dump into meaningful clusters. This system moves beyond simple keyword matching or pre-defined categories by using a large language model (LLM) to understand the semantic context and thematic links between disparate thoughts.

The core principles are:
- **Value-Driven Execution:** The system only suggests clustering when there's a meaningful number of thoughts to process, avoiding low-value, high-frequency API calls.
- **Scalability:** It is designed to handle a large volume of thoughts without degrading performance or user experience.
- **User Collaboration:** It empowers users to guide the AI, improving accuracy and making the system feel like a collaborative partner.
- **Cost-Effectiveness:** All design choices prioritize minimizing API token consumption while maximizing user value.

---

## 2. System Rules & Logic

### Rule #1: The Threshold Trigger

The AI clustering process is not always available. It is initiated based on a threshold to ensure meaningful work is performed.

- **Logic:** The "Generate Clusters" button/prompt will only appear in the UI when the user has **10 or more** unclustered thoughts.
- **Implementation:** A function will continuously monitor the count of thoughts that do not belong to any existing cluster. When `unclustered_count >= 10`, the UI state changes to display the call-to-action.
- **Rationale:** This prevents wasted API calls for one or two thoughts and batches the work into more contextually rich and cost-effective jobs.

### Rule #2: The Scalable Chunking Protocol

To handle hundreds or thousands of thoughts without hitting API rate limits or causing long wait times, the system will break large jobs into smaller chunks.

- **Logic:** If the number of unclustered thoughts is **over 200**, the system will process them in chunks of 200.
- **Process:**
    1.  **Chunk 1 (Thoughts 1-200):** Sent to the AI for initial clustering. The resulting cluster names are stored.
    2.  **Chunk 2 (Thoughts 201-400):** Sent to the AI with a modified prompt that includes the names of the clusters generated in the first chunk. The AI is instructed to either create new clusters or add thoughts to the *existing* ones.
    3.  This process repeats until all chunks are processed.
- **Rationale:** This keeps individual API requests small, fast, and within model limits. It also creates a more coherent final output by making the AI "aware" of its previous work, preventing the creation of redundant clusters (e.g., "Vacation Ideas" and "Holiday Planning").

### Rule #3: The Collaboration Loop (User-Seeded AI)

The system allows users to guide the AI for more precise, targeted clustering.

- **Logic:** When a user manually creates a new cluster and adds at least two thoughts to it, a contextual button like `[Find more related thoughts]` will appear within that cluster's UI.
- **Process:** Clicking this button triggers a specialized, low-cost API call.
    -   **Input:** The thoughts the user has already placed in the cluster (as positive examples) and the full list of unclustered thoughts.
    -   **Prompt:** The AI is given a simple matching task: `From the list of unclustered thoughts, which ones are thematically similar to these examples?`
- **Rationale:** This is the most cost-effective form of AI interaction. It leverages user intent to dramatically narrow the AI's task, resulting in faster, more accurate results and building user trust.

---

## 3. AI Instructions & Prompt Engineering

The quality of the clustering depends heavily on clear instructions for the AI.

### Main Clustering Prompt

This prompt is used for the primary "Generate Clusters" action.

```
You are an expert personal assistant specializing in organizing information. Your task is to analyze a list of a user's raw, unstructured thoughts and group them into meaningful, thematic clusters.

**Instructions:**
1.  **Analyze Holistically:** Read through all the provided thoughts to understand the main themes present.
2.  **Form Clusters:** Group thoughts that are clearly related by project, topic, goal, or context.
3.  **Name Clusters Concisely:** Create a short, descriptive name for each cluster (3-5 words max). The name should represent the core theme of the thoughts within it.
4.  **Be Discerning:** It is better to leave a thought unclustered than to force it into an irrelevant group. Do not create a "Miscellaneous" or "General" cluster. Only cluster thoughts that have strong thematic connections.
5.  **Output Format:** You MUST provide your answer in the JSON format specified in the schema.

**Input Thoughts:**
<A JSON stringified array of thought objects, e.g., '[{"id": "thought-1", "text": "Finalize Q4 marketing budget"}, ...]' will be injected here.>

**Existing Clusters (for chunking protocol, optional):**
<If this is not the first chunk, a list of existing cluster names will be injected here, e.g., '["Q4 Marketing Campaign", "Home Renovation Project"]'. You should try to add thoughts to these existing clusters if they fit.>
```

### AI Configuration (`responseSchema`)

To ensure reliable, structured output, the following JSON schema will be enforced.

- **Model:** `gemini-2.5-flash`
- **`responseMimeType`:** `application/json`
- **`responseSchema`:**
  ```json
  {
    "type": "ARRAY",
    "items": {
      "type": "OBJECT",
      "properties": {
        "clusterName": {
          "type": "STRING",
          "description": "A concise, descriptive name for the theme of the cluster."
        },
        "thoughtIds": {
          "type": "ARRAY",
          "items": {
            "type": "STRING"
          },
          "description": "An array of the original thought IDs that belong in this cluster."
        }
      },
      "required": ["clusterName", "thoughtIds"]
    }
  }
  ```

---

## 4. Data Flow

1.  **User Action:** User clicks "Generate AI Clusters" button in `ClustersScreen.tsx`.
2.  **Identify Targets:** The `App.tsx` component calculates the list of `unclusteredThoughts` by diffing the main `thoughts` array against all `thoughtIds` in the existing `clusters` state.
3.  **Service Call:** `App.tsx` calls a new function, `generateClusters(unclusteredThoughts)`, in `services/aiService.ts`.
4.  **AI Service Logic:**
    -   `generateClusters` checks if `unclusteredThoughts.length > 200`.
    -   If so, it initiates the chunking protocol.
    -   It constructs the prompt and configuration, including the `responseSchema`.
    -   It makes the API call(s) to the Gemini API.
5.  **Response Handling:**
    -   The service receives the JSON response from the API.
    -   It parses the JSON and performs basic validation.
    -   On success, it returns an array of new `Cluster` objects.
    -   On failure, it throws an error.
6.  **State Update:**
    -   Back in `App.tsx`, the returned clusters are appended to the existing `clusters` state using `setClusters()`.
    -   A success toast is triggered.
7.  **UI Render:** React re-renders `ClustersScreen.tsx` to display the newly created clusters to the user.
```