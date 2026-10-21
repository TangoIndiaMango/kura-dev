import React, { useState } from "react";
import { notifications } from "@mantine/notifications";
import { apiErrorMessage } from "../../../lib/api/auth";
import { formatNaira } from "../../../shared/utils/currency";
import {
  useAttachFleetDriver,
  useFleetDrivers,
  useUpdateDriverLimits,
  type FleetDriverRow,
} from "../hooks/use-fleet-drivers";
import { useFleetSpend, type FleetSpendApi } from "../hooks/use-fleet-spend";

type DriverToday = FleetSpendApi["drivers_today"][number];

function UsageBar({
  used,
  cap,
  label,
}: {
  used: number;
  cap: number | null;
  label: string;
}) {
  if (cap == null) {
    return (
      <p className="text-[11.5px] text-[var(--kura-muted)]">{label} · no cap</p>
    );
  }
  const pct = Math.min(100, (used / Math.max(cap, 1)) * 100);
  const tone =
    pct >= 100
      ? "bg-[var(--kura-coral)]"
      : pct >= 80
        ? "bg-[var(--kura-amber)]"
        : "bg-[var(--kura-teal)]";
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11.5px] text-[var(--kura-muted)]">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--kura-border)]/50">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[var(--kura-border)] bg-transparent px-3 py-2 text-[14px] text-[var(--kura-text)]";

function DriverRow({
  driver,
  today,
  canManage,
}: {
  driver: FleetDriverRow;
  today: DriverToday | undefined;
  canManage: boolean;
}) {
  const update = useUpdateDriverLimits();
  const [editing, setEditing] = useState(false);
  const [swapCap, setSwapCap] = useState("");
  const [spendCap, setSpendCap] = useState("");
  const swapLimit = driver.daily_swap_limit ?? null;
  const spendLimit = driver.daily_spend_kobo_limit ?? null;

  const startEdit = () => {
    setSwapCap(swapLimit == null ? "" : String(swapLimit));
    setSpendCap(spendLimit == null ? "" : String(spendLimit / 100));
    setEditing(true);
  };

  const parse = (raw: string): number | null | "bad" => {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && Number.isInteger(n) ? n : "bad";
  };

  const save = async () => {
    const swaps = parse(swapCap);
    const naira = parse(spendCap);
    if (swaps === "bad" || naira === "bad") {
      notifications.show({
        color: "red",
        message: "Use whole numbers, or leave blank for no cap",
      });
      return;
    }
    try {
      await update.mutateAsync({
        driverId: driver.id,
        daily_swap_limit: swaps,
        daily_spend_kobo_limit: naira == null ? null : naira * 100,
      });
      setEditing(false);
      notifications.show({ color: "teal", message: "Limits saved" });
    } catch (err) {
      notifications.show({
        color: "red",
        message: apiErrorMessage(err, "Could not save limits"),
      });
    }
  };

  const swapsUsed = today?.swaps ?? 0;
  const spentKobo = today?.spend_kobo ?? 0;

  return (
    <li className="flex flex-col gap-2.5 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-[var(--kura-text)]">
            {driverName(driver)}
          </p>
          <p className="text-[12px] text-[var(--kura-muted)]">
            {driver.phone || "—"}
          </p>
        </div>
        <span className="rounded-lg bg-[var(--kura-border)]/40 px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--kura-muted)]">
          {driver.status}
        </span>
      </div>

      {canManage ? (
        <div className="grid grid-cols-2 gap-3">
          <UsageBar
            used={swapsUsed}
            cap={swapLimit}
            label={`Today ${swapsUsed}${swapLimit == null ? "" : `/${swapLimit}`} swaps`}
          />
          <UsageBar
            used={spentKobo}
            cap={spendLimit}
            label={`${formatNaira(spentKobo, { fromKobo: true })}${
              spendLimit == null
                ? ""
                : ` / ${formatNaira(spendLimit, { fromKobo: true })}`
            }`}
          />
        </div>
      ) : null}

      {canManage && !editing ? (
        <button
          type="button"
          onClick={startEdit}
          className="self-start text-[12px] font-bold text-[var(--kura-teal-bright)]"
        >
          Daily limits
        </button>
      ) : null}

      {editing ? (
        <div className="flex flex-col gap-2 border-t border-[var(--kura-border-subtle)] pt-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--kura-muted)]">
              Swaps per day
              <input
                inputMode="numeric"
                className={fieldClass}
                placeholder="No cap"
                value={swapCap}
                onChange={(e) => setSwapCap(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-[11.5px] text-[var(--kura-muted)]">
              Spend per day (₦)
              <input
                inputMode="numeric"
                className={fieldClass}
                placeholder="No cap"
                value={spendCap}
                onChange={(e) => setSpendCap(e.target.value)}
              />
            </label>
          </div>
          <p className="text-[11px] text-[var(--kura-muted)]">
            Checked when this driver books a swap. Blank means no cap.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={update.isPending}
              onClick={save}
              className="flex-1 rounded-xl bg-[var(--kura-teal)] py-2 text-[13px] font-bold text-white disabled:opacity-60"
            >
              {update.isPending ? "Saving…" : "Save limits"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl border border-[var(--kura-border)] px-3 py-2 text-[13px] font-bold text-[var(--kura-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function driverName(d: FleetDriverRow) {
  const n = `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim();
  return n || d.phone || d.id.slice(0, 8);
}

export function FleetDriversScreen({
  accountId,
  embedded = false,
  active = true,
  canManage = false,
}: {
  accountId: string;
  embedded?: boolean;
  active?: boolean;
  /** Account owner — sees today's usage and can add drivers / set limits. */
  canManage?: boolean;
}) {
  const { drivers, isPending, isError, refetch } = useFleetDrivers(
    accountId,
    active,
  );
  const { spend } = useFleetSpend({}, active && canManage);
  const todayById = new Map(
    (spend?.drivers_today ?? []).map((d) => [d.driver_id, d]),
  );
  const attach = useAttachFleetDriver(accountId);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [open, setOpen] = useState(false);

  const onAttach = async () => {
    if (phone.trim().length < 10) {
      notifications.show({ color: "red", message: "Enter a valid phone" });
      return;
    }
    try {
      await attach.mutateAsync({
        phone: phone.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setPhone("");
      setFirstName("");
      setLastName("");
      setOpen(false);
      await refetch();
      notifications.show({ color: "teal", message: "Driver added" });
    } catch (err) {
      notifications.show({
        color: "red",
        message: apiErrorMessage(err, "Could not add driver"),
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {embedded ? (
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-[var(--kura-text)]">
            Fleet drivers
          </h3>
          {canManage ? (
            <button
              type="button"
              className="rounded-xl bg-[var(--kura-teal)] px-3 py-1.5 text-[12px] font-bold text-white"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Cancel" : "Add"}
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--kura-border)] bg-[var(--kura-bg-elevated)] p-3">
          <input
            className="rounded-xl border border-[var(--kura-border)] bg-transparent px-3 py-2 text-[14px] text-[var(--kura-text)]"
            placeholder="Phone (+234…)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="rounded-xl border border-[var(--kura-border)] bg-transparent px-3 py-2 text-[14px] text-[var(--kura-text)]"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className="rounded-xl border border-[var(--kura-border)] bg-transparent px-3 py-2 text-[14px] text-[var(--kura-text)]"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={attach.isPending}
            className="rounded-xl bg-[var(--kura-teal)] py-2.5 text-[13px] font-bold text-white disabled:opacity-60"
            onClick={onAttach}
          >
            {attach.isPending ? "Adding…" : "Attach driver"}
          </button>
        </div>
      ) : null}

      {isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-[var(--kura-border)]/40"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="text-[13px] text-[var(--kura-muted)]">
          Could not load drivers.
        </p>
      ) : drivers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--kura-border)] px-4 py-8 text-center">
          <p className="text-[14px] font-semibold text-[var(--kura-text)]">
            No drivers yet
          </p>
          <p className="mt-1 text-[12px] text-[var(--kura-muted)]">
            Add riders so you can assign them to vehicles.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {drivers.map((d) => (
            <DriverRow
              key={d.id}
              driver={d}
              today={todayById.get(d.id)}
              canManage={canManage}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
