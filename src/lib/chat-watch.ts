/**
 * Spots chat messages the Sabihand team should look at. Plain word rules, so the result is predictable and
 * explainable: each hit says which rule matched. It never blocks or changes a message; it only alerts the team.
 */
export type ChatIssue = "off_platform" | "abuse" | "complaint" | "price";

export const ISSUE_LABEL: Record<ChatIssue, string> = {
  off_platform: "Paying or dealing outside Sabihand",
  abuse: "Threats, insults or fraud words",
  complaint: "Complaint about the job",
  price: "Asking for more money than the quote",
};

const RULES: { issue: ChatIssue; re: RegExp }[] = [
  { issue: "off_platform", re: /\b(pay|send|transfer)\b[^.?!]{0,30}\b(direct(ly)?|outside|cash|my (account|acct|number|opay|palmpay|moniepoint|kuda))\b/i },
  { issue: "off_platform", re: /\b(don'?t|do not|no need to)\b[^.?!]{0,20}\bpay\b[^.?!]{0,20}\b(app|site|sabihand|platform)\b/i },
  { issue: "off_platform", re: /\b(cancel|leave)\b[^.?!]{0,30}\b(app|site|sabihand|platform)\b/i },
  { issue: "off_platform", re: /\b(acct|account|acc)\s*(no|num|number)?\b[^.?!]{0,15}\b\d{10}\b/i },
  { issue: "off_platform", re: /\b(opay|palmpay|moniepoint|kuda)\b[^.?!]{0,20}\b\d{10}\b/i },
  { issue: "off_platform", re: /\bcash on (delivery|arrival)\b/i },
  { issue: "abuse", re: /\b(kill|beat|deal with) (you|u)\b|\bi go (deal|show) (with )?(you|u)\b/i },
  { issue: "abuse", re: /\b(idiot|stupid|fool|mumu|ode|olodo|bastard|useless|nonsense|thief|ole)\b/i },
  { issue: "abuse", re: /\b(scam(mer)?|fraud(ster)?|419|yahoo boy|police|court|lawyer)\b/i },
  { issue: "abuse", re: /\b(nude|nudes|sleep with (me|you)|sexy)\b/i },
  { issue: "complaint", re: /\b(refund|my money back)\b/i },
  { issue: "complaint", re: /\b(not working|still not|spoil(t|ed)?|damag(ed|e)|broke|broken|worse|disappoint(ed|ing)?|waste(d)? my time)\b/i },
  { issue: "complaint", re: /\b(did ?n[o']?t|never) (come|show|arrive|finish|fix)\b|\bno[- ]show\b/i },
  { issue: "price", re: /\b(add|pay|give|send)\b[^.?!]{0,15}\b(more|extra|balance)\b[^.?!]{0,15}\b(money|cash|naira|k)?\b/i },
  { issue: "price", re: /\b(increase|raise|change)\b[^.?!]{0,15}\b(price|amount|charge|fee)\b|\bovercharg/i },
];

export function scanMessage(body: string): ChatIssue[] {
  const found = new Set<ChatIssue>();
  for (const r of RULES) if (r.re.test(body)) found.add(r.issue);
  return [...found];
}
