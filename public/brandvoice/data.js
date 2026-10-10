/* Sample data for the demo. Every community, thread, handle and answer here is invented.
 * Drafts are pre-written (no model is called); they follow the drafter's rules: the company
 * speaks as itself, no personal anecdotes, no invented figures, and "you don't need to buy
 * anything" when that's the honest answer. */
(function (root) {
  "use strict";
  const H = 3600;

  const CONFIG = {
    brand: {
      name: "Acme Water",
      account: "acme_water_official",
      contact: "support@acme-water.example",
      relationship: "I work for Acme Water",
    },
    expertise: {
      can_speak_to: ["interpreting a water test report", "sizing a softener or filter to household demand",
        "whether a given contaminant needs treatment at all", "maintenance intervals and realistic filter lifespan"],
      must_not_speak_to: ["medical effects of contaminants", "legal or code compliance questions",
        "another manufacturer's internal specs"],
    },
    subreddits: [
      { name: "WaterTreatmentHelp", topics: ["well water", "iron", "hardness", "filtration", "softener", "sediment"] },
      { name: "HomeImprovementQs", topics: ["softener", "hard water", "water heater", "filter"] },
      { name: "WellOwners", topics: ["well", "sulfur", "smell", "water test", "sediment"] },
      { name: "BuyItForLifeish", topics: ["water filter", "under-sink", "filter"] },
    ],
    thread_filter: { max_age_hours: 72, max_comments: 25, min_title_length: 20, require_question: true,
      skip_flairs: ["Meme", "Rant", "Announcement"] },
    rate_limits: { replies_per_hour: 1, replies_per_day: 4, min_seconds_between_replies: 1800, one_reply_per_thread: true },
  };

  // What each community has posted as its rules. rules.scan reads these.
  const SUBS = {
    WaterTreatmentHelp: {
      rules: [
        { short_name: "Be specific", description: "Include your water test results if you have them." },
        { short_name: "Industry professionals welcome", description: "Vendors must disclose their affiliation and use the Industry flair." },
        { short_name: "No shop links", description: "Don't link to a store unless someone asks for one." },
      ],
      public_description: "Help with well and city water treatment.",
      // already granted before the demo starts
      permission: { evidence: "https://www.reddit.com/message/messages/2b8hq1", note: "mod team OK'd vendor answers in Q&A threads with Industry flair" },
    },
    HomeImprovementQs: {
      rules: [
        { short_name: "Be civil", description: "" },
        { short_name: "Give details", description: "Questions need photos or a description of what you've tried." },
        { short_name: "Trades and vendors", description: "Vendors may answer in their area. Flair yourself as Industry and ask the mods before your first reply." },
      ],
      public_description: "Questions about fixing up your home.",
      modmail: { evidence: "https://www.reddit.com/message/messages/2f7k9q", note: "mods: vendor answers OK with Industry flair, no links" },
    },
    WellOwners: {
      rules: [
        { short_name: "Private wells only", description: "Keep it about private wells and the gear around them." },
        { short_name: "Results as text", description: "Post test results as text, not screenshots." },
        { short_name: "Be kind", description: "Lots of first-time owners here." },
      ],
      public_description: "For people who drink from their own well.",
      modmail: { evidence: "https://www.reddit.com/message/messages/2h4m0x", note: "mods: fine to answer, keep the company footer" },
    },
    BuyItForLifeish: {
      rules: [
        { short_name: "Track record", description: "Recommendations need years of real use behind them." },
        { short_name: "No self-promotion", description: "No self-promotion of any kind. Commercial accounts are not allowed." },
        { short_name: "No referral links", description: "" },
      ],
      public_description: "Things that last.",
      modmail: { evidence: "https://www.reddit.com/message/messages/2j1c5d", note: "one mod said it was probably fine" },
    },
  };

  // Threads the scan kept, in review order. `age` is hours before the demo clock starts.
  const THREADS = [
    {
      reddit_id: "1k9x2c", subreddit: "WaterTreatmentHelp", author: "orange_grout", num_comments: 3, age: 5,
      title: "Orange stains in the shower since we moved onto a well. Do I need a whole-house system?",
      body: "Moved in two months ago. Orange-brown rings in the tub and toilet, and white laundry is going dingy. Our well water has nothing on it, the previous owner left no treatment at all. Is this a whole-house filter situation or is there something simpler to try first?",
      draft: "Not necessarily. Orange staining usually means iron, and the right fix depends on how much is there and in what form. Water that comes out clear and stains later is dissolved iron; water that's cloudy or orange straight from the tap has particles. They're treated differently.\n\nA certified lab test tells you both, plus hardness and manganese, which change the answer. Home strips are fine for a first look but usually can't tell you the form.\n\nPost the numbers here and we'll help you read them. Plenty of people end up with a small sediment filter rather than a whole-house system.",
      recommends_own_product: false,
    },
    {
      reddit_id: "1kb07m", subreddit: "WaterTreatmentHelp", author: "sediment_sam", num_comments: 6, age: 11,
      title: "How often should I really change a whole-house sediment filter?",
      body: "Box says every 3 months. Mine still looks fine at 3 months. Am I just throwing cartridges away?",
      draft: "Go by pressure and appearance more than the calendar. If you don't have gauges before and after the housing, they're worth fitting: when the pressure drop across the filter grows noticeably from where it started, the cartridge is loading up.\n\nWell water with a lot of sediment can need monthly changes; clean city water can go much longer. If yours looks clean and pressure is steady at three months, stretching it is reasonable. Just don't leave a cartridge in so long that it starts to smell.\n\nThe interval on the box is a conservative average, not a rule.",
      recommends_own_product: false,
    },
    {
      reddit_id: "1kc4ra", subreddit: "HomeImprovementQs", author: "kettle_scale", num_comments: 9, age: 20,
      title: "Is a water softener actually worth it for a family of four on city water?",
      body: "Builder-grade house, city water. Every salesperson who comes out says we 'need' one. Scale on the shower glass is annoying but that's about it. Worth it or upsell?",
      draft: "Check how hard your water actually is before deciding. Your water utility publishes an annual water quality report with a hardness figure, and it's free.\n\nIf it's moderate, a lot of households just live with some scale: a squeegee on the glass and descaling the kettle and water heater on schedule covers most of it. If it's high, a softener can pay off in appliance life, but size it to your household's daily use and that hardness figure, not to the biggest unit on the quote.\n\nWe make softeners, so weigh our view accordingly. The sizing math is the same for any brand.",
      recommends_own_product: false,
    },
    {
      reddit_id: "1kd8vf", subreddit: "WellOwners", author: "hot_side_only", num_comments: 4, age: 30,
      title: "Rotten egg smell, but only from the hot water. What is it?",
      body: "Cold water is fine. Hot smells like eggs, worse first thing in the morning. Well water, electric water heater, about six years old.",
      draft: "When it's the hot side only, the usual cause is the water heater rather than the well: the anode rod reacts with sulfate in the water and makes hydrogen sulfide.\n\nA plumber can swap the anode for an aluminum-zinc or powered one, and that often fixes it for the cost of a part. If the cold side starts smelling too, test the well itself, because that's a different problem.\n\nNothing here needs a filter from us.",
      recommends_own_product: false,
    },
    {
      reddit_id: "1kf2hn", subreddit: "BuyItForLifeish", author: "cracked_housing", num_comments: 14, age: 26,
      title: "Under-sink filter that will actually last 10+ years?",
      body: "Second plastic housing that's cracked on me. What actually lasts?",
      draft: "Housings with metal fittings and a standard cartridge size outlast most all-in-one units, because you can keep buying cartridges from anyone. Our under-sink line uses standard 10-inch cartridges for that reason.\n\nWhatever you pick, change the cartridge on schedule. A clogged one is what usually stresses the housing.",
      recommends_own_product: true,
    },
    {
      reddit_id: "1kg6yt", subreddit: "WaterTreatmentHelp", author: "new_parent_q", num_comments: 2, age: 8,
      title: "Is our well water safe to use for a newborn's formula?",
      body: "Baby due next month. We've never tested the well. What should we be worried about?",
      declined: "medical effects of contaminants are on the must-not-speak-to list. The drafter declined rather than write something thin: a pediatrician and a certified lab test are the right sources here.",
    },
  ];

  // Posts the scan looked at and left out. discovery.filter() works out why.
  const FILTERED = [
    { id: "1ka3pd", sub: "WaterTreatmentHelp", title: "Rant: the 'free water test' guy was a softener salesman", selftext: "Anyone else had this?", flair: "Rant", num_comments: 18, age: 6 },
    { id: "1kb9qe", sub: "WellOwners", title: "Best filter?", selftext: "Well water, iron. Help?", num_comments: 2, age: 3 },
    { id: "1k7wza", sub: "HomeImprovementQs", title: "Whole-house reverse osmosis: worth it for hard water?", selftext: "Long thread inside.", num_comments: 212, age: 14 },
    { id: "1kc1uu", sub: "WaterTreatmentHelp", title: "Finally got the iron under control, sharing my setup", selftext: "Took a year but the staining is gone.\nSediment filter, then an air-injection iron filter.", num_comments: 7, age: 9 },
    { id: "1kd0aa", sub: "HomeImprovementQs", title: "Which paint finish holds up on a bathroom ceiling?", selftext: "Steam peels everything.", num_comments: 5, age: 4 },
    { id: "1k2mmq", sub: "WellOwners", title: "Iron filter recommendations for a cabin well?", selftext: "Seasonal use only.", num_comments: 3, age: 96 },
  ];

  const FOLLOW_UP = "Following up on the question above: if you post the lab results as text, we can go through them line by line and say which numbers matter for what you're seeing.";

  root.BV_DATA = { CONFIG, SUBS, THREADS, FILTERED, FOLLOW_UP, START: Date.UTC(2026, 9, 13, 9, 0, 0), H };
})(window);
