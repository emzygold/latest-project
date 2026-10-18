# -*- coding: utf-8 -*-
"""Relaunch schedule, 9-16 Oct 2026, written in a consultant voice
(Brian Tracy, "Be a Sales Superstar": ask first, talk as "we", recommend, solve one problem).
Run: python3 relaunch.py  -> writes relaunch-schedule.json next to this file."""
import json, os

URL = "https://raw.githubusercontent.com/emzygold/latest-project/claude/funny-dijkstra-whaums/campaign-images/"
CTA = 'DM "FREE" or WhatsApp +234 906 906 0835.'
ASK = "Not sure what you need? Ask me. I'll give you an honest recommendation, even if it's \"you don't need a website yet\"."

TAGS = {
    "general": ("#Nexorah #WebDesign #SmallBusiness #FreeWebsite",
                "#Nexorah #FreeWebsite #WebDesign #WebDevelopment #SmallBusiness #SmallBusinessOwner #Entrepreneur #NigerianBusiness #LagosBusiness #BusinessGrowth #OnlinePresence #WebsiteDesign"),
    "restaurant": ("#Nexorah #RestaurantMarketing #FoodBusiness #FreeWebsite",
                   "#Nexorah #FreeWebsite #RestaurantMarketing #FoodBusiness #RestaurantOwner #LagosFood #FoodVendor #SmallBusiness #WebDesign #NigerianFood #OnlineOrdering #BusinessGrowth"),
    "realestate": ("#Nexorah #RealEstate #RealEstateAgent #PropertyMarketing",
                   "#Nexorah #FreeWebsite #RealEstate #RealEstateAgent #RealtorLife #PropertyMarketing #LagosRealEstate #RealEstateMarketing #PropertyListing #WebDesign #Realtor #DubaiRealEstate"),
    "coach": ("#Nexorah #Coaching #PersonalBrand #FreeWebsite",
              "#Nexorah #FreeWebsite #Coaching #BusinessCoach #LifeCoach #Consultant #PersonalBrand #CoachingBusiness #OnlineCoach #WebDesign #Entrepreneur #ClientAttraction"),
    "startup": ("#Nexorah #Startup #MVP #NoCode",
                "#Nexorah #Startup #Founders #MVP #AppIdea #NoCode #BubbleIO #SaaS #WebApp #StartupLife #TechStartup #BuildInPublic"),
    "systems": ("#Nexorah #BusinessAutomation #NoCode #WebApp",
                "#Nexorah #BusinessAutomation #Automation #NoCode #BubbleIO #WebApp #BookingSystem #Operations #Productivity #SaaS #DigitalTransformation #SmallBusiness"),
}

POSTS = [
    # ---------------- Fri 9 Oct ----------------
    dict(date="2026-10-09", slot="AM", image="day05-am.jpg", tags="restaurant",
         alt="Your food is amazing. Is your website?",
         text="""Quick question for restaurant owners 🍽️

When someone searches for your restaurant at 9pm tonight, what do they find?

A menu from 2023? An Instagram page with no prices? Nothing at all?

Here's what we usually see: the food is great, but customers can't find the menu, the prices or the location in under 10 seconds, so they order somewhere else.

What I'd recommend: one simple page with your menu, prices, opening hours, a map and a WhatsApp order button. That's it. You'd answer fewer DMs and win more hungry customers.

💬 Restaurant owners: what do customers ask you most? Tell me below and I'll tell you how we'd fix it.

We're building 5 websites for free this month. """ + CTA,
         x="Restaurant owners 🍽️ When someone searches your restaurant tonight, what do they find? We'd recommend 1 page: menu, prices, hours, map, WhatsApp button. What do customers ask you most? 👇"),
    dict(date="2026-10-09", slot="PM", image="day05-pm.jpg", tags="restaurant",
         alt="The perfect restaurant website: 5 must-haves",
         text="""If we were building your restaurant's website, here's exactly what we'd include 👇

1. A menu with prices that's easy to read on a phone
2. Order or book in one tap (WhatsApp works perfectly)
3. Opening hours and a Google Map
4. Real photos of your best dishes
5. Reviews from happy customers

Which one is your restaurant missing right now? Comment the number and I'll tell you the quickest way to fix it.

""" + ASK + "\n\n👉 " + CTA,
         x="If we built your restaurant's website we'd include:\n1. Menu + prices\n2. Order in 1 tap\n3. Hours + map\n4. Real food photos\n5. Reviews\nWhich one are you missing? 👇"),
    dict(date="2026-10-09", slot="EVE", image="day05-eve.jpg", tags="restaurant",
         alt="This or that: sending your menu 50 times a day, or one link",
         text="""Let me ask you something, restaurant owners 😅

THIS 👉 sending your menu on WhatsApp 50 times a day
THAT 👉 one link with your full menu, photos and prices

Which one is your restaurant today? Comment THIS or THAT.

No judgement. Most of the businesses we talk to start with THIS. Our job is to help you get to THAT without the stress.

👉 """ + CTA,
         x="Restaurant owners 😅\nTHIS: sending your menu on WhatsApp 50x a day\nTHAT: one link with your full menu & prices\nWhich one is you today? 👇"),

    # ---------------- Sat 10 Oct ----------------
    dict(date="2026-10-10", slot="AM", image="day06-am.jpg", tags="realestate",
         alt="Listings on WhatsApp get lost.",
         text="""A question for real estate agents 🏡

Where does a buyer find last month's listing today?

If the answer is "scrolling up in a WhatsApp group", you're losing buyers you never hear about.

What I'd recommend: one website where every listing lives with photos, price, location and a "Book a viewing" button. You share one link, buyers browse at night, and they come to you ready to view.

💬 Agents: have you ever lost a buyer because a listing got buried? YES or NO 👇

👉 """ + CTA,
         x="Agents 🏡 Where does a buyer find last month's listing today? If it's buried in WhatsApp, you're losing buyers. We'd put every listing on one site with a 'Book a viewing' button. Ever lost a buyer this way? 👇"),
    dict(date="2026-10-10", slot="PM", image="day06-pm.jpg", tags="realestate",
         alt="Project spotlight: Elysian Dubai real estate website",
         text="""Here's how we solved this problem for a premium real estate brand 🏙️

The problem: beautiful properties, but buyers had no easy way to search them.

What we built for Elysian Dubai:
→ A cinematic hero that makes a strong first impression on any screen
→ Property search by keyword, rent or buy, type and location
→ Clear calls to action exactly where buyers make decisions

The result is a site that does the first sales conversation for you.

Rate this design from 1 to 10 in the comments. And if you're an agent, tell me: what's the one feature you'd want on yours?

👉 """ + CTA,
         x="How we solved it for Elysian Dubai 🏙️ Problem: great properties, hard to search. We built property search (rent/buy, type, location) + clear calls to action. Agents: what feature would you want on yours? 👇"),
    dict(date="2026-10-10", slot="EVE", image="day07-eve.jpg", tags="general",
         alt="Poll: what's stopping you from getting a website?",
         text="""I'd like to understand you better, so let me ask 👇

What's stopping you from getting a website?

🅰️ Cost
🅱️ Time
🅲 Don't know where to start
🅳 Not sure I need one

Comment your letter. Every answer helps us give better advice.

And here's my honest take: for 5 businesses this month, A, B and C are solved. We cover the design and build, we do the work, and we guide you step by step. If you're D, ask me and I'll tell you honestly whether you need one.

👉 """ + CTA,
         x="I'd like to understand you better 👇 What's stopping you from getting a website?\nA) Cost\nB) Time\nC) Don't know where to start\nD) Not sure I need one\nComment your letter."),

    # ---------------- Sun 11 Oct ----------------
    dict(date="2026-10-11", slot="AM", image="day07-am.jpg", tags="coach",
         alt="Your expertise deserves a home.",
         text="""Coaches and consultants, a quick question 🎯

When someone says "I'm interested", where do you send them?

Scattered posts, a long DM thread, a PDF? Every extra step is a chance for them to change their mind.

What I'd recommend: one clear page with who you help, your offer, results from real clients and a booking calendar. They read, they trust, they book. No back-and-forth.

💬 Coaches: who do you help? Say it in one line below and I'll tell you if it's clear enough to sell.

👉 """ + CTA,
         x="Coaches 🎯 When someone says 'I'm interested', where do you send them? We'd give you 1 page: who you help, your offer, results, a booking calendar. Who do you help? Say it in 1 line 👇"),
    dict(date="2026-10-11", slot="PM", image="day08-pm.jpg", tags="startup",
         alt="From idea to MVP in 4 steps",
         text="""Got an app idea but no idea where to start? Here's how we'd work on it together 👇

1. Discover: a call to understand your idea, your users and your goal. You leave with a clear scope.
2. Design: we map the user journey and design the key screens before writing anything.
3. Build: database, workflows and integrations, with an update from us every week.
4. Launch: tested on every device, live, and supported as you grow.

The goal isn't just "an app". It's the smallest version that proves people will pay for it.

💬 Describe your idea in 5 words below. I'll reply to every one with what I'd build first.

👉 DM us or WhatsApp +234 906 906 0835.""",
         x="Got an app idea? Here's how we'd build it with you:\n1. Discover\n2. Design\n3. Build (weekly updates)\n4. Launch\nDescribe your idea in 5 words 👇 I'll reply with what I'd build first."),
    dict(date="2026-10-11", slot="EVE", image="day08-am.jpg", tags="startup",
         alt="Founders, your turn: my app idea in one sentence",
         text="""Founders, it's your turn 🚀

Drop your app idea in ONE sentence below.

Here's my promise: I'll reply to every idea with one honest recommendation on what to build first, and what to leave out.

No pitch, just advice. That's how we like to start working with people.""",
         x="Founders, your turn 🚀 Drop your app idea in ONE sentence. I'll reply to every one with an honest recommendation on what to build first."),

    # ---------------- Mon 12 Oct ----------------
    dict(date="2026-10-12", slot="AM", image="day09-am.jpg", tags="systems",
         alt="Still running on spreadsheets?",
         text="""Let me ask you something, business owner 😅

How many hours a week does your team spend copying data from one place to another?

Orders from WhatsApp into a spreadsheet. Bookings into a calendar. Payments into another sheet.

That's where we'd start. Usually one simple system that connects your tools saves hours every week and stops costly mistakes.

💬 Be honest: how many spreadsheets run your business? Tell me below and I'll suggest what we'd automate first.

👉 DM us or WhatsApp +234 906 906 0835.""",
         x="Quick question 😅 How many hours a week does your team spend copying data between WhatsApp, sheets and calendars? That's where we'd start. How many spreadsheets run your business? 👇"),
    dict(date="2026-10-12", slot="PM", image="day09-pm.jpg", tags="systems",
         alt="Project spotlight: reservation system for a luxury wellness retreat",
         text="""Here's a problem we solved for a luxury wellness retreat 🌿

The problem: guests asked the same questions by message, dates got double-booked, and deposits were chased by hand.

What we built together:
→ A short quiz that matches each guest to the right stay
→ A live calendar showing only dates that are free
→ Secure deposits, payments and confirmations
→ Guest and payment data synced automatically

Now the system answers the questions, so the team can focus on guests.

💬 If you ran a business, which of these would save you the most time? 1, 2, 3 or 4 👇""",
         x="A problem we solved 🌿 A luxury retreat was double-booking and chasing deposits by hand. We built a matching quiz, a live calendar, secure deposits and auto-synced data. Which would save you most time? 👇"),
    dict(date="2026-10-12", slot="EVE", image="day09-eve.jpg", tags="general",
         alt="Rate your business's online presence from 1 to 10",
         text="""Let's do a quick self-check together 📈

On a scale of 1 to 10, how strong is your business's online presence right now?

1 = "people can't find me"
10 = "customers find me, trust me and buy"

Comment your number. If you're under 7, tell me why and I'll give you one free recommendation to move you up.""",
         x="Quick self-check 📈 Rate your business's online presence from 1 to 10.\n1 = people can't find me\n10 = they find me, trust me & buy\nUnder 7? Tell me why and I'll give you 1 free recommendation."),

    # ---------------- Tue 13 Oct (4 days left) ----------------
    dict(date="2026-10-13", slot="AM", image="day10-am.jpg", tags="general",
         alt="Client review: 5 stars on Upwork",
         text="""What do clients say after working with us? 💬

"George has a deep understanding of Bubble.io, SaaS development, MVP development... He communicated clearly, delivered milestones on schedule, and was proactive in solving challenges."

⭐⭐⭐⭐⭐ Verified Upwork client

"Proactive in solving challenges" is the part I'm proudest of. We don't wait for instructions. We look for the problem and fix it with you.

Want that for your business? 👉 """ + CTA,
         x="What clients say 💬 \"He communicated clearly, delivered milestones on schedule, and was proactive in solving challenges.\" ⭐⭐⭐⭐⭐ Verified Upwork client. Want that for your business? DM \"FREE\""),
    dict(date="2026-10-13", slot="PM", image="day11-pm.jpg", tags="general",
         alt="Behind every Nexorah website: the process",
         text="""What actually happens after you DM "FREE"? Here's how we'd work together 👇

1. Research: we study your business, your customers and your competitors
2. Structure: we plan the pages so visitors find answers fast
3. Design: a custom look that fits your brand, not a template
4. Build and test: fast, mobile-friendly, tested on real phones
5. Launch: live on your domain, and we show you how to update it

You're involved at every step. It's your business, we just bring the tools.

Applications close Friday, 16 October. 👉 """ + CTA,
         x="What happens after you DM \"FREE\"?\n1. Research\n2. Structure\n3. Custom design\n4. Build & test\n5. Launch + walkthrough\nYou're involved at every step. Closes Fri 16 Oct."),
    dict(date="2026-10-13", slot="EVE", image="day12-eve.jpg", tags="general",
         alt="4 days left to apply",
         text="""⏳ 4 days left to apply.

Before you decide, ask yourself one question: if a customer looked for your business online tonight, would they choose you or your competitor?

If you're not sure, that's exactly what we'd help with. 5 free websites, up to 3 pages each, built with you.

Applications close Friday, 16 October at midnight.
👉 """ + CTA,
         x="⏳ 4 days left. Ask yourself: if a customer looked for your business online tonight, would they pick you or your competitor? 5 free websites. Closes Fri 16 Oct → DM \"FREE\""),

    # ---------------- Wed 14 Oct (3 days left) ----------------
    dict(date="2026-10-14", slot="AM", image="day13-am.jpg", tags="general",
         alt="3 days left. Have you applied?",
         text="""3 days left. Have you applied? ⏳

Here's what I'd recommend if you're still thinking about it: send us one message telling us what your business does and what you'd want a website to do for you.

That's it. We'll reply with honest advice either way.

👉 """ + CTA,
         x="3 days left ⏳ My advice if you're still thinking: send one message saying what your business does and what you'd want a website to do. We'll reply with honest advice either way. DM \"FREE\""),
    dict(date="2026-10-14", slot="PM", image="day12-pm.jpg", tags="general",
         alt="Free website FAQ",
         text="""The questions we've been asked most this week, answered honestly 👇

Is it really free? Yes, no design or development fee for the 5 businesses we pick.
What do I pay for? Only your domain and hosting, so the website is fully yours.
How long does it take? About 2 weeks once we agree on your content.
I already have a website. You can still apply and we'll redesign it.
How do you choose? We pick the 5 businesses we can help the most.

What else would you like to know? Ask below and we'll answer publicly.""",
         x="Free website FAQ 👇\nReally free? Yes, no design fee.\nWhat do I pay? Only domain & hosting.\nHow long? ~2 weeks.\nHave a site? We'll redesign it.\nWhat else do you want to know? Ask below."),
    dict(date="2026-10-14", slot="EVE", image="day11-am.jpg", tags="general",
         alt="Hi, I'm George. We find what's costing you customers, then fix it together.",
         text="""Hi, I'm George 👋 founder of Nexorah.

I'll be honest with you: I don't see myself as someone who sells websites.

My job is to find what's costing you customers. Maybe they can't find you, maybe they don't trust what they see, maybe your team is drowning in messages. Then we fix it together, with a website, a booking system or an automation.

So I'd love to hear from you: what's the biggest challenge in your business right now? Tell me below. I read and reply to everyone.""",
         x="Hi, I'm George 👋 I don't really sell websites. I find what's costing you customers and fix it with you. What's the biggest challenge in your business right now? I reply to everyone."),

    # ---------------- Thu 15 Oct (2 days left) ----------------
    dict(date="2026-10-15", slot="AM", image="day14-am.jpg", tags="general",
         alt="2 days left. Don't miss out.",
         text="""2 days left ⏳

Applying takes 60 seconds. Building your website takes us about 2 weeks.

If you've been meaning to message us, today is a good day. Tell us what your business does and we'll take it from there.

👉 """ + CTA,
         x="2 days left ⏳ Applying takes 60 seconds. Building your website takes us ~2 weeks. Tell us what your business does → DM \"FREE\" or WhatsApp wa.me/2349069060835"),
    dict(date="2026-10-15", slot="PM", image="day14-pm.jpg", tags="general",
         alt="5 website mistakes costing you customers",
         text="""Let's check your website together 👇 Is it making any of these mistakes?

1. No clear message: visitors can't tell what you do in 5 seconds
2. Hard to contact: no WhatsApp or call button in sight
3. Not mobile-friendly: most visitors are on phones
4. Slow loading: heavy images make people leave
5. No proof: no reviews or examples means no trust

Comment the numbers that apply to you. I'll reply with what I'd fix first.

We fix all 5 in every free website. 2 days left. 👉 """ + CTA,
         x="Let's check your website 👇\n1. No clear message\n2. Hard to contact\n3. Not mobile-friendly\n4. Slow\n5. No proof\nComment the numbers that apply. I'll reply with what I'd fix first."),
    dict(date="2026-10-15", slot="EVE", image="day14-eve.jpg", tags="general",
         alt="Applications close tomorrow",
         text="""Applications close tomorrow 🚨

Tomorrow at midnight, the 5 spots close. In about 2 weeks, 5 businesses will have a brand-new website.

If you've been unsure, here's my recommendation: send the message anyway. Ask your question, tell us your situation, and we'll give you an honest answer.

👉 """ + CTA,
         x="🚨 Applications close tomorrow at midnight. Unsure? Send the message anyway: ask your question and we'll give you an honest answer. DM \"FREE\" or WhatsApp wa.me/2349069060835"),

    # ---------------- Fri 16 Oct (last day) ----------------
    dict(date="2026-10-16", slot="AM", image="day15-am.jpg", tags="general",
         alt="Last day. Apply today.",
         text="""Last day 🔥

Applications for the 5 free websites close at midnight tonight.

One question to ask yourself: a month from now, will you wish you'd sent the message?

👉 """ + CTA,
         x="Last day 🔥 Applications for 5 free websites close at midnight. A month from now, will you wish you'd sent the message? DM \"FREE\""),
    dict(date="2026-10-16", slot="PM", image="day15-pm.jpg", tags="general",
         alt="15 days of Nexorah",
         text="""15 days ago, Nexorah launched 💜

We asked a lot of questions these two weeks, and you answered: about your restaurants, your listings, your coaching offers and your app ideas. Thank you. It helped us understand what businesses really need.

You still have a few hours to apply for one of the 5 free websites.
👉 """ + CTA + """

💬 What should we help you with next? Tell us below.""",
         x="15 days ago Nexorah launched 💜 Thank you for every answer and comment. You still have a few hours to apply for a free website → DM \"FREE\""),
    dict(date="2026-10-16", slot="EVE", image="day15-eve.jpg", tags="general",
         alt="Applications close at midnight",
         text="""⏰ Final hours. Applications close at midnight.

If you've read this far, you probably have a question. Ask it now. We'll reply tonight.

👉 """ + CTA,
         x="⏰ Final hours. Applications for 5 free websites close at midnight. Got a question? Ask it now, we'll reply tonight. DM \"FREE\""),
]

TIMES = {"AM": "08:00", "PM": "13:00", "EVE": "19:00"}

def build():
    out = []
    for p in POSTS:
        li, ig = TAGS[p["tags"]]
        assert len(p["x"]) <= 280 - 22, (p["date"], p["slot"], len(p["x"]))
        out.append({
            "key": f'{p["date"]}-{p["slot"]}',
            "due": f'{p["date"]}T{TIMES[p["slot"]]}:00+01:00',
            "image": URL + p["image"],
            "alt": p["alt"],
            "linkedin": p["text"].strip() + "\n\n" + li,
            "instagram": p["text"].strip() + "\n\n" + ig,
            "x": p["x"] + " #Nexorah #FreeWebsite",
        })
    return out

if __name__ == "__main__":
    data = build()
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "relaunch-schedule.json")
    json.dump(data, open(path, "w"), ensure_ascii=False, indent=1)
    print(len(data), "posts ->", path)
