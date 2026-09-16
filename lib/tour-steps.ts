export interface TourStep {
  target: string
  title: string
  body: string
  /** true: advances when the user actually clicks the target themselves. false: only the tooltip's own Next button advances it. */
  waitForClick: boolean
}

/** Golden-path walkthrough: Dashboard → New Deal → buyer flow → invite link. Forced along the buyer
 * branch so the script stays linear (seller skips the marketplace-link phase). */
export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="new-deal-button"]',
    title: "Start a deal",
    body: "Click here to create your first deal.",
    waitForClick: true,
  },
  {
    target: '[data-tour="role-buyer"]',
    title: "Pick a role",
    body: "Let's walk through it as a buyer — click Buyer.",
    waitForClick: true,
  },
  {
    target: '[data-tour="role-next"]',
    title: "Continue",
    body: "Now move to the next step.",
    waitForClick: true,
  },
  {
    target: '[data-tour="skip-link"]',
    title: "No listing link?",
    body: "That's fine — just skip this step.",
    waitForClick: true,
  },
  {
    target: '[data-tour="details-step"]',
    title: "Item details",
    body: "Title and a price are the only required fields — everything else is optional.",
    waitForClick: false,
  },
  {
    target: '[data-tour="details-next"]',
    title: "Continue",
    body: "On to the summary.",
    waitForClick: true,
  },
  {
    target: '[data-tour="create-deal-button"]',
    title: "Create the deal",
    body: "Review the numbers, then create the deal for real.",
    waitForClick: true,
  },
  {
    target: '[data-tour="invite-link-card"]',
    title: "Invite your counterparty",
    body: "Share this link — they join automatically once they open it and sign in. That's the whole flow!",
    waitForClick: false,
  },
]
