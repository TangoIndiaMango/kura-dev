"""Finance: payments (cursor feed, filters, stats, statement, receipts),
wallets (list, detail, mine, dev fund) and the ledger."""
import sys
import urllib.parse

from lib import DJ, GO, both, call, check, follow, fresh, sql, staff_tokens, summary

ops = staff_tokens()
admin = staff_tokens("admin@yopmail.com", "adminpass123")
agent = staff_tokens("agent.yaba@yopmail.com", "agentpass123")


def pin(phone):
    b = {"phone": phone, "pin": "1234"}
    return (call(DJ, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"),
            call(GO, "POST", "/api/v1/auth/pin/login/", b)[1].get("access"))


owner, rider, fdriver = pin("+2348022220001"), pin("+2348033330001"), pin("+2348011110002")
P, W, L = "/api/v1/finance/payments/", "/api/v1/finance/wallets/", "/api/v1/finance/ledger/"
CUR = ("next", "previous")



for label, tok in [("ops", ops), ("admin", admin), ("agent", agent), ("owner", owner), ("rider", rider),
                   ("fleet driver", fdriver)]:
    follow(f"payments as {label}", P + "?page_size=7", tok)
    both(f"stats as {label}", "GET", P + "stats/", tokens=tok)
fresh()
hub = sql("SELECT id FROM mobility_hub ORDER BY code LIMIT 1")[0][0]
acct = sql("SELECT id FROM accounts_account WHERE kura_id = 'KR-FLEET-VCU'")[0][0]
for q in ["?status=SUCCESS", "?channel=WALLET_DEBIT", "?purpose=PLAN", f"?hub={hub}", f"?account={acct}",
          "?search=kr-rider", "?search=RC-", "?start_date=2026-10-01&end_date=2026-10-15", "?end_date=2026-09-20",
          "?account=bad", "?start_date=nope"]:
    both(f"payments {q}", "GET", P + q + "&page_size=50" if "?" in q else P, tokens=ops, extra=CUR)
    both(f"stats {q}", "GET", P + "stats/" + q, tokens=ops)
fresh()
for label, tok, q in [("ops", ops, ""), ("range", ops, "?start_date=2026-10-01&end_date=2026-10-20"),
                      ("owner", owner, ""), ("hub", ops, f"?hub={hub}&status=SUCCESS")]:
    d = call(DJ, "GET", P + "export/" + q, token=tok[0], raw=True)
    g = call(GO, "GET", P + "export/" + q, token=tok[1], raw=True)
    check(f"statement {label}", (d[0], d[1].decode(), d[2].get("Content-Disposition")),
          (g[0], g[1].decode(), g[2].get("Content-Disposition")))
pays = sql("""(SELECT id FROM finance_payment WHERE purpose = 'SWAP' ORDER BY created_at DESC LIMIT 6)
  UNION ALL (SELECT id FROM finance_payment WHERE purpose = 'PLAN' ORDER BY created_at DESC LIMIT 4)
  UNION ALL (SELECT id FROM finance_payment WHERE purpose = 'FUND' ORDER BY created_at DESC LIMIT 3)
  UNION ALL (SELECT payment_id FROM mobility_discountredemption WHERE payment_id IS NOT NULL LIMIT 3)""")
fresh()
for (pid,) in pays:
    both(f"payment {pid[-6:]}", "GET", f"{P}{pid}/", tokens=ops)
    both(f"receipt {pid[-6:]}", "GET", f"{P}{pid}/receipt/", tokens=ops)
pdf = {k: call(base, "GET", f"{P}{pays[0][0]}/receipt/?as=pdf", token=t, raw=True)
       for k, base, t in (("django", DJ, ops[0]), ("go", GO, ops[1]))}
check("receipt pdf", (pdf["django"][0], pdf["django"][1][:5], pdf["django"][2].get("Content-Type"),
                      pdf["django"][2].get("Content-Disposition")),
      (pdf["go"][0], pdf["go"][1][:5], pdf["go"][2].get("Content-Type"), pdf["go"][2].get("Content-Disposition")))
own_pay = call(DJ, "GET", P, token=owner[0])[1]["results"][0]["id"]
both("payment as owner", "GET", f"{P}{own_pay}/", tokens=owner)
both("receipt as owner", "GET", f"{P}{own_pay}/receipt/", tokens=owner)
both("payment other as owner (404)", "GET", f"{P}{pays[-1][0]}/", tokens=owner)
both("payment bad id", "GET", P + "nope/", tokens=ops)

fresh()
for label, tok in [("ops", ops), ("owner", owner), ("rider", rider), ("fleet driver", fdriver), ("agent", agent)]:
    both(f"wallets as {label}", "GET", W, tokens=tok)
    both(f"wallet mine as {label}", "GET", W + "mine/", tokens=tok)
for q in ["?status=ACTIVE", f"?account={acct}", "?page_size=3&page=2", "?account=bad"]:
    both(f"wallets {q}", "GET", W + q, tokens=ops)
for (wid,) in sql("SELECT id FROM finance_wallet ORDER BY created_at LIMIT 8"):
    both(f"wallet {wid[-6:]}", "GET", f"{W}{wid}/", tokens=ops)
mine = call(DJ, "GET", W + "mine/", token=rider[0])[1]["id"]
both("wallet detail as rider", "GET", f"{W}{mine}/", tokens=rider)
both("wallet other as rider (404)", "GET", f"{W}{sql('SELECT id FROM finance_wallet ORDER BY created_at DESC LIMIT 1')[0][0]}/",
     tokens=rider)

# Dev funding (DEBUG + dev VA): 100 kobo on each backend for the same rider.
fresh()
both("fund: empty", "POST", W + "fund/", {}, rider)
both("fund: bad", "POST", W + "fund/", {"amount_kobo": 0, "amount_naira": "1.234", "channel": "CASH"}, rider)
both("fund: naira below 1", "POST", W + "fund/", {"amount_naira": "0.50"}, rider)
both("fund as staff without account", "POST", W + "fund/", {"amount_kobo": 100}, ops)
FUND_SCRUB = ("id", "receipt_code", "created_at", "balance_kobo", "available_kobo")
out = {k: call(base, "POST", W + "fund/", {"amount_naira": "1.00"}, t) for k, base, t in
       (("django", DJ, rider[0]), ("go", GO, rider[1]))}
check("fund", out["django"], out["go"], extra=FUND_SCRUB)
for k in out:
    ref = sql(f"SELECT psp_reference FROM finance_payment WHERE id = '{out[k][1]['payment']['id']}'")[0][0]
    rows = sql(f"""SELECT t.kind, t.description, a.code, a.account_type, e.debit_kobo, e.credit_kobo
      FROM finance_ledgertransaction t JOIN finance_ledgerentry e ON e.transaction_id = t.id
      JOIN finance_ledgeraccount a ON a.id = e.ledger_account_id
      WHERE t.reference = 'FUND-{out[k][1]['payment']['receipt_code']}' ORDER BY e.debit_kobo DESC""")
    out[k] = (ref.split(":")[0], rows)
check("fund ledger postings", (200, out["django"]), (200, out["go"]))

fresh()
follow("ledger", L + "?page_size=5", ops, pages=4)
for (tid,) in sql("SELECT id FROM finance_ledgertransaction ORDER BY created_at DESC LIMIT 10"):
    both(f"ledger {tid[-6:]}", "GET", f"{L}{tid}/", tokens=ops)
both("ledger as rider", "GET", L, tokens=rider, extra=CUR)
sys.exit(1 if summary() else 0)
