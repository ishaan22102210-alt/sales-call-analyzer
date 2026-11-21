# Prep sheet: the 5-minute call with Dana Reyes

**Read this the day before, and again 10 minutes before the call. Keep it open during the call.**

Everything here is what a real rep could know *before* the call (from the company website, LinkedIn and job posts). The buyer's secrets are in a separate card your friend has. Don't read that one.

---

## 1. The call at a glance

| | |
|---|---|
| **Who** | Dana Reyes, COO of Lumora |
| **Length** | 5 minutes, hard stop. Dana will leave on time. |
| **Why Dana is there** | A colleague forwarded your email. Dana is being polite and is between meetings. |
| **Your ONE goal** | Book a **second meeting** with a date and time, ideally with Lumora's technical lead. |
| **Not your goal** | Pitching features, giving a demo, talking price, closing a deal. |

If you leave with a booked meeting, the call was a success, even if you learned almost nothing else.

---

## 2. What you know before the call (your research)

### About Lumora
- **What they sell:** software that turns recorded insurance call-center calls into text and short summaries.
- **Who buys it:** insurance companies with large call centers.
- **Size:** about 80 employees.
- **Why that matters to you:** **speech-to-text is the core of their product.** If their transcripts are wrong, their summaries are wrong, and their customers notice.

### About Dana
- **Role:** COO, which means running the business day to day: operations, costs, keeping customers happy.
- **What a COO cares about:** money, customers staying, team time and deadlines. **Not** technical details.
- **So speak in business terms.** Say "fewer wrong transcripts and fewer customer complaints", not "lower word error rate".

### Your best guesses (to confirm or kill on the call)
1. **Accuracy on insurance language is a problem.** Policy numbers, medical and legal terms, and accents are hard for any speech-to-text system.
2. **They may run an open-source model (like Whisper) on their own servers.** That is common for companies this size, and it costs engineer time to maintain.
3. **Bad transcripts lead to bad summaries, and bad summaries lead to unhappy customers.** That last part is the pain Dana feels as COO.

You don't know any of this for sure. Ask, don't assume.

---

## 3. What you're selling (know it in plain English)

**AssemblyAI** makes speech AI that developers plug into their products through an API (a connection their software calls). It includes:
- **Speech-to-text:** turns audio into written text, for both recorded files and live calls.
- **Speaker labels:** shows who said what, for example agent versus customer.
- **PII redaction:** automatically removes personal data such as card numbers and addresses. This matters for insurance.
- **LLM Gateway:** runs AI models on transcripts, for example to write summaries.

**The value for a company like Lumora, in one sentence:**
> "Teams like yours use us so transcripts get industry terms and numbers right, without their engineers having to maintain the speech system themselves."

**Don't quote specific prices, accuracy percentages or compliance certifications.** If Dana asks, say: "I'll confirm the exact numbers for your use case and send them over."

---

## 4. Minute-by-minute run sheet

| Time | What you do | Target |
|---|---|---|
| **0:00 – 0:30** | Open: respect the time, ask permission to ask questions | Dana says "go ahead" |
| **0:30 – 2:30** | Discovery: find the problem and what it costs | Dana names a real pain |
| **2:30 – 3:30** | Handle the objection (probably "Whisper is free") | Dana softens |
| **3:30 – 4:15** | Summarise what you heard, in Dana's words | Dana says "yes, that's right" |
| **4:15 – 5:00** | Ask for the next meeting with two time options | A booked meeting |

**Watch the clock.** Put a timer where you can see it. At 4:00, stop discovery and move to the close, even if you have more questions.

---

## 5. Your script

### Opening (0:00 – 0:30)
Dana will say: *"I've only got five minutes. What's this about?"*

**You say (under 15 seconds):**
> "Thanks for making the time, Dana. I'll keep it to five minutes, promise. I work with companies that turn calls into text and summaries, like Lumora does. Can I ask two or three quick questions to see whether a longer conversation is even worth your time?"

**Why it works:** you showed respect for their time, explained why you're calling in one line, and asked permission. No pitch.

**Don't say:** "Let me tell you a bit about AssemblyAI..." (Dana will cut you off.)

### Discovery (0:30 – 2:30)
Ask in this order. **One question, then stop talking.** Silence is fine.

**Question 1: open the door to pain**
> "When your transcripts come out wrong, what happens? Who notices first?"

**Question 2: dig deeper** (use whichever fits what Dana said)
> "Can you give me a recent example?"
> "What does that do to your customers?"

**Question 3: put a number on it**
> "What has that cost you: customers, money, or your team's time?"

**Question 4: find out what they use today** (if it hasn't come up)
> "How are you turning calls into text today?"

**Question 5: why now** (if you have time)
> "Is there anything coming up that makes this more urgent, like a deadline or a big customer?"

**Question 6: who decides** (ask this before 3:30, whatever happens)
> "If you were to look at changing this, who else would need to be involved?"

**If Dana gives a short answer like "It's fine" or "It works":**
> "Fair enough. If you could change one thing about it, what would it be?"

**When Dana says something important, react briefly and follow up. Don't pitch:**
> "That sounds painful. What happened after that?"

### The objection (2:30 – 3:30)
Expect Dana to say: *"Why would I pay for something when Whisper is free?"*

**Step 1: acknowledge**
> "That's fair. Whisper is a great model, and it's free to download."

**Step 2: explore with a question (this is the key step)**
> "Can I ask, what does it take your team to keep it running? Servers, engineers' time?"

**Step 3: respond briefly, using what Dana just said**
> "That's what we hear a lot. The model is free, but running it isn't. Most teams don't switch on a sales call. They test us on their own hardest recordings and compare."

**Don't:**
- argue that Whisper is bad
- list features
- talk for more than 20 seconds

### Other objections Dana might raise

| Dana says | You say |
|---|---|
| "I really don't have time for this." | "Totally understand. One question, then I'll let you go: what's the biggest problem with your transcripts today?" |
| "Everyone says they're the most accurate." | "Fair. So don't take my word for it. Would you be open to testing us on 20 of your hardest calls?" |
| "Just send me an email." | "Happy to. So I send the right thing: is the bigger issue accuracy, or your team's time? And could we hold 30 minutes next week to go over it?" |
| "I'm not technical." | "Neither is this question: what happens to your business when a transcript is wrong?" |
| "What does it cost?" | "It depends on volume, so I'll get you exact numbers. Roughly how many hours of calls do you process a month?" |
| "Is our data safe?" | "Absolutely the right question for insurance. I'll connect you with the right person for the details. I don't want to guess on compliance." |

### Summarise (3:30 – 4:15)
Repeat back what you heard, **using Dana's own words**:
> "So let me check I've got this right: [the problem Dana named] is causing [the cost Dana named], and [any deadline Dana mentioned] makes it urgent. Is that fair?"

**Why:** Dana hears that you listened, and saying "yes" makes the next step feel natural.

### Close: ask for the next step (4:15 – 5:00)
**Be specific: a person, a purpose and two time options.**
> "Would it make sense to set up 30 minutes with whoever owns your speech pipeline, to plan a quick test on some of your real calls? Does Tuesday or Thursday afternoon work better?"

If Dana named a technical person earlier, **use their name**:
> "Could we get 30 minutes with [name] next week?"

**If Dana says "send me an email":**
> "Will do, today. I'll put Tuesday at 2pm in as a placeholder, and you can move it if it doesn't work. Fair?"

**Final line, whatever happens:**
> "Thanks, Dana. I'll send a short recap within the hour."

---

## 6. Rules to remember

1. **Talk less than 40% of the time.** Dana should do most of the talking.
2. **Never talk for more than 20–30 seconds straight.**
3. **One question at a time**, then wait.
4. **Business words, not tech words:** customers, cost, time, deadlines.
5. **Never criticise the competitor.** Offer a fair test instead.
6. **Don't make up numbers.** Say "I'll confirm and send it."
7. **Always end with a specific next step** that has a date.

---

## 7. MEDDPICC checklist (what the analyzer will score)

Tick these off in your head during the call. In 5 minutes, aim for the first four.

| Element | What you're trying to learn | Question that gets it |
|---|---|---|
| **I**dentify pain | What's broken | "When transcripts are wrong, what happens?" |
| **M**etrics | What it costs | "What has that cost you?" |
| **C**ompetition | What they use now | "How are you doing it today?" |
| **E**conomic buyer | Who signs off on money | "Who else would need to be involved?" |
| **D**ecision criteria | How they'd judge a new tool | "How would you decide if something was better?" |
| **D**ecision process | The steps to decide | "What would the steps look like?" |
| **P**aper process | Contracts, legal, security | (save for the next meeting) |
| **C**hampion | Who inside pushes for it | "Who feels this problem most?" |

---

## 8. Before you hit record

- [ ] Timer set to 5:00 where you can see it
- [ ] This sheet open on a second screen or printed out
- [ ] Recording started (phone voice memo, or Zoom/Meet recording)
- [ ] **You speak first**, so the analyzer knows you're the rep (Speaker A)
- [ ] A glass of water. Take a breath, then go.

---

## 9. After the call (within 10 minutes)

1. **Run the analyzer:**
   ```
   python analyze.py calls/dana-call-1.m4a
   ```
2. **Ask your friend three questions:**
   - What did I do well?
   - When would you have stopped listening?
   - Would you really take the next meeting?
3. **Write the follow-up email** using [toolkit/follow-up-email.md](../toolkit/follow-up-email.md), as if the call were real.
4. **Fill in the Results table** in the main README:

   | Call | Talk ratio | Longest monologue | MEDDPICC | Meeting booked? | One thing to change |
   |---|---|---|---|---|---|
   | 1 | | | / 16 | yes / no | |

5. **Do it again** in a day or two, changing only that one thing.

**Target by call 3:** talk ratio under 40%, no monologue over 30 seconds, MEDDPICC 6+ out of 16, and a meeting booked.
