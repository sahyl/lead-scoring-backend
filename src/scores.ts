import { GoogleGenAI } from "@google/genai";
import { Offer , Lead, ScoreLead } from "./types";
import { storage } from "./storage";
import dotenv from "dotenv";
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });


export function calculateRuleScore(lead: Lead, offer: Offer): number {
  let ruleScore = 0;

  // Role relevance
  const roleLower = lead.role.toLowerCase();
  if (["head", "ceo", "director", "cfo", "cto", "vp"].some((k) => roleLower.includes(k))) {
    ruleScore += 20; // Decision maker
  } else if (["manager", "lead", "specialist"].some((k) => roleLower.includes(k))) {
    ruleScore += 10; // Influencer
  }

  // Industry match (word overlap)
  const leadWords = lead.industry.toLowerCase().split(/\s+/);
  let maxScore = 0;

  for (const useCase of offer.ideal_use_cases) {
    const useCaseWords = useCase.toLowerCase().split(/\s+/);
    const overlap = leadWords.filter((word) => useCaseWords.includes(word)).length;

    if (overlap === useCaseWords.length) {
      maxScore = 20; // Exact ICP
      break;
    } else if (overlap > 0 && maxScore < 10) {
      maxScore = 10; // Adjacent
    }
  }

  ruleScore += maxScore;

  // Data completeness
  const allFieldsPresent = Object.values(lead).every((v) => v && v.trim() !== "");
  if (allFieldsPresent) ruleScore += 10;

  return ruleScore;
}


async function scoreLead(lead: Lead): Promise<ScoreLead> {
  try {
    if (
      !lead ||
      typeof lead !== "object" ||
      !lead.name ||
      !lead.role ||
      !lead.company ||
      !lead.industry ||
      !lead.location ||
      !lead.linkedin_bio
    ) {
      throw new Error("Invalid lead data: missing required fields");
    }
    if (!storage.currentOffer) throw new Error("No offer");

    // Rule layer
    let ruleScore = calculateRuleScore(lead , storage.currentOffer)
    // AI layer
    const prompt = `
Offer: ${
      storage.currentOffer.name
    } - Value Props: ${storage.currentOffer.value_props.join(
      ","
    )} - Ideal Use Cases: ${storage.currentOffer.ideal_use_cases.join(",")}.
Prospect: Name: ${lead.name}, Role: ${lead.role}, Company: ${
      lead.company
    }, Industry: ${lead.industry}, Location: ${lead.location}, LinkedIn Bio: ${
      lead.linkedin_bio
    }.
Classify intent (High/Medium/Low) and explain in 1-2 sentences. Respond in this format: Intent: [High/Medium/Low]. Explanation: [1-2 sentences].`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash-001",

      contents: prompt,
    });
    const responseText = result.text;

    if (!responseText) {
      throw new Error("Gemini API returned empty response text");
    }

    // Parse AI response
    const intentMatch = responseText.match(/Intent:\s*(High|Medium|Low)/i);
    const explanationMatch = responseText.match(/Explanation:\s*(.*)/i);
    const aiIntent = (intentMatch?.[1] || "Low").toLowerCase() as
      | "high"
      | "medium"
      | "low";
    const explanation =
      explanationMatch?.[1].trim() || "No explanation provided.";
    const aiPoints = aiIntent === "high" ? 50 : aiIntent === "medium" ? 30 : 10;

    const finalScore = ruleScore + aiPoints;
    const finalIntent = (aiIntent.charAt(0).toUpperCase() +
      aiIntent.slice(1)) as "High" | "Medium" | "Low";
    const reasoning = `Rule Score: ${ruleScore}. AI reasoning: ${explanation}`;

    return { ...lead, intent: finalIntent, score: finalScore, reasoning };
  } catch (error) {
    console.error("Error scoring lead:", error);
    throw new Error(
      `Failed to classify intent for lead ${lead?.name || "undefined"}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function runScoring(): Promise<void> {
  if (!storage.leads.length) throw new Error("No leads uploaded");
  // Debug: Log leads to inspect
  console.log("Leads to score:", storage.leads);
  storage.scoredLeads = []; // Clear previous results (using assignment instead of length=0 for clarity)
  const results = await Promise.all(storage.leads.map(scoreLead));
  storage.scoredLeads.push(...results);
}
