"""Comment-first rewrite of the last 15 relaunch slots (12-16 Oct).

Every post asks for a low-effort comment (a number, a letter, one word or a
keyword) and promises a personal reply, so prospects start a conversation.
Writes comment-boost.json in the same shape as relaunch-schedule.json.
"""
import json
import re

URL = "https://raw.githubusercontent.com/emzygold/latest-project/claude/funny-dijkstra-whaums/campaign-images/"
WA = "WhatsApp +234 906 906 0835"
TAGS = {
    "linkedin": "#Nexorah #WebDesign #SmallBusiness #FreeWebsite",
    "instagram": "#Nexorah #FreeWebsite #WebDesign #WebDevelopment #SmallBusiness #SmallBusinessOwner "
                 "#Entrepreneur #NigerianBusiness #LagosBusiness #BusinessGrowth #OnlinePresence #WebsiteDesign",
    "x": "#Nexorah #FreeWebsite",
}
TIMES = {"AM": "08:00", "PM": "13:00", "EVE": "19:00"}

# (key, image, alt, body for LinkedIn + Instagram, X text without hashtags)
POSTS = [
    ("2026-10-12-AM", "day09-am", "Still running on spreadsheets?",
     "Quick question for business owners 👇\n\n"
     "How many spreadsheets does your business run on right now?\n\n"
     "Comment just the number. 0, 3, 10, \"too many\" 😅\n\n"
     "I'll reply to every comment with the first thing I'd automate, so you get your hours back. No pitch, just a free idea.",
     "Business owners: how many spreadsheets run your business right now? Comment just the number 👇 "
     "I'll reply with the first thing I'd automate."),
    ("2026-10-12-PM", "day09-pm", "Project spotlight: reservation system for a luxury wellness retreat",
     "We built this for a luxury wellness retreat 🌿 No more double bookings, no more chasing deposits by hand.\n\n"
     "Now I'm curious about YOUR business.\n\n"
     "Comment your industry in one word (salon, restaurant, real estate, clinic...) and I'll reply with the one system I'd build first for it.\n\n"
     "I answer every comment personally.",
     "We ended double bookings for a luxury retreat 🌿 Your turn: comment your industry in one word "
     "(salon, restaurant, clinic...) and I'll reply with the 1 system I'd build first."),
    ("2026-10-12-EVE", "day09-eve", "Rate your business's online presence from 1 to 10",
     "Be honest 👇 Rate your business's online presence from 1 to 10.\n\n"
     "1 = people can't find me\n10 = they find me, trust me and buy\n\n"
     "Just drop your number in the comments. No explanation needed.\n\n"
     "Everyone who comments gets one free tip from me to move up a point.",
     "Be honest: rate your business's online presence 1-10 👇\n1 = can't find me\n10 = find me, trust me, buy\n"
     "Just drop the number. Everyone gets 1 free tip to move up."),
    ("2026-10-13-AM", "day10-am", "Client review: 5 stars on Upwork",
     "A client said I was \"proactive in solving challenges\" ⭐⭐⭐⭐⭐\n\n"
     "So let me be proactive with yours.\n\n"
     "Comment AUDIT below (add your website or Instagram handle if you have one) and I'll reply with 3 honest things I'd fix. Free, no strings.\n\n"
     "First 20 comments today.",
     "A client called me \"proactive in solving challenges\" ⭐⭐⭐⭐⭐ Let's be proactive with yours: "
     "comment AUDIT + your website or IG and I'll reply with 3 honest fixes. Free."),
    ("2026-10-13-PM", "day11-pm", "Behind every Nexorah website: the process",
     "Quiz time 🧠\n\n"
     "Our process: 1. Research  2. Structure  3. Design  4. Build  5. Launch\n\n"
     "Which step do most small businesses skip, and then wonder why their website brings no customers?\n\n"
     "Comment 1, 2, 3, 4 or 5. I'll reveal the answer in the comments tonight.",
     "Quiz 🧠 Our process: 1 Research, 2 Structure, 3 Design, 4 Build, 5 Launch. Which step do most small "
     "businesses skip (then get zero customers)? Comment 1-5. Answer in the replies tonight."),
    ("2026-10-13-EVE", "day12-eve", "4 days left to apply",
     "Finish this sentence 👇\n\n"
     "\"My business would get more customers if ________.\"\n\n"
     "No wrong answers. I read every one, and the best answers might become one of our 5 free websites.\n\n"
     f"4 days left to apply 👉 DM \"FREE\" or {WA}.",
     "Finish the sentence 👇\n\"My business would get more customers if ____.\"\n"
     "I read every answer. 4 days left to apply for 1 of 5 free websites."),
    ("2026-10-14-AM", "day13-am", "3 days left. Have you applied?",
     "3 days left ⏳\n\n"
     "The easiest way to apply: comment FREE below.\n\n"
     "That's it. I'll DM you 3 quick questions about your business. It takes 60 seconds.\n\n"
     "5 spots. Closes Friday at midnight.",
     "3 days left ⏳ Easiest way to apply: comment FREE below. I'll DM you 3 quick questions. "
     "60 seconds. 5 spots, closes Fri midnight."),
    ("2026-10-14-PM", "day12-pm", "Free website FAQ",
     "Honest question 👇 What's stopping you from getting a proper website?\n\n"
     "A) Cost\nB) No time\nC) Don't know where to start\nD) I don't think I need one\n\n"
     "Reply with just a letter. I'll answer each one honestly, even D.",
     "Honest question: what's stopping you from getting a proper website?\nA) Cost\nB) No time\n"
     "C) Don't know where to start\nD) Don't need one\nReply with a letter 👇 I'll answer each honestly."),
    ("2026-10-14-EVE", "day11-am", "Hi, I'm George. We find what's costing you customers, then fix it together.",
     "Hi, I'm George 👋 founder of Nexorah.\n\n"
     "Let's make this easy. Tell me what your business does in 5 words or less 👇\n\n"
     "I'll reply to every comment with one idea to get you more customers online.\n\n"
     "I'm replying all evening, so go ahead.",
     "Hi, I'm George 👋 Tell me what your business does in 5 words or less 👇 "
     "I'll reply to every comment with 1 idea to get you more customers online."),
    ("2026-10-15-AM", "day14-am", "2 days left. Don't miss out.",
     "2 days left ⏳ Quick poll before we close:\n\n"
     "Where do most of YOUR customers find you?\n\n"
     "A) Instagram\nB) WhatsApp\nC) Google\nD) Word of mouth\n\n"
     "Comment a letter. I'll share the results tomorrow, and what they mean for your business.",
     "2 days left ⏳ Quick poll: where do most of your customers find you?\nA) Instagram\nB) WhatsApp\n"
     "C) Google\nD) Word of mouth\nComment a letter 👇 Results tomorrow."),
    ("2026-10-15-PM", "day14-pm", "5 website mistakes costing you customers",
     "Let's check your website together 👇 Is it making any of these mistakes?\n\n"
     "1. No clear message: visitors can't tell what you do in 5 seconds\n"
     "2. Hard to contact: no WhatsApp or call button in sight\n"
     "3. Not mobile-friendly: most visitors are on phones\n"
     "4. Slow loading: heavy images make people leave\n"
     "5. No proof: no reviews or examples means no trust\n\n"
     "Comment the numbers that apply to you (e.g. \"2, 5\"). I'll reply with what I'd fix first.",
     "Let's check your website 👇\n1. No clear message\n2. Hard to contact\n3. Not mobile-friendly\n4. Slow\n"
     "5. No proof\nComment the numbers that apply. I'll reply with what I'd fix first."),
    ("2026-10-15-EVE", "day14-eve", "Applications close tomorrow",
     "Applications close tomorrow 🚨\n\n"
     "Want one of the 5 free websites? Comment FREE and I'll DM you right away.\n\n"
     "Not ready yet? Comment your biggest question about getting a website instead. I'll answer it publicly so everyone learns.",
     "🚨 Applications close tomorrow. Want a free website? Comment FREE and I'll DM you. "
     "Not ready? Comment your biggest website question and I'll answer it publicly."),
    ("2026-10-16-AM", "day15-am", "Last day. Apply today.",
     "Last day 🔥 Applications close at midnight.\n\n"
     "Comment FREE and I'll DM you the 3 questions. 60 seconds, done.\n\n"
     "Know a business owner who needs this? Tag them below 👇 You might change their year.",
     "Last day 🔥 Applications close at midnight. Comment FREE and I'll DM you. "
     "Know a business owner who needs this? Tag them 👇"),
    ("2026-10-16-PM", "day15-pm", "15 days of Nexorah",
     "15 days ago, Nexorah launched 💜 Thank you for every answer and comment.\n\n"
     "Now help us decide what's next. What should our next free offer be?\n\n"
     "1. A free booking system\n2. A free WhatsApp automation\n3. A free website audit video\n\n"
     "Comment 1, 2 or 3.\n\n"
     "Free website applications close tonight: comment FREE to apply.",
     "15 days of Nexorah 💜 Help us pick our next free offer:\n1. Booking system\n2. WhatsApp automation\n"
     "3. Website audit video\nComment 1, 2 or 3 👇 Free website apps close tonight."),
    ("2026-10-16-EVE", "day15-eve", "Applications close at midnight",
     "⏰ Final hours. Applications close at midnight.\n\n"
     "Comment FREE now and I'll DM you before we close.\n\n"
     "And if you've been watching quietly all campaign, drop a 👋 so I know you were here.",
     "⏰ Final hours, applications close at midnight. Comment FREE and I'll DM you before we close. "
     "Been watching quietly? Drop a 👋"),
]


def x_length(text):
    """Approximate X's weighted count: emoji and other wide characters count as 2."""
    n = 0
    for ch in text:
        n += 2 if ord(ch) > 0x2000 else 1
    return n - sum(len(m) - 23 for m in re.findall(r"https?://\S+", text))


def build():
    out = []
    for key, img, alt, body, x in POSTS:
        day, slot = key.rsplit("-", 1)
        entry = {
            "key": key,
            "due": f"{day}T{TIMES[slot]}:00+01:00",
            "image": URL + img + ".jpg",
            "alt": alt,
            "linkedin": f"{body}\n\n{TAGS['linkedin']}",
            "instagram": f"{body}\n\n{TAGS['instagram']}",
            "x": f"{x} {TAGS['x']}",
        }
        assert x_length(entry["x"]) <= 280, (key, x_length(entry["x"]))
        out.append(entry)
    return out


if __name__ == "__main__":
    posts = build()
    with open("comment-boost.json", "w", encoding="utf-8") as f:
        json.dump(posts, f, ensure_ascii=False, indent=1)
    for p in posts:
        print(p["key"], x_length(p["x"]))
