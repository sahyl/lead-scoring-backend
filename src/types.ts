export interface Offer {
  name: string;
  value_props: string[];
  ideal_use_cases: string[];
}

export interface Lead {
  name: string;
  role: string;
  company: string;
  industry: string;
  location: string;
  linkedin_bio: string;
}

export interface ScoreLead extends Lead {
  intent: "High" | "Medium" | "Low";
  score: number;
  reasoning: string;
}
