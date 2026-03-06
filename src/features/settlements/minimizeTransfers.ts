export type SettlementUnit = {
  id: string;
  label: string;
  amountCents: number;
};

export type SettlementTransfer = {
  fromId: string;
  toId: string;
  amountCents: number;
};

type WorkingUnit = {
  id: string;
  remainingCents: number;
};

function byMagnitudeDesc(left: WorkingUnit, right: WorkingUnit) {
  return Math.abs(right.remainingCents) - Math.abs(left.remainingCents);
}

export function minimizeTransfers(
  units: SettlementUnit[],
): SettlementTransfer[] {
  const total = units.reduce((sum, unit) => sum + unit.amountCents, 0);

  if (total !== 0) {
    throw new Error("Settlement units must sum to zero.");
  }

  const debtors = units
    .filter((unit) => unit.amountCents < 0)
    .map<WorkingUnit>((unit) => ({
      id: unit.id,
      remainingCents: Math.abs(unit.amountCents),
    }))
    .sort(byMagnitudeDesc);

  const creditors = units
    .filter((unit) => unit.amountCents > 0)
    .map<WorkingUnit>((unit) => ({
      id: unit.id,
      remainingCents: unit.amountCents,
    }))
    .sort(byMagnitudeDesc);

  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountCents = Math.min(debtor.remainingCents, creditor.remainingCents);

    transfers.push({
      fromId: debtor.id,
      toId: creditor.id,
      amountCents,
    });

    debtor.remainingCents -= amountCents;
    creditor.remainingCents -= amountCents;

    if (debtor.remainingCents === 0) {
      debtorIndex += 1;
    }

    if (creditor.remainingCents === 0) {
      creditorIndex += 1;
    }
  }

  return transfers;
}
