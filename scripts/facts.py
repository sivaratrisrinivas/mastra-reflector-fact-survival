"""Planted facts for the 18 synthetic memory logs.

Dimensions (generate-synthetic-data skill, step 1):
  fact_type: the 18 types from the build spec (what kind of fact the Reflector has to keep)
  domain:    coding agent, travel, home renovation, personal finance, wedding planning, fitness
  position:  early / middle / late in the log (the Reflector is told to condense older content more)

Each log carries 3 planted facts. Log i gets types i, i+6, i+12 (mod 18) at early, middle, late,
so every fact type appears 3 times, once per position, in 3 different domains.

Check spec (write-code-eval skill), all matching on normalized text:
  all:      list of groups; every group needs one alternative present anywhere
  sameLine: list of groups; one line must contain an alternative from every group
  current:  {new, old, markers}: new present, and either old absent or a line with new also has a marker
  absent:   none of these may appear (control: transient noise that should be dropped)
Templates like {d2+14} mean "date of group 2 plus 14 days" and are filled in by generate_logs.py.
"""

UNKNOWN = ["not know", "doesn't know", "does not know", "don't know", "unsure", "not sure", "unknown",
           "uncertain", "unclear", "no idea", "not aware", "hasn't checked", "has not checked"]
REFUSE = ["refus", "declin", "won't", "will not", "not to ", "doesn't want", "does not want", "do not",
          "don't", "rejected", "not share", "not interested", "against", "no supplement", "opted out", "never"]
NEVER = ["never", "not been", "hasn't", "has not", "no prior", "first time", "first-time", "not owned",
         "not had", "no experience", "no history", "no previous"]
PREFER = ["prefer", "preference", "want", "chose", "choice", "favor", "favour", "rather", "like", "always", "use"]
ATTRIB = ["assistant", "agent", "ai suggested", "ai recommended", "ai proposed"]
CURRENT = ["now", "current", "switched", "changed", "updated", "raised", "increased", "lowered", "reduced",
           "instead", "replac", "revised", "latest", "no longer", "->", "→", "moved", "new ", "final"]

TYPES = {
    1: "person name in a low-priority line",
    2: "dollar amount",
    3: "absolute date",
    4: "relative date with anchor",
    5: "version string",
    6: "duration",
    7: "place",
    8: "changed value: old and new both kept",
    9: "changed value: new marked current",
    10: "stated negative (never)",
    11: "doesn't know X",
    12: "refused action",
    13: "stated preference",
    14: "standing instruction / rule",
    15: "who-said-what (assistant attribution)",
    16: "fact repeated 3 times",
    17: "fact buried in a long tool-result line",
    18: "control: transient noise (pass = absent)",
}

DOMAINS = {
    "coding": "a solo developer building 'Ledgerly', a TypeScript invoicing SaaS, with a coding agent that reads files, runs tests and edits code",
    "travel": "a traveler planning a two-week trip through Portugal and Spain with an assistant that searches flights, trains and hotels",
    "home": "a homeowner remodeling their kitchen with an assistant that compares quotes, materials and schedules",
    "finance": "a person organizing personal finances (budget, savings, debt payoff, taxes) with an assistant that reads exported statements",
    "wedding": "a couple planning a 2026 wedding with an assistant that tracks vendors, budget and guest logistics",
    "fitness": "a recreational runner training for a half marathon with a coaching assistant that reads watch data",
}

# Each fact: type, text (one or more lines placed in the log), check.
# "lines" is a list of (group_offset, time, text); group_offset is relative to the fact's anchor group.
LOGS = [
    {  # 0
        "domain": "coding",
        "facts": [
            {"type": 1, "lines": [(0, "09:14", "🟢 User mentioned their teammate Priyanka Vashisht reviews all database migrations.")],
             "check": {"all": [["vashisht"]]}},
            {"type": 7, "lines": [(0, "14:20", "🟡 User stated the production Postgres instance runs in the Frankfurt region.")],
             "check": {"all": [["frankfurt", "eu-central-1"]]}},
            {"type": 13, "lines": [(0, "16:05", "🔴 User stated they prefer pnpm over npm and want every install command written with pnpm.")],
             "check": {"sameLine": [["pnpm"], PREFER]}},
        ],
    },
    {  # 1
        "domain": "coding",
        "facts": [
            {"type": 2, "lines": [(0, "10:02", "🔴 User stated the monthly cloud budget for Ledgerly is capped at $1,850.")],
             "check": {"all": [["1850", "1.85k"]]}},
            {"type": 8, "lines": [(-2, "11:30", "🔴 User stated the public launch date is {d1+40}."),
                                  (0, "15:10", "🔴 User stated the public launch date is now {d3+51} because of the payments audit.")],
             "check": {"all": [["{d1+40}"], ["{d3+51}"]]}},
            {"type": 14, "lines": [(0, "17:45", "🔴 User set a standing rule: never push directly to the main branch, always open a pull request.")],
             "check": {"sameLine": [["main", "pull request"], ["never", "do not", "don't", "no direct", "not push", "always", "only"]]}},
        ],
    },
    {  # 2
        "domain": "coding",
        "facts": [
            {"type": 3, "lines": [(0, "09:40", "🔴 User stated the SOC 2 audit fieldwork starts on {d0+60}.")],
             "check": {"all": [["{d0+60}"]]}},
            {"type": 9, "lines": [(-2, "13:00", "🟡 User stated the public API rate limit is 300 requests per minute."),
                                  (0, "10:20", "🔴 User stated the public API rate limit was raised to 500 requests per minute.")],
             "check": {"current": {"new": ["500"], "old": ["300"], "markers": CURRENT}}},
            {"type": 15, "lines": [(0, "16:30", "🟡 Assistant recommended Redis Streams for the background job queue; user agreed to try it.")],
             "check": {"sameLine": [["redis streams"], ATTRIB]}},
        ],
    },
    {  # 3
        "domain": "travel",
        "facts": [
            {"type": 4, "lines": [(0, "10:15", "🔴 User stated they fly out next Friday, meaning {d0+fri}.")],
             "check": {"all": [["{d0+fri}"]]}},
            {"type": 10, "lines": [(0, "12:00", "🔴 User stated they have never been to Morocco and are nervous about the Tangier ferry day trip.")],
             "check": {"sameLine": [["morocco"], NEVER]}},
            {"type": 16, "lines": [(-4, "09:05", "🟡 User shared the Seville hotel confirmation code QX7-4412."),
                                   (-2, "18:40", "🟡 User repeated that the Seville hotel confirmation code is QX7-4412."),
                                   (0, "08:30", "🟡 User again gave the hotel confirmation code QX7-4412 for the Seville check-in.")],
             "check": {"all": [["qx7-4412", "qx74412", "qx7 4412"]]}},
        ],
    },
    {  # 4
        "domain": "travel",
        "facts": [
            {"type": 5, "lines": [(0, "08:50", "🟢 User mentioned their offline maps app is OsmAnd version 4.9.2.")],
             "check": {"all": [["4.9.2"]]}},
            {"type": 11, "lines": [(0, "14:40", "🟡 User stated they do not know whether their rail pass covers the Porto to Lisbon Alfa Pendular train.")],
             "check": {"sameLine": [["alfa pendular", "rail pass", "railpass"], UNKNOWN + ["check", "unconfirmed", "whether"]]}},
            {"type": 17, "lines": [(0, "18:12", "🟡 Agent ran hotel_search for Lisbon Sep 15-18 and got 9 results: Hotel Avenida Palace €212/night no vacancy; Pestana Palace €340 waitlist; Memmo Alfama €189 two rooms left; Lumiares €205 available; Hotel Lisboa Plaza €158 sold out; Palacio Belmonte €610 available; Browns Central €171 available; Hotel Britania €199 one room; Casa do Principe €176 one room; user booked Casa do Principe from the list.")],
             "check": {"all": [["casa do principe"]]}},
        ],
    },
    {  # 5
        "domain": "travel",
        "facts": [
            {"type": 6, "lines": [(0, "11:05", "🟡 User stated the layover in Istanbul on the return flight is 7 hours 40 minutes.")],
             "check": {"all": [["7 hours 40", "7h40", "7h 40", "7 hr 40", "7hr 40", "7:40", "7 h 40", "7-hour 40"]]}},
            {"type": 12, "lines": [(0, "13:25", "🔴 User refused the airline's travel insurance add-on and told the assistant not to offer it again.")],
             "check": {"sameLine": [["insurance"], REFUSE]}},
            {"type": 18, "lines": [(0, "19:02", "🟡 Agent retried the flight search API 3 times after a timeout; request id req_8fK2pQ.")],
             "check": {"absent": ["req_8fk2pq"]}},
        ],
    },
    {  # 6
        "domain": "home",
        "facts": [
            {"type": 7, "lines": [(0, "09:30", "🟡 User stated the house being remodeled is in Asheville, North Carolina.")],
             "check": {"all": [["asheville"]]}},
            {"type": 13, "lines": [(0, "15:00", "🔴 User stated they prefer matte black cabinet hardware over brushed brass.")],
             "check": {"sameLine": [["matte black"], PREFER]}},
            {"type": 1, "lines": [(0, "17:20", "🟢 User mentioned the electrician's name is Dale Okonkwo.")],
             "check": {"all": [["okonkwo"]]}},
        ],
    },
    {  # 7
        "domain": "home",
        "facts": [
            {"type": 8, "lines": [(-1, "10:00", "🔴 User stated the general contractor quoted $18,400 for the remodel."),
                                  (0, "16:30", "🔴 User stated the revised contractor quote is $21,250.")],
             "check": {"all": [["18400", "18.4k"], ["21250", "21.25k"]]}},
            {"type": 14, "lines": [(0, "14:10", "🔴 User set a rule: always send them photos before any wall is opened up.")],
             "check": {"sameLine": [["photo"], ["before", "prior to"]]}},
            {"type": 2, "lines": [(0, "18:00", "🔴 User stated the appliance allowance is $6,300.")],
             "check": {"all": [["6300", "6.3k"]]}},
        ],
    },
    {  # 8
        "domain": "home",
        "facts": [
            {"type": 9, "lines": [(-1, "09:00", "🟡 User picked the backsplash tile color Fog Gray."),
                                  (0, "16:00", "🔴 User stated the backsplash tile is now Sea Glass.")],
             "check": {"current": {"new": ["sea glass"], "old": ["fog gray", "fog grey"], "markers": CURRENT}}},
            {"type": 15, "lines": [(0, "11:45", "🟡 Assistant suggested moving the dishwasher to the left of the sink; user has not decided.")],
             "check": {"sameLine": [["dishwasher"], ATTRIB]}},
            {"type": 3, "lines": [(0, "17:30", "🔴 User stated the cabinet delivery is scheduled for {d5+33}.")],
             "check": {"all": [["{d5+33}"]]}},
        ],
    },
    {  # 9
        "domain": "finance",
        "facts": [
            {"type": 10, "lines": [(0, "10:30", "🔴 User stated they have never owned individual stocks, only index funds through a 401(k).")],
             "check": {"sameLine": [["stock"], NEVER + ["only index"]]}},
            {"type": 16, "lines": [(-2, "09:10", "🟡 User stated their emergency fund target is $24,000."),
                                   (-1, "20:15", "🟡 User repeated the emergency fund target of $24,000."),
                                   (0, "12:40", "🟡 User again confirmed the $24,000 emergency fund target.")],
             "check": {"all": [["24000", "24k"]]}},
            {"type": 4, "lines": [(0, "19:10", "🔴 User stated their tax filing extension ends in ten days, which is {d5+10}.")],
             "check": {"all": [["{d5+10}"]]}},
        ],
    },
    {  # 10
        "domain": "finance",
        "facts": [
            {"type": 11, "lines": [(0, "09:20", "🟡 User stated they do not know their current credit score.")],
             "check": {"sameLine": [["credit score"], UNKNOWN]}},
            {"type": 17, "lines": [(0, "13:40", "🟡 Agent parsed the accounts export (11 rows): Chase checking ...1182 $3,410; Ally savings ...7741 $12,980; Fidelity 401(k) $48,200; Amex Gold statement $1,126 due on the 21st; Discover It $0; Vanguard Roth IRA $9,870; Capital One Quicksilver $412; Marcus CD $5,000 matures in March; PayPal $86; Venmo $40; HSA $2,215; note from user in the sheet: the Ally savings account is the one to use for the emergency fund.")],
             "check": {"sameLine": [["ally"], ["emergency"]]}},
            {"type": 5, "lines": [(0, "16:20", "🟢 User mentioned they track spending in the YNAB iOS app, version 3.12.1.")],
             "check": {"all": [["3.12.1"]]}},
        ],
    },
    {  # 11
        "domain": "finance",
        "facts": [
            {"type": 12, "lines": [(0, "10:45", "🔴 User refused to share their bank login credentials with the assistant.")],
             "check": {"sameLine": [["credential", "login", "password"], REFUSE]}},
            {"type": 18, "lines": [(0, "12:30", "🟡 Agent's spreadsheet export failed once with error code E_SHEET_429 and succeeded on retry.")],
             "check": {"absent": ["e_sheet_429"]}},
            {"type": 6, "lines": [(0, "18:30", "🔴 User stated their car loan has 38 months remaining.")],
             "check": {"all": [["38 months", "38 more months", "38-month", "38 mo"]]}},
        ],
    },
    {  # 12
        "domain": "wedding",
        "facts": [
            {"type": 13, "lines": [(0, "11:00", "🔴 User stated they prefer a buffet dinner over a plated dinner.")],
             "check": {"sameLine": [["buffet"], PREFER]}},
            {"type": 1, "lines": [(0, "14:15", "🟢 User mentioned the florist is Marisol Etxeberria.")],
             "check": {"all": [["etxeberria"]]}},
            {"type": 7, "lines": [(0, "17:00", "🟡 User stated the rehearsal dinner will be at a winery in Paso Robles.")],
             "check": {"all": [["paso robles"]]}},
        ],
    },
    {  # 13
        "domain": "wedding",
        "facts": [
            {"type": 14, "lines": [(0, "09:45", "🔴 User set a rule: every vendor contract goes to their partner Jonah for sign-off before any deposit is paid.")],
             "check": {"sameLine": [["jonah"], ["contract", "sign-off", "sign off", "approv", "deposit"]]}},
            {"type": 2, "lines": [(0, "13:10", "🔴 User stated the photographer's package costs $4,750.")],
             "check": {"all": [["4750", "4.75k"]]}},
            {"type": 8, "lines": [(-2, "12:20", "🔴 User stated the guest count is 140."),
                                  (0, "15:50", "🔴 User stated the guest count is now 112.")],
             "check": {"all": [["140"], ["112"]]}},
        ],
    },
    {  # 14
        "domain": "wedding",
        "facts": [
            {"type": 15, "lines": [(0, "10:05", "🟡 Assistant proposed a string quartet for the ceremony; user said they would think about it.")],
             "check": {"sameLine": [["quartet"], ATTRIB]}},
            {"type": 3, "lines": [(0, "15:20", "🔴 User stated the venue walkthrough is on {d2+45}.")],
             "check": {"all": [["{d2+45}"]]}},
            {"type": 9, "lines": [(-2, "11:10", "🟡 User stated the cake flavor is lemon raspberry."),
                                  (0, "16:45", "🔴 User stated the cake flavor is now pistachio.")],
             "check": {"current": {"new": ["pistachio"], "old": ["lemon raspberry", "lemon-raspberry"], "markers": CURRENT}}},
        ],
    },
    {  # 15
        "domain": "fitness",
        "facts": [
            {"type": 16, "lines": [(0, "08:15", "🔴 User stated they have a torn meniscus in the left knee."),
                                   (1, "19:30", "🔴 User mentioned the torn meniscus in their left knee again."),
                                   (2, "07:45", "🔴 User repeated that their left knee meniscus is torn.")],
             "check": {"sameLine": [["meniscus"], ["left"]]}},
            {"type": 4, "lines": [(0, "12:10", "🔴 User stated their half marathon is six weeks from today, which is {d3+42}.")],
             "check": {"all": [["{d3+42}"]]}},
            {"type": 10, "lines": [(0, "18:20", "🔴 User stated they have never had a cardiac stress test.")],
             "check": {"sameLine": [["stress test"], NEVER]}},
        ],
    },
    {  # 16
        "domain": "fitness",
        "facts": [
            {"type": 17, "lines": [(0, "08:30", "🟡 Agent imported the Garmin export: 28 activities; longest run 14.2 km on day 3; average resting HR 54; VO2 max 47; sleep score average 71; HRV 62 ms; weekly mileage 31 km; 3 sessions missing GPS; 2 treadmill runs; note in export: user's physio set a weekly cap of 40 km until the knee check-up; shoes logged at 512 km.")],
             "check": {"all": [["40 km", "40km", "40 kilomet"]]}},
            {"type": 5, "lines": [(0, "13:00", "🟢 User mentioned their Garmin Forerunner 965 is on firmware 21.19.")],
             "check": {"all": [["21.19"]]}},
            {"type": 11, "lines": [(0, "17:35", "🟡 User stated they do not know their max heart rate.")],
             "check": {"sameLine": [["max heart rate", "maximum heart rate", "max hr", "hrmax"], UNKNOWN]}},
        ],
    },
    {  # 17
        "domain": "fitness",
        "facts": [
            {"type": 18, "lines": [(0, "07:50", "🟡 Agent's call to the nutrition API timed out (trace id tr_55Zx91) and was retried.")],
             "check": {"absent": ["tr_55zx91"]}},
            {"type": 6, "lines": [(0, "12:45", "🔴 User stated they can train 45 minutes per day on weekdays.")],
             "check": {"all": [["45 minutes", "45 min", "45-minute", "45 mins"]]}},
            {"type": 12, "lines": [(0, "18:05", "🔴 User refused to take creatine and asked the assistant not to suggest supplements.")],
             "check": {"sameLine": [["creatine"], REFUSE]}},
        ],
    },
]

POSITIONS = ["early", "middle", "late"]
ANCHOR_GROUP = {"early": 0, "middle": 3, "late": 5}  # 6 date groups per log
