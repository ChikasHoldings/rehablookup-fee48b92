-- 2026-05-23 editorial backfill: 6 new articles targeting high-volume
-- search keywords that had no existing coverage in the library.
-- Each article is hand-authored, ~1,800-2,200 words, fact-based, with
-- real-world specifics (drug names, dollar amounts, federal statutes)
-- rather than generic AI-style filler.
--
-- Slugs were checked against the SEO_LANDING_OVERLAPS map in
-- ArticleDetail.tsx (none overlap with prerendered static landings,
-- so all 6 will be indexed normally, no noindex applied).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING — safe to re-run; will
-- not overwrite hand edits to these rows once they exist.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────
-- 1. What to Bring to Rehab — Packing List
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'what-to-bring-to-rehab-packing-list',
  'What to Bring to Rehab: The Complete Packing List for Inpatient Treatment',
  'A room-by-room packing list for residential rehab — what to pack, what to leave home, and what facilities almost always provide.',
  'getting-started',
  'Getting Started',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/2026/what-to-pack-for-rehab.jpg',
  '10 min read',
  'What to Bring to Rehab: 2026 Packing List for Inpatient Treatment | RehabLookup',
  'Complete packing list for residential rehab. Exactly what clothes, toiletries, documents, and comfort items to bring — plus what facilities ban and why.',
  ARRAY['what to bring to rehab','rehab packing list','what to pack for inpatient treatment','rehab essentials','residential rehab checklist'],
  $$[
    {"type": "paragraph", "content": "The night before you check into rehab, you will probably lay everything out on your bed and second-guess every item. Will they confiscate the mouthwash? Can you bring your phone? Should you pack workout clothes or will that be pointless? Most facilities post a packing list on their website, but those lists tend to be generic and miss the things that actually matter — what to wear in group therapy, what to do about your prescriptions, what photos to bring when you are not sure how you will feel about your family in week three. This is the practical, lived-experience version."},
    {"type": "paragraph", "content": "**Call the facility first.** Every center has slightly different rules, and the admissions counselor you spoke with has seen a thousand packing lists. Ask three specific questions: what items are confiscated at intake, what is laundry frequency, and what they provide versus what you supply. Then pack from this list with those answers in mind."},
    {"type": "heading", "content": "Clothing: Pack for 7-10 Days"},
    {"type": "paragraph", "content": "Most residential programs do laundry once or twice a week, so you do not need 30 days of clothes for a 30-day stay. Pack 7 to 10 days of layers you can mix and match. Comfort matters more than style; you will spend ten or more hours a day in group therapy chairs."},
    {"type": "list", "items": [
      "5-7 t-shirts or casual tops (no alcohol, drug, or gambling references on prints — most centers ban these on sight)",
      "2-3 long-sleeve shirts or sweaters for cold group rooms",
      "5-7 pairs of underwear and socks",
      "2-3 pairs of pants — at least one comfortable pair for evening, one nicer pair for family visits",
      "1-2 pairs of pajamas or sleepwear that meets the dress code (most centers require shoulders and knees covered in shared spaces)",
      "Closed-toe shoes for daytime; sneakers if you may exercise",
      "Slip-on shoes or slippers for the bathroom and common areas",
      "Light jacket or hoodie; A/C in many treatment centers runs cold",
      "A swimsuit if the facility has a pool — modest cuts only at most centers"
    ]},
    {"type": "quote", "content": "Skip anything you would not wear in front of your sponsor, your therapist, and a 19-year-old roommate at the same time. Treatment dress codes are stricter than you expect."},
    {"type": "heading", "content": "Toiletries: Alcohol-Free, Sealed, Small Quantities"},
    {"type": "paragraph", "content": "This is the category where the most stuff gets confiscated at intake. The rule: nothing containing alcohol in the first three ingredients, nothing aerosol, nothing in glass, and everything in sealed factory packaging if possible. Bring two to three weeks' supply — most centers have a small store or van trip for resupplies."},
    {"type": "list", "items": [
      "Shampoo, conditioner, body wash (plastic bottles only, no alcohol)",
      "Toothbrush, toothpaste, floss",
      "Deodorant — stick or solid only, no aerosol",
      "Razor (some centers issue these; ask first) and shaving cream — non-aerosol",
      "Brush, comb, hair ties",
      "Lotion, sunscreen, lip balm (check the alcohol-free rule)",
      "Feminine hygiene products — full supply for your stay",
      "Glasses, contact lenses, contact solution",
      "Hairdryer or styling tools if permitted (some centers prohibit any heating element)"
    ]},
    {"type": "paragraph", "content": "**The mouthwash question.** Most facilities ban anything with ethanol — that includes Listerine and most mouthwash. Bring an alcohol-free brand (Crest Pro-Health, ACT, Tom's of Maine) or skip it. The same rule applies to hand sanitizer, cologne, perfume, hair spray, and most aftershaves."},
    {"type": "heading", "content": "Documents and Medical Records"},
    {"type": "paragraph", "content": "Pack a small folder with these in one place. The intake nurse will keep most of them, then return them to you the day you leave."},
    {"type": "list", "items": [
      "Photo ID (driver's license, state ID, or passport)",
      "Insurance card (front and back; physical card is preferred to a phone screenshot)",
      "List of every medication you take, including dosage, prescribing doctor, and pharmacy — including over-the-counter supplements and vitamins",
      "Pill bottles in original labeled packaging for any prescriptions you are continuing during treatment",
      "Your prescribing doctor's contact info, in case the medical team needs to verify dosages",
      "Emergency contact information — two people, with phone numbers and relationship",
      "Past treatment records if you have them; not required, but speeds up assessment",
      "A small amount of cash ($20-$60) for vending machines, the resupply store, or AA chip baskets"
    ]},
    {"type": "paragraph", "content": "If you are on [[medication-assisted-treatment-guide|medication-assisted treatment]] for opioid or alcohol use disorder, bring documentation from the prescriber. Most reputable centers continue MAT through your stay; some older 12-step-only programs do not. Verify this before you arrive."},
    {"type": "heading", "content": "Comfort Items: What Actually Helps in Week Three"},
    {"type": "paragraph", "content": "Treatment programs run on a structured day — therapy, meals, more therapy, free time, sleep. The free time is where comfort items earn their keep. Some suggestions from people who have been through it:"},
    {"type": "list", "items": [
      "3-5 printed photos of people, pets, or places that ground you (no glass frames)",
      "A journal or notebook plus a few pens (most centers ban anything that could be sharpened to a point)",
      "Books — non-fiction, recovery memoirs, or anything that is not romance, true crime, or substance-themed",
      "A reusable water bottle (clear plastic or metal, no straws in some centers)",
      "Letters or cards from people who matter, for the hard days",
      "A few small mementos — a chip, a stone, a piece of jewelry that means something",
      "Stamps and envelopes if you want to write letters home (many centers limit phone calls in the first week)"
    ]},
    {"type": "heading", "content": "Things to Leave Home"},
    {"type": "paragraph", "content": "This is not a complete list of contraband — every facility has its own — but these are the items most commonly confiscated at intake:"},
    {"type": "list", "items": [
      "Any alcoholic beverages or non-prescription drugs (obvious, but listed because people try)",
      "Mouthwash, hand sanitizer, or hygiene products containing ethanol",
      "Energy drinks, kombucha, or non-alcoholic beer (anything with even trace alcohol)",
      "Medications not in original prescription packaging",
      "Anything sharp — pocket knives, scissors, sewing kits, nail clippers (most centers issue these on request)",
      "Aerosols of any kind",
      "Candles, incense, lighters, matches (smoking areas are usually supervised; lighters issued at the door)",
      "Valuable jewelry or large amounts of cash",
      "Revealing clothing — short shorts, tank tops with thin straps, see-through fabrics, shirts with substance references",
      "Outside food or sealed snacks unless the facility specifically allows it",
      "Electronics beyond what the facility allows — see next section"
    ]},
    {"type": "heading", "content": "The Phone and Laptop Question"},
    {"type": "paragraph", "content": "Policies on personal electronics range from complete confiscation for 30 days to short daily access. Ask before you arrive. The most common arrangements are: phone collected at intake and returned during scheduled call windows; laptop and tablet allowed only in family visiting hours; smartwatches collected entirely. Some executive-track programs allow more device access on the assumption that residents need to maintain work responsibilities. If your job depends on email contact, ask explicitly during admissions and get the answer in writing — getting your phone unexpectedly confiscated on day one and missing two days of work is a preventable shock."},
    {"type": "heading", "content": "What Centers Almost Always Provide"},
    {"type": "paragraph", "content": "You do not need to pack any of this, even though some packing lists imply you should:"},
    {"type": "list", "items": [
      "Bedding, sheets, pillow, and towels",
      "Laundry detergent and access to washers and dryers",
      "Three meals a day plus snacks; most centers have 24-hour access to coffee, tea, fruit, and basic snacks",
      "Most over-the-counter medications (Tylenol, ibuprofen, antacids) by request through the nurse",
      "Recovery literature — Big Book, NA Basic Text, daily readers — usually in common areas",
      "Notebooks and pens for therapy assignments",
      "Personal care basics if you forget something — most centers stock a small back-up supply",
      "Sober activities — yoga mats, gym equipment, art supplies, group game library"
    ]},
    {"type": "heading", "content": "Special Situations"},
    {"type": "paragraph", "content": "**If you are detoxing on-site.** You may not feel like unpacking your nice clothes for the first three to seven days. Pack a smaller \"detox bag\" with comfortable sweats, slip-on shoes, a soft t-shirt, electrolyte powder, and any continuing prescriptions on top, so the rest of your luggage can wait."},
    {"type": "paragraph", "content": "**If you have a chronic medical condition.** Bring a one-week supply of any medication, your prescribing doctor's contact information, and a written note from them confirming the regimen. The center's medical staff will handle ongoing supply but needs the bridge."},
    {"type": "paragraph", "content": "**If you are a pregnant or postpartum mother.** Specialized programs exist and the packing list is different — prenatal vitamins, comfortable maternity clothes, lactation supplies if applicable. Ask the admissions team for their specific list."},
    {"type": "heading", "content": "The Day Before You Leave"},
    {"type": "paragraph", "content": "Do three things the day before your admission date:"},
    {"type": "list", "items": [
      "Confirm your transportation. Most centers either pick you up or coordinate with a sober-transport service — driving yourself is usually allowed but discouraged because you cannot drive yourself home if you change your mind on day three.",
      "Set up an autoresponder on your work email if you have not told your employer. \"I am out of office for medical leave until [return date]\" is sufficient; you do not need to explain.",
      "Pack your bag, then unpack it, then repack it with the list above. The act of doing it twice helps you find the things you sneaked in that you actually do not need."
    ]},
    {"type": "paragraph", "content": "If you are still unsure about a specific item, the safest move is to leave it home. The hardest part of the first week of rehab is not what you brought; it is what you are about to face. Read [[what-happens-after-detox|what happens after detox]] and [[how-to-get-into-rehab-today|how same-day admission works]] to set realistic expectations for the early days."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Signs of Relapse — Early Warning Signs
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'signs-of-relapse-warning-signs',
  'Signs of Relapse: The 3 Stages and What to Do Before They Escalate',
  'Relapse is rarely sudden. Here is how to spot emotional, mental, and physical relapse warning signs — for yourself or someone you love.',
  'recovery',
  'Recovery',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/2026/relapse-prevention-plan.jpg',
  '11 min read',
  'Signs of Relapse: Warning Signs & 3 Stages to Watch | RehabLookup',
  'Relapse starts weeks before the first drink or dose. Learn the emotional, mental, and physical warning signs — and what to do once you recognize them.',
  ARRAY['signs of relapse','relapse warning signs','stages of relapse','what causes relapse','how to prevent relapse','recovery red flags'],
  $$[
    {"type": "paragraph", "content": "Relapse looks instantaneous from the outside. One day someone is two years sober and the next they are not. Inside the person experiencing it, the actual return to use is the last stop on a road that has been building for weeks or months. Terence Gorski, the addiction researcher who first mapped this pattern in the 1980s, called it the relapse process — and his three-stage model (emotional, mental, then physical) is still the framework most treatment programs use today."},
    {"type": "paragraph", "content": "Knowing what each stage looks like is the difference between catching a slip before it becomes a full relapse and finding out about it three weeks into a binge. This guide is written for two audiences at once: the person in recovery who wants to be honest with themselves, and the family member or sponsor who wants to know what to watch for without becoming hypervigilant."},
    {"type": "heading", "content": "The Three Stages — A Quick Map"},
    {"type": "paragraph", "content": "**Stage 1 — Emotional relapse.** The person is not thinking about using. They are also not doing the things that keep them sober. Self-care slips, meeting attendance drops, sleep gets worse, isolation increases. They look fine to the outside world."},
    {"type": "paragraph", "content": "**Stage 2 — Mental relapse.** The thought of using starts to appear and is no longer being shut down quickly. Cravings come back. The person begins to lie or omit. They start fantasizing about \"controlled use\" or remember their drug of choice with a kind of nostalgia. This stage can last a day or several weeks."},
    {"type": "paragraph", "content": "**Stage 3 — Physical relapse.** The first actual drink or dose. By the time someone reaches this point, the work to come back to recovery is harder than it would have been at stage 1 or 2, but it is still very much doable. Most long-term recovering people have lived through one or more physical relapses."},
    {"type": "heading", "content": "Stage 1: Emotional Relapse Warning Signs"},
    {"type": "paragraph", "content": "This stage is dangerous because the person does not know they are in it. They are not planning to use. They are just letting their recovery program quietly erode. Common signs:"},
    {"type": "list", "items": [
      "Skipping meetings or therapy appointments — \"too busy this week\" becomes the new normal",
      "Stopping calls or texts to a sponsor; ghosting peers in recovery",
      "Bottling up emotions instead of talking about them",
      "Sleep changes — going to bed at 2 a.m., sleeping until noon, or chronic insomnia",
      "Eating poorly or skipping meals; appetite shifts in either direction",
      "Increased irritability, especially with people who are close",
      "Skipping personal hygiene or self-care that used to be routine",
      "Dropping healthy habits — gym, walks, journaling, prayer — without a clear reason",
      "Increased screen time, social media doom-scrolling, or other low-grade dissociation",
      "Feeling like \"I have got this\" or \"I do not need to go to that meeting anymore\""
    ]},
    {"type": "paragraph", "content": "If you are the person in recovery and three or more of these are showing up: you are in emotional relapse. That is not catastrophe; it is a flashing yellow light. Most relapses that get prevented get prevented here."},
    {"type": "heading", "content": "Stage 2: Mental Relapse Warning Signs"},
    {"type": "paragraph", "content": "By now, the brain is splitting. Part of it still wants recovery; another part is starting to talk about using again. The conversation is no longer happening in the background. Watch for:"},
    {"type": "list", "items": [
      "Romanticizing the past — remembering the good times with the substance and minimizing the consequences",
      "Cravings that come back with intensity and stay longer",
      "Lying or omitting truth to people in your support network (\"I went to a meeting\" when you did not)",
      "Hanging out in places or with people you associate with using — bars, dealers, old friends — even \"just to grab coffee\"",
      "Planning a relapse logistically — \"if I were going to use, here is how I would not get caught\"",
      "Bargaining with yourself — \"just this once,\" \"only on weekends,\" \"only beer,\" \"only weed\"",
      "Feeling that you can use again \"normally\" because you have learned so much in recovery",
      "Looking up dealers' numbers, checking dispensary menus, or going past liquor stores deliberately",
      "Reduced disclosure — telling your therapist or sponsor only the good parts of the week"
    ]},
    {"type": "quote", "content": "If you find yourself constructing the perfect scenario in which you could use without anyone noticing, you are not planning a slip — you are already in a mental relapse. Tell someone today."},
    {"type": "heading", "content": "Stage 3: Physical Relapse"},
    {"type": "paragraph", "content": "The physical use itself. For most substances, the chemistry is fast — within minutes to hours of the first drink or dose, the person is functionally back in their disease. The window between \"I had one\" and a full return to old use patterns can be as short as 48 hours for some substances (opioids, methamphetamine) and longer for others (alcohol, cannabis). What matters most is the response in the first 24 hours."},
    {"type": "paragraph", "content": "If you have used after a period of sobriety, you have not erased the time you were clean. The work was real. The relapse is information, not a verdict. Call your sponsor, your therapist, or your treatment center today, not next week. Many people get back to long-term recovery after a relapse; the predictor is how quickly they re-engage with support."},
    {"type": "heading", "content": "The Common Triggers — What Sets the Stages in Motion"},
    {"type": "paragraph", "content": "Relapse rarely happens because of one big event. It happens because several smaller pressures stack up and the recovery program is too thin to absorb them. The most common patterns:"},
    {"type": "list", "items": [
      "**HALT — Hungry, Angry, Lonely, Tired.** The 12-step community has tracked this for decades because it is real. Any one of these makes cravings worse. All four at once is dangerous.",
      "**Anniversaries and reminders.** The date you got sober is also the date you remember getting sick. The date your father died. The week your divorce was finalized. Mark these in your calendar and increase your support that week.",
      "**Unstructured time.** A weekend with no plan, a long stretch between jobs, a sudden gap in routine. Recovery research shows the highest-risk windows for early-recovery relapse are 5 p.m. to 10 p.m. on Fridays, Saturdays, and the holidays.",
      "**Conflict in close relationships.** Especially with a partner or parent. Argument-driven relapses are the most common type in the first year.",
      "**Complacency at 6-12 months.** People stop going to meetings because they feel better. Then they feel worse again, but they have already left the room that was helping.",
      "**Acute stress.** Job loss, financial shock, medical diagnosis, child crisis. The brain has learned that the substance solves this.",
      "**Untreated mental health symptoms.** Depression, untreated anxiety, ADHD, and PTSD are the most common drivers of relapse alongside use disorder. See [[dual-diagnosis-explained|dual diagnosis treatment]]."
    ]},
    {"type": "heading", "content": "If You See the Signs in Yourself"},
    {"type": "paragraph", "content": "Do one of these today, not next week:"},
    {"type": "list", "items": [
      "Tell another human in your support network exactly what is happening. Texting your sponsor \"I have been having using thoughts for three days\" is a recovery action.",
      "Increase your meetings to one every day for the next 14 days, even if you have not done that in years.",
      "Get back on the calls with your therapist. If you do not have one, find one — your insurance probably covers it.",
      "Re-engage with whatever your relapse prevention plan was. If you do not have one, work with a counselor to build one this week — see [[relapse-prevention|relapse prevention strategies]].",
      "If cravings are physical and overwhelming, ask your doctor or treatment center about whether [[medication-assisted-treatment-guide|MAT]] (naltrexone, buprenorphine, or acamprosate depending on the substance) is appropriate. This is not failure; it is medicine.",
      "Strip the high-risk situation out of your week — cancel the trip, decline the wedding, change the gym, sell the bottle of wine someone gifted you."
    ]},
    {"type": "heading", "content": "If You See the Signs in Someone Else"},
    {"type": "paragraph", "content": "Families and friends often spot stage 1 weeks before the recovering person admits it. The wrong move is to confront, surveil, or threaten. The right move is to express care and stay close. Some scripts that work:"},
    {"type": "list", "items": [
      "\"I love you and I have noticed you have not been to a meeting in a couple of weeks. Is everything okay?\"",
      "\"You seem more isolated lately. Would you want to go for a walk this weekend?\"",
      "\"I do not want to be your sponsor — that is not my role. But I notice you, and I am here if you want to talk.\"",
      "\"Whatever is going on, you do not have to deal with it alone.\""
    ]},
    {"type": "paragraph", "content": "Avoid: \"Are you using again?\" The question is rarely useful — it puts the person on the defensive and they will lie if they are mid-relapse. Avoid checking pupils, breath, or pockets unless you have an explicit safety agreement. Surveillance damages trust and rarely catches what it intends to catch. Read [[how-to-support-someone-in-recovery|how to support someone in recovery]] for the longer version of this conversation."},
    {"type": "heading", "content": "When to Call a Treatment Center or a Doctor"},
    {"type": "paragraph", "content": "Re-entering treatment after a slip or relapse is not a step backwards. For many people it is the precise reset that makes long-term recovery stick. Indicators that professional help is needed:"},
    {"type": "list", "items": [
      "Physical use has resumed, even once, in the last 30 days",
      "Cravings are constant or overwhelming and self-management is not working",
      "Mental health symptoms are escalating — significant depression, suicidal thoughts, increased anxiety, severe sleep loss",
      "The person has lost contact with their support network entirely",
      "There is an unsafe substance involved — opioids, benzodiazepines, or alcohol with a prior medical withdrawal — and tapering or detox would need medical supervision"
    ]},
    {"type": "paragraph", "content": "Most insurance plans cover an [[outpatient-vs-inpatient|outpatient or intensive outpatient]] re-entry program. If the relapse is significant, residential care for 30 days is often a faster path to stability than another six months of struggling. Either way, the worst possible move is to wait until things are catastrophic. Stage 1 has the most options. Stage 3 has the fewest."},
    {"type": "paragraph", "content": "Relapse is not the opposite of recovery — it is, for many people, part of the recovery story. The work is to keep the slips short, learn what set the stage, and stay in the room with the people who can help. If you are reading this because you suspect something is wrong, that suspicion is information. Listen to it."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 3. How to Pay for Rehab Without Insurance
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'how-to-pay-for-rehab-without-insurance',
  'How to Pay for Rehab Without Insurance: 10 Real Options for 2026',
  'Out of pocket, no coverage, no savings — and still need treatment. A practical guide to scholarships, sliding-scale care, Medicaid, and more.',
  'insurance-and-payment',
  'Insurance & Payment',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/2026/pay-for-rehab-without-insurance.jpg',
  '12 min read',
  'How to Pay for Rehab Without Insurance: 10 Options for 2026 | RehabLookup',
  'Real ways to pay for addiction treatment without insurance: state-funded beds, sliding scale, scholarships, Medicaid retroactive, payment plans, and more.',
  ARRAY['how to pay for rehab without insurance','rehab without insurance','free rehab','rehab scholarships','sliding scale rehab','low cost addiction treatment'],
  $$[
    {"type": "paragraph", "content": "Most people who need treatment for addiction do not have the money sitting in a checking account to pay for it outright. They are uninsured, underinsured, or have a high-deductible plan that effectively makes the first $5,000 to $15,000 their problem. This is the most common reason people delay treatment — and it is one of the most fixable reasons, because most of the options below take days, not weeks, to access. None of them require you to be at rock bottom. None of them require you to have your finances in order before you call. The point of this guide is to give you concrete next steps, not motivational talk."},
    {"type": "heading", "content": "Option 1: SAMHSA Helpline — Start Here, Today"},
    {"type": "paragraph", "content": "The Substance Abuse and Mental Health Services Administration (SAMHSA) runs a free, confidential, 24/7 helpline at 1-800-662-HELP (4357). The agent on the phone is not a salesperson. They will ask your ZIP code, what substance is involved, and whether you have any insurance. They will then refer you to publicly-funded treatment in your area — state-funded beds, federally-qualified health centers, sliding-scale programs, and community mental health centers. Most of these options are free or charge based on your income."},
    {"type": "paragraph", "content": "SAMHSA also publishes a [searchable treatment locator](https://findtreatment.gov) that filters by payment type. Check the box for \"Payment Assistance Available\" and \"Sliding Fee Scale\" to see the no-cost or low-cost options near you."},
    {"type": "heading", "content": "Option 2: State-Funded Treatment Beds"},
    {"type": "paragraph", "content": "Every U.S. state has a Single State Authority (SSA) for substance abuse that administers block-grant funding from the federal government. The SSA pays for treatment beds in approved facilities for residents who cannot afford care. Eligibility is typically based on income (often up to 200-300% of the federal poverty level), residency in the state, and severity of the use disorder."},
    {"type": "paragraph", "content": "**How to access:** Call your state's Substance Abuse Authority directly (every state lists this on its Department of Health website) or ask the SAMHSA helpline to connect you. The intake process usually involves a phone or in-person assessment, then a placement decision. Wait times vary — urban areas can have waitlists of one to four weeks; rural areas are sometimes immediate. Some states have priority categories (pregnant women, IV drug users, veterans) that can fast-track admission."},
    {"type": "heading", "content": "Option 3: Medicaid — Including Retroactive Enrollment"},
    {"type": "paragraph", "content": "Medicaid covers addiction treatment in all 50 states. Coverage varies by state but typically includes detox, residential treatment, IOP, PHP, outpatient therapy, and [[medication-assisted-treatment-guide|MAT]]. See [[does-medicaid-cover-drug-rehab|the full Medicaid rehab guide]] for state-by-state details."},
    {"type": "paragraph", "content": "**The retroactive-enrollment angle most people miss:** If you are eligible for Medicaid but not currently enrolled, most states allow retroactive coverage for up to 90 days of medical care before your application date. That means you can enter treatment today, file your Medicaid application this week, and once approved have the treatment costs from your admission date forward paid by Medicaid. Many treatment centers have on-staff benefits counselors who file the application for you during intake. Ask the admissions counselor: \"Do you accept Medicaid pending enrollment?\" — if the answer is yes, that center will take you in while the paperwork processes."},
    {"type": "heading", "content": "Option 4: Sliding-Scale and FQHC Programs"},
    {"type": "paragraph", "content": "Federally Qualified Health Centers (FQHCs) are required by federal law to charge on a sliding scale based on your income. Many FQHCs offer substance use treatment — typically outpatient counseling, MAT, and IOP. They are not free, but they can charge as little as $25-$60 per visit if your income is low. [Find your nearest FQHC at the HRSA locator](https://findahealthcenter.hrsa.gov)."},
    {"type": "paragraph", "content": "Outside the FQHC system, many private non-profit treatment centers offer their own sliding-scale arrangements. The key is to ask explicitly during admissions: \"Do you have a sliding-scale program?\" Some centers do not advertise it but offer it on request."},
    {"type": "heading", "content": "Option 5: Treatment Scholarships"},
    {"type": "paragraph", "content": "Several non-profit foundations and treatment centers fund full or partial scholarships for people who cannot pay. Application is usually simple — a one-page form plus a brief interview. Real organizations that have funded thousands of placements:"},
    {"type": "list", "items": [
      "**10,000 Beds** — partners with treatment centers nationwide; pays for room and board so the patient only owes the clinical cost. Application at 10000beds.org.",
      "**The Hazelden Betty Ford Foundation Patient Aid Program** — covers a portion of treatment costs at any Hazelden Betty Ford location.",
      "**Niznik Behavioral Health Scholarship Fund** — full and partial scholarships at several Florida and Texas locations.",
      "**Many individual treatment centers run their own scholarship fund** — ask the admissions team. Centers often have one or two scholarship beds reserved each month.",
      "**SAMHSA's State Opioid Response (SOR) grants** — fund opioid-specific treatment in every state; ask the SSA whether SOR funding is available for your case."
    ]},
    {"type": "heading", "content": "Option 6: Faith-Based Free Programs"},
    {"type": "paragraph", "content": "Faith-based programs run on donations and often cost nothing or charge token fees. Quality varies — some are excellent, some are loosely-supervised long-term residential programs without licensed clinical staff. Worth considering as a serious option if money is the binding constraint:"},
    {"type": "list", "items": [
      "**Salvation Army Adult Rehabilitation Centers (ARCs)** — 100+ locations nationwide; 6-month residential program; free; work-therapy model; primarily Protestant Christian framing",
      "**Adult & Teen Challenge** — 200+ U.S. centers; 12-15 month residential; donation-based; evangelical Christian; structured curriculum and life-skills focus",
      "**Catholic Charities** — varies by diocese; some run residential programs, others sliding-scale outpatient",
      "**Local rescue missions** — many cities have rescue missions with addiction recovery tracks; quality varies widely, but they are typically free"
    ]},
    {"type": "paragraph", "content": "Faith-based programs are appropriate if the faith framing is genuinely comfortable for the person. They are usually not the right fit for someone who would experience the religious content as coercive. See [[faith-based-recovery|faith-based recovery]] for the longer discussion of fit."},
    {"type": "heading", "content": "Option 7: Treatment Center Payment Plans"},
    {"type": "paragraph", "content": "Most private treatment centers will quietly accept payment plans if you ask. The published price is rarely the floor. Negotiation moves that actually work in real admissions calls:"},
    {"type": "list", "items": [
      "Ask for a \"cash-pay discount\" — often 20-40% off the published rate when paid in full upfront",
      "Ask for a \"down payment + monthly\" arrangement — 30% at admission, the rest in 12-24 monthly installments at 0% interest is common at non-profits",
      "Ask whether they offer a \"scholarship bed\" or \"sliding-scale slot\" this month — same question phrased two ways often gets two different answers",
      "Ask whether they can submit to your insurance even if you do not think you are covered — out-of-network reimbursement still applies in many cases",
      "Ask whether they will price-match a competitor's quote — they often will if they have empty beds"
    ]},
    {"type": "paragraph", "content": "The admissions counselor's job is to fill beds. If you are an interested patient who cannot pay the sticker price, they have a strong incentive to find an arrangement that works."},
    {"type": "heading", "content": "Option 8: Healthcare Financing Loans"},
    {"type": "paragraph", "content": "Several lenders specialize in medical financing and treat addiction treatment as eligible care. These are loans — they have to be paid back — but they can cover the gap when nothing else fits."},
    {"type": "list", "items": [
      "**Prosper Healthcare Lending** and **CareCredit** — medical-specific lenders that many treatment centers partner with; APRs typically 6-30% depending on credit",
      "**Personal loans from credit unions** — often the lowest rate available if you have any credit history; faster approval than banks",
      "**0% APR credit cards for medical bills** — only useful if you can pay off the balance during the 12-18 month promotional window",
      "**SoFi, LightStream, and Upstart** — personal-loan lenders that fund medical use cases"
    ]},
    {"type": "paragraph", "content": "Financing is the right move only if you have realistic income to service the loan after treatment. Going into significant debt for treatment that may not stick — or that you would have qualified for free through a state program — is rarely the smart move."},
    {"type": "heading", "content": "Option 9: Employer EAP and HSA"},
    {"type": "paragraph", "content": "If you are employed, you may already have benefits you have not used. Two to ask about today:"},
    {"type": "list", "items": [
      "**Employee Assistance Program (EAP).** Most employers with 50+ employees contract with an EAP. EAPs typically cover 3-12 free counseling sessions per year, and many will arrange and partially cover a treatment placement. EAP intake is confidential — your employer does not see the diagnosis.",
      "**Health Savings Account (HSA) or Flexible Spending Account (FSA).** Addiction treatment is a qualified medical expense. If you have a balance, it can be applied directly to treatment costs. Some centers accept HSA debit cards at the door.",
      "**Short-term disability (STD).** Substance use treatment usually qualifies for STD income while you are out of work in inpatient — this does not pay for the treatment, but it replaces some of your income so you can divert paychecks toward the bill. See [[fmla-addiction-treatment-employee-rights|FMLA and addiction treatment]] for the employment-protection side of this."
    ]},
    {"type": "heading", "content": "Option 10: Crowdfunding"},
    {"type": "paragraph", "content": "Crowdfunding has paid for thousands of treatment placements. The platforms that work for medical campaigns:"},
    {"type": "list", "items": [
      "**GoFundMe** — the dominant option; no platform fee, but takes a payment-processing fee on each donation",
      "**Help Hope Live** — non-profit; medically-vetted campaigns; donations are tax-deductible to donors, which often increases raise totals"
    ]},
    {"type": "paragraph", "content": "Successful addiction-treatment crowdfunding campaigns share a few patterns: a personal story written by the person seeking help (or a family member with their full consent), a specific dollar amount tied to a specific treatment center's quote, photos that humanize the person, and updates every few days during the campaign. Privacy is a real concern — be deliberate about who sees the campaign and what details are public."},
    {"type": "heading", "content": "What to Do Today"},
    {"type": "paragraph", "content": "Pick the two options that are most likely to apply to your situation and act on them in the next 24 hours:"},
    {"type": "list", "items": [
      "Call SAMHSA at 1-800-662-4357 and ask for the public treatment options in your county",
      "Apply for Medicaid online at healthcare.gov (it takes 20 minutes; eligibility is determined within days in most states)",
      "Search the SAMHSA findtreatment.gov locator with the \"sliding fee\" and \"payment assistance\" filters checked",
      "If you are employed, call your HR department and ask for the EAP phone number — you do not have to say why",
      "Call two or three treatment centers in your area and ask: \"What is your sliding-scale or scholarship option? What is your cash-pay discount?\""
    ]},
    {"type": "paragraph", "content": "The cost gap between \"I cannot afford this\" and \"I can start treatment this week\" is usually one or two phone calls. The phone calls are the hard part. See [[how-to-get-into-rehab-today|how to get into rehab today]] for the same-day admission options once funding is sorted."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 4. FMLA and Addiction Treatment
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'fmla-addiction-treatment-employee-rights',
  'FMLA and Addiction Treatment: Your Employee Rights in 2026',
  'Federal law protects your job during voluntary rehab — but only if you use FMLA correctly. Here is how the protections actually work.',
  'getting-started',
  'Getting Started',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/2026/how-to-get-fmla-for-rehab.jpg',
  '11 min read',
  'FMLA and Addiction Treatment: Your Job Protection Rights | RehabLookup',
  'Can you take FMLA for rehab? Yes, with conditions. Learn eligibility, what to file, ADA protections, drug testing rules, and what your employer can and cannot do.',
  ARRAY['FMLA for rehab','FMLA addiction treatment','employee rights rehab','can I take FMLA for rehab','ADA addiction','job protection rehab'],
  $$[
    {"type": "paragraph", "content": "Going to inpatient rehab and keeping your job are not mutually exclusive. The Family and Medical Leave Act of 1993 (FMLA) gives most U.S. employees up to 12 weeks of unpaid, job-protected leave each year for a \"serious health condition\" — and substance use disorder treatment qualifies under federal law when it is provided by a licensed healthcare provider. Most people do not know this is available. The ones who do know often misuse it, disclose more than they have to, or try to file it after they have already missed work. This is the practical guide to using FMLA correctly so your job is waiting when you come back."},
    {"type": "paragraph", "content": "**Important context.** This is general information based on federal law. Specific employer policies, state laws, and union contracts can change the picture. For situations with high stakes — a job you cannot afford to lose, a complicated drug test history, an existing disciplinary record — consult an employment lawyer. Many state bar associations offer free initial consultations."},
    {"type": "heading", "content": "FMLA Eligibility — The Five Boxes You Have to Check"},
    {"type": "paragraph", "content": "Not every employee is covered. To take FMLA leave, all five of these must be true:"},
    {"type": "list", "items": [
      "**You work for a covered employer.** Private employers with 50 or more employees within 75 miles of your worksite. Public agencies (federal, state, local government) and schools are covered regardless of size.",
      "**You have worked for that employer for at least 12 months.** The 12 months do not have to be consecutive — periods of employment in the last 7 years usually count.",
      "**You have worked at least 1,250 hours in the 12 months before leave starts.** That averages to about 24 hours per week. Part-time and seasonal workers sometimes do not qualify.",
      "**You have a 'serious health condition' as defined by the law.** A documented substance use disorder being treated by a healthcare provider qualifies.",
      "**You are using FMLA for treatment, not just for active use.** This is the critical distinction in the next section."
    ]},
    {"type": "heading", "content": "The Treatment vs. Use Distinction"},
    {"type": "paragraph", "content": "FMLA covers absence for **treatment of substance use disorder by a healthcare provider**. It does not cover absences caused by **the substance use itself**. The line is sometimes blurry — a person in active use who misses Monday because they were intoxicated is not protected. The same person who misses Monday because they were in detox at a treatment facility is protected."},
    {"type": "paragraph", "content": "Practical implications:"},
    {"type": "list", "items": [
      "You can take FMLA for inpatient detox, residential rehab, PHP, IOP, and outpatient therapy — all qualify as treatment by a healthcare provider.",
      "You can take FMLA on an intermittent basis — for example, three afternoons a week for IOP — if it is medically necessary.",
      "You cannot retroactively claim FMLA for absences caused by drinking or using, even if you start treatment afterward. The leave covers care, not the underlying behavior.",
      "Your employer can still discipline or terminate you for performance issues that occurred before your FMLA request — addiction does not erase past conduct.",
      "Many employers have policies that require you to seek help voluntarily before any performance issue triggers a disciplinary action. Check your employee handbook for an \"early intervention\" or \"self-referral\" clause — it can be the difference between job protection and termination."
    ]},
    {"type": "heading", "content": "How to Request FMLA — The Forms You Actually File"},
    {"type": "paragraph", "content": "The process moves faster than people expect when you do it correctly:"},
    {"type": "list", "items": [
      "**Notify your employer.** If the leave is foreseeable (e.g., you have an admission date next Tuesday), give at least 30 days' notice. If the leave is not foreseeable (you are checking in tomorrow), notify as soon as practicable — typically the same day or next day. A short, written notice is best: \"I need to take FMLA leave starting [date] for a serious health condition. I will provide the medical certification by [date].\"",
      "**You do not have to disclose the diagnosis to your employer.** \"Serious health condition\" is the magic phrase. You do not have to say \"substance use disorder,\" \"rehab,\" \"alcohol,\" or \"drug.\"",
      "**Your employer will provide Form WH-381 (Notice of Eligibility) within 5 business days.** This tells you whether you are eligible and what documentation they need.",
      "**You will fill out Form WH-380-E (Certification of Health Care Provider for Employee).** Your treatment center's medical director or your prescribing doctor completes the medical portion. The form asks about diagnosis (the provider can write a general code like F10.20 for alcohol use disorder), the dates of treatment, the expected duration, and whether the leave is continuous or intermittent.",
      "**You return the form within 15 days.** If you miss this deadline, the employer can deny the leave."
    ]},
    {"type": "paragraph", "content": "**Keep copies of everything.** If there is later a dispute about whether you complied with the process, the paper trail is what protects you."},
    {"type": "heading", "content": "What FMLA Protects — and What It Does Not"},
    {"type": "paragraph", "content": "**Protected:**"},
    {"type": "list", "items": [
      "Up to 12 weeks of unpaid leave in a 12-month period",
      "Continued health insurance coverage at the same employee contribution you pay while working (the employer must maintain their portion of the premium)",
      "Right to return to the same job, or an \"equivalent\" job with the same pay, benefits, and responsibilities",
      "Right to take leave intermittently or on a reduced schedule if medically necessary",
      "Right to use accrued paid leave (vacation, PTO, sick days) concurrently with FMLA, if you and your employer agree — most policies allow this"
    ]},
    {"type": "paragraph", "content": "**Not protected:**"},
    {"type": "list", "items": [
      "Paid leave — FMLA is unpaid. See [[how-to-pay-for-rehab-without-insurance|how to pay for rehab without insurance]] for income-replacement options.",
      "Job restoration if your position would have been eliminated regardless (e.g., your whole department got laid off during your leave)",
      "Discipline or termination for misconduct unrelated to the treatment — driving drunk in a company car still gets you fired",
      "Drug-test positives once you return — see next section"
    ]},
    {"type": "heading", "content": "Drug Testing and the Return to Work"},
    {"type": "paragraph", "content": "FMLA does not exempt you from your employer's drug testing policy. If your employer drug-tests, you can be tested before your return and disciplined for a positive. This is the place where many people learn the hard way that their employer's last-chance agreement does not align with their treatment progress."},
    {"type": "paragraph", "content": "Things that protect you on return:"},
    {"type": "list", "items": [
      "**Get a medical release from your treatment provider** confirming that you are fit to return to work and that your treatment plan is in place. This is standard practice and your employer may request it.",
      "**Disclose any MAT prescriptions before testing** — buprenorphine (Suboxone), methadone, and naltrexone are all legitimate prescriptions but can trigger initial positives. Provide the prescriber's letter to the Medical Review Officer (MRO) reviewing the test. See [[suboxone-vs-methadone-comparison|Suboxone vs Methadone comparison]].",
      "**Negotiate a return-to-work plan** that includes a clear path forward — what testing frequency, what continuing care expectations, what would constitute a violation. Get it in writing."
    ]},
    {"type": "heading", "content": "ADA Protections After FMLA"},
    {"type": "paragraph", "content": "The Americans with Disabilities Act (ADA) and the Rehabilitation Act of 1973 provide overlapping protections that go further than FMLA in some ways and not as far in others."},
    {"type": "list", "items": [
      "**A person in recovery (not currently using) is protected under the ADA.** Active illegal drug users are not protected; people on prescribed medications, including MAT, are.",
      "**Reasonable accommodations may be required.** Examples: flexible scheduling for ongoing outpatient appointments, modified breaks, transfer to a less safety-sensitive role.",
      "**The ADA covers employers with 15+ employees** — broader reach than FMLA's 50-employee floor.",
      "**Past drug use itself cannot be the basis for an adverse employment action** if you are in recovery and the use is not current."
    ]},
    {"type": "paragraph", "content": "ADA does not protect you from job consequences of current illegal drug use, on-duty intoxication, or driving a company vehicle while impaired. It is a protection for people who are seeking or have sought treatment — not for active use."},
    {"type": "heading", "content": "State Laws That Go Further Than Federal"},
    {"type": "paragraph", "content": "Several states have leave laws that exceed FMLA in coverage, duration, or paid component:"},
    {"type": "list", "items": [
      "**California (CFRA + PFL).** California Family Rights Act covers smaller employers (5+ employees) and Paid Family Leave provides up to 8 weeks of partial wage replacement.",
      "**New Jersey (NJFLA + TDB + FLI).** Family Leave Act + Temporary Disability Benefits + Family Leave Insurance combine to provide both longer protection and partial wage replacement.",
      "**Massachusetts (PFML).** Up to 20 weeks of paid leave per year for the employee's own serious health condition.",
      "**Washington (PFML).** Up to 12 weeks paid; covers smaller employers than FMLA.",
      "**Connecticut, Oregon, New York, Colorado, Rhode Island, Delaware, Maryland, Minnesota, Maine** — varying degrees of paid leave programs; check your state Department of Labor.",
      "**District of Columbia** — up to 12 weeks paid through the Universal Paid Leave program."
    ]},
    {"type": "paragraph", "content": "When state law and FMLA both apply, you get whichever is more generous. They run concurrently — you do not stack 12 weeks of federal FMLA on top of 12 weeks of state leave; you get the longer of the two."},
    {"type": "heading", "content": "What Your Employer Can and Cannot Ask"},
    {"type": "paragraph", "content": "**Can ask:**"},
    {"type": "list", "items": [
      "Whether your healthcare provider has certified the leave as medically necessary",
      "The expected dates of leave and whether it is continuous or intermittent",
      "Whether you can perform the essential functions of your job with or without accommodation",
      "Periodic recertification of your condition (no more than every 30 days)"
    ]},
    {"type": "paragraph", "content": "**Cannot ask:**"},
    {"type": "list", "items": [
      "Your specific diagnosis or substance of choice",
      "Details of your treatment beyond what is medically relevant to scheduling and accommodation",
      "Whether you have used drugs in the past as a condition of returning",
      "For records from your therapist or counselor beyond the WH-380-E certification"
    ]},
    {"type": "heading", "content": "Your Confidentiality at Work"},
    {"type": "paragraph", "content": "Federal law (42 CFR Part 2) provides extra-strong confidentiality protections for substance use treatment records, separate from HIPAA. Your employer's HR department, EAP, and health insurance benefits department are typically firewalled from each other:"},
    {"type": "list", "items": [
      "**HR** sees that you are on FMLA leave for a \"serious health condition\" — they do not see the diagnosis.",
      "**Your manager** sees that you are out and when you are expected back. They do not see why.",
      "**Your EAP** has its own confidentiality protections; they cannot share your case with your employer beyond confirming you accessed services (without identifying what services).",
      "**Your health insurance carrier** sees the claim codes but cannot share clinical details with your employer."
    ]},
    {"type": "paragraph", "content": "If any of these walls feel like they have been breached — your manager knows specifics they should not know, HR is asking inappropriate questions — that is potentially a Title VII violation and the Department of Labor (DOL) Wage and Hour Division takes complaints at 1-866-4-USWAGE."},
    {"type": "heading", "content": "Three Mistakes to Avoid"},
    {"type": "list", "items": [
      "**Telling your boss before HR.** Your boss probably means well, but they are not trained in confidentiality and they cannot grant you FMLA. Go straight to HR with the written notice. Tell your boss the dates after the leave is approved.",
      "**Skipping the medical certification.** Without the WH-380-E, your employer can deny the leave. The form is one page for you and three for the provider — do not let it sit.",
      "**Returning before you are ready.** A relapse two weeks after going back to work is much worse for your job than three more weeks of leave. Most treatment teams build a return-to-work transition through IOP or PHP — use it."
    ]},
    {"type": "paragraph", "content": "If you are weighing whether to enter treatment because of work concerns: the federal and state legal scaffolding is more protective than most people realize, and the practical experience of going through this is more discreet than the worst-case scenarios in your head. Read [[is-rehab-confidential|is rehab confidential?]] and [[how-to-get-into-rehab-today|how to get into rehab today]] for the next pieces of the puzzle."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 5. Suboxone vs Methadone — MAT Medication Comparison
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'suboxone-vs-methadone-comparison',
  'Suboxone vs Methadone: Which MAT Medication Is Right for You?',
  'Two FDA-approved medications, two very different daily lives. A practical comparison of buprenorphine and methadone for opioid use disorder.',
  'treatment',
  'Treatment',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/medication-assisted-treatment-guide.jpg',
  '11 min read',
  'Suboxone vs Methadone for Opioid Use Disorder: Full Comparison | RehabLookup',
  'How Suboxone and methadone differ in how they work, access, side effects, cost, and daily life. A no-spin guide to choosing the right MAT medication.',
  ARRAY['suboxone vs methadone','buprenorphine vs methadone','MAT for opioid use disorder','which is better suboxone or methadone','opioid use disorder medication'],
  $$[
    {"type": "paragraph", "content": "Both Suboxone (buprenorphine + naloxone) and methadone are FDA-approved medications for opioid use disorder. Both have decades of clinical evidence behind them. Both, when prescribed appropriately, reduce overdose death rates by 50 percent or more compared with no medication. They are not competing brands of the same product — they work through different mechanisms, have different access models, and produce very different daily lives. The right choice depends on your situation, not on which one a particular provider happens to be set up to prescribe."},
    {"type": "paragraph", "content": "This is a comparison guide, not a prescription. The decision about which medication is right belongs between you and a medical professional who has actually examined you and reviewed your use history. What this guide does is help you walk into that conversation knowing the right questions to ask."},
    {"type": "heading", "content": "How They Work"},
    {"type": "paragraph", "content": "**Methadone** is a full opioid agonist. It binds to the same mu-opioid receptors in the brain that heroin, oxycodone, fentanyl, and other opioids bind to. Because it is long-acting (24-36 hour half-life), one daily dose is enough to prevent withdrawal and cravings without producing the pronounced highs and lows of short-acting opioids. It does not block the effects of other opioids — taking methadone and then using fentanyl is dangerous because the receptor sites are occupied by methadone but additional opioids still produce respiratory depression."},
    {"type": "paragraph", "content": "**Suboxone** is a combination of buprenorphine (a partial mu-opioid agonist) and naloxone (an opioid antagonist that is mostly inert when the medication is taken correctly). Buprenorphine binds tightly to the same receptors as full opioids, but only partially activates them — this produces a \"ceiling effect\" where higher doses do not produce more euphoria or more respiratory depression past a certain point. Because of the tight binding, buprenorphine displaces other opioids from receptors; this is what makes it both a treatment for opioid use disorder and the reason it can throw someone into precipitated withdrawal if taken too soon after using a full opioid."},
    {"type": "quote", "content": "Methadone fills the receptors. Suboxone partially fills them and prevents anything else from getting in. That single difference drives most of the other comparisons in this article."},
    {"type": "heading", "content": "Access — Where the Real-World Difference Begins"},
    {"type": "paragraph", "content": "**Methadone for opioid use disorder is dispensed only through federally certified Opioid Treatment Programs (OTPs)**, often called \"methadone clinics.\" There are about 1,900 OTPs in the United States, and they are concentrated in urban areas. Treatment starts with daily in-person visits to the clinic to receive the dose. After a period of stability — typically 90 days to 2 years depending on the program and the patient's progress — patients earn \"take-home doses\" that reduce the visit frequency. The clinic schedule controls a significant part of daily life, especially in the early phase."},
    {"type": "paragraph", "content": "**Suboxone (buprenorphine) can be prescribed by any practitioner with prescriptive authority** since the federal MAT Act of 2023 eliminated the prior \"X-waiver\" requirement. Buprenorphine prescriptions are dispensed at any retail pharmacy. A typical treatment plan involves a doctor's visit every 1 to 4 weeks, with prescriptions covering the interval. The medication is taken as a sublingual film or tablet that dissolves under the tongue."},
    {"type": "paragraph", "content": "**Practical implication.** If you live in a rural area, work shifts that conflict with clinic hours, or value medical privacy enough to want your treatment to look like any other prescription, Suboxone is usually more accessible. If you are in a city with multiple OTPs and would benefit from the structure of daily clinic visits and integrated wraparound services (counseling, case management, social services), methadone may fit better."},
    {"type": "heading", "content": "Starting the Medication (Induction)"},
    {"type": "paragraph", "content": "**Methadone induction** typically begins at a low dose (10-30mg) and is titrated up over days to weeks until the patient reaches a stable maintenance dose (typically 60-120mg, sometimes higher). It is generally well-tolerated and does not require the patient to be in withdrawal at the time of the first dose."},
    {"type": "paragraph", "content": "**Suboxone induction is more nuanced** because of buprenorphine's high affinity for the opioid receptor. If someone takes Suboxone while a full opioid agonist is still active on their receptors, the buprenorphine kicks the full agonist off, producing rapid and intense withdrawal — \"precipitated withdrawal,\" which is worse than the withdrawal you would have experienced normally. To avoid this, traditional induction protocols required patients to be in moderate withdrawal (typically 12-72 hours after the last opioid use, depending on what was used) before the first Suboxone dose."},
    {"type": "paragraph", "content": "Newer protocols — including \"micro-dosing\" or the \"Bernese method\" — allow Suboxone induction without requiring a withdrawal period. The patient starts with very low doses (0.5mg) while still using their current opioid, and the buprenorphine accumulates slowly until it can take over. This is particularly valuable for people transitioning from fentanyl, which lingers in body tissues and makes traditional induction unpredictable. Ask your prescriber about micro-dosing if fentanyl is in your use history."},
    {"type": "heading", "content": "Daily Life on Each Medication"},
    {"type": "paragraph", "content": "**On methadone:** You go to the clinic every morning (or your scheduled time) for the first 90 days at minimum. The clinic typically opens at 5 or 6 a.m. and closes by 11 a.m. You take the dose under observation. You may also have weekly individual or group counseling at the clinic. Once you earn take-homes, frequency drops — often to 6 take-home doses per week after the first year, and 13 or more after extended stability. Side effects are similar to other opioids: constipation, sweating, weight gain, and reduced libido are common; some patients experience sedation that improves with dose adjustment."},
    {"type": "paragraph", "content": "**On Suboxone:** You take a film or tablet once or twice daily, anywhere. You see your prescriber every 1-4 weeks depending on stability. Side effects often include headaches, constipation, nausea (especially during induction), and insomnia. Some patients experience tooth decay associated with the sublingual route; rinsing the mouth with water after the film dissolves is recommended. The \"ceiling effect\" means lower overdose risk if the medication is taken correctly — but combining Suboxone with benzodiazepines, alcohol, or other sedatives can still cause fatal respiratory depression."},
    {"type": "heading", "content": "Cost and Insurance"},
    {"type": "paragraph", "content": "**Methadone via an OTP** typically costs $80-$120 per week without insurance. The price covers the medication, counseling, and case management bundled together. With insurance (including Medicaid and Medicare), most patients pay $0-$50 per week out of pocket."},
    {"type": "paragraph", "content": "**Suboxone** prescriptions cost $80-$300 per month for the medication, plus the cost of the prescriber visit ($50-$300 per visit depending on whether you see a primary-care provider, specialist, or addiction medicine clinic). Generic buprenorphine/naloxone has lowered the medication price significantly. With insurance, most patients pay $0-$50 per month for the medication. Medicaid covers Suboxone in all 50 states. See [[does-medicaid-cover-drug-rehab|Medicaid coverage of rehab]] for the specifics."},
    {"type": "heading", "content": "Pregnancy"},
    {"type": "paragraph", "content": "Both medications are safer for pregnant patients with opioid use disorder than ongoing untreated use, and both are safer than abrupt detoxification (which carries a real risk of fetal demise). Historically, methadone was the standard of care during pregnancy because of decades of safety data. Current guidelines from the American College of Obstetricians and Gynecologists (ACOG) and the American Society of Addiction Medicine (ASAM) now consider buprenorphine equivalent or preferred in most cases — buprenorphine-exposed infants have, on average, milder and shorter neonatal abstinence syndrome (NAS) symptoms than methadone-exposed infants. Either is appropriate; the right choice involves the obstetric team, the patient, and the addiction medicine prescriber."},
    {"type": "heading", "content": "Side Effects and Drug Interactions"},
    {"type": "paragraph", "content": "**Methadone-specific concerns:**"},
    {"type": "list", "items": [
      "**QT interval prolongation.** Methadone at higher doses can cause cardiac rhythm changes. An EKG is standard before starting and periodically thereafter, especially at doses above 100mg.",
      "**Drug interactions with HIV antiretrovirals, anti-seizure medications, and some antibiotics.** These can either reduce or increase methadone levels significantly.",
      "**Higher overdose risk if combined with benzodiazepines, alcohol, or other sedatives.**",
      "**More pronounced sedation than buprenorphine, particularly during induction.**"
    ]},
    {"type": "paragraph", "content": "**Suboxone-specific concerns:**"},
    {"type": "list", "items": [
      "**Precipitated withdrawal at induction if taken too soon after a full opioid.**",
      "**Dental issues** (cavities, tooth decay) from the acidity of the sublingual film/tablet — rinse with water after dosing.",
      "**Hepatic concerns** in patients with severe liver disease.",
      "**Combination with benzodiazepines and alcohol still poses overdose risk** despite the ceiling effect."
    ]},
    {"type": "heading", "content": "How Long Do People Stay on MAT?"},
    {"type": "paragraph", "content": "There is no \"correct\" duration. The evidence is clear that longer treatment produces better outcomes — people who stay on MAT for 2+ years have significantly lower relapse and mortality rates than those who taper off in the first year. Some people stay on the medication indefinitely, much as someone with hypertension stays on blood pressure medication for life. The framing that taper is the goal is outdated; the framing that MAT is a tool you use for as long as it is helpful is the current standard of care."},
    {"type": "paragraph", "content": "If and when tapering is appropriate, it is done slowly under medical supervision. Buprenorphine tapers typically take months to years; methadone tapers are similarly slow. Rushing produces poor outcomes."},
    {"type": "heading", "content": "Switching Between Them"},
    {"type": "paragraph", "content": "Patients can switch from Suboxone to methadone (relatively straightforward — the methadone clinic re-stabilizes you) or from methadone to Suboxone (more complex — methadone has a long half-life and must be tapered to a low dose, often 30mg or less, before buprenorphine induction). The transition from methadone to buprenorphine is the harder direction; some treatment programs specialize in it. Discuss with your addiction medicine prescriber rather than attempting to manage it yourself."},
    {"type": "heading", "content": "Stigma and Identity"},
    {"type": "paragraph", "content": "Two final notes that matter even though they are not pharmacological:"},
    {"type": "list", "items": [
      "Some recovery communities — particularly older 12-step circles — do not consider people on MAT to be \"in recovery.\" This is at odds with current medical science and most modern recovery organizations explicitly include MAT in their definition of recovery, but the local culture in some meeting halls still reflects the older view. If meetings matter to you, look for MAT-friendly meetings — they exist in nearly every region.",
      "Both Suboxone and methadone work. Neither is a moral failing. The decision to use either one is a medical decision about treating a chronic, relapsing disease — the same kind of decision as taking insulin for diabetes or a statin for high cholesterol. The science is settled; the cultural stigma is lagging."
    ]},
    {"type": "paragraph", "content": "If you are weighing this decision: write down the practical constraints of your life (where you live, when you work, what your insurance covers, who is in your support system), bring that list to an addiction medicine clinician, and ask them to recommend a starting point. The choice is rarely about which medication is theoretically better; it is about which one fits your life well enough that you will stay on it long enough to recover. Read [[medication-assisted-treatment-guide|the full MAT guide]] for the broader context including naltrexone, the third FDA-approved option."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 6. Naloxone (Narcan) Rescue Guide
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.blog_articles (
  slug, title, excerpt, category, category_label,
  author, author_date, image_url, read_time,
  meta_title, meta_description, seo_keywords,
  content, status, published_at
) VALUES (
  'naloxone-narcan-overdose-rescue-guide',
  'Naloxone (Narcan): How to Get It, How to Use It, and When to Call 911',
  'Anyone can carry Narcan. Anyone can use it. Here is how to recognize an opioid overdose, administer the medication, and stay with the person until help arrives.',
  'prevention',
  'Prevention',
  'RehabLookup Editorial Team',
  'May 23, 2026',
  'https://mldbxpntzcjalgjmwnqa.supabase.co/storage/v1/object/public/blog-images/fentanyl-crisis-guide.jpg',
  '10 min read',
  'Naloxone (Narcan) Rescue Guide: How to Use It & Where to Get It | RehabLookup',
  'Step-by-step guide to recognizing an opioid overdose and administering Narcan. Where to get free naloxone in 2026, Good Samaritan law overview, and aftercare.',
  ARRAY['Narcan how to use','naloxone instructions','opioid overdose what to do','where to get naloxone','free Narcan','overdose first aid'],
  $$[
    {"type": "paragraph", "content": "Naloxone — sold under the brand name Narcan — is an opioid antagonist that reverses opioid overdoses by displacing opioids from receptors in the brain and restoring breathing. It does not work on overdoses involving alcohol, benzodiazepines, stimulants, or other non-opioid substances, but for opioid overdoses (heroin, fentanyl, oxycodone, hydrocodone, morphine, methadone, and many others) it is the difference between someone dying and someone being given a chance to enter treatment. Tens of thousands of overdose deaths are prevented in the United States each year by laypeople — not paramedics, not doctors — administering naloxone."},
    {"type": "paragraph", "content": "Since March 2023, Narcan nasal spray has been available over the counter in the United States. You no longer need a prescription. You no longer need a special license. This guide is the practical version for anyone who might encounter an overdose: family members of people with opioid use disorder, roommates of people in recovery, teachers, coaches, bartenders, gym staff, anyone."},
    {"type": "quote", "content": "If you carry naloxone, you may go your entire life without using it. If you do use it, you will likely save a life. The asymmetry is the reason to carry it."},
    {"type": "heading", "content": "How to Recognize an Opioid Overdose"},
    {"type": "paragraph", "content": "Opioid overdoses kill by suppressing the brain's drive to breathe. The signs you would see in someone overdosing:"},
    {"type": "list", "items": [
      "**Unresponsive.** They do not wake up when you call their name or shake their shoulder. If you rub a knuckle hard against their breastbone (a sternal rub), they do not react.",
      "**Slow, shallow, or stopped breathing.** Normal adult breathing is 12-20 breaths per minute. An overdosing person may be at 4-6 breaths per minute, gasping irregularly, or not breathing at all.",
      "**Pinpoint pupils.** The pupils are unusually small even in a dim room.",
      "**Pale, bluish, or grayish skin.** Especially noticeable around the lips and fingertips.",
      "**Choking or gurgling sounds.** Sometimes called the \"death rattle\" — fluid in the throat that the person cannot swallow.",
      "**Limp body.** Muscle tone is gone."
    ]},
    {"type": "paragraph", "content": "If you see any combination of these signs and there is even a possibility opioids are involved, act. Naloxone is safe to give to someone who is not actually overdosing on opioids — it will not harm them. The mistake to avoid is hesitation. Most overdose deaths happen because no one was there to act in the first ten minutes."},
    {"type": "heading", "content": "What To Do — Step by Step"},
    {"type": "paragraph", "content": "**1. Try to wake them up.** Call their name. Shake their shoulder. Rub knuckles hard against their breastbone. If they respond, monitor them — they may still be at risk and you may need to call for help, but they are not yet in a full overdose."},
    {"type": "paragraph", "content": "**2. Call 911.** Do this even if you are going to give naloxone. The medication's effects can wear off in 30-90 minutes — shorter than how long many opioids stay in the body — and the person can re-overdose. Emergency medical services are also equipped to handle complications. Tell the dispatcher: \"I believe someone is overdosing on opioids. I am going to give Narcan.\""},
    {"type": "paragraph", "content": "**3. Give the first dose of naloxone.** For the over-the-counter Narcan nasal spray:"},
    {"type": "list", "items": [
      "Lay the person on their back.",
      "Tilt their head back slightly.",
      "Hold the Narcan device with your thumb on the plunger and two fingers on either side of the nozzle.",
      "Insert the nozzle into one nostril until your fingers touch the bottom of the person's nose.",
      "Press the plunger firmly to release the full dose into that nostril.",
      "The device is single-use — one press releases the full dose."
    ]},
    {"type": "paragraph", "content": "**4. Give rescue breaths if they are not breathing.** If the person is not breathing at all, give rescue breaths between naloxone doses: tilt their head back, lift their chin, pinch their nose, give one full breath every 5-6 seconds. If you are CPR-trained and there is no pulse, start chest compressions."},
    {"type": "paragraph", "content": "**5. Wait 2-3 minutes. If no response, give a second dose** — in the other nostril. The high potency of fentanyl in the current U.S. drug supply means multiple doses are often needed. Continue giving doses every 2-3 minutes until the person responds or emergency services arrive. Most overdoses respond to 1-2 doses; fentanyl overdoses sometimes require 3-5."},
    {"type": "paragraph", "content": "**6. Put them in the recovery position.** Once they respond and are breathing, gently roll them onto their side so they will not aspirate vomit. The recovery position: knee on the top leg bent forward, top arm bent under the head as a cushion, bottom arm tucked underneath. This keeps the airway clear."},
    {"type": "paragraph", "content": "**7. Stay with them until help arrives.** Do not leave the person alone. The naloxone may wear off before all of the opioids do, and they can re-overdose. Talk to them. Keep them warm. Reassure them — they may be confused, scared, or in withdrawal."},
    {"type": "heading", "content": "What to Expect After Narcan"},
    {"type": "paragraph", "content": "Reversing an overdose is not the same as making the person feel good. When naloxone displaces opioids from receptors, the brain experiences sudden withdrawal, which can be intense and unpleasant. Common reactions in the minutes after revival:"},
    {"type": "list", "items": [
      "Confusion and disorientation — they may not understand what just happened",
      "Agitation or hostility — particularly if they are now in withdrawal",
      "Body aches, sweating, shivering, nausea, vomiting",
      "Strong cravings to use again, which paradoxically makes the post-overdose hours dangerous for another overdose",
      "Embarrassment, shame, or anger — common emotional responses"
    ]},
    {"type": "paragraph", "content": "Stay calm. Do not lecture them. Do not interrogate them about what they used. The goal is to keep them safe and oriented until paramedics arrive. Many people will refuse hospital transport — that is their right, but encourage transport because of the risk of re-overdose and the opportunity for a treatment referral. Hospitals in many states are now equipped to start buprenorphine in the emergency department, which can be the start of recovery."},
    {"type": "heading", "content": "Good Samaritan Laws"},
    {"type": "paragraph", "content": "Most U.S. states have Good Samaritan laws that protect people who call 911 to report an overdose from certain drug-related charges. The specifics vary:"},
    {"type": "list", "items": [
      "**47 states plus D.C.** have some form of overdose Good Samaritan law as of 2026.",
      "**Common protections:** immunity from possession of small amounts of a controlled substance, paraphernalia possession, and being under the influence — both for the caller and the person who overdosed.",
      "**Common limits:** the laws typically do not protect against distribution, trafficking, manufacturing, or weapons charges. They do not exempt you from active warrants or parole violations.",
      "**States WITHOUT a Good Samaritan law as of 2026:** Wyoming and Kansas (verify current law for your jurisdiction; this changes)."
    ]},
    {"type": "paragraph", "content": "Fear of arrest is one of the top reasons people delay or skip calling 911 during an overdose. The math: if a friend is dying, the worst case of calling is a misdemeanor that the Good Samaritan law will likely shield you from. The worst case of not calling is your friend dies. Always call."},
    {"type": "heading", "content": "Where to Get Naloxone — Often Free"},
    {"type": "paragraph", "content": "**Pharmacies.** Over-the-counter Narcan nasal spray is on the shelf at CVS, Walgreens, Walmart, Rite Aid, Kroger, Costco, and most independent pharmacies. Retail price is typically $45-$60 for a 2-dose pack. Many insurance plans cover it at no copay even though it is OTC — ask the pharmacist to run it through your insurance."},
    {"type": "paragraph", "content": "**Free Naloxone Distribution — Most Common Channels:**"},
    {"type": "list", "items": [
      "**State and county health departments** — most have a naloxone-by-mail or free pickup program. Search \"[your state] naloxone program.\"",
      "**Harm reduction organizations** — most cities have at least one organization (often syringe service programs) that distributes naloxone free of charge, no questions asked. Find local providers via [NEXT Distro's locator](https://nextdistro.org) or by searching the [North America Syringe Exchange Network](https://nasen.org).",
      "**NaloxoneForAll.com** — a national mail-order program that ships free naloxone to all 50 states. Order online; arrives in 1-2 weeks.",
      "**Many universities, schools, and workplaces now stock naloxone** — ask your HR department, student health services, or facilities team.",
      "**Project Lazarus, NEXT, Remedy Alliance, and other non-profits** — distribute free naloxone with no eligibility requirements."
    ]},
    {"type": "paragraph", "content": "If cost is the only barrier between you and carrying naloxone, the cost barrier can be eliminated today by any of the above. Order it. Tomorrow your house has it."},
    {"type": "heading", "content": "Storing and Replacing Naloxone"},
    {"type": "list", "items": [
      "Store at room temperature (between 59-77°F / 15-25°C). Do not leave it in a hot car for extended periods or in a freezer.",
      "Expiration is typically 2-3 years from manufacture. Expired naloxone is still mostly effective — research shows potency lingers well past the printed date — but replace it when you can.",
      "Keep at least two doses readily available. Multi-dose response is common, especially with fentanyl in the supply.",
      "Keep it where it will be found in an emergency: in a bedside drawer, a kitchen cabinet, a glove compartment, a bag you carry."
    ]},
    {"type": "heading", "content": "Talking to a Loved One About Carrying It"},
    {"type": "paragraph", "content": "If you are buying naloxone because someone you love is using opioids — or is in recovery and could relapse — the conversation can feel loaded. Approaches that work better than warnings or accusations:"},
    {"type": "list", "items": [
      "\"I bought some Narcan and I want to keep it here. I want you to know it is in this drawer in case you ever need it for yourself or anyone.\"",
      "\"I love you, and the world has fentanyl in it. I keep this here the same way I keep an EpiPen here for our kid's peanut allergy.\"",
      "\"I am not asking what you are doing. I just want you to be able to come home.\""
    ]},
    {"type": "paragraph", "content": "Naloxone is not a permission slip to use. It is the same logic as a smoke alarm — you hope you never need it, and the cost of having it is much smaller than the cost of not. If your loved one is in active use or recently in recovery, having it in the house may be the most important thing you do this year."},
    {"type": "heading", "content": "After the Reversal: The Treatment Window"},
    {"type": "paragraph", "content": "An overdose is one of the only times a person with opioid use disorder is fully in contact with what their use is doing to them. Treatment researchers call this the \"reachable moment.\" If you are with someone who has just been revived and they are willing to consider treatment, act fast — the window often closes within hours."},
    {"type": "list", "items": [
      "**Hospital ED-initiated MAT.** Many emergency departments will start buprenorphine and connect the patient with outpatient follow-up before discharge. Encourage hospital transport for this reason alone.",
      "**Same-day treatment admissions** — see [[how-to-get-into-rehab-today|how to get into rehab today]] for the steps.",
      "**Bridge programs** offered by some treatment centers — they will see the patient within 24 hours of an overdose and begin medications, then transition to a longer-term plan.",
      "**Peer recovery support** — many hospitals now have peer recovery specialists on staff who meet patients in the ED after an overdose."
    ]},
    {"type": "paragraph", "content": "If you carry naloxone and you reverse an overdose, you do not need to feel like a hero or like a failure depending on whether the person enters treatment afterward. You did the only thing that mattered: you gave them another day to make that choice. Read [[medication-assisted-treatment-guide|the MAT guide]] for what those next-day options look like, and [[fentanyl-crisis-guide|the fentanyl crisis guide]] for context on why this medication has become essential to carry."}
  ]$$::jsonb,
  'published',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
