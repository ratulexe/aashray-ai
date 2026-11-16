# Vision

## The problem

From the original notes behind this project:

1. Many times, many people don't get a place to keep themselves safe during a natural disaster.
2. Sometimes, before the disaster, they don't even get to know about it.
3. Sometimes escape really isn't possible. But even when it is, they can't get help — they just wait for a ray of light.
4. Everyone deserves to be safe at such a time. We need to do something important for uncertain disasters like floods.

**Proposed solution:** before a disaster, activate an alert that goes to all people of that area. If they want to book shelter, they can do it by SMS, WhatsApp, website or app.

## Mission

Make sure every person in a disaster-threatened area **knows in time**, **knows where to go**, and **can ask for help** — on whatever phone they have.

## Who HOPE serves

| User | Needs | Main channel |
|---|---|---|
| **Citizen / household** | Hear the warning, know the safe shelter, book a place, ask for rescue | SMS, WhatsApp, PWA |
| **Vulnerable households** (elderly, disabled, pregnant, small children) | Be known in advance, get priority and accessible shelters | Assisted registration, SMS |
| **Volunteer** (ASHA worker, panchayat member, NGO worker) | Register households who can't do it themselves | Console (mobile) |
| **Shelter operator** | Know who is coming, check people in, report capacity | Console (mobile) |
| **District / block coordinator** | Declare affected areas, send approved alerts, see demand vs capacity | Console (desktop) |
| **Rescue desk** | See and prioritise rescue requests, assign teams | Console |

## Goals

1. **Reach:** a registered person in the affected area receives the alert within minutes of approval, on SMS at minimum.
2. **Access:** every citizen action (register, book, cancel, ask for rescue) works by plain-text SMS.
3. **Accuracy:** shelter capacity is never over-booked; expired holds are released automatically; walk-ins are counted.
4. **Trust:** every alert links to an official source and has two approvals; every action is audited.
5. **Adoptable:** an organisation can deploy HOPE with one command and plug in its own SMS provider.

## Non-goals

- Forecasting or predicting disasters.
- Replacing government cell-broadcast or SACHET for mass alerting. HOPE complements them.
- Turn-by-turn navigation.
- Running a commercial messaging service.

## West Bengal first

| Hazard | Main districts | Season |
|---|---|---|
| Cyclone / storm surge | South & North 24 Parganas (Sundarbans), Purba Medinipur | May, Oct–Nov |
| Riverine flood | Paschim Medinipur (Ghatal), Malda, Murshidabad, Jalpaiguri, Cooch Behar, Howrah / Hooghly | Jul–Sep |
| Landslide | Darjeeling, Kalimpong | Jun–Sep |
| Lightning | Statewide | Apr–Sep |
| Heatwave | Purulia, Bankura, Birbhum, Paschim Bardhaman | Apr–Jun |

- **Admin hierarchy:** state → 23 districts → subdivisions → CD blocks / municipalities → gram panchayats / wards, identified by LGD codes.
- **Official warning sources:** IMD (Regional Meteorological Centre, Kolkata), Central Water Commission flood forecasts, NDMA's SACHET CAP feed, WB Disaster Management & Civil Defence Department.
- **Shelters:** multipurpose cyclone shelters, schools and community halls designated as relief centres.
- **Languages:** Bengali, English, Hindi first; Nepali and Santali later.
- **First pilot area:** one block in the Diamond Harbour subdivision (Namkhana, Sagar or Kakdwip).

## What success looks like

- **Drill:** 100 people in one village receive a test alert by SMS, and 80%+ complete a booking or acknowledgement without help.
- **Adoption:** one NGO or district office runs HOPE in a real season.
- **Scale:** HOPE is listed as a digital public good and used in more than one state.
