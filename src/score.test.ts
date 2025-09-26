import { calculateRuleScore } from './scores';
import { Lead, Offer } from './types';

describe('Rule Layer Scoring', () => {

  const sampleOffer: Offer = {
    name: "AI Outreach Automation",
    value_props: ["24/7 outreach", "6x more meetings"],
    ideal_use_cases: ["B2B SaaS mid-market"]
  };

  // --- Role relevance tests ---
  test('should score 20 for decision maker', () => {
    const lead: Lead = {
      name: "Alice",
      role: "Head of Growth",
      company: "FlowMetrics",
      industry: "B2B SaaS mid-market",
      location: "San Francisco",
      linkedin_bio: "Experienced growth leader"
    };
    // decision maker (role) + exact ICP (industry) + complete data = 20+20+10=50
    expect(calculateRuleScore(lead, sampleOffer)).toBe(50);
  });

  test('should score 10 for influencer', () => {
    const lead: Lead = {
      name: "Bob",
      role: "Marketing Manager",
      company: "TechCorp",
      industry: "SaaS", // adjacent
      location: "New York",
      linkedin_bio: "Marketing professional"
    };
    // influencer (10) + adjacent industry (10) + complete data (10) = 30
    expect(calculateRuleScore(lead, sampleOffer)).toBe(30);
  });

  test('should score 0 for non-relevant role', () => {
    const lead: Lead = {
      name: "Charlie",
      role: "Intern",
      company: "TechCorp",
      industry: "Consumer Electronics",
      location: "New York",
      linkedin_bio: "Learning marketing" // complete data, but no role/industry match
    };
    // role=0 + industry=0 + complete=10
    expect(calculateRuleScore(lead, sampleOffer)).toBe(10);
  });

  // --- Industry match tests ---
  test('should score 20 for exact ICP', () => {
    const lead: Lead = {
      name: "Dana",
      role: "VP of Sales",
      company: "FlowMetrics",
      industry: "B2B SaaS mid-market",
      location: "San Francisco",
      linkedin_bio: "Sales leader"
    };
    // decision maker (20) + exact ICP (20) + complete (10) = 50
    expect(calculateRuleScore(lead, sampleOffer)).toBe(50);
  });

  test('should score 10 for adjacent industry', () => {
    const lead: Lead = {
      name: "Eve",
      role: "VP of Sales",
      company: "TechCorp",
      industry: "B2B SaaS enterprise", // adjacent
      location: "New York",
      linkedin_bio: "Sales executive"
    };
    // decision maker (20) + adjacent industry (10) + complete (10) = 40
    expect(calculateRuleScore(lead, sampleOffer)).toBe(40);
  });

  test('should score 0 for no industry match', () => {
    const lead: Lead = {
      name: "Frank",
      role: "VP of Sales",
      company: "RetailCo",
      industry: "Retail",
      location: "London",
      linkedin_bio: "Sales executive"
    };
    // decision maker (20) + industry mismatch (0) + complete (10) = 30
    expect(calculateRuleScore(lead, sampleOffer)).toBe(30);
  });

  // --- Data completeness tests ---
  test('should score 0 for incomplete data', () => {
    const lead: Lead = {
      name: "Gina",
      role: "Intern",
      company: "TechCorp",
      industry: "SaaS",
      location: "",
      linkedin_bio: "" // missing fields
    };
    // role=0 + industry=10? (adjacent) + incomplete data=0
    expect(calculateRuleScore(lead, sampleOffer)).toBe(10); 
  });

});
