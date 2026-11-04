package reports

// The report builder's catalogue. A dataset is one module a user can
// export; its fields and filters are an allowlist: requests name keys, and
// only the SQL written in this file is ever put into a query.

// Field types decide how a value is cast in SQL and shown or written out.
const (
	typeText     = "text"
	typeNumber   = "number"
	typeMoney    = "money" // kobo in SQL and JSON, naira in files
	typeDatetime = "datetime"
)

// Field is one column a user can pick.
type Field struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Group string `json:"group"`
	Type  string `json:"type"`
	expr  string
}

// Filter kinds: a hub or cooperative id, or one value from a fixed list.
const (
	filterHub         = "hub"
	filterCooperative = "cooperative"
	filterChoice      = "choice"
)

// Filter narrows rows; cond refers to the bound value as %s (or %[1]s
// when it needs it more than once).
type Filter struct {
	Key     string   `json:"key"`
	Label   string   `json:"label"`
	Kind    string   `json:"kind"`
	Choices []string `json:"choices,omitempty"`
	cond    string
	heavy   bool // needs the dataset's full FROM even to count
}

// Dataset is one exportable module.
type Dataset struct {
	Code        string   `json:"code"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	DateLabel   string   `json:"date_label"`
	Fields      []Field  `json:"fields"`
	Filters     []Filter `json:"filters"`
	capability  string
	from        string
	// countFrom is a lighter FROM for counting when no filter needs the
	// joins it leaves out (filters flagged `heavy`); "" means from.
	countFrom string
	date      string // timestamptz the date range applies to
	hub       string // the row's hub id, for hub-scoped staff ("" = hidden from them)
	search    []string
	order     string
}

func f(key, label, group, typ, expr string) Field {
	return Field{Key: key, Label: label, Group: group, Type: typ, expr: expr}
}

func choice(key, label, cond string, choices ...string) Filter {
	return Filter{Key: key, Label: label, Kind: filterChoice, Choices: choices, cond: cond}
}

func hubFilter(cond string) Filter {
	return Filter{Key: "hub", Label: "Hub", Kind: filterHub, cond: cond}
}

func coopFilter(cond string) Filter {
	return Filter{Key: "cooperative", Label: "Chairman group", Kind: filterCooperative, cond: cond}
}

// The chairman of an account: its first chairman-linked vehicle.
const accountCoop = `(SELECT v.cooperative_id FROM mobility_vehicle v WHERE v.account_id = a.id
  AND v.cooperative_id IS NOT NULL ORDER BY v.created_at, v.id LIMIT 1)`

var datasets = []Dataset{
	{
		Code: "payments", hub: "p.hub_id", Label: "Payments", capability: "finance:read", DateLabel: "Paid",
		Description: "Every payment: what it was for, how it was paid, the rider, hub, vehicle and chairman.",
		from: `finance_payment p
JOIN accounts_account a ON a.id = p.account_id
LEFT JOIN mobility_hub h ON h.id = p.hub_id
LEFT JOIN LATERAL (SELECT v.registration_plate, v.cooperative_id FROM mobility_swap s
  JOIN mobility_vehicle v ON v.id = s.vehicle_id WHERE s.payment_id = p.id LIMIT 1) sv ON true
LEFT JOIN LATERAL (SELECT v.registration_plate, v.cooperative_id FROM mobility_subscription s
  JOIN mobility_vehicle v ON v.id = s.vehicle_id WHERE s.payment_id = p.id LIMIT 1) pv ON true
LEFT JOIN (SELECT DISTINCT ON (account_id) account_id, cooperative_id FROM mobility_vehicle
  WHERE cooperative_id IS NOT NULL ORDER BY account_id, created_at, id) av ON av.account_id = p.account_id
LEFT JOIN accounts_cooperative c ON c.id = COALESCE(sv.cooperative_id, pv.cooperative_id, av.cooperative_id)`,
		countFrom: `finance_payment p JOIN accounts_account a ON a.id = p.account_id`,
		date:      "p.created_at", order: "p.created_at DESC",
		// Receipt and rider only: searching the vehicle would resolve every row's swap first.
		search: []string{"p.receipt_code", "a.kura_id", "a.display_name"},
		Fields: []Field{
			f("receipt", "Receipt", "Payment", typeText, "p.receipt_code"),
			f("paid_at", "Time", "Payment", typeDatetime, "p.created_at"),
			f("purpose", "Purpose", "Payment", typeText, "p.purpose"),
			f("channel", "Paid by", "Payment", typeText, "p.channel"),
			f("status", "Status", "Payment", typeText, "p.status"),
			f("psp_reference", "PSP reference", "Payment", typeText, "COALESCE(p.psp_reference, '')"),
			f("amount", "Amount", "Money", typeMoney, "p.amount_kobo"),
			f("vat", "VAT", "Money", typeMoney, "p.vat_kobo"),
			f("net", "Net", "Money", typeMoney, "p.amount_kobo - p.vat_kobo"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
			f("vehicle", "Vehicle", "Vehicle", typeText, "COALESCE(sv.registration_plate, pv.registration_plate, '')"),
			f("chairman_group", "Chairman group", "Vehicle", typeText, "COALESCE(c.name, '')"),
			f("hub", "Hub", "Place", typeText, "COALESCE(h.name, '')"),
		},
		Filters: []Filter{
			hubFilter("p.hub_id = %s"),
			// Narrow to the group's riders by account index first, then keep
			// the payments actually attributed to the group.
			Filter{Key: "cooperative", Label: "Chairman group", Kind: filterCooperative, heavy: true,
				cond: `p.account_id IN (SELECT v.account_id FROM mobility_vehicle v WHERE v.cooperative_id = %[1]s)
  AND c.id = %[1]s`},
			choice("status", "Status", "p.status = %s", "SUCCESS", "PENDING", "FAILED", "REFUNDED", "REVERSED"),
			choice("purpose", "Purpose", "p.purpose = %s", "SWAP", "PLAN", "FUND", "RESERVATION", "SERVICE", "INVITE", "WALLET_TOPUP", "LOAN_REPAY"),
			choice("channel", "Paid by", "p.channel = %s", "CARD", "NUBAN_TRANSFER", "BANK_TRANSFER", "AGENT_CASH", "WALLET_DEBIT", "USSD"),
		},
	},
	{
		Code: "swaps", hub: "s.hub_id", Label: "Swaps", capability: "swaps:read", DateLabel: "Started",
		Description: "Every battery swap: hub, rider, driver, vehicle, packs in and out, price and agent.",
		from: `mobility_swap s
JOIN mobility_hub h ON h.id = s.hub_id
JOIN mobility_vehicle v ON v.id = s.vehicle_id
JOIN accounts_account a ON a.id = s.account_id
LEFT JOIN accounts_driver d ON d.id = s.driver_id
LEFT JOIN accounts_user du ON du.id = d.user_id
LEFT JOIN accounts_user ag ON ag.id = s.agent_id
LEFT JOIN accounts_cooperative c ON c.id = v.cooperative_id
LEFT JOIN mobility_battery bo ON bo.id = s.issued_battery_id
LEFT JOIN mobility_battery bi ON bi.id = s.returned_battery_id`,
		date: "s.created_at", order: "s.created_at DESC",
		search: []string{"a.kura_id", "a.display_name", "v.registration_plate", "bo.serial", "bi.serial"},
		Fields: []Field{
			f("started_at", "Started", "Swap", typeDatetime, "s.started_at"),
			f("completed_at", "Completed", "Swap", typeDatetime, "s.completed_at"),
			f("status", "Status", "Swap", typeText, "s.status"),
			f("source", "Source", "Swap", typeText, "s.source"),
			f("amount", "Amount", "Money", typeMoney, "s.amount_kobo"),
			f("vat", "VAT", "Money", typeMoney, "s.vat_kobo"),
			f("hub", "Hub", "Place", typeText, "h.name"),
			f("agent", "Agent", "Place", typeText, "COALESCE(trim(ag.first_name || ' ' || ag.last_name), '')"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
			f("driver", "Driver", "Rider", typeText, "COALESCE(trim(du.first_name || ' ' || du.last_name), '')"),
			f("vehicle", "Vehicle", "Vehicle", typeText, "v.registration_plate"),
			f("chairman_group", "Chairman group", "Vehicle", typeText, "COALESCE(c.name, '')"),
			f("pack_out", "Pack out", "Packs", typeText, "COALESCE(bo.serial, '')"),
			f("pack_in", "Pack in", "Packs", typeText, "COALESCE(bi.serial, '')"),
		},
		Filters: []Filter{
			hubFilter("s.hub_id = %s"),
			coopFilter("v.cooperative_id = %s"),
			choice("status", "Status", "s.status = %s", "STARTED", "ISSUED", "RETURN_RECORDED", "COMPLETED", "FAILED", "REVERSED", "CANCELLED"),
		},
	},
	{
		Code: "riders", Label: "Riders", capability: "accounts:read", DateLabel: "Joined",
		Description: "Rider accounts: contact, status, KYC, how they joined and their vehicles.",
		from:        `accounts_account a JOIN accounts_user o ON o.id = a.owner_user_id`,
		date:        "a.created_at", order: "a.created_at DESC",
		search: []string{"a.kura_id", "a.display_name", "o.phone", "o.email"},
		Fields: []Field{
			f("kura_id", "KURA ID", "Identity", typeText, "a.kura_id"),
			f("name", "Name", "Identity", typeText, "a.display_name"),
			f("kind", "Kind", "Identity", typeText, "a.kind"),
			f("phone", "Phone", "Contact", typeText, "COALESCE(o.phone, '')"),
			f("email", "Email", "Contact", typeText, "COALESCE(o.email, '')"),
			f("status", "Status", "Status", typeText, "a.status"),
			f("kyc_status", "KYC", "Status", typeText, "a.kyc_status"),
			f("risk_status", "Risk", "Status", typeText, "a.risk_status"),
			f("joined_via", "Joined via", "Status", typeText, "a.registration_channel"),
			f("vehicles", "Vehicles", "Vehicles", typeNumber, "(SELECT count(*) FROM mobility_vehicle v WHERE v.account_id = a.id)"),
			f("chairman_group", "Chairman group", "Vehicles", typeText,
				"COALESCE((SELECT c.name FROM accounts_cooperative c WHERE c.id = "+accountCoop+"), '')"),
			f("joined_at", "Joined", "Dates", typeDatetime, "a.created_at"),
		},
		Filters: []Filter{
			coopFilter("EXISTS (SELECT 1 FROM mobility_vehicle v WHERE v.account_id = a.id AND v.cooperative_id = %s)"),
			choice("status", "Status", "a.status = %s", "ACTIVE", "SUSPENDED"),
			choice("kyc_status", "KYC", "a.kyc_status = %s", "NONE", "PENDING", "PENDING_PSP", "VERIFIED", "REJECTED"),
			choice("kind", "Kind", "a.kind = %s", "INDIVIDUAL", "FLEET"),
		},
	},
	{
		Code: "vehicles", Label: "Vehicles", capability: "vehicles:read", DateLabel: "Registered",
		Description: "Vehicles with their model, owner account, chairman, assigned driver and mounted pack.",
		from: `mobility_vehicle v
JOIN mobility_vehiclemodel m ON m.id = v.vehicle_model_id
JOIN accounts_account a ON a.id = v.account_id
LEFT JOIN accounts_cooperative c ON c.id = v.cooperative_id
LEFT JOIN accounts_driver d ON d.id = v.assigned_driver_id
LEFT JOIN accounts_user du ON du.id = d.user_id
LEFT JOIN mobility_battery b ON b.id = v.current_battery_id`,
		date: "v.created_at", order: "v.created_at DESC",
		search: []string{"v.registration_plate", "v.vin", "v.hardware_id", "a.kura_id", "a.display_name"},
		Fields: []Field{
			f("plate", "Plate", "Vehicle", typeText, "v.registration_plate"),
			f("make", "Make", "Vehicle", typeText, "m.make"),
			f("model", "Model", "Vehicle", typeText, "m.model"),
			f("type", "Type", "Vehicle", typeText, "m.vehicle_type"),
			f("status", "Status", "Vehicle", typeText, "v.status"),
			f("vin", "VIN", "Vehicle", typeText, "v.vin"),
			f("hardware_id", "Hardware ID", "Vehicle", typeText, "COALESCE(v.hardware_id, '')"),
			f("owner_kura_id", "Account KURA ID", "Owner", typeText, "a.kura_id"),
			f("owner_name", "Account", "Owner", typeText, "a.display_name"),
			f("chairman_group", "Chairman group", "Owner", typeText, "COALESCE(c.name, '')"),
			f("driver", "Assigned driver", "Owner", typeText, "COALESCE(trim(du.first_name || ' ' || du.last_name), '')"),
			f("pack", "Mounted pack", "Pack", typeText, "COALESCE(b.serial, '')"),
			f("charge", "Pack charge %", "Pack", typeNumber, "b.charge_pct"),
			f("registered_at", "Registered", "Dates", typeDatetime, "v.created_at"),
		},
		Filters: []Filter{
			coopFilter("v.cooperative_id = %s"),
			choice("status", "Status", "v.status = %s", "ACTIVE", "PENDING", "SUSPENDED", "RETIRED"),
		},
	},
	{
		Code: "plans", Label: "Plans", capability: "finance:read", DateLabel: "Bought",
		Description: "Plans riders bought: plan, vehicle, price, discount, swaps used and status.",
		from: `mobility_subscription s
JOIN mobility_plan pl ON pl.id = s.plan_id
JOIN accounts_account a ON a.id = s.account_id
JOIN mobility_vehicle v ON v.id = s.vehicle_id
LEFT JOIN accounts_cooperative c ON c.id = v.cooperative_id`,
		date: "s.created_at", order: "s.created_at DESC",
		search: []string{"a.kura_id", "a.display_name", "v.registration_plate", "pl.name"},
		Fields: []Field{
			f("plan", "Plan", "Plan", typeText, "pl.name"),
			f("status", "Status", "Plan", typeText, "s.status"),
			f("starts_at", "Starts", "Plan", typeDatetime, "s.starts_at"),
			f("ends_at", "Ends", "Plan", typeDatetime, "s.ends_at"),
			f("swaps_used", "Swaps used", "Plan", typeNumber, "s.swaps_used"),
			f("swap_allowance", "Swap allowance", "Plan", typeNumber, "s.swaps_allowance"),
			f("list_price", "List price", "Money", typeMoney, "s.list_price_kobo"),
			f("discount", "Discount", "Money", typeMoney, "s.discount_kobo"),
			f("paid", "Paid", "Money", typeMoney, "s.amount_kobo"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
			f("vehicle", "Vehicle", "Vehicle", typeText, "v.registration_plate"),
			f("chairman_group", "Chairman group", "Vehicle", typeText, "COALESCE(c.name, '')"),
		},
		Filters: []Filter{
			coopFilter("v.cooperative_id = %s"),
			choice("status", "Status", "s.status = %s", "ACTIVE", "PENDING", "EXPIRED", "CANCELLED"),
		},
	},
	{
		Code: "loans", Label: "Loans", capability: "finance:read", DateLabel: "Started",
		Description: "Swap-credit loans: amounts, repaid, outstanding, due date and days late.",
		from:        `credit_loan l JOIN accounts_account a ON a.id = l.account_id LEFT JOIN accounts_cooperative c ON c.id = ` + accountCoop,
		date:        "l.starts_at", order: "l.starts_at DESC",
		search: []string{"a.kura_id", "a.display_name"},
		Fields: []Field{
			f("status", "Status", "Loan", typeText, "l.status"),
			f("starts_at", "Started", "Loan", typeDatetime, "l.starts_at"),
			f("due_at", "Due", "Loan", typeDatetime, "l.due_at"),
			f("days_late", "Days late", "Loan", typeNumber,
				"GREATEST(0, (now()::date - COALESCE(l.grace_until, l.due_at)::date))"),
			f("principal", "Principal", "Money", typeMoney, "l.principal_kobo"),
			f("interest", "Interest", "Money", typeMoney, "l.interest_kobo"),
			f("total_due", "Total due", "Money", typeMoney, "l.total_due_kobo"),
			f("repaid", "Repaid", "Money", typeMoney, "l.repaid_kobo"),
			f("outstanding", "Outstanding", "Money", typeMoney, "l.total_due_kobo - l.repaid_kobo"),
			f("daily_installment", "Daily instalment", "Money", typeMoney, "l.daily_installment_kobo"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
			f("chairman_group", "Chairman group", "Rider", typeText, "COALESCE(c.name, '')"),
		},
		Filters: []Filter{
			coopFilter("c.id = %s"),
			choice("status", "Status", "l.status = %s", "ACTIVE", "GRACE", "RESTRICTED", "CLOSED"),
		},
	},
	{
		Code: "cash", hub: "cd.hub_id", Label: "Cash at hubs", capability: "finance:read", DateLabel: "Received",
		Description: "Cash agents took at hubs: receipt, hub, agent, rider, purpose and amount.",
		from: `operations_cashdeposit cd
JOIN mobility_hub h ON h.id = cd.hub_id
JOIN accounts_account a ON a.id = cd.account_id
JOIN accounts_user ag ON ag.id = cd.agent_id`,
		date: "cd.created_at", order: "cd.created_at DESC",
		search: []string{"cd.receipt_code", "a.kura_id", "a.display_name"},
		Fields: []Field{
			f("receipt", "Receipt", "Cash", typeText, "cd.receipt_code"),
			f("received_at", "Time", "Cash", typeDatetime, "cd.created_at"),
			f("purpose", "Purpose", "Cash", typeText, "cd.purpose"),
			f("status", "Status", "Cash", typeText, "cd.status"),
			f("amount", "Amount", "Money", typeMoney, "cd.amount_kobo"),
			f("hub", "Hub", "Place", typeText, "h.name"),
			f("agent", "Agent", "Place", typeText, "trim(ag.first_name || ' ' || ag.last_name)"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
		},
		Filters: []Filter{hubFilter("cd.hub_id = %s")},
	},
	{
		Code: "hubs", hub: "h.id", Label: "Hubs", capability: "hubs:read", DateLabel: "Opened",
		Description: "Swap hubs: address, status, slots and solar capacity.",
		from:        `mobility_hub h`, date: "h.created_at", order: "h.code",
		search: []string{"h.code", "h.name", "h.address"},
		Fields: []Field{
			f("code", "Code", "Hub", typeText, "h.code"),
			f("name", "Name", "Hub", typeText, "h.name"),
			f("address", "Address", "Hub", typeText, "h.address"),
			f("status", "Status", "Hub", typeText, "h.status"),
			f("slots", "Slots", "Capacity", typeNumber, "h.slot_count"),
			f("solar_kw", "Solar kW", "Capacity", typeText, "h.solar_capacity_kw::text"),
			f("opened_at", "Opened", "Dates", typeDatetime, "h.created_at"),
		},
		Filters: []Filter{choice("status", "Status", "h.status = %s", "ONLINE", "OFFLINE", "MAINTENANCE", "CLOSED")},
	},
	{
		Code: "batteries", hub: "b.current_hub_id", Label: "Batteries", capability: "batteries:read", DateLabel: "Added",
		Description: "Battery packs: type, status, charge, health, cycles and where they are.",
		from: `mobility_battery b
JOIN mobility_batterytype t ON t.id = b.battery_type_id
LEFT JOIN mobility_hub h ON h.id = b.current_hub_id`,
		date: "b.created_at", order: "b.serial",
		search: []string{"b.serial", "t.name"},
		Fields: []Field{
			f("serial", "Serial", "Pack", typeText, "b.serial"),
			f("type", "Type", "Pack", typeText, "t.name"),
			f("status", "Status", "Pack", typeText, "b.status"),
			f("charge", "Charge %", "Health", typeNumber, "b.charge_pct"),
			f("health", "Health %", "Health", typeNumber, "b.health_pct"),
			f("cycles", "Cycles", "Health", typeNumber, "b.cycle_count"),
			f("hub", "Hub", "Place", typeText, "COALESCE(h.name, '')"),
			f("custodian", "Held by", "Place", typeText, "b.custodian_type"),
			f("issued_at", "Issued", "Dates", typeDatetime, "b.issued_at"),
			f("expected_return_by", "Due back", "Dates", typeDatetime, "b.expected_return_by"),
		},
		Filters: []Filter{
			hubFilter("b.current_hub_id = %s"),
			choice("status", "Status", "b.status = %s", "AVAILABLE", "RESERVED", "ISSUED", "RETURNED", "CHARGING", "UNAVAILABLE", "FAULTED", "LOST", "RETIRED"),
		},
	},
	{
		Code: "alerts", hub: "al.hub_id", Label: "Alerts", capability: "alerts:read", DateLabel: "Raised",
		Description: "Hub and system alerts with how and when they were handled.",
		from:        `operations_alert al LEFT JOIN mobility_hub h ON h.id = al.hub_id`,
		date:        "al.created_at", order: "al.created_at DESC",
		search: []string{"al.kind", "al.message"},
		Fields: []Field{
			f("kind", "Kind", "Alert", typeText, "al.kind"),
			f("severity", "Severity", "Alert", typeText, "al.severity"),
			f("status", "Status", "Alert", typeText, "al.status"),
			f("message", "Message", "Alert", typeText, "al.message"),
			f("hub", "Hub", "Place", typeText, "COALESCE(h.name, '')"),
			f("raised_at", "Raised", "Dates", typeDatetime, "al.created_at"),
			f("acknowledged_at", "Acknowledged", "Dates", typeDatetime, "al.acknowledged_at"),
			f("resolved_at", "Resolved", "Dates", typeDatetime, "al.resolved_at"),
		},
		Filters: []Filter{
			hubFilter("al.hub_id = %s"),
			choice("severity", "Severity", "al.severity = %s", "INFO", "WARNING", "CRITICAL"),
		},
	},
	{
		Code: "risk", Label: "Risk events", capability: "risk:read", DateLabel: "Raised",
		Description: "Risk rule hits: rule, rider, severity, action taken and review.",
		from: `risk_riskevent e
JOIN risk_riskrule ru ON ru.id = e.rule_id
LEFT JOIN accounts_account a ON a.id = e.account_id
LEFT JOIN accounts_user rv ON rv.id = e.reviewed_by_id`,
		date: "e.created_at", order: "e.created_at DESC",
		search: []string{"ru.code", "ru.name", "a.kura_id"},
		Fields: []Field{
			f("rule", "Rule", "Event", typeText, "ru.name"),
			f("rule_code", "Rule code", "Event", typeText, "ru.code"),
			f("severity", "Severity", "Event", typeText, "e.severity"),
			f("score", "Score", "Event", typeNumber, "e.score"),
			f("action", "Action taken", "Event", typeText, "e.action_taken"),
			f("status", "Status", "Review", typeText, "e.status"),
			f("reviewed_by", "Reviewed by", "Review", typeText, "COALESCE(trim(rv.first_name || ' ' || rv.last_name), '')"),
			f("review_note", "Review note", "Review", typeText, "e.review_note"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "COALESCE(a.kura_id, '')"),
			f("raised_at", "Raised", "Dates", typeDatetime, "e.created_at"),
		},
		Filters: []Filter{choice("severity", "Severity", "e.severity = %s", "LOW", "MEDIUM", "HIGH", "CRITICAL")},
	},
	{
		Code: "cases", Label: "Support cases", capability: "cases:read", DateLabel: "Opened",
		Description: "Support cases: subject, rider, assignee, priority, status and SLA.",
		from: `support_supportcase sc
JOIN accounts_account a ON a.id = sc.account_id
LEFT JOIN accounts_user u ON u.id = sc.assigned_to_id`,
		date: "sc.created_at", order: "sc.created_at DESC",
		search: []string{"sc.code", "sc.subject", "a.kura_id", "a.display_name"},
		Fields: []Field{
			f("code", "Code", "Case", typeText, "sc.code"),
			f("subject", "Subject", "Case", typeText, "sc.subject"),
			f("kind", "Kind", "Case", typeText, "sc.kind"),
			f("priority", "Priority", "Case", typeText, "sc.priority"),
			f("status", "Status", "Case", typeText, "sc.status"),
			f("assignee", "Assignee", "Case", typeText, "COALESCE(trim(u.first_name || ' ' || u.last_name), '')"),
			f("rider_kura_id", "Rider KURA ID", "Rider", typeText, "a.kura_id"),
			f("rider_name", "Rider", "Rider", typeText, "a.display_name"),
			f("opened_at", "Opened", "Dates", typeDatetime, "sc.created_at"),
			f("sla_due_at", "SLA due", "Dates", typeDatetime, "sc.sla_due_at"),
		},
		Filters: []Filter{
			choice("priority", "Priority", "sc.priority = %s", "LOW", "NORMAL", "HIGH", "URGENT"),
			choice("status", "Status", "sc.status = %s", "OPEN", "PENDING", "RESOLVED", "CLOSED"),
		},
	},
}

var datasetByCode = func() map[string]*Dataset {
	m := make(map[string]*Dataset, len(datasets))
	for i := range datasets {
		m[datasets[i].Code] = &datasets[i]
	}
	return m
}()
