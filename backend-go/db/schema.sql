--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_account (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kura_id character varying(30) NOT NULL,
    kind character varying(20) NOT NULL,
    display_name character varying(200) NOT NULL,
    status character varying(20) NOT NULL,
    kyc_status character varying(20) NOT NULL,
    owner_user_id uuid NOT NULL,
    registration_channel character varying(10) NOT NULL,
    psp character varying(20) NOT NULL,
    cooperative_id uuid,
    risk_status character varying(20) NOT NULL
);


--
-- Name: accounts_consent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_consent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    purpose character varying(20) NOT NULL,
    granted_at timestamp with time zone NOT NULL,
    withdrawn_at timestamp with time zone,
    channel character varying(10) NOT NULL,
    policy_version character varying(20) NOT NULL,
    account_id uuid NOT NULL
);


--
-- Name: accounts_cooperative; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_cooperative (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(200) NOT NULL,
    region character varying(100) NOT NULL,
    status character varying(20) NOT NULL,
    chairman_user_id uuid
);


--
-- Name: accounts_driver; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_driver (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    license_number character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    photo_id uuid,
    daily_spend_kobo_limit bigint,
    daily_swap_limit smallint,
    CONSTRAINT accounts_driver_daily_swap_limit_check CHECK ((daily_swap_limit >= 0))
);


--
-- Name: accounts_identitydocument; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_identitydocument (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    doc_type character varying(30) NOT NULL,
    number_encrypted text NOT NULL,
    number_last4 character varying(4) NOT NULL,
    status character varying(20) NOT NULL,
    verified_via character varying(20) NOT NULL,
    verified_at timestamp with time zone,
    reject_reason character varying(255) NOT NULL,
    account_id uuid NOT NULL,
    back_image_id uuid,
    front_image_id uuid,
    photos_requested boolean NOT NULL,
    request_note character varying(255) NOT NULL
);


--
-- Name: accounts_otpchallenge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_otpchallenge (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    phone character varying(30) NOT NULL,
    purpose character varying(20) NOT NULL,
    code_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts smallint NOT NULL,
    consumed_at timestamp with time zone,
    device_id character varying(64) NOT NULL,
    channel character varying(10) NOT NULL,
    CONSTRAINT accounts_otpchallenge_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: accounts_passwordsetuptoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_passwordsetuptoken (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    purpose character varying(20) NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    user_id uuid NOT NULL
);


--
-- Name: accounts_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_permission (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(150) NOT NULL,
    module character varying(80) NOT NULL,
    description character varying(255) NOT NULL
);


--
-- Name: accounts_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_role (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    description text NOT NULL,
    is_system boolean NOT NULL,
    is_active boolean NOT NULL
);


--
-- Name: accounts_role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_role_permissions (
    id bigint NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL
);


--
-- Name: accounts_role_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_role_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_role_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_staffmembership; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_staffmembership (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    role character varying(50) NOT NULL,
    hub_id character varying(100) NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: accounts_trusteddevice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_trusteddevice (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    device_key character varying(64) NOT NULL,
    label character varying(80) NOT NULL,
    user_agent character varying(255) NOT NULL,
    first_seen_at timestamp with time zone NOT NULL,
    last_seen_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL
);


--
-- Name: accounts_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user (
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    email character varying(254),
    phone character varying(30),
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    role character varying(50) NOT NULL,
    pin_hash character varying(255) NOT NULL,
    is_active boolean NOT NULL,
    is_staff boolean NOT NULL,
    assigned_role_id uuid,
    pin_failed_attempts smallint NOT NULL,
    pin_locked_until timestamp with time zone,
    onboarding_step character varying(20) NOT NULL,
    public_id character varying(30),
    avatar_id uuid,
    notification_prefs jsonb NOT NULL,
    session_version integer NOT NULL,
    CONSTRAINT accounts_user_pin_failed_attempts_check CHECK ((pin_failed_attempts >= 0)),
    CONSTRAINT accounts_user_session_version_check CHECK ((session_version >= 0))
);


--
-- Name: accounts_user_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user_groups (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    group_id integer NOT NULL
);


--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_user_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_user_user_permissions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.accounts_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.accounts_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analytics_dailyaccountmetric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_dailyaccountmetric (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    date date NOT NULL,
    swaps_completed integer NOT NULL,
    fuel_savings_kobo bigint NOT NULL,
    co2_kg_est numeric(12,3) NOT NULL,
    petrol_litres_avoided_est numeric(12,3) NOT NULL,
    inputs jsonb NOT NULL,
    account_id uuid NOT NULL,
    CONSTRAINT analytics_dailyaccountmetric_swaps_completed_check CHECK ((swaps_completed >= 0))
);


--
-- Name: analytics_dailyhubmetric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_dailyhubmetric (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    date date NOT NULL,
    swaps integer NOT NULL,
    revenue_kobo_by_channel jsonb NOT NULL,
    batteries_ready_avg numeric(8,2) NOT NULL,
    no_shows integer NOT NULL,
    overrides integer NOT NULL,
    inputs jsonb NOT NULL,
    hub_id uuid NOT NULL,
    CONSTRAINT analytics_dailyhubmetric_no_shows_check CHECK ((no_shows >= 0)),
    CONSTRAINT analytics_dailyhubmetric_overrides_check CHECK ((overrides >= 0)),
    CONSTRAINT analytics_dailyhubmetric_swaps_check CHECK ((swaps >= 0))
);


--
-- Name: analytics_impactstory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_impactstory (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    title character varying(160) NOT NULL,
    region character varying(80) NOT NULL,
    metric_highlight character varying(120) NOT NULL,
    partners character varying(200) NOT NULL,
    summary text NOT NULL,
    status character varying(16) NOT NULL,
    published_at timestamp with time zone,
    raw jsonb NOT NULL,
    created_by_id uuid
);


--
-- Name: analytics_monthlyimpactmetric; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_monthlyimpactmetric (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    period character varying(7) NOT NULL,
    operators_served integer NOT NULL,
    swaps integer NOT NULL,
    fuel_savings_kobo bigint NOT NULL,
    engines_replaced integer NOT NULL,
    co2_kg numeric(14,3) NOT NULL,
    inputs jsonb NOT NULL,
    CONSTRAINT analytics_monthlyimpactmetric_engines_replaced_check CHECK ((engines_replaced >= 0)),
    CONSTRAINT analytics_monthlyimpactmetric_operators_served_check CHECK ((operators_served >= 0)),
    CONSTRAINT analytics_monthlyimpactmetric_swaps_check CHECK ((swaps >= 0))
);


--
-- Name: analytics_reportjob; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_reportjob (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kind character varying(32) NOT NULL,
    params jsonb NOT NULL,
    status character varying(16) NOT NULL,
    file_public_id character varying(255) NOT NULL,
    expires_at timestamp with time zone,
    raw jsonb NOT NULL,
    requested_by_id uuid,
    idempotency_key character varying(64) NOT NULL
);


--
-- Name: audit_auditevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_auditevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    actor_email character varying(255) NOT NULL,
    actor_role character varying(50) NOT NULL,
    action character varying(100) NOT NULL,
    subject_type character varying(100) NOT NULL,
    subject_id character varying(100) NOT NULL,
    subject_label character varying(255) NOT NULL,
    before jsonb NOT NULL,
    after jsonb NOT NULL,
    metadata jsonb NOT NULL,
    ip_address inet,
    request_id character varying(64) NOT NULL,
    prev_hash character varying(64) NOT NULL,
    row_hash character varying(64) NOT NULL,
    actor_id uuid
);


--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: core_auditevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_auditevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    actor_email character varying(255) NOT NULL,
    action character varying(100) NOT NULL,
    target_model character varying(100) NOT NULL,
    target_id character varying(100) NOT NULL,
    metadata jsonb NOT NULL,
    ip_address inet
);


--
-- Name: core_configversion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_configversion (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    namespace character varying(40) NOT NULL,
    key character varying(80) NOT NULL,
    value jsonb NOT NULL,
    status character varying(20) NOT NULL,
    effective_from timestamp with time zone,
    note character varying(255) NOT NULL,
    approved_by_id uuid,
    created_by_id uuid
);


--
-- Name: core_mediaasset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_mediaasset (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    provider character varying(20) NOT NULL,
    storage_key character varying(512) NOT NULL,
    kind character varying(40) NOT NULL,
    content_type character varying(100) NOT NULL,
    resource_type character varying(20) NOT NULL,
    byte_size integer NOT NULL,
    width integer,
    height integer,
    original_filename character varying(255) NOT NULL,
    visibility character varying(20) NOT NULL,
    uploaded_by_id uuid,
    CONSTRAINT core_mediaasset_byte_size_check CHECK ((byte_size >= 0)),
    CONSTRAINT core_mediaasset_height_check CHECK ((height >= 0)),
    CONSTRAINT core_mediaasset_width_check CHECK ((width >= 0))
);


--
-- Name: core_queuedtask; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_queuedtask (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    result_id character varying(64) NOT NULL,
    task_path character varying(255) NOT NULL,
    args jsonb NOT NULL,
    kwargs jsonb NOT NULL,
    status character varying(20) NOT NULL,
    attempts smallint NOT NULL,
    error text NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    CONSTRAINT core_queuedtask_attempts_check CHECK ((attempts >= 0))
);


--
-- Name: credit_creditapplication; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_creditapplication (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    amount_kobo bigint NOT NULL,
    tenor_days smallint NOT NULL,
    interest_rate_bps integer NOT NULL,
    disbursement character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    decision_reason character varying(255) NOT NULL,
    idempotency_key character varying(64) NOT NULL,
    account_id uuid NOT NULL,
    decided_by_id uuid,
    credit_line_id uuid,
    CONSTRAINT credit_creditapplication_interest_rate_bps_check CHECK ((interest_rate_bps >= 0)),
    CONSTRAINT credit_creditapplication_tenor_days_check CHECK ((tenor_days >= 0))
);


--
-- Name: credit_creditline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_creditline (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    limit_kobo bigint NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    score_id uuid
);


--
-- Name: credit_creditscore; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_creditscore (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    score smallint NOT NULL,
    factors jsonb NOT NULL,
    recommended_limit_kobo bigint NOT NULL,
    version character varying(40) NOT NULL,
    computed_by character varying(20) NOT NULL,
    override_reason character varying(255) NOT NULL,
    computed_at timestamp with time zone NOT NULL,
    account_id uuid NOT NULL,
    override_by_id uuid,
    CONSTRAINT credit_creditscore_score_check CHECK ((score >= 0))
);


--
-- Name: credit_loan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_loan (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    principal_kobo bigint NOT NULL,
    interest_kobo bigint NOT NULL,
    total_due_kobo bigint NOT NULL,
    repaid_kobo bigint NOT NULL,
    daily_installment_kobo bigint NOT NULL,
    swap_credit_remaining_kobo bigint NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    due_at timestamp with time zone NOT NULL,
    grace_until timestamp with time zone,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    application_id uuid NOT NULL
);


--
-- Name: credit_loanrepayment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_loanrepayment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    amount_kobo bigint NOT NULL,
    kind character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    idempotency_key character varying(64) NOT NULL,
    loan_id uuid NOT NULL,
    payment_id uuid
);


--
-- Name: credit_offerassignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_offerassignment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    status character varying(20) NOT NULL,
    amount_kobo bigint,
    channel character varying(10) NOT NULL,
    account_id uuid NOT NULL,
    offer_id uuid NOT NULL
);


--
-- Name: credit_productoffer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_productoffer (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(120) NOT NULL,
    offer_type character varying(20) NOT NULL,
    summary character varying(255) NOT NULL,
    terms jsonb NOT NULL,
    segment_criteria jsonb NOT NULL,
    status character varying(20) NOT NULL
);


--
-- Name: credit_segment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_segment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(120) NOT NULL,
    criteria jsonb NOT NULL,
    status character varying(20) NOT NULL,
    last_count integer NOT NULL,
    last_evaluated_at timestamp with time zone,
    CONSTRAINT credit_segment_last_count_check CHECK ((last_count >= 0))
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id uuid NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


--
-- Name: finance_ledgeraccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_ledgeraccount (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(100) NOT NULL,
    account_type character varying(20) NOT NULL,
    balance_kobo bigint NOT NULL
);


--
-- Name: finance_ledgerentry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_ledgerentry (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    debit_kobo bigint NOT NULL,
    credit_kobo bigint NOT NULL,
    ledger_account_id uuid NOT NULL,
    transaction_id uuid NOT NULL
);


--
-- Name: finance_ledgertransaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_ledgertransaction (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kind character varying(30) NOT NULL,
    reference character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    posted_at timestamp with time zone NOT NULL
);


--
-- Name: finance_payment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_payment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    channel character varying(30) NOT NULL,
    amount_kobo bigint NOT NULL,
    vat_kobo bigint NOT NULL,
    receipt_code character varying(30) NOT NULL,
    status character varying(20) NOT NULL,
    purpose character varying(50) NOT NULL,
    account_id uuid NOT NULL,
    psp_reference character varying(120),
    idempotency_key character varying(64),
    hub_id uuid
);


--
-- Name: finance_virtualaccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_virtualaccount (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    nuban character varying(10),
    bank_name character varying(100) NOT NULL,
    account_name character varying(150) NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    psp_reference character varying(100) NOT NULL,
    last_attempt_at timestamp with time zone,
    last_error character varying(255) NOT NULL,
    next_attempt_at timestamp with time zone,
    provision_attempts smallint NOT NULL,
    CONSTRAINT finance_virtualaccount_provision_attempts_check CHECK ((provision_attempts >= 0))
);


--
-- Name: finance_wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_wallet (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    balance_kobo bigint NOT NULL,
    hold_kobo bigint NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL
);


--
-- Name: integrations_pspwebhookevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integrations_pspwebhookevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    psp character varying(20) NOT NULL,
    psp_event_id character varying(120) NOT NULL,
    event_kind character varying(40) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) NOT NULL,
    error character varying(255) NOT NULL
);


--
-- Name: mobility_battery; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_battery (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    serial character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    charge_pct integer NOT NULL,
    health_pct integer NOT NULL,
    cycle_count integer NOT NULL,
    battery_type_id uuid NOT NULL,
    current_hub_id uuid,
    custodian_id uuid,
    custodian_type character varying(20) NOT NULL,
    expected_return_by timestamp with time zone,
    issued_at timestamp with time zone,
    qr_secret character varying(64) NOT NULL,
    charge_source character varying(20) NOT NULL,
    manufactured_at date,
    charge_observed_at timestamp with time zone,
    CONSTRAINT mobility_battery_charge_pct_check CHECK ((charge_pct >= 0)),
    CONSTRAINT mobility_battery_cycle_count_check CHECK ((cycle_count >= 0)),
    CONSTRAINT mobility_battery_health_pct_check CHECK ((health_pct >= 0))
);


--
-- Name: mobility_batteryevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_batteryevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    event character varying(20) NOT NULL,
    from_custodian_type character varying(20) NOT NULL,
    from_custodian_id uuid,
    to_custodian_type character varying(20) NOT NULL,
    to_custodian_id uuid,
    charge_pct integer,
    meta jsonb NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    source character varying(20) NOT NULL,
    actor_id uuid,
    battery_id uuid NOT NULL,
    hub_id uuid,
    swap_id uuid,
    prev_hash character varying(64) NOT NULL,
    row_hash character varying(64) NOT NULL,
    CONSTRAINT mobility_batteryevent_charge_pct_check CHECK ((charge_pct >= 0))
);


--
-- Name: mobility_batterytype; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_batterytype (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(100) NOT NULL,
    manufacturer character varying(100) NOT NULL,
    capacity_kwh numeric(5,2) NOT NULL,
    nominal_voltage integer NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    approved_by_id uuid,
    created_by_id uuid,
    qr_scheme character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    usable_energy_wh integer NOT NULL,
    wh_per_km integer NOT NULL,
    CONSTRAINT mobility_batterytype_nominal_voltage_check CHECK ((nominal_voltage >= 0)),
    CONSTRAINT mobility_batterytype_usable_energy_wh_check CHECK ((usable_energy_wh >= 0)),
    CONSTRAINT mobility_batterytype_wh_per_km_check CHECK ((wh_per_km >= 0))
);


--
-- Name: mobility_bayholdpolicy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_bayholdpolicy (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    default_hold_minutes integer NOT NULL,
    max_extend_minutes integer NOT NULL,
    CONSTRAINT mobility_bayholdpolicy_default_hold_minutes_check CHECK ((default_hold_minutes >= 0)),
    CONSTRAINT mobility_bayholdpolicy_max_extend_minutes_check CHECK ((max_extend_minutes >= 0))
);


--
-- Name: mobility_discountcampaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_discountcampaign (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(120) NOT NULL,
    code character varying(40) NOT NULL,
    value_type character varying(10) NOT NULL,
    value integer NOT NULL,
    status character varying(20) NOT NULL,
    applies_to_all_plans boolean NOT NULL,
    plan_option_ids jsonb NOT NULL,
    periods jsonb NOT NULL,
    audience character varying(20) NOT NULL,
    fleet_min_vehicles integer,
    segment_id character varying(64) NOT NULL,
    channels character varying(80) NOT NULL,
    summary character varying(255) NOT NULL,
    max_redemptions integer,
    redemptions_count integer NOT NULL,
    max_per_account integer NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    approved_by_id uuid,
    created_by_id uuid,
    CONSTRAINT mobility_discountcampaign_fleet_min_vehicles_check CHECK ((fleet_min_vehicles >= 0)),
    CONSTRAINT mobility_discountcampaign_max_per_account_check CHECK ((max_per_account >= 0)),
    CONSTRAINT mobility_discountcampaign_max_redemptions_check CHECK ((max_redemptions >= 0)),
    CONSTRAINT mobility_discountcampaign_redemptions_count_check CHECK ((redemptions_count >= 0)),
    CONSTRAINT mobility_discountcampaign_value_check CHECK ((value >= 0))
);


--
-- Name: mobility_discountredemption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_discountredemption (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    list_price_kobo bigint NOT NULL,
    discount_kobo bigint NOT NULL,
    due_kobo bigint NOT NULL,
    channel character varying(20) NOT NULL,
    period character varying(20) NOT NULL,
    idempotency_key character varying(64),
    account_id uuid NOT NULL,
    discount_id uuid NOT NULL,
    payment_id uuid,
    subscription_id uuid
);


--
-- Name: mobility_eboarder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_eboarder (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    serial character varying(64) NOT NULL,
    make character varying(80) NOT NULL,
    model character varying(80) NOT NULL,
    rated_watts integer NOT NULL,
    petrol_hp_equivalent character varying(20) NOT NULL,
    nominal_voltage_v smallint NOT NULL,
    shaft_length character varying(16) NOT NULL,
    status character varying(20) NOT NULL,
    issued_at timestamp with time zone,
    raw jsonb NOT NULL,
    account_id uuid,
    battery_type_id uuid NOT NULL,
    current_hub_id uuid,
    vehicle_id uuid,
    CONSTRAINT mobility_eboarder_nominal_voltage_v_check CHECK ((nominal_voltage_v >= 0)),
    CONSTRAINT mobility_eboarder_rated_watts_check CHECK ((rated_watts >= 0))
);


--
-- Name: mobility_hub; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_hub (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(150) NOT NULL,
    address character varying(255) NOT NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    slot_count integer NOT NULL,
    solar_capacity_kw numeric(5,2) NOT NULL,
    status character varying(20) NOT NULL,
    last_sync_at timestamp with time zone,
    operating_hours jsonb NOT NULL,
    timezone character varying(64) NOT NULL,
    CONSTRAINT mobility_hub_slot_count_check CHECK ((slot_count >= 0))
);


--
-- Name: mobility_hubslot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_hubslot (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    slot_no integer NOT NULL,
    state character varying(20) NOT NULL,
    battery_id uuid,
    hub_id uuid NOT NULL,
    CONSTRAINT mobility_hubslot_slot_no_check CHECK ((slot_no >= 0))
);


--
-- Name: mobility_petrolengine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_petrolengine (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    tag character varying(40) NOT NULL,
    make character varying(80) NOT NULL,
    model character varying(80) NOT NULL,
    hp character varying(20) NOT NULL,
    condition_grade character varying(20) NOT NULL,
    intake_photos jsonb NOT NULL,
    status character varying(24) NOT NULL,
    intake_signature character varying(255) NOT NULL,
    released_at timestamp with time zone,
    release_photos jsonb NOT NULL,
    raw jsonb NOT NULL,
    account_id uuid NOT NULL,
    intake_agent_id uuid,
    intake_witness_id uuid,
    release_by_id uuid,
    storage_hub_id uuid,
    release_signature character varying(255) NOT NULL
);


--
-- Name: mobility_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_plan (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    duration_days integer,
    swap_allowance integer,
    price_kobo bigint NOT NULL,
    is_active boolean NOT NULL,
    auto_renew_default boolean NOT NULL,
    description text NOT NULL,
    period character varying(10) NOT NULL,
    status character varying(20) NOT NULL,
    CONSTRAINT mobility_plan_duration_days_check CHECK ((duration_days >= 0)),
    CONSTRAINT mobility_plan_swap_allowance_check CHECK ((swap_allowance >= 0))
);


--
-- Name: mobility_pricematrix; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_pricematrix (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    daily_kobo bigint NOT NULL,
    weekly_kobo bigint NOT NULL,
    monthly_kobo bigint NOT NULL,
    pay_per_swap_kobo bigint NOT NULL,
    effective_from date NOT NULL,
    status character varying(20) NOT NULL,
    approved_by_id uuid,
    created_by_id uuid
);


--
-- Name: mobility_reservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_reservation (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    payment_mode character varying(20) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    account_id uuid NOT NULL,
    battery_id uuid,
    driver_id uuid NOT NULL,
    hub_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    hold_amount_kobo bigint NOT NULL,
    token_hash character varying(64) NOT NULL,
    source character varying(20) NOT NULL,
    token_ciphertext text NOT NULL,
    list_price_kobo bigint NOT NULL,
    discount_code character varying(40) NOT NULL,
    discount_kobo bigint NOT NULL
);


--
-- Name: mobility_retrofit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_retrofit (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    eboarder_serial character varying(64) NOT NULL,
    checklist jsonb NOT NULL,
    status character varying(20) NOT NULL,
    photos jsonb NOT NULL,
    activated_at timestamp with time zone,
    raw jsonb NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid,
    petrol_engine_id uuid,
    vehicle_id uuid NOT NULL,
    eboarder_id uuid
);


--
-- Name: mobility_subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_subscription (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    swaps_used integer NOT NULL,
    swaps_allowance integer,
    status character varying(20) NOT NULL,
    auto_renew boolean NOT NULL,
    account_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    amount_kobo bigint NOT NULL,
    discount_code character varying(40) NOT NULL,
    discount_kobo bigint NOT NULL,
    idempotency_key character varying(64),
    list_price_kobo bigint NOT NULL,
    payment_id uuid,
    queued_plan_id uuid,
    CONSTRAINT mobility_subscription_swaps_allowance_check CHECK ((swaps_allowance >= 0)),
    CONSTRAINT mobility_subscription_swaps_used_check CHECK ((swaps_used >= 0))
);


--
-- Name: mobility_swap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_swap (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    returned_charge_pct integer NOT NULL,
    issued_charge_pct integer NOT NULL,
    payment_mode character varying(20) NOT NULL,
    amount_kobo bigint NOT NULL,
    vat_kobo bigint NOT NULL,
    mismatch_flag boolean NOT NULL,
    status character varying(20) NOT NULL,
    client_event_id character varying(100) NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid,
    driver_id uuid NOT NULL,
    hub_id uuid NOT NULL,
    issued_battery_id uuid,
    reservation_id uuid,
    returned_battery_id uuid,
    vehicle_id uuid NOT NULL,
    source character varying(20) NOT NULL,
    completed_at timestamp with time zone,
    mismatch_reason character varying(40) NOT NULL,
    started_at timestamp with time zone,
    payment_id uuid,
    subscription_id uuid,
    CONSTRAINT mobility_swap_issued_charge_pct_check CHECK ((issued_charge_pct >= 0)),
    CONSTRAINT mobility_swap_returned_charge_pct_check CHECK ((returned_charge_pct >= 0))
);


--
-- Name: mobility_telemetryevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_telemetryevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    recorded_at timestamp with time zone NOT NULL,
    battery_pct smallint,
    lat double precision,
    lng double precision,
    speed_kmh double precision,
    odometer_km double precision,
    source character varying(12) NOT NULL,
    ingest_batch character varying(64) NOT NULL,
    raw jsonb NOT NULL,
    battery_id uuid,
    vehicle_id uuid NOT NULL,
    CONSTRAINT mobility_telemetryevent_battery_pct_check CHECK ((battery_pct >= 0))
);


--
-- Name: mobility_vehicle; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_vehicle (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    registration_plate character varying(30) NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    current_battery_id uuid,
    vehicle_model_id uuid NOT NULL,
    qr_secret character varying(64) NOT NULL,
    hardware_id character varying(64),
    vin character varying(32) NOT NULL,
    acquisition_path character varying(20) NOT NULL,
    petrol_engine_id uuid,
    iot_api_key_hash character varying(64) NOT NULL,
    assigned_driver_id uuid
);


--
-- Name: mobility_vehicleassignment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_vehicleassignment (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone,
    note character varying(255) NOT NULL,
    driver_id uuid NOT NULL,
    vehicle_id uuid NOT NULL
);


--
-- Name: mobility_vehiclecommand; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_vehiclecommand (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kind character varying(32) NOT NULL,
    status character varying(20) NOT NULL,
    note character varying(255) NOT NULL,
    error character varying(255) NOT NULL,
    acked_at timestamp with time zone,
    requested_by_id uuid,
    vehicle_id uuid NOT NULL
);


--
-- Name: mobility_vehiclemodel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mobility_vehiclemodel (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    make character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    vehicle_type character varying(50) NOT NULL,
    battery_type_id uuid NOT NULL,
    service_interval_days integer,
    service_interval_km integer,
    CONSTRAINT mobility_vehiclemodel_service_interval_days_check CHECK ((service_interval_days >= 0)),
    CONSTRAINT mobility_vehiclemodel_service_interval_km_check CHECK ((service_interval_km >= 0))
);


--
-- Name: notifications_notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications_notification (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    channel character varying(20) NOT NULL,
    template_code character varying(80) NOT NULL,
    title character varying(200) NOT NULL,
    body text NOT NULL,
    severity character varying(20) NOT NULL,
    source character varying(80) NOT NULL,
    status character varying(20) NOT NULL,
    params jsonb NOT NULL,
    link_path character varying(255) NOT NULL,
    dedupe_key character varying(120) NOT NULL,
    read_at timestamp with time zone,
    provider_ref character varying(120) NOT NULL,
    user_id uuid NOT NULL
);


--
-- Name: operations_alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_alert (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kind character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    is_resolved boolean NOT NULL,
    resolved_at timestamp with time zone,
    hub_id uuid,
    acknowledged_at timestamp with time zone,
    acknowledged_by_id uuid,
    delivery_channel character varying(40) NOT NULL,
    resolve_note text NOT NULL,
    resolved_by_id uuid,
    status character varying(20) NOT NULL
);


--
-- Name: operations_alertrule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_alertrule (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    name character varying(120) NOT NULL,
    kind character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    threshold jsonb NOT NULL,
    channels jsonb NOT NULL,
    cooldown_minutes integer NOT NULL,
    status character varying(20) NOT NULL,
    created_by_id uuid,
    CONSTRAINT operations_alertrule_cooldown_minutes_check CHECK ((cooldown_minutes >= 0))
);


--
-- Name: operations_cashdeposit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_cashdeposit (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    amount_kobo bigint NOT NULL,
    psp_agent_ref character varying(120) NOT NULL,
    receipt_code character varying(30) NOT NULL,
    status character varying(20) NOT NULL,
    account_id uuid NOT NULL,
    agent_id uuid NOT NULL,
    hub_id uuid NOT NULL,
    payment_id uuid,
    shift_id uuid NOT NULL,
    idempotency_key character varying(64),
    purpose character varying(20) NOT NULL
);


--
-- Name: operations_inventorycount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_inventorycount (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    counted jsonb NOT NULL,
    expected jsonb NOT NULL,
    variance jsonb NOT NULL,
    note character varying(255) NOT NULL,
    hub_id uuid NOT NULL,
    shift_id uuid,
    signed_by_id uuid
);


--
-- Name: operations_override; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_override (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    reason character varying(50) NOT NULL,
    note text NOT NULL,
    agent_id uuid NOT NULL,
    swap_id uuid
);


--
-- Name: operations_shift; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations_shift (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    opened_at timestamp with time zone NOT NULL,
    closed_at timestamp with time zone,
    opening_cash_kobo bigint NOT NULL,
    closing_cash_kobo bigint,
    status character varying(20) NOT NULL,
    agent_id uuid NOT NULL,
    hub_id uuid NOT NULL,
    expected_cash_kobo bigint,
    variance_kobo bigint,
    lodge_ref character varying(100) NOT NULL,
    lodged_amount_kobo bigint,
    lodged_at timestamp with time zone,
    auto_closed boolean NOT NULL
);


--
-- Name: risk_riskevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_riskevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    subject_type character varying(40) NOT NULL,
    subject_id character varying(64) NOT NULL,
    severity character varying(20) NOT NULL,
    score integer NOT NULL,
    context jsonb NOT NULL,
    action_taken character varying(40) NOT NULL,
    status character varying(20) NOT NULL,
    review_note text NOT NULL,
    account_id uuid,
    reviewed_by_id uuid,
    rule_id uuid NOT NULL,
    CONSTRAINT risk_riskevent_score_check CHECK ((score >= 0))
);


--
-- Name: risk_riskrule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_riskrule (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(60) NOT NULL,
    name character varying(150) NOT NULL,
    severity character varying(20) NOT NULL,
    params jsonb NOT NULL,
    action character varying(20) NOT NULL,
    enabled boolean NOT NULL
);


--
-- Name: risk_riskvelocitygrant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_riskvelocitygrant (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    vehicle_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    max_uses smallint NOT NULL,
    uses_remaining smallint NOT NULL,
    status character varying(20) NOT NULL,
    note text NOT NULL,
    account_id uuid,
    granted_by_id uuid NOT NULL,
    risk_event_id uuid NOT NULL,
    CONSTRAINT risk_riskvelocitygrant_max_uses_check CHECK ((max_uses >= 0)),
    CONSTRAINT risk_riskvelocitygrant_uses_remaining_check CHECK ((uses_remaining >= 0))
);


--
-- Name: support_caseevent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_caseevent (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    kind character varying(20) NOT NULL,
    body text NOT NULL,
    actor_id uuid,
    case_id uuid NOT NULL,
    attachment_id uuid
);


--
-- Name: support_supportcase; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_supportcase (
    id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    code character varying(24) NOT NULL,
    kind character varying(30) NOT NULL,
    priority character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    subject character varying(200) NOT NULL,
    sla_due_at timestamp with time zone,
    account_id uuid NOT NULL,
    assigned_to_id uuid,
    driver_id uuid,
    opened_by_id uuid,
    payment_id uuid
);


--
-- Name: token_blacklist_blacklistedtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_blacklistedtoken (
    id bigint NOT NULL,
    blacklisted_at timestamp with time zone NOT NULL,
    token_id bigint NOT NULL
);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_blacklistedtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_blacklistedtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: token_blacklist_outstandingtoken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.token_blacklist_outstandingtoken (
    id bigint NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    user_id uuid,
    jti character varying(255) NOT NULL
);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.token_blacklist_outstandingtoken ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.token_blacklist_outstandingtoken_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: accounts_account accounts_account_kura_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_account
    ADD CONSTRAINT accounts_account_kura_id_key UNIQUE (kura_id);


--
-- Name: accounts_account accounts_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_account
    ADD CONSTRAINT accounts_account_pkey PRIMARY KEY (id);


--
-- Name: accounts_consent accounts_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_consent
    ADD CONSTRAINT accounts_consent_pkey PRIMARY KEY (id);


--
-- Name: accounts_cooperative accounts_cooperative_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_cooperative
    ADD CONSTRAINT accounts_cooperative_pkey PRIMARY KEY (id);


--
-- Name: accounts_driver accounts_driver_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_driver
    ADD CONSTRAINT accounts_driver_pkey PRIMARY KEY (id);


--
-- Name: accounts_driver accounts_driver_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_driver
    ADD CONSTRAINT accounts_driver_user_id_key UNIQUE (user_id);


--
-- Name: accounts_identitydocument accounts_identitydocument_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_identitydocument
    ADD CONSTRAINT accounts_identitydocument_pkey PRIMARY KEY (id);


--
-- Name: accounts_otpchallenge accounts_otpchallenge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_otpchallenge
    ADD CONSTRAINT accounts_otpchallenge_pkey PRIMARY KEY (id);


--
-- Name: accounts_passwordsetuptoken accounts_passwordsetuptoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_passwordsetuptoken
    ADD CONSTRAINT accounts_passwordsetuptoken_pkey PRIMARY KEY (id);


--
-- Name: accounts_passwordsetuptoken accounts_passwordsetuptoken_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_passwordsetuptoken
    ADD CONSTRAINT accounts_passwordsetuptoken_token_hash_key UNIQUE (token_hash);


--
-- Name: accounts_permission accounts_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_permission
    ADD CONSTRAINT accounts_permission_code_key UNIQUE (code);


--
-- Name: accounts_permission accounts_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_permission
    ADD CONSTRAINT accounts_permission_pkey PRIMARY KEY (id);


--
-- Name: accounts_role accounts_role_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role
    ADD CONSTRAINT accounts_role_code_key UNIQUE (code);


--
-- Name: accounts_role_permissions accounts_role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role_permissions
    ADD CONSTRAINT accounts_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: accounts_role_permissions accounts_role_permissions_role_id_permission_id_032c715e_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role_permissions
    ADD CONSTRAINT accounts_role_permissions_role_id_permission_id_032c715e_uniq UNIQUE (role_id, permission_id);


--
-- Name: accounts_role accounts_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role
    ADD CONSTRAINT accounts_role_pkey PRIMARY KEY (id);


--
-- Name: accounts_staffmembership accounts_staffmembership_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_staffmembership
    ADD CONSTRAINT accounts_staffmembership_pkey PRIMARY KEY (id);


--
-- Name: accounts_trusteddevice accounts_trusteddevice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_trusteddevice
    ADD CONSTRAINT accounts_trusteddevice_pkey PRIMARY KEY (id);


--
-- Name: accounts_user accounts_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_email_key UNIQUE (email);


--
-- Name: accounts_user_groups accounts_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_pkey PRIMARY KEY (id);


--
-- Name: accounts_user_groups accounts_user_groups_user_id_group_id_59c0b32f_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_group_id_59c0b32f_uniq UNIQUE (user_id, group_id);


--
-- Name: accounts_user accounts_user_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_phone_key UNIQUE (phone);


--
-- Name: accounts_user accounts_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_pkey PRIMARY KEY (id);


--
-- Name: accounts_user accounts_user_public_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_public_id_key UNIQUE (public_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permi_user_id_permission_id_2ab516c2_uniq UNIQUE (user_id, permission_id);


--
-- Name: accounts_user_user_permissions accounts_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: analytics_dailyaccountmetric analytics_dailyaccountmetric_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyaccountmetric
    ADD CONSTRAINT analytics_dailyaccountmetric_pkey PRIMARY KEY (id);


--
-- Name: analytics_dailyhubmetric analytics_dailyhubmetric_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyhubmetric
    ADD CONSTRAINT analytics_dailyhubmetric_pkey PRIMARY KEY (id);


--
-- Name: analytics_impactstory analytics_impactstory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_impactstory
    ADD CONSTRAINT analytics_impactstory_pkey PRIMARY KEY (id);


--
-- Name: analytics_monthlyimpactmetric analytics_monthlyimpactmetric_period_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_monthlyimpactmetric
    ADD CONSTRAINT analytics_monthlyimpactmetric_period_key UNIQUE (period);


--
-- Name: analytics_monthlyimpactmetric analytics_monthlyimpactmetric_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_monthlyimpactmetric
    ADD CONSTRAINT analytics_monthlyimpactmetric_pkey PRIMARY KEY (id);


--
-- Name: analytics_reportjob analytics_reportjob_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_reportjob
    ADD CONSTRAINT analytics_reportjob_pkey PRIMARY KEY (id);


--
-- Name: audit_auditevent audit_auditevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_auditevent
    ADD CONSTRAINT audit_auditevent_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: core_auditevent core_auditevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_auditevent
    ADD CONSTRAINT core_auditevent_pkey PRIMARY KEY (id);


--
-- Name: core_configversion core_configversion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_configversion
    ADD CONSTRAINT core_configversion_pkey PRIMARY KEY (id);


--
-- Name: core_mediaasset core_mediaasset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_mediaasset
    ADD CONSTRAINT core_mediaasset_pkey PRIMARY KEY (id);


--
-- Name: core_queuedtask core_queuedtask_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_queuedtask
    ADD CONSTRAINT core_queuedtask_pkey PRIMARY KEY (id);


--
-- Name: core_queuedtask core_queuedtask_result_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_queuedtask
    ADD CONSTRAINT core_queuedtask_result_id_key UNIQUE (result_id);


--
-- Name: credit_creditapplication credit_creditapplication_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditapplication
    ADD CONSTRAINT credit_creditapplication_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: credit_creditapplication credit_creditapplication_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditapplication
    ADD CONSTRAINT credit_creditapplication_pkey PRIMARY KEY (id);


--
-- Name: credit_creditline credit_creditline_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditline
    ADD CONSTRAINT credit_creditline_account_id_key UNIQUE (account_id);


--
-- Name: credit_creditline credit_creditline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditline
    ADD CONSTRAINT credit_creditline_pkey PRIMARY KEY (id);


--
-- Name: credit_creditscore credit_creditscore_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditscore
    ADD CONSTRAINT credit_creditscore_pkey PRIMARY KEY (id);


--
-- Name: credit_loan credit_loan_application_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loan
    ADD CONSTRAINT credit_loan_application_id_key UNIQUE (application_id);


--
-- Name: credit_loan credit_loan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loan
    ADD CONSTRAINT credit_loan_pkey PRIMARY KEY (id);


--
-- Name: credit_loanrepayment credit_loanrepayment_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loanrepayment
    ADD CONSTRAINT credit_loanrepayment_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: credit_loanrepayment credit_loanrepayment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loanrepayment
    ADD CONSTRAINT credit_loanrepayment_pkey PRIMARY KEY (id);


--
-- Name: credit_offerassignment credit_offerassignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_offerassignment
    ADD CONSTRAINT credit_offerassignment_pkey PRIMARY KEY (id);


--
-- Name: credit_productoffer credit_productoffer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_productoffer
    ADD CONSTRAINT credit_productoffer_pkey PRIMARY KEY (id);


--
-- Name: credit_segment credit_segment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_segment
    ADD CONSTRAINT credit_segment_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: finance_ledgeraccount finance_ledgeraccount_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgeraccount
    ADD CONSTRAINT finance_ledgeraccount_code_key UNIQUE (code);


--
-- Name: finance_ledgeraccount finance_ledgeraccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgeraccount
    ADD CONSTRAINT finance_ledgeraccount_pkey PRIMARY KEY (id);


--
-- Name: finance_ledgerentry finance_ledgerentry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgerentry
    ADD CONSTRAINT finance_ledgerentry_pkey PRIMARY KEY (id);


--
-- Name: finance_ledgertransaction finance_ledgertransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgertransaction
    ADD CONSTRAINT finance_ledgertransaction_pkey PRIMARY KEY (id);


--
-- Name: finance_ledgertransaction finance_ledgertransaction_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgertransaction
    ADD CONSTRAINT finance_ledgertransaction_reference_key UNIQUE (reference);


--
-- Name: finance_payment finance_payment_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: finance_payment finance_payment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_pkey PRIMARY KEY (id);


--
-- Name: finance_payment finance_payment_psp_reference_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_psp_reference_key UNIQUE (psp_reference);


--
-- Name: finance_payment finance_payment_receipt_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_receipt_code_key UNIQUE (receipt_code);


--
-- Name: finance_virtualaccount finance_virtualaccount_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_virtualaccount
    ADD CONSTRAINT finance_virtualaccount_account_id_key UNIQUE (account_id);


--
-- Name: finance_virtualaccount finance_virtualaccount_nuban_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_virtualaccount
    ADD CONSTRAINT finance_virtualaccount_nuban_key UNIQUE (nuban);


--
-- Name: finance_virtualaccount finance_virtualaccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_virtualaccount
    ADD CONSTRAINT finance_virtualaccount_pkey PRIMARY KEY (id);


--
-- Name: finance_wallet finance_wallet_account_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_wallet
    ADD CONSTRAINT finance_wallet_account_id_key UNIQUE (account_id);


--
-- Name: finance_wallet finance_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_wallet
    ADD CONSTRAINT finance_wallet_pkey PRIMARY KEY (id);


--
-- Name: integrations_pspwebhookevent integrations_pspwebhookevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations_pspwebhookevent
    ADD CONSTRAINT integrations_pspwebhookevent_pkey PRIMARY KEY (id);


--
-- Name: mobility_battery mobility_battery_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_battery
    ADD CONSTRAINT mobility_battery_pkey PRIMARY KEY (id);


--
-- Name: mobility_battery mobility_battery_serial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_battery
    ADD CONSTRAINT mobility_battery_serial_key UNIQUE (serial);


--
-- Name: mobility_batteryevent mobility_batteryevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batteryevent
    ADD CONSTRAINT mobility_batteryevent_pkey PRIMARY KEY (id);


--
-- Name: mobility_batterytype mobility_batterytype_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batterytype
    ADD CONSTRAINT mobility_batterytype_pkey PRIMARY KEY (id);


--
-- Name: mobility_bayholdpolicy mobility_bayholdpolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_bayholdpolicy
    ADD CONSTRAINT mobility_bayholdpolicy_pkey PRIMARY KEY (id);


--
-- Name: mobility_discountcampaign mobility_discountcampaign_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountcampaign
    ADD CONSTRAINT mobility_discountcampaign_code_key UNIQUE (code);


--
-- Name: mobility_discountcampaign mobility_discountcampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountcampaign
    ADD CONSTRAINT mobility_discountcampaign_pkey PRIMARY KEY (id);


--
-- Name: mobility_discountredemption mobility_discountredemption_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountredemption_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: mobility_discountredemption mobility_discountredemption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountredemption_pkey PRIMARY KEY (id);


--
-- Name: mobility_eboarder mobility_eboarder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_pkey PRIMARY KEY (id);


--
-- Name: mobility_eboarder mobility_eboarder_serial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_serial_key UNIQUE (serial);


--
-- Name: mobility_eboarder mobility_eboarder_vehicle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_vehicle_id_key UNIQUE (vehicle_id);


--
-- Name: mobility_hub mobility_hub_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hub
    ADD CONSTRAINT mobility_hub_code_key UNIQUE (code);


--
-- Name: mobility_hub mobility_hub_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hub
    ADD CONSTRAINT mobility_hub_pkey PRIMARY KEY (id);


--
-- Name: mobility_hubslot mobility_hubslot_battery_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hubslot
    ADD CONSTRAINT mobility_hubslot_battery_id_key UNIQUE (battery_id);


--
-- Name: mobility_hubslot mobility_hubslot_hub_id_slot_no_3cd12b27_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hubslot
    ADD CONSTRAINT mobility_hubslot_hub_id_slot_no_3cd12b27_uniq UNIQUE (hub_id, slot_no);


--
-- Name: mobility_hubslot mobility_hubslot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hubslot
    ADD CONSTRAINT mobility_hubslot_pkey PRIMARY KEY (id);


--
-- Name: mobility_petrolengine mobility_petrolengine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengine_pkey PRIMARY KEY (id);


--
-- Name: mobility_petrolengine mobility_petrolengine_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengine_tag_key UNIQUE (tag);


--
-- Name: mobility_plan mobility_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_plan
    ADD CONSTRAINT mobility_plan_code_key UNIQUE (code);


--
-- Name: mobility_plan mobility_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_plan
    ADD CONSTRAINT mobility_plan_pkey PRIMARY KEY (id);


--
-- Name: mobility_pricematrix mobility_pricematrix_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_pricematrix
    ADD CONSTRAINT mobility_pricematrix_pkey PRIMARY KEY (id);


--
-- Name: mobility_reservation mobility_reservation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_code_key UNIQUE (code);


--
-- Name: mobility_reservation mobility_reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_pkey PRIMARY KEY (id);


--
-- Name: mobility_retrofit mobility_retrofit_petrol_engine_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_petrol_engine_id_key UNIQUE (petrol_engine_id);


--
-- Name: mobility_retrofit mobility_retrofit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_pkey PRIMARY KEY (id);


--
-- Name: mobility_subscription mobility_subscription_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscription_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: mobility_subscription mobility_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscription_pkey PRIMARY KEY (id);


--
-- Name: mobility_swap mobility_swap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_pkey PRIMARY KEY (id);


--
-- Name: mobility_swap mobility_swap_reservation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_reservation_id_key UNIQUE (reservation_id);


--
-- Name: mobility_telemetryevent mobility_telemetryevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_telemetryevent
    ADD CONSTRAINT mobility_telemetryevent_pkey PRIMARY KEY (id);


--
-- Name: mobility_vehicle mobility_vehicle_current_battery_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_current_battery_id_key UNIQUE (current_battery_id);


--
-- Name: mobility_vehicle mobility_vehicle_hardware_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_hardware_id_key UNIQUE (hardware_id);


--
-- Name: mobility_vehicle mobility_vehicle_petrol_engine_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_petrol_engine_id_key UNIQUE (petrol_engine_id);


--
-- Name: mobility_vehicle mobility_vehicle_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_pkey PRIMARY KEY (id);


--
-- Name: mobility_vehicle mobility_vehicle_registration_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_registration_plate_key UNIQUE (registration_plate);


--
-- Name: mobility_vehicleassignment mobility_vehicleassignment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicleassignment
    ADD CONSTRAINT mobility_vehicleassignment_pkey PRIMARY KEY (id);


--
-- Name: mobility_vehiclecommand mobility_vehiclecommand_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclecommand
    ADD CONSTRAINT mobility_vehiclecommand_pkey PRIMARY KEY (id);


--
-- Name: mobility_vehiclemodel mobility_vehiclemodel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclemodel
    ADD CONSTRAINT mobility_vehiclemodel_pkey PRIMARY KEY (id);


--
-- Name: notifications_notification notifications_notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_notification
    ADD CONSTRAINT notifications_notification_pkey PRIMARY KEY (id);


--
-- Name: operations_alert operations_alert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alert
    ADD CONSTRAINT operations_alert_pkey PRIMARY KEY (id);


--
-- Name: operations_alertrule operations_alertrule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alertrule
    ADD CONSTRAINT operations_alertrule_pkey PRIMARY KEY (id);


--
-- Name: operations_cashdeposit operations_cashdeposit_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: operations_cashdeposit operations_cashdeposit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_pkey PRIMARY KEY (id);


--
-- Name: operations_cashdeposit operations_cashdeposit_receipt_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_receipt_code_key UNIQUE (receipt_code);


--
-- Name: operations_inventorycount operations_inventorycount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_inventorycount
    ADD CONSTRAINT operations_inventorycount_pkey PRIMARY KEY (id);


--
-- Name: operations_override operations_override_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_override
    ADD CONSTRAINT operations_override_pkey PRIMARY KEY (id);


--
-- Name: operations_override operations_override_swap_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_override
    ADD CONSTRAINT operations_override_swap_id_key UNIQUE (swap_id);


--
-- Name: operations_shift operations_shift_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_shift
    ADD CONSTRAINT operations_shift_pkey PRIMARY KEY (id);


--
-- Name: risk_riskevent risk_riskevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskevent
    ADD CONSTRAINT risk_riskevent_pkey PRIMARY KEY (id);


--
-- Name: risk_riskrule risk_riskrule_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskrule
    ADD CONSTRAINT risk_riskrule_code_key UNIQUE (code);


--
-- Name: risk_riskrule risk_riskrule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskrule
    ADD CONSTRAINT risk_riskrule_pkey PRIMARY KEY (id);


--
-- Name: risk_riskvelocitygrant risk_riskvelocitygrant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskvelocitygrant
    ADD CONSTRAINT risk_riskvelocitygrant_pkey PRIMARY KEY (id);


--
-- Name: support_caseevent support_caseevent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_caseevent
    ADD CONSTRAINT support_caseevent_pkey PRIMARY KEY (id);


--
-- Name: support_supportcase support_supportcase_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_code_key UNIQUE (code);


--
-- Name: support_supportcase support_supportcase_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_pkey PRIMARY KEY (id);


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_key UNIQUE (token_id);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_uniq UNIQUE (jti);


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outstandingtoken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outstandingtoken_pkey PRIMARY KEY (id);


--
-- Name: analytics_dailyaccountmetric uniq_daily_account_metric; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyaccountmetric
    ADD CONSTRAINT uniq_daily_account_metric UNIQUE (account_id, date);


--
-- Name: analytics_dailyhubmetric uniq_daily_hub_metric; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyhubmetric
    ADD CONSTRAINT uniq_daily_hub_metric UNIQUE (hub_id, date);


--
-- Name: core_mediaasset uniq_media_provider_storage_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_mediaasset
    ADD CONSTRAINT uniq_media_provider_storage_key UNIQUE (provider, storage_key);


--
-- Name: credit_offerassignment uniq_offer_assignment_account_offer; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_offerassignment
    ADD CONSTRAINT uniq_offer_assignment_account_offer UNIQUE (account_id, offer_id);


--
-- Name: integrations_pspwebhookevent uniq_psp_webhook_event; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integrations_pspwebhookevent
    ADD CONSTRAINT uniq_psp_webhook_event UNIQUE (psp, psp_event_id);


--
-- Name: accounts_trusteddevice uniq_trusted_device_account_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_trusteddevice
    ADD CONSTRAINT uniq_trusted_device_account_key UNIQUE (account_id, device_key);


--
-- Name: mobility_vehiclemodel uniq_vehicle_model_make_model; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclemodel
    ADD CONSTRAINT uniq_vehicle_model_make_model UNIQUE (make, model);


--
-- Name: accounts_account_cooperative_id_fc5ead08; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_cooperative_id_fc5ead08 ON public.accounts_account USING btree (cooperative_id);


--
-- Name: accounts_account_created_at_20e76208; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_created_at_20e76208 ON public.accounts_account USING btree (created_at);


--
-- Name: accounts_account_kura_id_77f9fc2b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_kura_id_77f9fc2b_like ON public.accounts_account USING btree (kura_id varchar_pattern_ops);


--
-- Name: accounts_account_owner_user_id_3134924b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_owner_user_id_3134924b ON public.accounts_account USING btree (owner_user_id);


--
-- Name: accounts_account_psp_b812c76c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_psp_b812c76c ON public.accounts_account USING btree (psp);


--
-- Name: accounts_account_psp_b812c76c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_psp_b812c76c_like ON public.accounts_account USING btree (psp varchar_pattern_ops);


--
-- Name: accounts_account_registration_channel_fe083035; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_registration_channel_fe083035 ON public.accounts_account USING btree (registration_channel);


--
-- Name: accounts_account_registration_channel_fe083035_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_registration_channel_fe083035_like ON public.accounts_account USING btree (registration_channel varchar_pattern_ops);


--
-- Name: accounts_account_risk_status_ba50bae3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_risk_status_ba50bae3 ON public.accounts_account USING btree (risk_status);


--
-- Name: accounts_account_risk_status_ba50bae3_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_account_risk_status_ba50bae3_like ON public.accounts_account USING btree (risk_status varchar_pattern_ops);


--
-- Name: accounts_co_purpose_ef9302_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_co_purpose_ef9302_idx ON public.accounts_consent USING btree (purpose, withdrawn_at);


--
-- Name: accounts_consent_account_id_80eeeb4e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_consent_account_id_80eeeb4e ON public.accounts_consent USING btree (account_id);


--
-- Name: accounts_consent_created_at_6f7c4be5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_consent_created_at_6f7c4be5 ON public.accounts_consent USING btree (created_at);


--
-- Name: accounts_cooperative_chairman_user_id_7a759ed5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_cooperative_chairman_user_id_7a759ed5 ON public.accounts_cooperative USING btree (chairman_user_id);


--
-- Name: accounts_cooperative_created_at_5b54af39; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_cooperative_created_at_5b54af39 ON public.accounts_cooperative USING btree (created_at);


--
-- Name: accounts_cooperative_status_762e1e68; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_cooperative_status_762e1e68 ON public.accounts_cooperative USING btree (status);


--
-- Name: accounts_cooperative_status_762e1e68_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_cooperative_status_762e1e68_like ON public.accounts_cooperative USING btree (status varchar_pattern_ops);


--
-- Name: accounts_driver_account_id_951c036e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_driver_account_id_951c036e ON public.accounts_driver USING btree (account_id);


--
-- Name: accounts_driver_created_at_07cd7fe7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_driver_created_at_07cd7fe7 ON public.accounts_driver USING btree (created_at);


--
-- Name: accounts_driver_photo_id_9522e5e2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_driver_photo_id_9522e5e2 ON public.accounts_driver USING btree (photo_id);


--
-- Name: accounts_id_account_164430_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_id_account_164430_idx ON public.accounts_identitydocument USING btree (account_id, doc_type, status);


--
-- Name: accounts_identitydocument_account_id_b961223f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_identitydocument_account_id_b961223f ON public.accounts_identitydocument USING btree (account_id);


--
-- Name: accounts_identitydocument_back_image_id_cdbbf59d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_identitydocument_back_image_id_cdbbf59d ON public.accounts_identitydocument USING btree (back_image_id);


--
-- Name: accounts_identitydocument_created_at_e2cf958b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_identitydocument_created_at_e2cf958b ON public.accounts_identitydocument USING btree (created_at);


--
-- Name: accounts_identitydocument_front_image_id_e2aa763a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_identitydocument_front_image_id_e2aa763a ON public.accounts_identitydocument USING btree (front_image_id);


--
-- Name: accounts_ot_channel_649b84_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_ot_channel_649b84_idx ON public.accounts_otpchallenge USING btree (channel, created_at);


--
-- Name: accounts_ot_phone_ba6535_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_ot_phone_ba6535_idx ON public.accounts_otpchallenge USING btree (phone, purpose, consumed_at);


--
-- Name: accounts_otpchallenge_channel_fbda5052; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_otpchallenge_channel_fbda5052 ON public.accounts_otpchallenge USING btree (channel);


--
-- Name: accounts_otpchallenge_channel_fbda5052_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_otpchallenge_channel_fbda5052_like ON public.accounts_otpchallenge USING btree (channel varchar_pattern_ops);


--
-- Name: accounts_otpchallenge_created_at_c22243f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_otpchallenge_created_at_c22243f1 ON public.accounts_otpchallenge USING btree (created_at);


--
-- Name: accounts_otpchallenge_phone_2b300ac5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_otpchallenge_phone_2b300ac5 ON public.accounts_otpchallenge USING btree (phone);


--
-- Name: accounts_otpchallenge_phone_2b300ac5_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_otpchallenge_phone_2b300ac5_like ON public.accounts_otpchallenge USING btree (phone varchar_pattern_ops);


--
-- Name: accounts_pa_user_id_fceadd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_pa_user_id_fceadd_idx ON public.accounts_passwordsetuptoken USING btree (user_id, purpose, consumed_at);


--
-- Name: accounts_passwordsetuptoken_created_at_b3f2562c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_created_at_b3f2562c ON public.accounts_passwordsetuptoken USING btree (created_at);


--
-- Name: accounts_passwordsetuptoken_expires_at_5a519fd7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_expires_at_5a519fd7 ON public.accounts_passwordsetuptoken USING btree (expires_at);


--
-- Name: accounts_passwordsetuptoken_purpose_fe38fab9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_purpose_fe38fab9 ON public.accounts_passwordsetuptoken USING btree (purpose);


--
-- Name: accounts_passwordsetuptoken_purpose_fe38fab9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_purpose_fe38fab9_like ON public.accounts_passwordsetuptoken USING btree (purpose varchar_pattern_ops);


--
-- Name: accounts_passwordsetuptoken_token_hash_7af5e14e_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_token_hash_7af5e14e_like ON public.accounts_passwordsetuptoken USING btree (token_hash varchar_pattern_ops);


--
-- Name: accounts_passwordsetuptoken_user_id_c108c7ad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_passwordsetuptoken_user_id_c108c7ad ON public.accounts_passwordsetuptoken USING btree (user_id);


--
-- Name: accounts_permission_code_b0aa0a43_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_permission_code_b0aa0a43_like ON public.accounts_permission USING btree (code varchar_pattern_ops);


--
-- Name: accounts_permission_created_at_025ef2c4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_permission_created_at_025ef2c4 ON public.accounts_permission USING btree (created_at);


--
-- Name: accounts_permission_module_5fe006a9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_permission_module_5fe006a9 ON public.accounts_permission USING btree (module);


--
-- Name: accounts_permission_module_5fe006a9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_permission_module_5fe006a9_like ON public.accounts_permission USING btree (module varchar_pattern_ops);


--
-- Name: accounts_role_code_31e05c3f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_code_31e05c3f_like ON public.accounts_role USING btree (code varchar_pattern_ops);


--
-- Name: accounts_role_created_at_b371308a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_created_at_b371308a ON public.accounts_role USING btree (created_at);


--
-- Name: accounts_role_is_active_30164ebb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_is_active_30164ebb ON public.accounts_role USING btree (is_active);


--
-- Name: accounts_role_permissions_permission_id_76fe677d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_permissions_permission_id_76fe677d ON public.accounts_role_permissions USING btree (permission_id);


--
-- Name: accounts_role_permissions_role_id_54f107a6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_role_permissions_role_id_54f107a6 ON public.accounts_role_permissions USING btree (role_id);


--
-- Name: accounts_staffmembership_created_at_5465af04; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_staffmembership_created_at_5465af04 ON public.accounts_staffmembership USING btree (created_at);


--
-- Name: accounts_staffmembership_user_id_85d025a6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_staffmembership_user_id_85d025a6 ON public.accounts_staffmembership USING btree (user_id);


--
-- Name: accounts_tr_account_b447ae_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_tr_account_b447ae_idx ON public.accounts_trusteddevice USING btree (account_id, status, first_seen_at DESC);


--
-- Name: accounts_trusteddevice_account_id_b08bb30c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_account_id_b08bb30c ON public.accounts_trusteddevice USING btree (account_id);


--
-- Name: accounts_trusteddevice_created_at_7f097834; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_created_at_7f097834 ON public.accounts_trusteddevice USING btree (created_at);


--
-- Name: accounts_trusteddevice_device_key_d2a7aef8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_device_key_d2a7aef8 ON public.accounts_trusteddevice USING btree (device_key);


--
-- Name: accounts_trusteddevice_device_key_d2a7aef8_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_device_key_d2a7aef8_like ON public.accounts_trusteddevice USING btree (device_key varchar_pattern_ops);


--
-- Name: accounts_trusteddevice_status_151f669a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_status_151f669a ON public.accounts_trusteddevice USING btree (status);


--
-- Name: accounts_trusteddevice_status_151f669a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_trusteddevice_status_151f669a_like ON public.accounts_trusteddevice USING btree (status varchar_pattern_ops);


--
-- Name: accounts_user_assigned_role_id_a4b7cea6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_assigned_role_id_a4b7cea6 ON public.accounts_user USING btree (assigned_role_id);


--
-- Name: accounts_user_avatar_id_5ce2f0b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_avatar_id_5ce2f0b3 ON public.accounts_user USING btree (avatar_id);


--
-- Name: accounts_user_created_at_04bd66b9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_created_at_04bd66b9 ON public.accounts_user USING btree (created_at);


--
-- Name: accounts_user_email_b2644a56_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_email_b2644a56_like ON public.accounts_user USING btree (email varchar_pattern_ops);


--
-- Name: accounts_user_groups_group_id_bd11a704; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_groups_group_id_bd11a704 ON public.accounts_user_groups USING btree (group_id);


--
-- Name: accounts_user_groups_user_id_52b62117; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_groups_user_id_52b62117 ON public.accounts_user_groups USING btree (user_id);


--
-- Name: accounts_user_onboarding_step_64679b86; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_onboarding_step_64679b86 ON public.accounts_user USING btree (onboarding_step);


--
-- Name: accounts_user_onboarding_step_64679b86_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_onboarding_step_64679b86_like ON public.accounts_user USING btree (onboarding_step varchar_pattern_ops);


--
-- Name: accounts_user_phone_c603acdd_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_phone_c603acdd_like ON public.accounts_user USING btree (phone varchar_pattern_ops);


--
-- Name: accounts_user_public_id_a3014eda_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_public_id_a3014eda_like ON public.accounts_user USING btree (public_id varchar_pattern_ops);


--
-- Name: accounts_user_user_permissions_permission_id_113bb443; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_user_permissions_permission_id_113bb443 ON public.accounts_user_user_permissions USING btree (permission_id);


--
-- Name: accounts_user_user_permissions_user_id_e4f0a161; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX accounts_user_user_permissions_user_id_e4f0a161 ON public.accounts_user_user_permissions USING btree (user_id);


--
-- Name: analytics_d_date_3c409f_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_d_date_3c409f_idx ON public.analytics_dailyaccountmetric USING btree (date);


--
-- Name: analytics_dailyaccountmetric_account_id_20cb8842; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyaccountmetric_account_id_20cb8842 ON public.analytics_dailyaccountmetric USING btree (account_id);


--
-- Name: analytics_dailyaccountmetric_created_at_01ede5f0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyaccountmetric_created_at_01ede5f0 ON public.analytics_dailyaccountmetric USING btree (created_at);


--
-- Name: analytics_dailyaccountmetric_date_af4e8413; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyaccountmetric_date_af4e8413 ON public.analytics_dailyaccountmetric USING btree (date);


--
-- Name: analytics_dailyhubmetric_created_at_ea832fcf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyhubmetric_created_at_ea832fcf ON public.analytics_dailyhubmetric USING btree (created_at);


--
-- Name: analytics_dailyhubmetric_date_568493b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyhubmetric_date_568493b3 ON public.analytics_dailyhubmetric USING btree (date);


--
-- Name: analytics_dailyhubmetric_hub_id_6d7958dc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_dailyhubmetric_hub_id_6d7958dc ON public.analytics_dailyhubmetric USING btree (hub_id);


--
-- Name: analytics_impactstory_created_at_aafb90a2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_impactstory_created_at_aafb90a2 ON public.analytics_impactstory USING btree (created_at);


--
-- Name: analytics_impactstory_created_by_id_73c86aff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_impactstory_created_by_id_73c86aff ON public.analytics_impactstory USING btree (created_by_id);


--
-- Name: analytics_impactstory_status_832f6dae; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_impactstory_status_832f6dae ON public.analytics_impactstory USING btree (status);


--
-- Name: analytics_impactstory_status_832f6dae_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_impactstory_status_832f6dae_like ON public.analytics_impactstory USING btree (status varchar_pattern_ops);


--
-- Name: analytics_monthlyimpactmetric_created_at_a23869fe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_monthlyimpactmetric_created_at_a23869fe ON public.analytics_monthlyimpactmetric USING btree (created_at);


--
-- Name: analytics_monthlyimpactmetric_period_fd80d3e1_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_monthlyimpactmetric_period_fd80d3e1_like ON public.analytics_monthlyimpactmetric USING btree (period varchar_pattern_ops);


--
-- Name: analytics_reportjob_created_at_39c84b87; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_created_at_39c84b87 ON public.analytics_reportjob USING btree (created_at);


--
-- Name: analytics_reportjob_idempotency_key_05947c5a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_idempotency_key_05947c5a ON public.analytics_reportjob USING btree (idempotency_key);


--
-- Name: analytics_reportjob_idempotency_key_05947c5a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_idempotency_key_05947c5a_like ON public.analytics_reportjob USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: analytics_reportjob_kind_22b1a1ee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_kind_22b1a1ee ON public.analytics_reportjob USING btree (kind);


--
-- Name: analytics_reportjob_kind_22b1a1ee_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_kind_22b1a1ee_like ON public.analytics_reportjob USING btree (kind varchar_pattern_ops);


--
-- Name: analytics_reportjob_requested_by_id_60ac0241; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_requested_by_id_60ac0241 ON public.analytics_reportjob USING btree (requested_by_id);


--
-- Name: analytics_reportjob_status_c8c57863; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_status_c8c57863 ON public.analytics_reportjob USING btree (status);


--
-- Name: analytics_reportjob_status_c8c57863_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX analytics_reportjob_status_c8c57863_like ON public.analytics_reportjob USING btree (status varchar_pattern_ops);


--
-- Name: audit_audit_action_9e2202_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_audit_action_9e2202_idx ON public.audit_auditevent USING btree (action, created_at DESC);


--
-- Name: audit_audit_actor_i_fb4253_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_audit_actor_i_fb4253_idx ON public.audit_auditevent USING btree (actor_id, created_at DESC);


--
-- Name: audit_audit_subject_49d3b6_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_audit_subject_49d3b6_idx ON public.audit_auditevent USING btree (subject_type, subject_id, created_at DESC);


--
-- Name: audit_auditevent_action_2131bb77; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_action_2131bb77 ON public.audit_auditevent USING btree (action);


--
-- Name: audit_auditevent_action_2131bb77_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_action_2131bb77_like ON public.audit_auditevent USING btree (action varchar_pattern_ops);


--
-- Name: audit_auditevent_actor_id_270bb4b7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_actor_id_270bb4b7 ON public.audit_auditevent USING btree (actor_id);


--
-- Name: audit_auditevent_created_at_58e81936; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_created_at_58e81936 ON public.audit_auditevent USING btree (created_at);


--
-- Name: audit_auditevent_row_hash_ac094344; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_row_hash_ac094344 ON public.audit_auditevent USING btree (row_hash);


--
-- Name: audit_auditevent_row_hash_ac094344_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_row_hash_ac094344_like ON public.audit_auditevent USING btree (row_hash varchar_pattern_ops);


--
-- Name: audit_auditevent_subject_id_1173988d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_subject_id_1173988d ON public.audit_auditevent USING btree (subject_id);


--
-- Name: audit_auditevent_subject_id_1173988d_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_subject_id_1173988d_like ON public.audit_auditevent USING btree (subject_id varchar_pattern_ops);


--
-- Name: audit_auditevent_subject_type_c345c76f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_subject_type_c345c76f ON public.audit_auditevent USING btree (subject_type);


--
-- Name: audit_auditevent_subject_type_c345c76f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_auditevent_subject_type_c345c76f_like ON public.audit_auditevent USING btree (subject_type varchar_pattern_ops);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: core_auditevent_created_at_bef733d2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_auditevent_created_at_bef733d2 ON public.core_auditevent USING btree (created_at);


--
-- Name: core_config_namespa_d70b66_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_config_namespa_d70b66_idx ON public.core_configversion USING btree (namespace, key, status);


--
-- Name: core_configversion_approved_by_id_afe16f19; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_approved_by_id_afe16f19 ON public.core_configversion USING btree (approved_by_id);


--
-- Name: core_configversion_created_at_bed972f1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_created_at_bed972f1 ON public.core_configversion USING btree (created_at);


--
-- Name: core_configversion_created_by_id_bfdbb320; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_created_by_id_bfdbb320 ON public.core_configversion USING btree (created_by_id);


--
-- Name: core_configversion_key_880d98ef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_key_880d98ef ON public.core_configversion USING btree (key);


--
-- Name: core_configversion_key_880d98ef_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_key_880d98ef_like ON public.core_configversion USING btree (key varchar_pattern_ops);


--
-- Name: core_configversion_namespace_070d6a22; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_namespace_070d6a22 ON public.core_configversion USING btree (namespace);


--
-- Name: core_configversion_namespace_070d6a22_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_namespace_070d6a22_like ON public.core_configversion USING btree (namespace varchar_pattern_ops);


--
-- Name: core_configversion_status_a22ee06f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_status_a22ee06f ON public.core_configversion USING btree (status);


--
-- Name: core_configversion_status_a22ee06f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_configversion_status_a22ee06f_like ON public.core_configversion USING btree (status varchar_pattern_ops);


--
-- Name: core_mediaa_provide_d0dcc8_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaa_provide_d0dcc8_idx ON public.core_mediaasset USING btree (provider, storage_key);


--
-- Name: core_mediaa_uploade_81fd6a_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaa_uploade_81fd6a_idx ON public.core_mediaasset USING btree (uploaded_by_id, created_at);


--
-- Name: core_mediaasset_created_at_3c694a07; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_created_at_3c694a07 ON public.core_mediaasset USING btree (created_at);


--
-- Name: core_mediaasset_kind_747a738b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_kind_747a738b ON public.core_mediaasset USING btree (kind);


--
-- Name: core_mediaasset_kind_747a738b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_kind_747a738b_like ON public.core_mediaasset USING btree (kind varchar_pattern_ops);


--
-- Name: core_mediaasset_provider_187a951f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_provider_187a951f ON public.core_mediaasset USING btree (provider);


--
-- Name: core_mediaasset_provider_187a951f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_provider_187a951f_like ON public.core_mediaasset USING btree (provider varchar_pattern_ops);


--
-- Name: core_mediaasset_storage_key_b602ca73; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_storage_key_b602ca73 ON public.core_mediaasset USING btree (storage_key);


--
-- Name: core_mediaasset_storage_key_b602ca73_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_storage_key_b602ca73_like ON public.core_mediaasset USING btree (storage_key varchar_pattern_ops);


--
-- Name: core_mediaasset_uploaded_by_id_3edc7410; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_mediaasset_uploaded_by_id_3edc7410 ON public.core_mediaasset USING btree (uploaded_by_id);


--
-- Name: core_queued_status_3a3d39_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queued_status_3a3d39_idx ON public.core_queuedtask USING btree (status, created_at);


--
-- Name: core_queuedtask_created_at_ee55b23f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_created_at_ee55b23f ON public.core_queuedtask USING btree (created_at);


--
-- Name: core_queuedtask_result_id_185e3622_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_result_id_185e3622_like ON public.core_queuedtask USING btree (result_id varchar_pattern_ops);


--
-- Name: core_queuedtask_status_d2898727; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_status_d2898727 ON public.core_queuedtask USING btree (status);


--
-- Name: core_queuedtask_status_d2898727_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_status_d2898727_like ON public.core_queuedtask USING btree (status varchar_pattern_ops);


--
-- Name: core_queuedtask_task_path_391126ca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_task_path_391126ca ON public.core_queuedtask USING btree (task_path);


--
-- Name: core_queuedtask_task_path_391126ca_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX core_queuedtask_task_path_391126ca_like ON public.core_queuedtask USING btree (task_path varchar_pattern_ops);


--
-- Name: credit_cred_account_b2dbea_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_cred_account_b2dbea_idx ON public.credit_creditapplication USING btree (account_id, status);


--
-- Name: credit_cred_account_e2e6a9_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_cred_account_e2e6a9_idx ON public.credit_creditscore USING btree (account_id, computed_at DESC);


--
-- Name: credit_creditapplication_account_id_68b6c8ea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_account_id_68b6c8ea ON public.credit_creditapplication USING btree (account_id);


--
-- Name: credit_creditapplication_created_at_cc1b9043; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_created_at_cc1b9043 ON public.credit_creditapplication USING btree (created_at);


--
-- Name: credit_creditapplication_credit_line_id_5d10ddfc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_credit_line_id_5d10ddfc ON public.credit_creditapplication USING btree (credit_line_id);


--
-- Name: credit_creditapplication_decided_by_id_d006f060; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_decided_by_id_d006f060 ON public.credit_creditapplication USING btree (decided_by_id);


--
-- Name: credit_creditapplication_idempotency_key_a0d13426_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_idempotency_key_a0d13426_like ON public.credit_creditapplication USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: credit_creditapplication_status_7b26c355; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_status_7b26c355 ON public.credit_creditapplication USING btree (status);


--
-- Name: credit_creditapplication_status_7b26c355_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditapplication_status_7b26c355_like ON public.credit_creditapplication USING btree (status varchar_pattern_ops);


--
-- Name: credit_creditline_created_at_ba47b402; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditline_created_at_ba47b402 ON public.credit_creditline USING btree (created_at);


--
-- Name: credit_creditline_score_id_750d2bd3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditline_score_id_750d2bd3 ON public.credit_creditline USING btree (score_id);


--
-- Name: credit_creditline_status_92b4893f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditline_status_92b4893f ON public.credit_creditline USING btree (status);


--
-- Name: credit_creditline_status_92b4893f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditline_status_92b4893f_like ON public.credit_creditline USING btree (status varchar_pattern_ops);


--
-- Name: credit_creditscore_account_id_0f63dd3a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditscore_account_id_0f63dd3a ON public.credit_creditscore USING btree (account_id);


--
-- Name: credit_creditscore_created_at_aa77b41b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditscore_created_at_aa77b41b ON public.credit_creditscore USING btree (created_at);


--
-- Name: credit_creditscore_override_by_id_e8dacc4d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_creditscore_override_by_id_e8dacc4d ON public.credit_creditscore USING btree (override_by_id);


--
-- Name: credit_loan_account_426c5d_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loan_account_426c5d_idx ON public.credit_loan USING btree (account_id, status);


--
-- Name: credit_loan_account_id_4e689ad3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loan_account_id_4e689ad3 ON public.credit_loan USING btree (account_id);


--
-- Name: credit_loan_created_at_0ad846b8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loan_created_at_0ad846b8 ON public.credit_loan USING btree (created_at);


--
-- Name: credit_loan_status_6b054d5f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loan_status_6b054d5f ON public.credit_loan USING btree (status);


--
-- Name: credit_loan_status_6b054d5f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loan_status_6b054d5f_like ON public.credit_loan USING btree (status varchar_pattern_ops);


--
-- Name: credit_loanrepayment_created_at_1a904e47; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_created_at_1a904e47 ON public.credit_loanrepayment USING btree (created_at);


--
-- Name: credit_loanrepayment_idempotency_key_519d94fa_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_idempotency_key_519d94fa_like ON public.credit_loanrepayment USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: credit_loanrepayment_loan_id_d61ba5cc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_loan_id_d61ba5cc ON public.credit_loanrepayment USING btree (loan_id);


--
-- Name: credit_loanrepayment_payment_id_e1d5ba42; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_payment_id_e1d5ba42 ON public.credit_loanrepayment USING btree (payment_id);


--
-- Name: credit_loanrepayment_status_4c70260b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_status_4c70260b ON public.credit_loanrepayment USING btree (status);


--
-- Name: credit_loanrepayment_status_4c70260b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_loanrepayment_status_4c70260b_like ON public.credit_loanrepayment USING btree (status varchar_pattern_ops);


--
-- Name: credit_offe_account_499b9b_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offe_account_499b9b_idx ON public.credit_offerassignment USING btree (account_id, status);


--
-- Name: credit_offerassignment_account_id_4dffee9d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offerassignment_account_id_4dffee9d ON public.credit_offerassignment USING btree (account_id);


--
-- Name: credit_offerassignment_created_at_88edf73d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offerassignment_created_at_88edf73d ON public.credit_offerassignment USING btree (created_at);


--
-- Name: credit_offerassignment_offer_id_f2d7fc28; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offerassignment_offer_id_f2d7fc28 ON public.credit_offerassignment USING btree (offer_id);


--
-- Name: credit_offerassignment_status_d397d5d9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offerassignment_status_d397d5d9 ON public.credit_offerassignment USING btree (status);


--
-- Name: credit_offerassignment_status_d397d5d9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_offerassignment_status_d397d5d9_like ON public.credit_offerassignment USING btree (status varchar_pattern_ops);


--
-- Name: credit_productoffer_created_at_eff51578; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_productoffer_created_at_eff51578 ON public.credit_productoffer USING btree (created_at);


--
-- Name: credit_productoffer_status_4ebd26cd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_productoffer_status_4ebd26cd ON public.credit_productoffer USING btree (status);


--
-- Name: credit_productoffer_status_4ebd26cd_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_productoffer_status_4ebd26cd_like ON public.credit_productoffer USING btree (status varchar_pattern_ops);


--
-- Name: credit_segm_status_507604_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_segm_status_507604_idx ON public.credit_segment USING btree (status, updated_at);


--
-- Name: credit_segment_created_at_9d1287e3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_segment_created_at_9d1287e3 ON public.credit_segment USING btree (created_at);


--
-- Name: credit_segment_status_f1e29c09; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_segment_status_f1e29c09 ON public.credit_segment USING btree (status);


--
-- Name: credit_segment_status_f1e29c09_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX credit_segment_status_f1e29c09_like ON public.credit_segment USING btree (status varchar_pattern_ops);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: finance_ledgeraccount_code_782dbe4c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgeraccount_code_782dbe4c_like ON public.finance_ledgeraccount USING btree (code varchar_pattern_ops);


--
-- Name: finance_ledgeraccount_created_at_687591b5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgeraccount_created_at_687591b5 ON public.finance_ledgeraccount USING btree (created_at);


--
-- Name: finance_ledgerentry_created_at_c374e8de; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgerentry_created_at_c374e8de ON public.finance_ledgerentry USING btree (created_at);


--
-- Name: finance_ledgerentry_ledger_account_id_41f3c4d3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgerentry_ledger_account_id_41f3c4d3 ON public.finance_ledgerentry USING btree (ledger_account_id);


--
-- Name: finance_ledgerentry_transaction_id_0041b384; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgerentry_transaction_id_0041b384 ON public.finance_ledgerentry USING btree (transaction_id);


--
-- Name: finance_ledgertransaction_created_at_b02996ec; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgertransaction_created_at_b02996ec ON public.finance_ledgertransaction USING btree (created_at);


--
-- Name: finance_ledgertransaction_reference_d3383d91_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_ledgertransaction_reference_d3383d91_like ON public.finance_ledgertransaction USING btree (reference varchar_pattern_ops);


--
-- Name: finance_payment_account_id_8bcb6de1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_account_id_8bcb6de1 ON public.finance_payment USING btree (account_id);


--
-- Name: finance_payment_created_at_fd68d58d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_created_at_fd68d58d ON public.finance_payment USING btree (created_at);


--
-- Name: finance_payment_hub_id_b840a14c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_hub_id_b840a14c ON public.finance_payment USING btree (hub_id);


--
-- Name: finance_payment_idempotency_key_5e659871_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_idempotency_key_5e659871_like ON public.finance_payment USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: finance_payment_psp_reference_7adc4ecd_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_psp_reference_7adc4ecd_like ON public.finance_payment USING btree (psp_reference varchar_pattern_ops);


--
-- Name: finance_payment_receipt_code_2a658e62_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_payment_receipt_code_2a658e62_like ON public.finance_payment USING btree (receipt_code varchar_pattern_ops);


--
-- Name: finance_virtualaccount_created_at_507490c5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_virtualaccount_created_at_507490c5 ON public.finance_virtualaccount USING btree (created_at);


--
-- Name: finance_virtualaccount_next_attempt_at_2bb75c99; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_virtualaccount_next_attempt_at_2bb75c99 ON public.finance_virtualaccount USING btree (next_attempt_at);


--
-- Name: finance_virtualaccount_nuban_cc70619a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_virtualaccount_nuban_cc70619a_like ON public.finance_virtualaccount USING btree (nuban varchar_pattern_ops);


--
-- Name: finance_virtualaccount_psp_reference_ca78fa1a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_virtualaccount_psp_reference_ca78fa1a ON public.finance_virtualaccount USING btree (psp_reference);


--
-- Name: finance_virtualaccount_psp_reference_ca78fa1a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_virtualaccount_psp_reference_ca78fa1a_like ON public.finance_virtualaccount USING btree (psp_reference varchar_pattern_ops);


--
-- Name: finance_wallet_created_at_4bdc4f7b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX finance_wallet_created_at_4bdc4f7b ON public.finance_wallet USING btree (created_at);


--
-- Name: integration_psp_ad5fb6_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integration_psp_ad5fb6_idx ON public.integrations_pspwebhookevent USING btree (psp, status, created_at);


--
-- Name: integrations_pspwebhookevent_created_at_52c39adf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_created_at_52c39adf ON public.integrations_pspwebhookevent USING btree (created_at);


--
-- Name: integrations_pspwebhookevent_psp_1ce61689; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_psp_1ce61689 ON public.integrations_pspwebhookevent USING btree (psp);


--
-- Name: integrations_pspwebhookevent_psp_1ce61689_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_psp_1ce61689_like ON public.integrations_pspwebhookevent USING btree (psp varchar_pattern_ops);


--
-- Name: integrations_pspwebhookevent_psp_event_id_9059647c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_psp_event_id_9059647c ON public.integrations_pspwebhookevent USING btree (psp_event_id);


--
-- Name: integrations_pspwebhookevent_psp_event_id_9059647c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_psp_event_id_9059647c_like ON public.integrations_pspwebhookevent USING btree (psp_event_id varchar_pattern_ops);


--
-- Name: integrations_pspwebhookevent_status_e14f61a5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_status_e14f61a5 ON public.integrations_pspwebhookevent USING btree (status);


--
-- Name: integrations_pspwebhookevent_status_e14f61a5_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX integrations_pspwebhookevent_status_e14f61a5_like ON public.integrations_pspwebhookevent USING btree (status varchar_pattern_ops);


--
-- Name: mobility_ba_battery_bb6c75_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_ba_battery_bb6c75_idx ON public.mobility_batteryevent USING btree (battery_id, occurred_at DESC);


--
-- Name: mobility_battery_battery_type_id_4b42080a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_battery_type_id_4b42080a ON public.mobility_battery USING btree (battery_type_id);


--
-- Name: mobility_battery_created_at_af739337; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_created_at_af739337 ON public.mobility_battery USING btree (created_at);


--
-- Name: mobility_battery_current_hub_id_778a38a8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_current_hub_id_778a38a8 ON public.mobility_battery USING btree (current_hub_id);


--
-- Name: mobility_battery_custodian_id_37fa32e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_custodian_id_37fa32e5 ON public.mobility_battery USING btree (custodian_id);


--
-- Name: mobility_battery_custodian_type_668ac778; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_custodian_type_668ac778 ON public.mobility_battery USING btree (custodian_type);


--
-- Name: mobility_battery_custodian_type_668ac778_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_custodian_type_668ac778_like ON public.mobility_battery USING btree (custodian_type varchar_pattern_ops);


--
-- Name: mobility_battery_serial_ea12c460_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_battery_serial_ea12c460_like ON public.mobility_battery USING btree (serial varchar_pattern_ops);


--
-- Name: mobility_batteryevent_actor_id_b4b84170; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_actor_id_b4b84170 ON public.mobility_batteryevent USING btree (actor_id);


--
-- Name: mobility_batteryevent_battery_id_14714f81; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_battery_id_14714f81 ON public.mobility_batteryevent USING btree (battery_id);


--
-- Name: mobility_batteryevent_created_at_8d53111b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_created_at_8d53111b ON public.mobility_batteryevent USING btree (created_at);


--
-- Name: mobility_batteryevent_event_6da17fc9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_event_6da17fc9 ON public.mobility_batteryevent USING btree (event);


--
-- Name: mobility_batteryevent_event_6da17fc9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_event_6da17fc9_like ON public.mobility_batteryevent USING btree (event varchar_pattern_ops);


--
-- Name: mobility_batteryevent_hub_id_bfc4199d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_hub_id_bfc4199d ON public.mobility_batteryevent USING btree (hub_id);


--
-- Name: mobility_batteryevent_occurred_at_e3effc47; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_occurred_at_e3effc47 ON public.mobility_batteryevent USING btree (occurred_at);


--
-- Name: mobility_batteryevent_row_hash_0e4ff8ed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_row_hash_0e4ff8ed ON public.mobility_batteryevent USING btree (row_hash);


--
-- Name: mobility_batteryevent_row_hash_0e4ff8ed_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_row_hash_0e4ff8ed_like ON public.mobility_batteryevent USING btree (row_hash varchar_pattern_ops);


--
-- Name: mobility_batteryevent_swap_id_d2786820; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batteryevent_swap_id_d2786820 ON public.mobility_batteryevent USING btree (swap_id);


--
-- Name: mobility_batterytype_approved_by_id_0fc5e975; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batterytype_approved_by_id_0fc5e975 ON public.mobility_batterytype USING btree (approved_by_id);


--
-- Name: mobility_batterytype_created_at_c2631e69; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batterytype_created_at_c2631e69 ON public.mobility_batterytype USING btree (created_at);


--
-- Name: mobility_batterytype_created_by_id_22401b8a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batterytype_created_by_id_22401b8a ON public.mobility_batterytype USING btree (created_by_id);


--
-- Name: mobility_batterytype_status_3a6c9bd4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batterytype_status_3a6c9bd4 ON public.mobility_batterytype USING btree (status);


--
-- Name: mobility_batterytype_status_3a6c9bd4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_batterytype_status_3a6c9bd4_like ON public.mobility_batterytype USING btree (status varchar_pattern_ops);


--
-- Name: mobility_bayholdpolicy_created_at_8bcb2bff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_bayholdpolicy_created_at_8bcb2bff ON public.mobility_bayholdpolicy USING btree (created_at);


--
-- Name: mobility_di_discoun_182796_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_di_discoun_182796_idx ON public.mobility_discountredemption USING btree (discount_id, account_id);


--
-- Name: mobility_di_status_afd483_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_di_status_afd483_idx ON public.mobility_discountcampaign USING btree (status, code);


--
-- Name: mobility_discountcampaign_approved_by_id_4794e559; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_approved_by_id_4794e559 ON public.mobility_discountcampaign USING btree (approved_by_id);


--
-- Name: mobility_discountcampaign_code_1b29b02f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_code_1b29b02f_like ON public.mobility_discountcampaign USING btree (code varchar_pattern_ops);


--
-- Name: mobility_discountcampaign_created_at_e43f7871; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_created_at_e43f7871 ON public.mobility_discountcampaign USING btree (created_at);


--
-- Name: mobility_discountcampaign_created_by_id_6021a956; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_created_by_id_6021a956 ON public.mobility_discountcampaign USING btree (created_by_id);


--
-- Name: mobility_discountcampaign_status_2d058841; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_status_2d058841 ON public.mobility_discountcampaign USING btree (status);


--
-- Name: mobility_discountcampaign_status_2d058841_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountcampaign_status_2d058841_like ON public.mobility_discountcampaign USING btree (status varchar_pattern_ops);


--
-- Name: mobility_discountredemption_account_id_b226e7f7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_account_id_b226e7f7 ON public.mobility_discountredemption USING btree (account_id);


--
-- Name: mobility_discountredemption_created_at_65ec3888; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_created_at_65ec3888 ON public.mobility_discountredemption USING btree (created_at);


--
-- Name: mobility_discountredemption_discount_id_3a1afe6f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_discount_id_3a1afe6f ON public.mobility_discountredemption USING btree (discount_id);


--
-- Name: mobility_discountredemption_idempotency_key_be0dadd9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_idempotency_key_be0dadd9_like ON public.mobility_discountredemption USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: mobility_discountredemption_payment_id_2f970af5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_payment_id_2f970af5 ON public.mobility_discountredemption USING btree (payment_id);


--
-- Name: mobility_discountredemption_subscription_id_7666c37c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_discountredemption_subscription_id_7666c37c ON public.mobility_discountredemption USING btree (subscription_id);


--
-- Name: mobility_eb_battery_aa866d_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eb_battery_aa866d_idx ON public.mobility_eboarder USING btree (battery_type_id, status);


--
-- Name: mobility_eb_status_d0dffa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eb_status_d0dffa_idx ON public.mobility_eboarder USING btree (status, current_hub_id);


--
-- Name: mobility_eboarder_account_id_42ed96e8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_account_id_42ed96e8 ON public.mobility_eboarder USING btree (account_id);


--
-- Name: mobility_eboarder_battery_type_id_4a7a0ee5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_battery_type_id_4a7a0ee5 ON public.mobility_eboarder USING btree (battery_type_id);


--
-- Name: mobility_eboarder_created_at_518031c3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_created_at_518031c3 ON public.mobility_eboarder USING btree (created_at);


--
-- Name: mobility_eboarder_current_hub_id_46f79988; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_current_hub_id_46f79988 ON public.mobility_eboarder USING btree (current_hub_id);


--
-- Name: mobility_eboarder_serial_496c7960_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_serial_496c7960_like ON public.mobility_eboarder USING btree (serial varchar_pattern_ops);


--
-- Name: mobility_eboarder_status_40ce4f87; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_status_40ce4f87 ON public.mobility_eboarder USING btree (status);


--
-- Name: mobility_eboarder_status_40ce4f87_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_eboarder_status_40ce4f87_like ON public.mobility_eboarder USING btree (status varchar_pattern_ops);


--
-- Name: mobility_hub_code_cad0dd7c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_hub_code_cad0dd7c_like ON public.mobility_hub USING btree (code varchar_pattern_ops);


--
-- Name: mobility_hub_created_at_dbade2a9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_hub_created_at_dbade2a9 ON public.mobility_hub USING btree (created_at);


--
-- Name: mobility_hubslot_created_at_d1c8881e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_hubslot_created_at_d1c8881e ON public.mobility_hubslot USING btree (created_at);


--
-- Name: mobility_hubslot_hub_id_760048fc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_hubslot_hub_id_760048fc ON public.mobility_hubslot USING btree (hub_id);


--
-- Name: mobility_pe_account_9b6608_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pe_account_9b6608_idx ON public.mobility_petrolengine USING btree (account_id, status);


--
-- Name: mobility_pe_storage_957880_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pe_storage_957880_idx ON public.mobility_petrolengine USING btree (storage_hub_id, status);


--
-- Name: mobility_petrolengine_account_id_9647b1eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_account_id_9647b1eb ON public.mobility_petrolengine USING btree (account_id);


--
-- Name: mobility_petrolengine_created_at_030c4def; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_created_at_030c4def ON public.mobility_petrolengine USING btree (created_at);


--
-- Name: mobility_petrolengine_intake_agent_id_f58ae49e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_intake_agent_id_f58ae49e ON public.mobility_petrolengine USING btree (intake_agent_id);


--
-- Name: mobility_petrolengine_intake_witness_id_b21330a0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_intake_witness_id_b21330a0 ON public.mobility_petrolengine USING btree (intake_witness_id);


--
-- Name: mobility_petrolengine_release_by_id_666e8247; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_release_by_id_666e8247 ON public.mobility_petrolengine USING btree (release_by_id);


--
-- Name: mobility_petrolengine_status_c653e272; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_status_c653e272 ON public.mobility_petrolengine USING btree (status);


--
-- Name: mobility_petrolengine_status_c653e272_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_status_c653e272_like ON public.mobility_petrolengine USING btree (status varchar_pattern_ops);


--
-- Name: mobility_petrolengine_storage_hub_id_0ade7245; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_storage_hub_id_0ade7245 ON public.mobility_petrolengine USING btree (storage_hub_id);


--
-- Name: mobility_petrolengine_tag_01cc3db4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_petrolengine_tag_01cc3db4_like ON public.mobility_petrolengine USING btree (tag varchar_pattern_ops);


--
-- Name: mobility_plan_code_9d754541_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_plan_code_9d754541_like ON public.mobility_plan USING btree (code varchar_pattern_ops);


--
-- Name: mobility_plan_created_at_18f00d26; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_plan_created_at_18f00d26 ON public.mobility_plan USING btree (created_at);


--
-- Name: mobility_pr_vehicle_9c5e2e_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pr_vehicle_9c5e2e_idx ON public.mobility_pricematrix USING btree (vehicle_type, status, effective_from);


--
-- Name: mobility_pricematrix_approved_by_id_c7e13db5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_approved_by_id_c7e13db5 ON public.mobility_pricematrix USING btree (approved_by_id);


--
-- Name: mobility_pricematrix_created_at_ef27c2fc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_created_at_ef27c2fc ON public.mobility_pricematrix USING btree (created_at);


--
-- Name: mobility_pricematrix_created_by_id_5cf6b971; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_created_by_id_5cf6b971 ON public.mobility_pricematrix USING btree (created_by_id);


--
-- Name: mobility_pricematrix_status_5b12660a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_status_5b12660a ON public.mobility_pricematrix USING btree (status);


--
-- Name: mobility_pricematrix_status_5b12660a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_status_5b12660a_like ON public.mobility_pricematrix USING btree (status varchar_pattern_ops);


--
-- Name: mobility_pricematrix_vehicle_type_142341a3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_vehicle_type_142341a3 ON public.mobility_pricematrix USING btree (vehicle_type);


--
-- Name: mobility_pricematrix_vehicle_type_142341a3_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_pricematrix_vehicle_type_142341a3_like ON public.mobility_pricematrix USING btree (vehicle_type varchar_pattern_ops);


--
-- Name: mobility_re_account_662dda_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_re_account_662dda_idx ON public.mobility_retrofit USING btree (account_id, status);


--
-- Name: mobility_re_driver__001395_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_re_driver__001395_idx ON public.mobility_reservation USING btree (driver_id, status, expires_at);


--
-- Name: mobility_re_vehicle_fc9e91_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_re_vehicle_fc9e91_idx ON public.mobility_retrofit USING btree (vehicle_id, status);


--
-- Name: mobility_reservation_account_id_7e7f3ce8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_account_id_7e7f3ce8 ON public.mobility_reservation USING btree (account_id);


--
-- Name: mobility_reservation_battery_id_f2c890f6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_battery_id_f2c890f6 ON public.mobility_reservation USING btree (battery_id);


--
-- Name: mobility_reservation_code_0753e5eb_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_code_0753e5eb_like ON public.mobility_reservation USING btree (code varchar_pattern_ops);


--
-- Name: mobility_reservation_created_at_43300acc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_created_at_43300acc ON public.mobility_reservation USING btree (created_at);


--
-- Name: mobility_reservation_driver_id_e9542c1f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_driver_id_e9542c1f ON public.mobility_reservation USING btree (driver_id);


--
-- Name: mobility_reservation_hub_id_40ab37f2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_hub_id_40ab37f2 ON public.mobility_reservation USING btree (hub_id);


--
-- Name: mobility_reservation_source_3851375a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_source_3851375a ON public.mobility_reservation USING btree (source);


--
-- Name: mobility_reservation_source_3851375a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_source_3851375a_like ON public.mobility_reservation USING btree (source varchar_pattern_ops);


--
-- Name: mobility_reservation_token_hash_f80492d6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_token_hash_f80492d6 ON public.mobility_reservation USING btree (token_hash);


--
-- Name: mobility_reservation_token_hash_f80492d6_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_token_hash_f80492d6_like ON public.mobility_reservation USING btree (token_hash varchar_pattern_ops);


--
-- Name: mobility_reservation_vehicle_id_3af14f27; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_reservation_vehicle_id_3af14f27 ON public.mobility_reservation USING btree (vehicle_id);


--
-- Name: mobility_retrofit_account_id_59e99611; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_account_id_59e99611 ON public.mobility_retrofit USING btree (account_id);


--
-- Name: mobility_retrofit_agent_id_301da066; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_agent_id_301da066 ON public.mobility_retrofit USING btree (agent_id);


--
-- Name: mobility_retrofit_created_at_1a95b744; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_created_at_1a95b744 ON public.mobility_retrofit USING btree (created_at);


--
-- Name: mobility_retrofit_eboarder_id_d5f7682a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_eboarder_id_d5f7682a ON public.mobility_retrofit USING btree (eboarder_id);


--
-- Name: mobility_retrofit_status_8377931c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_status_8377931c ON public.mobility_retrofit USING btree (status);


--
-- Name: mobility_retrofit_status_8377931c_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_status_8377931c_like ON public.mobility_retrofit USING btree (status varchar_pattern_ops);


--
-- Name: mobility_retrofit_vehicle_id_1e54cacf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_retrofit_vehicle_id_1e54cacf ON public.mobility_retrofit USING btree (vehicle_id);


--
-- Name: mobility_su_account_ad393b_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_su_account_ad393b_idx ON public.mobility_subscription USING btree (account_id, status, ends_at DESC);


--
-- Name: mobility_su_status_c852dd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_su_status_c852dd_idx ON public.mobility_subscription USING btree (status, ends_at);


--
-- Name: mobility_su_vehicle_75f35e_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_su_vehicle_75f35e_idx ON public.mobility_subscription USING btree (vehicle_id, status);


--
-- Name: mobility_subscription_account_id_5e3229c2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_account_id_5e3229c2 ON public.mobility_subscription USING btree (account_id);


--
-- Name: mobility_subscription_created_at_d2e89b6b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_created_at_d2e89b6b ON public.mobility_subscription USING btree (created_at);


--
-- Name: mobility_subscription_idempotency_key_435047c9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_idempotency_key_435047c9_like ON public.mobility_subscription USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: mobility_subscription_payment_id_c49e8c7c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_payment_id_c49e8c7c ON public.mobility_subscription USING btree (payment_id);


--
-- Name: mobility_subscription_plan_id_161f3bb9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_plan_id_161f3bb9 ON public.mobility_subscription USING btree (plan_id);


--
-- Name: mobility_subscription_queued_plan_id_10a91c39; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_queued_plan_id_10a91c39 ON public.mobility_subscription USING btree (queued_plan_id);


--
-- Name: mobility_subscription_status_8a64f497; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_status_8a64f497 ON public.mobility_subscription USING btree (status);


--
-- Name: mobility_subscription_status_8a64f497_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_status_8a64f497_like ON public.mobility_subscription USING btree (status varchar_pattern_ops);


--
-- Name: mobility_subscription_vehicle_id_625da0a2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_subscription_vehicle_id_625da0a2 ON public.mobility_subscription USING btree (vehicle_id);


--
-- Name: mobility_sw_account_2d2966_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_sw_account_2d2966_idx ON public.mobility_swap USING btree (account_id, created_at DESC);


--
-- Name: mobility_sw_agent_i_635859_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_sw_agent_i_635859_idx ON public.mobility_swap USING btree (agent_id, created_at DESC);


--
-- Name: mobility_sw_driver__dbc2fd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_sw_driver__dbc2fd_idx ON public.mobility_swap USING btree (driver_id, status, completed_at);


--
-- Name: mobility_sw_hub_id_016570_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_sw_hub_id_016570_idx ON public.mobility_swap USING btree (hub_id, created_at DESC);


--
-- Name: mobility_swap_account_id_e2e1289f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_account_id_e2e1289f ON public.mobility_swap USING btree (account_id);


--
-- Name: mobility_swap_agent_id_85062566; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_agent_id_85062566 ON public.mobility_swap USING btree (agent_id);


--
-- Name: mobility_swap_created_at_b3d6e7b6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_created_at_b3d6e7b6 ON public.mobility_swap USING btree (created_at);


--
-- Name: mobility_swap_driver_id_da1bab26; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_driver_id_da1bab26 ON public.mobility_swap USING btree (driver_id);


--
-- Name: mobility_swap_hub_id_d508fa0d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_hub_id_d508fa0d ON public.mobility_swap USING btree (hub_id);


--
-- Name: mobility_swap_issued_battery_id_b3828980; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_issued_battery_id_b3828980 ON public.mobility_swap USING btree (issued_battery_id);


--
-- Name: mobility_swap_payment_id_c66c955e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_payment_id_c66c955e ON public.mobility_swap USING btree (payment_id);


--
-- Name: mobility_swap_returned_battery_id_5d634979; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_returned_battery_id_5d634979 ON public.mobility_swap USING btree (returned_battery_id);


--
-- Name: mobility_swap_source_b6df21b8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_source_b6df21b8 ON public.mobility_swap USING btree (source);


--
-- Name: mobility_swap_source_b6df21b8_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_source_b6df21b8_like ON public.mobility_swap USING btree (source varchar_pattern_ops);


--
-- Name: mobility_swap_status_ed4aedf7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_status_ed4aedf7 ON public.mobility_swap USING btree (status);


--
-- Name: mobility_swap_status_ed4aedf7_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_status_ed4aedf7_like ON public.mobility_swap USING btree (status varchar_pattern_ops);


--
-- Name: mobility_swap_subscription_id_434d3584; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_subscription_id_434d3584 ON public.mobility_swap USING btree (subscription_id);


--
-- Name: mobility_swap_vehicle_id_dd4c7deb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_swap_vehicle_id_dd4c7deb ON public.mobility_swap USING btree (vehicle_id);


--
-- Name: mobility_te_source_514142_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_te_source_514142_idx ON public.mobility_telemetryevent USING btree (source, recorded_at DESC);


--
-- Name: mobility_te_vehicle_bb8b83_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_te_vehicle_bb8b83_idx ON public.mobility_telemetryevent USING btree (vehicle_id, recorded_at DESC);


--
-- Name: mobility_telemetryevent_battery_id_a58cfcd1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_battery_id_a58cfcd1 ON public.mobility_telemetryevent USING btree (battery_id);


--
-- Name: mobility_telemetryevent_created_at_496d9d4c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_created_at_496d9d4c ON public.mobility_telemetryevent USING btree (created_at);


--
-- Name: mobility_telemetryevent_ingest_batch_560987d5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_ingest_batch_560987d5 ON public.mobility_telemetryevent USING btree (ingest_batch);


--
-- Name: mobility_telemetryevent_ingest_batch_560987d5_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_ingest_batch_560987d5_like ON public.mobility_telemetryevent USING btree (ingest_batch varchar_pattern_ops);


--
-- Name: mobility_telemetryevent_recorded_at_9e83f654; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_recorded_at_9e83f654 ON public.mobility_telemetryevent USING btree (recorded_at);


--
-- Name: mobility_telemetryevent_source_c0180d59; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_source_c0180d59 ON public.mobility_telemetryevent USING btree (source);


--
-- Name: mobility_telemetryevent_source_c0180d59_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_source_c0180d59_like ON public.mobility_telemetryevent USING btree (source varchar_pattern_ops);


--
-- Name: mobility_telemetryevent_vehicle_id_808a4cea; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_telemetryevent_vehicle_id_808a4cea ON public.mobility_telemetryevent USING btree (vehicle_id);


--
-- Name: mobility_ve_driver__e48341_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_ve_driver__e48341_idx ON public.mobility_vehicleassignment USING btree (driver_id, starts_at DESC);


--
-- Name: mobility_ve_status_74c0c4_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_ve_status_74c0c4_idx ON public.mobility_vehiclecommand USING btree (status, created_at DESC);


--
-- Name: mobility_ve_vehicle_09f6b0_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_ve_vehicle_09f6b0_idx ON public.mobility_vehicleassignment USING btree (vehicle_id, starts_at DESC);


--
-- Name: mobility_ve_vehicle_67d435_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_ve_vehicle_67d435_idx ON public.mobility_vehiclecommand USING btree (vehicle_id, created_at DESC);


--
-- Name: mobility_vehicle_account_id_5e67f97b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_account_id_5e67f97b ON public.mobility_vehicle USING btree (account_id);


--
-- Name: mobility_vehicle_acquisition_path_daadd227; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_acquisition_path_daadd227 ON public.mobility_vehicle USING btree (acquisition_path);


--
-- Name: mobility_vehicle_acquisition_path_daadd227_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_acquisition_path_daadd227_like ON public.mobility_vehicle USING btree (acquisition_path varchar_pattern_ops);


--
-- Name: mobility_vehicle_assigned_driver_id_24c74776; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_assigned_driver_id_24c74776 ON public.mobility_vehicle USING btree (assigned_driver_id);


--
-- Name: mobility_vehicle_created_at_5eb0f003; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_created_at_5eb0f003 ON public.mobility_vehicle USING btree (created_at);


--
-- Name: mobility_vehicle_hardware_id_df85d7c4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_hardware_id_df85d7c4_like ON public.mobility_vehicle USING btree (hardware_id varchar_pattern_ops);


--
-- Name: mobility_vehicle_iot_api_key_hash_74933280; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_iot_api_key_hash_74933280 ON public.mobility_vehicle USING btree (iot_api_key_hash);


--
-- Name: mobility_vehicle_iot_api_key_hash_74933280_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_iot_api_key_hash_74933280_like ON public.mobility_vehicle USING btree (iot_api_key_hash varchar_pattern_ops);


--
-- Name: mobility_vehicle_registration_plate_dec6d353_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_registration_plate_dec6d353_like ON public.mobility_vehicle USING btree (registration_plate varchar_pattern_ops);


--
-- Name: mobility_vehicle_vehicle_model_id_624d462e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_vehicle_model_id_624d462e ON public.mobility_vehicle USING btree (vehicle_model_id);


--
-- Name: mobility_vehicle_vin_58bd7c19; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_vin_58bd7c19 ON public.mobility_vehicle USING btree (vin);


--
-- Name: mobility_vehicle_vin_58bd7c19_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicle_vin_58bd7c19_like ON public.mobility_vehicle USING btree (vin varchar_pattern_ops);


--
-- Name: mobility_vehicleassignment_created_at_c049a4ac; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicleassignment_created_at_c049a4ac ON public.mobility_vehicleassignment USING btree (created_at);


--
-- Name: mobility_vehicleassignment_driver_id_eb64c8f2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicleassignment_driver_id_eb64c8f2 ON public.mobility_vehicleassignment USING btree (driver_id);


--
-- Name: mobility_vehicleassignment_ends_at_6afeabd0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicleassignment_ends_at_6afeabd0 ON public.mobility_vehicleassignment USING btree (ends_at);


--
-- Name: mobility_vehicleassignment_starts_at_268d7eda; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicleassignment_starts_at_268d7eda ON public.mobility_vehicleassignment USING btree (starts_at);


--
-- Name: mobility_vehicleassignment_vehicle_id_e8cde15d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehicleassignment_vehicle_id_e8cde15d ON public.mobility_vehicleassignment USING btree (vehicle_id);


--
-- Name: mobility_vehiclecommand_created_at_33d10411; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_created_at_33d10411 ON public.mobility_vehiclecommand USING btree (created_at);


--
-- Name: mobility_vehiclecommand_kind_6f41bdc4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_kind_6f41bdc4 ON public.mobility_vehiclecommand USING btree (kind);


--
-- Name: mobility_vehiclecommand_kind_6f41bdc4_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_kind_6f41bdc4_like ON public.mobility_vehiclecommand USING btree (kind varchar_pattern_ops);


--
-- Name: mobility_vehiclecommand_requested_by_id_b41772d7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_requested_by_id_b41772d7 ON public.mobility_vehiclecommand USING btree (requested_by_id);


--
-- Name: mobility_vehiclecommand_status_edbb6a28; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_status_edbb6a28 ON public.mobility_vehiclecommand USING btree (status);


--
-- Name: mobility_vehiclecommand_status_edbb6a28_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_status_edbb6a28_like ON public.mobility_vehiclecommand USING btree (status varchar_pattern_ops);


--
-- Name: mobility_vehiclecommand_vehicle_id_911e995a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclecommand_vehicle_id_911e995a ON public.mobility_vehiclecommand USING btree (vehicle_id);


--
-- Name: mobility_vehiclemodel_battery_type_id_24903d30; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclemodel_battery_type_id_24903d30 ON public.mobility_vehiclemodel USING btree (battery_type_id);


--
-- Name: mobility_vehiclemodel_created_at_266a6276; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mobility_vehiclemodel_created_at_266a6276 ON public.mobility_vehiclemodel USING btree (created_at);


--
-- Name: notificatio_user_id_05b4bc_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificatio_user_id_05b4bc_idx ON public.notifications_notification USING btree (user_id, created_at DESC);


--
-- Name: notificatio_user_id_47e85c_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificatio_user_id_47e85c_idx ON public.notifications_notification USING btree (user_id, read_at);


--
-- Name: notifications_notification_channel_47dcd7f9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_channel_47dcd7f9 ON public.notifications_notification USING btree (channel);


--
-- Name: notifications_notification_channel_47dcd7f9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_channel_47dcd7f9_like ON public.notifications_notification USING btree (channel varchar_pattern_ops);


--
-- Name: notifications_notification_created_at_10160fdd; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_created_at_10160fdd ON public.notifications_notification USING btree (created_at);


--
-- Name: notifications_notification_dedupe_key_f195c156; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_dedupe_key_f195c156 ON public.notifications_notification USING btree (dedupe_key);


--
-- Name: notifications_notification_dedupe_key_f195c156_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_dedupe_key_f195c156_like ON public.notifications_notification USING btree (dedupe_key varchar_pattern_ops);


--
-- Name: notifications_notification_severity_8b7732c1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_severity_8b7732c1 ON public.notifications_notification USING btree (severity);


--
-- Name: notifications_notification_severity_8b7732c1_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_severity_8b7732c1_like ON public.notifications_notification USING btree (severity varchar_pattern_ops);


--
-- Name: notifications_notification_source_ad302e40; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_source_ad302e40 ON public.notifications_notification USING btree (source);


--
-- Name: notifications_notification_source_ad302e40_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_source_ad302e40_like ON public.notifications_notification USING btree (source varchar_pattern_ops);


--
-- Name: notifications_notification_status_fc366839; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_status_fc366839 ON public.notifications_notification USING btree (status);


--
-- Name: notifications_notification_status_fc366839_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_status_fc366839_like ON public.notifications_notification USING btree (status varchar_pattern_ops);


--
-- Name: notifications_notification_user_id_b5e8c0ff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_notification_user_id_b5e8c0ff ON public.notifications_notification USING btree (user_id);


--
-- Name: operations__hub_id_76e120_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations__hub_id_76e120_idx ON public.operations_alert USING btree (hub_id, created_at DESC);


--
-- Name: operations__hub_id_e62b34_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations__hub_id_e62b34_idx ON public.operations_cashdeposit USING btree (hub_id, created_at DESC);


--
-- Name: operations__shift_i_e80044_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations__shift_i_e80044_idx ON public.operations_cashdeposit USING btree (shift_id, status);


--
-- Name: operations__status_bc6b23_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations__status_bc6b23_idx ON public.operations_alert USING btree (status, severity, created_at DESC);


--
-- Name: operations_alert_acknowledged_by_id_b4835707; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_acknowledged_by_id_b4835707 ON public.operations_alert USING btree (acknowledged_by_id);


--
-- Name: operations_alert_created_at_1d4f0e6b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_created_at_1d4f0e6b ON public.operations_alert USING btree (created_at);


--
-- Name: operations_alert_hub_id_2168df94; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_hub_id_2168df94 ON public.operations_alert USING btree (hub_id);


--
-- Name: operations_alert_is_resolved_7cf94927; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_is_resolved_7cf94927 ON public.operations_alert USING btree (is_resolved);


--
-- Name: operations_alert_resolved_by_id_85a22a72; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_resolved_by_id_85a22a72 ON public.operations_alert USING btree (resolved_by_id);


--
-- Name: operations_alert_status_cb753bce; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_status_cb753bce ON public.operations_alert USING btree (status);


--
-- Name: operations_alert_status_cb753bce_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alert_status_cb753bce_like ON public.operations_alert USING btree (status varchar_pattern_ops);


--
-- Name: operations_alertrule_created_at_2205f050; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_created_at_2205f050 ON public.operations_alertrule USING btree (created_at);


--
-- Name: operations_alertrule_created_by_id_d1b5f128; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_created_by_id_d1b5f128 ON public.operations_alertrule USING btree (created_by_id);


--
-- Name: operations_alertrule_kind_b118d8f3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_kind_b118d8f3 ON public.operations_alertrule USING btree (kind);


--
-- Name: operations_alertrule_kind_b118d8f3_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_kind_b118d8f3_like ON public.operations_alertrule USING btree (kind varchar_pattern_ops);


--
-- Name: operations_alertrule_status_b8c4642b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_status_b8c4642b ON public.operations_alertrule USING btree (status);


--
-- Name: operations_alertrule_status_b8c4642b_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_alertrule_status_b8c4642b_like ON public.operations_alertrule USING btree (status varchar_pattern_ops);


--
-- Name: operations_cashdeposit_account_id_8e0e0ab2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_account_id_8e0e0ab2 ON public.operations_cashdeposit USING btree (account_id);


--
-- Name: operations_cashdeposit_agent_id_889b57a0; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_agent_id_889b57a0 ON public.operations_cashdeposit USING btree (agent_id);


--
-- Name: operations_cashdeposit_created_at_c0a4b639; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_created_at_c0a4b639 ON public.operations_cashdeposit USING btree (created_at);


--
-- Name: operations_cashdeposit_hub_id_5b610798; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_hub_id_5b610798 ON public.operations_cashdeposit USING btree (hub_id);


--
-- Name: operations_cashdeposit_idempotency_key_36865690_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_idempotency_key_36865690_like ON public.operations_cashdeposit USING btree (idempotency_key varchar_pattern_ops);


--
-- Name: operations_cashdeposit_payment_id_dfdc24ef; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_payment_id_dfdc24ef ON public.operations_cashdeposit USING btree (payment_id);


--
-- Name: operations_cashdeposit_purpose_3c9bd609; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_purpose_3c9bd609 ON public.operations_cashdeposit USING btree (purpose);


--
-- Name: operations_cashdeposit_purpose_3c9bd609_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_purpose_3c9bd609_like ON public.operations_cashdeposit USING btree (purpose varchar_pattern_ops);


--
-- Name: operations_cashdeposit_receipt_code_94323545_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_receipt_code_94323545_like ON public.operations_cashdeposit USING btree (receipt_code varchar_pattern_ops);


--
-- Name: operations_cashdeposit_shift_id_00663616; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_shift_id_00663616 ON public.operations_cashdeposit USING btree (shift_id);


--
-- Name: operations_cashdeposit_status_eebadf8a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_status_eebadf8a ON public.operations_cashdeposit USING btree (status);


--
-- Name: operations_cashdeposit_status_eebadf8a_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_cashdeposit_status_eebadf8a_like ON public.operations_cashdeposit USING btree (status varchar_pattern_ops);


--
-- Name: operations_inventorycount_created_at_ab75d726; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_inventorycount_created_at_ab75d726 ON public.operations_inventorycount USING btree (created_at);


--
-- Name: operations_inventorycount_hub_id_d966d023; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_inventorycount_hub_id_d966d023 ON public.operations_inventorycount USING btree (hub_id);


--
-- Name: operations_inventorycount_shift_id_afc89c37; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_inventorycount_shift_id_afc89c37 ON public.operations_inventorycount USING btree (shift_id);


--
-- Name: operations_inventorycount_signed_by_id_a73ea2e5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_inventorycount_signed_by_id_a73ea2e5 ON public.operations_inventorycount USING btree (signed_by_id);


--
-- Name: operations_override_agent_id_9ee3d897; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_override_agent_id_9ee3d897 ON public.operations_override USING btree (agent_id);


--
-- Name: operations_override_created_at_1b44d5c6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_override_created_at_1b44d5c6 ON public.operations_override USING btree (created_at);


--
-- Name: operations_shift_agent_id_fb2d7457; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_shift_agent_id_fb2d7457 ON public.operations_shift USING btree (agent_id);


--
-- Name: operations_shift_created_at_fdc80535; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_shift_created_at_fdc80535 ON public.operations_shift USING btree (created_at);


--
-- Name: operations_shift_hub_id_721b4b2d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_shift_hub_id_721b4b2d ON public.operations_shift USING btree (hub_id);


--
-- Name: risk_riskev_account_1fb8ba_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskev_account_1fb8ba_idx ON public.risk_riskevent USING btree (account_id, created_at DESC);


--
-- Name: risk_riskev_status_17ad9e_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskev_status_17ad9e_idx ON public.risk_riskevent USING btree (status, severity);


--
-- Name: risk_riskev_subject_ad1f0e_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskev_subject_ad1f0e_idx ON public.risk_riskevent USING btree (subject_type, subject_id, created_at DESC);


--
-- Name: risk_riskevent_account_id_b0c03b73; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_account_id_b0c03b73 ON public.risk_riskevent USING btree (account_id);


--
-- Name: risk_riskevent_created_at_633069c7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_created_at_633069c7 ON public.risk_riskevent USING btree (created_at);


--
-- Name: risk_riskevent_reviewed_by_id_cec0afbc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_reviewed_by_id_cec0afbc ON public.risk_riskevent USING btree (reviewed_by_id);


--
-- Name: risk_riskevent_rule_id_8e517eb3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_rule_id_8e517eb3 ON public.risk_riskevent USING btree (rule_id);


--
-- Name: risk_riskevent_severity_5c4ea4c9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_severity_5c4ea4c9 ON public.risk_riskevent USING btree (severity);


--
-- Name: risk_riskevent_severity_5c4ea4c9_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_severity_5c4ea4c9_like ON public.risk_riskevent USING btree (severity varchar_pattern_ops);


--
-- Name: risk_riskevent_status_2e199ed2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_status_2e199ed2 ON public.risk_riskevent USING btree (status);


--
-- Name: risk_riskevent_status_2e199ed2_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_status_2e199ed2_like ON public.risk_riskevent USING btree (status varchar_pattern_ops);


--
-- Name: risk_riskevent_subject_id_89945208; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_subject_id_89945208 ON public.risk_riskevent USING btree (subject_id);


--
-- Name: risk_riskevent_subject_id_89945208_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_subject_id_89945208_like ON public.risk_riskevent USING btree (subject_id varchar_pattern_ops);


--
-- Name: risk_riskevent_subject_type_7306fc80; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_subject_type_7306fc80 ON public.risk_riskevent USING btree (subject_type);


--
-- Name: risk_riskevent_subject_type_7306fc80_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskevent_subject_type_7306fc80_like ON public.risk_riskevent USING btree (subject_type varchar_pattern_ops);


--
-- Name: risk_riskrule_code_0fa75e9e_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskrule_code_0fa75e9e_like ON public.risk_riskrule USING btree (code varchar_pattern_ops);


--
-- Name: risk_riskrule_created_at_c19a7f9e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskrule_created_at_c19a7f9e ON public.risk_riskrule USING btree (created_at);


--
-- Name: risk_riskrule_enabled_48ae0a3d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskrule_enabled_48ae0a3d ON public.risk_riskrule USING btree (enabled);


--
-- Name: risk_riskve_vehicle_fc459f_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskve_vehicle_fc459f_idx ON public.risk_riskvelocitygrant USING btree (vehicle_id, status, expires_at);


--
-- Name: risk_riskvelocitygrant_account_id_436db1f5; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_account_id_436db1f5 ON public.risk_riskvelocitygrant USING btree (account_id);


--
-- Name: risk_riskvelocitygrant_created_at_1a07575f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_created_at_1a07575f ON public.risk_riskvelocitygrant USING btree (created_at);


--
-- Name: risk_riskvelocitygrant_expires_at_1acc313f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_expires_at_1acc313f ON public.risk_riskvelocitygrant USING btree (expires_at);


--
-- Name: risk_riskvelocitygrant_granted_by_id_3354a125; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_granted_by_id_3354a125 ON public.risk_riskvelocitygrant USING btree (granted_by_id);


--
-- Name: risk_riskvelocitygrant_risk_event_id_d1341094; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_risk_event_id_d1341094 ON public.risk_riskvelocitygrant USING btree (risk_event_id);


--
-- Name: risk_riskvelocitygrant_status_74e9684f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_status_74e9684f ON public.risk_riskvelocitygrant USING btree (status);


--
-- Name: risk_riskvelocitygrant_status_74e9684f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_status_74e9684f_like ON public.risk_riskvelocitygrant USING btree (status varchar_pattern_ops);


--
-- Name: risk_riskvelocitygrant_vehicle_id_4deb5b04; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX risk_riskvelocitygrant_vehicle_id_4deb5b04 ON public.risk_riskvelocitygrant USING btree (vehicle_id);


--
-- Name: support_caseevent_actor_id_a63cf518; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_caseevent_actor_id_a63cf518 ON public.support_caseevent USING btree (actor_id);


--
-- Name: support_caseevent_attachment_id_c9c35a43; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_caseevent_attachment_id_c9c35a43 ON public.support_caseevent USING btree (attachment_id);


--
-- Name: support_caseevent_case_id_81651fb3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_caseevent_case_id_81651fb3 ON public.support_caseevent USING btree (case_id);


--
-- Name: support_caseevent_created_at_e44dac73; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_caseevent_created_at_e44dac73 ON public.support_caseevent USING btree (created_at);


--
-- Name: support_sup_account_969da0_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_sup_account_969da0_idx ON public.support_supportcase USING btree (account_id, created_at DESC);


--
-- Name: support_sup_payment_e0d97a_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_sup_payment_e0d97a_idx ON public.support_supportcase USING btree (payment_id);


--
-- Name: support_sup_status_f650af_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_sup_status_f650af_idx ON public.support_supportcase USING btree (status, priority);


--
-- Name: support_supportcase_account_id_03b504b3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_account_id_03b504b3 ON public.support_supportcase USING btree (account_id);


--
-- Name: support_supportcase_assigned_to_id_c32ea44f; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_assigned_to_id_c32ea44f ON public.support_supportcase USING btree (assigned_to_id);


--
-- Name: support_supportcase_code_f4517eb2_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_code_f4517eb2_like ON public.support_supportcase USING btree (code varchar_pattern_ops);


--
-- Name: support_supportcase_created_at_d618321c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_created_at_d618321c ON public.support_supportcase USING btree (created_at);


--
-- Name: support_supportcase_driver_id_cb6fdb2c; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_driver_id_cb6fdb2c ON public.support_supportcase USING btree (driver_id);


--
-- Name: support_supportcase_opened_by_id_aafba941; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_opened_by_id_aafba941 ON public.support_supportcase USING btree (opened_by_id);


--
-- Name: support_supportcase_payment_id_c37f15e8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_payment_id_c37f15e8 ON public.support_supportcase USING btree (payment_id);


--
-- Name: support_supportcase_priority_4dd0ef28; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_priority_4dd0ef28 ON public.support_supportcase USING btree (priority);


--
-- Name: support_supportcase_priority_4dd0ef28_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_priority_4dd0ef28_like ON public.support_supportcase USING btree (priority varchar_pattern_ops);


--
-- Name: support_supportcase_status_8ca80cff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_status_8ca80cff ON public.support_supportcase USING btree (status);


--
-- Name: support_supportcase_status_8ca80cff_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_supportcase_status_8ca80cff_like ON public.support_supportcase USING btree (status varchar_pattern_ops);


--
-- Name: token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_jti_hex_d9bdf6f7_like ON public.token_blacklist_outstandingtoken USING btree (jti varchar_pattern_ops);


--
-- Name: token_blacklist_outstandingtoken_user_id_83bc629a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX token_blacklist_outstandingtoken_user_id_83bc629a ON public.token_blacklist_outstandingtoken USING btree (user_id);


--
-- Name: uniq_active_consent_per_purpose; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_active_consent_per_purpose ON public.accounts_consent USING btree (account_id, purpose) WHERE (withdrawn_at IS NULL);


--
-- Name: uniq_active_subscription_per_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_active_subscription_per_vehicle ON public.mobility_subscription USING btree (vehicle_id) WHERE ((status)::text = 'ACTIVE'::text);


--
-- Name: uniq_notification_user_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_notification_user_dedupe ON public.notifications_notification USING btree (user_id, dedupe_key) WHERE (NOT ((dedupe_key)::text = ''::text));


--
-- Name: uniq_open_vehicle_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_open_vehicle_assignment ON public.mobility_vehicleassignment USING btree (vehicle_id) WHERE (ends_at IS NULL);


--
-- Name: uniq_swap_client_event_id_nonzero; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_swap_client_event_id_nonzero ON public.mobility_swap USING btree (client_event_id) WHERE (NOT ((client_event_id)::text = ''::text));


--
-- Name: accounts_account accounts_account_cooperative_id_fc5ead08_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_account
    ADD CONSTRAINT accounts_account_cooperative_id_fc5ead08_fk_accounts_ FOREIGN KEY (cooperative_id) REFERENCES public.accounts_cooperative(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_account accounts_account_owner_user_id_3134924b_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_account
    ADD CONSTRAINT accounts_account_owner_user_id_3134924b_fk_accounts_user_id FOREIGN KEY (owner_user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_consent accounts_consent_account_id_80eeeb4e_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_consent
    ADD CONSTRAINT accounts_consent_account_id_80eeeb4e_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_cooperative accounts_cooperative_chairman_user_id_7a759ed5_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_cooperative
    ADD CONSTRAINT accounts_cooperative_chairman_user_id_7a759ed5_fk_accounts_ FOREIGN KEY (chairman_user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_driver accounts_driver_account_id_951c036e_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_driver
    ADD CONSTRAINT accounts_driver_account_id_951c036e_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_driver accounts_driver_photo_id_9522e5e2_fk_core_mediaasset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_driver
    ADD CONSTRAINT accounts_driver_photo_id_9522e5e2_fk_core_mediaasset_id FOREIGN KEY (photo_id) REFERENCES public.core_mediaasset(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_driver accounts_driver_user_id_193e1fcf_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_driver
    ADD CONSTRAINT accounts_driver_user_id_193e1fcf_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_identitydocument accounts_identitydoc_account_id_b961223f_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_identitydocument
    ADD CONSTRAINT accounts_identitydoc_account_id_b961223f_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_identitydocument accounts_identitydoc_back_image_id_cdbbf59d_fk_core_medi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_identitydocument
    ADD CONSTRAINT accounts_identitydoc_back_image_id_cdbbf59d_fk_core_medi FOREIGN KEY (back_image_id) REFERENCES public.core_mediaasset(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_identitydocument accounts_identitydoc_front_image_id_e2aa763a_fk_core_medi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_identitydocument
    ADD CONSTRAINT accounts_identitydoc_front_image_id_e2aa763a_fk_core_medi FOREIGN KEY (front_image_id) REFERENCES public.core_mediaasset(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_passwordsetuptoken accounts_passwordset_user_id_c108c7ad_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_passwordsetuptoken
    ADD CONSTRAINT accounts_passwordset_user_id_c108c7ad_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_role_permissions accounts_role_permis_permission_id_76fe677d_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role_permissions
    ADD CONSTRAINT accounts_role_permis_permission_id_76fe677d_fk_accounts_ FOREIGN KEY (permission_id) REFERENCES public.accounts_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_role_permissions accounts_role_permissions_role_id_54f107a6_fk_accounts_role_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_role_permissions
    ADD CONSTRAINT accounts_role_permissions_role_id_54f107a6_fk_accounts_role_id FOREIGN KEY (role_id) REFERENCES public.accounts_role(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_staffmembership accounts_staffmembership_user_id_85d025a6_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_staffmembership
    ADD CONSTRAINT accounts_staffmembership_user_id_85d025a6_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_trusteddevice accounts_trusteddevi_account_id_b08bb30c_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_trusteddevice
    ADD CONSTRAINT accounts_trusteddevi_account_id_b08bb30c_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user accounts_user_assigned_role_id_a4b7cea6_fk_accounts_role_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_assigned_role_id_a4b7cea6_fk_accounts_role_id FOREIGN KEY (assigned_role_id) REFERENCES public.accounts_role(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user accounts_user_avatar_id_5ce2f0b3_fk_core_mediaasset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user
    ADD CONSTRAINT accounts_user_avatar_id_5ce2f0b3_fk_core_mediaasset_id FOREIGN KEY (avatar_id) REFERENCES public.core_mediaasset(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_group_id_bd11a704_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_group_id_bd11a704_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_groups accounts_user_groups_user_id_52b62117_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_groups
    ADD CONSTRAINT accounts_user_groups_user_id_52b62117_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_permission_id_113bb443_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_permission_id_113bb443_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: accounts_user_user_permissions accounts_user_user_p_user_id_e4f0a161_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_user_user_permissions
    ADD CONSTRAINT accounts_user_user_p_user_id_e4f0a161_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: analytics_dailyaccountmetric analytics_dailyaccou_account_id_20cb8842_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyaccountmetric
    ADD CONSTRAINT analytics_dailyaccou_account_id_20cb8842_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: analytics_dailyhubmetric analytics_dailyhubmetric_hub_id_6d7958dc_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_dailyhubmetric
    ADD CONSTRAINT analytics_dailyhubmetric_hub_id_6d7958dc_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: analytics_impactstory analytics_impactstor_created_by_id_73c86aff_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_impactstory
    ADD CONSTRAINT analytics_impactstor_created_by_id_73c86aff_fk_accounts_ FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: analytics_reportjob analytics_reportjob_requested_by_id_60ac0241_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_reportjob
    ADD CONSTRAINT analytics_reportjob_requested_by_id_60ac0241_fk_accounts_ FOREIGN KEY (requested_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: audit_auditevent audit_auditevent_actor_id_270bb4b7_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_auditevent
    ADD CONSTRAINT audit_auditevent_actor_id_270bb4b7_fk_accounts_user_id FOREIGN KEY (actor_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: core_configversion core_configversion_approved_by_id_afe16f19_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_configversion
    ADD CONSTRAINT core_configversion_approved_by_id_afe16f19_fk_accounts_user_id FOREIGN KEY (approved_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: core_configversion core_configversion_created_by_id_bfdbb320_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_configversion
    ADD CONSTRAINT core_configversion_created_by_id_bfdbb320_fk_accounts_user_id FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: core_mediaasset core_mediaasset_uploaded_by_id_3edc7410_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_mediaasset
    ADD CONSTRAINT core_mediaasset_uploaded_by_id_3edc7410_fk_accounts_user_id FOREIGN KEY (uploaded_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditapplication credit_creditapplica_account_id_68b6c8ea_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditapplication
    ADD CONSTRAINT credit_creditapplica_account_id_68b6c8ea_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditapplication credit_creditapplica_credit_line_id_5d10ddfc_fk_credit_cr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditapplication
    ADD CONSTRAINT credit_creditapplica_credit_line_id_5d10ddfc_fk_credit_cr FOREIGN KEY (credit_line_id) REFERENCES public.credit_creditline(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditapplication credit_creditapplica_decided_by_id_d006f060_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditapplication
    ADD CONSTRAINT credit_creditapplica_decided_by_id_d006f060_fk_accounts_ FOREIGN KEY (decided_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditline credit_creditline_account_id_aa8163c2_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditline
    ADD CONSTRAINT credit_creditline_account_id_aa8163c2_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditline credit_creditline_score_id_750d2bd3_fk_credit_creditscore_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditline
    ADD CONSTRAINT credit_creditline_score_id_750d2bd3_fk_credit_creditscore_id FOREIGN KEY (score_id) REFERENCES public.credit_creditscore(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditscore credit_creditscore_account_id_0f63dd3a_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditscore
    ADD CONSTRAINT credit_creditscore_account_id_0f63dd3a_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_creditscore credit_creditscore_override_by_id_e8dacc4d_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_creditscore
    ADD CONSTRAINT credit_creditscore_override_by_id_e8dacc4d_fk_accounts_user_id FOREIGN KEY (override_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_loan credit_loan_account_id_4e689ad3_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loan
    ADD CONSTRAINT credit_loan_account_id_4e689ad3_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_loan credit_loan_application_id_cc306a36_fk_credit_cr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loan
    ADD CONSTRAINT credit_loan_application_id_cc306a36_fk_credit_cr FOREIGN KEY (application_id) REFERENCES public.credit_creditapplication(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_loanrepayment credit_loanrepayment_loan_id_d61ba5cc_fk_credit_loan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loanrepayment
    ADD CONSTRAINT credit_loanrepayment_loan_id_d61ba5cc_fk_credit_loan_id FOREIGN KEY (loan_id) REFERENCES public.credit_loan(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_loanrepayment credit_loanrepayment_payment_id_e1d5ba42_fk_finance_payment_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_loanrepayment
    ADD CONSTRAINT credit_loanrepayment_payment_id_e1d5ba42_fk_finance_payment_id FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_offerassignment credit_offerassignme_account_id_4dffee9d_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_offerassignment
    ADD CONSTRAINT credit_offerassignme_account_id_4dffee9d_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: credit_offerassignment credit_offerassignme_offer_id_f2d7fc28_fk_credit_pr; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_offerassignment
    ADD CONSTRAINT credit_offerassignme_offer_id_f2d7fc28_fk_credit_pr FOREIGN KEY (offer_id) REFERENCES public.credit_productoffer(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_ledgerentry finance_ledgerentry_ledger_account_id_41f3c4d3_fk_finance_l; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgerentry
    ADD CONSTRAINT finance_ledgerentry_ledger_account_id_41f3c4d3_fk_finance_l FOREIGN KEY (ledger_account_id) REFERENCES public.finance_ledgeraccount(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_ledgerentry finance_ledgerentry_transaction_id_0041b384_fk_finance_l; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_ledgerentry
    ADD CONSTRAINT finance_ledgerentry_transaction_id_0041b384_fk_finance_l FOREIGN KEY (transaction_id) REFERENCES public.finance_ledgertransaction(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_payment finance_payment_account_id_8bcb6de1_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_account_id_8bcb6de1_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_payment finance_payment_hub_id_b840a14c_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_payment
    ADD CONSTRAINT finance_payment_hub_id_b840a14c_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_virtualaccount finance_virtualaccou_account_id_22e4927a_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_virtualaccount
    ADD CONSTRAINT finance_virtualaccou_account_id_22e4927a_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: finance_wallet finance_wallet_account_id_b4289ace_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_wallet
    ADD CONSTRAINT finance_wallet_account_id_b4289ace_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_battery mobility_battery_battery_type_id_4b42080a_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_battery
    ADD CONSTRAINT mobility_battery_battery_type_id_4b42080a_fk_mobility_ FOREIGN KEY (battery_type_id) REFERENCES public.mobility_batterytype(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_battery mobility_battery_current_hub_id_778a38a8_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_battery
    ADD CONSTRAINT mobility_battery_current_hub_id_778a38a8_fk_mobility_hub_id FOREIGN KEY (current_hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batteryevent mobility_batteryeven_battery_id_14714f81_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batteryevent
    ADD CONSTRAINT mobility_batteryeven_battery_id_14714f81_fk_mobility_ FOREIGN KEY (battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batteryevent mobility_batteryevent_actor_id_b4b84170_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batteryevent
    ADD CONSTRAINT mobility_batteryevent_actor_id_b4b84170_fk_accounts_user_id FOREIGN KEY (actor_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batteryevent mobility_batteryevent_hub_id_bfc4199d_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batteryevent
    ADD CONSTRAINT mobility_batteryevent_hub_id_bfc4199d_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batteryevent mobility_batteryevent_swap_id_d2786820_fk_mobility_swap_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batteryevent
    ADD CONSTRAINT mobility_batteryevent_swap_id_d2786820_fk_mobility_swap_id FOREIGN KEY (swap_id) REFERENCES public.mobility_swap(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batterytype mobility_batterytype_approved_by_id_0fc5e975_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batterytype
    ADD CONSTRAINT mobility_batterytype_approved_by_id_0fc5e975_fk_accounts_ FOREIGN KEY (approved_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_batterytype mobility_batterytype_created_by_id_22401b8a_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_batterytype
    ADD CONSTRAINT mobility_batterytype_created_by_id_22401b8a_fk_accounts_user_id FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountcampaign mobility_discountcam_approved_by_id_4794e559_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountcampaign
    ADD CONSTRAINT mobility_discountcam_approved_by_id_4794e559_fk_accounts_ FOREIGN KEY (approved_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountcampaign mobility_discountcam_created_by_id_6021a956_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountcampaign
    ADD CONSTRAINT mobility_discountcam_created_by_id_6021a956_fk_accounts_ FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountredemption mobility_discountred_account_id_b226e7f7_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountred_account_id_b226e7f7_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountredemption mobility_discountred_discount_id_3a1afe6f_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountred_discount_id_3a1afe6f_fk_mobility_ FOREIGN KEY (discount_id) REFERENCES public.mobility_discountcampaign(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountredemption mobility_discountred_payment_id_2f970af5_fk_finance_p; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountred_payment_id_2f970af5_fk_finance_p FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_discountredemption mobility_discountred_subscription_id_7666c37c_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_discountredemption
    ADD CONSTRAINT mobility_discountred_subscription_id_7666c37c_fk_mobility_ FOREIGN KEY (subscription_id) REFERENCES public.mobility_subscription(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_eboarder mobility_eboarder_account_id_42ed96e8_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_account_id_42ed96e8_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_eboarder mobility_eboarder_battery_type_id_4a7a0ee5_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_battery_type_id_4a7a0ee5_fk_mobility_ FOREIGN KEY (battery_type_id) REFERENCES public.mobility_batterytype(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_eboarder mobility_eboarder_current_hub_id_46f79988_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_current_hub_id_46f79988_fk_mobility_hub_id FOREIGN KEY (current_hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_eboarder mobility_eboarder_vehicle_id_4b0a0161_fk_mobility_vehicle_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_eboarder
    ADD CONSTRAINT mobility_eboarder_vehicle_id_4b0a0161_fk_mobility_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_hubslot mobility_hubslot_battery_id_120fe65e_fk_mobility_battery_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hubslot
    ADD CONSTRAINT mobility_hubslot_battery_id_120fe65e_fk_mobility_battery_id FOREIGN KEY (battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_hubslot mobility_hubslot_hub_id_760048fc_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_hubslot
    ADD CONSTRAINT mobility_hubslot_hub_id_760048fc_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_petrolengine mobility_petrolengin_account_id_9647b1eb_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengin_account_id_9647b1eb_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_petrolengine mobility_petrolengin_intake_agent_id_f58ae49e_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengin_intake_agent_id_f58ae49e_fk_accounts_ FOREIGN KEY (intake_agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_petrolengine mobility_petrolengin_intake_witness_id_b21330a0_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengin_intake_witness_id_b21330a0_fk_accounts_ FOREIGN KEY (intake_witness_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_petrolengine mobility_petrolengin_release_by_id_666e8247_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengin_release_by_id_666e8247_fk_accounts_ FOREIGN KEY (release_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_petrolengine mobility_petrolengin_storage_hub_id_0ade7245_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_petrolengine
    ADD CONSTRAINT mobility_petrolengin_storage_hub_id_0ade7245_fk_mobility_ FOREIGN KEY (storage_hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_pricematrix mobility_pricematrix_approved_by_id_c7e13db5_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_pricematrix
    ADD CONSTRAINT mobility_pricematrix_approved_by_id_c7e13db5_fk_accounts_ FOREIGN KEY (approved_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_pricematrix mobility_pricematrix_created_by_id_5cf6b971_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_pricematrix
    ADD CONSTRAINT mobility_pricematrix_created_by_id_5cf6b971_fk_accounts_user_id FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_reservation mobility_reservation_account_id_7e7f3ce8_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_account_id_7e7f3ce8_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_reservation mobility_reservation_battery_id_f2c890f6_fk_mobility_battery_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_battery_id_f2c890f6_fk_mobility_battery_id FOREIGN KEY (battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_reservation mobility_reservation_driver_id_e9542c1f_fk_accounts_driver_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_driver_id_e9542c1f_fk_accounts_driver_id FOREIGN KEY (driver_id) REFERENCES public.accounts_driver(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_reservation mobility_reservation_hub_id_40ab37f2_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_hub_id_40ab37f2_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_reservation mobility_reservation_vehicle_id_3af14f27_fk_mobility_vehicle_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_reservation
    ADD CONSTRAINT mobility_reservation_vehicle_id_3af14f27_fk_mobility_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_retrofit mobility_retrofit_account_id_59e99611_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_account_id_59e99611_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_retrofit mobility_retrofit_agent_id_301da066_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_agent_id_301da066_fk_accounts_user_id FOREIGN KEY (agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_retrofit mobility_retrofit_eboarder_id_d5f7682a_fk_mobility_eboarder_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_eboarder_id_d5f7682a_fk_mobility_eboarder_id FOREIGN KEY (eboarder_id) REFERENCES public.mobility_eboarder(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_retrofit mobility_retrofit_petrol_engine_id_0956fb53_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_petrol_engine_id_0956fb53_fk_mobility_ FOREIGN KEY (petrol_engine_id) REFERENCES public.mobility_petrolengine(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_retrofit mobility_retrofit_vehicle_id_1e54cacf_fk_mobility_vehicle_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_retrofit
    ADD CONSTRAINT mobility_retrofit_vehicle_id_1e54cacf_fk_mobility_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_subscription mobility_subscriptio_account_id_5e3229c2_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscriptio_account_id_5e3229c2_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_subscription mobility_subscriptio_queued_plan_id_10a91c39_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscriptio_queued_plan_id_10a91c39_fk_mobility_ FOREIGN KEY (queued_plan_id) REFERENCES public.mobility_plan(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_subscription mobility_subscriptio_vehicle_id_625da0a2_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscriptio_vehicle_id_625da0a2_fk_mobility_ FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_subscription mobility_subscription_payment_id_c49e8c7c_fk_finance_payment_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscription_payment_id_c49e8c7c_fk_finance_payment_id FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_subscription mobility_subscription_plan_id_161f3bb9_fk_mobility_plan_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_subscription
    ADD CONSTRAINT mobility_subscription_plan_id_161f3bb9_fk_mobility_plan_id FOREIGN KEY (plan_id) REFERENCES public.mobility_plan(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_account_id_e2e1289f_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_account_id_e2e1289f_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_agent_id_85062566_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_agent_id_85062566_fk_accounts_user_id FOREIGN KEY (agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_driver_id_da1bab26_fk_accounts_driver_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_driver_id_da1bab26_fk_accounts_driver_id FOREIGN KEY (driver_id) REFERENCES public.accounts_driver(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_hub_id_d508fa0d_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_hub_id_d508fa0d_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_issued_battery_id_b3828980_fk_mobility_battery_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_issued_battery_id_b3828980_fk_mobility_battery_id FOREIGN KEY (issued_battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_payment_id_c66c955e_fk_finance_payment_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_payment_id_c66c955e_fk_finance_payment_id FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_reservation_id_063cf643_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_reservation_id_063cf643_fk_mobility_ FOREIGN KEY (reservation_id) REFERENCES public.mobility_reservation(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_returned_battery_id_5d634979_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_returned_battery_id_5d634979_fk_mobility_ FOREIGN KEY (returned_battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_subscription_id_434d3584_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_subscription_id_434d3584_fk_mobility_ FOREIGN KEY (subscription_id) REFERENCES public.mobility_subscription(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_swap mobility_swap_vehicle_id_dd4c7deb_fk_mobility_vehicle_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_swap
    ADD CONSTRAINT mobility_swap_vehicle_id_dd4c7deb_fk_mobility_vehicle_id FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_telemetryevent mobility_telemetryev_battery_id_a58cfcd1_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_telemetryevent
    ADD CONSTRAINT mobility_telemetryev_battery_id_a58cfcd1_fk_mobility_ FOREIGN KEY (battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_telemetryevent mobility_telemetryev_vehicle_id_808a4cea_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_telemetryevent
    ADD CONSTRAINT mobility_telemetryev_vehicle_id_808a4cea_fk_mobility_ FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicle mobility_vehicle_account_id_5e67f97b_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_account_id_5e67f97b_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicle mobility_vehicle_assigned_driver_id_24c74776_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_assigned_driver_id_24c74776_fk_accounts_ FOREIGN KEY (assigned_driver_id) REFERENCES public.accounts_driver(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicle mobility_vehicle_current_battery_id_80dc4067_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_current_battery_id_80dc4067_fk_mobility_ FOREIGN KEY (current_battery_id) REFERENCES public.mobility_battery(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicle mobility_vehicle_petrol_engine_id_66bda096_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_petrol_engine_id_66bda096_fk_mobility_ FOREIGN KEY (petrol_engine_id) REFERENCES public.mobility_petrolengine(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicle mobility_vehicle_vehicle_model_id_624d462e_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicle
    ADD CONSTRAINT mobility_vehicle_vehicle_model_id_624d462e_fk_mobility_ FOREIGN KEY (vehicle_model_id) REFERENCES public.mobility_vehiclemodel(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicleassignment mobility_vehicleassi_driver_id_eb64c8f2_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicleassignment
    ADD CONSTRAINT mobility_vehicleassi_driver_id_eb64c8f2_fk_accounts_ FOREIGN KEY (driver_id) REFERENCES public.accounts_driver(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehicleassignment mobility_vehicleassi_vehicle_id_e8cde15d_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehicleassignment
    ADD CONSTRAINT mobility_vehicleassi_vehicle_id_e8cde15d_fk_mobility_ FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehiclecommand mobility_vehiclecomm_requested_by_id_b41772d7_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclecommand
    ADD CONSTRAINT mobility_vehiclecomm_requested_by_id_b41772d7_fk_accounts_ FOREIGN KEY (requested_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehiclecommand mobility_vehiclecomm_vehicle_id_911e995a_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclecommand
    ADD CONSTRAINT mobility_vehiclecomm_vehicle_id_911e995a_fk_mobility_ FOREIGN KEY (vehicle_id) REFERENCES public.mobility_vehicle(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: mobility_vehiclemodel mobility_vehiclemode_battery_type_id_24903d30_fk_mobility_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mobility_vehiclemodel
    ADD CONSTRAINT mobility_vehiclemode_battery_type_id_24903d30_fk_mobility_ FOREIGN KEY (battery_type_id) REFERENCES public.mobility_batterytype(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: notifications_notification notifications_notification_user_id_b5e8c0ff_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications_notification
    ADD CONSTRAINT notifications_notification_user_id_b5e8c0ff_fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_alert operations_alert_acknowledged_by_id_b4835707_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alert
    ADD CONSTRAINT operations_alert_acknowledged_by_id_b4835707_fk_accounts_ FOREIGN KEY (acknowledged_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_alert operations_alert_hub_id_2168df94_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alert
    ADD CONSTRAINT operations_alert_hub_id_2168df94_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_alert operations_alert_resolved_by_id_85a22a72_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alert
    ADD CONSTRAINT operations_alert_resolved_by_id_85a22a72_fk_accounts_user_id FOREIGN KEY (resolved_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_alertrule operations_alertrule_created_by_id_d1b5f128_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_alertrule
    ADD CONSTRAINT operations_alertrule_created_by_id_d1b5f128_fk_accounts_user_id FOREIGN KEY (created_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_cashdeposit operations_cashdepos_account_id_8e0e0ab2_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdepos_account_id_8e0e0ab2_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_cashdeposit operations_cashdepos_payment_id_dfdc24ef_fk_finance_p; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdepos_payment_id_dfdc24ef_fk_finance_p FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_cashdeposit operations_cashdeposit_agent_id_889b57a0_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_agent_id_889b57a0_fk_accounts_user_id FOREIGN KEY (agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_cashdeposit operations_cashdeposit_hub_id_5b610798_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_hub_id_5b610798_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_cashdeposit operations_cashdeposit_shift_id_00663616_fk_operations_shift_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_cashdeposit
    ADD CONSTRAINT operations_cashdeposit_shift_id_00663616_fk_operations_shift_id FOREIGN KEY (shift_id) REFERENCES public.operations_shift(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_inventorycount operations_inventory_shift_id_afc89c37_fk_operation; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_inventorycount
    ADD CONSTRAINT operations_inventory_shift_id_afc89c37_fk_operation FOREIGN KEY (shift_id) REFERENCES public.operations_shift(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_inventorycount operations_inventory_signed_by_id_a73ea2e5_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_inventorycount
    ADD CONSTRAINT operations_inventory_signed_by_id_a73ea2e5_fk_accounts_ FOREIGN KEY (signed_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_inventorycount operations_inventorycount_hub_id_d966d023_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_inventorycount
    ADD CONSTRAINT operations_inventorycount_hub_id_d966d023_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_override operations_override_agent_id_9ee3d897_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_override
    ADD CONSTRAINT operations_override_agent_id_9ee3d897_fk_accounts_user_id FOREIGN KEY (agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_override operations_override_swap_id_df12dbd7_fk_mobility_swap_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_override
    ADD CONSTRAINT operations_override_swap_id_df12dbd7_fk_mobility_swap_id FOREIGN KEY (swap_id) REFERENCES public.mobility_swap(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_shift operations_shift_agent_id_fb2d7457_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_shift
    ADD CONSTRAINT operations_shift_agent_id_fb2d7457_fk_accounts_user_id FOREIGN KEY (agent_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: operations_shift operations_shift_hub_id_721b4b2d_fk_mobility_hub_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations_shift
    ADD CONSTRAINT operations_shift_hub_id_721b4b2d_fk_mobility_hub_id FOREIGN KEY (hub_id) REFERENCES public.mobility_hub(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskevent risk_riskevent_account_id_b0c03b73_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskevent
    ADD CONSTRAINT risk_riskevent_account_id_b0c03b73_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskevent risk_riskevent_reviewed_by_id_cec0afbc_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskevent
    ADD CONSTRAINT risk_riskevent_reviewed_by_id_cec0afbc_fk_accounts_user_id FOREIGN KEY (reviewed_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskevent risk_riskevent_rule_id_8e517eb3_fk_risk_riskrule_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskevent
    ADD CONSTRAINT risk_riskevent_rule_id_8e517eb3_fk_risk_riskrule_id FOREIGN KEY (rule_id) REFERENCES public.risk_riskrule(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskvelocitygrant risk_riskvelocitygra_account_id_436db1f5_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskvelocitygrant
    ADD CONSTRAINT risk_riskvelocitygra_account_id_436db1f5_fk_accounts_ FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskvelocitygrant risk_riskvelocitygra_granted_by_id_3354a125_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskvelocitygrant
    ADD CONSTRAINT risk_riskvelocitygra_granted_by_id_3354a125_fk_accounts_ FOREIGN KEY (granted_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: risk_riskvelocitygrant risk_riskvelocitygra_risk_event_id_d1341094_fk_risk_risk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_riskvelocitygrant
    ADD CONSTRAINT risk_riskvelocitygra_risk_event_id_d1341094_fk_risk_risk FOREIGN KEY (risk_event_id) REFERENCES public.risk_riskevent(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_caseevent support_caseevent_actor_id_a63cf518_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_caseevent
    ADD CONSTRAINT support_caseevent_actor_id_a63cf518_fk_accounts_user_id FOREIGN KEY (actor_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_caseevent support_caseevent_attachment_id_c9c35a43_fk_core_mediaasset_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_caseevent
    ADD CONSTRAINT support_caseevent_attachment_id_c9c35a43_fk_core_mediaasset_id FOREIGN KEY (attachment_id) REFERENCES public.core_mediaasset(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_caseevent support_caseevent_case_id_81651fb3_fk_support_supportcase_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_caseevent
    ADD CONSTRAINT support_caseevent_case_id_81651fb3_fk_support_supportcase_id FOREIGN KEY (case_id) REFERENCES public.support_supportcase(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_supportcase support_supportcase_account_id_03b504b3_fk_accounts_account_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_account_id_03b504b3_fk_accounts_account_id FOREIGN KEY (account_id) REFERENCES public.accounts_account(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_supportcase support_supportcase_assigned_to_id_c32ea44f_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_assigned_to_id_c32ea44f_fk_accounts_user_id FOREIGN KEY (assigned_to_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_supportcase support_supportcase_driver_id_cb6fdb2c_fk_accounts_driver_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_driver_id_cb6fdb2c_fk_accounts_driver_id FOREIGN KEY (driver_id) REFERENCES public.accounts_driver(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_supportcase support_supportcase_opened_by_id_aafba941_fk_accounts_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_opened_by_id_aafba941_fk_accounts_user_id FOREIGN KEY (opened_by_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: support_supportcase support_supportcase_payment_id_c37f15e8_fk_finance_payment_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_supportcase
    ADD CONSTRAINT support_supportcase_payment_id_c37f15e8_fk_finance_payment_id FOREIGN KEY (payment_id) REFERENCES public.finance_payment(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_blacklistedtoken token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_blacklistedtoken
    ADD CONSTRAINT token_blacklist_blacklistedtoken_token_id_3cc7fe56_fk FOREIGN KEY (token_id) REFERENCES public.token_blacklist_outstandingtoken(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: token_blacklist_outstandingtoken token_blacklist_outs_user_id_83bc629a_fk_accounts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.token_blacklist_outstandingtoken
    ADD CONSTRAINT token_blacklist_outs_user_id_83bc629a_fk_accounts_ FOREIGN KEY (user_id) REFERENCES public.accounts_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--


