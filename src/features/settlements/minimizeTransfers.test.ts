import { minimizeTransfers } from "./minimizeTransfers";

describe("minimizeTransfers", () => {
  it("reduces a balanced set into a small transfer list", () => {
    const transfers = minimizeTransfers([
      { id: "a", label: "Player A", amountCents: 1400 },
      { id: "b", label: "Player B", amountCents: 700 },
      { id: "c", label: "Player C", amountCents: -1000 },
      { id: "d", label: "Player D", amountCents: -100 },
      { id: "e", label: "Player E", amountCents: -1000 },
    ]);

    expect(transfers).toEqual([
      { fromId: "c", toId: "a", amountCents: 1000 },
      { fromId: "e", toId: "a", amountCents: 400 },
      { fromId: "e", toId: "b", amountCents: 600 },
      { fromId: "d", toId: "b", amountCents: 100 },
    ]);
  });

  it("rejects unbalanced settlement input", () => {
    expect(() =>
      minimizeTransfers([
        { id: "a", label: "A", amountCents: 100 },
        { id: "b", label: "B", amountCents: -50 },
      ]),
    ).toThrow("Settlement units must sum to zero.");
  });
});
