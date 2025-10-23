# AI Clustering User Journey

This document outlines the step-by-step experience a user has while interacting with the AI Clustering feature.

### **Scenario 1: First Time Clustering (Happy Path)**

**1. Starting Point: An Unorganized Stream**
The user has been actively using the Brain Dump app for a few days. They have captured over 25 thoughts, ranging from work tasks ("Finalize the Q4 marketing budget") and personal errands ("Schedule a dentist appointment") to long-term goals ("Research vacation spots in Southeast Asia"). They navigate to the **Clusters** tab.

**2. A Proactive Suggestion**
Instead of an empty screen, the user is greeted with an engaging call-to-action. Because they have more than 10 unclustered thoughts, the system presents them with a button:

> ✨ **You have 27 unclustered thoughts. Let AI find the patterns.**

**3. Initiating the Magic**
Intrigued, the user clicks the button.

**4. The "In-Progress" State**
The button is immediately replaced by a loading indicator. To provide feedback and manage expectations, a message appears:

> "Analyzing your thoughts... AI is finding hidden connections."

The rest of the UI becomes temporarily disabled to prevent other actions during the process.

**5. The Big Reveal: Success!**
After a few seconds, the loading indicator vanishes.
- A success toast notification slides in from the corner of the screen: **"Success! AI organized your thoughts into 5 new clusters."**
- The screen now displays a list of collapsible sections, each with a clear, AI-generated title:
    - `Q4 Marketing Tasks`
    - `Personal Health Appointments`
    - `Vacation Planning`
    - `Project Phoenix UI/UX`
    - `Home Improvement Ideas`

**6. Interacting with the Results**
- The user clicks on the "Vacation Planning" cluster. It expands to show the full text of the thoughts related to their trip research.
- They notice the cluster name "Q4 Marketing Tasks" is a bit dry. They hover over it, click the "Rename" button, and change it to **"🚀 Q4 Marketing Campaign"**.
- They are delighted to see their scattered thoughts now have structure and context.

---

### **Scenario 2: The Collaborative Loop**

**1. A New Idea Forms**
The user has a few new thoughts about a side project. They want to group them manually. They create a new cluster and name it "Indie Game Dev Project". They drag two thoughts into it:
- "Brainstorm character backstories"
- "Research pixel art software"

**2. A Contextual Nudge**
As soon as the second thought is added, a new, smaller button appears right inside the "Indie Game Dev Project" cluster's UI:

> **[Find 3 more related thoughts]**

*(The system has detected 3 other unclustered thoughts that might be related).*

**3. Guided AI Assistance**
The user clicks the button. A quick, targeted AI search runs. In a moment, the three related thoughts are automatically moved from the unclustered pool and appear inside the "Indie Game Dev Project" cluster. The user has successfully guided the AI to complete their cluster with minimal effort.

---

### **Scenario 3: Not Enough Data**

**1. A Quiet Beginning**
A new user has just signed up. They add two thoughts: "Buy milk" and "Call mom". They navigate to the **Clusters** tab.

**2. Informative Empty State**
Since they have fewer than 10 thoughts, there is no "Generate" button. Instead, they see a helpful message designed to guide them:

> "Clusters of related thoughts will appear here. **Add at least 10 thoughts to enable AI-powered organization.**"

This educates the user on how the feature works and what they need to do to unlock its value.
```