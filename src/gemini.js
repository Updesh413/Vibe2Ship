/**
 * Client-side API connector. Calls the secure server-side Express proxy.
 */

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' }
];

// Offline backup mock logic in case the local development backend server is offline or errors
function getMockPlan(title, category, hoursLeft) {
  const t = title ? title.toLowerCase() : '';
  let subtasks = [];
  let scopeCuts = [];
  let emailDraft = "";

  if (t.includes('pitch') || t.includes('deck') || t.includes('slide') || t.includes('present')) {
    subtasks = [
      {
        title: "Outline the narrative & structure (10-12 slides)",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Draft an outline for a pitch deck for a startup building: " + title,
        snippet: "Slide 1: Title & Hook\nSlide 2: The Problem\nSlide 3: The Solution\nSlide 4: Market Size\nSlide 5: Product Demo\nSlide 6: Business Model\nSlide 7: Competition\nSlide 8: Financials\nSlide 9: Team\nSlide 10: Ask & Contact"
      },
      {
        title: "Write content for Problem and Solution slides",
        durationMinutes: Math.min(60, Math.round(hoursLeft * 12) || 60),
        helperPrompt: "Write a compelling problem statement and solution description for: " + title,
        snippet: "PROBLEM:\n- Current solutions are passive and easily ignored.\n- Users suffer from planning paralysis when close to deadlines.\n\nSOLUTION:\n- Vibe2Ship: Active, agentic guidance breaking down tasks in real-time."
      },
      {
        title: "Compile financial metrics & core numbers",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 8) || 45),
        helperPrompt: "Suggest standard financial projections and key metrics for a software business.",
        snippet: "- Year 1 MRR Target: $15k\n- CAC: $45 | LTV: $350\n- Churn rate: < 3%\n- Breakeven timeline: 9 months"
      }
    ];
    scopeCuts = [
      "Skip custom slide transitions and complex animations to save 1 hour.",
      "Reduce the deck to 7 core slides instead of 12. Skip competitor slide for now."
    ];
    emailDraft = `Subject: Quick Update: Pitch Deck Preparation\n\nHi Team,\n\nI'm currently putting the final touches on the presentation deck for ${title || "our pitch"}.\n\nTo ensure the calculations are accurate, I would appreciate an extra 12 hours. I will have the final, review-ready draft sent over by tomorrow morning.\n\nThanks,\n[Your Name]`;
  } else {
    subtasks = [
      {
        title: "Define scope & identify requirements",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 8) || 30),
        helperPrompt: "Help me identify the 3 critical success factors for: " + title,
        snippet: "1. Clarify core expectations.\n2. List materials needed.\n3. Identify blockers."
      },
      {
        title: "Create initial draft / basic implementation",
        durationMinutes: Math.min(90, Math.round(hoursLeft * 20) || 90),
        helperPrompt: "Write a step-by-step checklist to outline the first draft of: " + title,
        snippet: "- Section A: Core features / thesis\n- Section B: Supporting details / secondary elements"
      },
      {
        title: "Review work & polish details",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Suggest 3 checklist items to verify quality before submission.",
        snippet: "- Verify spellings and formatting alignments.\n- Test functional links or double-check main calculations."
      }
    ];
    scopeCuts = [
      "Cut down non-critical decorative details.",
      "Deliver a robust minimum-viable solution today, and submit enhancements tomorrow."
    ];
    emailDraft = `Subject: Extension Request: ${title || "Project Work"}\n\nHi,\n\nI am currently working on ${title || "the project"} and want to ensure high quality. I would appreciate a short extension of 24 hours to finalize my work.\n\nWarm regards,\n[Your Name]`;
  }

  return { subtasks, scopeCutRecommendations: scopeCuts, extensionEmailDraft: emailDraft };
}

/**
 * Fetch a plan from the secure server backend proxy
 */
export async function generateSaveMePlan(title, category, hoursLeft, modelId = 'gemini-2.5-flash') {
  try {
    const response = await fetch('/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, category, hoursLeft, modelId })
    });

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Could not query server API, using local mock backup:", error);
    // Delay to simulate network response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockPlan(title, category, hoursLeft));
      }, 1000);
    });
  }
}

/**
 * Fetch a chat response from the secure server backend proxy
 */
export async function askSaveMeAI(userMessage, taskContext, modelId = 'gemini-2.5-flash') {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userMessage, taskContext, modelId })
    });

    if (!response.ok) {
      throw new Error(`Server returned error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.warn("Could not query server API for chat, using local mock response:", error);
    return new Promise((resolve) => {
      setTimeout(() => {
        const text = userMessage.toLowerCase();
        let ans = "Offline Mode: ";
        if (text.includes('motivate')) {
          ans += "Take a deep breath. Focus on your first step right now. Momentum is everything!";
        } else if (text.includes('energy') || text.includes('hack')) {
          ans += "Get up, drink a cold glass of water, and do 10 jumping jacks. Resets your attention span instantly.";
        } else {
          ans += `Regarding "${taskContext ? taskContext.title : 'your work'}", try breaking down the active step into micro-actions of 5 minutes each.`;
        }
        resolve(ans);
      }, 800);
    });
  }
}
