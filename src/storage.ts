import {Offer , Lead , ScoreLead} from "./types"

export const storage = {
  currentOffer: null as Offer | null,
  leads: [] as Lead[],
  scoredLeads: [] as ScoreLead[]
};
