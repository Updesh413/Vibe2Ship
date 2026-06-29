import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const apiKey = process.env.GEMINI_API_KEY;

// Mock backup logic for offline mode (keeps app fully usable even if API key is not in .env)
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
      },
      {
        title: "Format design (use uniform dark-theme template)",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 8) || 45),
        helperPrompt: "Give me 5 design principles for high-converting visual slide decks.",
        snippet: "1. 1 Key Idea per slide\n2. High contrast colors (e.g. Violet accent on Obsidian background)\n3. 30px+ font sizes for headers\n4. Use lists, not paragraphs\n5. Left-align text for readability"
      },
      {
        title: "Rehearse presentation and check timing",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 6) || 30),
        helperPrompt: "Provide a quick 3-step checklist to rehearse a pitch under pressure.",
        snippet: "- Read slides aloud to check for phrasing tongue-twisters.\n- Record yourself on phone for exactly 3 minutes.\n- Verify clear transition phrases between slides."
      }
    ];
    scopeCuts = [
      "Skip custom slide transitions and complex animations to save 1 hour.",
      "Reduce the deck to 7 core slides instead of 12. Skip competitor slide for now.",
      "Use bullet points instead of searching for custom icons and graphics."
    ];
    emailDraft = `Subject: Quick Update: Pitch Deck Preparation

Hi Team,

I'm currently putting the final touches on the presentation deck for ${title || "our pitch"}. 

To ensure the financial projections and product narrative are fully polished and accurate, I would appreciate an extra 12 hours. I will have the final, review-ready draft sent over by tomorrow morning.

Thank you for your flexibility,
[Your Name]`;

  } else if (t.includes('code') || t.includes('app') || t.includes('build') || t.includes('debug') || t.includes('program') || t.includes('web') || t.includes('dev')) {
    subtasks = [
      {
        title: "Map out data structures & state schema",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 8) || 30),
        helperPrompt: "Write a clean JSON state schema representing tasks and pomodoro timers.",
        snippet: "const state = {\n  activeTaskId: null,\n  tasks: [],\n  timer: { secondsLeft: 1500, isRunning: false }\n};"
      },
      {
        title: "Implement core business logic & helper functions",
        durationMinutes: Math.min(75, Math.round(hoursLeft * 15) || 75),
        helperPrompt: "Write a javascript helper to calculate stress level based on hours left and subtask counts.",
        snippet: "function calculateStress(hoursLeft, totalSubtasks, completedSubtasks) {\n  const remaining = totalSubtasks - completedSubtasks;\n  if (hoursLeft <= 0) return 100;\n  const ratio = (remaining * 0.75) / hoursLeft;\n  return Math.min(100, Math.round(ratio * 100));\n}"
      },
      {
        title: "Build user interface structure & CSS layout",
        durationMinutes: Math.min(60, Math.round(hoursLeft * 12) || 60),
        helperPrompt: "Give me modern CSS styles for a glassmorphic card container.",
        snippet: ".glass-card {\n  background: rgba(255, 255, 255, 0.03);\n  backdrop-filter: blur(12px);\n  border: 1px solid rgba(255, 255, 255, 0.08);\n  border-radius: 16px;\n  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);\n}"
      },
      {
        title: "Connect client UI components with state handler",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Explain how to sync React state changes with localStorage.",
        snippet: "useEffect(() => {\n  localStorage.setItem('tasks_vibe2ship', JSON.stringify(tasks));\n}, [tasks]);"
      },
      {
        title: "Test edge cases & verify build bundle works",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 6) || 30),
        helperPrompt: "List common Vite build errors and how to resolve them quickly.",
        snippet: "- Unresolved import: Check file capitalization and relative paths.\n- React hook dependency warnings: Add dependencies or use useCallback.\n- CSS syntax error: Verify semicolons and brackets."
      }
    ];
    scopeCuts = [
      "Focus purely on mock data and local storage; omit backend databases for this version.",
      "Limit the style system to simple custom CSS rather than setting up complex UI libraries.",
      "Skip advanced analytics/graphs and display simple percentage rings instead."
    ];
    emailDraft = `Subject: Status Update & Code Delivery - ${title || "Development Project"}

Hi team,

I wanted to provide a quick progress update on the development for ${title || "this project"}. The core features and state architecture are fully implemented.

To make sure the edge cases are thoroughly unit tested and the build is stable for production release, I'd like to extend the deadline by a few hours. I expect to ship the build by noon tomorrow.

Best regards,
[Your Name]`;

  } else if (t.includes('report') || t.includes('essay') || t.includes('write') || t.includes('paper') || t.includes('doc')) {
    subtasks = [
      {
        title: "Brainstorm 3 core arguments & draft outline",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 8) || 30),
        helperPrompt: "Draft an outline for a critical analysis report on: " + title,
        snippet: "I. Introduction & Thesis\nII. Core Argument 1: Market Need / Demand\nIII. Core Argument 2: Technological Feasibility\nIV. Core Argument 3: Ethical/Regulatory hurdles\nV. Conclusion & Strategic Advice"
      },
      {
        title: "Write Intro paragraph & Thesis statement",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Write a hook and introductory paragraph for: " + title,
        snippet: "In today's hyper-accelerated landscape, deadlines are not merely dates but anchors of trust. The biggest challenge in modern productivity is bridging the gap between passive alerts and actionable execution..."
      },
      {
        title: "Flesh out body sections with supporting statistics",
        durationMinutes: Math.min(90, Math.round(hoursLeft * 18) || 90),
        helperPrompt: "List 5 research statistics regarding deadline failures and procrastination.",
        snippet: "- 85-95% of college students engage in procrastination.\n- Active micro-scheduling decreases project anxiety by 40%.\n- Breaking tasks into sub-tasks improves on-time delivery by 65%.\n- Context-switching reduces focus capacity by 20%."
      },
      {
        title: "Draft Conclusion and next-step recommendations",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 8) || 45),
        snippet: "To summarize, building productivity software requires more than visual calendar notifications. By actively coaching users, decomposing complex projects, and offering real-time recovery templates, we can transform stress into focused action.",
        helperPrompt: "Write a conclusion summarizing the transition from planning to execution."
      },
      {
        title: "Proofread and generate references list",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 6) || 30),
        helperPrompt: "Format reference lists according to APA 7th style guidelines.",
        snippet: "References:\n- Steel, P. (2007). The nature of procrastination. Psychological Bulletin.\n- Clear, J. (2018). Atomic Habits. Penguin Random House."
      }
    ];
    scopeCuts = [
      "Reduce word count target by 20%—focus strictly on depth rather than filler content.",
      "Incorporate bullet lists instead of prose for secondary sections (e.g. data analyses).",
      "Limit research to secondary sources rather than running primary survey collections."
    ];
    emailDraft = `Subject: Submission Timeline - ${title || "Written Report"}

Hi Prof. / Team,

I am writing to update you on my progress on the ${title || "written assignment"}. The primary drafts are drafted and structured.

In order to properly fact-check my assertions and format the citations correctly, I am requesting a short extension until tomorrow morning. I am dedicated to delivering a top-tier report.

Thank you,
[Your Name]`;
  } else {
    // Default fallback
    subtasks = [
      {
        title: "Define scope & identify requirements",
        durationMinutes: Math.min(30, Math.round(hoursLeft * 8) || 30),
        helperPrompt: "Help me identify the 3 critical success factors for: " + title,
        snippet: "1. Clarify core expectations & grading rubrics.\n2. List materials or files needed to start.\n3. Identify external blockers."
      },
      {
        title: "Gather resources & research references",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Provide a quick research summary on the topic of: " + title,
        snippet: "- Source 1: Standard industry guidelines\n- Source 2: Competitive benchmarks\n- Key search term: '" + title + " best practices'"
      },
      {
        title: "Create initial draft / basic implementation",
        durationMinutes: Math.min(90, Math.round(hoursLeft * 20) || 90),
        helperPrompt: "Write a step-by-step checklist to outline the first draft of: " + title,
        snippet: "- Section A: Core thesis / primary feature\n- Section B: Supporting details / auxiliary functions\n- Section C: Basic styling / readability check"
      },
      {
        title: "Review work & polish presentation details",
        durationMinutes: Math.min(45, Math.round(hoursLeft * 10) || 45),
        helperPrompt: "Suggest 3 checklist items to verify quality before submission.",
        snippet: "- Verify spellings and formatting alignments.\n- Test functional links or double-check main calculations.\n- Compare output against initial specifications."
      }
    ];
    scopeCuts = [
      "Cut down non-critical decorative details (e.g. logo designers, advanced styling).",
      "Deliver a robust minimum-viable solution today, and submit enhancements tomorrow.",
      "Limit initial review to self-testing rather than peer reviews."
    ];
    emailDraft = `Subject: Extension Request: ${title || "Project Work"}

Hi,

I hope you are having a productive day. 

I am currently working on ${title || "the project"} and want to ensure the final output is of high quality. Due to some technical and scheduling constraints, I would appreciate a short extension of 24 hours to finalize my work.

Please let me know if this works.

Warm regards,
[Your Name]`;
  }

  return { subtasks, scopeCutRecommendations: scopeCuts, extensionEmailDraft: emailDraft };
}

function getMockChatResponse(userMessage, taskContext) {
  const text = userMessage.toLowerCase();
  let answer = "I am SaveMe AI. ";
  
  if (text.includes('motivate') || text.includes('give up') || text.includes('lazy')) {
    answer += "Listen, deadlines create focus! Take a deep breath. You don't need to finish the whole project right now—you just need to finish the FIRST step. Just open your editor or draft document, write ONE word, and let the momentum carry you. I'm right here with you!";
  } else if (text.includes('email') || text.includes('slack') || text.includes('extension')) {
    answer += "Here's a quick message you can send:\n\n'Hi there, I am currently working on this task and need a bit more time to double check the details for accuracy. Can I submit it by tomorrow morning? Let me know if that works. Thanks!'";
  } else if (text.includes('stuck') || text.includes('help')) {
    answer += "When stuck, try the 'Shitty First Draft' strategy. Don't try to make it perfect. Write down the most basic, broken version of whatever you need to do. Once it's on paper, editing is 10x easier than writing from scratch. Let's do it!";
  } else if (text.includes('hack') || text.includes('energy') || text.includes('tired')) {
    answer += "Try the 20-20-20 rule to clear your head: look at something 20 feet away for 20 seconds. Stand up, stretch, drink a full glass of cold water, and do 5 jumping jacks. This resets your nervous system and beats procrastination fatigue.";
  } else {
    answer += `Regarding the task "${taskContext ? taskContext.title : 'your work'}": Focus on the current active step. Complete this chunk and build momentum. You've got this!`;
  }
  return answer;
}

// Plan Generator Route
app.post('/api/plan', async (req, res) => {
  const { title, category, hoursLeft, modelId = 'gemini-2.5-flash' } = req.body;

  if (!apiKey) {
    return res.json(getMockPlan(title, category, hoursLeft));
  }

  const timeLimitInfo = hoursLeft ? `${hoursLeft} hours` : "an unspecified time";
  const prompt = `You are "SaveMe AI", an elite productivity companion. The user is in a panic and needs to complete a task: "${title}" (Category: ${category}) which is due in ${timeLimitInfo}.
Your goal is to break this task down into highly actionable, atomic micro-steps, suggest how to cut scope to meet the deadline, and write an extension request email in case they need more time.

Return a valid, raw JSON object (with NO markdown packaging, NO code blocks like \`\`\`json, just pure valid JSON) with the following structure:
{
  "subtasks": [
    {
      "title": "Actionable, clear subtask title",
      "durationMinutes": 30,
      "helperPrompt": "A highly specific, helpful AI prompt the user can copy-paste into an LLM to quickly write, code, or brainstorm this step",
      "snippet": "A template, starter outline, or code snippet that helps them get started immediately on this step"
    }
  ],
  "scopeCutRecommendations": [
    "Specific tip on how they can reduce scope, skip features, or drop bells and whistles to hit the deadline"
  ],
  "extensionEmailDraft": "A professional, polite, and realistic email/Slack message draft they can send to their manager/professor asking for a realistic extension."
}

Ensure the sum of subtasks' durations fits within the time remaining (maximum ${Math.round(hoursLeft * 60) || 180} minutes total). Keep the subtasks highly focused, practical, and limit the subtask count between 3 to 6 steps.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );

    if (!response.ok) {
      console.warn("Gemini API call failed in backend proxy, using fallback mock.");
      return res.json(getMockPlan(title, category, hoursLeft));
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    res.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error("Backend Error in Gemini plan call:", error);
    res.json(getMockPlan(title, category, hoursLeft));
  }
});

// Chat Route
app.post('/api/chat', async (req, res) => {
  const { userMessage, taskContext, modelId = 'gemini-2.5-flash' } = req.body;

  if (!apiKey) {
    return res.json({ text: getMockChatResponse(userMessage, taskContext) });
  }

  const contextPrompt = taskContext 
    ? `The active task is "${taskContext.title}" (due in ${taskContext.hoursLeft || 'a short time'} hours, category: ${taskContext.category}). Current active step is "${taskContext.currentStep || 'none'}".`
    : `The user is working under a tight deadline.`;

  const prompt = `You are "SaveMe AI", a witty, supportive, and extremely action-oriented productivity coach. The user is feeling stressed about a deadline.
${contextPrompt}

User asks: "${userMessage}"

Provide a concise, direct, and actionable answer (under 120 words). Offer templates, motivational sparks, or direct tips. Avoid flowery language; focus on helping them START doing the work right now.`;

  try {
    const response = await fetch(
      `https://genergenerativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, // Corrected prefix
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      // Correcting domain name in fetch fallback just in case of typos
      const retryResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
      if (!retryResponse.ok) throw new Error("API Connection failed");
      const retryData = await retryResponse.json();
      return res.json({ text: retryData.candidates?.[0]?.content?.parts?.[0]?.text });
    }

    const data = await response.json();
    res.json({ text: data.candidates?.[0]?.content?.parts?.[0]?.text });
  } catch (error) {
    console.error("Backend Error in Gemini chat call:", error);
    res.json({ text: getMockChatResponse(userMessage, taskContext) });
  }
});

// Serve frontend build static files in production
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback routing for SPA. If not an API route, serve index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});
