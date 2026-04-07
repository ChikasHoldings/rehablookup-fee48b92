import sarahImg from "@/assets/testimonials/sarah-m.jpg";
import michaelImg from "@/assets/testimonials/michael-t.jpg";
import jenniferImg from "@/assets/testimonials/jennifer-k.jpg";
import davidImg from "@/assets/testimonials/david-r.jpg";
import mariaImg from "@/assets/testimonials/maria-l.jpg";
import robertLindaImg from "@/assets/testimonials/robert-linda.jpg";
import thomasImg from "@/assets/testimonials/thomas-w.jpg";
import ashleyImg from "@/assets/testimonials/ashley-b.jpg";
import amandaImg from "@/assets/testimonials/amanda-foster.jpg";
import jamesImg from "@/assets/testimonials/james-whitfield.jpg";
import rachelImg from "@/assets/testimonials/rachel-nguyen.jpg";
import marcusImg from "@/assets/testimonials/marcus-johnson.jpg";
import patriciaImg from "@/assets/testimonials/patricia-reeves.jpg";
import stevenImg from "@/assets/testimonials/steven-park.jpg";
import karenImg from "@/assets/testimonials/karen-mitchell.jpg";
import carlosImg from "@/assets/testimonials/carlos-martinez.jpg";
import deniseImg from "@/assets/testimonials/denise-w.jpg";
import diegoImg from "@/assets/testimonials/diego-s.jpg";
import lisaImg from "@/assets/testimonials/lisa-h.jpg";
import richardImg from "@/assets/testimonials/richard-p.jpg";
import graceImg from "@/assets/testimonials/grace-c.jpg";
import markSusanImg from "@/assets/testimonials/mark-susan.jpg";
import andreImg from "@/assets/testimonials/andre-j.jpg";
import catherineImg from "@/assets/testimonials/catherine-b.jpg";
import brianImg from "@/assets/testimonials/brian-e.jpg";
import priyaImg from "@/assets/testimonials/priya-d.jpg";
import williamImg from "@/assets/testimonials/william-k.jpg";
import elenaImg from "@/assets/testimonials/elena-r.jpg";

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  rating: number;
  role: "seeker" | "family" | "provider";
  context?: string;
  avatar: string;
}

export const seekerTestimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    location: "San Diego, CA",
    quote: "I was overwhelmed trying to find help for my son. RehabLookup's concierge team walked me through every step — from verifying insurance to scheduling tours. He's been sober 14 months now.",
    rating: 5,
    role: "family",
    context: "Found treatment for her son",
    avatar: sarahImg,
  },
  {
    name: "Michael T.",
    location: "Houston, TX",
    quote: "After three failed attempts at recovery, I used RehabLookup to find a dual-diagnosis program that actually addressed my depression alongside addiction. This time, treatment stuck.",
    rating: 5,
    role: "seeker",
    context: "Found dual-diagnosis treatment",
    avatar: michaelImg,
  },
  {
    name: "Jennifer K.",
    location: "Tampa, FL",
    quote: "The verified reviews and transparent pricing made all the difference. We knew exactly what to expect — no surprise bills, no hidden fees. My husband is 2 years clean.",
    rating: 5,
    role: "family",
    context: "Found treatment for her husband",
    avatar: jenniferImg,
  },
  {
    name: "David R.",
    location: "Chicago, IL",
    quote: "I needed outpatient treatment that worked around my job. RehabLookup matched me with three programs within 20 miles, all accepting my insurance. I started treatment the same week.",
    rating: 5,
    role: "seeker",
    context: "Found outpatient program",
    avatar: davidImg,
  },
  {
    name: "Maria L.",
    location: "Phoenix, AZ",
    quote: "As a single mom, I couldn't just leave for 90 days. The team helped me find an IOP with childcare support. I'm 18 months sober and my kids have their mom back.",
    rating: 5,
    role: "seeker",
    context: "Found IOP with flexibility",
    avatar: mariaImg,
  },
  {
    name: "Robert & Linda C.",
    location: "Atlanta, GA",
    quote: "When our daughter relapsed, we panicked. RehabLookup connected us with a facility within 4 hours. The speed and compassion of their team during that crisis was extraordinary.",
    rating: 5,
    role: "family",
    context: "Emergency placement for daughter",
    avatar: robertLindaImg,
  },
  {
    name: "Thomas W.",
    location: "Nashville, TN",
    quote: "As a veteran, I needed a program that understood PTSD and substance abuse together. RehabLookup found me a VA-connected facility with specialized trauma care. Best decision I ever made.",
    rating: 5,
    role: "seeker",
    context: "Veteran, found PTSD-focused treatment",
    avatar: thomasImg,
  },
  {
    name: "Ashley B.",
    location: "Charlotte, NC",
    quote: "I was terrified of going to rehab. The team at RehabLookup answered all my questions honestly, helped me understand what detox would be like, and found a women-only program where I felt safe.",
    rating: 5,
    role: "seeker",
    context: "Found women-only program",
    avatar: ashleyImg,
  },
  {
    name: "Denise W.",
    location: "Detroit, MI",
    quote: "My brother had been struggling for years and every facility we called felt like a sales pitch. RehabLookup was different — they listened, understood his needs, and matched him with a faith-based program that changed his life. He just celebrated 2 years of sobriety.",
    rating: 5,
    role: "family",
    context: "Found faith-based program for brother",
    avatar: deniseImg,
  },
  {
    name: "Diego S.",
    location: "Los Angeles, CA",
    quote: "I needed a Spanish-speaking therapist and a program that understood my culture. RehabLookup's search filters made it easy to find exactly what I was looking for. I'm 10 months sober and finally feel like myself again.",
    rating: 5,
    role: "seeker",
    context: "Found culturally appropriate care",
    avatar: diegoImg,
  },
  {
    name: "Lisa H.",
    location: "Minneapolis, MN",
    quote: "After my daughter's overdose scare, we needed help immediately — not in two weeks. The concierge team got her into a detox facility within 6 hours. That speed saved her life. She's now thriving in a sober living home.",
    rating: 5,
    role: "family",
    context: "Emergency detox placement for daughter",
    avatar: lisaImg,
  },
  {
    name: "Richard P.",
    location: "Philadelphia, PA",
    quote: "At 62, I thought I was too old for rehab. RehabLookup found me a program specifically for older adults dealing with prescription medication dependency. The staff understood my situation without judgment. I wish I'd done this years ago.",
    rating: 5,
    role: "seeker",
    context: "Found age-appropriate treatment",
    avatar: richardImg,
  },
  {
    name: "Grace C.",
    location: "Seattle, WA",
    quote: "I was a functioning professional hiding my addiction for years. RehabLookup connected me with an executive treatment program that let me maintain some work responsibilities while getting the intensive help I needed. Nobody at my company ever knew.",
    rating: 5,
    role: "seeker",
    context: "Found executive treatment program",
    avatar: graceImg,
  },
  {
    name: "Mark & Susan D.",
    location: "Columbus, OH",
    quote: "We spent $40,000 on a facility we found through Google that was completely wrong for our son. With RehabLookup, the concierge team matched him with the right level of care from the start. He completed the program and is now mentoring others in recovery.",
    rating: 5,
    role: "family",
    context: "Found right-fit program after prior failure",
    avatar: markSusanImg,
  },
  {
    name: "Brian E.",
    location: "Boston, MA",
    quote: "Fentanyl nearly killed me twice. I needed a facility with medication-assisted treatment that wouldn't just detox me and send me home. RehabLookup found a program with Suboxone support and long-term aftercare planning. I'm 16 months clean — the longest I've ever been.",
    rating: 5,
    role: "seeker",
    context: "Found MAT program with aftercare",
    avatar: brianImg,
  },
];

export const providerTestimonials: Testimonial[] = [
  {
    name: "Dr. Amanda Foster",
    location: "Scottsdale, AZ",
    quote: "Since listing on RehabLookup, our facility has seen a 35% increase in qualified admissions. The leads are pre-screened and genuinely seeking help — not tire-kickers.",
    rating: 5,
    role: "provider",
    context: "Clinical Director, Desert Bloom Recovery",
    avatar: amandaImg,
  },
  {
    name: "James Whitfield",
    location: "Malibu, CA",
    quote: "We've tried every marketing channel out there. RehabLookup consistently delivers the highest-quality referrals at the lowest cost per admission. It's our #1 source now.",
    rating: 5,
    role: "provider",
    context: "CEO, Pacific Coast Treatment Center",
    avatar: jamesImg,
  },
  {
    name: "Rachel Nguyen",
    location: "Nashville, TN",
    quote: "The concierge placement network is a game-changer. Families arrive already educated about our programs. Our show-up rate went from 60% to over 85%.",
    rating: 5,
    role: "provider",
    context: "Admissions Director, Hope Springs Recovery",
    avatar: rachelImg,
  },
  {
    name: "Marcus Johnson, LCSW",
    location: "Denver, CO",
    quote: "As a smaller facility competing against big chains, RehabLookup levels the playing field. Our verified listing and reviews give families confidence to choose us.",
    rating: 5,
    role: "provider",
    context: "Founder, Mountain View Wellness Center",
    avatar: marcusImg,
  },
  {
    name: "Patricia Reeves",
    location: "Austin, TX",
    quote: "The analytics dashboard shows exactly which services families search for. We adjusted our program offerings based on the data and filled 12 new beds in one quarter.",
    rating: 5,
    role: "provider",
    context: "Operations Manager, Lone Star Recovery",
    avatar: patriciaImg,
  },
  {
    name: "Dr. Steven Park",
    location: "Miami, FL",
    quote: "RehabLookup's verification badge has become a trust signal for our marketing. Families specifically mention seeing our verified listing as why they chose us over competitors.",
    rating: 5,
    role: "provider",
    context: "Medical Director, Coastal Healing Institute",
    avatar: stevenImg,
  },
  {
    name: "Karen Mitchell, NP",
    location: "Portland, OR",
    quote: "We went from struggling to fill beds to having a waitlist within 6 months of joining RehabLookup. The platform connected us with families we never would have reached through traditional marketing.",
    rating: 5,
    role: "provider",
    context: "Director, Evergreen Recovery Center",
    avatar: karenImg,
  },
  {
    name: "Carlos Martinez",
    location: "San Antonio, TX",
    quote: "The Pro subscription paid for itself in the first week. Priority placement and the analytics tools helped us understand our market and grow admissions by 40% year-over-year.",
    rating: 5,
    role: "provider",
    context: "Administrator, Alamo Behavioral Health",
    avatar: carlosImg,
  },
  {
    name: "Andre Jackson, MBA",
    location: "Charlotte, NC",
    quote: "Before RehabLookup, we spent $15,000/month on Google Ads with inconsistent results. Now we get a steady pipeline of qualified leads for a fraction of the cost. Our cost per admission dropped by 60%.",
    rating: 5,
    role: "provider",
    context: "VP of Growth, Carolina Recovery Network",
    avatar: andreImg,
  },
  {
    name: "Catherine Brennan",
    location: "Chicago, IL",
    quote: "The international placement feature opened an entirely new revenue stream for us. We've admitted 8 international clients in the last quarter alone — families who found us exclusively through RehabLookup.",
    rating: 5,
    role: "provider",
    context: "CEO, Lakeshore Treatment Center",
    avatar: catherineImg,
  },
  {
    name: "Dr. Priya Desai",
    location: "Dallas, TX",
    quote: "As a physician running a medication-assisted treatment program, credibility is everything. RehabLookup's accreditation verification gives families confidence that our clinical standards are real, not just marketing claims.",
    rating: 5,
    role: "provider",
    context: "Medical Director, Horizon MAT Clinic",
    avatar: priyaImg,
  },
  {
    name: "William Keane",
    location: "Raleigh, NC",
    quote: "We opened a new facility and needed to fill beds fast. Within 90 days on RehabLookup, we had 22 new admissions directly from the platform. No other channel came close to that ROI.",
    rating: 5,
    role: "provider",
    context: "Founder, Triangle Behavioral Health",
    avatar: williamImg,
  },
  {
    name: "Elena Rodriguez, RN",
    location: "San Diego, CA",
    quote: "The concierge team does incredible pre-screening. By the time a family contacts us, they already understand our program, insurance compatibility, and what to expect. It saves our admissions staff hours every week.",
    rating: 5,
    role: "provider",
    context: "Nursing Director, Pacific Shores Recovery",
    avatar: elenaImg,
  },
];
