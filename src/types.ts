export interface Offer {
  name: string;
  valueProps: string[];
  idealUseCases: string[];
}

export interface Lead {
  name: string;
  role: string;
  company: string;
  industry: string;
  location: string;
  linkedinBio: string;
}

export interface ScoreLead extends Lead {
  intent: "High" | "Medium" | "Low";
  score: number;
  reasoning: string;
}
