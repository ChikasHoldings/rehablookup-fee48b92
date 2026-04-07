export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  rating: number;
  role: "seeker" | "family" | "provider";
  context?: string; // e.g. "Found treatment for son" or "Listed facility"
}

// Seeker & Family testimonials
export const seekerTestimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    location: "San Diego, CA",
    quote: "I was overwhelmed trying to find help for my son. RehabLookup's concierge team walked me through every step — from verifying insurance to scheduling tours. He's been sober 14 months now.",
    rating: 5,
    role: "family",
    context: "Found treatment for her son",
  },
  {
    name: "Michael T.",
    location: "Houston, TX",
    quote: "After three failed attempts at recovery, I used RehabLookup to find a dual-diagnosis program that actually addressed my depression alongside addiction. This time, treatment stuck.",
    rating: 5,
    role: "seeker",
    context: "Found dual-diagnosis treatment",
  },
  {
    name: "Jennifer K.",
    location: "Tampa, FL",
    quote: "The verified reviews and transparent pricing made all the difference. We knew exactly what to expect — no surprise bills, no hidden fees. My husband is 2 years clean.",
    rating: 5,
    role: "family",
    context: "Found treatment for her husband",
  },
  {
    name: "David R.",
    location: "Chicago, IL",
    quote: "I needed outpatient treatment that worked around my job. RehabLookup matched me with three programs within 20 miles, all accepting my insurance. I started treatment the same week.",
    rating: 5,
    role: "seeker",
    context: "Found outpatient program",
  },
  {
    name: "Maria L.",
    location: "Phoenix, AZ",
    quote: "As a single mom, I couldn't just leave for 90 days. The team helped me find an IOP with childcare support. I'm 18 months sober and my kids have their mom back.",
    rating: 5,
    role: "seeker",
    context: "Found IOP with flexibility",
  },
  {
    name: "Robert & Linda C.",
    location: "Atlanta, GA",
    quote: "When our daughter relapsed, we panicked. RehabLookup connected us with a facility within 4 hours. The speed and compassion of their team during that crisis was extraordinary.",
    rating: 5,
    role: "family",
    context: "Emergency placement for daughter",
  },
];

// Provider testimonials
export const providerTestimonials: Testimonial[] = [
  {
    name: "Dr. Amanda Foster",
    location: "Scottsdale, AZ",
    quote: "Since listing on RehabLookup, our facility has seen a 35% increase in qualified admissions. The leads are pre-screened and genuinely seeking help — not tire-kickers.",
    rating: 5,
    role: "provider",
    context: "Clinical Director, Desert Bloom Recovery",
  },
  {
    name: "James Whitfield",
    location: "Malibu, CA",
    quote: "We've tried every marketing channel out there. RehabLookup consistently delivers the highest-quality referrals at the lowest cost per admission. It's our #1 source now.",
    rating: 5,
    role: "provider",
    context: "CEO, Pacific Coast Treatment Center",
  },
  {
    name: "Rachel Nguyen",
    location: "Nashville, TN",
    quote: "The concierge placement network is a game-changer. Families arrive already educated about our programs. Our show-up rate went from 60% to over 85%.",
    rating: 5,
    role: "provider",
    context: "Admissions Director, Hope Springs Recovery",
  },
  {
    name: "Marcus Johnson, LCSW",
    location: "Denver, CO",
    quote: "As a smaller facility competing against big chains, RehabLookup levels the playing field. Our verified listing and reviews give families confidence to choose us.",
    rating: 5,
    role: "provider",
    context: "Founder, Mountain View Wellness Center",
  },
  {
    name: "Patricia Reeves",
    location: "Austin, TX",
    quote: "The analytics dashboard shows exactly which services families search for. We adjusted our program offerings based on the data and filled 12 new beds in one quarter.",
    rating: 5,
    role: "provider",
    context: "Operations Manager, Lone Star Recovery",
  },
  {
    name: "Dr. Steven Park",
    location: "Miami, FL",
    quote: "RehabLookup's verification badge has become a trust signal for our marketing. Families specifically mention seeing our verified listing as why they chose us over competitors.",
    rating: 5,
    role: "provider",
    context: "Medical Director, Coastal Healing Institute",
  },
];

// Combined testimonials for homepage (mix of both)
export const homepageTestimonials: Testimonial[] = [
  seekerTestimonials[0], // Sarah M. - family
  providerTestimonials[0], // Dr. Amanda Foster - provider
  seekerTestimonials[1], // Michael T. - seeker
  seekerTestimonials[2], // Jennifer K. - family
  providerTestimonials[1], // James Whitfield - provider
  seekerTestimonials[3], // David R. - seeker
];
