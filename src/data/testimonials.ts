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
// New imports
import tanyaImg from "@/assets/testimonials/tanya-w.jpg";
import joseImg from "@/assets/testimonials/jose-m.jpg";
import christineImg from "@/assets/testimonials/christine-b.jpg";
import kevinImg from "@/assets/testimonials/kevin-n.jpg";
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
    name: "Kevin N.",
    location: "Portland, OR",
    quote: "My wife's drinking had escalated over the pandemic. Every facility I called made me feel like a number. The RehabLookup concierge actually listened to what our family was going through and found a program with strong family therapy. She's 14 months sober and our marriage survived.",
    rating: 5,
    role: "family",
    context: "Found treatment for his wife",
    avatar: kevinImg,
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
    quote: "I was pregnant and using. Every day I didn't get help, I was hurting my baby. RehabLookup found a facility with a specialized perinatal program within 24 hours. My daughter was born healthy and I've been clean since. They saved two lives that day.",
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
  // New provider testimonials
  {
    name: "Darnell Jackson",
    location: "Atlanta, GA",
    quote: "Our 45-bed facility was running at 62% occupancy when we joined RehabLookup. Within four months, we hit 91%. The exclusive lead model means my admissions team actually has time to do proper clinical assessments instead of racing to dial numbers.",
    rating: 5,
    role: "provider",
    context: "CEO, Peachtree Recovery Center",
    avatar: darnellImg,
  },
  {
    name: "Jason Fischer, LMFT",
    location: "San Francisco, CA",
    quote: "We specialize in LGBTQ+ affirming care, which can be hard to market. RehabLookup's search filters connect us directly with families looking for exactly what we offer. Our inquiry-to-admission rate went from 15% to 38%.",
    rating: 5,
    role: "provider",
    context: "Program Director, Bay Area Wellness",
    avatar: jasonImg,
  },
  {
    name: "Anita Patel, MD",
    location: "Houston, TX",
    quote: "The detailed intake data that comes with each lead is remarkable. We know the substance, insurance carrier, urgency level, and preferred location before we ever pick up the phone. It's eliminated 90% of the back-and-forth in our admissions process.",
    rating: 5,
    role: "provider",
    context: "Medical Director, Gulf Coast Behavioral Health",
    avatar: anitaImg,
  },
  {
    name: "Scott Anderson",
    location: "Minneapolis, MN",
    quote: "I manage three sober living facilities. RehabLookup is the only platform where we consistently get referrals for step-down care. Families searching for sober living specifically find us here. We've maintained 95%+ occupancy across all three houses.",
    rating: 5,
    role: "provider",
    context: "Owner, North Star Sober Living",
    avatar: scottImg,
  },
  {
    name: "Laura Mitchell, LCSW",
    location: "Phoenix, AZ",
    quote: "We run a small women's-only residential program — 12 beds. Big directories buried us behind facilities with huge ad budgets. On RehabLookup, our verified listing and genuine reviews actually surface us to families who are the right fit. We haven't had an empty bed in 7 months.",
    rating: 5,
    role: "provider",
    context: "Executive Director, Serenity Women's Center",
    avatar: lauraImg,
  },
  {
    name: "Ryan Chen, PharmD",
    location: "Los Angeles, CA",
    quote: "Our MAT clinic serves 200+ patients monthly. RehabLookup drives a steady stream of patients looking specifically for Suboxone and Vivitrol programs. The platform understands the difference between residential rehab and outpatient MAT, which most directories don't.",
    rating: 5,
    role: "provider",
    context: "Director, Pacific MAT Clinic",
    avatar: ryanImg,
  },
  {
    name: "Roberto Valdez",
    location: "El Paso, TX",
    quote: "We serve a predominantly Hispanic community and needed a platform that could connect us with Spanish-speaking families. RehabLookup's bilingual search features bring us 30% of our new admissions. No other directory even comes close for our demographic.",
    rating: 5,
    role: "provider",
    context: "Administrator, Frontera Treatment Center",
    avatar: robertoImg,
  },
  {
    name: "Dr. Nicole Stafford",
    location: "Nashville, TN",
    quote: "I was spending $8,000/month on leads from two other directories — shared leads that went to 10 facilities simultaneously. Switched to RehabLookup's exclusive model and my cost per admission dropped by half while my admissions team's morale went through the roof.",
    rating: 5,
    role: "provider",
    context: "CMO, Southern Behavioral Health Group",
    avatar: nicoleImg,
  },
  {
    name: "Malik Thompson",
    location: "Philadelphia, PA",
    quote: "RehabLookup's provider dashboard gives us real-time visibility into how families find us — which search terms, which pages, which filters. We used that data to add an adolescent program. It filled to capacity in 6 weeks.",
    rating: 5,
    role: "provider",
    context: "VP of Operations, Liberty Recovery Network",
    avatar: malikImg,
  },
  {
    name: "Rosa Garcia, RN",
    location: "Tampa, FL",
    quote: "Our detox unit was underperforming because we couldn't market effectively to families in active crisis. RehabLookup's urgency-based search connects us with families who need same-day placement. Our detox admissions increased 55% in the first quarter.",
    rating: 5,
    role: "provider",
    context: "Detox Unit Director, Suncoast Recovery",
    avatar: rosaImg,
  },
  {
    name: "Frank DiMaggio",
    location: "Boston, MA",
    quote: "I've been in this industry 25 years. The leads from RehabLookup are the most qualified I've ever seen from any directory. When my admissions team calls, the family is ready to have a real conversation about treatment — not asking basic questions about what rehab even is.",
    rating: 5,
    role: "provider",
    context: "Owner, New England Recovery Institute",
    avatar: frankImg,
  },
  {
    name: "Jenny Liu",
    location: "Seattle, WA",
    quote: "We launched our IOP program during COVID and had zero patient pipeline. RehabLookup was the first platform to list virtual IOP as a searchable treatment type. Within 60 days we had a full roster. They understood the market shift before anyone else.",
    rating: 5,
    role: "provider",
    context: "Program Director, Cascade Behavioral Health",
    avatar: jennyImg,
  },
  {
    name: "Terrence Howard, MBA",
    location: "Detroit, MI",
    quote: "We operate in a competitive urban market with 40+ facilities. RehabLookup's verified badge and patient reviews differentiate us from facilities that cut corners. Families tell us they chose us specifically because of our RehabLookup profile. That trust is priceless.",
    rating: 5,
    role: "provider",
    context: "CEO, Great Lakes Recovery Center",
    avatar: terrenceImg,
  },
  {
    name: "Sophia Rivera, LMHC",
    location: "Orlando, FL",
    quote: "Our dual-diagnosis program treats complex cases that most facilities won't take. RehabLookup's detailed intake forms help us identify appropriate referrals before we invest time in an assessment. The match quality is exceptional — 70% of leads are clinically appropriate for our program.",
    rating: 5,
    role: "provider",
    context: "Clinical Director, Central Florida Behavioral",
    avatar: sophiaImg,
  },
  {
    name: "Dr. Margaret Kelly",
    location: "Denver, CO",
    quote: "As chief medical officer of a 120-bed campus, I need marketing channels that deliver volume without sacrificing quality. RehabLookup is the only platform where we've scaled to 30+ admissions per month while maintaining our clinical selectivity. The ROI is 4x our next best channel.",
    rating: 5,
    role: "provider",
    context: "CMO, Rocky Mountain Treatment Campus",
    avatar: margaretImg,
  },
  {
    name: "Gloria Jenkins, LCPC",
    location: "Kansas City, MO",
    quote: "We specialize in trauma-informed care for women who've experienced domestic violence alongside addiction. RehabLookup lets us specify our niche populations so families who need exactly what we offer find us. Our waitlist went from empty to 3 weeks within two months.",
    rating: 5,
    role: "provider",
    context: "Founder, Haven Women's Recovery",
    avatar: gloriaImg,
  },
  {
    name: "Hannah Lewis",
    location: "Albuquerque, NM",
    quote: "Running a faith-based recovery program in a rural area, we struggled with visibility. RehabLookup's state-specific search pages rank on Google for searches we could never afford to target ourselves. We now receive 8–10 qualified inquiries monthly from families specifically seeking faith-based care.",
    rating: 5,
    role: "provider",
    context: "Director, Grace Path Recovery Ministry",
    avatar: hannahImg,
  },
];
