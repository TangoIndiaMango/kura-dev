# Default model ordering (Django Meta)

Querysets without an explicit order_by() sort by the model's Meta.ordering.
`BaseModel` declares `ordering = ["-created_at"]`; models without their own
Meta inherit it. Go queries mirroring an un-ordered Django queryset must add
the same ORDER BY or ties / row order will differ. ("NONE" = no ordering:
Postgres plan order, keep the SQL shape identical.)

```
DailyHubMetric           ['-date']
DailyAccountMetric       ['-date']
MonthlyImpactMetric      ['-period']
ImpactStory              ['-created_at']
ReportJob                ['-created_at']
AuditEvent               ['-created_at']
MediaAsset               ['-created_at']
AuditEvent               ['-created_at']
QueuedTask               ['created_at']
ConfigVersion            ['-created_at']
CreditScore              ['-computed_at']
CreditLine               -created_at (inherited)
CreditApplication        ['-created_at']
Loan                     ['-created_at']
LoanRepayment            ['-created_at']
ProductOffer             ['-created_at']
OfferAssignment          ['-updated_at']
Segment                  ['-updated_at']
Wallet                   -created_at (inherited)
VirtualAccount           -created_at (inherited)
LedgerAccount            -created_at (inherited)
LedgerTransaction        -created_at (inherited)
LedgerEntry              -created_at (inherited)
Payment                  -created_at (inherited)
PspWebhookEvent          NONE
Notification             ['-created_at']
Shift                    -created_at (inherited)
Override                 -created_at (inherited)
Alert                    ['-created_at']
AlertRule                ['-created_at']
InventoryCount           ['-created_at']
CashDeposit              ['-created_at']
RiskRule                 ['code']
RiskEvent                ['-created_at']
RiskVelocityGrant        ['-created_at']
SupportCase              ['-created_at']
CaseEvent                ['created_at']
Account                  -created_at (inherited)
Consent                  ['-granted_at']
Cooperative              ['name']
TrustedDevice            ['-last_seen_at']
Driver                   -created_at (inherited)
IdentityDocument         ['-created_at']
OtpChallenge             NONE
Permission               ['module', 'code']
Role                     ['name']
StaffMembership          -created_at (inherited)
PasswordSetupToken       ['-created_at']
User                     -created_at (inherited)
VehicleAssignment        ['-starts_at', '-id']
Battery                  -created_at (inherited)
BatteryType              -created_at (inherited)
VehicleCommand           ['-created_at']
BatteryEvent             ['-occurred_at', '-id']
DiscountCampaign         ['-created_at']
DiscountRedemption       ['-created_at']
EBoarder                 ['-created_at']
PetrolEngine             ['-created_at']
Retrofit                 ['-created_at']
Hub                      -created_at (inherited)
Plan                     -created_at (inherited)
PriceMatrix              ['-effective_from', '-created_at']
BayHoldPolicy            NONE
Subscription             NONE
HubSlot                  ['slot_no']
Reservation              NONE
Swap                     NONE
TelemetryEvent           ['-recorded_at']
VehicleModel             NONE
Vehicle                  -created_at (inherited)
```
