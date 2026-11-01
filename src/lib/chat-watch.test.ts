import { describe, expect, it } from "vitest";
import { scanMessage } from "./chat-watch";

describe("chat watch", () => {
  it("flags paying outside Sabihand", () => {
    expect(scanMessage("Just pay me directly, it's cheaper")).toEqual(["off_platform"]);
    expect(scanMessage("Send to my opay 8031234567")).toContain("off_platform");
    expect(scanMessage("acct no: 0123456789 GTBank")).toContain("off_platform");
    expect(scanMessage("No need to pay on the app")).toContain("off_platform");
  });
  it("flags threats, insults and fraud words", () => {
    expect(scanMessage("You be thief, I go deal with you")).toContain("abuse");
    expect(scanMessage("this is a scam")).toContain("abuse");
  });
  it("flags complaints and price changes", () => {
    expect(scanMessage("The AC is still not working and I want a refund")).toContain("complaint");
    expect(scanMessage("He didn't come today")).toContain("complaint");
    expect(scanMessage("You need to add more money for transport")).toContain("price");
  });
  it("leaves normal messages alone", () => {
    for (const m of ["Good morning, I will come by 10am", "Thank you, it works well now", "Please bring the receipt", "I have paid on the app", "See you tomorrow"]) expect(scanMessage(m)).toEqual([]);
  });
});
