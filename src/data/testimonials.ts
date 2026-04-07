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
];
