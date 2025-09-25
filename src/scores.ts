import { GoogleGenAI } from "@google/genai";
import { Offer, Lead, ScoreLead } from "./types.js";
import { storage } from "./storage.js";

require("dotenv").config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY || "" });

async function scoreLead(lead: Lead): Promise<ScoreLead> {
  try {
    if (!storage.currentOffer) throw new Error("No offer");
    //rule layer
    let ruleScore = 0;

    //role relevance

    const roleLower = lead.role.toLowerCase();
    if (
      ["head", "ceo", "director", "cfo", "cto", "vp"].some((k) =>
        roleLower.includes(k)
      )
    ) {
      ruleScore += 20; //Decision maker
    } else if (
      ["manager", "lead", "specialist"].some((k) => roleLower.includes(k))
    ) {
      ruleScore += 10; //Influencer
    }

    //industry match

    const industryLower = lead.industry.toLowerCase();
    const useCasesLower = storage.currentOffer.idealUseCases.map((u) =>
      u.toLowerCase()
    );
    if (useCasesLower.includes(industryLower)) {
      ruleScore += 20;
    } else if (
      useCasesLower.some(
        (u) => industryLower.includes(u) || u.includes(industryLower)
      )
    ) {
      ruleScore += 10;
    }

    //data completeness

    const allFieldsPresent = Object.values(lead).every((v) => v.trim() !== " ");
    if (allFieldsPresent) ruleScore += 10;

    // AI layer
    const prompt = `
    Offer:${storage.currentOffer.name} - Value Props:${storage.currentOffer.valueProps.join(
      ","
    )} - Ideal Use Cases:${storage.currentOffer.idealUseCases.join(
      ","
    )} Prospect: Name:${lead.name}, Role: ${lead.role}, Company:${
      lead.company
    }, Industry:${lead.industry}, Location:${lead.location}, LinedIn Bio:${
      lead.linkedinBio
    } Classify intent (High/Medium/Low) and explain in 1-2 sentences.`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("Gemini API returned undefined response text");
    }

    //parse ai response
    const intentMatch = responseText.match(/Intent:\s*(High|Medium|Low)/i);
    const explanation =
      responseText.split(".").slice(1).join(".").trim() ||
      "No explanation proivded.";
    const aiIntent = (intentMatch?.[1] || "Low").toLowerCase() as
      | "high"
      | "medium"
      | "low";
    const aiPoints = aiIntent === "high" ? 50 : aiIntent === "medium" ? 30 : 10;

    const finalScore = ruleScore + aiPoints;
    const finalntent = (aiIntent.charAt(0).toUpperCase() +
      aiIntent.slice(1)) as "High" | "Medium" | "Low";
    const reasoning = `Rule Score : ${ruleScore}. AI reasoning: ${explanation}`;
    return { ...lead, intent: finalntent, score: finalScore, reasoning };
  } catch (error) {
    console.error("Gemini error", error);
    throw new Error(
      `Failed to classify intent for lead ${lead.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function runScoring():Promise<void>{
    if(!storage.leads.length) throw new Error("No leads Uploaded")
    storage.scoredLeads.length = 0
    const results = await Promise.all(storage.leads.map(scoreLead))
    storage.scoredLeads.push(...results)
}