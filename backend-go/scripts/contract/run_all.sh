#!/usr/bin/env bash
# Run every contract suite (Django :8001 vs Go :8091); prints one line each.
cd "$(dirname "$0")"
../restart_go.sh >/dev/null
fail=0
for t in auth me profile users rbac coops_drivers accounts account_writes identity hubs battery_types batteries \
         vehicles finance pricing_plans subscriptions_discounts risk support operations config credit bay "$@"; do
  [ -f "$t.py" ] || continue
  ../restart_go.sh >/dev/null; python3 -c "import lib" >/dev/null 2>&1  # fresh throttles per suite
  full=$(python3 "$t.py" 2>&1)
  out=$(printf "%s\n" "$full" | tail -1)
  if [ "$t" = auth ]; then  # prints PASS/FAIL lines only
    n=$(printf "%s\n" "$full" | grep -c "^FAIL"); [ "$n" = 0 ] && out="all identical" || out="$n difference(s)"
  fi
  printf "%-26s %s\n" "$t" "$out"
  [ "$out" = "all identical" ] || fail=1
done
exit $fail
