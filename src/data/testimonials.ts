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
import richardImg from "@/assets/testimonials/richard-p.jpg";
import graceImg from "@/assets/testimonials/grace-c.jpg";
import andreImg from "@/assets/testimonials/andre-j.jpg";
import catherineImg from "@/assets/testimonials/catherine-b.jpg";
import brianImg from "@/assets/testimonials/brian-e.jpg";
import priyaImg from "@/assets/testimonials/priya-d.jpg";
import williamImg from "@/assets/testimonials/william-k.jpg";
import elenaImg from "@/assets/testimonials/elena-r.jpg";
// New imports
import tanyaImg from "@/assets/testimonials/tanya-w.jpg";
import joseImg from "@/assets/testimonials/jose-m.jpg";
import christineImg from "@/assets/testimonials/christine-b.jpg";
import meganImg from "@/assets/testimonials/megan-r.jpg";
import darnellImg from "@/assets/testimonials/darnell-j.jpg";
import jasonImg from "@/assets/testimonials/jason-f.jpg";
import anitaImg from "@/assets/testimonials/anita-p.jpg";
import keishaImg from "@/assets/testimonials/keisha-d.jpg";
import haroldImg from "@/assets/testimonials/harold-g.jpg";
import vanessaImg from "@/assets/testimonials/vanessa-c.jpg";
import scottImg from "@/assets/testimonials/scott-a.jpg";
import jamesPaulaImg from "@/assets/testimonials/james-paula-w.jpg";
import fatimaImg from "@/assets/testimonials/fatima-a.jpg";
import lauraImg from "@/assets/testimonials/laura-m.jpg";
import ryanImg from "@/assets/testimonials/ryan-c.jpg";
import robertoImg from "@/assets/testimonials/roberto-v.jpg";
import nicoleImg from "@/assets/testimonials/nicole-s.jpg";
import travisImg from "@/assets/testimonials/travis-b.jpg";
import danAmyImg from "@/assets/testimonials/dan-amy-h.jpg";
import malikImg from "@/assets/testimonials/malik-t.jpg";
import rosaImg from "@/assets/testimonials/rosa-g.jpg";
import hannahImg from "@/assets/testimonials/hannah-l.jpg";
import gloriaImg from "@/assets/testimonials/gloria-j.jpg";
import frankImg from "@/assets/testimonials/frank-d.jpg";
import jennyImg from "@/assets/testimonials/jenny-l.jpg";
import terrenceImg from "@/assets/testimonials/terrence-h.jpg";
import connorImg from "@/assets/testimonials/connor-m.jpg";
import sophiaImg from "@/assets/testimonials/sophia-r.jpg";
import margaretImg from "@/assets/testimonials/margaret-k.jpg";

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
    quote: "When our daughter relapsed, we didn't know where to turn. RehabLookup connected us with a facility quickly, and the compassion of their team meant everything to our family.",
    rating: 5,
    role: "family",
    context: "Found placement for daughter",
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
    name: "Brian E.",
    location: "Boston, MA",
    quote: "Fentanyl nearly killed me twice. I needed a facility with medication-assisted treatment that wouldn't just detox me and send me home. RehabLookup found a program with Suboxone support and long-term aftercare planning. I'm 16 months clean — the longest I've ever been.",
    rating: 5,
    role: "seeker",
    context: "Found MAT program with aftercare",
    avatar: brianImg,
  },
  // New seeker testimonials
  {
    name: "Tanya W.",
    location: "Baltimore, MD",
    quote: "I'd been on a waiting list for 3 weeks at another facility. RehabLookup found me a bed at a better program in 48 hours. The intake coordinator already had my information — I didn't have to repeat my story to another stranger. That mattered more than people realize.",
    rating: 5,
    role: "seeker",
    context: "Found immediate placement",
    avatar: tanyaImg,
  },
  {
    name: "José M.",
    location: "San Antonio, TX",
    quote: "My family didn't understand addiction. They thought I could just stop. RehabLookup's team explained the disease model to my parents in Spanish and helped them understand why inpatient was necessary. That conversation changed everything — my family became my biggest supporters.",
    rating: 5,
    role: "seeker",
    context: "Bilingual family support",
    avatar: joseImg,
  },
  {
    name: "Christine B.",
    location: "Denver, CO",
    quote: "I'm a nurse who got addicted to painkillers after a surgery. I needed a program that understood healthcare professionals and could help me keep my license. RehabLookup connected me with a professionals-only program. I've been clean for 20 months and I'm back at work.",
    rating: 5,
    role: "seeker",
    context: "Healthcare professional program",
    avatar: christineImg,
  },
  {
    name: "Megan R.",
    location: "Jacksonville, FL",
    quote: "I was 23 and didn't think I was 'bad enough' for rehab. The team at RehabLookup helped me understand that early intervention gives you the best shot. The young adult program they found felt like being with people who actually got it.",
    rating: 5,
    role: "seeker",
    context: "Found young adult program",
    avatar: meganImg,
  },
  {
    name: "James & Paula W.",
    location: "Memphis, TN",
    quote: "Our grandson was living on the streets. We didn't know where to start or what we could afford on a fixed income. RehabLookup found a state-funded program with an open bed. He's been clean for 8 months and is working again. We couldn't have navigated this alone.",
    rating: 5,
    role: "family",
    context: "Found affordable care for grandson",
    avatar: jamesPaulaImg,
  },
  {
    name: "Fatima A.",
    location: "Dearborn, MI",
    quote: "Finding treatment that respected my faith was essential. I was worried about being judged. RehabLookup matched me with a facility that offered prayer space and understood cultural sensitivity. Recovery became possible because I didn't have to choose between my faith and getting help.",
    rating: 5,
    role: "seeker",
    context: "Found faith-compatible treatment",
    avatar: fatimaImg,
  },
  {
    name: "Travis B.",
    location: "Tulsa, OK",
    quote: "I'd been through two 28-day programs that didn't work. RehabLookup helped me understand that I needed long-term residential — not another short stay. The 6-month program they found gave me the time to actually change. I'm 2 years clean and I own a small business now.",
    rating: 5,
    role: "seeker",
    context: "Found long-term residential",
    avatar: travisImg,
  },
  {
    name: "Dan & Amy H.",
    location: "Scottsdale, AZ",
    quote: "We flew our son across the country for treatment because the local options weren't working. RehabLookup's team handled everything — from coordinating with the facility to helping us plan travel logistics. The distance program worked. He's been sober 18 months.",
    rating: 5,
    role: "family",
    context: "Coordinated out-of-state treatment",
    avatar: danAmyImg,
  },
  {
    name: "Keisha D.",
    location: "Washington, DC",
    quote: "As a Black woman, I wanted a program where the therapists looked like me and understood my experiences. RehabLookup's filters let me search by cultural competency. The program they recommended had diverse clinical staff and it made all the difference in my willingness to open up.",
    rating: 5,
    role: "seeker",
    context: "Found culturally competent care",
    avatar: keishaImg,
  },
  {
    name: "Harold G.",
    location: "Boise, ID",
    quote: "My wife of 40 years was hiding a prescription addiction. At our age, we didn't know where to turn. The RehabLookup team was gentle, patient, and found a program that treated her with the dignity she deserved. She's been medication-free for a year.",
    rating: 5,
    role: "family",
    context: "Found senior-appropriate treatment",
    avatar: haroldImg,
  },
  {
    name: "Vanessa C.",
    location: "Miami, FL",
    quote: "I was pregnant and using, and I was scared for my baby. RehabLookup helped me find a facility with a specialized perinatal program quickly. My daughter was born healthy and I've been in recovery since.",
    rating: 5,
    role: "seeker",
    context: "Found perinatal addiction program",
    avatar: vanessaImg,
  },
  {
    name: "Connor M.",
    location: "Austin, TX",
    quote: "I was skeptical about rehab — I'd heard too many horror stories. RehabLookup showed me verified reviews from real patients, not marketing fluff. Reading honest experiences from people like me gave me the courage to actually go. Nine months clean now.",
    rating: 5,
    role: "seeker",
    context: "Trusted verified reviews",
    avatar: connorImg,
  },
  {
    name: "Hannah L.",
    location: "Nashville, TN",
    quote: "My insurance denied coverage twice for treatment. The RehabLookup team didn't give up — they helped me find a facility that did appeals and got my stay authorized. Without that persistence, I would have given up. I'm 11 months sober.",
    rating: 5,
    role: "seeker",
    context: "Navigated insurance challenges",
    avatar: hannahImg,
  },
  {
    name: "Gloria J.",
    location: "New Orleans, LA",
    quote: "My son is a first responder and his drinking was destroying his career. He needed a program that understood the unique pressures of the job. RehabLookup found a first-responder-specific facility with peer counselors who had walked the same path. He got his life back.",
    rating: 5,
    role: "family",
    context: "Found first responder program",
    avatar: gloriaImg,
  },
];

/**
 * Provider testimonials — REMOVED 2026-08-17 (commercial-truth pass).
 *
 * All 30 entries were written for the retired lead-broker model and could not
 * survive the directory contract. They fell into three groups, and nothing was
 * left once those were taken out:
 *
 *   1. Products that do not exist — "the concierge placement network", "the
 *      concierge team does incredible pre-screening", "the international
 *      placement feature", "Priority placement". RehabLookup runs no concierge,
 *      places no patients, and does not sell organic position.
 *   2. Quantified outcomes attributed to RehabLookup that nothing substantiates
 *      — "grow admissions by 40% year-over-year", "22 new admissions in 90
 *      days", "show-up rate went from 60% to over 85%", "filled 12 new beds in
 *      one quarter", "detox admissions increased 55%".
 *   3. Lead-delivery framing — "the leads from RehabLookup are the most
 *      qualified I've ever seen", "far better-matched leads", "the detailed
 *      intake data that comes with each lead". RehabLookup does not sell,
 *      qualify or deliver patient leads; families contact facilities directly.
 *
 * Group 3 is why this is an empty array rather than a filtered list: the
 * fourteen quotes that carried no false product name and no invented number
 * still described a lead product. Replacements are not invented here — real,
 * attributable provider quotes can be added back through this export once they
 * exist and describe what RehabLookup actually sells.
 *
 * TestimonialsSection renders nothing for an empty list, so the consuming page
 * (/providers/resources) simply drops the section.
 */
export const providerTestimonials: Testimonial[] = [];
