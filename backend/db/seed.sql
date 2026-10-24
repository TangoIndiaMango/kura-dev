-- Demo dataset for an EMPTY database (loaded by `migrate seed`).
-- Generated from the original seed_kura + seed_roles commands. Test logins:
--   ops@yopmail.com / opspass123, admin@yopmail.com / adminpass123,
--   agent.yaba@yopmail.com / agentpass123, rider +2348033330001 PIN 1234.

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

--
-- Data for Name: accounts_role; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_role VALUES
	('01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '2026-10-23 07:23:15.166802+00', '2026-10-23 07:23:26.933549+00', 'SUPER_ADMIN', 'Super Admin', 'Unrestricted platform access', true, true),
	('01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '2026-10-23 07:23:15.185505+00', '2026-10-23 07:23:26.945849+00', 'OPS_MANAGER', 'Operations Manager', 'Network ops and CRM', true, true),
	('01a167a4-7b7f-78b9-affd-1053c622ca24', '2026-10-23 07:23:15.199363+00', '2026-10-23 07:23:26.952675+00', 'HUB_AGENT', 'Hub Agent', 'Station-level swap execution', true, true),
	('01a167a4-7b85-7307-8e81-40a60509e6d3', '2026-10-23 07:23:15.205996+00', '2026-10-23 07:23:26.958946+00', 'COMMERCIAL_ADMIN', 'Commercial Admin', 'Tariffs, credit, partners', true, true),
	('01a167a4-7b8c-7a4b-989c-ecf117057802', '2026-10-23 07:23:15.212911+00', '2026-10-23 07:23:26.963398+00', 'GOVERNMENT_VIEWER', 'Government Viewer', 'Read-only regulatory view', true, true),
	('01a167a4-7b91-790d-9cea-23b0ce0ce1a3', '2026-10-23 07:23:15.218056+00', '2026-10-23 07:23:26.972727+00', 'PARTNER_VIEWER', 'Partner Viewer', 'Read-only partner view', true, true),
	('01a167a4-7b98-7461-89fe-5f5b113f9ef0', '2026-10-23 07:23:15.224122+00', '2026-10-23 07:23:26.977553+00', 'COOPERATIVE_CHAIRMAN', 'Cooperative Chairman', 'Read-only aggregates for one cooperative', true, true),
	('01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '2026-10-23 07:23:15.228955+00', '2026-10-23 07:23:26.981551+00', 'DRIVER', 'Driver / Operator', 'Rider app access', true, true),
	('01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '2026-10-23 07:23:15.23685+00', '2026-10-23 07:23:26.987683+00', 'FLEET_OWNER', 'Fleet Owner', 'Fleet account management', true, true);


--
-- Data for Name: accounts_user; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_user VALUES
	('argon2$argon2id$v=19$m=102400,t=2,p=8$dk1XSm0xcTJSRHZtemEyWHV4THliRA$vDc3tv+QG+q7Amb+gzT/8EIYFEFX8hCbVYDMryimVpE', NULL, true, '01a167a4-76c8-7974-b319-46c2676f9c4e', '2026-10-23 07:23:14.059773+00', '2026-10-23 07:23:14.059789+00', 'admin@yopmail.com', NULL, 'Amina', 'Bello', 'SUPER_ADMIN', '', true, true, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', 0, NULL, 'pin', 'ST-OOOCWC', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$aGpkeVlaSnNueUJneVFXYUJ6c2gwTw$YwrTWcLdPtJflnWv3HttwFV2D6InFD7PjsQw79C7MqQ', NULL, false, '01a167a4-7721-7980-b8ed-6cb600490387', '2026-10-23 07:23:14.118286+00', '2026-10-23 07:23:14.118297+00', 'ops@yopmail.com', NULL, 'Tunde', 'Adeleke', 'OPS_MANAGER', '', true, true, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', 0, NULL, 'pin', 'ST-F5BETJ', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$SmhPMU1wQXh3ZFBzcUVQREttNHNvbA$UzD1A3hoFM/6tvJJEEQhSb2Lk8flPg8+zyiME3ECcC0', NULL, false, '01a167a4-774e-7c8c-a622-90979fd67673', '2026-10-23 07:23:14.226288+00', '2026-10-23 07:23:14.226298+00', 'agent.yaba@yopmail.com', '+2348098765432', 'Chinedu', 'Okafor', 'HUB_AGENT', 'argon2$argon2id$v=19$m=102400,t=2,p=8$cGl6VWw3UWZRTTdLNWxzdFplYkRtUw$FKZJPCpV2wIplj+h9rlWmMetBhzHOPJzaECsSQrNDEk', true, true, '01a167a4-7b7f-78b9-affd-1053c622ca24', 0, NULL, 'pin', 'ST-5B6YXR', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$b3VlS1VFQkU1eTRZcUpObzRvTWw5Mg$GXKcT0d+XHHzgGIyPjtutm3wvJ74845nFX7LSREsYqU', NULL, false, '01a167a4-77b5-70ae-baf5-01821a3e827a', '2026-10-23 07:23:14.231026+00', '2026-10-23 07:23:14.301166+00', 'kura.driver@yopmail.com', '+2348012345678', 'Ibrahim', 'Musa', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$MGdDRVg5alZtMTdFWm8yOWVmTG5uTg$ukAEkE71ZaKlje5umN+ivj8Xx4ea8vpgWnzTB5SVO+Y', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-JG3IYX', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$M09qUjRhUlgyZTRjZmdWaVl6QjJQVA$HZr31BaRnSdo3zjGOWrit2OQDFjn5XbubXZS5g7uu3I', NULL, false, '01a167a4-810d-725f-a746-8813fc5b8d71', '2026-10-23 07:23:16.622586+00', '2026-10-23 07:23:16.672628+00', 'agent.ikeja@yopmail.com', '+2348098765433', 'Yetunde', 'Lawal', 'HUB_AGENT', 'argon2$argon2id$v=19$m=102400,t=2,p=8$MDBUaFZNOE5vQlpLdlRXT3QyeVAwOA$u3EoHaoc4jMUd+2HnQN113/2IYtAIa8Jjniwoeyh/qQ', true, true, '01a167a4-7b7f-78b9-affd-1053c622ca24', 0, NULL, 'home', 'ST-G37UB0', NULL, '{}', 0),
	('', NULL, false, '01a167a4-7bdb-7f03-86fd-3df0628099d6', '2026-10-23 07:23:15.292289+00', '2026-10-23 07:23:15.292296+00', 'fatima.okoro@yopmail.com', '+2348088812345', 'Fatima', 'Okoro', 'DRIVER', '', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'pin', 'OP-3A5YIM', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$TWVXQWcxem5Wa09CdnJ4b0dWTG5FdQ$sXyTtCPIkTGefO3nBmvznojDlC6t0r8M0zKgbAy8no4', NULL, false, '01a167a4-7d30-7124-95b6-44321e1e38cd', '2026-10-23 07:23:15.634644+00', '2026-10-23 07:23:15.711486+00', 'fleet.driver.a@yopmail.com', '+2348011110002', 'Segun', 'Balogun', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$VWN5MWQzVHVGV0o5dGpXbTYwMnRCQw$rWgErFgJBRhEHRCxqzKoKfhxgICg2ONVaV8lXttUi5Y', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-D4H96Z', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$MTNxYTF4YTZTYUIyWmNhcDQ5NEMwaA$DObeM8ojjBv/FdXaooTNIUkEmR+laep+SLQdYdH0BCM', NULL, false, '01a167a4-7d87-7b48-b8ef-9357fe0269a7', '2026-10-23 07:23:15.721057+00', '2026-10-23 07:23:15.774805+00', 'fleet.driver.b@yopmail.com', '+2348011110003', 'Ngozi', 'Eze', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$T3drZ3RjQzU2bkJLWkRLZTFySHE5QQ$FKHyRUdXUQ/YN4c08Gr/YCkGpG2vZB0J5snWbFBsz4o', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-36QHRU', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$MVdKcHRkM3loeTNiMXBreTB3UUpsTA$o2GQ8L68dJY1yZNoM1FQ9onf1UB3aTm//kYl6xisHTU', NULL, false, '01a167a4-7e4c-7c67-bfb6-e6862eb1cb74', '2026-10-23 07:23:15.918162+00', '2026-10-23 07:23:15.966059+00', 'fleet.novcu.driver@yopmail.com', '+2348022220002', 'Tola', 'Ajayi', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$RGJFcXRnZTFPSFl4RU1ZSFdYWE5ESg$y8T4zeWv4WRcuJmlohXdaYR+ZApYbmw1gkbzy/A0tis', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-RQKRY1', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$WVVOb1Vpd2RQdWNjOGYwNUVqb2JoRQ$s4KHt7gK0ywr+lw5TDIPii6KaBCCmygtRyUJFSB9gtk', NULL, false, '01a167a4-7e88-7d85-ad2a-e80aa8abd87c', '2026-10-23 07:23:15.97785+00', '2026-10-23 07:23:16.022337+00', 'rider01@yopmail.com', '+2348033330001', 'Ada', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$MlB4NGFPNDhlN09McE82SWRWVnQ5bw$iCON0Jr/6qDwpWTa/aWwqUKP2UlPgZPd+2xrAiCREV8', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-3Y58I2', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$dVRPc0dFR05LWGR5OVdwZUY4Z3E0cQ$OO89csQQc8/sW+2RV2mOR3Uc3ao48NmDHx/6hwOLfyM', NULL, false, '01a167a4-7ed6-7965-a9a7-7f6abb0f0855', '2026-10-23 07:23:16.05604+00', '2026-10-23 07:23:16.101695+00', 'rider02@yopmail.com', '+2348033330002', 'Bola', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$cnFNM0Y1WFhDSXdwWVZvYkl1OWZJUw$2siZtqaf+WlxEebYdLW63PQIElbY2n94JQrgobNs/5w', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-O8TWY2', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$VlF3bXk3ZWkwb1V0Y3pyYVZCR3dEdw$X5Bj3/dPkYQrEqQPn44LLWEzsjQXNhhESYZhQmCVsP4', NULL, false, '01a167a4-7f25-7512-a619-60e633221f40', '2026-10-23 07:23:16.13666+00', '2026-10-23 07:23:16.198356+00', 'rider03@yopmail.com', '+2348033330003', 'Chika', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$UFkzcm5DTXNZUEJZMUtmYnQ0a2cxYw$Vwx+tCfCCkYy8djznY3KuHSI3z/vTrp3f1FdLV4UzE4', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-QE5XNZ', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$YVZJWnBRQ2JpSThDMERFRGFNWHVySQ$S35kq7/fQCgaUds2yEQkp22hNZ+md9lU/xQtkSbLBRs', NULL, false, '01a167a4-7f85-78e7-b27c-a1a6979470c1', '2026-10-23 07:23:16.23058+00', '2026-10-23 07:23:16.27738+00', 'rider04@yopmail.com', '+2348033330004', 'Dami', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$cHF5bGFSQTRKNlhvTUFzVjFaZGt3UQ$cVFt6FxIX7bkc6qfXFrZ/dgsy2f5OYtv+2StDWMHCM4', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-5PF6LM', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$cGUzd0JzRzR2bTYxdXVRVFJQb0tZaQ$n/1TYiL4U612ixOrSgCJUS87hlVHOCN1M87gPMI0+qM', NULL, false, '01a167a4-7fd2-7622-b1e7-ad231e8bfa45', '2026-10-23 07:23:16.308026+00', '2026-10-23 07:23:16.35319+00', 'rider05@yopmail.com', '+2348033330005', 'Efe', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$RkdJbXdBWXVyb2x5Z3FPQjAyTkxPSA$pxiBas2l98MUbBhQ7/A6GeAWteD0rAqLJZn382IFXY0', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-797L2F', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$Q3p4aDJoaW5SU2o2cW5YNUt5WHZnRQ$wiigLQrmvq69snoR/KeQpb/iaHfmX8boW7dXQlgVh7k', NULL, false, '01a167a4-801e-729d-bccc-6152049c0258', '2026-10-23 07:23:16.383514+00', '2026-10-23 07:23:16.43771+00', 'rider06@yopmail.com', '+2348033330006', 'Femi', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$Q0xDc0FwMWZETWFMTUdOQ2xCejMzeQ$r5g36/LMGAm+e0fndAjFv3+5C2HnxRhz1JUDpA8rV/4', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-GPOL3X', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$REs1azhYdTRVckQ2ZjZubmRGOUVyMA$kJuZLJ2KyUhieUURQp2oj0RlwTIKwD0KipGuO+SiSpg', NULL, false, '01a167a4-8073-74df-a092-0bc73be24833', '2026-10-23 07:23:16.468909+00', '2026-10-23 07:23:16.522049+00', 'rider07@yopmail.com', '+2348033330007', 'Gani', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$Um5pME1ibTFZZUNmSWs4VlJPb05FMg$gzo3pujI11U5oVt3jHvbLo0LWiitfIIFvtomf4J9UyA', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-HN6YDS', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$Y2hQTk5uOUh1Z1FLVGNsamVCbW45cQ$0d6ndXsHMHpbHLA3shuE4D78rgmQwJc4z6b0IwnwZAU', NULL, false, '01a167a4-80c1-712b-b39f-937fbb8e8dbe', '2026-10-23 07:23:16.546968+00', '2026-10-23 07:23:16.598436+00', 'rider08@yopmail.com', '+2348033330008', 'Hana', 'Rider', 'DRIVER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$czBmNkYxRzNNcVZURWtaVGE5N0ltag$NHtHootaXs+cdu4gX0CAOaNVVW0ROHDilhNqdt/P3F8', true, false, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', 0, NULL, 'home', 'OP-5RYT5H', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$RFZvSWdEUkVLSGttdTdBc0dScm5zZg$EgxUwZQTpo/ZvVFjDF6ZgYKmh5TeObyUIhUEBWDCgJI', NULL, false, '01a167a4-7ca3-714f-b372-a6632af40cdb', '2026-10-23 07:23:15.492807+00', '2026-10-23 07:23:15.564013+00', 'fleet.vcu@yopmail.com', '+2348011110001', 'Funke', 'Adeyemi', 'FLEET_OWNER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$QUtmNUJyeUdXdGhYVDNjZHRMU0I4cA$0AjrzB4QSWfn9anLF76jEx1SpVpAoxsrdhCNM+NzVio', true, false, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', 0, NULL, 'home', 'OP-PDMTAG', NULL, '{}', 0),
	('argon2$argon2id$v=19$m=102400,t=2,p=8$eDJ5MWpnOHczNEh4aW1DVE1YUGxVcw$MdL21zzZx4dg9aQE5zebp0rkdgltUMZbE8eGbG91vHc', NULL, false, '01a167a4-7de2-7fb8-a65a-ef1bc9ae62f8', '2026-10-23 07:23:15.811979+00', '2026-10-23 07:23:15.867386+00', 'fleet.novcu@yopmail.com', '+2348022220001', 'Emeka', 'Okonkwo', 'FLEET_OWNER', 'argon2$argon2id$v=19$m=102400,t=2,p=8$S3dHaklURGdnenNyU2JSSzN4ZGlIVg$rhiEAl7yqTwnY+gWlcOIeYYCb+pLt782bTobFQfScyc', true, false, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', 0, NULL, 'home', 'OP-WNDJ4J', NULL, '{}', 0);


--
-- Data for Name: accounts_cooperative; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_cooperative VALUES
	('01a167a4-7bba-753b-88f9-024b8b810513', '2026-10-23 07:23:15.258166+00', '2026-10-23 07:23:15.258173+00', 'Lagos Express Cooperative', 'Lagos', 'ACTIVE', '01a167a4-7721-7980-b8ed-6cb600490387');


--
-- Data for Name: accounts_account; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_account VALUES
	('01a167a4-7806-7845-84c2-07dc98cf5ff8', '2026-10-23 07:23:14.310581+00', '2026-10-23 07:23:15.262274+00', 'KR-882194', 'INDIVIDUAL', 'Ibrahim Musa (Express Rider)', 'ACTIVE', 'VERIFIED', '01a167a4-77b5-70ae-baf5-01821a3e827a', 'WEB', '', '01a167a4-7bba-753b-88f9-024b8b810513', 'NORMAL'),
	('01a167a4-7bde-7ce0-84c7-e7789e83448f', '2026-10-23 07:23:15.294615+00', '2026-10-23 07:23:15.294623+00', 'KR-PATHB1', 'INDIVIDUAL', 'Fatima Okoro (Makoko Ferry)', 'ACTIVE', 'VERIFIED', '01a167a4-7bdb-7f03-86fd-3df0628099d6', 'HUB', '', NULL, 'NORMAL'),
	('01a167a4-7cef-7505-9b73-a3569914f925', '2026-10-23 07:23:15.567692+00', '2026-10-23 07:23:15.567702+00', 'KR-FLEET-VCU', 'FLEET', 'Adeyemi Logistics (VCU fleet)', 'ACTIVE', 'VERIFIED', '01a167a4-7ca3-714f-b372-a6632af40cdb', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-7e21-77a9-92f4-6bcf3d154758', '2026-10-23 07:23:15.873996+00', '2026-10-23 07:23:15.874005+00', 'KR-FLEET-NOVCU', 'FLEET', 'Okonkwo Delivery (no telematics)', 'ACTIVE', 'VERIFIED', '01a167a4-7de2-7fb8-a65a-ef1bc9ae62f8', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-7ebb-755a-b831-72e5448454f4', '2026-10-23 07:23:16.027815+00', '2026-10-23 07:23:16.027822+00', 'KR-RIDER-01', 'INDIVIDUAL', 'Ada Rider', 'ACTIVE', 'VERIFIED', '01a167a4-7e88-7d85-ad2a-e80aa8abd87c', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '2026-10-23 07:23:16.108273+00', '2026-10-23 07:23:16.108281+00', 'KR-RIDER-02', 'INDIVIDUAL', 'Bola Rider', 'ACTIVE', 'VERIFIED', '01a167a4-7ed6-7965-a9a7-7f6abb0f0855', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-7f6c-71b8-88a6-6e1743605298', '2026-10-23 07:23:16.204498+00', '2026-10-23 07:23:16.204506+00', 'KR-RIDER-03', 'INDIVIDUAL', 'Chika Rider', 'ACTIVE', 'VERIFIED', '01a167a4-7f25-7512-a619-60e633221f40', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-7fbb-777e-9593-0f102470eebd', '2026-10-23 07:23:16.283497+00', '2026-10-23 07:23:16.283509+00', 'KR-RIDER-04', 'INDIVIDUAL', 'Dami Rider', 'ACTIVE', 'VERIFIED', '01a167a4-7f85-78e7-b27c-a1a6979470c1', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-8006-7d28-8eb9-0fa045178cc0', '2026-10-23 07:23:16.358621+00', '2026-10-23 07:23:16.358627+00', 'KR-RIDER-05', 'INDIVIDUAL', 'Efe Rider', 'ACTIVE', 'VERIFIED', '01a167a4-7fd2-7622-b1e7-ad231e8bfa45', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '2026-10-23 07:23:16.440935+00', '2026-10-23 07:23:16.440942+00', 'KR-RIDER-06', 'INDIVIDUAL', 'Femi Rider', 'ACTIVE', 'VERIFIED', '01a167a4-801e-729d-bccc-6152049c0258', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '2026-10-23 07:23:16.525202+00', '2026-10-23 07:23:16.525209+00', 'KR-RIDER-07', 'INDIVIDUAL', 'Gani Rider', 'ACTIVE', 'VERIFIED', '01a167a4-8073-74df-a092-0bc73be24833', 'WEB', '', NULL, 'NORMAL'),
	('01a167a4-80f9-7131-89f8-e074dc97447d', '2026-10-23 07:23:16.601531+00', '2026-10-23 07:23:16.60154+00', 'KR-RIDER-08', 'INDIVIDUAL', 'Hana Rider', 'ACTIVE', 'VERIFIED', '01a167a4-80c1-712b-b39f-937fbb8e8dbe', 'WEB', '', NULL, 'NORMAL');


--
-- Data for Name: accounts_consent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: core_mediaasset; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.core_mediaasset VALUES
	('01a167a4-7811-7a6f-a4e9-ece83e919219', '2026-10-23 07:23:14.321674+00', '2026-10-23 07:23:14.321685+00', 'cloudinary', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=640&q=80', '', 'image/jpeg', 'image', 0, NULL, NULL, '', 'public', '01a167a4-77b5-70ae-baf5-01821a3e827a'),
	('01a167a4-7817-7c5b-af54-053981c9804a', '2026-10-23 07:23:14.327386+00', '2026-10-23 07:23:14.327394+00', 'cloudinary', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=960&q=80', '', 'image/jpeg', 'image', 0, NULL, NULL, '', 'public', '01a167a4-77b5-70ae-baf5-01821a3e827a'),
	('01a167a4-7819-776f-89f1-187716167d64', '2026-10-23 07:23:14.329611+00', '2026-10-23 07:23:14.329618+00', 'cloudinary', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=960&q=80', '', 'image/jpeg', 'image', 0, NULL, NULL, '', 'public', '01a167a4-77b5-70ae-baf5-01821a3e827a'),
	('01a167a4-7be0-7306-818b-157a90f242db', '2026-10-23 07:23:15.297035+00', '2026-10-23 07:23:15.297042+00', 'cloudinary', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80', '', 'image/jpeg', 'image', 0, NULL, NULL, '', 'public', '01a167a4-7bdb-7f03-86fd-3df0628099d6');


--
-- Data for Name: accounts_driver; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_driver VALUES
	('01a167a4-781d-7709-bd5a-8457dd57fd58', '2026-10-23 07:23:14.333432+00', '2026-10-23 07:23:14.355157+00', 'LS-8921-OK', 'ACTIVE', '01a167a4-7806-7845-84c2-07dc98cf5ff8', '01a167a4-77b5-70ae-baf5-01821a3e827a', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7be7-7d2b-a653-2009ff3f298e', '2026-10-23 07:23:15.303757+00', '2026-10-23 07:23:15.305257+00', '', 'ACTIVE', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-7bdb-7f03-86fd-3df0628099d6', '01a167a4-7be0-7306-818b-157a90f242db', NULL, NULL),
	('01a167a4-7cf6-796c-b3fa-3d4c34e619e8', '2026-10-23 07:23:15.574432+00', '2026-10-23 07:23:15.576177+00', '', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7ca3-714f-b372-a6632af40cdb', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7d83-7427-869f-fb5645df586d', '2026-10-23 07:23:15.716154+00', '2026-10-23 07:23:15.717697+00', '', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7d30-7124-95b6-44321e1e38cd', NULL, 600000, 4),
	('01a167a4-7dc2-7e7b-99b0-78aceac440c2', '2026-10-23 07:23:15.779112+00', '2026-10-23 07:23:15.780788+00', '', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7d87-7b48-b8ef-9357fe0269a7', NULL, 300000, 2),
	('01a167a4-7e2e-7818-928e-0cddec8164b0', '2026-10-23 07:23:15.886949+00', '2026-10-23 07:23:15.888955+00', '', 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-7de2-7fb8-a65a-ef1bc9ae62f8', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7e84-77e4-9908-3555dc283c0d', '2026-10-23 07:23:15.972797+00', '2026-10-23 07:23:15.975124+00', '', 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-7e4c-7c67-bfb6-e6862eb1cb74', NULL, 450000, 3),
	('01a167a4-7ec3-7e89-b409-c055b70c07de', '2026-10-23 07:23:16.03569+00', '2026-10-23 07:23:16.037504+00', '', 'ACTIVE', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-7e88-7d85-ad2a-e80aa8abd87c', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '2026-10-23 07:23:16.113555+00', '2026-10-23 07:23:16.114957+00', '', 'ACTIVE', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-7ed6-7965-a9a7-7f6abb0f0855', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7f73-7d10-a099-0093c0d03192', '2026-10-23 07:23:16.211207+00', '2026-10-23 07:23:16.212869+00', '', 'ACTIVE', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-7f25-7512-a619-60e633221f40', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-7fc0-762b-8a12-15a7e308b3fa', '2026-10-23 07:23:16.288948+00', '2026-10-23 07:23:16.290294+00', '', 'ACTIVE', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-7f85-78e7-b27c-a1a6979470c1', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '2026-10-23 07:23:16.365204+00', '2026-10-23 07:23:16.366558+00', '', 'ACTIVE', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-7fd2-7622-b1e7-ad231e8bfa45', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-805e-7833-ba95-4a0401ca54ed', '2026-10-23 07:23:16.446806+00', '2026-10-23 07:23:16.44859+00', '', 'ACTIVE', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-801e-729d-bccc-6152049c0258', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '2026-10-23 07:23:16.530164+00', '2026-10-23 07:23:16.531592+00', '', 'ACTIVE', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-8073-74df-a092-0bc73be24833', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL),
	('01a167a4-80fd-718a-9afd-c02d1c61e832', '2026-10-23 07:23:16.606009+00', '2026-10-23 07:23:16.607284+00', '', 'ACTIVE', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-80c1-712b-b39f-937fbb8e8dbe', '01a167a4-7811-7a6f-a4e9-ece83e919219', NULL, NULL);


--
-- Data for Name: accounts_identitydocument; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_identitydocument VALUES
	('01a167a4-782b-7bed-8ef3-28d680adc915', '2026-10-23 07:23:14.348242+00', '2026-10-23 07:23:14.348253+00', 'NIN', 'IjEyMzQ1Njc4OTAxIg:1xK9cQ:pkOmgaCQRoGFfmxvnjU7LKMJRqNbybhGCiuIQ5VITag', '8901', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:14.348047+00', '', '01a167a4-7806-7845-84c2-07dc98cf5ff8', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7bea-796a-9746-51e8456a0616', '2026-10-23 07:23:15.307112+00', '2026-10-23 07:23:15.307119+00', 'NIN', 'IjIyMzM0NDU1NjY3Ig:1xK9cR:U6ssG8SCittFtoOnBjon4yC-UE1Ke1FnsXX02j7ttaM', '5667', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:15.307014+00', '', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7cfa-74ef-8157-90544bcd636b', '2026-10-23 07:23:15.578849+00', '2026-10-23 07:23:15.578857+00', 'NIN', 'IlJGTEVFVFZDVSI:1xK9cR:kgF7K8pyBHImoGJavWjp_B3a1qbZjnEcva88gelioG4', 'TVCU', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:15.578735+00', '', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7e33-7f4a-8417-26a20de1a4fa', '2026-10-23 07:23:15.892183+00', '2026-10-23 07:23:15.892191+00', 'NIN', 'IkZMRUVUTk9WQ1Ui:1xK9cR:dSHM9Ym9cYnnNQR1yTWXRSHzlLVIxgQBaBzIJbEa88w', 'OVCU', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:15.892053+00', '', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7ec7-77a2-96be-1d348b6ef696', '2026-10-23 07:23:16.039471+00', '2026-10-23 07:23:16.039478+00', 'NIN', 'IktSUklERVIwMSI:1xK9cS:xz1etF9cmxPDcRXkVG3wRbafCoEHawbxO2d_Ee-SI0o', 'ER01', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.039377+00', '', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7f14-707c-88f6-28b9b78de735', '2026-10-23 07:23:16.117002+00', '2026-10-23 07:23:16.117008+00', 'NIN', 'IktSUklERVIwMiI:1xK9cS:Anqc7shaN6vqF2Rw3SFsHEsBVm8ORP6dEKEbI7BSuC8', 'ER02', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.11691+00', '', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7f76-7501-922c-98c93235bdcf', '2026-10-23 07:23:16.214833+00', '2026-10-23 07:23:16.214841+00', 'NIN', 'IktSUklERVIwMyI:1xK9cS:SsTaBsnSM5rAFiAJqNMwQ0DsfIQPA7XqyjDnrxucyHA', 'ER03', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.214732+00', '', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-7fc6-72d7-81b4-b8eee6fd9a8d', '2026-10-23 07:23:16.294247+00', '2026-10-23 07:23:16.294253+00', 'NIN', 'IktSUklERVIwNCI:1xK9cS:fIzGVSI19jSLicLYOCvF7mMmliL90go5PrvH0w_AvZw', 'ER04', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.294152+00', '', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-8010-7541-ad6f-64e82fd5bd52', '2026-10-23 07:23:16.36837+00', '2026-10-23 07:23:16.368376+00', 'NIN', 'IktSUklERVIwNSI:1xK9cS:NeitJ-m9G0_A5EclZpEkWYMGzCCgsEE6RliJG13S30I', 'ER05', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.368276+00', '', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-8062-75de-9ff6-8811aaf011c5', '2026-10-23 07:23:16.451002+00', '2026-10-23 07:23:16.45101+00', 'NIN', 'IktSUklERVIwNiI:1xK9cS:2HmIuI1IcPuawNT36S5EC7Cvd1S6ebk9hyIEtvdaMp0', 'ER06', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.450897+00', '', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-80b5-7f7c-a091-18348f176f74', '2026-10-23 07:23:16.533409+00', '2026-10-23 07:23:16.533416+00', 'NIN', 'IktSUklERVIwNyI:1xK9cS:UL5nXTFtTa-gBa4DsMIKO6lmjbOTf21Y7Ee-BGNy5HY', 'ER07', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.533311+00', '', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, ''),
	('01a167a4-8100-7895-8938-2b4f39b1205f', '2026-10-23 07:23:16.609122+00', '2026-10-23 07:23:16.609129+00', 'NIN', 'IktSUklERVIwOCI:1xK9cS:GMG3p1KRAS1sxCU1XYvQ_MY3tVMMvBniZhMhQBm_8-o', 'ER08', 'VERIFIED', 'MANUAL', '2026-10-23 07:23:16.609028+00', '', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-7819-776f-89f1-187716167d64', '01a167a4-7817-7c5b-af54-053981c9804a', false, '');


--
-- Data for Name: accounts_otpchallenge; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accounts_passwordsetuptoken; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accounts_permission; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_permission VALUES
	('01a167a4-7a8c-71aa-b5a2-454222fe7a94', '2026-10-23 07:23:14.956153+00', '2026-10-23 07:23:26.783419+00', 'hubs:read', 'View hubs', 'operations', 'List hubs and slot status'),
	('01a167a4-7a91-7b84-9b9e-fb52afc20568', '2026-10-23 07:23:14.961666+00', '2026-10-23 07:23:26.788091+00', 'hubs:manage', 'Manage hubs', 'operations', 'Create and configure hubs'),
	('01a167a4-7a95-7c57-9d78-243ea4a4284f', '2026-10-23 07:23:14.965975+00', '2026-10-23 07:23:26.79034+00', 'batteries:read', 'View batteries', 'operations', 'Inventory and health'),
	('01a167a4-7a98-724e-8455-a288e0ddf2de', '2026-10-23 07:23:14.968983+00', '2026-10-23 07:23:26.79263+00', 'batteries:manage', 'Manage batteries', 'operations', 'Commission and retire'),
	('01a167a4-7a9c-71f5-b198-480480bc3476', '2026-10-23 07:23:14.973098+00', '2026-10-23 07:23:26.804778+00', 'battery-types:approve', 'Approve battery types', 'operations', 'Maker-checker catalogue'),
	('01a167a4-7aa1-7aa2-8a64-295a9001416d', '2026-10-23 07:23:14.977141+00', '2026-10-23 07:23:26.808847+00', 'vehicles:read', 'View vehicles', 'operations', 'Fleet register'),
	('01a167a4-7aa4-786c-952d-4ee0a9300544', '2026-10-23 07:23:14.980364+00', '2026-10-23 07:23:26.811352+00', 'vehicles:manage', 'Manage vehicles', 'operations', 'Register and suspend vehicles'),
	('01a167a4-7aa7-7f93-b65c-9aaf1eee6815', '2026-10-23 07:23:14.983929+00', '2026-10-23 07:23:26.814315+00', 'swaps:read', 'View swaps', 'operations', 'Swap history'),
	('01a167a4-7aac-74c1-b4c7-723ccd865b06', '2026-10-23 07:23:14.98888+00', '2026-10-23 07:23:26.81725+00', 'swaps:complete', 'Complete swaps', 'operations', 'Hub agent swap completion'),
	('01a167a4-7ab1-7862-b541-b5243caae420', '2026-10-23 07:23:14.994195+00', '2026-10-23 07:23:26.820158+00', 'swaps:override', 'Override swaps', 'operations', 'Manual override with reason'),
	('01a167a4-7ab7-75f8-acfd-5d40216c3e3e', '2026-10-23 07:23:14.999901+00', '2026-10-23 07:23:26.823482+00', 'swaps:reverse', 'Reverse completed swaps', 'operations', 'Ops reverse within 24h'),
	('01a167a4-7ac3-7fe0-b124-e2a9ef8fcbbe', '2026-10-23 07:23:15.011809+00', '2026-10-23 07:23:26.826012+00', 'alerts:read', 'View alerts', 'operations', 'Alert triage queue'),
	('01a167a4-7ac9-7bf6-a047-fcd673a8b427', '2026-10-23 07:23:15.017575+00', '2026-10-23 07:23:26.828753+00', 'alerts:manage', 'Manage alerts', 'operations', 'Ack and resolve alerts'),
	('01a167a4-7acd-7df3-9cac-0b865943cd14', '2026-10-23 07:23:15.021991+00', '2026-10-23 07:23:26.832047+00', 'shifts:manage', 'Manage shifts', 'operations', 'Open and close hub shifts'),
	('01a167a4-7ad3-75a6-b4c5-54531872923e', '2026-10-23 07:23:15.027308+00', '2026-10-23 07:23:26.834924+00', 'accounts:read', 'View accounts', 'accounts', 'CRM / operator directory'),
	('01a167a4-7ad8-79cc-abd2-1e00700fbf0a', '2026-10-23 07:23:15.032655+00', '2026-10-23 07:23:26.837625+00', 'accounts:manage', 'Manage accounts', 'accounts', 'Suspend, reinstate, edit'),
	('01a167a4-7adf-7e3c-8f44-e6254e93d7ba', '2026-10-23 07:23:15.039538+00', '2026-10-23 07:23:26.840764+00', 'accounts:write_own', 'Edit own account', 'accounts', 'Operator self-service profile'),
	('01a167a4-7ae7-700c-838f-796b4c7125f7', '2026-10-23 07:23:15.048089+00', '2026-10-23 07:23:26.843693+00', 'cooperatives:read', 'View cooperatives', 'accounts', 'Cooperative directory'),
	('01a167a4-7aec-781b-9661-2af7ef925e50', '2026-10-23 07:23:15.053121+00', '2026-10-23 07:23:26.849204+00', 'cooperatives:manage', 'Manage cooperatives', 'accounts', 'Create/edit cooperative catalogue'),
	('01a167a4-7af2-79a4-badd-f17535e294cb', '2026-10-23 07:23:15.058677+00', '2026-10-23 07:23:26.851316+00', 'analytics:cooperative', 'Cooperative analytics', 'analytics', 'Read-only coop aggregates'),
	('01a167a4-7af9-77a3-b4d3-293fdb6f1fcb', '2026-10-23 07:23:15.06622+00', '2026-10-23 07:23:26.854357+00', 'analytics:revenue', 'View revenue analytics', 'analytics', 'Aggregated platform revenue'),
	('01a167a4-7b03-7712-9b01-5208fa850d45', '2026-10-23 07:23:15.07582+00', '2026-10-23 07:23:26.856738+00', 'finance:read', 'View finance', 'finance', 'Wallets and ledger'),
	('01a167a4-7b07-74d8-930f-aa3091f8f193', '2026-10-23 07:23:15.07982+00', '2026-10-23 07:23:26.859384+00', 'wallets:manage', 'Manage wallets', 'finance', 'Ops wallet actions'),
	('01a167a4-7b0c-7144-82a7-6723a4085e45', '2026-10-23 07:23:15.084831+00', '2026-10-23 07:23:26.862025+00', 'tariffs:manage', 'Manage tariffs', 'finance', 'Plans and price versions'),
	('01a167a4-7b12-703f-a631-7761f13a9e24', '2026-10-23 07:23:15.090713+00', '2026-10-23 07:23:26.864795+00', 'price:approve', 'Approve prices', 'finance', 'Maker-checker price activation'),
	('01a167a4-7b16-7038-be2f-cbccf53b5dc3', '2026-10-23 07:23:15.094477+00', '2026-10-23 07:23:26.867194+00', 'credit:approve', 'Approve credit', 'finance', 'Underwrite swap-credit'),
	('01a167a4-7b1a-7fd2-8ac4-96c20c5c7cb6', '2026-10-23 07:23:15.098349+00', '2026-10-23 07:23:26.870087+00', 'offers:manage', 'Manage offers', 'finance', 'Product offers catalogue'),
	('01a167a4-7b1d-7c92-8632-6f20acdcbc88', '2026-10-23 07:23:15.101352+00', '2026-10-23 07:23:26.873233+00', 'segments:manage', 'Manage segments', 'finance', 'Operator cohort definitions'),
	('01a167a4-7b20-7086-85b2-0ca5ddf98f85', '2026-10-23 07:23:15.104321+00', '2026-10-23 07:23:26.875701+00', 'engines:manage', 'Manage engines / retrofit', 'operations', 'Path B intake, install, checklist'),
	('01a167a4-7b23-7fe2-9ef0-c171b6b5f650', '2026-10-23 07:23:15.107457+00', '2026-10-23 07:23:26.878596+00', 'engines:release', 'Release stored engines', 'operations', 'Ops release after case approval'),
	('01a167a4-7b27-76ad-b725-ed7f294580c0', '2026-10-23 07:23:15.111928+00', '2026-10-23 07:23:26.881416+00', 'telemetry:read', 'View telemetry', 'operations', 'Vehicle GPS / SOC event feed'),
	('01a167a4-7b2a-79c3-981a-828d46fd0db1', '2026-10-23 07:23:15.114947+00', '2026-10-23 07:23:26.884457+00', 'telemetry:ingest', 'Ingest telemetry', 'operations', 'Manual or IoT batch ingest'),
	('01a167a4-7b2d-754d-99e9-069fae06e01a', '2026-10-23 07:23:15.117851+00', '2026-10-23 07:23:26.889336+00', 'analytics:impact', 'View impact metrics', 'analytics', 'Gov / ops CO₂ and savings rollups'),
	('01a167a4-7b30-75f3-b4fc-c6deb7049595', '2026-10-23 07:23:15.121087+00', '2026-10-23 07:23:26.894209+00', 'impact:manage', 'Manage impact stories', 'analytics', 'Publish government impact CMS cards'),
	('01a167a4-7b38-7e58-bb28-39e3a0947d6b', '2026-10-23 07:23:15.12838+00', '2026-10-23 07:23:26.898149+00', 'roles:manage', 'Manage roles', 'administration', 'RBAC roles and grants'),
	('01a167a4-7b3b-71c7-8b64-43174295d4e2', '2026-10-23 07:23:15.131304+00', '2026-10-23 07:23:26.901679+00', 'users:read', 'View users', 'administration', 'Staff and operator directory'),
	('01a167a4-7b3f-772e-ae74-61dce7e063d5', '2026-10-23 07:23:15.13588+00', '2026-10-23 07:23:26.905538+00', 'users:manage', 'Manage users', 'administration', 'Invite and deactivate'),
	('01a167a4-7b42-710f-a106-3f54f6ab560e', '2026-10-23 07:23:15.139049+00', '2026-10-23 07:23:26.908455+00', 'audit:read', 'View audit', 'administration', 'Audit trail (scoped by module caps)'),
	('01a167a4-7b47-70ea-ba61-9ebbda13c1c5', '2026-10-23 07:23:15.143111+00', '2026-10-23 07:23:26.911463+00', 'audit:manage', 'Manage audit', 'administration', 'Unscoped full audit trail'),
	('01a167a4-7b4a-75e6-8a58-8a78c5a7ad47', '2026-10-23 07:23:15.146313+00', '2026-10-23 07:23:26.914815+00', 'identity:reveal', 'Reveal identity', 'administration', 'Decrypt NIN/BVN (audited)'),
	('01a167a4-7b4d-7fb9-823e-74bc100c6e18', '2026-10-23 07:23:15.149455+00', '2026-10-23 07:23:26.917551+00', 'cases:read', 'View support cases', 'support', 'Support tickets / disputes'),
	('01a167a4-7b51-7ebc-acc7-7bed0a710cc6', '2026-10-23 07:23:15.153316+00', '2026-10-23 07:23:26.920931+00', 'cases:manage', 'Manage support cases', 'support', 'Open, assign, resolve cases'),
	('01a167a4-7b55-7924-8b17-4318b17f8d52', '2026-10-23 07:23:15.157516+00', '2026-10-23 07:23:26.923682+00', 'cases:write_own', 'Open own support cases', 'support', 'Operator self-service tickets on own account'),
	('01a167a4-7b58-7c55-990e-69a0468822eb', '2026-10-23 07:23:15.160432+00', '2026-10-23 07:23:26.926338+00', 'risk:read', 'View risk events', 'risk', 'Fraud and compliance events'),
	('01a167a4-7b5b-7360-99ad-499d48932c21', '2026-10-23 07:23:15.163605+00', '2026-10-23 07:23:26.929321+00', 'risk:review', 'Review risk events', 'risk', 'Mark risk events reviewed');


--
-- Data for Name: accounts_role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_role_permissions VALUES
	(1, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7aa1-7aa2-8a64-295a9001416d'),
	(2, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ab7-75f8-acfd-5d40216c3e3e'),
	(3, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b2d-754d-99e9-069fae06e01a'),
	(4, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b16-7038-be2f-cbccf53b5dc3'),
	(5, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b42-710f-a106-3f54f6ab560e'),
	(6, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7a95-7c57-9d78-243ea4a4284f'),
	(7, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7a91-7b84-9b9e-fb52afc20568'),
	(8, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7aac-74c1-b4c7-723ccd865b06'),
	(9, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b58-7c55-990e-69a0468822eb'),
	(10, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b47-70ea-ba61-9ebbda13c1c5'),
	(11, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b1d-7c92-8632-6f20acdcbc88'),
	(12, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7adf-7e3c-8f44-e6254e93d7ba'),
	(13, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b3b-71c7-8b64-43174295d4e2'),
	(14, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b12-703f-a631-7761f13a9e24'),
	(15, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7a9c-71f5-b198-480480bc3476'),
	(16, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b5b-7360-99ad-499d48932c21'),
	(17, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7aa4-786c-952d-4ee0a9300544'),
	(18, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b51-7ebc-acc7-7bed0a710cc6'),
	(19, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7aec-781b-9661-2af7ef925e50'),
	(20, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b27-76ad-b725-ed7f294580c0'),
	(21, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7acd-7df3-9cac-0b865943cd14'),
	(22, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b38-7e58-bb28-39e3a0947d6b'),
	(23, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7aa7-7f93-b65c-9aaf1eee6815'),
	(24, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b30-75f3-b4fc-c6deb7049595'),
	(25, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ab1-7862-b541-b5243caae420'),
	(26, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b20-7086-85b2-0ca5ddf98f85'),
	(27, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ac3-7fe0-b124-e2a9ef8fcbbe'),
	(28, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b1a-7fd2-8ac4-96c20c5c7cb6'),
	(29, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b3f-772e-ae74-61dce7e063d5'),
	(30, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b2a-79c3-981a-828d46fd0db1'),
	(31, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7a98-724e-8455-a288e0ddf2de'),
	(32, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b07-74d8-930f-aa3091f8f193'),
	(33, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b03-7712-9b01-5208fa850d45'),
	(34, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ae7-700c-838f-796b4c7125f7'),
	(35, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ac9-7bf6-a047-fcd673a8b427'),
	(36, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b4d-7fb9-823e-74bc100c6e18'),
	(37, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b23-7fe2-9ef0-c171b6b5f650'),
	(38, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7af9-77a3-b4d3-293fdb6f1fcb'),
	(39, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7a8c-71aa-b5a2-454222fe7a94'),
	(40, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b0c-7144-82a7-6723a4085e45'),
	(41, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ad8-79cc-abd2-1e00700fbf0a'),
	(42, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7af2-79a4-badd-f17535e294cb'),
	(43, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7ad3-75a6-b4c5-54531872923e'),
	(44, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b55-7924-8b17-4318b17f8d52'),
	(45, '01a167a4-7b5e-710d-a3f1-0c10aa6b57e4', '01a167a4-7b4a-75e6-8a58-8a78c5a7ad47'),
	(46, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7aa1-7aa2-8a64-295a9001416d'),
	(47, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ab7-75f8-acfd-5d40216c3e3e'),
	(48, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b2d-754d-99e9-069fae06e01a'),
	(49, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b16-7038-be2f-cbccf53b5dc3'),
	(50, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b42-710f-a106-3f54f6ab560e'),
	(51, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7a95-7c57-9d78-243ea4a4284f'),
	(52, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7a91-7b84-9b9e-fb52afc20568'),
	(53, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7aac-74c1-b4c7-723ccd865b06'),
	(54, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b58-7c55-990e-69a0468822eb'),
	(55, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b1d-7c92-8632-6f20acdcbc88'),
	(56, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b3b-71c7-8b64-43174295d4e2'),
	(57, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b12-703f-a631-7761f13a9e24'),
	(58, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7a9c-71f5-b198-480480bc3476'),
	(59, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b5b-7360-99ad-499d48932c21'),
	(60, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7aa4-786c-952d-4ee0a9300544'),
	(61, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b51-7ebc-acc7-7bed0a710cc6'),
	(62, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7aec-781b-9661-2af7ef925e50'),
	(63, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b27-76ad-b725-ed7f294580c0'),
	(64, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7acd-7df3-9cac-0b865943cd14'),
	(65, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7aa7-7f93-b65c-9aaf1eee6815'),
	(66, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b30-75f3-b4fc-c6deb7049595'),
	(67, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ab1-7862-b541-b5243caae420'),
	(68, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b20-7086-85b2-0ca5ddf98f85'),
	(69, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ac3-7fe0-b124-e2a9ef8fcbbe'),
	(70, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b3f-772e-ae74-61dce7e063d5'),
	(71, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b1a-7fd2-8ac4-96c20c5c7cb6'),
	(72, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b2a-79c3-981a-828d46fd0db1'),
	(73, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7a98-724e-8455-a288e0ddf2de'),
	(74, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b03-7712-9b01-5208fa850d45'),
	(75, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ae7-700c-838f-796b4c7125f7'),
	(76, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ac9-7bf6-a047-fcd673a8b427'),
	(77, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b4d-7fb9-823e-74bc100c6e18'),
	(78, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b23-7fe2-9ef0-c171b6b5f650'),
	(79, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7af9-77a3-b4d3-293fdb6f1fcb'),
	(80, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7a8c-71aa-b5a2-454222fe7a94'),
	(81, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ad8-79cc-abd2-1e00700fbf0a'),
	(82, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7af2-79a4-badd-f17535e294cb'),
	(83, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7ad3-75a6-b4c5-54531872923e'),
	(84, '01a167a4-7b71-7ee6-9e2d-2cc0dcc3bfb8', '01a167a4-7b4a-75e6-8a58-8a78c5a7ad47'),
	(85, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7aa1-7aa2-8a64-295a9001416d'),
	(86, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7ac3-7fe0-b124-e2a9ef8fcbbe'),
	(87, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7b4d-7fb9-823e-74bc100c6e18'),
	(88, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7a8c-71aa-b5a2-454222fe7a94'),
	(89, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7a95-7c57-9d78-243ea4a4284f'),
	(90, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7b2a-79c3-981a-828d46fd0db1'),
	(91, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7acd-7df3-9cac-0b865943cd14'),
	(92, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7aa7-7f93-b65c-9aaf1eee6815'),
	(93, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7aac-74c1-b4c7-723ccd865b06'),
	(94, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7ad3-75a6-b4c5-54531872923e'),
	(95, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7ab1-7862-b541-b5243caae420'),
	(96, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7b20-7086-85b2-0ca5ddf98f85'),
	(97, '01a167a4-7b7f-78b9-affd-1053c622ca24', '01a167a4-7ae7-700c-838f-796b4c7125f7'),
	(98, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b4d-7fb9-823e-74bc100c6e18'),
	(99, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b2d-754d-99e9-069fae06e01a'),
	(100, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7af9-77a3-b4d3-293fdb6f1fcb'),
	(101, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b16-7038-be2f-cbccf53b5dc3'),
	(102, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b0c-7144-82a7-6723a4085e45'),
	(103, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b1a-7fd2-8ac4-96c20c5c7cb6'),
	(104, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b42-710f-a106-3f54f6ab560e'),
	(105, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7ad3-75a6-b4c5-54531872923e'),
	(106, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b07-74d8-930f-aa3091f8f193'),
	(107, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b03-7712-9b01-5208fa850d45'),
	(108, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7ae7-700c-838f-796b4c7125f7'),
	(109, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b1d-7c92-8632-6f20acdcbc88'),
	(110, '01a167a4-7b85-7307-8e81-40a60509e6d3', '01a167a4-7b3b-71c7-8b64-43174295d4e2'),
	(111, '01a167a4-7b8c-7a4b-989c-ecf117057802', '01a167a4-7af9-77a3-b4d3-293fdb6f1fcb'),
	(112, '01a167a4-7b8c-7a4b-989c-ecf117057802', '01a167a4-7a8c-71aa-b5a2-454222fe7a94'),
	(113, '01a167a4-7b8c-7a4b-989c-ecf117057802', '01a167a4-7b2d-754d-99e9-069fae06e01a'),
	(114, '01a167a4-7b91-790d-9cea-23b0ce0ce1a3', '01a167a4-7af9-77a3-b4d3-293fdb6f1fcb'),
	(115, '01a167a4-7b91-790d-9cea-23b0ce0ce1a3', '01a167a4-7a8c-71aa-b5a2-454222fe7a94'),
	(116, '01a167a4-7b91-790d-9cea-23b0ce0ce1a3', '01a167a4-7a95-7c57-9d78-243ea4a4284f'),
	(117, '01a167a4-7b91-790d-9cea-23b0ce0ce1a3', '01a167a4-7b2d-754d-99e9-069fae06e01a'),
	(118, '01a167a4-7b98-7461-89fe-5f5b113f9ef0', '01a167a4-7af2-79a4-badd-f17535e294cb'),
	(119, '01a167a4-7b98-7461-89fe-5f5b113f9ef0', '01a167a4-7ae7-700c-838f-796b4c7125f7'),
	(120, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '01a167a4-7aa4-786c-952d-4ee0a9300544'),
	(121, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '01a167a4-7aa7-7f93-b65c-9aaf1eee6815'),
	(122, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '01a167a4-7b55-7924-8b17-4318b17f8d52'),
	(123, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '01a167a4-7b03-7712-9b01-5208fa850d45'),
	(124, '01a167a4-7b9c-7dd1-973e-cbef7ca254dd', '01a167a4-7adf-7e3c-8f44-e6254e93d7ba'),
	(125, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7aa4-786c-952d-4ee0a9300544'),
	(126, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7b3b-71c7-8b64-43174295d4e2'),
	(127, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7aa7-7f93-b65c-9aaf1eee6815'),
	(128, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7b55-7924-8b17-4318b17f8d52'),
	(129, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7b03-7712-9b01-5208fa850d45'),
	(130, '01a167a4-7ba4-73f7-a276-4ac3c5a55aa6', '01a167a4-7adf-7e3c-8f44-e6254e93d7ba');


--
-- Data for Name: accounts_staffmembership; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.accounts_staffmembership VALUES
	('01a167a4-7bc2-706c-bf30-6d26a6f66c50', '2026-10-23 07:23:15.26649+00', '2026-10-23 07:23:15.266497+00', 'HUB_AGENT', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-774e-7c8c-a622-90979fd67673'),
	('01a167a4-8144-7d9c-bee5-47bd176ea92d', '2026-10-23 07:23:16.67709+00', '2026-10-23 07:23:16.677099+00', 'HUB_AGENT', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-810d-725f-a746-8813fc5b8d71');


--
-- Data for Name: accounts_trusteddevice; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accounts_user_groups; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: accounts_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: analytics_dailyaccountmetric; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.analytics_dailyaccountmetric VALUES
	('01a167a4-7c22-73c4-8280-60fc5b5817ea', '2026-10-23 07:23:15.362739+00', '2026-10-23 07:23:15.362747+00', '2026-10-23', 2, 180000, 4.250, 1.800, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c2e-7b23-ac3b-7062ab049873', '2026-10-23 07:23:15.374757+00', '2026-10-23 07:23:15.374765+00', '2026-10-22', 3, 192000, 4.400, 1.850, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c35-765f-be00-e1cb1f4cd451', '2026-10-23 07:23:15.381261+00', '2026-10-23 07:23:15.381268+00', '2026-10-21', 4, 204000, 4.550, 1.900, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c3b-7aee-9235-27cae17c8fb6', '2026-10-23 07:23:15.387136+00', '2026-10-23 07:23:15.387145+00', '2026-10-20', 2, 216000, 4.700, 1.950, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c41-7b16-a782-b868e7cb3a17', '2026-10-23 07:23:15.39358+00', '2026-10-23 07:23:15.393587+00', '2026-10-19', 3, 228000, 4.850, 2.000, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c4c-7ca5-a75d-a48e84617251', '2026-10-23 07:23:15.404816+00', '2026-10-23 07:23:15.404823+00', '2026-10-18', 4, 240000, 5.000, 2.050, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7c53-7bef-822d-0076bd5eb13e', '2026-10-23 07:23:15.411448+00', '2026-10-23 07:23:15.411458+00', '2026-10-17', 2, 252000, 5.150, 2.100, '{"disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}', '01a167a4-7bde-7ce0-84c7-e7789e83448f');


--
-- Data for Name: mobility_hub; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_hub VALUES
	('01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '2026-10-23 07:23:14.392944+00', '2026-10-23 07:23:14.392953+00', 'HUB-YBA-01', 'Yaba Commercial Hub', 'Commercial Ave & Herbert Macaulay Way, Yaba, Lagos', 6.5173, 3.3734, 16, 15.00, 'ONLINE', '2026-10-23 07:20:15.247002+00', '{}', 'Africa/Lagos'),
	('01a167a4-78dd-714d-a206-e1f0949f4bc8', '2026-10-23 07:23:14.525526+00', '2026-10-23 07:23:14.525536+00', 'HUB-SUR-01', 'Surulere Transit Hub', 'Adeniran Ogunsanya St, Surulere, Lagos', 6.501, 3.358, 12, 12.00, 'ONLINE', '2026-10-23 07:13:15.247002+00', '{}', 'Africa/Lagos'),
	('01a167a4-7947-7871-97d7-5cc0fb487bd2', '2026-10-23 07:23:14.631325+00', '2026-10-23 07:23:14.631333+00', 'HUB-IKJ-01', 'Ikeja Mobility Station', 'Awolowo Way, Ikeja, Lagos', 6.5954, 3.3448, 16, 18.00, 'ONLINE', '2026-10-23 07:06:15.247002+00', '{}', 'Africa/Lagos'),
	('01a167a4-79ab-7d58-842a-da264f6efd82', '2026-10-23 07:23:14.73184+00', '2026-10-23 07:23:14.731847+00', 'HUB-VI-01', 'Victoria Island Central Hub', 'Ahmadu Bello Way, VI, Lagos', 6.4281, 3.4219, 12, 22.00, 'ONLINE', '2026-10-23 06:59:15.247002+00', '{}', 'Africa/Lagos'),
	('01a167a4-79e5-767b-a18f-24d9e5476e14', '2026-10-23 07:23:14.789254+00', '2026-10-23 07:23:14.78926+00', 'HUB-EPE-01', 'Epe Waterside Hub', 'Epe–Ikorodu Rd, Epe, Lagos', 6.584, 3.983, 8, 10.00, 'ONLINE', '2026-10-23 06:52:15.247002+00', '{}', 'Africa/Lagos');


--
-- Data for Name: analytics_dailyhubmetric; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.analytics_dailyhubmetric VALUES
	('01a167a4-7c29-7bcc-bb7d-4d251767a6ec', '2026-10-23 07:23:15.370024+00', '2026-10-23 07:23:15.370033+00', '2026-10-23', 18, '{"CASH": 45000, "WALLET": 220000}', 11.50, 0, 1, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c32-731d-9627-8659af451741', '2026-10-23 07:23:15.378411+00', '2026-10-23 07:23:15.378419+00', '2026-10-22', 19, '{"CASH": 47000, "WALLET": 235000}', 11.30, 1, 0, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c38-7ad5-89e1-1038ea58b3e5', '2026-10-23 07:23:15.384411+00', '2026-10-23 07:23:15.384417+00', '2026-10-21', 20, '{"CASH": 49000, "WALLET": 250000}', 11.10, 0, 0, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c3e-7339-9f9b-65320db5db16', '2026-10-23 07:23:15.390406+00', '2026-10-23 07:23:15.390413+00', '2026-10-20', 21, '{"CASH": 51000, "WALLET": 265000}', 10.90, 1, 1, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c44-7134-8101-8f986dfa3ae9', '2026-10-23 07:23:15.396769+00', '2026-10-23 07:23:15.396776+00', '2026-10-19', 22, '{"CASH": 53000, "WALLET": 280000}', 10.70, 0, 0, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c4f-73dd-80e8-b2c507d1b79c', '2026-10-23 07:23:15.4079+00', '2026-10-23 07:23:15.407906+00', '2026-10-18', 23, '{"CASH": 55000, "WALLET": 295000}', 10.50, 1, 0, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7c57-7c64-9249-854517d0784e', '2026-10-23 07:23:15.415912+00', '2026-10-23 07:23:15.415924+00', '2026-10-17', 24, '{"CASH": 57000, "WALLET": 310000}', 10.30, 0, 1, '{"source": "seed_hub_day"}', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64');


--
-- Data for Name: analytics_impactstory; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.analytics_impactstory VALUES
	('01a167a4-7c63-7709-bd38-bd4d711c9075', '2026-10-23 07:23:15.427811+00', '2026-10-23 07:23:15.42782+00', 'Makoko ferry skippers cut petrol runs', 'Lagos — Makoko', '14 engines surrendered · ~9.2 t CO₂e (Aug)', 'Lagos State Ministry of Transportation', 'Path B canoe conversions at Yaba yard let ferry operators keep hulls while Kura stores petrol outboards as returnable collateral.', 'PUBLISHED', '2026-10-18 07:23:15.426269+00', '{"hero_public_id": "seed/impact/makoko_ferry.jpg"}', '01a167a4-7721-7980-b8ed-6cb600490387');


--
-- Data for Name: analytics_monthlyimpactmetric; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.analytics_monthlyimpactmetric VALUES
	('01a167a4-7c5c-747c-aa61-b7d4da1f94b9', '2026-10-23 07:23:15.420739+00', '2026-10-23 07:23:15.420747+00', '2026-08', 128, 4120, 185000000, 14, 9200.000, '{"source": "seed_rollup", "disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}'),
	('01a167a4-7c60-7cb0-abb5-0ac23d28f1c4', '2026-10-23 07:23:15.424693+00', '2026-10-23 07:23:15.424701+00', '2026-09', 141, 980, 42500000, 3, 2100.500, '{"source": "seed_rollup", "disclaimer": "Estimate from swap energy vs configured petrol price.", "g_co2_per_litre": 2310, "naira_per_litre": 1100, "kwh_per_litre_equiv": 9.7}');


--
-- Data for Name: analytics_reportjob; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.analytics_reportjob VALUES
	('01a167a4-7c6d-7477-b7ab-ae9bce31e914', '2026-10-23 07:23:15.437588+00', '2026-10-23 07:23:15.464671+00', 'IMPACT_PDF', '{"period": "2026-08"}', 'READY', 'reports/impact/01a167a4-7c6d-7477-b7ab-ae9bce31e914.pdf', '2026-10-24 07:23:15.464613+00', '{"bytes": 1512, "filename": "kura-impact-2026-08.pdf", "content_type": "application/pdf"}', '01a167a4-7721-7980-b8ed-6cb600490387', 'seed-impact-pdf-2026-08');


--
-- Data for Name: audit_auditevent; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.audit_auditevent VALUES
	('01a167a4-7bd0-7df8-9997-cef14ca679ba', '2026-10-23 07:23:15.280588+00', '2026-10-23 07:23:15.280595+00', 'agent.yaba@yopmail.com', 'HUB_AGENT', 'shift.opened', 'shift', '01a167a4-7bca-739a-87fb-4d2b489d318f', 'HUB-YBA-01 · agent.yaba@yopmail.com', '{}', '{"hub_id": "01a167a4-7858-7ef0-ba28-d5be8d1e7d64", "status": "OPEN", "opening_cash_kobo": 200000}', '{}', NULL, '', '', 'b45b2ba4a75807effba57cebb966bfef49d191d9def943cdb090809b2f624dca', '01a167a4-774e-7c8c-a622-90979fd67673'),
	('01a167a4-7c74-73ac-ba63-7a447409ca61', '2026-10-23 07:23:15.444506+00', '2026-10-23 07:23:15.444525+00', 'ops@yopmail.com', 'OPS_MANAGER', 'report.queued', 'report_job', '01a167a4-7c6d-7477-b7ab-ae9bce31e914', 'IMPACT_PDF', '{}', '{"kind": "IMPACT_PDF", "params": {"period": "2026-08"}, "status": "QUEUED"}', '{}', NULL, '', 'b45b2ba4a75807effba57cebb966bfef49d191d9def943cdb090809b2f624dca', '918c88c7ecae17fd29f8242f824314fdb1d6e0d396819487648f952e816e4555', '01a167a4-7721-7980-b8ed-6cb600490387'),
	('01a167a4-7c8c-76d9-a5d5-889d24ca729a', '2026-10-23 07:23:15.46815+00', '2026-10-23 07:23:15.468157+00', '', '', 'report.ready', 'report_job', '01a167a4-7c6d-7477-b7ab-ae9bce31e914', 'IMPACT_PDF', '{}', '{"status": "READY", "file_public_id": "reports/impact/01a167a4-7c6d-7477-b7ab-ae9bce31e914.pdf"}', '{}', NULL, '', '918c88c7ecae17fd29f8242f824314fdb1d6e0d396819487648f952e816e4555', '10545ae89482af37b01cf458b45e67c6d06acbf72d588859d585190fc2f7aa02', NULL),
	('01a167a4-7c95-7f33-8eba-11672755711d', '2026-10-23 07:23:15.477379+00', '2026-10-23 07:23:15.477387+00', 'ops@yopmail.com', 'OPS_MANAGER', 'telemetry.iot_key_rotated', 'vehicle', '01a167a4-7bf7-7523-9ac4-92fc3709168c', 'MK-HULL-07', '{}', '{"hardware_id": "hw-makoko-mk07"}', '{}', NULL, '', '10545ae89482af37b01cf458b45e67c6d06acbf72d588859d585190fc2f7aa02', '61f502688e0ccc360205067d8327258b721b1f28ea3601e5d49913ce9347fc6b', '01a167a4-7721-7980-b8ed-6cb600490387'),
	('01a167a4-7d0a-7489-b373-6e969f73a978', '2026-10-23 07:23:15.594608+00', '2026-10-23 07:23:15.594615+00', '', '', 'telemetry.iot_key_rotated', 'vehicle', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'FLEET-VCU-01', '{}', '{"hardware_id": "VCU-HW-01"}', '{}', NULL, '', '61f502688e0ccc360205067d8327258b721b1f28ea3601e5d49913ce9347fc6b', 'fdc4d1a1dc9b8708e46cf9bfb04aef4d3d766fdf946ba8eeed13648675c9b452', NULL),
	('01a167a4-7d17-74b4-8506-c330e5893c8e', '2026-10-23 07:23:15.60778+00', '2026-10-23 07:23:15.607787+00', '', '', 'telemetry.iot_key_rotated', 'vehicle', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'FLEET-VCU-02', '{}', '{"hardware_id": "VCU-HW-02"}', '{}', NULL, '', 'fdc4d1a1dc9b8708e46cf9bfb04aef4d3d766fdf946ba8eeed13648675c9b452', '36e1280b7e5487d78e631efd04985661d018f21561e36065873d3e1e1aacff57', NULL),
	('01a167a4-7d29-702b-b723-028087c97863', '2026-10-23 07:23:15.626044+00', '2026-10-23 07:23:15.626051+00', '', '', 'telemetry.iot_key_rotated', 'vehicle', '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'FLEET-VCU-03', '{}', '{"hardware_id": "VCU-HW-03"}', '{}', NULL, '', '36e1280b7e5487d78e631efd04985661d018f21561e36065873d3e1e1aacff57', '4de1b9b096f63b63c7f88797c8503d914ec1c6125b8f86085290780610303c77', NULL),
	('01a167a4-7dcf-7903-b522-705f0092fea0', '2026-10-23 07:23:15.791527+00', '2026-10-23 07:23:15.791534+00', 'admin@yopmail.com', 'SUPER_ADMIN', 'vehicle.assigned', 'vehicle', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'FLEET-VCU-01', '{"assigned_driver_id": null}', '{"assigned_driver_id": "01a167a4-7d83-7427-869f-fb5645df586d"}', '{"note": "seed day shift"}', NULL, '', '4de1b9b096f63b63c7f88797c8503d914ec1c6125b8f86085290780610303c77', '4d12f4a03c753f1802b729e8e02b12449dbc236992b57e14701e8ec0a8fbf868', '01a167a4-76c8-7974-b319-46c2676f9c4e'),
	('01a167a4-7ddd-79dc-a59b-99f2018478c1', '2026-10-23 07:23:15.805832+00', '2026-10-23 07:23:15.80584+00', 'admin@yopmail.com', 'SUPER_ADMIN', 'vehicle.assigned', 'vehicle', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'FLEET-VCU-02', '{"assigned_driver_id": null}', '{"assigned_driver_id": "01a167a4-7dc2-7e7b-99b0-78aceac440c2"}', '{"note": "seed night"}', NULL, '', '4d12f4a03c753f1802b729e8e02b12449dbc236992b57e14701e8ec0a8fbf868', '53acd93d3f71efaf5dd2fa88bbe0e8e61d40bd563d7e83b6a826ddb504cff442', '01a167a4-76c8-7974-b319-46c2676f9c4e');


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: core_auditevent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: core_configversion; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: core_queuedtask; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_creditscore; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_creditline; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_creditapplication; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_loan; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: finance_payment; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_payment VALUES
	('01a167a4-815a-75ee-9462-9eb4b7be89cb', '2026-10-23 07:23:16.698454+00', '2026-10-23 07:23:16.698462+00', 'WALLET_DEBIT', 40000, 0, 'RC-FGH8UAJH9W', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-01', NULL, NULL),
	('01a167a4-8168-7be9-a118-0718e59c5a3f', '2026-10-23 07:23:16.712943+00', '2026-10-23 07:23:16.71295+00', 'AGENT_CASH', 55000, 3837, 'RC-N3LVGFNGMY', 'SUCCESS', 'PLAN', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-02', NULL, NULL),
	('01a167a4-816e-7f8a-88fd-440cce466bb5', '2026-10-23 07:23:16.719016+00', '2026-10-23 07:23:16.719022+00', 'CARD', 70000, 0, 'RC-XAGZ9B0MBG', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-03', NULL, NULL),
	('01a167a4-817c-7ddc-b8af-e347fbc3a783', '2026-10-23 07:23:16.732214+00', '2026-10-23 07:23:16.73222+00', 'NUBAN_TRANSFER', 85000, 0, 'RC-7F7OWVDIX8', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-04', NULL, NULL),
	('01a167a4-818b-7a5f-a8a9-ba972ca3b324', '2026-10-23 07:23:16.747606+00', '2026-10-23 07:23:16.747613+00', 'WALLET_DEBIT', 100000, 0, 'RC-YPOEXJA1A7', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-05', NULL, NULL),
	('01a167a4-8199-72d0-b6ed-eac21b066e8d', '2026-10-23 07:23:16.761843+00', '2026-10-23 07:23:16.76185+00', 'AGENT_CASH', 115000, 0, 'RC-EC3Z02X82X', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-06', NULL, NULL),
	('01a167a4-81a2-745b-b335-605ae89d01a9', '2026-10-23 07:23:16.770874+00', '2026-10-23 07:23:16.770882+00', 'CARD', 130000, 9069, 'RC-03CVE6210N', 'SUCCESS', 'PLAN', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-07', NULL, NULL),
	('01a167a4-81a9-713a-b7ee-0e7b90530fc0', '2026-10-23 07:23:16.777147+00', '2026-10-23 07:23:16.777153+00', 'NUBAN_TRANSFER', 145000, 0, 'RC-6BRHYOX00E', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-08', NULL, NULL),
	('01a167a4-81b6-7db9-b040-ec9378ad8eab', '2026-10-23 07:23:16.79095+00', '2026-10-23 07:23:16.790957+00', 'WALLET_DEBIT', 25000, 0, 'RC-GQW7QIFG4P', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-09', NULL, NULL),
	('01a167a4-81c4-7554-8e84-fb7fcb6753b9', '2026-10-23 07:23:16.804135+00', '2026-10-23 07:23:16.804142+00', 'AGENT_CASH', 40000, 0, 'RC-KXK6TR9QRK', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-10', NULL, NULL),
	('01a167a4-81d3-7dd6-bb43-d87e7e1d91fa', '2026-10-23 07:23:16.819176+00', '2026-10-23 07:23:16.819183+00', 'CARD', 55000, 0, 'RC-KQAWYMAL8F', 'SUCCESS', 'FUND', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-11', NULL, NULL),
	('01a167a4-81dd-79c8-9d78-4df146bc44c0', '2026-10-23 07:23:16.829752+00', '2026-10-23 07:23:16.82976+00', 'NUBAN_TRANSFER', 70000, 4883, 'RC-9T6MXMZKCJ', 'SUCCESS', 'PLAN', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-pay-KR-882194-12', NULL, NULL),
	('01a167a4-81e5-7955-9c7f-a4f335c9a5f2', '2026-10-23 07:23:16.837731+00', '2026-10-23 07:23:16.837737+00', 'WALLET_DEBIT', 55000, 0, 'RC-8LPTSW91ML', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-01', NULL, NULL),
	('01a167a4-81f1-7fbb-aa58-ce1ce2e3a0a7', '2026-10-23 07:23:16.849878+00', '2026-10-23 07:23:16.849887+00', 'AGENT_CASH', 70000, 4883, 'RC-BHHOMWB173', 'SUCCESS', 'PLAN', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-02', NULL, NULL),
	('01a167a4-81f8-7a3b-b660-466faaeac99d', '2026-10-23 07:23:16.856199+00', '2026-10-23 07:23:16.856207+00', 'CARD', 85000, 0, 'RC-FQDICDXS7M', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-03', NULL, NULL),
	('01a167a4-820b-7e46-a828-f587b22b09d2', '2026-10-23 07:23:16.875537+00', '2026-10-23 07:23:16.875545+00', 'NUBAN_TRANSFER', 100000, 0, 'RC-ZWOBV5NFJM', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-04', NULL, NULL),
	('01a167a4-822c-7c23-97e5-66d33eb2d159', '2026-10-23 07:23:16.908902+00', '2026-10-23 07:23:16.908911+00', 'WALLET_DEBIT', 115000, 0, 'RC-4CB5FUO0R0', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-05', NULL, NULL),
	('01a167a4-823f-7ea1-80b4-c17d8df0e17b', '2026-10-23 07:23:16.927563+00', '2026-10-23 07:23:16.927572+00', 'AGENT_CASH', 130000, 0, 'RC-8Q6M1M4YRQ', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-06', NULL, NULL),
	('01a167a4-8252-79de-8651-57222ed587b1', '2026-10-23 07:23:16.946497+00', '2026-10-23 07:23:16.946515+00', 'CARD', 145000, 10116, 'RC-L0BP6S5K82', 'SUCCESS', 'PLAN', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-07', NULL, NULL),
	('01a167a4-8265-789e-bdc4-fe9a59d73365', '2026-10-23 07:23:16.965393+00', '2026-10-23 07:23:16.965409+00', 'NUBAN_TRANSFER', 25000, 0, 'RC-UDRF30Q1LF', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-08', NULL, NULL),
	('01a167a4-827e-7a81-8d45-63ef8a4fe9e8', '2026-10-23 07:23:16.990962+00', '2026-10-23 07:23:16.990973+00', 'WALLET_DEBIT', 40000, 0, 'RC-ZWS60P82AB', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-09', NULL, NULL),
	('01a167a4-829a-7340-8eb3-8dae31606bf3', '2026-10-23 07:23:17.018369+00', '2026-10-23 07:23:17.018386+00', 'AGENT_CASH', 55000, 0, 'RC-564Q8VB110', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-10', NULL, NULL),
	('01a167a4-82c7-78c8-a545-a654938c0931', '2026-10-23 07:23:17.063429+00', '2026-10-23 07:23:17.063547+00', 'CARD', 70000, 0, 'RC-BD5HH1J7JX', 'SUCCESS', 'FUND', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-11', NULL, NULL),
	('01a167a4-82e5-715e-b7cf-918e2555a5dd', '2026-10-23 07:23:17.093751+00', '2026-10-23 07:23:17.093763+00', 'NUBAN_TRANSFER', 85000, 5930, 'RC-SNH0T7387E', 'SUCCESS', 'PLAN', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-pay-KR-FLEET-VCU-12', NULL, NULL),
	('01a167a4-82ee-7f56-a0d5-5d4d81519723', '2026-10-23 07:23:17.102149+00', '2026-10-23 07:23:17.102157+00', 'WALLET_DEBIT', 70000, 0, 'RC-FG3V8M5JC5', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-01', NULL, NULL),
	('01a167a4-8300-7cf1-9608-a8194a18aadd', '2026-10-23 07:23:17.121052+00', '2026-10-23 07:23:17.121064+00', 'AGENT_CASH', 85000, 5930, 'RC-MDL8J9VMFV', 'SUCCESS', 'PLAN', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-02', NULL, NULL),
	('01a167a4-8309-7106-b84e-d5ae10a81cff', '2026-10-23 07:23:17.129777+00', '2026-10-23 07:23:17.129787+00', 'CARD', 100000, 0, 'RC-X33SCREPK9', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-03', NULL, NULL),
	('01a167a4-831d-7571-b405-eb0f8e7f0455', '2026-10-23 07:23:17.149525+00', '2026-10-23 07:23:17.149533+00', 'NUBAN_TRANSFER', 115000, 0, 'RC-JE7ILGJGFB', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-04', NULL, NULL),
	('01a167a4-8335-7945-bedd-e31a7301dc53', '2026-10-23 07:23:17.173982+00', '2026-10-23 07:23:17.174001+00', 'WALLET_DEBIT', 130000, 0, 'RC-62QISNDK4W', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-05', NULL, NULL),
	('01a167a4-8357-77e2-b727-6014a45699d5', '2026-10-23 07:23:17.207507+00', '2026-10-23 07:23:17.20752+00', 'AGENT_CASH', 145000, 0, 'RC-N5DO08MR1N', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-06', NULL, NULL),
	('01a167a4-8372-7ff2-8ee7-75ce364b4632', '2026-10-23 07:23:17.234639+00', '2026-10-23 07:23:17.234663+00', 'CARD', 25000, 1744, 'RC-I13PAGOLE2', 'SUCCESS', 'PLAN', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-07', NULL, NULL),
	('01a167a4-8381-71f6-8075-58c9be9caddc', '2026-10-23 07:23:17.249491+00', '2026-10-23 07:23:17.249511+00', 'NUBAN_TRANSFER', 40000, 0, 'RC-V6R1SLMKHV', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-08', NULL, NULL),
	('01a167a4-83a4-7c1b-a94c-dcdef945b5aa', '2026-10-23 07:23:17.284624+00', '2026-10-23 07:23:17.284645+00', 'WALLET_DEBIT', 55000, 0, 'RC-VOTHAAU4KW', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-09', NULL, NULL),
	('01a167a4-83ca-7c17-8f0e-902cbf375542', '2026-10-23 07:23:17.322492+00', '2026-10-23 07:23:17.322547+00', 'AGENT_CASH', 70000, 0, 'RC-GTK30HX343', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-10', NULL, NULL),
	('01a167a4-83ea-7555-ad4e-26377b00ef28', '2026-10-23 07:23:17.355004+00', '2026-10-23 07:23:17.355013+00', 'CARD', 85000, 0, 'RC-JBESC2PBAK', 'SUCCESS', 'FUND', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-11', NULL, NULL),
	('01a167a4-8401-7de0-a83c-e044f3f47c02', '2026-10-23 07:23:17.377906+00', '2026-10-23 07:23:17.37793+00', 'NUBAN_TRANSFER', 100000, 6976, 'RC-QMJCC5DU7Y', 'SUCCESS', 'PLAN', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-pay-KR-FLEET-NOVCU-12', NULL, NULL),
	('01a167a4-8412-7b8e-b395-81c0b067346e', '2026-10-23 07:23:17.394993+00', '2026-10-23 07:23:17.395174+00', 'WALLET_DEBIT', 85000, 0, 'RC-R2KDX1MRU7', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-01', NULL, NULL),
	('01a167a4-8428-7ffa-9b52-a3ddbdfb0966', '2026-10-23 07:23:17.416511+00', '2026-10-23 07:23:17.416533+00', 'AGENT_CASH', 100000, 6976, 'RC-0PSIEW98UU', 'SUCCESS', 'PLAN', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-02', NULL, NULL),
	('01a167a4-8435-7b9a-a22f-b78da71d7dc6', '2026-10-23 07:23:17.429995+00', '2026-10-23 07:23:17.430004+00', 'CARD', 115000, 0, 'RC-T675EYFYO2', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-03', NULL, NULL),
	('01a167a4-8453-7f31-b24e-b158db92fc1a', '2026-10-23 07:23:17.459447+00', '2026-10-23 07:23:17.459466+00', 'NUBAN_TRANSFER', 130000, 0, 'RC-B7F5RA32K1', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-04', NULL, NULL),
	('01a167a4-847b-7c43-8943-e16868648ce2', '2026-10-23 07:23:17.499475+00', '2026-10-23 07:23:17.499496+00', 'WALLET_DEBIT', 145000, 0, 'RC-PSQJUFDURQ', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-05', NULL, NULL),
	('01a167a4-8494-71b2-8c10-2a1050a386f0', '2026-10-23 07:23:17.524636+00', '2026-10-23 07:23:17.524647+00', 'AGENT_CASH', 25000, 0, 'RC-EOTUC0VJ7M', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-06', NULL, NULL),
	('01a167a4-84a2-760e-9c09-ec592a8327a1', '2026-10-23 07:23:17.538675+00', '2026-10-23 07:23:17.538685+00', 'CARD', 40000, 2790, 'RC-ZCALGIVF8D', 'SUCCESS', 'PLAN', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-07', NULL, NULL),
	('01a167a4-84b3-7845-ad12-70c1871dd698', '2026-10-23 07:23:17.556237+00', '2026-10-23 07:23:17.556258+00', 'NUBAN_TRANSFER', 55000, 0, 'RC-5Q4ZN16ACL', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-08', NULL, NULL),
	('01a167a4-84fb-7375-a37a-f7d984d7192d', '2026-10-23 07:23:17.627634+00', '2026-10-23 07:23:17.627641+00', 'WALLET_DEBIT', 70000, 0, 'RC-U7BP8DKH9J', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-09', NULL, NULL),
	('01a167a4-850b-7b5d-8873-f35cb422bb2c', '2026-10-23 07:23:17.644066+00', '2026-10-23 07:23:17.644076+00', 'AGENT_CASH', 85000, 0, 'RC-OC4610NZAF', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-10', NULL, NULL),
	('01a167a4-8521-7999-8e9a-ce37e2af9903', '2026-10-23 07:23:17.665402+00', '2026-10-23 07:23:17.665409+00', 'CARD', 100000, 0, 'RC-08MEZB0Z3U', 'SUCCESS', 'FUND', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-11', NULL, NULL),
	('01a167a4-852b-7961-8088-54132b3c3600', '2026-10-23 07:23:17.675309+00', '2026-10-23 07:23:17.675317+00', 'NUBAN_TRANSFER', 115000, 8023, 'RC-DU909DHF4T', 'SUCCESS', 'PLAN', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-pay-KR-RIDER-01-12', NULL, NULL),
	('01a167a4-8531-7b10-be6a-ecee6cef378c', '2026-10-23 07:23:17.681356+00', '2026-10-23 07:23:17.681363+00', 'WALLET_DEBIT', 100000, 0, 'RC-M82EA1U9NW', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-01', NULL, NULL),
	('01a167a4-853e-778e-81d8-17476516d2cf', '2026-10-23 07:23:17.694715+00', '2026-10-23 07:23:17.694723+00', 'AGENT_CASH', 115000, 8023, 'RC-ACEKWLR6MB', 'SUCCESS', 'PLAN', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-02', NULL, NULL),
	('01a167a4-8545-7080-99fa-39669391ca71', '2026-10-23 07:23:17.701476+00', '2026-10-23 07:23:17.701483+00', 'CARD', 130000, 0, 'RC-AUCYJU6JJY', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-03', NULL, NULL),
	('01a167a4-8552-733f-a38d-679c88ecb2d9', '2026-10-23 07:23:17.714241+00', '2026-10-23 07:23:17.714247+00', 'NUBAN_TRANSFER', 145000, 0, 'RC-33T4RBUWTL', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-04', NULL, NULL),
	('01a167a4-855f-7f81-b7b5-bb2d388e4b42', '2026-10-23 07:23:17.727885+00', '2026-10-23 07:23:17.727892+00', 'WALLET_DEBIT', 25000, 0, 'RC-K3TKB9ZWBF', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-05', NULL, NULL),
	('01a167a4-856e-7905-9002-441f0dc398bf', '2026-10-23 07:23:17.742364+00', '2026-10-23 07:23:17.74237+00', 'AGENT_CASH', 40000, 0, 'RC-EEK2V5CYL4', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-06', NULL, NULL),
	('01a167a4-8576-73e2-9264-9ef578a699a3', '2026-10-23 07:23:17.751078+00', '2026-10-23 07:23:17.751088+00', 'CARD', 55000, 3837, 'RC-01QQ2YDU77', 'SUCCESS', 'PLAN', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-07', NULL, NULL),
	('01a167a4-857d-7991-92a8-e4dcb09e4793', '2026-10-23 07:23:17.757239+00', '2026-10-23 07:23:17.757247+00', 'NUBAN_TRANSFER', 70000, 0, 'RC-TFEX9A9E0E', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-08', NULL, NULL),
	('01a167a4-858a-7e2e-b184-96fe7faaf5e1', '2026-10-23 07:23:17.770787+00', '2026-10-23 07:23:17.770793+00', 'WALLET_DEBIT', 85000, 0, 'RC-81P4JZR3PA', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-09', NULL, NULL),
	('01a167a4-8598-7d1e-a686-087f08f774f6', '2026-10-23 07:23:17.784127+00', '2026-10-23 07:23:17.784134+00', 'AGENT_CASH', 100000, 0, 'RC-A13VQATQKF', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-10', NULL, NULL),
	('01a167a4-85a4-7390-ab48-fdf6824bd36b', '2026-10-23 07:23:17.79665+00', '2026-10-23 07:23:17.796656+00', 'CARD', 115000, 0, 'RC-PIFGI9SPOP', 'SUCCESS', 'FUND', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-11', NULL, NULL),
	('01a167a4-85ae-754d-9930-3eba0b91de96', '2026-10-23 07:23:17.806997+00', '2026-10-23 07:23:17.807006+00', 'NUBAN_TRANSFER', 130000, 9069, 'RC-W6CJ5QSECO', 'SUCCESS', 'PLAN', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-pay-KR-RIDER-02-12', NULL, NULL),
	('01a167a4-85b5-7d4a-9f92-53aba5966714', '2026-10-23 07:23:17.81332+00', '2026-10-23 07:23:17.813327+00', 'WALLET_DEBIT', 115000, 0, 'RC-HAHS0K4Z6J', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-01', NULL, NULL),
	('01a167a4-85bf-74fa-9407-9465f2f9907c', '2026-10-23 07:23:17.823818+00', '2026-10-23 07:23:17.823825+00', 'AGENT_CASH', 130000, 9069, 'RC-D0V84EXRDR', 'SUCCESS', 'PLAN', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-02', NULL, NULL),
	('01a167a4-85c5-727a-aad1-7da92843b331', '2026-10-23 07:23:17.829741+00', '2026-10-23 07:23:17.829748+00', 'CARD', 145000, 0, 'RC-80LDD1RX7N', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-03', NULL, NULL),
	('01a167a4-85d7-76ea-86c7-9e22639bb04f', '2026-10-23 07:23:17.847908+00', '2026-10-23 07:23:17.847921+00', 'NUBAN_TRANSFER', 25000, 0, 'RC-LCA6VB0NDK', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-04', NULL, NULL),
	('01a167a4-85e6-7233-a1a6-083c00a0b9ac', '2026-10-23 07:23:17.863072+00', '2026-10-23 07:23:17.863079+00', 'WALLET_DEBIT', 40000, 0, 'RC-IHG6787Z4H', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-05', NULL, NULL),
	('01a167a4-85f9-7340-8bd2-2d8db0e6652d', '2026-10-23 07:23:17.881376+00', '2026-10-23 07:23:17.881385+00', 'AGENT_CASH', 55000, 0, 'RC-7N5MI0RQIJ', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-06', NULL, NULL),
	('01a167a4-860a-756e-96a7-0d0450a8f39a', '2026-10-23 07:23:17.898605+00', '2026-10-23 07:23:17.898614+00', 'CARD', 70000, 4883, 'RC-BJOA0QT1E0', 'SUCCESS', 'PLAN', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-07', NULL, NULL),
	('01a167a4-8611-70f2-8656-d047b45ec3b8', '2026-10-23 07:23:17.905411+00', '2026-10-23 07:23:17.905418+00', 'NUBAN_TRANSFER', 85000, 0, 'RC-62Q9K3ZE5I', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-08', NULL, NULL),
	('01a167a4-8620-71e3-aa25-303682b88893', '2026-10-23 07:23:17.920176+00', '2026-10-23 07:23:17.920183+00', 'WALLET_DEBIT', 100000, 0, 'RC-2PACK03THC', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-09', NULL, NULL),
	('01a167a4-862e-7fb0-b63e-e0e441d5ddf2', '2026-10-23 07:23:17.934793+00', '2026-10-23 07:23:17.934801+00', 'AGENT_CASH', 115000, 0, 'RC-K0T54QJGMX', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-10', NULL, NULL),
	('01a167a4-863c-7feb-bf14-2ed49840c2a6', '2026-10-23 07:23:17.949109+00', '2026-10-23 07:23:17.949117+00', 'CARD', 130000, 0, 'RC-Q7VPAFW5XZ', 'SUCCESS', 'FUND', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-11', NULL, NULL),
	('01a167a4-8646-702b-971e-926df3fbf62f', '2026-10-23 07:23:17.958951+00', '2026-10-23 07:23:17.958961+00', 'NUBAN_TRANSFER', 145000, 10116, 'RC-SINL4R5XI9', 'SUCCESS', 'PLAN', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-pay-KR-RIDER-03-12', NULL, NULL),
	('01a167a4-864d-7c56-96da-9cf8cae1fc11', '2026-10-23 07:23:17.965158+00', '2026-10-23 07:23:17.965168+00', 'WALLET_DEBIT', 130000, 0, 'RC-WRTWN7H7CN', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-01', NULL, NULL),
	('01a167a4-865a-7c46-b080-a8ae0a59a31b', '2026-10-23 07:23:17.978593+00', '2026-10-23 07:23:17.978601+00', 'AGENT_CASH', 145000, 10116, 'RC-HDTN7LDUPC', 'SUCCESS', 'PLAN', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-02', NULL, NULL),
	('01a167a4-8660-7f6b-9a1d-78803fbd3f25', '2026-10-23 07:23:17.98483+00', '2026-10-23 07:23:17.984838+00', 'CARD', 25000, 0, 'RC-FJH5EGLX46', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-03', NULL, NULL),
	('01a167a4-866f-7399-85ca-4dfcecbb8216', '2026-10-23 07:23:17.999658+00', '2026-10-23 07:23:17.999666+00', 'NUBAN_TRANSFER', 40000, 0, 'RC-B476JEWVLC', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-04', NULL, NULL),
	('01a167a4-867d-7fc8-a838-f2dd61505e3f', '2026-10-23 07:23:18.013416+00', '2026-10-23 07:23:18.013423+00', 'WALLET_DEBIT', 55000, 0, 'RC-582P9P1X6L', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-05', NULL, NULL),
	('01a167a4-868b-75e0-b308-7d61ac8baa0d', '2026-10-23 07:23:18.027717+00', '2026-10-23 07:23:18.027725+00', 'AGENT_CASH', 70000, 0, 'RC-W9NJFHV33E', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-06', NULL, NULL),
	('01a167a4-8694-7a7b-a94b-e6182c25c997', '2026-10-23 07:23:18.03675+00', '2026-10-23 07:23:18.036758+00', 'CARD', 85000, 5930, 'RC-8NY1LRC18A', 'SUCCESS', 'PLAN', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-07', NULL, NULL),
	('01a167a4-869a-7740-bdc0-c1435b515828', '2026-10-23 07:23:18.042611+00', '2026-10-23 07:23:18.042618+00', 'NUBAN_TRANSFER', 100000, 0, 'RC-07240BMG1K', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-08', NULL, NULL),
	('01a167a4-86a8-7108-80cc-861f8abb493b', '2026-10-23 07:23:18.056711+00', '2026-10-23 07:23:18.056718+00', 'WALLET_DEBIT', 115000, 0, 'RC-VXSTZHEFH9', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-09', NULL, NULL),
	('01a167a4-86b6-750d-9657-3fb551dc3122', '2026-10-23 07:23:18.07097+00', '2026-10-23 07:23:18.070978+00', 'AGENT_CASH', 130000, 0, 'RC-42U1IUTJP1', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-10', NULL, NULL),
	('01a167a4-86c4-7e12-8a92-db068e3792f7', '2026-10-23 07:23:18.085091+00', '2026-10-23 07:23:18.085098+00', 'CARD', 145000, 0, 'RC-2JIZAY3X28', 'SUCCESS', 'FUND', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-11', NULL, NULL),
	('01a167a4-86cf-78fd-91d8-2257d9b1a4d0', '2026-10-23 07:23:18.096152+00', '2026-10-23 07:23:18.096162+00', 'NUBAN_TRANSFER', 25000, 1744, 'RC-Y34ORT67SJ', 'SUCCESS', 'PLAN', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-pay-KR-RIDER-04-12', NULL, NULL),
	('01a167a4-86d7-7a56-8b66-ae49aa00a1f7', '2026-10-23 07:23:18.103264+00', '2026-10-23 07:23:18.103272+00', 'WALLET_DEBIT', 145000, 0, 'RC-NGS2YFJ6AT', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-01', NULL, NULL),
	('01a167a4-86e7-7c10-a34f-3a4e20374908', '2026-10-23 07:23:18.120094+00', '2026-10-23 07:23:18.120104+00', 'AGENT_CASH', 25000, 1744, 'RC-RCCV7J0CLV', 'SUCCESS', 'PLAN', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-02', NULL, NULL),
	('01a167a4-86ef-71fd-857f-d9ec029659e2', '2026-10-23 07:23:18.127592+00', '2026-10-23 07:23:18.1276+00', 'CARD', 40000, 0, 'RC-OLA7I1L53B', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-03', NULL, NULL),
	('01a167a4-8708-7ce5-a847-fedb4e49d842', '2026-10-23 07:23:18.15309+00', '2026-10-23 07:23:18.153098+00', 'NUBAN_TRANSFER', 55000, 0, 'RC-7CXARFQFTL', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-04', NULL, NULL),
	('01a167a4-8720-7aa1-a0f5-e99937f3175c', '2026-10-23 07:23:18.176737+00', '2026-10-23 07:23:18.176751+00', 'WALLET_DEBIT', 70000, 0, 'RC-U7HJ9XHZTA', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-05', NULL, NULL),
	('01a167a4-873c-723a-a1bb-790df5ee63d5', '2026-10-23 07:23:18.204249+00', '2026-10-23 07:23:18.204259+00', 'AGENT_CASH', 85000, 0, 'RC-2HZLH5ILAO', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-06', NULL, NULL),
	('01a167a4-8754-77dd-afc8-7607d66fb881', '2026-10-23 07:23:18.22984+00', '2026-10-23 07:23:18.229854+00', 'CARD', 100000, 6976, 'RC-7FITGBFGN3', 'SUCCESS', 'PLAN', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-07', NULL, NULL),
	('01a167a4-8760-70cc-8676-47496d1f31ec', '2026-10-23 07:23:18.242296+00', '2026-10-23 07:23:18.242315+00', 'NUBAN_TRANSFER', 115000, 0, 'RC-ERUE9SXNRD', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-08', NULL, NULL),
	('01a167a4-877c-7be3-b0a7-98f12260bfdd', '2026-10-23 07:23:18.268785+00', '2026-10-23 07:23:18.268815+00', 'WALLET_DEBIT', 130000, 0, 'RC-GEFYF5ETIC', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-09', NULL, NULL),
	('01a167a4-87a3-701c-9ac9-e341607af622', '2026-10-23 07:23:18.307618+00', '2026-10-23 07:23:18.307628+00', 'AGENT_CASH', 145000, 0, 'RC-WTUEFCPLSK', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-10', NULL, NULL),
	('01a167a4-87c4-77e5-83ba-d5ebe835c1ba', '2026-10-23 07:23:18.341188+00', '2026-10-23 07:23:18.341212+00', 'CARD', 25000, 0, 'RC-6UME338S1Q', 'SUCCESS', 'FUND', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-11', NULL, NULL),
	('01a167a4-87e2-7f53-a0d5-2a09812c933d', '2026-10-23 07:23:18.371435+00', '2026-10-23 07:23:18.371465+00', 'NUBAN_TRANSFER', 40000, 2790, 'RC-KGTJSRO6MX', 'SUCCESS', 'PLAN', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-pay-KR-RIDER-05-12', NULL, NULL),
	('01a167a4-87f9-7c6d-ae21-f586ff0b7bb1', '2026-10-23 07:23:18.3936+00', '2026-10-23 07:23:18.39362+00', 'WALLET_DEBIT', 25000, 0, 'RC-UTUF40M4KQ', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-01', NULL, NULL),
	('01a167a4-8812-7760-86da-654d4c4e8468', '2026-10-23 07:23:18.419225+00', '2026-10-23 07:23:18.419245+00', 'AGENT_CASH', 40000, 2790, 'RC-0RCU5AACVI', 'SUCCESS', 'PLAN', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-02', NULL, NULL),
	('01a167a4-8823-7715-9199-e988527bbf56', '2026-10-23 07:23:18.435811+00', '2026-10-23 07:23:18.435825+00', 'CARD', 55000, 0, 'RC-CSB74HADDJ', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-03', NULL, NULL),
	('01a167a4-884c-77c7-9526-c751371b453f', '2026-10-23 07:23:18.477558+00', '2026-10-23 07:23:18.477598+00', 'NUBAN_TRANSFER', 70000, 0, 'RC-KY6NR6FIYB', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-04', NULL, NULL),
	('01a167a4-887b-7833-9de7-d7d75a8d0fee', '2026-10-23 07:23:18.523403+00', '2026-10-23 07:23:18.523415+00', 'WALLET_DEBIT', 85000, 0, 'RC-SBGZAX8IV8', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-05', NULL, NULL),
	('01a167a4-8894-7daf-bfb0-49facb458bfb', '2026-10-23 07:23:18.5487+00', '2026-10-23 07:23:18.548709+00', 'AGENT_CASH', 100000, 0, 'RC-5GYOB26UHP', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-06', NULL, NULL),
	('01a167a4-88b4-753f-85e5-aa92aad49d66', '2026-10-23 07:23:18.581373+00', '2026-10-23 07:23:18.581414+00', 'CARD', 115000, 8023, 'RC-ZC1YW11VPE', 'SUCCESS', 'PLAN', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-07', NULL, NULL),
	('01a167a4-88cb-7fec-b61c-8fb47c634c63', '2026-10-23 07:23:18.604654+00', '2026-10-23 07:23:18.604674+00', 'NUBAN_TRANSFER', 130000, 0, 'RC-ADFIL70PB1', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-08', NULL, NULL),
	('01a167a4-8901-7aad-8774-8055cddd5ab8', '2026-10-23 07:23:18.657543+00', '2026-10-23 07:23:18.657564+00', 'WALLET_DEBIT', 145000, 0, 'RC-ZZF6AF2I90', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-09', NULL, NULL),
	('01a167a4-8928-73bb-8cec-8757ef301e0a', '2026-10-23 07:23:18.69671+00', '2026-10-23 07:23:18.696726+00', 'AGENT_CASH', 25000, 0, 'RC-2OC4O495YD', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-10', NULL, NULL),
	('01a167a4-8950-750b-b88c-c64f5b967ee4', '2026-10-23 07:23:18.73721+00', '2026-10-23 07:23:18.737224+00', 'CARD', 40000, 0, 'RC-ZK4S1EZPDF', 'SUCCESS', 'FUND', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-11', NULL, NULL),
	('01a167a4-8963-7323-ae5a-f626871646e0', '2026-10-23 07:23:18.756004+00', '2026-10-23 07:23:18.756019+00', 'NUBAN_TRANSFER', 55000, 3837, 'RC-W964Z3TY62', 'SUCCESS', 'PLAN', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-pay-KR-RIDER-06-12', NULL, NULL),
	('01a167a4-896e-7206-968c-71cc3ccbf604', '2026-10-23 07:23:18.767168+00', '2026-10-23 07:23:18.76718+00', 'WALLET_DEBIT', 40000, 0, 'RC-387HPAUZ40', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-01', NULL, NULL),
	('01a167a4-8982-7d0c-aeda-3a2085648a26', '2026-10-23 07:23:18.786853+00', '2026-10-23 07:23:18.78687+00', 'AGENT_CASH', 55000, 3837, 'RC-4UY28PQ208', 'SUCCESS', 'PLAN', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-02', NULL, NULL),
	('01a167a4-898a-77bf-ab72-0e73d1d3e304', '2026-10-23 07:23:18.79515+00', '2026-10-23 07:23:18.795159+00', 'CARD', 70000, 0, 'RC-Q60C7ELC7O', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-03', NULL, NULL),
	('01a167a4-899e-7816-850d-5673ed95360e', '2026-10-23 07:23:18.815008+00', '2026-10-23 07:23:18.815021+00', 'NUBAN_TRANSFER', 85000, 0, 'RC-IW6UMJFLN7', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-04', NULL, NULL),
	('01a167a4-89b7-7de1-b716-cfdc37cb5cd6', '2026-10-23 07:23:18.839603+00', '2026-10-23 07:23:18.839618+00', 'WALLET_DEBIT', 100000, 0, 'RC-Q37N7UC5H4', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-05', NULL, NULL),
	('01a167a4-89cd-7853-8716-27098a72d91e', '2026-10-23 07:23:18.861884+00', '2026-10-23 07:23:18.861898+00', 'AGENT_CASH', 115000, 0, 'RC-TXV977JZK5', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-06', NULL, NULL),
	('01a167a4-89de-799c-a0f8-1cbc756047c7', '2026-10-23 07:23:18.879156+00', '2026-10-23 07:23:18.879168+00', 'CARD', 130000, 9069, 'RC-WD1D3290K3', 'SUCCESS', 'PLAN', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-07', NULL, NULL),
	('01a167a4-89e9-7081-ae49-4f60f577bb1a', '2026-10-23 07:23:18.889849+00', '2026-10-23 07:23:18.889863+00', 'NUBAN_TRANSFER', 145000, 0, 'RC-LNXUWZJ4AE', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-08', NULL, NULL),
	('01a167a4-8a0d-7083-aaa6-b7b27250d86c', '2026-10-23 07:23:18.925389+00', '2026-10-23 07:23:18.9254+00', 'WALLET_DEBIT', 25000, 0, 'RC-KW2UZRXYAB', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-09', NULL, NULL),
	('01a167a4-8a34-75f4-8ac8-30edc68d4926', '2026-10-23 07:23:18.96434+00', '2026-10-23 07:23:18.964356+00', 'AGENT_CASH', 40000, 0, 'RC-OMHSDY1WOQ', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-10', NULL, NULL),
	('01a167a4-8a4e-726a-b9d3-0f31eceaa6e7', '2026-10-23 07:23:18.990967+00', '2026-10-23 07:23:18.990979+00', 'CARD', 55000, 0, 'RC-8QY1ZTY5CW', 'SUCCESS', 'FUND', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-11', NULL, NULL),
	('01a167a4-8a66-76d5-bf1a-f8f9f9ab27cd', '2026-10-23 07:23:19.015147+00', '2026-10-23 07:23:19.01516+00', 'NUBAN_TRANSFER', 70000, 4883, 'RC-704YGQY96J', 'SUCCESS', 'PLAN', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-pay-KR-RIDER-07-12', NULL, NULL),
	('01a167a4-8a70-793b-b583-e712192b0b66', '2026-10-23 07:23:19.024506+00', '2026-10-23 07:23:19.024516+00', 'WALLET_DEBIT', 55000, 0, 'RC-AQC5DMT09F', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-01', NULL, NULL),
	('01a167a4-8a83-7cad-b9bb-b1196d4cc480', '2026-10-23 07:23:19.043414+00', '2026-10-23 07:23:19.043435+00', 'AGENT_CASH', 70000, 4883, 'RC-VB79UR26HV', 'SUCCESS', 'PLAN', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-02', NULL, NULL),
	('01a167a4-8a8c-7313-b306-062e84a87263', '2026-10-23 07:23:19.053051+00', '2026-10-23 07:23:19.053061+00', 'CARD', 85000, 0, 'RC-O97WWJCC97', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-03', NULL, NULL),
	('01a167a4-8aaa-74e3-b749-3a5ac52a7b60', '2026-10-23 07:23:19.083352+00', '2026-10-23 07:23:19.08338+00', 'NUBAN_TRANSFER', 100000, 0, 'RC-X98H2DZKZV', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-04', NULL, NULL),
	('01a167a4-8aca-709a-a6ca-66cc58bad1b6', '2026-10-23 07:23:19.114704+00', '2026-10-23 07:23:19.114715+00', 'WALLET_DEBIT', 115000, 0, 'RC-NJYSTPSD6R', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-05', NULL, NULL),
	('01a167a4-8ae4-78da-954b-3f1d0e24197b', '2026-10-23 07:23:19.140753+00', '2026-10-23 07:23:19.140782+00', 'AGENT_CASH', 130000, 0, 'RC-4K30NC0TXC', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-06', NULL, NULL),
	('01a167a4-8af9-7097-9a93-f16aef4e9fd5', '2026-10-23 07:23:19.162699+00', '2026-10-23 07:23:19.162722+00', 'CARD', 145000, 10116, 'RC-BN48E6JG5J', 'SUCCESS', 'PLAN', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-07', NULL, NULL),
	('01a167a4-8b08-7098-86f8-42376962b520', '2026-10-23 07:23:19.177158+00', '2026-10-23 07:23:19.177179+00', 'NUBAN_TRANSFER', 25000, 0, 'RC-ZEN1PI2UOB', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-08', NULL, NULL),
	('01a167a4-8b26-77b3-a244-4ea5f239e0e8', '2026-10-23 07:23:19.206822+00', '2026-10-23 07:23:19.206832+00', 'WALLET_DEBIT', 40000, 0, 'RC-PWZL686EXB', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-09', NULL, NULL),
	('01a167a4-8b47-70bd-a867-378a6023485f', '2026-10-23 07:23:19.23971+00', '2026-10-23 07:23:19.239737+00', 'AGENT_CASH', 55000, 0, 'RC-FF3VQ29FEV', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-10', NULL, NULL),
	('01a167a4-8b65-73d7-9264-179c5672341f', '2026-10-23 07:23:19.26972+00', '2026-10-23 07:23:19.269737+00', 'CARD', 70000, 0, 'RC-PFOBJ8VIEH', 'SUCCESS', 'FUND', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-11', NULL, NULL),
	('01a167a4-8b83-786c-a4c2-d14d44526a14', '2026-10-23 07:23:19.299701+00', '2026-10-23 07:23:19.29972+00', 'NUBAN_TRANSFER', 85000, 5930, 'RC-C2G9JNP2QY', 'SUCCESS', 'PLAN', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-pay-KR-RIDER-08-12', NULL, NULL),
	('01a167a4-8bfc-7025-aba5-bdf58465316d', '2026-10-22 07:23:19.302919+00', '2026-10-23 07:23:19.362034+00', 'WALLET_DEBIT', 50000, 3488, 'RC-BHOON1NLKH', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8c24-71d3-9332-5c08ed196b69', '2026-10-21 07:23:19.302919+00', '2026-10-23 07:23:19.460531+00', 'WALLET_DEBIT', 55000, 3837, 'RC-29ERZYWQNH', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8c77-7b4f-8715-b120189965c3', '2026-10-20 07:23:19.302919+00', '2026-10-23 07:23:19.543853+00', 'WALLET_DEBIT', 45000, 3140, 'RC-UERF70NCDR', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8cca-7b42-b43d-3705ce0e3a29', '2026-10-19 07:23:19.302919+00', '2026-10-23 07:23:19.627994+00', 'WALLET_DEBIT', 50000, 3488, 'RC-9DO1WNWNLL', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8d3c-7529-882b-1c10d5fa5d0c', '2026-10-18 07:23:19.302919+00', '2026-10-23 07:23:19.741184+00', 'WALLET_DEBIT', 55000, 3837, 'RC-FFN6BAWNVC', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8d9b-7069-9ebc-db2003d400c4', '2026-10-17 07:23:19.302919+00', '2026-10-23 07:23:19.835809+00', 'WALLET_DEBIT', 45000, 3140, 'RC-EL8TSXVKDR', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8dba-746c-bd50-b272947f1285', '2026-10-16 07:23:19.302919+00', '2026-10-23 07:23:19.867025+00', 'WALLET_DEBIT', 50000, 3488, 'RC-AOQW32KM9X', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8ddd-71f7-8953-d4f4a938af55', '2026-10-15 07:23:19.302919+00', '2026-10-23 07:23:19.902098+00', 'WALLET_DEBIT', 55000, 3837, 'RC-3PTPZW90WO', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-8e07-7b58-80bc-fcaa78d3bf49', '2026-10-22 06:23:19.302919+00', '2026-10-23 07:23:19.944+00', 'WALLET_DEBIT', 50000, 3488, 'RC-0S4AVRKFU4', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8e2c-7749-982f-859e68b7e8ec', '2026-10-21 06:23:19.302919+00', '2026-10-23 07:23:19.980432+00', 'WALLET_DEBIT', 55000, 3837, 'RC-6YU5UP0LIQ', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8e55-7a5a-bd75-18fba45394bd', '2026-10-20 06:23:19.302919+00', '2026-10-23 07:23:20.021623+00', 'WALLET_DEBIT', 45000, 3140, 'RC-S8UQAEPTJ0', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8e8b-795e-945c-ed99d5686bba', '2026-10-19 06:23:19.302919+00', '2026-10-23 07:23:20.076155+00', 'WALLET_DEBIT', 50000, 3488, 'RC-7871J9ICKY', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8ec5-7031-9599-34b63a530f88', '2026-10-18 06:23:19.302919+00', '2026-10-23 07:23:20.133441+00', 'WALLET_DEBIT', 55000, 3837, 'RC-2MQ89VVJ3C', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8ef3-73a9-bf66-8f57f2341a7a', '2026-10-17 06:23:19.302919+00', '2026-10-23 07:23:20.179646+00', 'WALLET_DEBIT', 45000, 3140, 'RC-RZBKXRBRX0', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8f11-79ab-8e71-265310164147', '2026-10-16 06:23:19.302919+00', '2026-10-23 07:23:20.209956+00', 'WALLET_DEBIT', 50000, 3488, 'RC-B9NA834T1N', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8f31-75b2-a140-10c157e7d5cb', '2026-10-15 06:23:19.302919+00', '2026-10-23 07:23:20.241348+00', 'WALLET_DEBIT', 55000, 3837, 'RC-8IJRY88FIK', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-8f50-710e-9209-cb7876834b5e', '2026-10-22 05:23:19.302919+00', '2026-10-23 07:23:20.272487+00', 'WALLET_DEBIT', 50000, 3488, 'RC-5XO3JBZWY7', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-8f76-763c-8bd8-5234aa38f9b5', '2026-10-21 05:23:19.302919+00', '2026-10-23 07:23:20.310588+00', 'WALLET_DEBIT', 55000, 3837, 'RC-T300FEKE18', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-8fa4-7268-b679-2b279321986a', '2026-10-20 05:23:19.302919+00', '2026-10-23 07:23:20.356737+00', 'WALLET_DEBIT', 45000, 3140, 'RC-PN1BF734WA', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-8fd4-7c49-8851-9155bfcc527a', '2026-10-19 05:23:19.302919+00', '2026-10-23 07:23:20.405155+00', 'WALLET_DEBIT', 50000, 3488, 'RC-3T1ZA2TBZK', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-900d-7da9-896a-dd4a47fce3c3', '2026-10-18 05:23:19.302919+00', '2026-10-23 07:23:20.461378+00', 'WALLET_DEBIT', 55000, 3837, 'RC-2ORHAJNSHW', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9049-7dde-b9a8-3109aa8dd43d', '2026-10-17 05:23:19.302919+00', '2026-10-23 07:23:20.521869+00', 'WALLET_DEBIT', 45000, 3140, 'RC-AA48BG9E3A', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9089-7eaa-9de9-e1b441fde44e', '2026-10-16 05:23:19.302919+00', '2026-10-23 07:23:20.585749+00', 'WALLET_DEBIT', 50000, 3488, 'RC-9YQ9K5S14R', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-90dd-7b11-ba35-3e312c52192b', '2026-10-15 05:23:19.302919+00', '2026-10-23 07:23:20.669792+00', 'WALLET_DEBIT', 55000, 3837, 'RC-F7B6FC1S8T', 'SUCCESS', 'SWAP', '01a167a4-7cef-7505-9b73-a3569914f925', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-912d-7197-91a4-4353d9e36ff4', '2026-10-22 04:23:19.302919+00', '2026-10-23 07:23:20.749977+00', 'WALLET_DEBIT', 50000, 3488, 'RC-6Y9DIYMC4M', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9182-72af-9b29-6b6cdbe1b6b0', '2026-10-21 04:23:19.302919+00', '2026-10-23 07:23:20.834732+00', 'WALLET_DEBIT', 55000, 3837, 'RC-XY0A1LT31B', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-91ad-79b7-8042-047aadbd13cc', '2026-10-20 04:23:19.302919+00', '2026-10-23 07:23:20.877291+00', 'WALLET_DEBIT', 45000, 3140, 'RC-KGMZWPP4DE', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-91cc-750f-aba1-3dfb019ef350', '2026-10-19 04:23:19.302919+00', '2026-10-23 07:23:20.90825+00', 'WALLET_DEBIT', 50000, 3488, 'RC-3FWTJYD7A4', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-91ea-7644-b162-a507d9ecca54', '2026-10-18 04:23:19.302919+00', '2026-10-23 07:23:20.938345+00', 'WALLET_DEBIT', 55000, 3837, 'RC-4XYU0M2CLG', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9208-788a-b8ef-3e5fc58dd203', '2026-10-17 04:23:19.302919+00', '2026-10-23 07:23:20.968566+00', 'WALLET_DEBIT', 45000, 3140, 'RC-2B4WGMBJN3', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9227-733d-996f-002123856c88', '2026-10-16 04:23:19.302919+00', '2026-10-23 07:23:21.000045+00', 'WALLET_DEBIT', 50000, 3488, 'RC-J31GRKAIAO', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-924a-7c04-b2aa-e3b0843c19c8', '2026-10-15 04:23:19.302919+00', '2026-10-23 07:23:21.034743+00', 'WALLET_DEBIT', 55000, 3837, 'RC-7UXQL8CZJ3', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9272-7c8b-86f1-24dbcb3a162f', '2026-10-22 03:23:19.302919+00', '2026-10-23 07:23:21.074466+00', 'WALLET_DEBIT', 50000, 3488, 'RC-WLR8R0WU9R', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-929e-7a48-9df2-358364dc58f0', '2026-10-21 03:23:19.302919+00', '2026-10-23 07:23:21.119051+00', 'WALLET_DEBIT', 55000, 3837, 'RC-8MS3WZ51WA', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-92de-7990-a35a-f8afabdb1abb', '2026-10-20 03:23:19.302919+00', '2026-10-23 07:23:21.182644+00', 'WALLET_DEBIT', 45000, 3140, 'RC-3AWZQVJUZ9', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-931e-70e6-b16c-01894aa3f2a4', '2026-10-19 03:23:19.302919+00', '2026-10-23 07:23:21.246288+00', 'WALLET_DEBIT', 50000, 3488, 'RC-RUD9V6P3X2', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9363-7d0b-a13e-866ab734a4b8', '2026-10-18 03:23:19.302919+00', '2026-10-23 07:23:21.315994+00', 'WALLET_DEBIT', 55000, 3837, 'RC-DC6LSNAZ8C', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9399-78d2-a07f-700e4896e676', '2026-10-17 03:23:19.302919+00', '2026-10-23 07:23:21.369622+00', 'WALLET_DEBIT', 45000, 3140, 'RC-IGZV6NOC55', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-93dd-7b0f-b8a6-5c6c96df84c3', '2026-10-16 03:23:19.302919+00', '2026-10-23 07:23:21.437561+00', 'WALLET_DEBIT', 50000, 3488, 'RC-D9AC7Y3K24', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9412-7a85-8edc-3356629b22b7', '2026-10-15 03:23:19.302919+00', '2026-10-23 07:23:21.491556+00', 'WALLET_DEBIT', 55000, 3837, 'RC-04T5X7ZQ5Z', 'SUCCESS', 'SWAP', '01a167a4-7e21-77a9-92f4-6bcf3d154758', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9466-75bc-8779-a65e915a602f', '2026-10-22 07:23:19.302919+00', '2026-10-23 07:23:21.574683+00', 'WALLET_DEBIT', 50000, 3488, 'RC-VXJQHOLIXK', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-94ac-71f4-8a34-954cacbdefe0', '2026-10-21 07:23:19.302919+00', '2026-10-23 07:23:21.644592+00', 'WALLET_DEBIT', 55000, 3837, 'RC-SQTTK0JEIF', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-94f4-7c17-847a-4e2839226fa5', '2026-10-20 07:23:19.302919+00', '2026-10-23 07:23:21.716952+00', 'WALLET_DEBIT', 45000, 3140, 'RC-XUJF2SAPKZ', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-954e-7e7a-9c12-36d41e9f17de', '2026-10-19 07:23:19.302919+00', '2026-10-23 07:23:21.806921+00', 'WALLET_DEBIT', 50000, 3488, 'RC-9DHX9SXIS8', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-95a6-757c-9cbb-c9c041ad55fa', '2026-10-18 07:23:19.302919+00', '2026-10-23 07:23:21.89501+00', 'WALLET_DEBIT', 55000, 3837, 'RC-WW5YE07EUJ', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-95cd-7525-860c-03ef0827cc10', '2026-10-17 07:23:19.302919+00', '2026-10-23 07:23:21.933768+00', 'WALLET_DEBIT', 45000, 3140, 'RC-7TQSY5GJFM', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-95f4-7bf8-8515-45b79c8fd4f6', '2026-10-16 07:23:19.302919+00', '2026-10-23 07:23:21.972852+00', 'WALLET_DEBIT', 50000, 3488, 'RC-JX4OUXZ58E', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-963f-7906-8b94-d0682d0394af', '2026-10-15 07:23:19.302919+00', '2026-10-23 07:23:22.047378+00', 'WALLET_DEBIT', 55000, 3837, 'RC-V59NZSJ70D', 'SUCCESS', 'SWAP', '01a167a4-7ebb-755a-b831-72e5448454f4', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-967b-71a1-a9a1-cb0901669e69', '2026-10-22 06:23:19.302919+00', '2026-10-23 07:23:22.108017+00', 'WALLET_DEBIT', 50000, 3488, 'RC-5RPQI18KLX', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-96af-7fcc-9aa8-39e2c893c373', '2026-10-21 06:23:19.302919+00', '2026-10-23 07:23:22.159515+00', 'WALLET_DEBIT', 55000, 3837, 'RC-S9DUM9WDAK', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-96db-7aa0-8fde-7aa242a0f38d', '2026-10-20 06:23:19.302919+00', '2026-10-23 07:23:22.20356+00', 'WALLET_DEBIT', 45000, 3140, 'RC-OG5IOU6L9G', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9712-7368-b9e9-78058a8fe451', '2026-10-19 06:23:19.302919+00', '2026-10-23 07:23:22.258163+00', 'WALLET_DEBIT', 50000, 3488, 'RC-UFKZ9YV7PA', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-973f-7f98-b287-b3dd1fd4b063', '2026-10-18 06:23:19.302919+00', '2026-10-23 07:23:22.304159+00', 'WALLET_DEBIT', 55000, 3837, 'RC-FDTJTCF2U2', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-978d-77fd-bbe6-5b3e4e78c7e7', '2026-10-17 06:23:19.302919+00', '2026-10-23 07:23:22.381394+00', 'WALLET_DEBIT', 45000, 3140, 'RC-5BNLSD66YK', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-97cd-7614-89e4-a31c50f17be2', '2026-10-16 06:23:19.302919+00', '2026-10-23 07:23:22.445427+00', 'WALLET_DEBIT', 50000, 3488, 'RC-AJSE45A4U0', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-97fb-79b6-8ceb-83d41d16640c', '2026-10-15 06:23:19.302919+00', '2026-10-23 07:23:22.492124+00', 'WALLET_DEBIT', 55000, 3837, 'RC-RJ33NK2P8G', 'SUCCESS', 'SWAP', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-982c-7ea4-96e5-1e15c53d39e3', '2026-10-22 05:23:19.302919+00', '2026-10-23 07:23:22.540256+00', 'WALLET_DEBIT', 50000, 3488, 'RC-X51ANEM7WF', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9859-71a8-be38-03bb0fc2b7eb', '2026-10-21 05:23:19.302919+00', '2026-10-23 07:23:22.585809+00', 'WALLET_DEBIT', 55000, 3837, 'RC-NYYKU3LSGS', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-98ed-7c0a-8573-1a55b5fe694b', '2026-10-20 05:23:19.302919+00', '2026-10-23 07:23:22.733771+00', 'WALLET_DEBIT', 45000, 3140, 'RC-GMTSP1PX02', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-994e-73da-bdd2-535fe3f7169b', '2026-10-19 05:23:19.302919+00', '2026-10-23 07:23:22.830972+00', 'WALLET_DEBIT', 50000, 3488, 'RC-56SCZGNZJY', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9993-7a47-bc0b-9e2e0fbb889f', '2026-10-18 05:23:19.302919+00', '2026-10-23 07:23:22.900591+00', 'WALLET_DEBIT', 55000, 3837, 'RC-BY88JWQ6ME', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9a00-72c3-b4ce-a10043f64364', '2026-10-17 05:23:19.302919+00', '2026-10-23 07:23:23.008509+00', 'WALLET_DEBIT', 45000, 3140, 'RC-VVH0RUE2SD', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9a3e-7c8a-b61a-21b53321cd14', '2026-10-16 05:23:19.302919+00', '2026-10-23 07:23:23.070257+00', 'WALLET_DEBIT', 50000, 3488, 'RC-WJNYEEQL9R', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9a75-7e72-838b-31baab9822fd', '2026-10-15 05:23:19.302919+00', '2026-10-23 07:23:23.125236+00', 'WALLET_DEBIT', 55000, 3837, 'RC-EDEKXA0TLO', 'SUCCESS', 'SWAP', '01a167a4-7f6c-71b8-88a6-6e1743605298', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-9aa3-7f1b-b8ca-fea760624897', '2026-10-22 04:23:19.302919+00', '2026-10-23 07:23:23.171396+00', 'WALLET_DEBIT', 50000, 3488, 'RC-F1LR2XGCSB', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9ac2-78f0-8607-8c9f8cd4f0f1', '2026-10-21 04:23:19.302919+00', '2026-10-23 07:23:23.202509+00', 'WALLET_DEBIT', 55000, 3837, 'RC-5A0RE877TN', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9ae6-7fd0-aa61-8c03b98d137b', '2026-10-20 04:23:19.302919+00', '2026-10-23 07:23:23.238238+00', 'WALLET_DEBIT', 45000, 3140, 'RC-DRH9MI8YPU', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9b09-74ea-aed0-6fd1899a1a34', '2026-10-19 04:23:19.302919+00', '2026-10-23 07:23:23.273961+00', 'WALLET_DEBIT', 50000, 3488, 'RC-V72SICJVIY', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82');
INSERT INTO public.finance_payment VALUES
	('01a167a4-9b2a-7245-82d4-7bfdb7143523', '2026-10-18 04:23:19.302919+00', '2026-10-23 07:23:23.306181+00', 'WALLET_DEBIT', 55000, 3837, 'RC-4MDEWHR73H', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9b47-788d-ac43-0b7548060a89', '2026-10-17 04:23:19.302919+00', '2026-10-23 07:23:23.335478+00', 'WALLET_DEBIT', 45000, 3140, 'RC-D2XJV0ZM5X', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9b6a-751a-bc32-4bd46920d559', '2026-10-16 04:23:19.302919+00', '2026-10-23 07:23:23.370367+00', 'WALLET_DEBIT', 50000, 3488, 'RC-HXD2QE52K0', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9b8e-785d-a6b7-feb048ee78ee', '2026-10-15 04:23:19.302919+00', '2026-10-23 07:23:23.406542+00', 'WALLET_DEBIT', 55000, 3837, 'RC-ZAUXB3XSTH', 'SUCCESS', 'SWAP', '01a167a4-7fbb-777e-9593-0f102470eebd', NULL, NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-9bb6-75a7-8662-d5e303e9284d', '2026-10-22 03:23:19.302919+00', '2026-10-23 07:23:23.446313+00', 'WALLET_DEBIT', 50000, 3488, 'RC-2RBPIIOQ77', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9be1-729b-b95c-92c8caff4dcd', '2026-10-21 03:23:19.302919+00', '2026-10-23 07:23:23.490076+00', 'WALLET_DEBIT', 55000, 3837, 'RC-ZWSAW4QWTO', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9c14-7e21-bf68-100f9768201e', '2026-10-20 03:23:19.302919+00', '2026-10-23 07:23:23.540295+00', 'WALLET_DEBIT', 45000, 3140, 'RC-NAGXN71M55', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9c44-7ea3-9f75-df1e51f5419c', '2026-10-19 03:23:19.302919+00', '2026-10-23 07:23:23.588938+00', 'WALLET_DEBIT', 50000, 3488, 'RC-25W162UB98', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9c70-780b-b7a6-e3dde6d982d8', '2026-10-18 03:23:19.302919+00', '2026-10-23 07:23:23.632896+00', 'WALLET_DEBIT', 55000, 3837, 'RC-QBWR0AINNJ', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9cb7-7189-af8e-dc71b7d5bddf', '2026-10-17 03:23:19.302919+00', '2026-10-23 07:23:23.703824+00', 'WALLET_DEBIT', 45000, 3140, 'RC-HMCFK270MG', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9cda-7efd-8c3c-eedf7ceebeb7', '2026-10-16 03:23:19.302919+00', '2026-10-23 07:23:23.738458+00', 'WALLET_DEBIT', 50000, 3488, 'RC-NEIU31O6MA', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9d0d-76f4-989f-f4166c30a75d', '2026-10-15 03:23:19.302919+00', '2026-10-23 07:23:23.790019+00', 'WALLET_DEBIT', 55000, 3837, 'RC-FSP8QGZ0YF', 'SUCCESS', 'SWAP', '01a167a4-8006-7d28-8eb9-0fa045178cc0', NULL, NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-9d3b-7387-9e44-614b4f9c7097', '2026-10-22 07:23:19.302919+00', '2026-10-23 07:23:23.835262+00', 'WALLET_DEBIT', 50000, 3488, 'RC-N3ZYDGC8F8', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9d77-79e7-8142-74fd2ca5c2ee', '2026-10-21 07:23:19.302919+00', '2026-10-23 07:23:23.895663+00', 'WALLET_DEBIT', 55000, 3837, 'RC-QD38SXSIBV', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9de2-7143-bfcc-d08e8197fa4b', '2026-10-20 07:23:19.302919+00', '2026-10-23 07:23:24.002722+00', 'WALLET_DEBIT', 45000, 3140, 'RC-1P2Y3L3034', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9e06-78c9-b580-3809cc9998da', '2026-10-19 07:23:19.302919+00', '2026-10-23 07:23:24.038698+00', 'WALLET_DEBIT', 50000, 3488, 'RC-AQUJX8L301', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9e28-75e0-a83b-34bbca704f03', '2026-10-18 07:23:19.302919+00', '2026-10-23 07:23:24.072953+00', 'WALLET_DEBIT', 55000, 3837, 'RC-A1W6U33PGV', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9e4e-7eb4-9ac1-8b013935a7de', '2026-10-17 07:23:19.302919+00', '2026-10-23 07:23:24.110409+00', 'WALLET_DEBIT', 45000, 3140, 'RC-FQT605HLFX', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9e78-78c8-8d80-d025d2cac397', '2026-10-16 07:23:19.302919+00', '2026-10-23 07:23:24.153008+00', 'WALLET_DEBIT', 50000, 3488, 'RC-5HR7LL3PV1', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9e9d-75ed-a792-279e8cd28c35', '2026-10-15 07:23:19.302919+00', '2026-10-23 07:23:24.189408+00', 'WALLET_DEBIT', 55000, 3837, 'RC-18N8V59OBG', 'SUCCESS', 'SWAP', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', NULL, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-9ebd-7a9f-8b3e-ba911f82c52e', '2026-10-22 06:23:19.302919+00', '2026-10-23 07:23:24.221595+00', 'WALLET_DEBIT', 50000, 3488, 'RC-0TY0FV5B3L', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9edb-7c6c-b9bb-566381c3712a', '2026-10-21 06:23:19.302919+00', '2026-10-23 07:23:24.251219+00', 'WALLET_DEBIT', 55000, 3837, 'RC-JEGI7M6OCF', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9ef8-7930-858c-59fba3e7fd6e', '2026-10-20 06:23:19.302919+00', '2026-10-23 07:23:24.280151+00', 'WALLET_DEBIT', 45000, 3140, 'RC-IWZ0H9AQD4', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9f18-7145-b565-3099132ebbb0', '2026-10-19 06:23:19.302919+00', '2026-10-23 07:23:24.312681+00', 'WALLET_DEBIT', 50000, 3488, 'RC-2XA1LWSQ27', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9f3e-734b-bd16-ca4bd3989149', '2026-10-18 06:23:19.302919+00', '2026-10-23 07:23:24.350647+00', 'WALLET_DEBIT', 55000, 3837, 'RC-5Y0NWD9VMU', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9f69-724d-984e-924c6b68c49a', '2026-10-17 06:23:19.302919+00', '2026-10-23 07:23:24.393921+00', 'WALLET_DEBIT', 45000, 3140, 'RC-C5DSH2Z77C', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9f98-7f70-b595-9db8ac04ae11', '2026-10-16 06:23:19.302919+00', '2026-10-23 07:23:24.440806+00', 'WALLET_DEBIT', 50000, 3488, 'RC-2M32PY5FB0', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9fbd-7ba8-a57a-561237637227', '2026-10-15 06:23:19.302919+00', '2026-10-23 07:23:24.477767+00', 'WALLET_DEBIT', 55000, 3837, 'RC-BQX0CLT02N', 'SUCCESS', 'SWAP', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', NULL, NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-9fea-7327-a362-1fdfcb314781', '2026-10-22 05:23:19.302919+00', '2026-10-23 07:23:24.523173+00', 'WALLET_DEBIT', 50000, 3488, 'RC-0S35PGIQ82', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a014-77b6-8196-49071d8d9129', '2026-10-21 05:23:19.302919+00', '2026-10-23 07:23:24.564746+00', 'WALLET_DEBIT', 55000, 3837, 'RC-LHUXTJNV2N', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a051-7d08-bc32-e64076608f8a', '2026-10-20 05:23:19.302919+00', '2026-10-23 07:23:24.625675+00', 'WALLET_DEBIT', 45000, 3140, 'RC-2KZVBP58WA', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a088-7bd1-8947-f1c51100a309', '2026-10-19 05:23:19.302919+00', '2026-10-23 07:23:24.681073+00', 'WALLET_DEBIT', 50000, 3488, 'RC-9WC8TGYCXX', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a0c9-7969-a7a2-2c8a6e6702d0', '2026-10-18 05:23:19.302919+00', '2026-10-23 07:23:24.74598+00', 'WALLET_DEBIT', 55000, 3837, 'RC-NKPCKUWE4R', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a10d-7451-ba87-f1afe6b53a90', '2026-10-17 05:23:19.302919+00', '2026-10-23 07:23:24.81396+00', 'WALLET_DEBIT', 45000, 3140, 'RC-AXRXAZ2PGM', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a15c-7433-a3c0-f90634f4660c', '2026-10-16 05:23:19.302919+00', '2026-10-23 07:23:24.893343+00', 'WALLET_DEBIT', 50000, 3488, 'RC-G015GSWY0K', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-a19a-7ac8-87d4-731e8ce37377', '2026-10-15 05:23:19.302919+00', '2026-10-23 07:23:24.955096+00', 'WALLET_DEBIT', 55000, 3837, 'RC-24J2I4421T', 'SUCCESS', 'SWAP', '01a167a4-80f9-7131-89f8-e074dc97447d', NULL, NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2');


--
-- Data for Name: credit_loanrepayment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_productoffer; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_offerassignment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: credit_segment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: finance_ledgeraccount; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_ledgeraccount VALUES
	('01a167a4-7a76-7b81-a425-c1be6c59e949', '2026-10-23 07:23:14.934242+00', '2026-10-23 07:23:14.934249+00', 'hold:KR-882194', 'LIABILITY', 45000),
	('01a167a4-8160-7524-a710-cb14effe1d7c', '2026-10-23 07:23:16.704428+00', '2026-10-23 07:23:16.704436+00', 'psp_clearing', 'CLEARING', 8235000),
	('01a167a4-8808-713c-9100-35a913322c6a', '2026-10-23 07:23:18.409038+00', '2026-10-23 07:23:18.40905+00', 'wallet:KR-RIDER-06', 'LIABILITY', 270000),
	('01a167a4-81ec-737a-9308-0f6edf495946', '2026-10-23 07:23:16.844238+00', '2026-10-23 07:23:16.844246+00', 'wallet:KR-FLEET-VCU', 'LIABILITY', -540000),
	('01a167a4-8bfa-7008-8cb4-de21c1136981', '2026-10-23 07:23:19.346429+00', '2026-10-23 07:23:19.346444+00', 'hold:KR-FLEET-VCU', 'LIABILITY', 0),
	('01a167a4-9d2f-75b6-95b9-a95e54943868', '2026-10-23 07:23:23.823853+00', '2026-10-23 07:23:23.823866+00', 'hold:KR-RIDER-06', 'LIABILITY', 0),
	('01a167a4-7a6e-7454-9da4-6d9b4ca70447', '2026-10-23 07:23:14.926421+00', '2026-10-23 07:23:14.926431+00', 'wallet:KR-882194', 'LIABILITY', 630000),
	('01a167a4-8420-7a19-a1f6-84d5b15a22b8', '2026-10-23 07:23:17.408768+00', '2026-10-23 07:23:17.408779+00', 'wallet:KR-RIDER-01', 'LIABILITY', 405000),
	('01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '2026-10-23 07:23:18.112063+00', '2026-10-23 07:23:18.112074+00', 'wallet:KR-RIDER-05', 'LIABILITY', 405000),
	('01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '2026-10-23 07:23:21.54661+00', '2026-10-23 07:23:21.546628+00', 'hold:KR-RIDER-01', 'LIABILITY', 0),
	('01a167a4-9bac-759c-a309-dfb0ec26540b', '2026-10-23 07:23:23.43681+00', '2026-10-23 07:23:23.436819+00', 'hold:KR-RIDER-05', 'LIABILITY', 0),
	('01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '2026-10-23 07:23:17.111263+00', '2026-10-23 07:23:17.111276+00', 'wallet:KR-FLEET-NOVCU', 'LIABILITY', 0),
	('01a167a4-8654-7bdb-9e23-266fed1e01c1', '2026-10-23 07:23:17.972748+00', '2026-10-23 07:23:17.972755+00', 'wallet:KR-RIDER-04', 'LIABILITY', 405000),
	('01a167a4-911d-741d-ad84-6e7c73c55d08', '2026-10-23 07:23:20.733942+00', '2026-10-23 07:23:20.733957+00', 'hold:KR-FLEET-NOVCU', 'LIABILITY', 0),
	('01a167a4-9a96-727f-b91c-5e239afedb3d', '2026-10-23 07:23:23.158559+00', '2026-10-23 07:23:23.158568+00', 'hold:KR-RIDER-04', 'LIABILITY', 0),
	('01a167a4-85bb-737a-8731-4a976c263c6e', '2026-10-23 07:23:17.81939+00', '2026-10-23 07:23:17.819397+00', 'wallet:KR-RIDER-03', 'LIABILITY', 405000),
	('01a167a4-8a79-7fca-9d9d-f21d398ac461', '2026-10-23 07:23:19.03417+00', '2026-10-23 07:23:19.034184+00', 'wallet:KR-RIDER-08', 'LIABILITY', 270000),
	('01a167a4-9822-7273-a5ab-ebf78db46a58', '2026-10-23 07:23:22.530674+00', '2026-10-23 07:23:22.530683+00', 'hold:KR-RIDER-03', 'LIABILITY', 0),
	('01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '2026-10-23 07:23:24.509949+00', '2026-10-23 07:23:24.50997+00', 'hold:KR-RIDER-08', 'LIABILITY', 0),
	('01a167a4-8bff-77cf-89d8-5efd54e12b76', '2026-10-23 07:23:19.37335+00', '2026-10-23 07:23:19.373367+00', 'revenue:swap', 'REVENUE', 4897685),
	('01a167a4-8c01-791b-8fd5-d671e097cf38', '2026-10-23 07:23:19.39944+00', '2026-10-23 07:23:19.399481+00', 'vat_payable', 'LIABILITY', 367315),
	('01a167a4-8979-7292-a2b2-5a16f8c723c6', '2026-10-23 07:23:18.777781+00', '2026-10-23 07:23:18.777795+00', 'wallet:KR-RIDER-07', 'LIABILITY', 270000),
	('01a167a4-9eb6-766a-a5ff-3ff692639093', '2026-10-23 07:23:24.214922+00', '2026-10-23 07:23:24.214929+00', 'hold:KR-RIDER-07', 'LIABILITY', 0),
	('01a167a4-8537-710e-8ab1-3a154f707bfe', '2026-10-23 07:23:17.687853+00', '2026-10-23 07:23:17.687862+00', 'wallet:KR-RIDER-02', 'LIABILITY', 405000),
	('01a167a4-9668-769c-85be-442465bb69bb', '2026-10-23 07:23:22.08893+00', '2026-10-23 07:23:22.088939+00', 'hold:KR-RIDER-02', 'LIABILITY', 0);


--
-- Data for Name: finance_ledgertransaction; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_ledgertransaction VALUES
	('01a167a4-7a69-73ed-a71e-ebbeea5c6b9e', '2026-10-23 07:23:14.921228+00', '2026-10-23 07:23:14.921235+00', 'HOLD', 'HOLD-KB-4921', 'Wallet hold 45000 kobo', '2026-10-23 07:23:14.921248+00'),
	('01a167a4-815e-743f-9a27-5d30451cbce7', '2026-10-23 07:23:16.702659+00', '2026-10-23 07:23:16.702667+00', 'FUNDING', 'FUND-RC-FGH8UAJH9W', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.702678+00'),
	('01a167a4-8170-74bb-9bbc-902c4f9bc77e', '2026-10-23 07:23:16.720317+00', '2026-10-23 07:23:16.720323+00', 'FUNDING', 'FUND-RC-XAGZ9B0MBG', 'Wallet top-up via CARD', '2026-10-23 07:23:16.720334+00'),
	('01a167a4-817d-7adf-a2a6-f8d0f4840943', '2026-10-23 07:23:16.733494+00', '2026-10-23 07:23:16.7335+00', 'FUNDING', 'FUND-RC-7F7OWVDIX8', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:16.73351+00'),
	('01a167a4-818d-7fb8-89d4-3beae944f66d', '2026-10-23 07:23:16.749767+00', '2026-10-23 07:23:16.749773+00', 'FUNDING', 'FUND-RC-YPOEXJA1A7', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.749785+00'),
	('01a167a4-819a-79a4-be35-46b3b79d5278', '2026-10-23 07:23:16.763078+00', '2026-10-23 07:23:16.763084+00', 'FUNDING', 'FUND-RC-EC3Z02X82X', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:16.763096+00'),
	('01a167a4-81aa-7ef9-a508-1f21ed023506', '2026-10-23 07:23:16.778386+00', '2026-10-23 07:23:16.778393+00', 'FUNDING', 'FUND-RC-6BRHYOX00E', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:16.778405+00'),
	('01a167a4-81b8-7a03-96cd-cb80bacac6dc', '2026-10-23 07:23:16.792419+00', '2026-10-23 07:23:16.792426+00', 'FUNDING', 'FUND-RC-GQW7QIFG4P', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.79244+00'),
	('01a167a4-81c5-7a0d-a0a5-bebe43d28b3c', '2026-10-23 07:23:16.805425+00', '2026-10-23 07:23:16.805432+00', 'FUNDING', 'FUND-RC-KXK6TR9QRK', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:16.805444+00'),
	('01a167a4-81d4-7185-9d2c-5205b0c4dce2', '2026-10-23 07:23:16.820988+00', '2026-10-23 07:23:16.820998+00', 'FUNDING', 'FUND-RC-KQAWYMAL8F', 'Wallet top-up via CARD', '2026-10-23 07:23:16.821012+00'),
	('01a167a4-81e7-7957-92f5-1e0930fbfa43', '2026-10-23 07:23:16.839361+00', '2026-10-23 07:23:16.839367+00', 'FUNDING', 'FUND-RC-8LPTSW91ML', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.83938+00'),
	('01a167a4-81f9-7afd-b9c6-39eb135c60e0', '2026-10-23 07:23:16.85806+00', '2026-10-23 07:23:16.85807+00', 'FUNDING', 'FUND-RC-FQDICDXS7M', 'Wallet top-up via CARD', '2026-10-23 07:23:16.858085+00'),
	('01a167a4-820d-71c7-a06e-af9582930ab2', '2026-10-23 07:23:16.877173+00', '2026-10-23 07:23:16.877181+00', 'FUNDING', 'FUND-RC-ZWOBV5NFJM', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:16.877195+00'),
	('01a167a4-822e-7fe2-b086-87a210ce25de', '2026-10-23 07:23:16.910388+00', '2026-10-23 07:23:16.910395+00', 'FUNDING', 'FUND-RC-4CB5FUO0R0', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.91041+00'),
	('01a167a4-8241-7302-a2cd-6067f4d2208d', '2026-10-23 07:23:16.929589+00', '2026-10-23 07:23:16.929598+00', 'FUNDING', 'FUND-RC-8Q6M1M4YRQ', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:16.929614+00'),
	('01a167a4-8268-7cd1-993e-8c9b9f9ec214', '2026-10-23 07:23:16.968825+00', '2026-10-23 07:23:16.968838+00', 'FUNDING', 'FUND-RC-UDRF30Q1LF', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:16.96886+00'),
	('01a167a4-8281-7ce6-8294-e580b3546972', '2026-10-23 07:23:16.993623+00', '2026-10-23 07:23:16.993633+00', 'FUNDING', 'FUND-RC-ZWS60P82AB', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:16.993652+00'),
	('01a167a4-829d-77d9-b22e-9b4579dbbe36', '2026-10-23 07:23:17.021376+00', '2026-10-23 07:23:17.021392+00', 'FUNDING', 'FUND-RC-564Q8VB110', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.021415+00'),
	('01a167a4-82cc-7646-a13b-10ed5f596c08', '2026-10-23 07:23:17.068433+00', '2026-10-23 07:23:17.068449+00', 'FUNDING', 'FUND-RC-BD5HH1J7JX', 'Wallet top-up via CARD', '2026-10-23 07:23:17.068474+00'),
	('01a167a4-82ef-7983-aca7-1b73098fc344', '2026-10-23 07:23:17.103769+00', '2026-10-23 07:23:17.103782+00', 'FUNDING', 'FUND-RC-FG3V8M5JC5', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.103802+00'),
	('01a167a4-830b-7430-96b5-1282ff8b64d5', '2026-10-23 07:23:17.132037+00', '2026-10-23 07:23:17.132048+00', 'FUNDING', 'FUND-RC-X33SCREPK9', 'Wallet top-up via CARD', '2026-10-23 07:23:17.132067+00'),
	('01a167a4-831f-74aa-9393-f45071270daa', '2026-10-23 07:23:17.151307+00', '2026-10-23 07:23:17.151316+00', 'FUNDING', 'FUND-RC-JE7ILGJGFB', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.151334+00'),
	('01a167a4-833a-787f-84ef-9a3419325cb6', '2026-10-23 07:23:17.178633+00', '2026-10-23 07:23:17.178647+00', 'FUNDING', 'FUND-RC-62QISNDK4W', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.178666+00'),
	('01a167a4-835a-77b8-ae7d-2d13069bdaae', '2026-10-23 07:23:17.210835+00', '2026-10-23 07:23:17.210844+00', 'FUNDING', 'FUND-RC-N5DO08MR1N', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.210862+00'),
	('01a167a4-8386-7884-99e8-a2782d1aadd5', '2026-10-23 07:23:17.254484+00', '2026-10-23 07:23:17.254507+00', 'FUNDING', 'FUND-RC-V6R1SLMKHV', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.254545+00'),
	('01a167a4-83a7-77c6-a944-2e8e2555f6f7', '2026-10-23 07:23:17.287398+00', '2026-10-23 07:23:17.287418+00', 'FUNDING', 'FUND-RC-VOTHAAU4KW', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.287656+00'),
	('01a167a4-83cd-7c37-b730-a902180063f1', '2026-10-23 07:23:17.325431+00', '2026-10-23 07:23:17.325455+00', 'FUNDING', 'FUND-RC-GTK30HX343', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.325487+00'),
	('01a167a4-83ee-776b-87e8-8a8dcbad02e4', '2026-10-23 07:23:17.359174+00', '2026-10-23 07:23:17.359196+00', 'FUNDING', 'FUND-RC-JBESC2PBAK', 'Wallet top-up via CARD', '2026-10-23 07:23:17.359239+00'),
	('01a167a4-8415-71e0-b628-2cd5986899b9', '2026-10-23 07:23:17.397357+00', '2026-10-23 07:23:17.397367+00', 'FUNDING', 'FUND-RC-R2KDX1MRU7', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.39738+00'),
	('01a167a4-8437-721e-a6fc-fa85b302917f', '2026-10-23 07:23:17.432173+00', '2026-10-23 07:23:17.432187+00', 'FUNDING', 'FUND-RC-T675EYFYO2', 'Wallet top-up via CARD', '2026-10-23 07:23:17.432208+00'),
	('01a167a4-8456-7ba9-8620-12f8baec72ee', '2026-10-23 07:23:17.46267+00', '2026-10-23 07:23:17.46269+00', 'FUNDING', 'FUND-RC-B7F5RA32K1', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.462726+00'),
	('01a167a4-8481-758b-ba85-17a8e630f64b', '2026-10-23 07:23:17.505316+00', '2026-10-23 07:23:17.505329+00', 'FUNDING', 'FUND-RC-PSQJUFDURQ', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.505343+00'),
	('01a167a4-8496-7226-9cba-2798a5b1bf70', '2026-10-23 07:23:17.526937+00', '2026-10-23 07:23:17.526946+00', 'FUNDING', 'FUND-RC-EOTUC0VJ7M', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.526959+00'),
	('01a167a4-84b6-758f-81e3-a6c7ced03cfc', '2026-10-23 07:23:17.558768+00', '2026-10-23 07:23:17.558787+00', 'FUNDING', 'FUND-RC-5Q4ZN16ACL', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.55882+00'),
	('01a167a4-84fc-7e9f-9e16-4ff1665ac30e', '2026-10-23 07:23:17.629022+00', '2026-10-23 07:23:17.629028+00', 'FUNDING', 'FUND-RC-U7BP8DKH9J', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.62904+00'),
	('01a167a4-850d-749b-a502-d823e5ac145b', '2026-10-23 07:23:17.645674+00', '2026-10-23 07:23:17.645683+00', 'FUNDING', 'FUND-RC-OC4610NZAF', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.645696+00'),
	('01a167a4-8522-7c0a-8351-7fbfcfd53b15', '2026-10-23 07:23:17.666751+00', '2026-10-23 07:23:17.666758+00', 'FUNDING', 'FUND-RC-08MEZB0Z3U', 'Wallet top-up via CARD', '2026-10-23 07:23:17.66677+00'),
	('01a167a4-8533-70be-8400-6939a5c75a98', '2026-10-23 07:23:17.683408+00', '2026-10-23 07:23:17.683414+00', 'FUNDING', 'FUND-RC-M82EA1U9NW', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.683426+00'),
	('01a167a4-8546-7e6e-9c9c-822c93c661f8', '2026-10-23 07:23:17.702735+00', '2026-10-23 07:23:17.70274+00', 'FUNDING', 'FUND-RC-AUCYJU6JJY', 'Wallet top-up via CARD', '2026-10-23 07:23:17.702752+00'),
	('01a167a4-8553-7efb-a3c7-ffc800924e8e', '2026-10-23 07:23:17.715547+00', '2026-10-23 07:23:17.715553+00', 'FUNDING', 'FUND-RC-33T4RBUWTL', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.715565+00'),
	('01a167a4-8561-72a6-a1e4-9be3091555ae', '2026-10-23 07:23:17.729619+00', '2026-10-23 07:23:17.729626+00', 'FUNDING', 'FUND-RC-K3TKB9ZWBF', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.729638+00'),
	('01a167a4-856f-7e01-a482-46aab605498a', '2026-10-23 07:23:17.743659+00', '2026-10-23 07:23:17.743665+00', 'FUNDING', 'FUND-RC-EEK2V5CYL4', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.743677+00'),
	('01a167a4-857e-7d5c-a11d-4db9bfbc6a09', '2026-10-23 07:23:17.758694+00', '2026-10-23 07:23:17.758701+00', 'FUNDING', 'FUND-RC-TFEX9A9E0E', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.758714+00'),
	('01a167a4-858c-7e30-abbf-3d5b8054ed33', '2026-10-23 07:23:17.772208+00', '2026-10-23 07:23:17.772215+00', 'FUNDING', 'FUND-RC-81P4JZR3PA', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.772228+00'),
	('01a167a4-8599-78fb-845b-087d56d13d6d', '2026-10-23 07:23:17.785417+00', '2026-10-23 07:23:17.785424+00', 'FUNDING', 'FUND-RC-A13VQATQKF', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.785436+00'),
	('01a167a4-85a5-7b91-a5b9-b7e403c5a7db', '2026-10-23 07:23:17.797914+00', '2026-10-23 07:23:17.797921+00', 'FUNDING', 'FUND-RC-PIFGI9SPOP', 'Wallet top-up via CARD', '2026-10-23 07:23:17.797936+00'),
	('01a167a4-85b6-7f35-a0a7-53fb1691eea3', '2026-10-23 07:23:17.814698+00', '2026-10-23 07:23:17.814707+00', 'FUNDING', 'FUND-RC-HAHS0K4Z6J', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.814721+00'),
	('01a167a4-85c6-75f2-9445-60c4686fe64b', '2026-10-23 07:23:17.831044+00', '2026-10-23 07:23:17.831051+00', 'FUNDING', 'FUND-RC-80LDD1RX7N', 'Wallet top-up via CARD', '2026-10-23 07:23:17.831063+00'),
	('01a167a4-85d9-7a88-8fcd-a88bbf2b7693', '2026-10-23 07:23:17.84998+00', '2026-10-23 07:23:17.849988+00', 'FUNDING', 'FUND-RC-LCA6VB0NDK', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.850002+00'),
	('01a167a4-85e8-736d-bc0c-614d8a9f539c', '2026-10-23 07:23:17.864405+00', '2026-10-23 07:23:17.864412+00', 'FUNDING', 'FUND-RC-IHG6787Z4H', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.864425+00'),
	('01a167a4-85fb-7c19-aa04-14919baeb503', '2026-10-23 07:23:17.883585+00', '2026-10-23 07:23:17.883594+00', 'FUNDING', 'FUND-RC-7N5MI0RQIJ', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.883608+00'),
	('01a167a4-8612-7155-8f19-49bbe5f07a05', '2026-10-23 07:23:17.906922+00', '2026-10-23 07:23:17.906932+00', 'FUNDING', 'FUND-RC-62Q9K3ZE5I', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:17.906946+00'),
	('01a167a4-8621-73d3-bd76-230a98986194', '2026-10-23 07:23:17.921604+00', '2026-10-23 07:23:17.921614+00', 'FUNDING', 'FUND-RC-2PACK03THC', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.921629+00'),
	('01a167a4-8630-767b-bc05-baf8ac617e54', '2026-10-23 07:23:17.936208+00', '2026-10-23 07:23:17.936215+00', 'FUNDING', 'FUND-RC-K0T54QJGMX', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:17.936228+00'),
	('01a167a4-863e-7c48-a1da-b5a9440a97c5', '2026-10-23 07:23:17.950512+00', '2026-10-23 07:23:17.950519+00', 'FUNDING', 'FUND-RC-Q7VPAFW5XZ', 'Wallet top-up via CARD', '2026-10-23 07:23:17.950533+00'),
	('01a167a4-864f-789e-9032-9cf4d1780cf8', '2026-10-23 07:23:17.967825+00', '2026-10-23 07:23:17.967831+00', 'FUNDING', 'FUND-RC-WRTWN7H7CN', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:17.967844+00'),
	('01a167a4-8662-7cb5-a7e6-83b7001f7623', '2026-10-23 07:23:17.986297+00', '2026-10-23 07:23:17.986303+00', 'FUNDING', 'FUND-RC-FJH5EGLX46', 'Wallet top-up via CARD', '2026-10-23 07:23:17.986316+00'),
	('01a167a4-8671-754b-8d4f-12246984385f', '2026-10-23 07:23:18.001104+00', '2026-10-23 07:23:18.001112+00', 'FUNDING', 'FUND-RC-B476JEWVLC', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.001124+00'),
	('01a167a4-867e-7a13-a5a6-c08c06f8b615', '2026-10-23 07:23:18.014787+00', '2026-10-23 07:23:18.014794+00', 'FUNDING', 'FUND-RC-582P9P1X6L', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.014807+00'),
	('01a167a4-868c-7b2e-a3f1-0f06a81b8c7c', '2026-10-23 07:23:18.029058+00', '2026-10-23 07:23:18.029065+00', 'FUNDING', 'FUND-RC-W9NJFHV33E', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.029077+00'),
	('01a167a4-869b-78fb-b39d-7dc160c6b7cd', '2026-10-23 07:23:18.04394+00', '2026-10-23 07:23:18.043948+00', 'FUNDING', 'FUND-RC-07240BMG1K', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.043961+00'),
	('01a167a4-86aa-7d56-92b8-1adac62b42d2', '2026-10-23 07:23:18.058097+00', '2026-10-23 07:23:18.058104+00', 'FUNDING', 'FUND-RC-VXSTZHEFH9', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.058118+00'),
	('01a167a4-86b8-7924-8b66-7bd8c2b9f7c8', '2026-10-23 07:23:18.072429+00', '2026-10-23 07:23:18.072437+00', 'FUNDING', 'FUND-RC-42U1IUTJP1', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.07245+00'),
	('01a167a4-86c6-7d0a-8b1d-b09803d98718', '2026-10-23 07:23:18.086542+00', '2026-10-23 07:23:18.086549+00', 'FUNDING', 'FUND-RC-2JIZAY3X28', 'Wallet top-up via CARD', '2026-10-23 07:23:18.086562+00'),
	('01a167a4-86d8-71f2-855b-9aea0a836bfb', '2026-10-23 07:23:18.104982+00', '2026-10-23 07:23:18.104991+00', 'FUNDING', 'FUND-RC-NGS2YFJ6AT', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.105005+00'),
	('01a167a4-86f1-72f8-a47c-825df60f98d3', '2026-10-23 07:23:18.129695+00', '2026-10-23 07:23:18.129705+00', 'FUNDING', 'FUND-RC-OLA7I1L53B', 'Wallet top-up via CARD', '2026-10-23 07:23:18.129718+00'),
	('01a167a4-870a-7fe8-b30d-0354adb4d127', '2026-10-23 07:23:18.154693+00', '2026-10-23 07:23:18.1547+00', 'FUNDING', 'FUND-RC-7CXARFQFTL', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.154714+00'),
	('01a167a4-8723-786a-b244-87ecde595678', '2026-10-23 07:23:18.179551+00', '2026-10-23 07:23:18.179565+00', 'FUNDING', 'FUND-RC-U7HJ9XHZTA', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.179582+00'),
	('01a167a4-8740-772c-8dc2-d304e3bab3ba', '2026-10-23 07:23:18.208604+00', '2026-10-23 07:23:18.20863+00', 'FUNDING', 'FUND-RC-2HZLH5ILAO', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.208669+00'),
	('01a167a4-8764-7ce9-a8d2-6b68f0c99f81', '2026-10-23 07:23:18.244984+00', '2026-10-23 07:23:18.244995+00', 'FUNDING', 'FUND-RC-ERUE9SXNRD', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.245011+00'),
	('01a167a4-8780-7988-87b0-b5cab7427a95', '2026-10-23 07:23:18.273379+00', '2026-10-23 07:23:18.273641+00', 'FUNDING', 'FUND-RC-GEFYF5ETIC', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.273736+00'),
	('01a167a4-87a5-7f8a-b6dd-e07f38ab1b0b', '2026-10-23 07:23:18.309666+00', '2026-10-23 07:23:18.309675+00', 'FUNDING', 'FUND-RC-WTUEFCPLSK', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.309691+00'),
	('01a167a4-87c8-73d7-bce4-fbb682094b1c', '2026-10-23 07:23:18.345024+00', '2026-10-23 07:23:18.345044+00', 'FUNDING', 'FUND-RC-6UME338S1Q', 'Wallet top-up via CARD', '2026-10-23 07:23:18.345066+00'),
	('01a167a4-87fd-7810-a9f1-d18e04a338a1', '2026-10-23 07:23:18.399294+00', '2026-10-23 07:23:18.399332+00', 'FUNDING', 'FUND-RC-UTUF40M4KQ', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.39937+00'),
	('01a167a4-8826-7ce2-b3be-e9572fd95c78', '2026-10-23 07:23:18.43892+00', '2026-10-23 07:23:18.438949+00', 'FUNDING', 'FUND-RC-CSB74HADDJ', 'Wallet top-up via CARD', '2026-10-23 07:23:18.438993+00'),
	('01a167a4-8852-7329-a702-c1f4b6b06b03', '2026-10-23 07:23:18.483006+00', '2026-10-23 07:23:18.483034+00', 'FUNDING', 'FUND-RC-KY6NR6FIYB', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.483057+00'),
	('01a167a4-887d-7137-ac3e-c0c92fe814e7', '2026-10-23 07:23:18.525135+00', '2026-10-23 07:23:18.525145+00', 'FUNDING', 'FUND-RC-SBGZAX8IV8', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.525161+00'),
	('01a167a4-8896-758d-94ca-80d2da46a020', '2026-10-23 07:23:18.550969+00', '2026-10-23 07:23:18.550976+00', 'FUNDING', 'FUND-RC-5GYOB26UHP', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.550994+00'),
	('01a167a4-88d0-7280-b1c0-5d0f5c4ca244', '2026-10-23 07:23:18.609225+00', '2026-10-23 07:23:18.609244+00', 'FUNDING', 'FUND-RC-ADFIL70PB1', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.609266+00'),
	('01a167a4-8905-7f99-bfae-880422574ddb', '2026-10-23 07:23:18.662063+00', '2026-10-23 07:23:18.662097+00', 'FUNDING', 'FUND-RC-ZZF6AF2I90', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.662143+00'),
	('01a167a4-892b-701a-a0f1-723e41be3d48', '2026-10-23 07:23:18.699749+00', '2026-10-23 07:23:18.699765+00', 'FUNDING', 'FUND-RC-2OC4O495YD', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.699784+00'),
	('01a167a4-8954-7e95-949b-824c3b86656e', '2026-10-23 07:23:18.740611+00', '2026-10-23 07:23:18.740629+00', 'FUNDING', 'FUND-RC-ZK4S1EZPDF', 'Wallet top-up via CARD', '2026-10-23 07:23:18.740653+00'),
	('01a167a4-8971-7d82-bf35-159ffaa508c7', '2026-10-23 07:23:18.770013+00', '2026-10-23 07:23:18.77003+00', 'FUNDING', 'FUND-RC-387HPAUZ40', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.770049+00'),
	('01a167a4-898c-775b-b142-f1cd53b4506c', '2026-10-23 07:23:18.797061+00', '2026-10-23 07:23:18.797069+00', 'FUNDING', 'FUND-RC-Q60C7ELC7O', 'Wallet top-up via CARD', '2026-10-23 07:23:18.797085+00'),
	('01a167a4-89a1-7ff2-bcd7-66c2dfa28bc2', '2026-10-23 07:23:18.817361+00', '2026-10-23 07:23:18.817369+00', 'FUNDING', 'FUND-RC-IW6UMJFLN7', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.817386+00'),
	('01a167a4-89bb-71b0-8682-b92429b746f9', '2026-10-23 07:23:18.843232+00', '2026-10-23 07:23:18.843246+00', 'FUNDING', 'FUND-RC-Q37N7UC5H4', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.843264+00'),
	('01a167a4-89cf-70ab-a143-36acf3f15348', '2026-10-23 07:23:18.864062+00', '2026-10-23 07:23:18.864073+00', 'FUNDING', 'FUND-RC-TXV977JZK5', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.864089+00'),
	('01a167a4-89eb-7918-835b-a7c4bb292296', '2026-10-23 07:23:18.891903+00', '2026-10-23 07:23:18.891912+00', 'FUNDING', 'FUND-RC-LNXUWZJ4AE', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:18.891927+00'),
	('01a167a4-8a10-7e89-afe0-fb311d96ca1d', '2026-10-23 07:23:18.928294+00', '2026-10-23 07:23:18.928314+00', 'FUNDING', 'FUND-RC-KW2UZRXYAB', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:18.928338+00'),
	('01a167a4-8a37-7611-9bf1-c1d9009e900c', '2026-10-23 07:23:18.968002+00', '2026-10-23 07:23:18.968018+00', 'FUNDING', 'FUND-RC-OMHSDY1WOQ', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:18.96804+00'),
	('01a167a4-8a56-71f7-8867-135de27f4214', '2026-10-23 07:23:18.998743+00', '2026-10-23 07:23:18.998768+00', 'FUNDING', 'FUND-RC-8QY1ZTY5CW', 'Wallet top-up via CARD', '2026-10-23 07:23:18.998792+00'),
	('01a167a4-8a72-7dcb-9818-b3cc94678a6a', '2026-10-23 07:23:19.026399+00', '2026-10-23 07:23:19.026407+00', 'FUNDING', 'FUND-RC-AQC5DMT09F', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:19.026423+00'),
	('01a167a4-8a8e-7b5d-ab91-4c16c43654d9', '2026-10-23 07:23:19.054976+00', '2026-10-23 07:23:19.054985+00', 'FUNDING', 'FUND-RC-O97WWJCC97', 'Wallet top-up via CARD', '2026-10-23 07:23:19.055002+00'),
	('01a167a4-8aae-7f55-afef-a81cb276f0a8', '2026-10-23 07:23:19.086498+00', '2026-10-23 07:23:19.086514+00', 'FUNDING', 'FUND-RC-X98H2DZKZV', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:19.086534+00'),
	('01a167a4-8acc-7ae5-937c-f5e7830306c3', '2026-10-23 07:23:19.116871+00', '2026-10-23 07:23:19.116886+00', 'FUNDING', 'FUND-RC-NJYSTPSD6R', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:19.116914+00'),
	('01a167a4-8ae7-7217-bcc9-7547e1812ae9', '2026-10-23 07:23:19.14405+00', '2026-10-23 07:23:19.144073+00', 'FUNDING', 'FUND-RC-4K30NC0TXC', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:19.144113+00'),
	('01a167a4-8b0b-7925-b6b8-ea03d455101c', '2026-10-23 07:23:19.18022+00', '2026-10-23 07:23:19.18024+00', 'FUNDING', 'FUND-RC-ZEN1PI2UOB', 'Wallet top-up via NUBAN_TRANSFER', '2026-10-23 07:23:19.180273+00'),
	('01a167a4-8b29-794f-bac0-c300446e37b4', '2026-10-23 07:23:19.209353+00', '2026-10-23 07:23:19.210161+00', 'FUNDING', 'FUND-RC-PWZL686EXB', 'Wallet top-up via WALLET_DEBIT', '2026-10-23 07:23:19.210241+00'),
	('01a167a4-8b4a-75e2-be55-ab2042dd4333', '2026-10-23 07:23:19.243183+00', '2026-10-23 07:23:19.243199+00', 'FUNDING', 'FUND-RC-FF3VQ29FEV', 'Wallet top-up via AGENT_CASH', '2026-10-23 07:23:19.243219+00'),
	('01a167a4-8b68-7731-b7d0-77a0c612d806', '2026-10-23 07:23:19.272711+00', '2026-10-23 07:23:19.272724+00', 'FUNDING', 'FUND-RC-PFOBJ8VIEH', 'Wallet top-up via CARD', '2026-10-23 07:23:19.272745+00'),
	('01a167a4-8bf8-79fd-b943-a0a77190739b', '2026-10-23 07:23:19.338209+00', '2026-10-23 07:23:19.338229+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:19.338256+00'),
	('01a167a4-8bfd-7ea0-92a0-3402f0fc4ba6', '2026-10-23 07:23:19.364421+00', '2026-10-23 07:23:19.364433+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-01', 'Capture hold for SWAP', '2026-10-23 07:23:19.364459+00'),
	('01a167a4-8c07-76da-99d2-38c99ce26774', '2026-10-23 07:23:19.432149+00', '2026-10-23 07:23:19.432164+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:19.432185+00'),
	('01a167a4-8c2a-7f15-8a74-310128b2fde9', '2026-10-23 07:23:19.466785+00', '2026-10-23 07:23:19.466818+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-02', 'Capture hold for SWAP', '2026-10-23 07:23:19.466858+00'),
	('01a167a4-8c59-77b6-8cf0-301629c72e08', '2026-10-23 07:23:19.514213+00', '2026-10-23 07:23:19.51423+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:19.514258+00'),
	('01a167a4-8c7a-79fb-ac8c-a8250f8f1181', '2026-10-23 07:23:19.546905+00', '2026-10-23 07:23:19.546917+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-03', 'Capture hold for SWAP', '2026-10-23 07:23:19.546939+00'),
	('01a167a4-8cb1-763f-a6c3-52b4e6cad3cc', '2026-10-23 07:23:19.601895+00', '2026-10-23 07:23:19.60191+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:19.601935+00'),
	('01a167a4-8ccf-7557-9514-45bbdc06a4ab', '2026-10-23 07:23:19.631368+00', '2026-10-23 07:23:19.631384+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-04', 'Capture hold for SWAP', '2026-10-23 07:23:19.631408+00'),
	('01a167a4-8d0f-7c5e-9d58-0b971d915d17', '2026-10-23 07:23:19.696024+00', '2026-10-23 07:23:19.69606+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:19.696101+00'),
	('01a167a4-8d42-70b2-8ae9-2fab33cdb173', '2026-10-23 07:23:19.746849+00', '2026-10-23 07:23:19.746879+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-05', 'Capture hold for SWAP', '2026-10-23 07:23:19.746914+00'),
	('01a167a4-8d8b-718c-8732-7d20c0a8397d', '2026-10-23 07:23:19.820017+00', '2026-10-23 07:23:19.820029+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:19.820049+00'),
	('01a167a4-8d9d-7b60-836d-d49eec0d25f8', '2026-10-23 07:23:19.837693+00', '2026-10-23 07:23:19.837703+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-06', 'Capture hold for SWAP', '2026-10-23 07:23:19.837717+00'),
	('01a167a4-8daf-7088-b08d-64414ebce534', '2026-10-23 07:23:19.855858+00', '2026-10-23 07:23:19.855867+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:19.855883+00'),
	('01a167a4-8dbc-746d-bd64-e8a36f11c60d', '2026-10-23 07:23:19.868688+00', '2026-10-23 07:23:19.868696+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-07', 'Capture hold for SWAP', '2026-10-23 07:23:19.868712+00'),
	('01a167a4-8dcf-712f-a024-de5015fafd95', '2026-10-23 07:23:19.887635+00', '2026-10-23 07:23:19.887645+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-01-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:19.887661+00'),
	('01a167a4-8de0-79b9-9ad1-55cc747fadc9', '2026-10-23 07:23:19.904537+00', '2026-10-23 07:23:19.904548+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-01-08', 'Capture hold for SWAP', '2026-10-23 07:23:19.904562+00'),
	('01a167a4-8df9-7d6f-9471-39dc4a2ced3e', '2026-10-23 07:23:19.930017+00', '2026-10-23 07:23:19.930029+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:19.930045+00'),
	('01a167a4-8e09-748d-8e2c-cf0e61eb3c68', '2026-10-23 07:23:19.945812+00', '2026-10-23 07:23:19.94582+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-01', 'Capture hold for SWAP', '2026-10-23 07:23:19.945837+00'),
	('01a167a4-8e1e-758f-b56c-de3c7723bb3b', '2026-10-23 07:23:19.966805+00', '2026-10-23 07:23:19.966814+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:19.966829+00'),
	('01a167a4-8e2e-7f7a-805f-dc1ea907f5bf', '2026-10-23 07:23:19.982403+00', '2026-10-23 07:23:19.982418+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-02', 'Capture hold for SWAP', '2026-10-23 07:23:19.982438+00'),
	('01a167a4-8e45-74be-ac31-fe2eaaa78697', '2026-10-23 07:23:20.005996+00', '2026-10-23 07:23:20.006007+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.006025+00'),
	('01a167a4-8e57-7e7d-812a-6dcbe4a3435e', '2026-10-23 07:23:20.023932+00', '2026-10-23 07:23:20.023944+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-03', 'Capture hold for SWAP', '2026-10-23 07:23:20.023967+00'),
	('01a167a4-8e75-7411-94fa-fb0be197104e', '2026-10-23 07:23:20.054185+00', '2026-10-23 07:23:20.054199+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.054223+00'),
	('01a167a4-8e8e-71a3-8117-17f6284636f9', '2026-10-23 07:23:20.078699+00', '2026-10-23 07:23:20.078711+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-04', 'Capture hold for SWAP', '2026-10-23 07:23:20.078733+00'),
	('01a167a4-8eae-73ff-8fe5-8496e6802539', '2026-10-23 07:23:20.110629+00', '2026-10-23 07:23:20.110642+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.110664+00'),
	('01a167a4-8ec8-7e84-ba71-1cbf618296c1', '2026-10-23 07:23:20.13652+00', '2026-10-23 07:23:20.136531+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-05', 'Capture hold for SWAP', '2026-10-23 07:23:20.136554+00'),
	('01a167a4-8ee6-77c4-8d95-2e0063f1f73a', '2026-10-23 07:23:20.16648+00', '2026-10-23 07:23:20.166488+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.166502+00'),
	('01a167a4-8ef5-7ced-b7b0-e9b4cc275b11', '2026-10-23 07:23:20.181218+00', '2026-10-23 07:23:20.181227+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-06', 'Capture hold for SWAP', '2026-10-23 07:23:20.181244+00'),
	('01a167a4-8f07-74d7-8fb6-73469a3e5b1e', '2026-10-23 07:23:20.199351+00', '2026-10-23 07:23:20.199358+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.199372+00'),
	('01a167a4-8f13-75f2-8e31-d448c0f8036e', '2026-10-23 07:23:20.21143+00', '2026-10-23 07:23:20.211441+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-07', 'Capture hold for SWAP', '2026-10-23 07:23:20.211455+00'),
	('01a167a4-8f24-7b68-a5d5-9741229a2a0e', '2026-10-23 07:23:20.228848+00', '2026-10-23 07:23:20.228856+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-02-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.228871+00'),
	('01a167a4-8f33-724e-81b7-d420836a81f4', '2026-10-23 07:23:20.243188+00', '2026-10-23 07:23:20.243196+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-02-08', 'Capture hold for SWAP', '2026-10-23 07:23:20.243211+00'),
	('01a167a4-8f44-78de-9f81-0d3d5c06bae8', '2026-10-23 07:23:20.260972+00', '2026-10-23 07:23:20.26098+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.260996+00'),
	('01a167a4-8f51-7cb8-846c-088905cb7469', '2026-10-23 07:23:20.274052+00', '2026-10-23 07:23:20.27406+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-01', 'Capture hold for SWAP', '2026-10-23 07:23:20.274075+00'),
	('01a167a4-8f66-79c1-93ca-571f52524357', '2026-10-23 07:23:20.294628+00', '2026-10-23 07:23:20.29464+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.294656+00'),
	('01a167a4-8f79-7011-8e7f-be977c563e37', '2026-10-23 07:23:20.313754+00', '2026-10-23 07:23:20.313763+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-02', 'Capture hold for SWAP', '2026-10-23 07:23:20.313779+00'),
	('01a167a4-8f92-75ad-809a-363627c1acbc', '2026-10-23 07:23:20.338684+00', '2026-10-23 07:23:20.338697+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.338715+00'),
	('01a167a4-8fa7-7c2d-a5e6-f91319bf55b9', '2026-10-23 07:23:20.359352+00', '2026-10-23 07:23:20.359362+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-03', 'Capture hold for SWAP', '2026-10-23 07:23:20.359381+00'),
	('01a167a4-8fc3-73ef-addb-2950f11e43fa', '2026-10-23 07:23:20.38793+00', '2026-10-23 07:23:20.38794+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.387964+00'),
	('01a167a4-8fd7-72d3-884b-35bfe29950c7', '2026-10-23 07:23:20.408004+00', '2026-10-23 07:23:20.408016+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-04', 'Capture hold for SWAP', '2026-10-23 07:23:20.408042+00'),
	('01a167a4-8ff8-70c7-b469-9f4187a641e7', '2026-10-23 07:23:20.440706+00', '2026-10-23 07:23:20.440718+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.440743+00'),
	('01a167a4-900f-7c95-ae90-af9860a13480', '2026-10-23 07:23:20.463932+00', '2026-10-23 07:23:20.463945+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-05', 'Capture hold for SWAP', '2026-10-23 07:23:20.463967+00'),
	('01a167a4-9031-72a2-b31f-7ee64f462db6', '2026-10-23 07:23:20.498153+00', '2026-10-23 07:23:20.498169+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.498194+00'),
	('01a167a4-904d-7959-87ca-f46710d5bbc8', '2026-10-23 07:23:20.526167+00', '2026-10-23 07:23:20.52618+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-06', 'Capture hold for SWAP', '2026-10-23 07:23:20.526203+00'),
	('01a167a4-906e-7c4e-b425-e885eadac61d', '2026-10-23 07:23:20.558766+00', '2026-10-23 07:23:20.558779+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.5588+00'),
	('01a167a4-908d-77bc-87c5-007d39c2f9b5', '2026-10-23 07:23:20.58918+00', '2026-10-23 07:23:20.589191+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-07', 'Capture hold for SWAP', '2026-10-23 07:23:20.589211+00'),
	('01a167a4-90b8-7bd3-99b0-7424f927fb24', '2026-10-23 07:23:20.633+00', '2026-10-23 07:23:20.633012+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-VCU-03-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.633036+00'),
	('01a167a4-90e2-7b11-8d44-b5dd0b3f5b64', '2026-10-23 07:23:20.674734+00', '2026-10-23 07:23:20.674764+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-VCU-03-08', 'Capture hold for SWAP', '2026-10-23 07:23:20.674798+00'),
	('01a167a4-9115-7426-a38f-8326c4ace8f4', '2026-10-23 07:23:20.725733+00', '2026-10-23 07:23:20.725747+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.725767+00'),
	('01a167a4-9130-73a3-a1ee-2e154c7d7daa', '2026-10-23 07:23:20.752942+00', '2026-10-23 07:23:20.752957+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-01', 'Capture hold for SWAP', '2026-10-23 07:23:20.752977+00'),
	('01a167a4-9169-7a4b-adf2-4e6c911357f2', '2026-10-23 07:23:20.810137+00', '2026-10-23 07:23:20.810162+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.810205+00'),
	('01a167a4-9185-7231-aae7-673409b58b66', '2026-10-23 07:23:20.838098+00', '2026-10-23 07:23:20.838122+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-02', 'Capture hold for SWAP', '2026-10-23 07:23:20.838163+00'),
	('01a167a4-91a1-785f-b321-95862e817700', '2026-10-23 07:23:20.865245+00', '2026-10-23 07:23:20.865253+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.865266+00'),
	('01a167a4-91ae-7cce-b557-361b8e0a8073', '2026-10-23 07:23:20.87871+00', '2026-10-23 07:23:20.878716+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-03', 'Capture hold for SWAP', '2026-10-23 07:23:20.878727+00'),
	('01a167a4-91c2-7b01-8e6c-48ab99f443d3', '2026-10-23 07:23:20.89841+00', '2026-10-23 07:23:20.898418+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.89843+00'),
	('01a167a4-91cd-70c5-b11b-16cbbdb79e07', '2026-10-23 07:23:20.909721+00', '2026-10-23 07:23:20.909729+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-04', 'Capture hold for SWAP', '2026-10-23 07:23:20.909743+00'),
	('01a167a4-91de-709b-9130-fdaf1ccaa63a', '2026-10-23 07:23:20.926725+00', '2026-10-23 07:23:20.926731+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:20.926744+00'),
	('01a167a4-91eb-7cfb-827d-e54b721d1c5b', '2026-10-23 07:23:20.939955+00', '2026-10-23 07:23:20.939973+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-05', 'Capture hold for SWAP', '2026-10-23 07:23:20.93999+00'),
	('01a167a4-91fd-77dd-b8f1-3b0e2e721d4b', '2026-10-23 07:23:20.958058+00', '2026-10-23 07:23:20.958066+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:20.958083+00'),
	('01a167a4-9209-7fb4-9238-811a16f9c581', '2026-10-23 07:23:20.970048+00', '2026-10-23 07:23:20.970055+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-06', 'Capture hold for SWAP', '2026-10-23 07:23:20.970069+00'),
	('01a167a4-921b-7998-8f9b-d51439c399be', '2026-10-23 07:23:20.987511+00', '2026-10-23 07:23:20.987519+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:20.987533+00'),
	('01a167a4-9229-76ed-bbfa-37a54f95e281', '2026-10-23 07:23:21.001844+00', '2026-10-23 07:23:21.001852+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-07', 'Capture hold for SWAP', '2026-10-23 07:23:21.001866+00'),
	('01a167a4-923e-7352-a521-8e616ba1860b', '2026-10-23 07:23:21.022214+00', '2026-10-23 07:23:21.022224+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-01-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.022239+00'),
	('01a167a4-924c-74a2-9b9c-fbd9fefae5f6', '2026-10-23 07:23:21.036327+00', '2026-10-23 07:23:21.036334+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-01-08', 'Capture hold for SWAP', '2026-10-23 07:23:21.036352+00'),
	('01a167a4-9263-7456-a6d0-2e1055376383', '2026-10-23 07:23:21.059721+00', '2026-10-23 07:23:21.059731+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.059748+00'),
	('01a167a4-9274-749f-8c42-a2f3766ad87f', '2026-10-23 07:23:21.076299+00', '2026-10-23 07:23:21.076307+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-01', 'Capture hold for SWAP', '2026-10-23 07:23:21.076325+00'),
	('01a167a4-928c-70e0-b008-3d726bbb7402', '2026-10-23 07:23:21.100935+00', '2026-10-23 07:23:21.100944+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.100962+00'),
	('01a167a4-92a1-77ac-98f5-9669adfa5cff', '2026-10-23 07:23:21.121282+00', '2026-10-23 07:23:21.12129+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-02', 'Capture hold for SWAP', '2026-10-23 07:23:21.121305+00'),
	('01a167a4-92c9-769a-98b5-f2eea33dd893', '2026-10-23 07:23:21.161634+00', '2026-10-23 07:23:21.161643+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:21.161657+00'),
	('01a167a4-92e1-7f02-b1fe-aad710a35502', '2026-10-23 07:23:21.185659+00', '2026-10-23 07:23:21.185684+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-03', 'Capture hold for SWAP', '2026-10-23 07:23:21.185719+00'),
	('01a167a4-9308-7c04-bff2-813cd67c110a', '2026-10-23 07:23:21.22474+00', '2026-10-23 07:23:21.224751+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.224771+00'),
	('01a167a4-9320-7afc-b730-b2af90352874', '2026-10-23 07:23:21.2488+00', '2026-10-23 07:23:21.248813+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-04', 'Capture hold for SWAP', '2026-10-23 07:23:21.248834+00'),
	('01a167a4-9350-7785-a004-f69fa54cc6ff', '2026-10-23 07:23:21.296398+00', '2026-10-23 07:23:21.296406+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.296427+00'),
	('01a167a4-9366-7a5f-86df-37056733c1e8', '2026-10-23 07:23:21.318671+00', '2026-10-23 07:23:21.318684+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-05', 'Capture hold for SWAP', '2026-10-23 07:23:21.318704+00'),
	('01a167a4-9388-7cdb-8efb-e04f915b7339', '2026-10-23 07:23:21.352257+00', '2026-10-23 07:23:21.35227+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:21.352291+00'),
	('01a167a4-93a1-7942-87dc-9b1061c8b15e', '2026-10-23 07:23:21.377617+00', '2026-10-23 07:23:21.377637+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-06', 'Capture hold for SWAP', '2026-10-23 07:23:21.377659+00'),
	('01a167a4-93c3-76ff-af33-b370d5cee7e8', '2026-10-23 07:23:21.412178+00', '2026-10-23 07:23:21.412193+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.412217+00'),
	('01a167a4-93df-74e8-8b95-9a713eeba494', '2026-10-23 07:23:21.440039+00', '2026-10-23 07:23:21.440054+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-07', 'Capture hold for SWAP', '2026-10-23 07:23:21.440073+00'),
	('01a167a4-93fd-7ed4-a882-2e807491b7d7', '2026-10-23 07:23:21.469542+00', '2026-10-23 07:23:21.469553+00', 'HOLD', 'HOLD-seed-cap-seed-swap-FLEET-NV-02-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.469577+00'),
	('01a167a4-9417-7bc8-b06a-afa70c7fc041', '2026-10-23 07:23:21.4954+00', '2026-10-23 07:23:21.495416+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-FLEET-NV-02-08', 'Capture hold for SWAP', '2026-10-23 07:23:21.49544+00'),
	('01a167a4-943e-7f74-a1d0-6b9daf8a1729', '2026-10-23 07:23:21.534238+00', '2026-10-23 07:23:21.534252+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.534276+00'),
	('01a167a4-9469-7aa1-a2ab-952540666f19', '2026-10-23 07:23:21.577645+00', '2026-10-23 07:23:21.577658+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:21.57768+00'),
	('01a167a4-9492-7d44-89c5-c70ed78c8fdf', '2026-10-23 07:23:21.618857+00', '2026-10-23 07:23:21.618877+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.61891+00'),
	('01a167a4-94af-73a4-938b-5976a02e0444', '2026-10-23 07:23:21.64727+00', '2026-10-23 07:23:21.647282+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:21.647299+00'),
	('01a167a4-94de-7733-b49f-861d7a3b081a', '2026-10-23 07:23:21.694787+00', '2026-10-23 07:23:21.694808+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:21.694838+00'),
	('01a167a4-94f7-7870-8517-a2bd1ff4b0db', '2026-10-23 07:23:21.719661+00', '2026-10-23 07:23:21.719673+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:21.719695+00'),
	('01a167a4-9525-77af-aae0-26e034b6a2cb', '2026-10-23 07:23:21.76529+00', '2026-10-23 07:23:21.765306+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.765333+00'),
	('01a167a4-9552-7c58-8994-472ebd8e95b4', '2026-10-23 07:23:21.811323+00', '2026-10-23 07:23:21.811352+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:21.811388+00'),
	('01a167a4-958a-7bf9-8d46-c01273f8f18b', '2026-10-23 07:23:21.866536+00', '2026-10-23 07:23:21.866554+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:21.866587+00'),
	('01a167a4-95a8-75e6-9818-4a7bcccd8196', '2026-10-23 07:23:21.896605+00', '2026-10-23 07:23:21.896613+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:21.896626+00'),
	('01a167a4-95bc-7c08-b721-a51238c7a258', '2026-10-23 07:23:21.916249+00', '2026-10-23 07:23:21.916258+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:21.916273+00'),
	('01a167a4-95cf-7ba1-ae4b-bf6ab29dc762', '2026-10-23 07:23:21.9357+00', '2026-10-23 07:23:21.935709+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:21.935724+00'),
	('01a167a4-95e7-7ed5-9e8f-c3bc39034288', '2026-10-23 07:23:21.959821+00', '2026-10-23 07:23:21.959832+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:21.959849+00'),
	('01a167a4-95f6-7a90-ae90-8c158961c661', '2026-10-23 07:23:21.974627+00', '2026-10-23 07:23:21.974636+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:21.974653+00'),
	('01a167a4-9618-75c6-b124-8d472bda87c7', '2026-10-23 07:23:22.009019+00', '2026-10-23 07:23:22.009032+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-01-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.009046+00'),
	('01a167a4-9641-7c18-a782-5e01806fa0b6', '2026-10-23 07:23:22.049732+00', '2026-10-23 07:23:22.04974+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-01-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:22.049752+00'),
	('01a167a4-9660-75df-b23f-450e7c406792', '2026-10-23 07:23:22.080704+00', '2026-10-23 07:23:22.080713+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:22.080725+00'),
	('01a167a4-9686-71ff-9d39-3d821ef927b3', '2026-10-23 07:23:22.118911+00', '2026-10-23 07:23:22.118928+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:22.118999+00'),
	('01a167a4-96a0-7ea6-adb6-4bd5330be47b', '2026-10-23 07:23:22.145144+00', '2026-10-23 07:23:22.145153+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.145166+00'),
	('01a167a4-96b0-7e82-a879-4b73c2026f9d', '2026-10-23 07:23:22.160837+00', '2026-10-23 07:23:22.160846+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:22.160858+00');
INSERT INTO public.finance_ledgertransaction VALUES
	('01a167a4-96c7-7427-91fd-eff85aa51586', '2026-10-23 07:23:22.183766+00', '2026-10-23 07:23:22.183775+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:22.183787+00'),
	('01a167a4-96dd-71ed-8a73-48f730a04bef', '2026-10-23 07:23:22.205269+00', '2026-10-23 07:23:22.20528+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:22.205292+00'),
	('01a167a4-9704-7346-8d74-429ca9bbb8fe', '2026-10-23 07:23:22.244721+00', '2026-10-23 07:23:22.244728+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:22.244741+00'),
	('01a167a4-9713-7318-aa88-597b171d4658', '2026-10-23 07:23:22.25953+00', '2026-10-23 07:23:22.259537+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:22.259549+00'),
	('01a167a4-9729-7a51-9503-a70172345ea7', '2026-10-23 07:23:22.282325+00', '2026-10-23 07:23:22.282347+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.282378+00'),
	('01a167a4-9742-7d4b-a026-0db403bda70b', '2026-10-23 07:23:22.306661+00', '2026-10-23 07:23:22.306682+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:22.306714+00'),
	('01a167a4-9772-7774-ad73-5379a104dc28', '2026-10-23 07:23:22.354433+00', '2026-10-23 07:23:22.354456+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:22.35449+00'),
	('01a167a4-978f-7c24-91c4-dd14d16481eb', '2026-10-23 07:23:22.383721+00', '2026-10-23 07:23:22.383731+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:22.383746+00'),
	('01a167a4-97b4-74e6-b6ef-57ac03fa53d2', '2026-10-23 07:23:22.420932+00', '2026-10-23 07:23:22.420941+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:22.420958+00'),
	('01a167a4-97cf-798b-bfbd-60a319fd512c', '2026-10-23 07:23:22.447483+00', '2026-10-23 07:23:22.447494+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:22.447511+00'),
	('01a167a4-97ec-7d89-b3a2-a01a79d54d91', '2026-10-23 07:23:22.476821+00', '2026-10-23 07:23:22.476836+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-02-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.476855+00'),
	('01a167a4-97fe-712e-b487-30581f554fe9', '2026-10-23 07:23:22.495078+00', '2026-10-23 07:23:22.495095+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-02-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:22.495115+00'),
	('01a167a4-981d-7e1b-89e6-8933b54e055d', '2026-10-23 07:23:22.526034+00', '2026-10-23 07:23:22.526043+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:22.526058+00'),
	('01a167a4-982e-70d0-9bda-c6de7f7606a1', '2026-10-23 07:23:22.542157+00', '2026-10-23 07:23:22.542167+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:22.542182+00'),
	('01a167a4-9847-7b48-b439-dca519c39802', '2026-10-23 07:23:22.567997+00', '2026-10-23 07:23:22.568006+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.568023+00'),
	('01a167a4-985c-7951-ac73-e94e27345071', '2026-10-23 07:23:22.588664+00', '2026-10-23 07:23:22.58868+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:22.588702+00'),
	('01a167a4-98ac-7e39-b5de-ef92e427fcc1', '2026-10-23 07:23:22.669983+00', '2026-10-23 07:23:22.670104+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:22.670234+00'),
	('01a167a4-98f4-72e7-8efa-79ba4412575e', '2026-10-23 07:23:22.740477+00', '2026-10-23 07:23:22.740554+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:22.740568+00'),
	('01a167a4-9938-76fe-81e3-4c1410b55bdf', '2026-10-23 07:23:22.808796+00', '2026-10-23 07:23:22.808809+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:22.808822+00'),
	('01a167a4-9951-79bc-8d56-0a6b099d6818', '2026-10-23 07:23:22.833564+00', '2026-10-23 07:23:22.833574+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:22.833587+00'),
	('01a167a4-996c-79f6-8a6b-014a44c204f7', '2026-10-23 07:23:22.860827+00', '2026-10-23 07:23:22.860838+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:22.86085+00'),
	('01a167a4-999f-751c-bfc4-2871665b4fdb', '2026-10-23 07:23:22.912156+00', '2026-10-23 07:23:22.912168+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:22.91218+00'),
	('01a167a4-99f2-7527-879e-37f0e4ce1b30', '2026-10-23 07:23:22.994865+00', '2026-10-23 07:23:22.994876+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:22.994888+00'),
	('01a167a4-9a02-794b-b0a2-153ccfbe9ff6', '2026-10-23 07:23:23.010675+00', '2026-10-23 07:23:23.010685+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:23.010697+00'),
	('01a167a4-9a1d-7be1-874d-6f245e86bf60', '2026-10-23 07:23:23.037652+00', '2026-10-23 07:23:23.037685+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.03799+00'),
	('01a167a4-9a41-78a0-ad23-48694a3d5214', '2026-10-23 07:23:23.074075+00', '2026-10-23 07:23:23.074159+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:23.074227+00'),
	('01a167a4-9a63-767f-9eee-db6b420234b1', '2026-10-23 07:23:23.107448+00', '2026-10-23 07:23:23.107457+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-03-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.10747+00'),
	('01a167a4-9a76-73b1-a3ea-775c342e68a6', '2026-10-23 07:23:23.126875+00', '2026-10-23 07:23:23.126883+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-03-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:23.126895+00'),
	('01a167a4-9a91-7e2a-bb8d-2165463a6b35', '2026-10-23 07:23:23.153326+00', '2026-10-23 07:23:23.153335+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.153347+00'),
	('01a167a4-9aa4-70ed-a31f-407c798e5813', '2026-10-23 07:23:23.173095+00', '2026-10-23 07:23:23.173104+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:23.173116+00'),
	('01a167a4-9ab7-70a2-9fca-ca3c70f8b085', '2026-10-23 07:23:23.191739+00', '2026-10-23 07:23:23.191747+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.191759+00'),
	('01a167a4-9ac3-77b9-8858-71170f2b5b30', '2026-10-23 07:23:23.204016+00', '2026-10-23 07:23:23.204024+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:23.204037+00'),
	('01a167a4-9ad8-7b61-9a64-e27a628924d9', '2026-10-23 07:23:23.224899+00', '2026-10-23 07:23:23.224908+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:23.224921+00'),
	('01a167a4-9ae7-71ad-9bea-6be3cb28294f', '2026-10-23 07:23:23.239727+00', '2026-10-23 07:23:23.239734+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:23.239746+00'),
	('01a167a4-9afc-746c-af5a-5629df9c88d9', '2026-10-23 07:23:23.260143+00', '2026-10-23 07:23:23.26015+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.260162+00'),
	('01a167a4-9b0b-70ac-bca3-17504869657e', '2026-10-23 07:23:23.27579+00', '2026-10-23 07:23:23.2758+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:23.275813+00'),
	('01a167a4-9b1f-789c-80dc-cb721db77319', '2026-10-23 07:23:23.295763+00', '2026-10-23 07:23:23.295771+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.295782+00'),
	('01a167a4-9b2b-7d88-8746-68ff1589f16d', '2026-10-23 07:23:23.307844+00', '2026-10-23 07:23:23.307851+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:23.307862+00'),
	('01a167a4-9b3c-75eb-8906-68ca983f6256', '2026-10-23 07:23:23.324927+00', '2026-10-23 07:23:23.324934+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:23.324947+00'),
	('01a167a4-9b49-79fb-aa4d-01a3e51ba9e4', '2026-10-23 07:23:23.337202+00', '2026-10-23 07:23:23.33721+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:23.337225+00'),
	('01a167a4-9b5d-7c4e-9a54-70d138e073c6', '2026-10-23 07:23:23.35712+00', '2026-10-23 07:23:23.357131+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.357146+00'),
	('01a167a4-9b6b-7c04-8916-b7586e24ffe4', '2026-10-23 07:23:23.37204+00', '2026-10-23 07:23:23.372048+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:23.372063+00'),
	('01a167a4-9b7f-7b21-a8aa-bedcb1f6da6b', '2026-10-23 07:23:23.391703+00', '2026-10-23 07:23:23.391711+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-04-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.391727+00'),
	('01a167a4-9b90-7553-96ee-4f97a55287c4', '2026-10-23 07:23:23.408529+00', '2026-10-23 07:23:23.40854+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-04-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:23.408555+00'),
	('01a167a4-9ba7-78ab-ac5f-b9500290712f', '2026-10-23 07:23:23.431165+00', '2026-10-23 07:23:23.431174+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.43119+00'),
	('01a167a4-9bb8-7efe-a92a-62df7c058393', '2026-10-23 07:23:23.448393+00', '2026-10-23 07:23:23.448404+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:23.448419+00'),
	('01a167a4-9bd1-78fe-912a-00f4812e40ce', '2026-10-23 07:23:23.47395+00', '2026-10-23 07:23:23.473961+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.473977+00'),
	('01a167a4-9be4-7cda-93c7-c4d246a8c7e2', '2026-10-23 07:23:23.492678+00', '2026-10-23 07:23:23.492692+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:23.49271+00'),
	('01a167a4-9c02-773b-8e70-b95ed04c4d23', '2026-10-23 07:23:23.522869+00', '2026-10-23 07:23:23.522882+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:23.5229+00'),
	('01a167a4-9c16-71a5-9fa6-e192bd43109f', '2026-10-23 07:23:23.543149+00', '2026-10-23 07:23:23.54316+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:23.543176+00'),
	('01a167a4-9c36-736d-8876-1d9319c4609e', '2026-10-23 07:23:23.574324+00', '2026-10-23 07:23:23.574334+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.57435+00'),
	('01a167a4-9c46-77e9-bcad-1af903bbcb56', '2026-10-23 07:23:23.590956+00', '2026-10-23 07:23:23.590965+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:23.590981+00'),
	('01a167a4-9c60-7573-8ad7-f3fa58f4a6df', '2026-10-23 07:23:23.616449+00', '2026-10-23 07:23:23.616458+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.616475+00'),
	('01a167a4-9c72-7dd9-a592-caec8b4182b6', '2026-10-23 07:23:23.635119+00', '2026-10-23 07:23:23.635127+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:23.635145+00'),
	('01a167a4-9ca6-7fbd-972f-7ecc3c1bac04', '2026-10-23 07:23:23.686605+00', '2026-10-23 07:23:23.686615+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:23.686632+00'),
	('01a167a4-9cb9-7962-a5dd-f29bc8a9dba2', '2026-10-23 07:23:23.705623+00', '2026-10-23 07:23:23.70563+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:23.705643+00'),
	('01a167a4-9cce-7303-bfaa-de38bee6b049', '2026-10-23 07:23:23.726324+00', '2026-10-23 07:23:23.726332+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.726344+00'),
	('01a167a4-9cdc-7e97-a03a-7d4dd7e16b42', '2026-10-23 07:23:23.740194+00', '2026-10-23 07:23:23.740202+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:23.740214+00'),
	('01a167a4-9d00-7266-9e49-20e1ad8ba8cd', '2026-10-23 07:23:23.776484+00', '2026-10-23 07:23:23.776493+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-05-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.77651+00'),
	('01a167a4-9d0f-70a3-bc3d-acfc8a4beef6', '2026-10-23 07:23:23.7921+00', '2026-10-23 07:23:23.79211+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-05-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:23.792129+00'),
	('01a167a4-9d28-7037-80c6-ed19a38d8e65', '2026-10-23 07:23:23.816778+00', '2026-10-23 07:23:23.816789+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:23.816809+00'),
	('01a167a4-9d3d-7375-99bb-fb0d11b852df', '2026-10-23 07:23:23.837395+00', '2026-10-23 07:23:23.837408+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:23.837427+00'),
	('01a167a4-9d60-7543-a8d7-7ec7e4774f38', '2026-10-23 07:23:23.873121+00', '2026-10-23 07:23:23.873133+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:23.873154+00'),
	('01a167a4-9d7c-7221-8ce0-1a5f696bbe9a', '2026-10-23 07:23:23.900632+00', '2026-10-23 07:23:23.900659+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:23.900699+00'),
	('01a167a4-9dba-7e4b-99d6-8c9224a1f5ef', '2026-10-23 07:23:23.962693+00', '2026-10-23 07:23:23.962712+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:23.962741+00'),
	('01a167a4-9de5-7c26-b188-53eae9604adc', '2026-10-23 07:23:24.005196+00', '2026-10-23 07:23:24.005206+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:24.00522+00'),
	('01a167a4-9dfb-70a5-bb5d-8b5412e7f00f', '2026-10-23 07:23:24.027749+00', '2026-10-23 07:23:24.027756+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.027769+00'),
	('01a167a4-9e07-7c97-9a63-f38e1706927d', '2026-10-23 07:23:24.039967+00', '2026-10-23 07:23:24.039974+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:24.039985+00'),
	('01a167a4-9e1b-7e64-a33a-4f37e5c8083a', '2026-10-23 07:23:24.059223+00', '2026-10-23 07:23:24.059234+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.059256+00'),
	('01a167a4-9e2a-7ce4-874c-d333f3ac13a8', '2026-10-23 07:23:24.074788+00', '2026-10-23 07:23:24.074797+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:24.074814+00'),
	('01a167a4-9e42-70c2-9490-8e99f8cc5915', '2026-10-23 07:23:24.098479+00', '2026-10-23 07:23:24.098489+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:24.098505+00'),
	('01a167a4-9e50-7033-934c-3ab063e7db18', '2026-10-23 07:23:24.112128+00', '2026-10-23 07:23:24.112138+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:24.112151+00'),
	('01a167a4-9e6a-78e8-88b6-7d5cdf5d0697', '2026-10-23 07:23:24.138659+00', '2026-10-23 07:23:24.138668+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.138683+00'),
	('01a167a4-9e7a-7707-aa09-4337c9f022e5', '2026-10-23 07:23:24.154549+00', '2026-10-23 07:23:24.154557+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:24.154569+00'),
	('01a167a4-9e92-7432-a629-453d33972f74', '2026-10-23 07:23:24.178879+00', '2026-10-23 07:23:24.178886+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-06-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.178898+00'),
	('01a167a4-9e9f-70d4-8a73-b084b1fec07a', '2026-10-23 07:23:24.191973+00', '2026-10-23 07:23:24.191981+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-06-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:24.191993+00'),
	('01a167a4-9eb2-780e-ade2-0e559843af04', '2026-10-23 07:23:24.211007+00', '2026-10-23 07:23:24.211014+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.211026+00'),
	('01a167a4-9ebf-701b-991a-8c2d75c355e0', '2026-10-23 07:23:24.223236+00', '2026-10-23 07:23:24.223243+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:24.223257+00'),
	('01a167a4-9ed0-712f-a5c8-5c24ae9bb385', '2026-10-23 07:23:24.240419+00', '2026-10-23 07:23:24.240426+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.240439+00'),
	('01a167a4-9edc-7bad-971d-615e4e21f21b', '2026-10-23 07:23:24.252729+00', '2026-10-23 07:23:24.252736+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:24.252749+00'),
	('01a167a4-9eed-7d58-a0f4-2d67703064fb', '2026-10-23 07:23:24.269628+00', '2026-10-23 07:23:24.269637+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:24.269652+00'),
	('01a167a4-9ef9-7683-8da7-a16065eb2cb8', '2026-10-23 07:23:24.281606+00', '2026-10-23 07:23:24.281613+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:24.281626+00'),
	('01a167a4-9f0c-7c18-95e2-646c4f9a7f77', '2026-10-23 07:23:24.300715+00', '2026-10-23 07:23:24.300725+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.30074+00'),
	('01a167a4-9f1a-7e9e-b766-9e88350c7d4e', '2026-10-23 07:23:24.314324+00', '2026-10-23 07:23:24.314333+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:24.314348+00'),
	('01a167a4-9f2e-7573-be06-dc8c57220e16', '2026-10-23 07:23:24.334253+00', '2026-10-23 07:23:24.334262+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.334277+00'),
	('01a167a4-9f41-7890-bee9-5a1d0c339d6f', '2026-10-23 07:23:24.35336+00', '2026-10-23 07:23:24.353374+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:24.35339+00'),
	('01a167a4-9f5b-743d-a7db-0e2318426ca2', '2026-10-23 07:23:24.379407+00', '2026-10-23 07:23:24.379416+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:24.379435+00'),
	('01a167a4-9f6b-7729-a6c7-c7a934a3e4e3', '2026-10-23 07:23:24.39584+00', '2026-10-23 07:23:24.395848+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:24.395866+00'),
	('01a167a4-9f89-7c6e-9c8f-eae07d0affbf', '2026-10-23 07:23:24.425959+00', '2026-10-23 07:23:24.425968+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.425984+00'),
	('01a167a4-9f9b-7364-af9f-3a0ce4a704c9', '2026-10-23 07:23:24.443143+00', '2026-10-23 07:23:24.443151+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:24.443166+00'),
	('01a167a4-9fb1-7afa-9baa-6fb64abac2c0', '2026-10-23 07:23:24.465395+00', '2026-10-23 07:23:24.465429+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-07-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.465464+00'),
	('01a167a4-9fbf-79f9-9127-15741cbe1a4e', '2026-10-23 07:23:24.479212+00', '2026-10-23 07:23:24.479219+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-07-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:24.479231+00'),
	('01a167a4-9fd8-7b06-b14b-95776a70fef0', '2026-10-23 07:23:24.504543+00', '2026-10-23 07:23:24.504553+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-01', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.504569+00'),
	('01a167a4-9fed-7937-af74-6907d2c7c56b', '2026-10-23 07:23:24.525234+00', '2026-10-23 07:23:24.525244+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-01', 'Capture hold for SWAP', '2026-10-23 07:23:24.52526+00'),
	('01a167a4-a004-72de-928c-4191da4f5a99', '2026-10-23 07:23:24.549107+00', '2026-10-23 07:23:24.549116+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-02', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.549133+00'),
	('01a167a4-a016-7f3a-82ed-189bb1ff6a41', '2026-10-23 07:23:24.566778+00', '2026-10-23 07:23:24.566788+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-02', 'Capture hold for SWAP', '2026-10-23 07:23:24.566804+00'),
	('01a167a4-a036-7a8d-ac13-349b0d3046d4', '2026-10-23 07:23:24.598683+00', '2026-10-23 07:23:24.598713+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-03', 'Wallet hold 45000 kobo', '2026-10-23 07:23:24.598748+00'),
	('01a167a4-a054-7aa7-9287-bcb60a291361', '2026-10-23 07:23:24.628164+00', '2026-10-23 07:23:24.628175+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-03', 'Capture hold for SWAP', '2026-10-23 07:23:24.628192+00'),
	('01a167a4-a06f-79e5-bdd0-6e3e55c6554b', '2026-10-23 07:23:24.656033+00', '2026-10-23 07:23:24.656042+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-04', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.656056+00'),
	('01a167a4-a08b-7029-b522-a8abd0d3ad39', '2026-10-23 07:23:24.683759+00', '2026-10-23 07:23:24.683778+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-04', 'Capture hold for SWAP', '2026-10-23 07:23:24.683808+00'),
	('01a167a4-a0af-7cf5-bde7-cf1aa0aa05af', '2026-10-23 07:23:24.720052+00', '2026-10-23 07:23:24.720072+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-05', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.720106+00'),
	('01a167a4-a0cc-79c3-ac45-6a60a4a78a43', '2026-10-23 07:23:24.748907+00', '2026-10-23 07:23:24.748926+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-05', 'Capture hold for SWAP', '2026-10-23 07:23:24.748957+00'),
	('01a167a4-a0f5-7913-819a-f603a582dc81', '2026-10-23 07:23:24.790162+00', '2026-10-23 07:23:24.790184+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-06', 'Wallet hold 45000 kobo', '2026-10-23 07:23:24.790216+00'),
	('01a167a4-a110-7e37-9936-17233c8b169f', '2026-10-23 07:23:24.816999+00', '2026-10-23 07:23:24.817018+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-06', 'Capture hold for SWAP', '2026-10-23 07:23:24.817051+00'),
	('01a167a4-a13f-7530-9f8c-5d14140bcc86', '2026-10-23 07:23:24.864149+00', '2026-10-23 07:23:24.864176+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-07', 'Wallet hold 50000 kobo', '2026-10-23 07:23:24.864203+00'),
	('01a167a4-a160-7c6b-8453-5d72424cb1a6', '2026-10-23 07:23:24.896977+00', '2026-10-23 07:23:24.896997+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-07', 'Capture hold for SWAP', '2026-10-23 07:23:24.897129+00'),
	('01a167a4-a181-7bc2-8d60-eb7a46511aee', '2026-10-23 07:23:24.930087+00', '2026-10-23 07:23:24.9301+00', 'HOLD', 'HOLD-seed-cap-seed-swap-RID-08-LAG-08', 'Wallet hold 55000 kobo', '2026-10-23 07:23:24.930123+00'),
	('01a167a4-a19e-7f59-8802-faf4d5438a24', '2026-10-23 07:23:24.95869+00', '2026-10-23 07:23:24.95871+00', 'CAPTURE', 'CAP-seed-cap-seed-swap-RID-08-LAG-08', 'Capture hold for SWAP', '2026-10-23 07:23:24.95874+00');


--
-- Data for Name: finance_ledgerentry; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_ledgerentry VALUES
	('01a167a4-7a71-7766-81f6-a12b73e6f6ba', '2026-10-23 07:23:14.929676+00', '2026-10-23 07:23:14.929686+00', 45000, 0, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-7a69-73ed-a71e-ebbeea5c6b9e'),
	('01a167a4-7a77-7ddf-8ffc-65ecd2e247a1', '2026-10-23 07:23:14.935752+00', '2026-10-23 07:23:14.935757+00', 0, 45000, '01a167a4-7a76-7b81-a425-c1be6c59e949', '01a167a4-7a69-73ed-a71e-ebbeea5c6b9e'),
	('01a167a4-8162-7a39-b628-74dcddc4ef39', '2026-10-23 07:23:16.70631+00', '2026-10-23 07:23:16.706317+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-815e-743f-9a27-5d30451cbce7'),
	('01a167a4-8165-7b3a-a5ce-13d4aeee271c', '2026-10-23 07:23:16.70966+00', '2026-10-23 07:23:16.709667+00', 0, 40000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-815e-743f-9a27-5d30451cbce7'),
	('01a167a4-8172-7f7a-b562-fee1b56cefc3', '2026-10-23 07:23:16.722297+00', '2026-10-23 07:23:16.722303+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8170-74bb-9bbc-902c4f9bc77e'),
	('01a167a4-8174-7aa9-84bd-d0ae5dae646c', '2026-10-23 07:23:16.724809+00', '2026-10-23 07:23:16.724816+00', 0, 70000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-8170-74bb-9bbc-902c4f9bc77e'),
	('01a167a4-817f-7b70-8e9a-d695a00d113e', '2026-10-23 07:23:16.735246+00', '2026-10-23 07:23:16.735252+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-817d-7adf-a2a6-f8d0f4840943'),
	('01a167a4-8181-7ca7-900f-8cdb72cddbf4', '2026-10-23 07:23:16.737556+00', '2026-10-23 07:23:16.737562+00', 0, 85000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-817d-7adf-a2a6-f8d0f4840943'),
	('01a167a4-818f-7149-b3ba-d4b23a89d972', '2026-10-23 07:23:16.75186+00', '2026-10-23 07:23:16.751867+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-818d-7fb8-89d4-3beae944f66d'),
	('01a167a4-8192-7cd9-a140-a1937b972366', '2026-10-23 07:23:16.754361+00', '2026-10-23 07:23:16.754367+00', 0, 100000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-818d-7fb8-89d4-3beae944f66d'),
	('01a167a4-819c-7d07-b146-0d8f037ad362', '2026-10-23 07:23:16.764926+00', '2026-10-23 07:23:16.764933+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-819a-79a4-be35-46b3b79d5278'),
	('01a167a4-819f-760b-8b62-228f7535d459', '2026-10-23 07:23:16.767471+00', '2026-10-23 07:23:16.767478+00', 0, 115000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-819a-79a4-be35-46b3b79d5278'),
	('01a167a4-81ac-7e55-8e41-48893cb1cbd8', '2026-10-23 07:23:16.780244+00', '2026-10-23 07:23:16.780251+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81aa-7ef9-a508-1f21ed023506'),
	('01a167a4-81ae-7b53-9e7b-0880c2ec03dc', '2026-10-23 07:23:16.783113+00', '2026-10-23 07:23:16.783121+00', 0, 145000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-81aa-7ef9-a508-1f21ed023506'),
	('01a167a4-81ba-7bd3-ae9e-be2f736839fc', '2026-10-23 07:23:16.794421+00', '2026-10-23 07:23:16.794428+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81b8-7a03-96cd-cb80bacac6dc'),
	('01a167a4-81bc-7092-92de-0f687b5580ee', '2026-10-23 07:23:16.796946+00', '2026-10-23 07:23:16.796956+00', 0, 25000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-81b8-7a03-96cd-cb80bacac6dc'),
	('01a167a4-81c7-775e-8a3e-12c6d4c81fee', '2026-10-23 07:23:16.807411+00', '2026-10-23 07:23:16.807418+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81c5-7a0d-a0a5-bebe43d28b3c'),
	('01a167a4-81c9-7b1c-ad6f-a3dfda64dc39', '2026-10-23 07:23:16.810082+00', '2026-10-23 07:23:16.81009+00', 0, 40000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-81c5-7a0d-a0a5-bebe43d28b3c'),
	('01a167a4-81d6-74c7-aa2f-63beac480f6c', '2026-10-23 07:23:16.823111+00', '2026-10-23 07:23:16.82312+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81d4-7185-9d2c-5205b0c4dce2'),
	('01a167a4-81da-7d89-beda-c609bc9c984f', '2026-10-23 07:23:16.826398+00', '2026-10-23 07:23:16.826407+00', 0, 55000, '01a167a4-7a6e-7454-9da4-6d9b4ca70447', '01a167a4-81d4-7185-9d2c-5205b0c4dce2'),
	('01a167a4-81e9-7f37-b0f0-6db146fc82c2', '2026-10-23 07:23:16.841675+00', '2026-10-23 07:23:16.841682+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81e7-7957-92f5-1e0930fbfa43'),
	('01a167a4-81ee-704a-8e5f-1c4caefa7620', '2026-10-23 07:23:16.846135+00', '2026-10-23 07:23:16.846143+00', 0, 55000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-81e7-7957-92f5-1e0930fbfa43'),
	('01a167a4-81fd-748f-80f2-6ef5cb600227', '2026-10-23 07:23:16.861432+00', '2026-10-23 07:23:16.861441+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-81f9-7afd-b9c6-39eb135c60e0'),
	('01a167a4-8200-7d8b-880c-96df21e4d0d2', '2026-10-23 07:23:16.864387+00', '2026-10-23 07:23:16.864395+00', 0, 85000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-81f9-7afd-b9c6-39eb135c60e0'),
	('01a167a4-8214-702a-911e-50d777e3d958', '2026-10-23 07:23:16.884184+00', '2026-10-23 07:23:16.884194+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-820d-71c7-a06e-af9582930ab2'),
	('01a167a4-821a-78bf-b433-6a04cf275312', '2026-10-23 07:23:16.890525+00', '2026-10-23 07:23:16.890534+00', 0, 100000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-820d-71c7-a06e-af9582930ab2'),
	('01a167a4-8230-77c5-8021-6e764d8af0dd', '2026-10-23 07:23:16.912984+00', '2026-10-23 07:23:16.912993+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-822e-7fe2-b086-87a210ce25de'),
	('01a167a4-8234-7d00-8751-fce6a20c31ba', '2026-10-23 07:23:16.916596+00', '2026-10-23 07:23:16.916606+00', 0, 115000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-822e-7fe2-b086-87a210ce25de'),
	('01a167a4-8246-73e4-a21b-5c8d75f57979', '2026-10-23 07:23:16.934578+00', '2026-10-23 07:23:16.934592+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8241-7302-a2cd-6067f4d2208d'),
	('01a167a4-824b-7f24-8daa-bb0e89ef5bb0', '2026-10-23 07:23:16.939394+00', '2026-10-23 07:23:16.939405+00', 0, 130000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8241-7302-a2cd-6067f4d2208d'),
	('01a167a4-826c-7cff-ba51-e34af09bed6b', '2026-10-23 07:23:16.973066+00', '2026-10-23 07:23:16.973078+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8268-7cd1-993e-8c9b9f9ec214'),
	('01a167a4-8270-7611-bb2f-09c1ebb67aa6', '2026-10-23 07:23:16.977102+00', '2026-10-23 07:23:16.977112+00', 0, 25000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8268-7cd1-993e-8c9b9f9ec214'),
	('01a167a4-8285-70fa-b74b-b3325e1dab57', '2026-10-23 07:23:16.997207+00', '2026-10-23 07:23:16.997219+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8281-7ce6-8294-e580b3546972'),
	('01a167a4-8289-77f9-8efd-025015ae0c86', '2026-10-23 07:23:17.002088+00', '2026-10-23 07:23:17.002102+00', 0, 40000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8281-7ce6-8294-e580b3546972'),
	('01a167a4-82a2-7182-84a8-ed0aaea576f9', '2026-10-23 07:23:17.026576+00', '2026-10-23 07:23:17.026594+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-829d-77d9-b22e-9b4579dbbe36'),
	('01a167a4-82a9-759b-8322-b84981804a4a', '2026-10-23 07:23:17.034002+00', '2026-10-23 07:23:17.034019+00', 0, 55000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-829d-77d9-b22e-9b4579dbbe36'),
	('01a167a4-82d2-70a6-8759-ab61f8ed2c58', '2026-10-23 07:23:17.075192+00', '2026-10-23 07:23:17.07521+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-82cc-7646-a13b-10ed5f596c08'),
	('01a167a4-82db-7eb9-97f4-cffab13d16cd', '2026-10-23 07:23:17.083323+00', '2026-10-23 07:23:17.083344+00', 0, 70000, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-82cc-7646-a13b-10ed5f596c08'),
	('01a167a4-82f3-79bc-9032-95b40d8cb5f4', '2026-10-23 07:23:17.107362+00', '2026-10-23 07:23:17.107375+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-82ef-7983-aca7-1b73098fc344'),
	('01a167a4-82f9-7744-834c-37bb8df0e973', '2026-10-23 07:23:17.114075+00', '2026-10-23 07:23:17.114086+00', 0, 70000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-82ef-7983-aca7-1b73098fc344'),
	('01a167a4-830f-7c40-88ba-8e0648208654', '2026-10-23 07:23:17.135503+00', '2026-10-23 07:23:17.135514+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-830b-7430-96b5-1282ff8b64d5'),
	('01a167a4-8313-7998-9bca-8e60a13f33b9', '2026-10-23 07:23:17.139612+00', '2026-10-23 07:23:17.139621+00', 0, 100000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-830b-7430-96b5-1282ff8b64d5'),
	('01a167a4-8321-7234-a637-1792deb9a162', '2026-10-23 07:23:17.154077+00', '2026-10-23 07:23:17.154089+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-831f-74aa-9393-f45071270daa'),
	('01a167a4-8326-70b0-aa10-86c656a51973', '2026-10-23 07:23:17.158526+00', '2026-10-23 07:23:17.158538+00', 0, 115000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-831f-74aa-9393-f45071270daa'),
	('01a167a4-833e-7889-b06b-4a6274706a5b', '2026-10-23 07:23:17.182616+00', '2026-10-23 07:23:17.182629+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-833a-787f-84ef-9a3419325cb6'),
	('01a167a4-8342-7308-8501-08f097240bb9', '2026-10-23 07:23:17.186985+00', '2026-10-23 07:23:17.186998+00', 0, 130000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-833a-787f-84ef-9a3419325cb6'),
	('01a167a4-8361-736e-9e56-ba4f01f02e42', '2026-10-23 07:23:17.218004+00', '2026-10-23 07:23:17.218017+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-835a-77b8-ae7d-2d13069bdaae'),
	('01a167a4-8369-7a17-90e4-4456e1d727de', '2026-10-23 07:23:17.225723+00', '2026-10-23 07:23:17.225751+00', 0, 145000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-835a-77b8-ae7d-2d13069bdaae'),
	('01a167a4-838b-74e3-ace7-8cbd33509808', '2026-10-23 07:23:17.259538+00', '2026-10-23 07:23:17.259565+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8386-7884-99e8-a2782d1aadd5'),
	('01a167a4-8391-78f1-88b3-1f476d8486b8', '2026-10-23 07:23:17.26607+00', '2026-10-23 07:23:17.266096+00', 0, 40000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-8386-7884-99e8-a2782d1aadd5'),
	('01a167a4-83ae-7693-a77d-7ac4581afcfb', '2026-10-23 07:23:17.295214+00', '2026-10-23 07:23:17.295238+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-83a7-77c6-a944-2e8e2555f6f7'),
	('01a167a4-83b8-7e89-8b50-26a2cbfc93cb', '2026-10-23 07:23:17.305145+00', '2026-10-23 07:23:17.30517+00', 0, 55000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-83a7-77c6-a944-2e8e2555f6f7'),
	('01a167a4-83d2-740f-9b26-20af52adaaea', '2026-10-23 07:23:17.331031+00', '2026-10-23 07:23:17.331056+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-83cd-7c37-b730-a902180063f1'),
	('01a167a4-83da-7e02-8bd5-9d17fce89d82', '2026-10-23 07:23:17.338779+00', '2026-10-23 07:23:17.338802+00', 0, 70000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-83cd-7c37-b730-a902180063f1'),
	('01a167a4-83f3-7273-9cce-b38bf01b1613', '2026-10-23 07:23:17.364219+00', '2026-10-23 07:23:17.364242+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-83ee-776b-87e8-8a8dcbad02e4'),
	('01a167a4-83fa-7eb3-ac0f-422c6935717d', '2026-10-23 07:23:17.37056+00', '2026-10-23 07:23:17.370585+00', 0, 85000, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-83ee-776b-87e8-8a8dcbad02e4'),
	('01a167a4-8419-7a58-8496-333ecc464799', '2026-10-23 07:23:17.401211+00', '2026-10-23 07:23:17.401222+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8415-71e0-b628-2cd5986899b9'),
	('01a167a4-8423-7484-a0f2-2a46d87cf9f3', '2026-10-23 07:23:17.41134+00', '2026-10-23 07:23:17.411348+00', 0, 85000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8415-71e0-b628-2cd5986899b9'),
	('01a167a4-843b-700b-8c8f-2dba32ab20b6', '2026-10-23 07:23:17.435427+00', '2026-10-23 07:23:17.435437+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8437-721e-a6fc-fa85b302917f'),
	('01a167a4-8442-7fa5-b28b-7b0b7a7c7ea7', '2026-10-23 07:23:17.442876+00', '2026-10-23 07:23:17.442886+00', 0, 115000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8437-721e-a6fc-fa85b302917f'),
	('01a167a4-845b-71f3-b0aa-35317b083ff2', '2026-10-23 07:23:17.46786+00', '2026-10-23 07:23:17.46788+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8456-7ba9-8620-12f8baec72ee'),
	('01a167a4-8464-7b39-896d-3c61bfd49d1c', '2026-10-23 07:23:17.476897+00', '2026-10-23 07:23:17.476919+00', 0, 130000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8456-7ba9-8620-12f8baec72ee'),
	('01a167a4-8484-7acc-9873-5d44f440a1eb', '2026-10-23 07:23:17.509128+00', '2026-10-23 07:23:17.509141+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8481-758b-ba85-17a8e630f64b'),
	('01a167a4-8489-7b01-a206-1cac64cd82b1', '2026-10-23 07:23:17.513173+00', '2026-10-23 07:23:17.513183+00', 0, 145000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8481-758b-ba85-17a8e630f64b'),
	('01a167a4-849b-71c2-990f-9161e6e0ad44', '2026-10-23 07:23:17.531969+00', '2026-10-23 07:23:17.53198+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8496-7226-9cba-2798a5b1bf70'),
	('01a167a4-849f-7732-8b69-eedfd9bef5cc', '2026-10-23 07:23:17.535148+00', '2026-10-23 07:23:17.535158+00', 0, 25000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8496-7226-9cba-2798a5b1bf70'),
	('01a167a4-84ed-7215-9f30-a4af3a6630aa', '2026-10-23 07:23:17.614093+00', '2026-10-23 07:23:17.614105+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-84b6-758f-81e3-a6c7ced03cfc'),
	('01a167a4-84f1-72d7-bfde-a88e6d23347b', '2026-10-23 07:23:17.617251+00', '2026-10-23 07:23:17.617265+00', 0, 55000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-84b6-758f-81e3-a6c7ced03cfc'),
	('01a167a4-84fe-70df-a566-a2a86fe71762', '2026-10-23 07:23:17.631004+00', '2026-10-23 07:23:17.631011+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-84fc-7e9f-9e16-4ff1665ac30e'),
	('01a167a4-8501-7a2b-9d60-6b92c5cd3d8d', '2026-10-23 07:23:17.6338+00', '2026-10-23 07:23:17.633808+00', 0, 70000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-84fc-7e9f-9e16-4ff1665ac30e'),
	('01a167a4-8510-7a09-885e-4b3cfbd8a79c', '2026-10-23 07:23:17.648139+00', '2026-10-23 07:23:17.648148+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-850d-749b-a502-d823e5ac145b'),
	('01a167a4-8514-767c-aa8f-836a42620f40', '2026-10-23 07:23:17.653064+00', '2026-10-23 07:23:17.653085+00', 0, 85000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-850d-749b-a502-d823e5ac145b'),
	('01a167a4-8524-7b57-ab50-de706dff06c5', '2026-10-23 07:23:17.668992+00', '2026-10-23 07:23:17.669+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8522-7c0a-8351-7fbfcfd53b15'),
	('01a167a4-8527-79b2-8c59-7cf93dba44da', '2026-10-23 07:23:17.671937+00', '2026-10-23 07:23:17.671944+00', 0, 100000, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-8522-7c0a-8351-7fbfcfd53b15'),
	('01a167a4-8535-7bff-8562-b30ac20d3c32', '2026-10-23 07:23:17.685298+00', '2026-10-23 07:23:17.685307+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8533-70be-8400-6939a5c75a98'),
	('01a167a4-8539-721c-82bb-1a35964cd8d4', '2026-10-23 07:23:17.689717+00', '2026-10-23 07:23:17.689724+00', 0, 100000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-8533-70be-8400-6939a5c75a98'),
	('01a167a4-8548-74b1-b1ec-0119e44c5b66', '2026-10-23 07:23:17.704528+00', '2026-10-23 07:23:17.704534+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8546-7e6e-9c9c-822c93c661f8'),
	('01a167a4-854a-73e1-a7e9-d662ba89ed65', '2026-10-23 07:23:17.706741+00', '2026-10-23 07:23:17.706748+00', 0, 130000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-8546-7e6e-9c9c-822c93c661f8'),
	('01a167a4-8555-7204-9c55-e2663b29c9b7', '2026-10-23 07:23:17.717464+00', '2026-10-23 07:23:17.717472+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8553-7efb-a3c7-ffc800924e8e'),
	('01a167a4-8557-79e1-b395-1676beb042fe', '2026-10-23 07:23:17.719817+00', '2026-10-23 07:23:17.719824+00', 0, 145000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-8553-7efb-a3c7-ffc800924e8e'),
	('01a167a4-8564-7a7d-ad15-d969339bb85d', '2026-10-23 07:23:17.7324+00', '2026-10-23 07:23:17.732409+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8561-72a6-a1e4-9be3091555ae'),
	('01a167a4-8567-750c-b284-2b252f602aeb', '2026-10-23 07:23:17.735781+00', '2026-10-23 07:23:17.73579+00', 0, 25000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-8561-72a6-a1e4-9be3091555ae'),
	('01a167a4-8571-7251-a9fc-a0994b7b1867', '2026-10-23 07:23:17.745547+00', '2026-10-23 07:23:17.745554+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-856f-7e01-a482-46aab605498a'),
	('01a167a4-8573-7bde-bab5-b51eebaebd99', '2026-10-23 07:23:17.748024+00', '2026-10-23 07:23:17.748033+00', 0, 40000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-856f-7e01-a482-46aab605498a'),
	('01a167a4-8580-7fe2-a023-af7951cb1b66', '2026-10-23 07:23:17.76065+00', '2026-10-23 07:23:17.760657+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-857e-7d5c-a11d-4db9bfbc6a09'),
	('01a167a4-8582-7eae-bf77-0b0bc6fb7fda', '2026-10-23 07:23:17.763092+00', '2026-10-23 07:23:17.763098+00', 0, 70000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-857e-7d5c-a11d-4db9bfbc6a09'),
	('01a167a4-858e-7302-81d7-0736b447756e', '2026-10-23 07:23:17.774185+00', '2026-10-23 07:23:17.774192+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-858c-7e30-abbf-3d5b8054ed33'),
	('01a167a4-8590-7b05-8c39-5f8e280867a6', '2026-10-23 07:23:17.776517+00', '2026-10-23 07:23:17.776524+00', 0, 85000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-858c-7e30-abbf-3d5b8054ed33'),
	('01a167a4-859b-74ad-9eca-fb18e47712b4', '2026-10-23 07:23:17.787247+00', '2026-10-23 07:23:17.787254+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8599-78fb-845b-087d56d13d6d'),
	('01a167a4-859d-7dfc-bc11-6524eaedf48f', '2026-10-23 07:23:17.789493+00', '2026-10-23 07:23:17.7895+00', 0, 100000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-8599-78fb-845b-087d56d13d6d'),
	('01a167a4-85a7-70c8-82dc-400572daaf3f', '2026-10-23 07:23:17.79981+00', '2026-10-23 07:23:17.799818+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85a5-7b91-a5b9-b7e403c5a7db'),
	('01a167a4-85aa-79f7-8ed3-03034ce8cdce', '2026-10-23 07:23:17.802435+00', '2026-10-23 07:23:17.802442+00', 0, 115000, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-85a5-7b91-a5b9-b7e403c5a7db'),
	('01a167a4-85b8-744a-8f3d-30e9001e1ef1', '2026-10-23 07:23:17.816883+00', '2026-10-23 07:23:17.816889+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85b6-7f35-a0a7-53fb1691eea3'),
	('01a167a4-85bc-7525-8cb5-6782ea9ad21d', '2026-10-23 07:23:17.820955+00', '2026-10-23 07:23:17.820962+00', 0, 115000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-85b6-7f35-a0a7-53fb1691eea3'),
	('01a167a4-85c8-79b0-9b85-8b44d8374fd1', '2026-10-23 07:23:17.833008+00', '2026-10-23 07:23:17.833016+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85c6-75f2-9445-60c4686fe64b'),
	('01a167a4-85cb-7e4b-8a22-d3ef924bf587', '2026-10-23 07:23:17.835988+00', '2026-10-23 07:23:17.835996+00', 0, 145000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-85c6-75f2-9445-60c4686fe64b'),
	('01a167a4-85dc-7b72-9b2d-c3617f789677', '2026-10-23 07:23:17.852301+00', '2026-10-23 07:23:17.852309+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85d9-7a88-8fcd-a88bbf2b7693'),
	('01a167a4-85de-7a55-98e7-27cb9ec42609', '2026-10-23 07:23:17.855004+00', '2026-10-23 07:23:17.855011+00', 0, 25000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-85d9-7a88-8fcd-a88bbf2b7693'),
	('01a167a4-85ea-79a7-81d8-3e42dc4d8748', '2026-10-23 07:23:17.866546+00', '2026-10-23 07:23:17.866555+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85e8-736d-bc0c-614d8a9f539c'),
	('01a167a4-85ed-7c62-aa52-c38307defca2', '2026-10-23 07:23:17.869935+00', '2026-10-23 07:23:17.869944+00', 0, 40000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-85e8-736d-bc0c-614d8a9f539c'),
	('01a167a4-8601-78da-9a3e-26d36550bb89', '2026-10-23 07:23:17.889962+00', '2026-10-23 07:23:17.889973+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-85fb-7c19-aa04-14919baeb503'),
	('01a167a4-8605-7abb-8cf8-16adca4a5563', '2026-10-23 07:23:17.893865+00', '2026-10-23 07:23:17.893875+00', 0, 55000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-85fb-7c19-aa04-14919baeb503'),
	('01a167a4-8614-78f9-84e7-de7bade6c7ff', '2026-10-23 07:23:17.909113+00', '2026-10-23 07:23:17.909122+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8612-7155-8f19-49bbe5f07a05'),
	('01a167a4-8618-76c1-9393-2888b8013718', '2026-10-23 07:23:17.91267+00', '2026-10-23 07:23:17.912678+00', 0, 85000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-8612-7155-8f19-49bbe5f07a05'),
	('01a167a4-8623-7040-89dc-358482342ffe', '2026-10-23 07:23:17.923673+00', '2026-10-23 07:23:17.923682+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8621-73d3-bd76-230a98986194'),
	('01a167a4-8626-7f73-85b0-5c4f92cb2ebd', '2026-10-23 07:23:17.926201+00', '2026-10-23 07:23:17.926209+00', 0, 100000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-8621-73d3-bd76-230a98986194'),
	('01a167a4-8632-77d4-bac0-1e49ee3b2ecf', '2026-10-23 07:23:17.938249+00', '2026-10-23 07:23:17.938257+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8630-767b-bc05-baf8ac617e54'),
	('01a167a4-8634-7193-9e5c-c9dd429ec4cd', '2026-10-23 07:23:17.940995+00', '2026-10-23 07:23:17.941003+00', 0, 115000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-8630-767b-bc05-baf8ac617e54'),
	('01a167a4-8640-7d0c-b1a7-c8ab0903e753', '2026-10-23 07:23:17.952567+00', '2026-10-23 07:23:17.952574+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-863e-7c48-a1da-b5a9440a97c5'),
	('01a167a4-8643-7836-90bc-fd06b30d4ae5', '2026-10-23 07:23:17.955365+00', '2026-10-23 07:23:17.955373+00', 0, 130000, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-863e-7c48-a1da-b5a9440a97c5'),
	('01a167a4-8651-74a1-b9c0-0dec36ba7d2e', '2026-10-23 07:23:17.97007+00', '2026-10-23 07:23:17.97008+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-864f-789e-9032-9cf4d1780cf8'),
	('01a167a4-8656-7b5a-b93a-eb9928e2826d', '2026-10-23 07:23:17.97475+00', '2026-10-23 07:23:17.97476+00', 0, 130000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-864f-789e-9032-9cf4d1780cf8'),
	('01a167a4-8664-7ab8-b34c-abeb27e21942', '2026-10-23 07:23:17.988535+00', '2026-10-23 07:23:17.988543+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8662-7cb5-a7e6-83b7001f7623'),
	('01a167a4-8667-746a-82b1-968ef9de0f8e', '2026-10-23 07:23:17.99146+00', '2026-10-23 07:23:17.991468+00', 0, 25000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-8662-7cb5-a7e6-83b7001f7623'),
	('01a167a4-8673-7bf2-abe3-9a58983dd347', '2026-10-23 07:23:18.003132+00', '2026-10-23 07:23:18.00314+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8671-754b-8d4f-12246984385f'),
	('01a167a4-8675-74f4-8060-50a4aade3a97', '2026-10-23 07:23:18.005989+00', '2026-10-23 07:23:18.006+00', 0, 40000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-8671-754b-8d4f-12246984385f'),
	('01a167a4-8680-778d-a9a9-e148c4698836', '2026-10-23 07:23:18.016794+00', '2026-10-23 07:23:18.016801+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-867e-7a13-a5a6-c08c06f8b615'),
	('01a167a4-8683-7875-8cab-1d31df425cd7', '2026-10-23 07:23:18.019365+00', '2026-10-23 07:23:18.019372+00', 0, 55000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-867e-7a13-a5a6-c08c06f8b615'),
	('01a167a4-868e-7254-a571-78c041f19ce2', '2026-10-23 07:23:18.031003+00', '2026-10-23 07:23:18.031011+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-868c-7b2e-a3f1-0f06a81b8c7c'),
	('01a167a4-8691-7815-b0de-ac02ea5832ac', '2026-10-23 07:23:18.033852+00', '2026-10-23 07:23:18.033859+00', 0, 70000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-868c-7b2e-a3f1-0f06a81b8c7c'),
	('01a167a4-869d-7a20-a296-835e74cce667', '2026-10-23 07:23:18.045844+00', '2026-10-23 07:23:18.045851+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-869b-78fb-b39d-7dc160c6b7cd'),
	('01a167a4-86a0-7b7b-9dd7-f007aacb7c67', '2026-10-23 07:23:18.048294+00', '2026-10-23 07:23:18.048301+00', 0, 100000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-869b-78fb-b39d-7dc160c6b7cd'),
	('01a167a4-86ab-7e94-8250-0b577787a5c6', '2026-10-23 07:23:18.060096+00', '2026-10-23 07:23:18.060103+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-86aa-7d56-92b8-1adac62b42d2'),
	('01a167a4-86ae-7a09-807f-b44c6e7ab617', '2026-10-23 07:23:18.062905+00', '2026-10-23 07:23:18.062911+00', 0, 115000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-86aa-7d56-92b8-1adac62b42d2'),
	('01a167a4-86ba-758c-a165-b735fa240eaf', '2026-10-23 07:23:18.074395+00', '2026-10-23 07:23:18.074403+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-86b8-7924-8b66-7bd8c2b9f7c8'),
	('01a167a4-86bc-7bd1-9b51-93bee79262c7', '2026-10-23 07:23:18.077039+00', '2026-10-23 07:23:18.077048+00', 0, 130000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-86b8-7924-8b66-7bd8c2b9f7c8'),
	('01a167a4-86ca-75a1-9a6b-2ee30d17eb4b', '2026-10-23 07:23:18.090413+00', '2026-10-23 07:23:18.090421+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-86c6-7d0a-8b1d-b09803d98718'),
	('01a167a4-86cc-7537-b7f9-e2bb856bcd3f', '2026-10-23 07:23:18.092991+00', '2026-10-23 07:23:18.093+00', 0, 145000, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-86c6-7d0a-8b1d-b09803d98718'),
	('01a167a4-86dc-7c80-841a-dd14712460bb', '2026-10-23 07:23:18.108377+00', '2026-10-23 07:23:18.108389+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-86d8-71f2-855b-9aea0a836bfb'),
	('01a167a4-86e3-7ebc-a206-0d05c8ea9b34', '2026-10-23 07:23:18.115311+00', '2026-10-23 07:23:18.115322+00', 0, 145000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-86d8-71f2-855b-9aea0a836bfb'),
	('01a167a4-86f4-7fea-a62d-517a78fdc94c', '2026-10-23 07:23:18.132935+00', '2026-10-23 07:23:18.132944+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-86f1-72f8-a47c-825df60f98d3'),
	('01a167a4-86f9-72c1-a4c3-94810cafd97b', '2026-10-23 07:23:18.138138+00', '2026-10-23 07:23:18.138155+00', 0, 40000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-86f1-72f8-a47c-825df60f98d3'),
	('01a167a4-870d-770f-8e4e-21b679abd12f', '2026-10-23 07:23:18.157189+00', '2026-10-23 07:23:18.157198+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-870a-7fe8-b30d-0354adb4d127'),
	('01a167a4-8712-7968-8fe5-f7b14b428c31', '2026-10-23 07:23:18.162327+00', '2026-10-23 07:23:18.16234+00', 0, 55000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-870a-7fe8-b30d-0354adb4d127'),
	('01a167a4-8727-737a-862d-f1fd637aa30a', '2026-10-23 07:23:18.183852+00', '2026-10-23 07:23:18.183866+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8723-786a-b244-87ecde595678'),
	('01a167a4-872d-7642-a375-e830b72d6b77', '2026-10-23 07:23:18.189966+00', '2026-10-23 07:23:18.190003+00', 0, 70000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-8723-786a-b244-87ecde595678'),
	('01a167a4-8745-7e1d-baa7-682e3123bac4', '2026-10-23 07:23:18.213851+00', '2026-10-23 07:23:18.213874+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8740-772c-8dc2-d304e3bab3ba'),
	('01a167a4-874c-700e-bd34-01387c6ed873', '2026-10-23 07:23:18.221154+00', '2026-10-23 07:23:18.221168+00', 0, 85000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-8740-772c-8dc2-d304e3bab3ba'),
	('01a167a4-8768-755a-bda3-e33f57dddfa0', '2026-10-23 07:23:18.248401+00', '2026-10-23 07:23:18.248412+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8764-7ce9-a8d2-6b68f0c99f81'),
	('01a167a4-876c-718c-8af0-18da263daa3c', '2026-10-23 07:23:18.252945+00', '2026-10-23 07:23:18.252968+00', 0, 115000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-8764-7ce9-a8d2-6b68f0c99f81'),
	('01a167a4-8786-757a-b093-f211e784b163', '2026-10-23 07:23:18.27898+00', '2026-10-23 07:23:18.279001+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8780-7988-87b0-b5cab7427a95'),
	('01a167a4-878e-7ddb-9bda-551ae7f802e0', '2026-10-23 07:23:18.287119+00', '2026-10-23 07:23:18.287135+00', 0, 130000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-8780-7988-87b0-b5cab7427a95'),
	('01a167a4-87aa-7b1c-a8ef-1d463e636e5c', '2026-10-23 07:23:18.314608+00', '2026-10-23 07:23:18.314619+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-87a5-7f8a-b6dd-e07f38ab1b0b'),
	('01a167a4-87ae-72bd-9e46-d540e188913c', '2026-10-23 07:23:18.318806+00', '2026-10-23 07:23:18.318815+00', 0, 145000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-87a5-7f8a-b6dd-e07f38ab1b0b'),
	('01a167a4-87cd-7fd4-8ae0-a0381c1d27fe', '2026-10-23 07:23:18.349419+00', '2026-10-23 07:23:18.349436+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-87c8-73d7-bce4-fbb682094b1c'),
	('01a167a4-87d5-7209-8d6d-208dac85855a', '2026-10-23 07:23:18.358136+00', '2026-10-23 07:23:18.358166+00', 0, 25000, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-87c8-73d7-bce4-fbb682094b1c'),
	('01a167a4-8804-76cb-b58d-e3e4f965d8a9', '2026-10-23 07:23:18.40519+00', '2026-10-23 07:23:18.405205+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-87fd-7810-a9f1-d18e04a338a1'),
	('01a167a4-880c-7d95-8b5e-61ee9d936856', '2026-10-23 07:23:18.413051+00', '2026-10-23 07:23:18.413077+00', 0, 25000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-87fd-7810-a9f1-d18e04a338a1'),
	('01a167a4-8832-7263-8aa3-eabf55454c25', '2026-10-23 07:23:18.450908+00', '2026-10-23 07:23:18.450934+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8826-7ce2-b3be-e9572fd95c78'),
	('01a167a4-883c-740a-a325-e91e6a60be9b', '2026-10-23 07:23:18.460989+00', '2026-10-23 07:23:18.461005+00', 0, 55000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-8826-7ce2-b3be-e9572fd95c78'),
	('01a167a4-8856-7ad8-9c72-71091064d2fd', '2026-10-23 07:23:18.487142+00', '2026-10-23 07:23:18.487154+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8852-7329-a702-c1f4b6b06b03'),
	('01a167a4-8860-74cd-a8bc-d651c4ad560f', '2026-10-23 07:23:18.496599+00', '2026-10-23 07:23:18.496614+00', 0, 70000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-8852-7329-a702-c1f4b6b06b03'),
	('01a167a4-8880-71d6-a201-61880f2d7f84', '2026-10-23 07:23:18.528555+00', '2026-10-23 07:23:18.528568+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-887d-7137-ac3e-c0c92fe814e7'),
	('01a167a4-8884-7818-9709-941058274d5e', '2026-10-23 07:23:18.53283+00', '2026-10-23 07:23:18.532843+00', 0, 85000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-887d-7137-ac3e-c0c92fe814e7'),
	('01a167a4-88a3-715a-9531-35889e583308', '2026-10-23 07:23:18.564319+00', '2026-10-23 07:23:18.564348+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8896-758d-94ca-80d2da46a020'),
	('01a167a4-88ab-7499-8dad-eb14dc340857', '2026-10-23 07:23:18.572209+00', '2026-10-23 07:23:18.572232+00', 0, 100000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-8896-758d-94ca-80d2da46a020'),
	('01a167a4-88d5-7594-8300-ba4403ec2af5', '2026-10-23 07:23:18.614171+00', '2026-10-23 07:23:18.614186+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-88d0-7280-b1c0-5d0f5c4ca244'),
	('01a167a4-88dd-730d-95ef-833736f5f3e4', '2026-10-23 07:23:18.621824+00', '2026-10-23 07:23:18.621849+00', 0, 130000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-88d0-7280-b1c0-5d0f5c4ca244'),
	('01a167a4-890b-782c-bd9b-29f1e8a1907b', '2026-10-23 07:23:18.667868+00', '2026-10-23 07:23:18.667884+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8905-7f99-bfae-880422574ddb'),
	('01a167a4-8917-757e-bfbc-7f0808337c89', '2026-10-23 07:23:18.679881+00', '2026-10-23 07:23:18.679914+00', 0, 145000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-8905-7f99-bfae-880422574ddb'),
	('01a167a4-892f-778c-b5d1-f298878fd235', '2026-10-23 07:23:18.704357+00', '2026-10-23 07:23:18.70442+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-892b-701a-a0f1-723e41be3d48'),
	('01a167a4-8936-7a30-a11c-b33d38f35d55', '2026-10-23 07:23:18.710897+00', '2026-10-23 07:23:18.710917+00', 0, 25000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-892b-701a-a0f1-723e41be3d48'),
	('01a167a4-8958-7932-bbb3-b956d9082062', '2026-10-23 07:23:18.745125+00', '2026-10-23 07:23:18.74514+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8954-7e95-949b-824c3b86656e'),
	('01a167a4-895d-799c-9c96-5637c7398e56', '2026-10-23 07:23:18.749524+00', '2026-10-23 07:23:18.749536+00', 0, 40000, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-8954-7e95-949b-824c3b86656e'),
	('01a167a4-8975-79ee-9e68-2d6d876e12f5', '2026-10-23 07:23:18.773411+00', '2026-10-23 07:23:18.773425+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8971-7d82-bf35-159ffaa508c7'),
	('01a167a4-897c-7800-b32f-0619866f1379', '2026-10-23 07:23:18.780827+00', '2026-10-23 07:23:18.78084+00', 0, 40000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-8971-7d82-bf35-159ffaa508c7'),
	('01a167a4-898f-7df6-9036-89368883f3f5', '2026-10-23 07:23:18.80015+00', '2026-10-23 07:23:18.800161+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-898c-775b-b142-f1cd53b4506c'),
	('01a167a4-8993-7776-a22f-9abf9a292b58', '2026-10-23 07:23:18.804104+00', '2026-10-23 07:23:18.804114+00', 0, 70000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-898c-775b-b142-f1cd53b4506c'),
	('01a167a4-89a4-7999-931f-732a3678badc', '2026-10-23 07:23:18.820237+00', '2026-10-23 07:23:18.820246+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-89a1-7ff2-bcd7-66c2dfa28bc2'),
	('01a167a4-89a8-7546-b076-98c07e35461d', '2026-10-23 07:23:18.824197+00', '2026-10-23 07:23:18.824207+00', 0, 85000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-89a1-7ff2-bcd7-66c2dfa28bc2'),
	('01a167a4-89be-7909-97f5-9d1590f1f54c', '2026-10-23 07:23:18.846714+00', '2026-10-23 07:23:18.846726+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-89bb-71b0-8682-b92429b746f9'),
	('01a167a4-89c2-7a47-87c1-781968a89b58', '2026-10-23 07:23:18.850694+00', '2026-10-23 07:23:18.850705+00', 0, 100000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-89bb-71b0-8682-b92429b746f9'),
	('01a167a4-89d3-7692-8e75-ee4b489185be', '2026-10-23 07:23:18.867625+00', '2026-10-23 07:23:18.867638+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-89cf-70ab-a143-36acf3f15348'),
	('01a167a4-89d7-7d6c-866d-fb92620dd27e', '2026-10-23 07:23:18.871431+00', '2026-10-23 07:23:18.871442+00', 0, 115000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-89cf-70ab-a143-36acf3f15348'),
	('01a167a4-89ef-7a26-aefe-9d60b84346c5', '2026-10-23 07:23:18.895198+00', '2026-10-23 07:23:18.895208+00', 145000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-89eb-7918-835b-a7c4bb292296'),
	('01a167a4-89f3-7110-88fe-5a4747c39fc2', '2026-10-23 07:23:18.899843+00', '2026-10-23 07:23:18.899857+00', 0, 145000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-89eb-7918-835b-a7c4bb292296'),
	('01a167a4-8a14-70c1-9258-9156f666b5ae', '2026-10-23 07:23:18.932661+00', '2026-10-23 07:23:18.93268+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8a10-7e89-afe0-fb311d96ca1d'),
	('01a167a4-8a1b-7b1c-ac7b-c21eb30ca092', '2026-10-23 07:23:18.939687+00', '2026-10-23 07:23:18.939705+00', 0, 25000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-8a10-7e89-afe0-fb311d96ca1d'),
	('01a167a4-8a3d-71c1-9d9f-fd55cdc99f7e', '2026-10-23 07:23:18.973297+00', '2026-10-23 07:23:18.973314+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8a37-7611-9bf1-c1d9009e900c'),
	('01a167a4-8a41-7fd8-a4ad-5b7eba7727e1', '2026-10-23 07:23:18.978164+00', '2026-10-23 07:23:18.978177+00', 0, 40000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-8a37-7611-9bf1-c1d9009e900c'),
	('01a167a4-8a5b-7aec-8aef-4d1d270c55de', '2026-10-23 07:23:19.003548+00', '2026-10-23 07:23:19.003569+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8a56-71f7-8867-135de27f4214'),
	('01a167a4-8a61-72ff-a275-c1ef18aea855', '2026-10-23 07:23:19.009455+00', '2026-10-23 07:23:19.009475+00', 0, 55000, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-8a56-71f7-8867-135de27f4214'),
	('01a167a4-8a74-709a-a167-56321e56fad0', '2026-10-23 07:23:19.029041+00', '2026-10-23 07:23:19.02905+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8a72-7dcb-9818-b3cc94678a6a'),
	('01a167a4-8a7c-74de-852d-b834a47c6d43', '2026-10-23 07:23:19.036841+00', '2026-10-23 07:23:19.036853+00', 0, 55000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8a72-7dcb-9818-b3cc94678a6a'),
	('01a167a4-8a92-72c8-85f7-85683b33c3c7', '2026-10-23 07:23:19.05844+00', '2026-10-23 07:23:19.058451+00', 85000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8a8e-7b5d-ab91-4c16c43654d9'),
	('01a167a4-8a96-7a4b-8f70-3da221a72447', '2026-10-23 07:23:19.062765+00', '2026-10-23 07:23:19.062776+00', 0, 85000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8a8e-7b5d-ab91-4c16c43654d9'),
	('01a167a4-8ab1-7190-9186-3c98c3786970', '2026-10-23 07:23:19.09+00', '2026-10-23 07:23:19.090011+00', 100000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8aae-7f55-afef-a81cb276f0a8'),
	('01a167a4-8ab9-748e-a943-dc82fc52019e', '2026-10-23 07:23:19.097538+00', '2026-10-23 07:23:19.097551+00', 0, 100000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8aae-7f55-afef-a81cb276f0a8'),
	('01a167a4-8acf-76e1-96f7-c8e1b3cb60c1', '2026-10-23 07:23:19.120031+00', '2026-10-23 07:23:19.120045+00', 115000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8acc-7ae5-937c-f5e7830306c3'),
	('01a167a4-8ad3-78f2-9f32-84c6b939d5b3', '2026-10-23 07:23:19.123454+00', '2026-10-23 07:23:19.123469+00', 0, 115000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8acc-7ae5-937c-f5e7830306c3'),
	('01a167a4-8aec-7753-9288-884cb3b6c3ff', '2026-10-23 07:23:19.148931+00', '2026-10-23 07:23:19.148952+00', 130000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8ae7-7217-bcc9-7547e1812ae9'),
	('01a167a4-8af3-7fb2-b05c-bc6f93cf9738', '2026-10-23 07:23:19.155697+00', '2026-10-23 07:23:19.155721+00', 0, 130000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8ae7-7217-bcc9-7547e1812ae9'),
	('01a167a4-8b10-793f-acc9-12e14f73b3bf', '2026-10-23 07:23:19.185063+00', '2026-10-23 07:23:19.185083+00', 25000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8b0b-7925-b6b8-ea03d455101c'),
	('01a167a4-8b16-73d0-9fdb-5369cb551a81', '2026-10-23 07:23:19.191235+00', '2026-10-23 07:23:19.191254+00', 0, 25000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8b0b-7925-b6b8-ea03d455101c'),
	('01a167a4-8b2f-7093-959d-721ee9ffcf1b', '2026-10-23 07:23:19.215806+00', '2026-10-23 07:23:19.215818+00', 40000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8b29-794f-bac0-c300446e37b4'),
	('01a167a4-8b33-7c4c-b535-3dee1daa7334', '2026-10-23 07:23:19.219682+00', '2026-10-23 07:23:19.219696+00', 0, 40000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8b29-794f-bac0-c300446e37b4'),
	('01a167a4-8b4e-7600-8e63-593aaeda1fac', '2026-10-23 07:23:19.246775+00', '2026-10-23 07:23:19.246787+00', 55000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8b4a-75e2-be55-ab2042dd4333'),
	('01a167a4-8b55-714a-819b-bb003a38ce72', '2026-10-23 07:23:19.25332+00', '2026-10-23 07:23:19.253333+00', 0, 55000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8b4a-75e2-be55-ab2042dd4333'),
	('01a167a4-8b73-71bf-aba2-95b242a8872f', '2026-10-23 07:23:19.283658+00', '2026-10-23 07:23:19.283691+00', 70000, 0, '01a167a4-8160-7524-a710-cb14effe1d7c', '01a167a4-8b68-7731-b7d0-77a0c612d806'),
	('01a167a4-8b79-77f3-b54c-c16a263bc99d', '2026-10-23 07:23:19.29053+00', '2026-10-23 07:23:19.291215+00', 0, 70000, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-8b68-7731-b7d0-77a0c612d806');
INSERT INTO public.finance_ledgerentry VALUES
	('01a167a4-8bf9-73b6-9028-4b9cac3dfddb', '2026-10-23 07:23:19.342122+00', '2026-10-23 07:23:19.342135+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8bf8-79fd-b943-a0a77190739b'),
	('01a167a4-8bfb-7489-9505-c747b43769f8', '2026-10-23 07:23:19.349874+00', '2026-10-23 07:23:19.349888+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8bf8-79fd-b943-a0a77190739b'),
	('01a167a4-8bfe-7334-9839-71cc0f76af9e', '2026-10-23 07:23:19.367896+00', '2026-10-23 07:23:19.367908+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8bfd-7ea0-92a0-3402f0fc4ba6'),
	('01a167a4-8c00-7e64-b44f-07b0c5ae60b4', '2026-10-23 07:23:19.380946+00', '2026-10-23 07:23:19.380979+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8bfd-7ea0-92a0-3402f0fc4ba6'),
	('01a167a4-8c02-749e-b77a-6c58153ba447', '2026-10-23 07:23:19.407356+00', '2026-10-23 07:23:19.407392+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8bfd-7ea0-92a0-3402f0fc4ba6'),
	('01a167a4-8c0e-75a3-b814-a8e0229df3bd', '2026-10-23 07:23:19.439361+00', '2026-10-23 07:23:19.439389+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8c07-76da-99d2-38c99ce26774'),
	('01a167a4-8c15-72b6-b820-de3a3d73c62d', '2026-10-23 07:23:19.446069+00', '2026-10-23 07:23:19.446085+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8c07-76da-99d2-38c99ce26774'),
	('01a167a4-8c2f-723e-856b-13e6e243d85a', '2026-10-23 07:23:19.472077+00', '2026-10-23 07:23:19.472095+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8c2a-7f15-8a74-310128b2fde9'),
	('01a167a4-8c38-7fcb-91ab-fd729f4c3129', '2026-10-23 07:23:19.481142+00', '2026-10-23 07:23:19.481161+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8c2a-7f15-8a74-310128b2fde9'),
	('01a167a4-8c3e-7483-8c30-925b2f1ca6cb', '2026-10-23 07:23:19.486346+00', '2026-10-23 07:23:19.48636+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8c2a-7f15-8a74-310128b2fde9'),
	('01a167a4-8c5e-7674-ad03-1a9722cf9829', '2026-10-23 07:23:19.518563+00', '2026-10-23 07:23:19.518579+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8c59-77b6-8cf0-301629c72e08'),
	('01a167a4-8c63-77ca-991d-9b1778c3d2d8', '2026-10-23 07:23:19.523931+00', '2026-10-23 07:23:19.523945+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8c59-77b6-8cf0-301629c72e08'),
	('01a167a4-8c83-7999-8f2b-58b79e62677e', '2026-10-23 07:23:19.555496+00', '2026-10-23 07:23:19.555513+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8c7a-79fb-ac8c-a8250f8f1181'),
	('01a167a4-8c89-7fd4-a5e7-8a97f38a77ab', '2026-10-23 07:23:19.561293+00', '2026-10-23 07:23:19.561307+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8c7a-79fb-ac8c-a8250f8f1181'),
	('01a167a4-8c94-71ee-bd47-986cd74c261d', '2026-10-23 07:23:19.572507+00', '2026-10-23 07:23:19.572522+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8c7a-79fb-ac8c-a8250f8f1181'),
	('01a167a4-8cb6-760d-bc6e-7a491da1c5bc', '2026-10-23 07:23:19.606292+00', '2026-10-23 07:23:19.606306+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8cb1-763f-a6c3-52b4e6cad3cc'),
	('01a167a4-8cbe-76ce-9975-164a038cef40', '2026-10-23 07:23:19.615254+00', '2026-10-23 07:23:19.615273+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8cb1-763f-a6c3-52b4e6cad3cc'),
	('01a167a4-8cd3-75f5-9494-e547bd59fdba', '2026-10-23 07:23:19.635592+00', '2026-10-23 07:23:19.635606+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8ccf-7557-9514-45bbdc06a4ab'),
	('01a167a4-8ce2-7fd1-9176-b3020bf378f6', '2026-10-23 07:23:19.650769+00', '2026-10-23 07:23:19.65079+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8ccf-7557-9514-45bbdc06a4ab'),
	('01a167a4-8ce9-7654-b1b6-6fa0059d74f0', '2026-10-23 07:23:19.657744+00', '2026-10-23 07:23:19.657777+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8ccf-7557-9514-45bbdc06a4ab'),
	('01a167a4-8d19-7973-82c3-421d47d7f37a', '2026-10-23 07:23:19.705438+00', '2026-10-23 07:23:19.705467+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8d0f-7c5e-9d58-0b971d915d17'),
	('01a167a4-8d29-73ce-aa31-ccd2de9d53f4', '2026-10-23 07:23:19.722717+00', '2026-10-23 07:23:19.72276+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8d0f-7c5e-9d58-0b971d915d17'),
	('01a167a4-8d53-78e6-bcf3-180d68dd9d40', '2026-10-23 07:23:19.764073+00', '2026-10-23 07:23:19.764197+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8d42-70b2-8ae9-2fab33cdb173'),
	('01a167a4-8d62-70ee-8378-99b90192ed75', '2026-10-23 07:23:19.778827+00', '2026-10-23 07:23:19.778852+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8d42-70b2-8ae9-2fab33cdb173'),
	('01a167a4-8d71-7a7a-ad2e-83fe3400ceae', '2026-10-23 07:23:19.793875+00', '2026-10-23 07:23:19.793897+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8d42-70b2-8ae9-2fab33cdb173'),
	('01a167a4-8d8f-7789-ac38-8394f8de6821', '2026-10-23 07:23:19.823827+00', '2026-10-23 07:23:19.823839+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8d8b-718c-8732-7d20c0a8397d'),
	('01a167a4-8d93-7717-b925-608042fc1c21', '2026-10-23 07:23:19.828178+00', '2026-10-23 07:23:19.828189+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8d8b-718c-8732-7d20c0a8397d'),
	('01a167a4-8d9f-7c34-a175-4856bcac5701', '2026-10-23 07:23:19.840078+00', '2026-10-23 07:23:19.840086+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8d9d-7b60-836d-d49eec0d25f8'),
	('01a167a4-8da2-7d2f-a0f6-7781b6ff1572', '2026-10-23 07:23:19.842954+00', '2026-10-23 07:23:19.842965+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8d9d-7b60-836d-d49eec0d25f8'),
	('01a167a4-8da5-788b-a089-fa636f97d481', '2026-10-23 07:23:19.845995+00', '2026-10-23 07:23:19.846004+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8d9d-7b60-836d-d49eec0d25f8'),
	('01a167a4-8db2-7e1b-a0e7-6c0ded375351', '2026-10-23 07:23:19.858235+00', '2026-10-23 07:23:19.858244+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8daf-7088-b08d-64414ebce534'),
	('01a167a4-8db4-7390-965f-16cb519f0999', '2026-10-23 07:23:19.861113+00', '2026-10-23 07:23:19.861124+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8daf-7088-b08d-64414ebce534'),
	('01a167a4-8dbe-793d-a142-48a53cff9417', '2026-10-23 07:23:19.871099+00', '2026-10-23 07:23:19.871112+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8dbc-746d-bd64-e8a36f11c60d'),
	('01a167a4-8dc2-793d-bada-65930cd1d4da', '2026-10-23 07:23:19.874181+00', '2026-10-23 07:23:19.874189+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8dbc-746d-bd64-e8a36f11c60d'),
	('01a167a4-8dc5-7e52-9f49-98a1dab81aaf', '2026-10-23 07:23:19.877184+00', '2026-10-23 07:23:19.877193+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8dbc-746d-bd64-e8a36f11c60d'),
	('01a167a4-8dd2-7a54-97b9-3b18c2ec3593', '2026-10-23 07:23:19.890788+00', '2026-10-23 07:23:19.890799+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8dcf-712f-a024-de5015fafd95'),
	('01a167a4-8dd6-73bc-8ac0-71b53ead6339', '2026-10-23 07:23:19.894191+00', '2026-10-23 07:23:19.894202+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8dcf-712f-a024-de5015fafd95'),
	('01a167a4-8de3-726a-8495-9cb02652e343', '2026-10-23 07:23:19.90783+00', '2026-10-23 07:23:19.90784+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8de0-79b9-9ad1-55cc747fadc9'),
	('01a167a4-8de9-7fe6-98e9-9209a8ec9f62', '2026-10-23 07:23:19.913347+00', '2026-10-23 07:23:19.91336+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8de0-79b9-9ad1-55cc747fadc9'),
	('01a167a4-8ded-79d5-9b28-8f2c96ebfc9e', '2026-10-23 07:23:19.918147+00', '2026-10-23 07:23:19.918159+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8de0-79b9-9ad1-55cc747fadc9'),
	('01a167a4-8dfc-7a2c-8c12-a2184c92826c', '2026-10-23 07:23:19.933083+00', '2026-10-23 07:23:19.933094+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8df9-7d6f-9471-39dc4a2ced3e'),
	('01a167a4-8e00-7b56-b61b-3000ac38a5f2', '2026-10-23 07:23:19.936554+00', '2026-10-23 07:23:19.936564+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8df9-7d6f-9471-39dc4a2ced3e'),
	('01a167a4-8e0c-711e-afd0-2ea6bc27e15e', '2026-10-23 07:23:19.948894+00', '2026-10-23 07:23:19.948904+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e09-748d-8e2c-cf0e61eb3c68'),
	('01a167a4-8e10-7553-9215-c7fd88eada69', '2026-10-23 07:23:19.952509+00', '2026-10-23 07:23:19.95252+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8e09-748d-8e2c-cf0e61eb3c68'),
	('01a167a4-8e13-7621-8d34-27540d0f2f22', '2026-10-23 07:23:19.956129+00', '2026-10-23 07:23:19.956142+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8e09-748d-8e2c-cf0e61eb3c68'),
	('01a167a4-8e21-7952-b57a-858763a1f21d', '2026-10-23 07:23:19.969569+00', '2026-10-23 07:23:19.96958+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8e1e-758f-b56c-de3c7723bb3b'),
	('01a167a4-8e25-74c3-9b94-5371297e63cc', '2026-10-23 07:23:19.9732+00', '2026-10-23 07:23:19.973213+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e1e-758f-b56c-de3c7723bb3b'),
	('01a167a4-8e30-7445-84af-ca7eee57619e', '2026-10-23 07:23:19.985142+00', '2026-10-23 07:23:19.985152+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e2e-7f7a-805f-dc1ea907f5bf'),
	('01a167a4-8e34-78f0-be3e-d831ceacde1f', '2026-10-23 07:23:19.989117+00', '2026-10-23 07:23:19.989129+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8e2e-7f7a-805f-dc1ea907f5bf'),
	('01a167a4-8e39-74f9-acb9-8be03d6a063c', '2026-10-23 07:23:19.993375+00', '2026-10-23 07:23:19.993388+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8e2e-7f7a-805f-dc1ea907f5bf'),
	('01a167a4-8e48-7592-acb9-6c0b18f2982b', '2026-10-23 07:23:20.008945+00', '2026-10-23 07:23:20.008957+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8e45-74be-ac31-fe2eaaa78697'),
	('01a167a4-8e4c-7681-b755-98af3c3aa820', '2026-10-23 07:23:20.012897+00', '2026-10-23 07:23:20.012908+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e45-74be-ac31-fe2eaaa78697'),
	('01a167a4-8e5b-706c-9323-a17290bece81', '2026-10-23 07:23:20.027306+00', '2026-10-23 07:23:20.027318+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e57-7e7d-812a-6dcbe4a3435e'),
	('01a167a4-8e60-7682-b11e-f39e7e590c8a', '2026-10-23 07:23:20.032641+00', '2026-10-23 07:23:20.032659+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8e57-7e7d-812a-6dcbe4a3435e'),
	('01a167a4-8e65-7fc9-bbe4-8e683ce97d30', '2026-10-23 07:23:20.038+00', '2026-10-23 07:23:20.038015+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8e57-7e7d-812a-6dcbe4a3435e'),
	('01a167a4-8e7a-7dff-9c21-4b8cad2a995c', '2026-10-23 07:23:20.059116+00', '2026-10-23 07:23:20.059132+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8e75-7411-94fa-fb0be197104e'),
	('01a167a4-8e80-773f-8c0d-c5247101dff5', '2026-10-23 07:23:20.064702+00', '2026-10-23 07:23:20.064718+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e75-7411-94fa-fb0be197104e'),
	('01a167a4-8e92-7636-8389-000035c48588', '2026-10-23 07:23:20.082671+00', '2026-10-23 07:23:20.082685+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8e8e-71a3-8117-17f6284636f9'),
	('01a167a4-8e98-7270-8efb-4d4c8a007e4a', '2026-10-23 07:23:20.088539+00', '2026-10-23 07:23:20.088555+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8e8e-71a3-8117-17f6284636f9'),
	('01a167a4-8e9d-7e9e-8746-abe78b6c85c5', '2026-10-23 07:23:20.093759+00', '2026-10-23 07:23:20.093774+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8e8e-71a3-8117-17f6284636f9'),
	('01a167a4-8eb3-7f72-8cab-1414e5ff0b1b', '2026-10-23 07:23:20.116019+00', '2026-10-23 07:23:20.116035+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8eae-73ff-8fe5-8496e6802539'),
	('01a167a4-8eb9-740b-8b73-f1396fb9620d', '2026-10-23 07:23:20.122002+00', '2026-10-23 07:23:20.122016+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8eae-73ff-8fe5-8496e6802539'),
	('01a167a4-8ecd-755a-94ba-74d22b13c8fb', '2026-10-23 07:23:20.141387+00', '2026-10-23 07:23:20.141399+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8ec8-7e84-ba71-1cbf618296c1'),
	('01a167a4-8ed2-7ae8-8bfe-8665ea64c52c', '2026-10-23 07:23:20.146671+00', '2026-10-23 07:23:20.146681+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8ec8-7e84-ba71-1cbf618296c1'),
	('01a167a4-8ed7-7df5-852e-261d7a354bbd', '2026-10-23 07:23:20.15166+00', '2026-10-23 07:23:20.151669+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8ec8-7e84-ba71-1cbf618296c1'),
	('01a167a4-8ee9-779e-a44d-7e10b7bea43b', '2026-10-23 07:23:20.169293+00', '2026-10-23 07:23:20.1693+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8ee6-77c4-8d95-2e0063f1f73a'),
	('01a167a4-8eec-7068-b1c0-1de67b1c82e9', '2026-10-23 07:23:20.172738+00', '2026-10-23 07:23:20.172746+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8ee6-77c4-8d95-2e0063f1f73a'),
	('01a167a4-8ef7-7a78-8c77-cebba634a3bb', '2026-10-23 07:23:20.183682+00', '2026-10-23 07:23:20.18369+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8ef5-7ced-b7b0-e9b4cc275b11'),
	('01a167a4-8efa-7b0e-8e76-589639484784', '2026-10-23 07:23:20.186758+00', '2026-10-23 07:23:20.186767+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8ef5-7ced-b7b0-e9b4cc275b11'),
	('01a167a4-8efe-72aa-956c-33d70c9ab325', '2026-10-23 07:23:20.190125+00', '2026-10-23 07:23:20.190133+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8ef5-7ced-b7b0-e9b4cc275b11'),
	('01a167a4-8f09-7a8b-974c-673c9f454f5a', '2026-10-23 07:23:20.201501+00', '2026-10-23 07:23:20.201511+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8f07-74d7-8fb6-73469a3e5b1e'),
	('01a167a4-8f0c-72dc-b83d-c4272c92d15f', '2026-10-23 07:23:20.204419+00', '2026-10-23 07:23:20.204428+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f07-74d7-8fb6-73469a3e5b1e'),
	('01a167a4-8f15-7eb4-a16a-a9a08428f654', '2026-10-23 07:23:20.213873+00', '2026-10-23 07:23:20.21388+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f13-75f2-8e31-d448c0f8036e'),
	('01a167a4-8f18-78d2-8a86-ae8d722a14d2', '2026-10-23 07:23:20.216681+00', '2026-10-23 07:23:20.21669+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8f13-75f2-8e31-d448c0f8036e'),
	('01a167a4-8f1b-7631-98ca-37c55ff51e20', '2026-10-23 07:23:20.219629+00', '2026-10-23 07:23:20.219638+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8f13-75f2-8e31-d448c0f8036e'),
	('01a167a4-8f27-7d0f-820b-458e0d758f04', '2026-10-23 07:23:20.231235+00', '2026-10-23 07:23:20.231246+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8f24-7b68-a5d5-9741229a2a0e'),
	('01a167a4-8f2a-7754-aad9-0aeccd70fb85', '2026-10-23 07:23:20.234678+00', '2026-10-23 07:23:20.234689+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f24-7b68-a5d5-9741229a2a0e'),
	('01a167a4-8f35-7863-98b8-b41f31d4a39f', '2026-10-23 07:23:20.245504+00', '2026-10-23 07:23:20.245513+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f33-724e-81b7-d420836a81f4'),
	('01a167a4-8f38-76cb-9298-a3054dfcb06b', '2026-10-23 07:23:20.248383+00', '2026-10-23 07:23:20.248392+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8f33-724e-81b7-d420836a81f4'),
	('01a167a4-8f3b-7764-8f7d-69cd91a75ad0', '2026-10-23 07:23:20.251259+00', '2026-10-23 07:23:20.251268+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8f33-724e-81b7-d420836a81f4'),
	('01a167a4-8f47-7283-9bda-9003bbd1bad6', '2026-10-23 07:23:20.263377+00', '2026-10-23 07:23:20.263386+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8f44-78de-9f81-0d3d5c06bae8'),
	('01a167a4-8f4a-7406-b064-4eb07df6a359', '2026-10-23 07:23:20.26636+00', '2026-10-23 07:23:20.266369+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f44-78de-9f81-0d3d5c06bae8'),
	('01a167a4-8f54-77ed-bfe9-482ab3b6a778', '2026-10-23 07:23:20.276539+00', '2026-10-23 07:23:20.276548+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f51-7cb8-846c-088905cb7469'),
	('01a167a4-8f57-70f6-a89b-16116f5692c1', '2026-10-23 07:23:20.27979+00', '2026-10-23 07:23:20.279799+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8f51-7cb8-846c-088905cb7469'),
	('01a167a4-8f5a-7648-a8b6-1dd5994b677e', '2026-10-23 07:23:20.282996+00', '2026-10-23 07:23:20.283007+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8f51-7cb8-846c-088905cb7469'),
	('01a167a4-8f69-7ca1-bd90-90bbcc78e14e', '2026-10-23 07:23:20.297314+00', '2026-10-23 07:23:20.297323+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8f66-79c1-93ca-571f52524357'),
	('01a167a4-8f6e-7d2d-bf10-3e432d2dd1f1', '2026-10-23 07:23:20.302207+00', '2026-10-23 07:23:20.302219+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f66-79c1-93ca-571f52524357'),
	('01a167a4-8f7c-77df-96af-57e9f99eb20b', '2026-10-23 07:23:20.316612+00', '2026-10-23 07:23:20.316622+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f79-7011-8e7f-be977c563e37'),
	('01a167a4-8f81-7474-9504-e231db5558ed', '2026-10-23 07:23:20.321915+00', '2026-10-23 07:23:20.321926+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8f79-7011-8e7f-be977c563e37'),
	('01a167a4-8f86-79cc-a318-273040dcd058', '2026-10-23 07:23:20.32664+00', '2026-10-23 07:23:20.326651+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8f79-7011-8e7f-be977c563e37'),
	('01a167a4-8f95-7f69-aae1-e4b65802759f', '2026-10-23 07:23:20.34192+00', '2026-10-23 07:23:20.341931+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8f92-75ad-809a-363627c1acbc'),
	('01a167a4-8f99-7506-9fba-0013968007be', '2026-10-23 07:23:20.345627+00', '2026-10-23 07:23:20.345637+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8f92-75ad-809a-363627c1acbc'),
	('01a167a4-8faa-76d3-a29e-befb82b2b828', '2026-10-23 07:23:20.363083+00', '2026-10-23 07:23:20.363095+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8fa7-7c2d-a5e6-f91319bf55b9'),
	('01a167a4-8faf-793c-8b51-f6cf0b97fa65', '2026-10-23 07:23:20.367542+00', '2026-10-23 07:23:20.367552+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8fa7-7c2d-a5e6-f91319bf55b9'),
	('01a167a4-8fb4-7fc5-aed0-3896203e9696', '2026-10-23 07:23:20.372302+00', '2026-10-23 07:23:20.372314+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8fa7-7c2d-a5e6-f91319bf55b9'),
	('01a167a4-8fc7-7cc7-9a0c-9f8438ba5dd3', '2026-10-23 07:23:20.391344+00', '2026-10-23 07:23:20.391355+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8fc3-73ef-addb-2950f11e43fa'),
	('01a167a4-8fcb-7def-b359-ec5185cba900', '2026-10-23 07:23:20.39564+00', '2026-10-23 07:23:20.395655+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8fc3-73ef-addb-2950f11e43fa'),
	('01a167a4-8fdc-708c-b03f-6aa59e018645', '2026-10-23 07:23:20.41245+00', '2026-10-23 07:23:20.412467+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8fd7-72d3-884b-35bfe29950c7'),
	('01a167a4-8fe2-79dd-a91e-9ec3130fbf2c', '2026-10-23 07:23:20.418289+00', '2026-10-23 07:23:20.418306+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-8fd7-72d3-884b-35bfe29950c7'),
	('01a167a4-8fe7-77a3-9683-c78d591b2de3', '2026-10-23 07:23:20.423792+00', '2026-10-23 07:23:20.423808+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-8fd7-72d3-884b-35bfe29950c7'),
	('01a167a4-8ffc-7c76-a3a0-edffdf9986df', '2026-10-23 07:23:20.44485+00', '2026-10-23 07:23:20.444866+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-8ff8-70c7-b469-9f4187a641e7'),
	('01a167a4-9002-73b9-ae12-4b392403d110', '2026-10-23 07:23:20.450715+00', '2026-10-23 07:23:20.450732+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-8ff8-70c7-b469-9f4187a641e7'),
	('01a167a4-9013-7020-a3d8-70263dd55b1d', '2026-10-23 07:23:20.468043+00', '2026-10-23 07:23:20.468058+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-900f-7c95-ae90-af9860a13480'),
	('01a167a4-9019-7ba5-88b2-4f6cb95ad8f6', '2026-10-23 07:23:20.474052+00', '2026-10-23 07:23:20.474067+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-900f-7c95-ae90-af9860a13480'),
	('01a167a4-901f-701a-9347-562ca7a91418', '2026-10-23 07:23:20.479912+00', '2026-10-23 07:23:20.479926+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-900f-7c95-ae90-af9860a13480'),
	('01a167a4-9036-7004-8d90-48b8e950ad65', '2026-10-23 07:23:20.502476+00', '2026-10-23 07:23:20.502491+00', 45000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-9031-72a2-b31f-7ee64f462db6'),
	('01a167a4-903c-7425-8934-c08fee71ff9c', '2026-10-23 07:23:20.508705+00', '2026-10-23 07:23:20.508723+00', 0, 45000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-9031-72a2-b31f-7ee64f462db6'),
	('01a167a4-9053-76fe-afb2-b13d33b9fa13', '2026-10-23 07:23:20.531451+00', '2026-10-23 07:23:20.531466+00', 45000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-904d-7959-87ca-f46710d5bbc8'),
	('01a167a4-9058-7174-803a-739faef24810', '2026-10-23 07:23:20.537178+00', '2026-10-23 07:23:20.537193+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-904d-7959-87ca-f46710d5bbc8'),
	('01a167a4-905e-7689-8695-b8f141fd313d', '2026-10-23 07:23:20.542456+00', '2026-10-23 07:23:20.542471+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-904d-7959-87ca-f46710d5bbc8'),
	('01a167a4-9072-758e-a07b-32bdb9b2bbf3', '2026-10-23 07:23:20.562275+00', '2026-10-23 07:23:20.562287+00', 50000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-906e-7c4e-b425-e885eadac61d'),
	('01a167a4-9076-721c-9cce-a97753bd5d3b', '2026-10-23 07:23:20.566976+00', '2026-10-23 07:23:20.56699+00', 0, 50000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-906e-7c4e-b425-e885eadac61d'),
	('01a167a4-9094-79b3-9d16-a6aa86d1011f', '2026-10-23 07:23:20.597132+00', '2026-10-23 07:23:20.597142+00', 50000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-908d-77bc-87c5-007d39c2f9b5'),
	('01a167a4-9099-704b-bc4a-6b3421c980d6', '2026-10-23 07:23:20.601586+00', '2026-10-23 07:23:20.601598+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-908d-77bc-87c5-007d39c2f9b5'),
	('01a167a4-909f-7c99-b3fc-2b6478053ef5', '2026-10-23 07:23:20.609407+00', '2026-10-23 07:23:20.609441+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-908d-77bc-87c5-007d39c2f9b5'),
	('01a167a4-90bf-7900-8011-c93ffd5dea02', '2026-10-23 07:23:20.639466+00', '2026-10-23 07:23:20.639481+00', 55000, 0, '01a167a4-81ec-737a-9308-0f6edf495946', '01a167a4-90b8-7bd3-99b0-7424f927fb24'),
	('01a167a4-90c4-703a-8df2-cab9639dcb1a', '2026-10-23 07:23:20.644606+00', '2026-10-23 07:23:20.644623+00', 0, 55000, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-90b8-7bd3-99b0-7424f927fb24'),
	('01a167a4-90eb-7e21-909f-37e80c910c1f', '2026-10-23 07:23:20.684316+00', '2026-10-23 07:23:20.684338+00', 55000, 0, '01a167a4-8bfa-7008-8cb4-de21c1136981', '01a167a4-90e2-7b11-8d44-b5dd0b3f5b64'),
	('01a167a4-90f5-78df-af6a-a359ff2a2f35', '2026-10-23 07:23:20.693534+00', '2026-10-23 07:23:20.693557+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-90e2-7b11-8d44-b5dd0b3f5b64'),
	('01a167a4-90fd-74f5-9973-906a98befc82', '2026-10-23 07:23:20.701367+00', '2026-10-23 07:23:20.701389+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-90e2-7b11-8d44-b5dd0b3f5b64'),
	('01a167a4-9119-78da-a11a-37e9cce74e07', '2026-10-23 07:23:20.729439+00', '2026-10-23 07:23:20.729452+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9115-7426-a38f-8326c4ace8f4'),
	('01a167a4-9121-7415-b652-407edf9a0abe', '2026-10-23 07:23:20.73748+00', '2026-10-23 07:23:20.737493+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9115-7426-a38f-8326c4ace8f4'),
	('01a167a4-9137-782a-b362-6c636d873aaf', '2026-10-23 07:23:20.759862+00', '2026-10-23 07:23:20.75988+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9130-73a3-a1ee-2e154c7d7daa'),
	('01a167a4-913d-7102-bed1-b5a999e66ea9', '2026-10-23 07:23:20.765632+00', '2026-10-23 07:23:20.765646+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9130-73a3-a1ee-2e154c7d7daa'),
	('01a167a4-9141-7037-92cd-a36c42a7afcd', '2026-10-23 07:23:20.769854+00', '2026-10-23 07:23:20.769865+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9130-73a3-a1ee-2e154c7d7daa'),
	('01a167a4-916f-7aff-b5ce-fa0fb739211b', '2026-10-23 07:23:20.816214+00', '2026-10-23 07:23:20.816236+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9169-7a4b-adf2-4e6c911357f2'),
	('01a167a4-9176-7a0a-b795-8e0350f94df7', '2026-10-23 07:23:20.822966+00', '2026-10-23 07:23:20.822986+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9169-7a4b-adf2-4e6c911357f2'),
	('01a167a4-918d-7062-b40c-375976fb9f30', '2026-10-23 07:23:20.845915+00', '2026-10-23 07:23:20.845926+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9185-7231-aae7-673409b58b66'),
	('01a167a4-9192-79cc-aa71-823cb9776dd4', '2026-10-23 07:23:20.850709+00', '2026-10-23 07:23:20.850719+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9185-7231-aae7-673409b58b66'),
	('01a167a4-9196-7237-8695-a6c566dc816d', '2026-10-23 07:23:20.854181+00', '2026-10-23 07:23:20.854189+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9185-7231-aae7-673409b58b66'),
	('01a167a4-91a3-7d88-b01b-0f1553bc8148', '2026-10-23 07:23:20.867324+00', '2026-10-23 07:23:20.867331+00', 45000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-91a1-785f-b321-95862e817700'),
	('01a167a4-91a6-7c68-b5ad-989278abcdac', '2026-10-23 07:23:20.870787+00', '2026-10-23 07:23:20.870795+00', 0, 45000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91a1-785f-b321-95862e817700'),
	('01a167a4-91b1-7b0c-a476-294dc795c045', '2026-10-23 07:23:20.882043+00', '2026-10-23 07:23:20.882051+00', 45000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91ae-7cce-b557-361b8e0a8073'),
	('01a167a4-91b4-7060-b8e9-38a470ae2f21', '2026-10-23 07:23:20.884656+00', '2026-10-23 07:23:20.884664+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-91ae-7cce-b557-361b8e0a8073'),
	('01a167a4-91b7-718e-9654-d25bc11da3ba', '2026-10-23 07:23:20.887996+00', '2026-10-23 07:23:20.888005+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-91ae-7cce-b557-361b8e0a8073'),
	('01a167a4-91c4-7179-80b6-1b5dafdb5572', '2026-10-23 07:23:20.900597+00', '2026-10-23 07:23:20.900605+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-91c2-7b01-8e6c-48ab99f443d3'),
	('01a167a4-91c7-7342-b799-f2659b1cd567', '2026-10-23 07:23:20.903277+00', '2026-10-23 07:23:20.903285+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91c2-7b01-8e6c-48ab99f443d3'),
	('01a167a4-91cf-7f65-8a54-fa5267a9ade4', '2026-10-23 07:23:20.912011+00', '2026-10-23 07:23:20.912019+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91cd-70c5-b11b-16cbbdb79e07'),
	('01a167a4-91d2-7400-a106-59c5303d0f01', '2026-10-23 07:23:20.914725+00', '2026-10-23 07:23:20.914733+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-91cd-70c5-b11b-16cbbdb79e07'),
	('01a167a4-91d5-7d37-a64b-0528202b83d0', '2026-10-23 07:23:20.9175+00', '2026-10-23 07:23:20.917507+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-91cd-70c5-b11b-16cbbdb79e07'),
	('01a167a4-91e0-79ca-87f3-b4a4eef5e78e', '2026-10-23 07:23:20.928787+00', '2026-10-23 07:23:20.928795+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-91de-709b-9130-fdaf1ccaa63a'),
	('01a167a4-91e3-7401-bf08-3733fe48ebf0', '2026-10-23 07:23:20.931809+00', '2026-10-23 07:23:20.931823+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91de-709b-9130-fdaf1ccaa63a'),
	('01a167a4-91ee-73a9-9cff-4f23c17301f2', '2026-10-23 07:23:20.942403+00', '2026-10-23 07:23:20.942412+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91eb-7cfb-827d-e54b721d1c5b'),
	('01a167a4-91f1-7a93-90f9-a4e73b874504', '2026-10-23 07:23:20.945173+00', '2026-10-23 07:23:20.945183+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-91eb-7cfb-827d-e54b721d1c5b'),
	('01a167a4-91f3-7c5b-a191-8c1126c4990c', '2026-10-23 07:23:20.947994+00', '2026-10-23 07:23:20.948002+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-91eb-7cfb-827d-e54b721d1c5b'),
	('01a167a4-9200-7719-882e-aec3a4789c68', '2026-10-23 07:23:20.960333+00', '2026-10-23 07:23:20.96034+00', 45000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-91fd-77dd-b8f1-3b0e2e721d4b'),
	('01a167a4-9202-7fd3-8c90-d33539669d95', '2026-10-23 07:23:20.963121+00', '2026-10-23 07:23:20.963129+00', 0, 45000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-91fd-77dd-b8f1-3b0e2e721d4b'),
	('01a167a4-920c-7722-b923-361ff5432be4', '2026-10-23 07:23:20.972261+00', '2026-10-23 07:23:20.972269+00', 45000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9209-7fb4-9238-811a16f9c581'),
	('01a167a4-920e-7464-a61b-926b93d10d72', '2026-10-23 07:23:20.974984+00', '2026-10-23 07:23:20.974992+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9209-7fb4-9238-811a16f9c581'),
	('01a167a4-9211-7212-b0f8-4f8e3737b42f', '2026-10-23 07:23:20.977769+00', '2026-10-23 07:23:20.977777+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9209-7fb4-9238-811a16f9c581'),
	('01a167a4-921e-70df-ba8f-a210a5535157', '2026-10-23 07:23:20.990551+00', '2026-10-23 07:23:20.990566+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-921b-7998-8f9b-d51439c399be'),
	('01a167a4-9222-712e-aed4-0d1643923ecf', '2026-10-23 07:23:20.994193+00', '2026-10-23 07:23:20.994204+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-921b-7998-8f9b-d51439c399be'),
	('01a167a4-922c-7ae5-801d-65205ebb2acd', '2026-10-23 07:23:21.004133+00', '2026-10-23 07:23:21.004141+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9229-76ed-bbfa-37a54f95e281'),
	('01a167a4-922f-7f78-90de-f8df237d7510', '2026-10-23 07:23:21.007201+00', '2026-10-23 07:23:21.00721+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9229-76ed-bbfa-37a54f95e281'),
	('01a167a4-9232-7e97-80ea-ba5e84a26014', '2026-10-23 07:23:21.010363+00', '2026-10-23 07:23:21.010372+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9229-76ed-bbfa-37a54f95e281'),
	('01a167a4-9240-7fcf-84f8-298163940149', '2026-10-23 07:23:21.024894+00', '2026-10-23 07:23:21.024904+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-923e-7352-a521-8e616ba1860b'),
	('01a167a4-9244-7223-b5d1-0702dd25d8a6', '2026-10-23 07:23:21.028271+00', '2026-10-23 07:23:21.02828+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-923e-7352-a521-8e616ba1860b'),
	('01a167a4-924e-7d10-add4-9023155875a7', '2026-10-23 07:23:21.038921+00', '2026-10-23 07:23:21.038929+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-924c-74a2-9b9c-fbd9fefae5f6'),
	('01a167a4-9252-7b15-99d6-700b3c62b9c0', '2026-10-23 07:23:21.042935+00', '2026-10-23 07:23:21.042948+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-924c-74a2-9b9c-fbd9fefae5f6'),
	('01a167a4-9256-769f-a6d7-9ba8d3ed6694', '2026-10-23 07:23:21.046967+00', '2026-10-23 07:23:21.046978+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-924c-74a2-9b9c-fbd9fefae5f6'),
	('01a167a4-9266-7d28-aa94-a10c049f83f2', '2026-10-23 07:23:21.062649+00', '2026-10-23 07:23:21.062658+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9263-7456-a6d0-2e1055376383'),
	('01a167a4-926a-7514-8de2-949aa3ad823f', '2026-10-23 07:23:21.066409+00', '2026-10-23 07:23:21.06642+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9263-7456-a6d0-2e1055376383'),
	('01a167a4-9276-7c09-9d8f-7c0ddab1c02b', '2026-10-23 07:23:21.079047+00', '2026-10-23 07:23:21.079056+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9274-749f-8c42-a2f3766ad87f'),
	('01a167a4-927a-7472-a27c-ee0ca74b08b7', '2026-10-23 07:23:21.083127+00', '2026-10-23 07:23:21.083139+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9274-749f-8c42-a2f3766ad87f'),
	('01a167a4-927f-729a-a6dd-50df180176d3', '2026-10-23 07:23:21.087536+00', '2026-10-23 07:23:21.08755+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9274-749f-8c42-a2f3766ad87f'),
	('01a167a4-9291-7fa0-ac3d-4f56799971af', '2026-10-23 07:23:21.105687+00', '2026-10-23 07:23:21.105697+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-928c-70e0-b008-3d726bbb7402'),
	('01a167a4-9294-7f90-9388-c09665186b07', '2026-10-23 07:23:21.10911+00', '2026-10-23 07:23:21.109119+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-928c-70e0-b008-3d726bbb7402'),
	('01a167a4-92a6-73d1-8ea0-ecedd4ce1fc0', '2026-10-23 07:23:21.126498+00', '2026-10-23 07:23:21.126511+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-92a1-77ac-98f5-9669adfa5cff'),
	('01a167a4-92aa-7ea0-9b85-45ea0e3e6a6e', '2026-10-23 07:23:21.130813+00', '2026-10-23 07:23:21.130824+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-92a1-77ac-98f5-9669adfa5cff'),
	('01a167a4-92ae-70e5-bf0b-8e95c66a866f', '2026-10-23 07:23:21.135017+00', '2026-10-23 07:23:21.135027+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-92a1-77ac-98f5-9669adfa5cff'),
	('01a167a4-92cc-79e6-a1b2-05d2916f2939', '2026-10-23 07:23:21.164587+00', '2026-10-23 07:23:21.164597+00', 45000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-92c9-769a-98b5-f2eea33dd893'),
	('01a167a4-92d1-754a-8b2a-937a31b472c1', '2026-10-23 07:23:21.169508+00', '2026-10-23 07:23:21.169535+00', 0, 45000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-92c9-769a-98b5-f2eea33dd893'),
	('01a167a4-92e7-7c48-a5cd-83fc7c897901', '2026-10-23 07:23:21.191289+00', '2026-10-23 07:23:21.191306+00', 45000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-92e1-7f02-b1fe-aad710a35502'),
	('01a167a4-92ef-7f51-8020-e5fa1f6c12f2', '2026-10-23 07:23:21.199256+00', '2026-10-23 07:23:21.19927+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-92e1-7f02-b1fe-aad710a35502'),
	('01a167a4-92f5-70b2-af7e-529de13910a2', '2026-10-23 07:23:21.205346+00', '2026-10-23 07:23:21.205363+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-92e1-7f02-b1fe-aad710a35502'),
	('01a167a4-930d-724b-8621-4702e9b27604', '2026-10-23 07:23:21.229566+00', '2026-10-23 07:23:21.229597+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9308-7c04-bff2-813cd67c110a'),
	('01a167a4-9312-757d-9aa3-fb783807ff72', '2026-10-23 07:23:21.234898+00', '2026-10-23 07:23:21.234911+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9308-7c04-bff2-813cd67c110a'),
	('01a167a4-9329-7bdc-9688-4df13e2631f5', '2026-10-23 07:23:21.258486+00', '2026-10-23 07:23:21.25852+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9320-7afc-b730-b2af90352874'),
	('01a167a4-932f-7991-8194-136471b7e6aa', '2026-10-23 07:23:21.263861+00', '2026-10-23 07:23:21.263873+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9320-7afc-b730-b2af90352874'),
	('01a167a4-9335-7e96-bcca-0d22c670d86e', '2026-10-23 07:23:21.269292+00', '2026-10-23 07:23:21.269308+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9320-7afc-b730-b2af90352874'),
	('01a167a4-9354-759a-a4d0-3e354c25f4c0', '2026-10-23 07:23:21.300715+00', '2026-10-23 07:23:21.300732+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9350-7785-a004-f69fa54cc6ff'),
	('01a167a4-9359-72df-9c69-e23bc40403cd', '2026-10-23 07:23:21.305923+00', '2026-10-23 07:23:21.305937+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9350-7785-a004-f69fa54cc6ff'),
	('01a167a4-936b-7ea2-b076-990bca213adc', '2026-10-23 07:23:21.323359+00', '2026-10-23 07:23:21.323375+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9366-7a5f-86df-37056733c1e8'),
	('01a167a4-9372-7e29-a4d2-c144ddd22ef9', '2026-10-23 07:23:21.330428+00', '2026-10-23 07:23:21.330447+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9366-7a5f-86df-37056733c1e8'),
	('01a167a4-9377-73e4-8cae-3b07f3e0a04a', '2026-10-23 07:23:21.335633+00', '2026-10-23 07:23:21.335647+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9366-7a5f-86df-37056733c1e8'),
	('01a167a4-938b-7943-9283-157a7d51eed3', '2026-10-23 07:23:21.355655+00', '2026-10-23 07:23:21.355668+00', 45000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-9388-7cdb-8efb-e04f915b7339'),
	('01a167a4-9391-7704-aacc-707820842cde', '2026-10-23 07:23:21.361738+00', '2026-10-23 07:23:21.36175+00', 0, 45000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9388-7cdb-8efb-e04f915b7339'),
	('01a167a4-93a6-706b-a140-63f1c2dbb868', '2026-10-23 07:23:21.382979+00', '2026-10-23 07:23:21.382994+00', 45000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-93a1-7942-87dc-9b1061c8b15e'),
	('01a167a4-93ac-7c8c-9a14-a3a2ec5ad314', '2026-10-23 07:23:21.388196+00', '2026-10-23 07:23:21.38821+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-93a1-7942-87dc-9b1061c8b15e'),
	('01a167a4-93b1-7ab4-a202-ad84e20b179b', '2026-10-23 07:23:21.394279+00', '2026-10-23 07:23:21.394302+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-93a1-7942-87dc-9b1061c8b15e'),
	('01a167a4-93c8-73d6-a27e-0d5935497447', '2026-10-23 07:23:21.416387+00', '2026-10-23 07:23:21.416403+00', 50000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-93c3-76ff-af33-b370d5cee7e8'),
	('01a167a4-93d5-7ad8-bcbb-151220170f77', '2026-10-23 07:23:21.429776+00', '2026-10-23 07:23:21.429795+00', 0, 50000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-93c3-76ff-af33-b370d5cee7e8'),
	('01a167a4-93e3-755e-9062-a39cb4d63b00', '2026-10-23 07:23:21.443225+00', '2026-10-23 07:23:21.443238+00', 50000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-93df-74e8-8b95-9a713eeba494'),
	('01a167a4-93e7-7b9f-b879-de38c722883f', '2026-10-23 07:23:21.448156+00', '2026-10-23 07:23:21.44817+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-93df-74e8-8b95-9a713eeba494'),
	('01a167a4-93ec-7497-8004-a8115a65d90c', '2026-10-23 07:23:21.453054+00', '2026-10-23 07:23:21.453067+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-93df-74e8-8b95-9a713eeba494'),
	('01a167a4-9401-72a2-8c45-df1211b2ccb0', '2026-10-23 07:23:21.47376+00', '2026-10-23 07:23:21.473776+00', 55000, 0, '01a167a4-82f7-7ee1-b4a9-de13d84f16f3', '01a167a4-93fd-7ed4-a882-2e807491b7d7'),
	('01a167a4-9406-7943-b60c-1ea9f89f3ad0', '2026-10-23 07:23:21.478606+00', '2026-10-23 07:23:21.478622+00', 0, 55000, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-93fd-7ed4-a882-2e807491b7d7'),
	('01a167a4-941b-75d4-9c66-759c17daf93f', '2026-10-23 07:23:21.499612+00', '2026-10-23 07:23:21.499628+00', 55000, 0, '01a167a4-911d-741d-ad84-6e7c73c55d08', '01a167a4-9417-7bc8-b06a-afa70c7fc041'),
	('01a167a4-9422-71fe-893d-06fd7ba175cf', '2026-10-23 07:23:21.508983+00', '2026-10-23 07:23:21.509025+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9417-7bc8-b06a-afa70c7fc041'),
	('01a167a4-942c-730b-b7d8-e55f383b399c', '2026-10-23 07:23:21.516495+00', '2026-10-23 07:23:21.516516+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9417-7bc8-b06a-afa70c7fc041');
INSERT INTO public.finance_ledgerentry VALUES
	('01a167a4-9442-7919-bc0c-c1c52be05ce6', '2026-10-23 07:23:21.538382+00', '2026-10-23 07:23:21.538401+00', 50000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-943e-7f74-a1d0-6b9daf8a1729'),
	('01a167a4-944e-760c-807e-1c7e28d44386', '2026-10-23 07:23:21.550712+00', '2026-10-23 07:23:21.550727+00', 0, 50000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-943e-7f74-a1d0-6b9daf8a1729'),
	('01a167a4-9474-70cd-ba1e-d49899be0c2b', '2026-10-23 07:23:21.58921+00', '2026-10-23 07:23:21.589229+00', 50000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9469-7aa1-a2ab-952540666f19'),
	('01a167a4-947b-77d5-ae54-206f5c8a5483', '2026-10-23 07:23:21.595564+00', '2026-10-23 07:23:21.595582+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9469-7aa1-a2ab-952540666f19'),
	('01a167a4-9481-7e96-b300-9fd37c4e6d46', '2026-10-23 07:23:21.601621+00', '2026-10-23 07:23:21.601639+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9469-7aa1-a2ab-952540666f19'),
	('01a167a4-9497-7d51-89a9-02a97f80bfea', '2026-10-23 07:23:21.624184+00', '2026-10-23 07:23:21.624205+00', 55000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-9492-7d44-89c5-c70ed78c8fdf'),
	('01a167a4-949e-7bb0-bf07-8aa4f89a7665', '2026-10-23 07:23:21.631209+00', '2026-10-23 07:23:21.631226+00', 0, 55000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9492-7d44-89c5-c70ed78c8fdf'),
	('01a167a4-94b3-7674-b700-18d387418d8b', '2026-10-23 07:23:21.651709+00', '2026-10-23 07:23:21.651753+00', 55000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-94af-73a4-938b-5976a02e0444'),
	('01a167a4-94bb-7a6e-81a8-d3abd32442f8', '2026-10-23 07:23:21.659463+00', '2026-10-23 07:23:21.659532+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-94af-73a4-938b-5976a02e0444'),
	('01a167a4-94c7-7e25-8dd1-dce1fee580e7', '2026-10-23 07:23:21.671465+00', '2026-10-23 07:23:21.671483+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-94af-73a4-938b-5976a02e0444'),
	('01a167a4-94e3-7e19-a199-7415a5c92e97', '2026-10-23 07:23:21.700074+00', '2026-10-23 07:23:21.700091+00', 45000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-94de-7733-b49f-861d7a3b081a'),
	('01a167a4-94ea-70c9-8b5e-343aeb611849', '2026-10-23 07:23:21.706568+00', '2026-10-23 07:23:21.706585+00', 0, 45000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-94de-7733-b49f-861d7a3b081a'),
	('01a167a4-94fb-74c9-ba2b-847b760bf8b6', '2026-10-23 07:23:21.723621+00', '2026-10-23 07:23:21.723633+00', 45000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-94f7-7870-8517-a2bd1ff4b0db'),
	('01a167a4-9503-71c7-ac4f-5aa6d77103ac', '2026-10-23 07:23:21.731318+00', '2026-10-23 07:23:21.731336+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-94f7-7870-8517-a2bd1ff4b0db'),
	('01a167a4-950a-746a-bf7f-c9cab43a7f09', '2026-10-23 07:23:21.739094+00', '2026-10-23 07:23:21.739113+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-94f7-7870-8517-a2bd1ff4b0db'),
	('01a167a4-952d-799d-afe8-a2820380dcf5', '2026-10-23 07:23:21.773692+00', '2026-10-23 07:23:21.773714+00', 50000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-9525-77af-aae0-26e034b6a2cb'),
	('01a167a4-9538-746b-afc6-ad2c0a3077b6', '2026-10-23 07:23:21.784851+00', '2026-10-23 07:23:21.784874+00', 0, 50000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9525-77af-aae0-26e034b6a2cb'),
	('01a167a4-955d-7cb9-9b0c-dad9b5110662', '2026-10-23 07:23:21.821417+00', '2026-10-23 07:23:21.821433+00', 50000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9552-7c58-8994-472ebd8e95b4'),
	('01a167a4-9566-7f5d-a47d-029b9457d42b', '2026-10-23 07:23:21.830751+00', '2026-10-23 07:23:21.830768+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9552-7c58-8994-472ebd8e95b4'),
	('01a167a4-956c-784b-adfa-e4943ccdddb8', '2026-10-23 07:23:21.836614+00', '2026-10-23 07:23:21.836631+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9552-7c58-8994-472ebd8e95b4'),
	('01a167a4-9590-7037-8aca-4ad77d2a15f4', '2026-10-23 07:23:21.872592+00', '2026-10-23 07:23:21.872612+00', 55000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-958a-7bf9-8d46-c01273f8f18b'),
	('01a167a4-9598-72ba-a5bb-1b375d3e450f', '2026-10-23 07:23:21.880535+00', '2026-10-23 07:23:21.880555+00', 0, 55000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-958a-7bf9-8d46-c01273f8f18b'),
	('01a167a4-95ab-7f9f-904e-989061e92096', '2026-10-23 07:23:21.899205+00', '2026-10-23 07:23:21.899214+00', 55000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-95a8-75e6-9818-4a7bcccd8196'),
	('01a167a4-95ae-7809-8e90-28ad1549b4db', '2026-10-23 07:23:21.903082+00', '2026-10-23 07:23:21.903093+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-95a8-75e6-9818-4a7bcccd8196'),
	('01a167a4-95b2-72b5-8904-c0d9c825a305', '2026-10-23 07:23:21.906554+00', '2026-10-23 07:23:21.906562+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-95a8-75e6-9818-4a7bcccd8196'),
	('01a167a4-95be-711e-b4bd-2980e134a1d2', '2026-10-23 07:23:21.918727+00', '2026-10-23 07:23:21.918737+00', 45000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-95bc-7c08-b721-a51238c7a258'),
	('01a167a4-95c2-7d43-a240-af3b18907579', '2026-10-23 07:23:21.922289+00', '2026-10-23 07:23:21.922299+00', 0, 45000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-95bc-7c08-b721-a51238c7a258'),
	('01a167a4-95d4-7182-8368-d1d85448b40d', '2026-10-23 07:23:21.940278+00', '2026-10-23 07:23:21.940292+00', 45000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-95cf-7ba1-ae4b-bf6ab29dc762'),
	('01a167a4-95d9-7793-b85a-6d3078bb5719', '2026-10-23 07:23:21.945579+00', '2026-10-23 07:23:21.945592+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-95cf-7ba1-ae4b-bf6ab29dc762'),
	('01a167a4-95dd-7f23-a448-950bfcc94c5d', '2026-10-23 07:23:21.94974+00', '2026-10-23 07:23:21.949751+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-95cf-7ba1-ae4b-bf6ab29dc762'),
	('01a167a4-95ea-7323-8af1-56870395a1db', '2026-10-23 07:23:21.962509+00', '2026-10-23 07:23:21.96252+00', 50000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-95e7-7ed5-9e8f-c3bc39034288'),
	('01a167a4-95ed-7cad-ade2-4f5ae68f5964', '2026-10-23 07:23:21.966086+00', '2026-10-23 07:23:21.966097+00', 0, 50000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-95e7-7ed5-9e8f-c3bc39034288'),
	('01a167a4-95f9-778e-89dc-0c25e4f1592c', '2026-10-23 07:23:21.977707+00', '2026-10-23 07:23:21.977721+00', 50000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-95f6-7a90-ae90-8c158961c661'),
	('01a167a4-95fe-75bf-add6-cadd3cb41049', '2026-10-23 07:23:21.982575+00', '2026-10-23 07:23:21.982588+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-95f6-7a90-ae90-8c158961c661'),
	('01a167a4-9603-7a74-a09c-d02af8590e31', '2026-10-23 07:23:21.987224+00', '2026-10-23 07:23:21.987237+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-95f6-7a90-ae90-8c158961c661'),
	('01a167a4-9620-7851-a536-cd9d550a8b92', '2026-10-23 07:23:22.016841+00', '2026-10-23 07:23:22.016888+00', 55000, 0, '01a167a4-8420-7a19-a1f6-84d5b15a22b8', '01a167a4-9618-75c6-b124-8d472bda87c7'),
	('01a167a4-962d-70fa-a818-29ec36e349a5', '2026-10-23 07:23:22.029731+00', '2026-10-23 07:23:22.029743+00', 0, 55000, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9618-75c6-b124-8d472bda87c7'),
	('01a167a4-9648-793f-bdb8-806d78af58d3', '2026-10-23 07:23:22.056917+00', '2026-10-23 07:23:22.056927+00', 55000, 0, '01a167a4-944a-74f1-b1ab-9a4445a6b8e2', '01a167a4-9641-7c18-a782-5e01806fa0b6'),
	('01a167a4-964c-7d85-8a9e-e348d0320dad', '2026-10-23 07:23:22.061112+00', '2026-10-23 07:23:22.06112+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9641-7c18-a782-5e01806fa0b6'),
	('01a167a4-9652-7701-9661-b0bb12c64cc3', '2026-10-23 07:23:22.066478+00', '2026-10-23 07:23:22.066488+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9641-7c18-a782-5e01806fa0b6'),
	('01a167a4-9664-7a51-b580-c104f99dfa29', '2026-10-23 07:23:22.084953+00', '2026-10-23 07:23:22.084961+00', 50000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-9660-75df-b23f-450e7c406792'),
	('01a167a4-966b-70a1-a2d1-95fdb143bc25', '2026-10-23 07:23:22.091409+00', '2026-10-23 07:23:22.091418+00', 0, 50000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9660-75df-b23f-450e7c406792'),
	('01a167a4-968b-7391-a978-09e6f87c2864', '2026-10-23 07:23:22.123292+00', '2026-10-23 07:23:22.123301+00', 50000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9686-71ff-9d39-3d821ef927b3'),
	('01a167a4-968e-7a73-9d40-3c4fbcdbb34b', '2026-10-23 07:23:22.126946+00', '2026-10-23 07:23:22.126955+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9686-71ff-9d39-3d821ef927b3'),
	('01a167a4-9691-70c4-9b21-a13cffd9832a', '2026-10-23 07:23:22.129928+00', '2026-10-23 07:23:22.129936+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9686-71ff-9d39-3d821ef927b3'),
	('01a167a4-96a4-7f2b-9967-4fd56239a3e5', '2026-10-23 07:23:22.148236+00', '2026-10-23 07:23:22.148245+00', 55000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-96a0-7ea6-adb6-4bd5330be47b'),
	('01a167a4-96a8-7938-827e-997db6ec24ae', '2026-10-23 07:23:22.152431+00', '2026-10-23 07:23:22.152441+00', 0, 55000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-96a0-7ea6-adb6-4bd5330be47b'),
	('01a167a4-96b2-787a-93c0-196fe1f9765b', '2026-10-23 07:23:22.162847+00', '2026-10-23 07:23:22.162854+00', 55000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-96b0-7e82-a879-4b73c2026f9d'),
	('01a167a4-96b5-749b-b658-74acd9058642', '2026-10-23 07:23:22.165174+00', '2026-10-23 07:23:22.165181+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-96b0-7e82-a879-4b73c2026f9d'),
	('01a167a4-96b7-7bb3-8119-00fb11ca42e3', '2026-10-23 07:23:22.16793+00', '2026-10-23 07:23:22.167938+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-96b0-7e82-a879-4b73c2026f9d'),
	('01a167a4-96ca-7a96-9631-1cd4be594786', '2026-10-23 07:23:22.186132+00', '2026-10-23 07:23:22.186139+00', 45000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-96c7-7427-91fd-eff85aa51586'),
	('01a167a4-96cc-7352-bfa0-aba243b1ea53', '2026-10-23 07:23:22.188621+00', '2026-10-23 07:23:22.188629+00', 0, 45000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-96c7-7427-91fd-eff85aa51586'),
	('01a167a4-96e0-7972-9037-64add94ff961', '2026-10-23 07:23:22.209046+00', '2026-10-23 07:23:22.209074+00', 45000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-96dd-71ed-8a73-48f730a04bef'),
	('01a167a4-96e7-703a-8641-45bebce057cb', '2026-10-23 07:23:22.215625+00', '2026-10-23 07:23:22.215634+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-96dd-71ed-8a73-48f730a04bef'),
	('01a167a4-96ed-7fee-b015-6d496caa6ecc', '2026-10-23 07:23:22.221733+00', '2026-10-23 07:23:22.221765+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-96dd-71ed-8a73-48f730a04bef'),
	('01a167a4-9706-75ee-be81-9df4c8221aa7', '2026-10-23 07:23:22.246904+00', '2026-10-23 07:23:22.24691+00', 50000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-9704-7346-8d74-429ca9bbb8fe'),
	('01a167a4-9709-7f96-94f3-2cd471c8e40b', '2026-10-23 07:23:22.249735+00', '2026-10-23 07:23:22.249742+00', 0, 50000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9704-7346-8d74-429ca9bbb8fe'),
	('01a167a4-9715-7966-9ac2-a4c83f8a15cf', '2026-10-23 07:23:22.261561+00', '2026-10-23 07:23:22.261569+00', 50000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9713-7318-aa88-597b171d4658'),
	('01a167a4-9719-778e-a86e-92a7f9c87976', '2026-10-23 07:23:22.265948+00', '2026-10-23 07:23:22.265955+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9713-7318-aa88-597b171d4658'),
	('01a167a4-971c-786f-9b97-68dd7d5bb439', '2026-10-23 07:23:22.268593+00', '2026-10-23 07:23:22.268602+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9713-7318-aa88-597b171d4658'),
	('01a167a4-972e-7b35-b11d-c3e36631e7df', '2026-10-23 07:23:22.287085+00', '2026-10-23 07:23:22.287108+00', 55000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-9729-7a51-9503-a70172345ea7'),
	('01a167a4-9734-7152-b810-7436f64e5b7b', '2026-10-23 07:23:22.292682+00', '2026-10-23 07:23:22.292705+00', 0, 55000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9729-7a51-9503-a70172345ea7'),
	('01a167a4-9748-71d7-a358-bcd422c36661', '2026-10-23 07:23:22.31322+00', '2026-10-23 07:23:22.313247+00', 55000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9742-7d4b-a026-0db403bda70b'),
	('01a167a4-974f-7357-b748-28ca33c91fbc', '2026-10-23 07:23:22.319737+00', '2026-10-23 07:23:22.319757+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9742-7d4b-a026-0db403bda70b'),
	('01a167a4-9756-7594-9835-62704278bf2c', '2026-10-23 07:23:22.326986+00', '2026-10-23 07:23:22.326998+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9742-7d4b-a026-0db403bda70b'),
	('01a167a4-9778-776f-917f-9df9c31425c6', '2026-10-23 07:23:22.360765+00', '2026-10-23 07:23:22.360803+00', 45000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-9772-7774-ad73-5379a104dc28'),
	('01a167a4-9780-772f-861b-529746766bbd', '2026-10-23 07:23:22.369223+00', '2026-10-23 07:23:22.369239+00', 0, 45000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-9772-7774-ad73-5379a104dc28'),
	('01a167a4-9793-7503-9452-df60ca1d7618', '2026-10-23 07:23:22.387539+00', '2026-10-23 07:23:22.387549+00', 45000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-978f-7c24-91c4-dd14d16481eb'),
	('01a167a4-9798-7535-96f0-1d83bf939b7b', '2026-10-23 07:23:22.392551+00', '2026-10-23 07:23:22.392564+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-978f-7c24-91c4-dd14d16481eb'),
	('01a167a4-97a1-79fe-86ba-dd45ea8c9c1e', '2026-10-23 07:23:22.401974+00', '2026-10-23 07:23:22.402016+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-978f-7c24-91c4-dd14d16481eb'),
	('01a167a4-97bc-7fa7-ba9f-4cc32901916f', '2026-10-23 07:23:22.428261+00', '2026-10-23 07:23:22.428275+00', 50000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-97b4-74e6-b6ef-57ac03fa53d2'),
	('01a167a4-97c1-708b-9137-1f0609b2a84a', '2026-10-23 07:23:22.434138+00', '2026-10-23 07:23:22.434157+00', 0, 50000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-97b4-74e6-b6ef-57ac03fa53d2'),
	('01a167a4-97d2-7672-888d-6f6f83644321', '2026-10-23 07:23:22.451137+00', '2026-10-23 07:23:22.45115+00', 50000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-97cf-798b-bfbd-60a319fd512c'),
	('01a167a4-97d7-7db9-aa61-69fe17dc8da5', '2026-10-23 07:23:22.455454+00', '2026-10-23 07:23:22.455466+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-97cf-798b-bfbd-60a319fd512c'),
	('01a167a4-97dc-7795-b138-04fd9a3842e4', '2026-10-23 07:23:22.460896+00', '2026-10-23 07:23:22.460911+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-97cf-798b-bfbd-60a319fd512c'),
	('01a167a4-97ef-7381-ab56-e43c6f727a1b', '2026-10-23 07:23:22.480091+00', '2026-10-23 07:23:22.480102+00', 55000, 0, '01a167a4-8537-710e-8ab1-3a154f707bfe', '01a167a4-97ec-7d89-b3a2-a01a79d54d91'),
	('01a167a4-97f3-76cf-aa9f-38d487b0de69', '2026-10-23 07:23:22.484034+00', '2026-10-23 07:23:22.484045+00', 0, 55000, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-97ec-7d89-b3a2-a01a79d54d91'),
	('01a167a4-9807-76be-a373-07cfa6ad5622', '2026-10-23 07:23:22.50379+00', '2026-10-23 07:23:22.503835+00', 55000, 0, '01a167a4-9668-769c-85be-442465bb69bb', '01a167a4-97fe-712e-b487-30581f554fe9'),
	('01a167a4-980c-773c-82cc-bff717d3e317', '2026-10-23 07:23:22.508343+00', '2026-10-23 07:23:22.508355+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-97fe-712e-b487-30581f554fe9'),
	('01a167a4-9811-7b28-a9b5-20fb220280b2', '2026-10-23 07:23:22.513477+00', '2026-10-23 07:23:22.513493+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-97fe-712e-b487-30581f554fe9'),
	('01a167a4-9820-72c1-a592-192b41936f46', '2026-10-23 07:23:22.5284+00', '2026-10-23 07:23:22.52841+00', 50000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-981d-7e1b-89e6-8933b54e055d'),
	('01a167a4-9824-72f4-816e-0809f6bccadc', '2026-10-23 07:23:22.533097+00', '2026-10-23 07:23:22.533108+00', 0, 50000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-981d-7e1b-89e6-8933b54e055d'),
	('01a167a4-9831-7859-afa3-8d26e62b327d', '2026-10-23 07:23:22.545314+00', '2026-10-23 07:23:22.545327+00', 50000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-982e-70d0-9bda-c6de7f7606a1'),
	('01a167a4-9835-7bbb-aa8f-cb02704a50e9', '2026-10-23 07:23:22.549187+00', '2026-10-23 07:23:22.549196+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-982e-70d0-9bda-c6de7f7606a1'),
	('01a167a4-9838-72be-9e2a-355623cec7ba', '2026-10-23 07:23:22.552914+00', '2026-10-23 07:23:22.552925+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-982e-70d0-9bda-c6de7f7606a1'),
	('01a167a4-984c-71c2-bf9f-f07e05621585', '2026-10-23 07:23:22.572329+00', '2026-10-23 07:23:22.572346+00', 55000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-9847-7b48-b439-dca519c39802'),
	('01a167a4-9850-782e-ade6-d369e4bbb9e8', '2026-10-23 07:23:22.576788+00', '2026-10-23 07:23:22.576802+00', 0, 55000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9847-7b48-b439-dca519c39802'),
	('01a167a4-9865-7863-878a-54ff17e1f23f', '2026-10-23 07:23:22.597673+00', '2026-10-23 07:23:22.597693+00', 55000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-985c-7951-ac73-e94e27345071'),
	('01a167a4-9872-70a3-a4d0-0a8384aa4c25', '2026-10-23 07:23:22.610984+00', '2026-10-23 07:23:22.611002+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-985c-7951-ac73-e94e27345071'),
	('01a167a4-9881-71e8-a863-2ae8a79dec91', '2026-10-23 07:23:22.626118+00', '2026-10-23 07:23:22.626132+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-985c-7951-ac73-e94e27345071'),
	('01a167a4-98ba-788a-ab79-498b120ef932', '2026-10-23 07:23:22.682536+00', '2026-10-23 07:23:22.682549+00', 45000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-98ac-7e39-b5de-ef92e427fcc1'),
	('01a167a4-98d2-74aa-b2d3-cee5e0af78dd', '2026-10-23 07:23:22.707186+00', '2026-10-23 07:23:22.707201+00', 0, 45000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-98ac-7e39-b5de-ef92e427fcc1'),
	('01a167a4-98fd-7c4e-a2c6-5ef9dfcb71e4', '2026-10-23 07:23:22.74962+00', '2026-10-23 07:23:22.749633+00', 45000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-98f4-72e7-8efa-79ba4412575e'),
	('01a167a4-9908-7029-94b3-0e0117ada546', '2026-10-23 07:23:22.760215+00', '2026-10-23 07:23:22.760226+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-98f4-72e7-8efa-79ba4412575e'),
	('01a167a4-9913-76ef-9a56-beacca447401', '2026-10-23 07:23:22.772158+00', '2026-10-23 07:23:22.772169+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-98f4-72e7-8efa-79ba4412575e'),
	('01a167a4-993d-78f9-a309-d9f40fd2769c', '2026-10-23 07:23:22.813687+00', '2026-10-23 07:23:22.8137+00', 50000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-9938-76fe-81e3-4c1410b55bdf'),
	('01a167a4-9941-72cf-80c5-ceb79513d5b3', '2026-10-23 07:23:22.818025+00', '2026-10-23 07:23:22.818036+00', 0, 50000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9938-76fe-81e3-4c1410b55bdf'),
	('01a167a4-9956-7498-afdb-47b7c7627965', '2026-10-23 07:23:22.838972+00', '2026-10-23 07:23:22.838984+00', 50000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9951-79bc-8d56-0a6b099d6818'),
	('01a167a4-995b-7603-a976-c19c18329834', '2026-10-23 07:23:22.843247+00', '2026-10-23 07:23:22.843258+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9951-79bc-8d56-0a6b099d6818'),
	('01a167a4-995f-7459-b557-9d6b7ee14cfd', '2026-10-23 07:23:22.847418+00', '2026-10-23 07:23:22.84743+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9951-79bc-8d56-0a6b099d6818'),
	('01a167a4-9971-703a-956f-056ff8ae8c55', '2026-10-23 07:23:22.86534+00', '2026-10-23 07:23:22.865353+00', 55000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-996c-79f6-8a6b-014a44c204f7'),
	('01a167a4-9978-7dec-9b24-c2b2996090d1', '2026-10-23 07:23:22.873025+00', '2026-10-23 07:23:22.873037+00', 0, 55000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-996c-79f6-8a6b-014a44c204f7'),
	('01a167a4-99cf-7b65-9297-dbdfb5989187', '2026-10-23 07:23:22.960333+00', '2026-10-23 07:23:22.960352+00', 55000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-999f-751c-bfc4-2871665b4fdb'),
	('01a167a4-99dc-7e30-b06c-8378b2c26d1b', '2026-10-23 07:23:22.973014+00', '2026-10-23 07:23:22.973027+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-999f-751c-bfc4-2871665b4fdb'),
	('01a167a4-99e3-73a9-b85f-74a144297096', '2026-10-23 07:23:22.980081+00', '2026-10-23 07:23:22.980093+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-999f-751c-bfc4-2871665b4fdb'),
	('01a167a4-99f5-78bf-9de2-e82ff079f246', '2026-10-23 07:23:22.997811+00', '2026-10-23 07:23:22.997821+00', 45000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-99f2-7527-879e-37f0e4ce1b30'),
	('01a167a4-99f9-7128-90ba-f684362815dd', '2026-10-23 07:23:23.001999+00', '2026-10-23 07:23:23.002009+00', 0, 45000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-99f2-7527-879e-37f0e4ce1b30'),
	('01a167a4-9a05-7f2e-9cf1-2f014ea31417', '2026-10-23 07:23:23.013662+00', '2026-10-23 07:23:23.013672+00', 45000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9a02-794b-b0a2-153ccfbe9ff6'),
	('01a167a4-9a09-73b3-855c-408902b0a308', '2026-10-23 07:23:23.017861+00', '2026-10-23 07:23:23.017871+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9a02-794b-b0a2-153ccfbe9ff6'),
	('01a167a4-9a0d-7548-9af7-4cb3a27ba0d7', '2026-10-23 07:23:23.021618+00', '2026-10-23 07:23:23.021629+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9a02-794b-b0a2-153ccfbe9ff6'),
	('01a167a4-9a23-772e-b4ed-4cd0ee945c61', '2026-10-23 07:23:23.043793+00', '2026-10-23 07:23:23.043806+00', 50000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-9a1d-7be1-874d-6f245e86bf60'),
	('01a167a4-9a28-7c1b-bd33-fc2a4b339077', '2026-10-23 07:23:23.048828+00', '2026-10-23 07:23:23.048877+00', 0, 50000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9a1d-7be1-874d-6f245e86bf60'),
	('01a167a4-9a49-790c-b02e-ef37d3d934cd', '2026-10-23 07:23:23.081292+00', '2026-10-23 07:23:23.081303+00', 50000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9a41-78a0-ad23-48694a3d5214'),
	('01a167a4-9a4d-7b5a-adce-934a19be854d', '2026-10-23 07:23:23.085837+00', '2026-10-23 07:23:23.085848+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9a41-78a0-ad23-48694a3d5214'),
	('01a167a4-9a51-72ba-b31d-7c6b9aebd3a1', '2026-10-23 07:23:23.089745+00', '2026-10-23 07:23:23.089756+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9a41-78a0-ad23-48694a3d5214'),
	('01a167a4-9a66-7a4a-87a1-a1a1c2d3d534', '2026-10-23 07:23:23.111087+00', '2026-10-23 07:23:23.111098+00', 55000, 0, '01a167a4-85bb-737a-8731-4a976c263c6e', '01a167a4-9a63-767f-9eee-db6b420234b1'),
	('01a167a4-9a6c-7fd4-910b-9374f89e0535', '2026-10-23 07:23:23.116287+00', '2026-10-23 07:23:23.116298+00', 0, 55000, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9a63-767f-9eee-db6b420234b1'),
	('01a167a4-9a7a-76ae-86da-c102ab2c239a', '2026-10-23 07:23:23.131138+00', '2026-10-23 07:23:23.131168+00', 55000, 0, '01a167a4-9822-7273-a5ab-ebf78db46a58', '01a167a4-9a76-73b1-a3ea-775c342e68a6'),
	('01a167a4-9a81-731a-8e16-c4d3efbc65cf', '2026-10-23 07:23:23.137245+00', '2026-10-23 07:23:23.137257+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9a76-73b1-a3ea-775c342e68a6'),
	('01a167a4-9a85-73a3-a7ff-5cc88ba6e0cc', '2026-10-23 07:23:23.141701+00', '2026-10-23 07:23:23.141712+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9a76-73b1-a3ea-775c342e68a6'),
	('01a167a4-9a93-776e-8a8a-0108d5ed2b89', '2026-10-23 07:23:23.155864+00', '2026-10-23 07:23:23.155873+00', 50000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9a91-7e2a-bb8d-2165463a6b35'),
	('01a167a4-9a98-7da4-b03c-adb6ffac68f7', '2026-10-23 07:23:23.160548+00', '2026-10-23 07:23:23.160559+00', 0, 50000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9a91-7e2a-bb8d-2165463a6b35'),
	('01a167a4-9aa7-7698-85d1-3d8277a0680c', '2026-10-23 07:23:23.175746+00', '2026-10-23 07:23:23.175754+00', 50000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9aa4-70ed-a31f-407c798e5813'),
	('01a167a4-9aab-7a00-a03d-f2ab94671c79', '2026-10-23 07:23:23.179625+00', '2026-10-23 07:23:23.179635+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9aa4-70ed-a31f-407c798e5813'),
	('01a167a4-9aae-7b75-8031-4b4678d11e17', '2026-10-23 07:23:23.182804+00', '2026-10-23 07:23:23.182813+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9aa4-70ed-a31f-407c798e5813'),
	('01a167a4-9ab9-7fdb-b2de-30998ef0a20e', '2026-10-23 07:23:23.19399+00', '2026-10-23 07:23:23.193998+00', 55000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9ab7-70a2-9fca-ca3c70f8b085'),
	('01a167a4-9abd-78b5-870b-b9077ceac845', '2026-10-23 07:23:23.197215+00', '2026-10-23 07:23:23.197223+00', 0, 55000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9ab7-70a2-9fca-ca3c70f8b085'),
	('01a167a4-9ac6-7c3d-bfbf-3ca0fbdf608d', '2026-10-23 07:23:23.20634+00', '2026-10-23 07:23:23.206349+00', 55000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9ac3-77b9-8858-71170f2b5b30'),
	('01a167a4-9ac9-70cb-9b40-3501dd0c12f3', '2026-10-23 07:23:23.209277+00', '2026-10-23 07:23:23.209285+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9ac3-77b9-8858-71170f2b5b30'),
	('01a167a4-9acc-78ee-a116-38800341abbf', '2026-10-23 07:23:23.21216+00', '2026-10-23 07:23:23.212169+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9ac3-77b9-8858-71170f2b5b30'),
	('01a167a4-9adb-7750-9ebe-5520e687cdea', '2026-10-23 07:23:23.227802+00', '2026-10-23 07:23:23.227814+00', 45000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9ad8-7b61-9a64-e27a628924d9'),
	('01a167a4-9adf-79d7-92d2-a0de83756055', '2026-10-23 07:23:23.231452+00', '2026-10-23 07:23:23.231463+00', 0, 45000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9ad8-7b61-9a64-e27a628924d9'),
	('01a167a4-9aea-71dd-b4ea-5b94c72bd98a', '2026-10-23 07:23:23.242621+00', '2026-10-23 07:23:23.24263+00', 45000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9ae7-71ad-9bea-6be3cb28294f'),
	('01a167a4-9aed-7107-8c2c-73e2acd61d4b', '2026-10-23 07:23:23.245592+00', '2026-10-23 07:23:23.245602+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9ae7-71ad-9bea-6be3cb28294f'),
	('01a167a4-9af1-7f23-86e6-fab1138313ad', '2026-10-23 07:23:23.249235+00', '2026-10-23 07:23:23.249245+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9ae7-71ad-9bea-6be3cb28294f'),
	('01a167a4-9afe-7293-8311-a284e1fc6c22', '2026-10-23 07:23:23.262918+00', '2026-10-23 07:23:23.262928+00', 50000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9afc-746c-af5a-5629df9c88d9'),
	('01a167a4-9b03-75fd-a1ac-3aca8d942243', '2026-10-23 07:23:23.267675+00', '2026-10-23 07:23:23.267685+00', 0, 50000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9afc-746c-af5a-5629df9c88d9'),
	('01a167a4-9b0e-7731-96df-602bf87839b4', '2026-10-23 07:23:23.278243+00', '2026-10-23 07:23:23.278254+00', 50000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b0b-70ac-bca3-17504869657e'),
	('01a167a4-9b11-7a02-8e29-acdf9e48ac51', '2026-10-23 07:23:23.281542+00', '2026-10-23 07:23:23.281551+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9b0b-70ac-bca3-17504869657e'),
	('01a167a4-9b15-7bfc-a04c-150815006e99', '2026-10-23 07:23:23.28545+00', '2026-10-23 07:23:23.28546+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9b0b-70ac-bca3-17504869657e'),
	('01a167a4-9b21-7583-986f-cbc950cf8ce6', '2026-10-23 07:23:23.297912+00', '2026-10-23 07:23:23.29792+00', 55000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9b1f-789c-80dc-cb721db77319'),
	('01a167a4-9b24-74fa-af5c-cc3e91ee98b6', '2026-10-23 07:23:23.300841+00', '2026-10-23 07:23:23.30085+00', 0, 55000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b1f-789c-80dc-cb721db77319'),
	('01a167a4-9b2d-7da8-beb0-55326c19df89', '2026-10-23 07:23:23.310027+00', '2026-10-23 07:23:23.310035+00', 55000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b2b-7d88-8746-68ff1589f16d'),
	('01a167a4-9b30-74bb-af8e-c25da2098763', '2026-10-23 07:23:23.312609+00', '2026-10-23 07:23:23.312616+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9b2b-7d88-8746-68ff1589f16d'),
	('01a167a4-9b33-7972-acbf-bf4c8cf22634', '2026-10-23 07:23:23.315511+00', '2026-10-23 07:23:23.315522+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9b2b-7d88-8746-68ff1589f16d'),
	('01a167a4-9b3e-73c9-be6f-21f14f4af90a', '2026-10-23 07:23:23.326865+00', '2026-10-23 07:23:23.326871+00', 45000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9b3c-75eb-8906-68ca983f6256'),
	('01a167a4-9b41-7f6f-bb6a-9898a278e3db', '2026-10-23 07:23:23.32918+00', '2026-10-23 07:23:23.329187+00', 0, 45000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b3c-75eb-8906-68ca983f6256'),
	('01a167a4-9b4b-7e59-8343-216ef84ce934', '2026-10-23 07:23:23.339776+00', '2026-10-23 07:23:23.339785+00', 45000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b49-79fb-aa4d-01a3e51ba9e4'),
	('01a167a4-9b4f-7389-b8a4-69c72d8b2a74', '2026-10-23 07:23:23.343326+00', '2026-10-23 07:23:23.343336+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9b49-79fb-aa4d-01a3e51ba9e4'),
	('01a167a4-9b52-721d-8bb7-39ece90856a6', '2026-10-23 07:23:23.34679+00', '2026-10-23 07:23:23.3468+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9b49-79fb-aa4d-01a3e51ba9e4'),
	('01a167a4-9b5f-75bf-8e1b-b0f4f2deba09', '2026-10-23 07:23:23.360126+00', '2026-10-23 07:23:23.360135+00', 50000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9b5d-7c4e-9a54-70d138e073c6'),
	('01a167a4-9b63-7a81-aaae-377057b8b52d', '2026-10-23 07:23:23.363263+00', '2026-10-23 07:23:23.363272+00', 0, 50000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b5d-7c4e-9a54-70d138e073c6'),
	('01a167a4-9b6e-70c0-a2ea-24d0adbfda9a', '2026-10-23 07:23:23.374705+00', '2026-10-23 07:23:23.374715+00', 50000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b6b-7c04-8916-b7586e24ffe4'),
	('01a167a4-9b71-745f-91ac-0be208f826ed', '2026-10-23 07:23:23.377836+00', '2026-10-23 07:23:23.377845+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9b6b-7c04-8916-b7586e24ffe4'),
	('01a167a4-9b74-7312-add2-bd3ac9ee7266', '2026-10-23 07:23:23.380906+00', '2026-10-23 07:23:23.380915+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9b6b-7c04-8916-b7586e24ffe4'),
	('01a167a4-9b82-7a43-8ca2-d32cd4482e11', '2026-10-23 07:23:23.39431+00', '2026-10-23 07:23:23.39432+00', 55000, 0, '01a167a4-8654-7bdb-9e23-266fed1e01c1', '01a167a4-9b7f-7b21-a8aa-bedcb1f6da6b'),
	('01a167a4-9b85-7d75-9882-6611c66924c7', '2026-10-23 07:23:23.397772+00', '2026-10-23 07:23:23.397782+00', 0, 55000, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b7f-7b21-a8aa-bedcb1f6da6b'),
	('01a167a4-9b93-7962-9e3c-ea2b447e138a', '2026-10-23 07:23:23.411365+00', '2026-10-23 07:23:23.411375+00', 55000, 0, '01a167a4-9a96-727f-b91c-5e239afedb3d', '01a167a4-9b90-7553-96ee-4f97a55287c4'),
	('01a167a4-9b96-7e37-ade0-6fb2913f1bbc', '2026-10-23 07:23:23.415134+00', '2026-10-23 07:23:23.415146+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9b90-7553-96ee-4f97a55287c4'),
	('01a167a4-9b9c-74ef-b5a1-c9c864782bca', '2026-10-23 07:23:23.420465+00', '2026-10-23 07:23:23.420477+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9b90-7553-96ee-4f97a55287c4'),
	('01a167a4-9ba9-73eb-b705-f9c1cc7bd180', '2026-10-23 07:23:23.433986+00', '2026-10-23 07:23:23.433996+00', 50000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9ba7-78ab-ac5f-b9500290712f'),
	('01a167a4-9bae-731e-ac68-3f184116e5f5', '2026-10-23 07:23:23.438779+00', '2026-10-23 07:23:23.438787+00', 0, 50000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9ba7-78ab-ac5f-b9500290712f'),
	('01a167a4-9bba-7c1a-8a1e-ab1e98b0f8e1', '2026-10-23 07:23:23.451108+00', '2026-10-23 07:23:23.451117+00', 50000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9bb8-7efe-a92a-62df7c058393'),
	('01a167a4-9bbe-728a-8c33-797f7b9a8b0e', '2026-10-23 07:23:23.454755+00', '2026-10-23 07:23:23.454765+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9bb8-7efe-a92a-62df7c058393'),
	('01a167a4-9bc2-79f3-9d95-4f8f19597011', '2026-10-23 07:23:23.458366+00', '2026-10-23 07:23:23.458378+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9bb8-7efe-a92a-62df7c058393'),
	('01a167a4-9bd5-7d24-bebf-1cfc1e478f7c', '2026-10-23 07:23:23.477511+00', '2026-10-23 07:23:23.477526+00', 55000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9bd1-78fe-912a-00f4812e40ce'),
	('01a167a4-9bd9-7ff2-a952-74095ae9cbb7', '2026-10-23 07:23:23.481461+00', '2026-10-23 07:23:23.481472+00', 0, 55000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9bd1-78fe-912a-00f4812e40ce'),
	('01a167a4-9be8-7cfc-a2f9-352d0d2f6d17', '2026-10-23 07:23:23.496368+00', '2026-10-23 07:23:23.496379+00', 55000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9be4-7cda-93c7-c4d246a8c7e2'),
	('01a167a4-9bec-733d-809b-e152af98373c', '2026-10-23 07:23:23.500936+00', '2026-10-23 07:23:23.500948+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9be4-7cda-93c7-c4d246a8c7e2'),
	('01a167a4-9bf1-7902-abfe-d7f6163d5419', '2026-10-23 07:23:23.506084+00', '2026-10-23 07:23:23.506096+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9be4-7cda-93c7-c4d246a8c7e2'),
	('01a167a4-9c06-777e-9bf0-7d426bc7bebb', '2026-10-23 07:23:23.526549+00', '2026-10-23 07:23:23.526558+00', 45000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9c02-773b-8e70-b95ed04c4d23'),
	('01a167a4-9c0a-79eb-9b44-f9f43af1f4b2', '2026-10-23 07:23:23.53088+00', '2026-10-23 07:23:23.530896+00', 0, 45000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c02-773b-8e70-b95ed04c4d23'),
	('01a167a4-9c1a-7c84-a9ac-f389634fbbf3', '2026-10-23 07:23:23.546541+00', '2026-10-23 07:23:23.546551+00', 45000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c16-71a5-9fa6-e192bd43109f'),
	('01a167a4-9c1f-767c-8d56-31bb47f19dbe', '2026-10-23 07:23:23.551445+00', '2026-10-23 07:23:23.551455+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9c16-71a5-9fa6-e192bd43109f'),
	('01a167a4-9c24-7ad5-98cb-4011ec4b9c4b', '2026-10-23 07:23:23.556389+00', '2026-10-23 07:23:23.556406+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9c16-71a5-9fa6-e192bd43109f'),
	('01a167a4-9c39-7b82-bfdc-a9bc9c8f073a', '2026-10-23 07:23:23.577588+00', '2026-10-23 07:23:23.577599+00', 50000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9c36-736d-8876-1d9319c4609e'),
	('01a167a4-9c3d-7634-be62-2f7981d8a12c', '2026-10-23 07:23:23.58121+00', '2026-10-23 07:23:23.58122+00', 0, 50000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c36-736d-8876-1d9319c4609e'),
	('01a167a4-9c4a-7a6a-bf12-162971be3d9e', '2026-10-23 07:23:23.59418+00', '2026-10-23 07:23:23.59419+00', 50000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c46-77e9-bcad-1af903bbcb56'),
	('01a167a4-9c4d-75f5-b168-1f3b7a9586e1', '2026-10-23 07:23:23.598004+00', '2026-10-23 07:23:23.598013+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9c46-77e9-bcad-1af903bbcb56'),
	('01a167a4-9c52-7888-97f3-dab374bb5ec0', '2026-10-23 07:23:23.602253+00', '2026-10-23 07:23:23.602263+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9c46-77e9-bcad-1af903bbcb56'),
	('01a167a4-9c63-77f4-ac18-a8d65d29fa1b', '2026-10-23 07:23:23.620029+00', '2026-10-23 07:23:23.620039+00', 55000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9c60-7573-8ad7-f3fa58f4a6df'),
	('01a167a4-9c68-7aa1-a95a-0473a7f9582a', '2026-10-23 07:23:23.624282+00', '2026-10-23 07:23:23.624294+00', 0, 55000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c60-7573-8ad7-f3fa58f4a6df'),
	('01a167a4-9c76-7b4b-a04b-790ce74a60bb', '2026-10-23 07:23:23.638456+00', '2026-10-23 07:23:23.638467+00', 55000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9c72-7dd9-a592-caec8b4182b6'),
	('01a167a4-9c7c-7d1e-a385-c48431cff9b8', '2026-10-23 07:23:23.644371+00', '2026-10-23 07:23:23.644385+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9c72-7dd9-a592-caec8b4182b6'),
	('01a167a4-9c81-7b23-a005-e132e18feecc', '2026-10-23 07:23:23.650013+00', '2026-10-23 07:23:23.650028+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9c72-7dd9-a592-caec8b4182b6'),
	('01a167a4-9cab-7dff-b872-b0d7856f3c1c', '2026-10-23 07:23:23.691733+00', '2026-10-23 07:23:23.691747+00', 45000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9ca6-7fbd-972f-7ecc3c1bac04'),
	('01a167a4-9caf-7300-8520-1ef3f3e30882', '2026-10-23 07:23:23.695884+00', '2026-10-23 07:23:23.695897+00', 0, 45000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9ca6-7fbd-972f-7ecc3c1bac04'),
	('01a167a4-9cbb-7af6-81e6-13bcaf2cfb64', '2026-10-23 07:23:23.708065+00', '2026-10-23 07:23:23.708073+00', 45000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9cb9-7962-a5dd-f29bc8a9dba2'),
	('01a167a4-9cc0-733e-919f-ebef5d9d6e10', '2026-10-23 07:23:23.712351+00', '2026-10-23 07:23:23.712362+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9cb9-7962-a5dd-f29bc8a9dba2'),
	('01a167a4-9cc3-7f24-a90e-86261bffe67e', '2026-10-23 07:23:23.716188+00', '2026-10-23 07:23:23.716202+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9cb9-7962-a5dd-f29bc8a9dba2'),
	('01a167a4-9cd0-77e9-aacc-724a1eaff4bf', '2026-10-23 07:23:23.728836+00', '2026-10-23 07:23:23.728844+00', 50000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9cce-7303-bfaa-de38bee6b049'),
	('01a167a4-9cd3-75cf-b0a2-ddadd7dd5773', '2026-10-23 07:23:23.732055+00', '2026-10-23 07:23:23.732068+00', 0, 50000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9cce-7303-bfaa-de38bee6b049'),
	('01a167a4-9cde-7e8b-a42f-15cbc077b130', '2026-10-23 07:23:23.742754+00', '2026-10-23 07:23:23.742763+00', 50000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9cdc-7e97-a03a-7d4dd7e16b42'),
	('01a167a4-9ce1-7659-b16b-498f8aa63ee7', '2026-10-23 07:23:23.745819+00', '2026-10-23 07:23:23.745828+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9cdc-7e97-a03a-7d4dd7e16b42'),
	('01a167a4-9ce4-79e4-9ec1-8354cf6234aa', '2026-10-23 07:23:23.748869+00', '2026-10-23 07:23:23.748877+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9cdc-7e97-a03a-7d4dd7e16b42'),
	('01a167a4-9d02-798d-9d68-8e5679654c2a', '2026-10-23 07:23:23.779161+00', '2026-10-23 07:23:23.779172+00', 55000, 0, '01a167a4-86df-74ef-8fd2-ba451dc0c8dd', '01a167a4-9d00-7266-9e49-20e1ad8ba8cd'),
	('01a167a4-9d06-7bc6-9a1f-cfc24ca307fa', '2026-10-23 07:23:23.782739+00', '2026-10-23 07:23:23.78275+00', 0, 55000, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9d00-7266-9e49-20e1ad8ba8cd'),
	('01a167a4-9d13-7b23-8876-428511a0147b', '2026-10-23 07:23:23.795199+00', '2026-10-23 07:23:23.79521+00', 55000, 0, '01a167a4-9bac-759c-a309-dfb0ec26540b', '01a167a4-9d0f-70a3-bc3d-acfc8a4beef6'),
	('01a167a4-9d17-70ac-8736-cfb084ef4a6b', '2026-10-23 07:23:23.799629+00', '2026-10-23 07:23:23.799642+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9d0f-70a3-bc3d-acfc8a4beef6'),
	('01a167a4-9d1b-7781-924e-82569204e1a4', '2026-10-23 07:23:23.804026+00', '2026-10-23 07:23:23.80404+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9d0f-70a3-bc3d-acfc8a4beef6');
INSERT INTO public.finance_ledgerentry VALUES
	('01a167a4-9d2b-789b-9bf3-6b9e0a44dde0', '2026-10-23 07:23:23.820143+00', '2026-10-23 07:23:23.820158+00', 50000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9d28-7037-80c6-ed19a38d8e65'),
	('01a167a4-9d32-72c9-995a-5d4dc63f5588', '2026-10-23 07:23:23.8264+00', '2026-10-23 07:23:23.826411+00', 0, 50000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9d28-7037-80c6-ed19a38d8e65'),
	('01a167a4-9d40-7fd4-8f86-ac60cb9482f2', '2026-10-23 07:23:23.84084+00', '2026-10-23 07:23:23.840851+00', 50000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9d3d-7375-99bb-fb0d11b852df'),
	('01a167a4-9d45-7e4e-a883-756404efb9ed', '2026-10-23 07:23:23.84517+00', '2026-10-23 07:23:23.845182+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9d3d-7375-99bb-fb0d11b852df'),
	('01a167a4-9d49-77ef-bee3-2cb25a4a4dc7', '2026-10-23 07:23:23.849743+00', '2026-10-23 07:23:23.849755+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9d3d-7375-99bb-fb0d11b852df'),
	('01a167a4-9d65-7c08-82b4-fde2543c362f', '2026-10-23 07:23:23.877276+00', '2026-10-23 07:23:23.877289+00', 55000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9d60-7543-a8d7-7ec7e4774f38'),
	('01a167a4-9d69-7ca8-972e-f8dddaeea132', '2026-10-23 07:23:23.881856+00', '2026-10-23 07:23:23.881871+00', 0, 55000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9d60-7543-a8d7-7ec7e4774f38'),
	('01a167a4-9d82-7f8a-b46d-3f8481526cd2', '2026-10-23 07:23:23.906448+00', '2026-10-23 07:23:23.906463+00', 55000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9d7c-7221-8ce0-1a5f696bbe9a'),
	('01a167a4-9d8b-7d11-950f-4dfe78403739', '2026-10-23 07:23:23.916261+00', '2026-10-23 07:23:23.91629+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9d7c-7221-8ce0-1a5f696bbe9a'),
	('01a167a4-9d95-741d-95a8-7101814d83c7', '2026-10-23 07:23:23.925983+00', '2026-10-23 07:23:23.926021+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9d7c-7221-8ce0-1a5f696bbe9a'),
	('01a167a4-9dc4-7e9d-9d38-2f05823785a3', '2026-10-23 07:23:23.974752+00', '2026-10-23 07:23:23.975138+00', 45000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9dba-7e4b-99d6-8c9224a1f5ef'),
	('01a167a4-9dd0-7af5-b643-e11d011a2120', '2026-10-23 07:23:23.984512+00', '2026-10-23 07:23:23.984526+00', 0, 45000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9dba-7e4b-99d6-8c9224a1f5ef'),
	('01a167a4-9de8-71af-8851-443f969491eb', '2026-10-23 07:23:24.00825+00', '2026-10-23 07:23:24.008259+00', 45000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9de5-7c26-b188-53eae9604adc'),
	('01a167a4-9dec-7305-9d8f-7c3ecb95e685', '2026-10-23 07:23:24.012431+00', '2026-10-23 07:23:24.012443+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9de5-7c26-b188-53eae9604adc'),
	('01a167a4-9df0-7409-9f17-cd01033305c4', '2026-10-23 07:23:24.016659+00', '2026-10-23 07:23:24.01667+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9de5-7c26-b188-53eae9604adc'),
	('01a167a4-9dfd-7e39-bd20-1b3c06985c5e', '2026-10-23 07:23:24.030089+00', '2026-10-23 07:23:24.030097+00', 50000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9dfb-70a5-bb5d-8b5412e7f00f'),
	('01a167a4-9e00-728e-a317-974c9f85f47a', '2026-10-23 07:23:24.033022+00', '2026-10-23 07:23:24.033036+00', 0, 50000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9dfb-70a5-bb5d-8b5412e7f00f'),
	('01a167a4-9e0a-7ede-ada6-f7b26d3101cd', '2026-10-23 07:23:24.042136+00', '2026-10-23 07:23:24.042145+00', 50000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e07-7c97-9a63-f38e1706927d'),
	('01a167a4-9e0c-7b39-839e-348c0d051c64', '2026-10-23 07:23:24.044741+00', '2026-10-23 07:23:24.044752+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9e07-7c97-9a63-f38e1706927d'),
	('01a167a4-9e10-768e-8afd-3da6e5e1e585', '2026-10-23 07:23:24.04854+00', '2026-10-23 07:23:24.048548+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9e07-7c97-9a63-f38e1706927d'),
	('01a167a4-9e1d-707c-b018-47bd695aff6f', '2026-10-23 07:23:24.062018+00', '2026-10-23 07:23:24.062028+00', 55000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9e1b-7e64-a33a-4f37e5c8083a'),
	('01a167a4-9e21-70fc-bb82-d32b48df8494', '2026-10-23 07:23:24.065591+00', '2026-10-23 07:23:24.065605+00', 0, 55000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e1b-7e64-a33a-4f37e5c8083a'),
	('01a167a4-9e2d-768b-8da6-766e7467300e', '2026-10-23 07:23:24.077979+00', '2026-10-23 07:23:24.07799+00', 55000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e2a-7ce4-874c-d333f3ac13a8'),
	('01a167a4-9e32-774a-addb-61c15b7c34a3', '2026-10-23 07:23:24.082379+00', '2026-10-23 07:23:24.08239+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9e2a-7ce4-874c-d333f3ac13a8'),
	('01a167a4-9e36-700c-8a0a-1ea76cdf2134', '2026-10-23 07:23:24.08634+00', '2026-10-23 07:23:24.086351+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9e2a-7ce4-874c-d333f3ac13a8'),
	('01a167a4-9e44-7697-90b2-69898e837f92', '2026-10-23 07:23:24.101115+00', '2026-10-23 07:23:24.101125+00', 45000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9e42-70c2-9490-8e99f8cc5915'),
	('01a167a4-9e48-7253-84cc-863293e41748', '2026-10-23 07:23:24.104165+00', '2026-10-23 07:23:24.104174+00', 0, 45000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e42-70c2-9490-8e99f8cc5915'),
	('01a167a4-9e52-7a28-9b03-94bf76684209', '2026-10-23 07:23:24.11501+00', '2026-10-23 07:23:24.115019+00', 45000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e50-7033-934c-3ab063e7db18'),
	('01a167a4-9e55-78bc-8677-503189a8c290', '2026-10-23 07:23:24.118119+00', '2026-10-23 07:23:24.118128+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9e50-7033-934c-3ab063e7db18'),
	('01a167a4-9e59-7ac3-9066-3be3bfa9318e', '2026-10-23 07:23:24.121463+00', '2026-10-23 07:23:24.121475+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9e50-7033-934c-3ab063e7db18'),
	('01a167a4-9e6e-72a5-9369-4e022c4b8178', '2026-10-23 07:23:24.142179+00', '2026-10-23 07:23:24.142188+00', 50000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9e6a-78e8-88b6-7d5cdf5d0697'),
	('01a167a4-9e71-7537-90d1-a9f2c1203aa2', '2026-10-23 07:23:24.145958+00', '2026-10-23 07:23:24.145967+00', 0, 50000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e6a-78e8-88b6-7d5cdf5d0697'),
	('01a167a4-9e7d-712a-8600-1a13ea41f07b', '2026-10-23 07:23:24.157705+00', '2026-10-23 07:23:24.157713+00', 50000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e7a-7707-aa09-4337c9f022e5'),
	('01a167a4-9e81-7220-a160-5671e8d8e65a', '2026-10-23 07:23:24.161762+00', '2026-10-23 07:23:24.161771+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9e7a-7707-aa09-4337c9f022e5'),
	('01a167a4-9e85-738c-9312-b8d8dc5aba72', '2026-10-23 07:23:24.165604+00', '2026-10-23 07:23:24.165617+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9e7a-7707-aa09-4337c9f022e5'),
	('01a167a4-9e94-755a-a0b5-88a5135e44e9', '2026-10-23 07:23:24.180899+00', '2026-10-23 07:23:24.180906+00', 55000, 0, '01a167a4-8808-713c-9100-35a913322c6a', '01a167a4-9e92-7432-a629-453d33972f74'),
	('01a167a4-9e97-72b0-8599-73756c67931e', '2026-10-23 07:23:24.183479+00', '2026-10-23 07:23:24.183486+00', 0, 55000, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e92-7432-a629-453d33972f74'),
	('01a167a4-9ea2-7b43-8592-cead9d34a925', '2026-10-23 07:23:24.194407+00', '2026-10-23 07:23:24.194413+00', 55000, 0, '01a167a4-9d2f-75b6-95b9-a95e54943868', '01a167a4-9e9f-70d4-8a73-b084b1fec07a'),
	('01a167a4-9ea4-722b-9e21-dd724ccdf2b6', '2026-10-23 07:23:24.196866+00', '2026-10-23 07:23:24.196872+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9e9f-70d4-8a73-b084b1fec07a'),
	('01a167a4-9ea7-740b-a124-3c75d2fbda54', '2026-10-23 07:23:24.200049+00', '2026-10-23 07:23:24.200059+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9e9f-70d4-8a73-b084b1fec07a'),
	('01a167a4-9eb4-7c50-901a-4c1819dc3cbe', '2026-10-23 07:23:24.212865+00', '2026-10-23 07:23:24.212871+00', 50000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9eb2-780e-ade2-0e559843af04'),
	('01a167a4-9eb8-7c07-8751-4463732c6625', '2026-10-23 07:23:24.216398+00', '2026-10-23 07:23:24.216404+00', 0, 50000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9eb2-780e-ade2-0e559843af04'),
	('01a167a4-9ec1-7b07-a501-995c25422cbe', '2026-10-23 07:23:24.22555+00', '2026-10-23 07:23:24.225558+00', 50000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9ebf-701b-991a-8c2d75c355e0'),
	('01a167a4-9ec4-730f-88ca-04cfd8650b2c', '2026-10-23 07:23:24.228574+00', '2026-10-23 07:23:24.228582+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9ebf-701b-991a-8c2d75c355e0'),
	('01a167a4-9ec7-798c-b8e8-a42b279d99ad', '2026-10-23 07:23:24.231251+00', '2026-10-23 07:23:24.231262+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9ebf-701b-991a-8c2d75c355e0'),
	('01a167a4-9ed2-7dff-8218-4fed185a6f5a', '2026-10-23 07:23:24.242571+00', '2026-10-23 07:23:24.242579+00', 55000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9ed0-712f-a5c8-5c24ae9bb385'),
	('01a167a4-9ed5-7a85-abfc-32ffd3490ce1', '2026-10-23 07:23:24.245262+00', '2026-10-23 07:23:24.24527+00', 0, 55000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9ed0-712f-a5c8-5c24ae9bb385'),
	('01a167a4-9ede-7697-b1df-5d5e40da222f', '2026-10-23 07:23:24.254939+00', '2026-10-23 07:23:24.254947+00', 55000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9edc-7bad-971d-615e4e21f21b'),
	('01a167a4-9ee1-7718-bff2-711d553f3cb0', '2026-10-23 07:23:24.257746+00', '2026-10-23 07:23:24.257755+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9edc-7bad-971d-615e4e21f21b'),
	('01a167a4-9ee4-7772-839d-48a1df667e25', '2026-10-23 07:23:24.260494+00', '2026-10-23 07:23:24.260502+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9edc-7bad-971d-615e4e21f21b'),
	('01a167a4-9eef-73b1-89bc-6986ec1ff4e9', '2026-10-23 07:23:24.271842+00', '2026-10-23 07:23:24.271851+00', 45000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9eed-7d58-a0f4-2d67703064fb'),
	('01a167a4-9ef2-77f9-97a8-697280554089', '2026-10-23 07:23:24.274634+00', '2026-10-23 07:23:24.274643+00', 0, 45000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9eed-7d58-a0f4-2d67703064fb'),
	('01a167a4-9efb-7024-bf06-9c7b909c431d', '2026-10-23 07:23:24.28393+00', '2026-10-23 07:23:24.28394+00', 45000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9ef9-7683-8da7-a16065eb2cb8'),
	('01a167a4-9efe-7745-b79f-314d1fe94fd1', '2026-10-23 07:23:24.287108+00', '2026-10-23 07:23:24.287118+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9ef9-7683-8da7-a16065eb2cb8'),
	('01a167a4-9f02-7348-8b94-214a588ae450', '2026-10-23 07:23:24.290526+00', '2026-10-23 07:23:24.290537+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9ef9-7683-8da7-a16065eb2cb8'),
	('01a167a4-9f0f-70fb-bddd-c84992ebc4f5', '2026-10-23 07:23:24.303225+00', '2026-10-23 07:23:24.303235+00', 50000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9f0c-7c18-95e2-646c4f9a7f77'),
	('01a167a4-9f12-70bc-bc9b-8f445c8a8e62', '2026-10-23 07:23:24.306265+00', '2026-10-23 07:23:24.306274+00', 0, 50000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f0c-7c18-95e2-646c4f9a7f77'),
	('01a167a4-9f1c-7a9d-9910-c40f2883d516', '2026-10-23 07:23:24.316687+00', '2026-10-23 07:23:24.316699+00', 50000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f1a-7e9e-b766-9e88350c7d4e'),
	('01a167a4-9f1f-7874-af49-0ea746a5cac4', '2026-10-23 07:23:24.31979+00', '2026-10-23 07:23:24.319799+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9f1a-7e9e-b766-9e88350c7d4e'),
	('01a167a4-9f23-704c-9068-de6cea2eedf0', '2026-10-23 07:23:24.323246+00', '2026-10-23 07:23:24.323255+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9f1a-7e9e-b766-9e88350c7d4e'),
	('01a167a4-9f30-72e3-96f9-63669f5e0c8e', '2026-10-23 07:23:24.336744+00', '2026-10-23 07:23:24.336754+00', 55000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9f2e-7573-be06-dc8c57220e16'),
	('01a167a4-9f36-7c4e-a126-a8e0838ac1e3', '2026-10-23 07:23:24.342655+00', '2026-10-23 07:23:24.342665+00', 0, 55000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f2e-7573-be06-dc8c57220e16'),
	('01a167a4-9f44-7b04-9c6b-363cc6c11e82', '2026-10-23 07:23:24.357039+00', '2026-10-23 07:23:24.357053+00', 55000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f41-7890-bee9-5a1d0c339d6f'),
	('01a167a4-9f49-7821-acc4-7bdd16ce410b', '2026-10-23 07:23:24.361206+00', '2026-10-23 07:23:24.361218+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9f41-7890-bee9-5a1d0c339d6f'),
	('01a167a4-9f4d-7ea0-b21f-0f13f623074d', '2026-10-23 07:23:24.365606+00', '2026-10-23 07:23:24.36562+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9f41-7890-bee9-5a1d0c339d6f'),
	('01a167a4-9f5e-7fa2-a90c-e08eaacd2421', '2026-10-23 07:23:24.382583+00', '2026-10-23 07:23:24.382596+00', 45000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9f5b-743d-a7db-0e2318426ca2'),
	('01a167a4-9f61-72eb-8149-d66cbe74893b', '2026-10-23 07:23:24.386093+00', '2026-10-23 07:23:24.386103+00', 0, 45000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f5b-743d-a7db-0e2318426ca2'),
	('01a167a4-9f6e-7817-a0de-623886a1467e', '2026-10-23 07:23:24.398534+00', '2026-10-23 07:23:24.398545+00', 45000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f6b-7729-a6c7-c7a934a3e4e3'),
	('01a167a4-9f72-7541-bc4f-22c29e370e50', '2026-10-23 07:23:24.402407+00', '2026-10-23 07:23:24.402416+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9f6b-7729-a6c7-c7a934a3e4e3'),
	('01a167a4-9f76-7e88-b553-c12498a5695b', '2026-10-23 07:23:24.406173+00', '2026-10-23 07:23:24.406187+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9f6b-7729-a6c7-c7a934a3e4e3'),
	('01a167a4-9f8c-7e05-9336-e9d83338e1ec', '2026-10-23 07:23:24.42901+00', '2026-10-23 07:23:24.429018+00', 50000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9f89-7c6e-9c8f-eae07d0affbf'),
	('01a167a4-9f90-7295-b22f-032927e48207', '2026-10-23 07:23:24.433076+00', '2026-10-23 07:23:24.433086+00', 0, 50000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f89-7c6e-9c8f-eae07d0affbf'),
	('01a167a4-9f9e-79f5-ab9e-6b094dc45f85', '2026-10-23 07:23:24.4465+00', '2026-10-23 07:23:24.446513+00', 50000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9f9b-7364-af9f-3a0ce4a704c9'),
	('01a167a4-9fa2-77c4-828b-92178e7f1715', '2026-10-23 07:23:24.450478+00', '2026-10-23 07:23:24.450488+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9f9b-7364-af9f-3a0ce4a704c9'),
	('01a167a4-9fa6-746b-9d3c-bd76b9ccfbda', '2026-10-23 07:23:24.454798+00', '2026-10-23 07:23:24.45481+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9f9b-7364-af9f-3a0ce4a704c9'),
	('01a167a4-9fb3-74f8-9938-3607fd485b65', '2026-10-23 07:23:24.468104+00', '2026-10-23 07:23:24.468113+00', 55000, 0, '01a167a4-8979-7292-a2b2-5a16f8c723c6', '01a167a4-9fb1-7afa-9baa-6fb64abac2c0'),
	('01a167a4-9fb7-784d-90b2-6396049d1dde', '2026-10-23 07:23:24.472039+00', '2026-10-23 07:23:24.472048+00', 0, 55000, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9fb1-7afa-9baa-6fb64abac2c0'),
	('01a167a4-9fc2-75cd-93ab-a779351f40a0', '2026-10-23 07:23:24.482572+00', '2026-10-23 07:23:24.482583+00', 55000, 0, '01a167a4-9eb6-766a-a5ff-3ff692639093', '01a167a4-9fbf-79f9-9127-15741cbe1a4e'),
	('01a167a4-9fc8-7a59-952c-2794baf10eba', '2026-10-23 07:23:24.488644+00', '2026-10-23 07:23:24.488653+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9fbf-79f9-9127-15741cbe1a4e'),
	('01a167a4-9fcb-7e42-9585-b70825877330', '2026-10-23 07:23:24.491617+00', '2026-10-23 07:23:24.491628+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9fbf-79f9-9127-15741cbe1a4e'),
	('01a167a4-9fda-7b05-ada0-d3d97bc40767', '2026-10-23 07:23:24.507016+00', '2026-10-23 07:23:24.507025+00', 50000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-9fd8-7b06-b14b-95776a70fef0'),
	('01a167a4-9fe2-72a5-a9a1-73ccaf80a3be', '2026-10-23 07:23:24.515094+00', '2026-10-23 07:23:24.515106+00', 0, 50000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-9fd8-7b06-b14b-95776a70fef0'),
	('01a167a4-9ff0-71fa-b2b3-1d9eec2dc33c', '2026-10-23 07:23:24.528473+00', '2026-10-23 07:23:24.528488+00', 50000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-9fed-7937-af74-6907d2c7c56b'),
	('01a167a4-9ff4-7061-b225-61300cbcd149', '2026-10-23 07:23:24.532714+00', '2026-10-23 07:23:24.532725+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-9fed-7937-af74-6907d2c7c56b'),
	('01a167a4-9ff8-73d0-995a-41ce38ed138b', '2026-10-23 07:23:24.536921+00', '2026-10-23 07:23:24.536934+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-9fed-7937-af74-6907d2c7c56b'),
	('01a167a4-a007-7768-bc26-8224f1b3434d', '2026-10-23 07:23:24.551964+00', '2026-10-23 07:23:24.551975+00', 55000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a004-72de-928c-4191da4f5a99'),
	('01a167a4-a00c-7fd8-ab2d-e8b0bf123d44', '2026-10-23 07:23:24.556887+00', '2026-10-23 07:23:24.556915+00', 0, 55000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a004-72de-928c-4191da4f5a99'),
	('01a167a4-a019-7232-9725-3b6e4fbab79e', '2026-10-23 07:23:24.569734+00', '2026-10-23 07:23:24.569744+00', 55000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a016-7f3a-82ed-189bb1ff6a41'),
	('01a167a4-a01f-7340-aab8-cf76edc20b6d', '2026-10-23 07:23:24.575977+00', '2026-10-23 07:23:24.576+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a016-7f3a-82ed-189bb1ff6a41'),
	('01a167a4-a025-7bc9-a61c-a41cad72fc18', '2026-10-23 07:23:24.581693+00', '2026-10-23 07:23:24.581703+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a016-7f3a-82ed-189bb1ff6a41'),
	('01a167a4-a03a-7c5b-834e-e12da6cc97f3', '2026-10-23 07:23:24.602774+00', '2026-10-23 07:23:24.602789+00', 45000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a036-7a8d-ac13-349b0d3046d4'),
	('01a167a4-a042-7f0b-9118-86258fadb263', '2026-10-23 07:23:24.612299+00', '2026-10-23 07:23:24.612335+00', 0, 45000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a036-7a8d-ac13-349b0d3046d4'),
	('01a167a4-a05a-74c4-b310-840a9dbde441', '2026-10-23 07:23:24.635816+00', '2026-10-23 07:23:24.635831+00', 45000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a054-7aa7-9287-bcb60a291361'),
	('01a167a4-a060-733e-bd34-cf88135cc435', '2026-10-23 07:23:24.640971+00', '2026-10-23 07:23:24.640981+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a054-7aa7-9287-bcb60a291361'),
	('01a167a4-a063-7504-a98f-579e8a9226ea', '2026-10-23 07:23:24.644079+00', '2026-10-23 07:23:24.644126+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a054-7aa7-9287-bcb60a291361'),
	('01a167a4-a073-7279-afdf-cf80ceb8c9c6', '2026-10-23 07:23:24.659348+00', '2026-10-23 07:23:24.659365+00', 50000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a06f-79e5-bdd0-6e3e55c6554b'),
	('01a167a4-a077-7a9c-a34e-62ae45456967', '2026-10-23 07:23:24.663284+00', '2026-10-23 07:23:24.663296+00', 0, 50000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a06f-79e5-bdd0-6e3e55c6554b'),
	('01a167a4-a091-7339-a66e-2fc464f9d29e', '2026-10-23 07:23:24.689453+00', '2026-10-23 07:23:24.689465+00', 50000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a08b-7029-b522-a8abd0d3ad39'),
	('01a167a4-a096-7ca7-a772-ba04ca1542bb', '2026-10-23 07:23:24.695041+00', '2026-10-23 07:23:24.695066+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a08b-7029-b522-a8abd0d3ad39'),
	('01a167a4-a09d-701b-8d15-452d71fb1f8a', '2026-10-23 07:23:24.701972+00', '2026-10-23 07:23:24.701994+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a08b-7029-b522-a8abd0d3ad39'),
	('01a167a4-a0b4-716d-9723-460719553abd', '2026-10-23 07:23:24.724683+00', '2026-10-23 07:23:24.724705+00', 55000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a0af-7cf5-bde7-cf1aa0aa05af'),
	('01a167a4-a0be-7df5-b693-1cb6ee00b16f', '2026-10-23 07:23:24.735123+00', '2026-10-23 07:23:24.73515+00', 0, 55000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a0af-7cf5-bde7-cf1aa0aa05af'),
	('01a167a4-a0d3-7675-9d30-53f0e8ca02ef', '2026-10-23 07:23:24.756213+00', '2026-10-23 07:23:24.756235+00', 55000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a0cc-79c3-ac45-6a60a4a78a43'),
	('01a167a4-a0dc-7ccb-9ce5-a50ed2752c58', '2026-10-23 07:23:24.764272+00', '2026-10-23 07:23:24.764286+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a0cc-79c3-ac45-6a60a4a78a43'),
	('01a167a4-a0e4-7c4e-a617-86574189a9ae', '2026-10-23 07:23:24.772931+00', '2026-10-23 07:23:24.772955+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a0cc-79c3-ac45-6a60a4a78a43'),
	('01a167a4-a0fa-7133-94e8-a91cf1b320d2', '2026-10-23 07:23:24.794966+00', '2026-10-23 07:23:24.794986+00', 45000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a0f5-7913-819a-f603a582dc81'),
	('01a167a4-a102-75ac-81e7-5de68ece0ab6', '2026-10-23 07:23:24.803193+00', '2026-10-23 07:23:24.803217+00', 0, 45000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a0f5-7913-819a-f603a582dc81'),
	('01a167a4-a11a-7a12-8b45-097f4391ee43', '2026-10-23 07:23:24.826826+00', '2026-10-23 07:23:24.826847+00', 45000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a110-7e37-9936-17233c8b169f'),
	('01a167a4-a121-70f0-80a5-7f7e15874235', '2026-10-23 07:23:24.833283+00', '2026-10-23 07:23:24.833304+00', 0, 41860, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a110-7e37-9936-17233c8b169f'),
	('01a167a4-a128-7c23-926c-2fbb68408d3e', '2026-10-23 07:23:24.840962+00', '2026-10-23 07:23:24.840979+00', 0, 3140, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a110-7e37-9936-17233c8b169f'),
	('01a167a4-a143-7ca3-8e5d-92bfd60dc133', '2026-10-23 07:23:24.867764+00', '2026-10-23 07:23:24.867778+00', 50000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a13f-7530-9f8c-5d14140bcc86'),
	('01a167a4-a149-7b53-86a6-8d04f1092231', '2026-10-23 07:23:24.874026+00', '2026-10-23 07:23:24.874049+00', 0, 50000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a13f-7530-9f8c-5d14140bcc86'),
	('01a167a4-a166-715f-b7a0-9866dc16a311', '2026-10-23 07:23:24.902844+00', '2026-10-23 07:23:24.902855+00', 50000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a160-7c6b-8453-5d72424cb1a6'),
	('01a167a4-a16a-7a92-b030-6259ed596570', '2026-10-23 07:23:24.906312+00', '2026-10-23 07:23:24.906322+00', 0, 46512, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a160-7c6b-8453-5d72424cb1a6'),
	('01a167a4-a170-7929-8e6f-e14d825d1598', '2026-10-23 07:23:24.913105+00', '2026-10-23 07:23:24.913127+00', 0, 3488, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a160-7c6b-8453-5d72424cb1a6'),
	('01a167a4-a185-735a-a328-08c77226c409', '2026-10-23 07:23:24.934257+00', '2026-10-23 07:23:24.934278+00', 55000, 0, '01a167a4-8a79-7fca-9d9d-f21d398ac461', '01a167a4-a181-7bc2-8d60-eb7a46511aee'),
	('01a167a4-a18d-7024-9d6d-caafd4c61643', '2026-10-23 07:23:24.941732+00', '2026-10-23 07:23:24.941752+00', 0, 55000, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a181-7bc2-8d60-eb7a46511aee'),
	('01a167a4-a1a4-7393-b71e-85fd51068166', '2026-10-23 07:23:24.964326+00', '2026-10-23 07:23:24.964338+00', 55000, 0, '01a167a4-9fdd-7e6d-8d1a-d0b62b992463', '01a167a4-a19e-7f59-8802-faf4d5438a24'),
	('01a167a4-a1a8-7b8f-bf6f-6f054fc58f6a', '2026-10-23 07:23:24.969038+00', '2026-10-23 07:23:24.969049+00', 0, 51163, '01a167a4-8bff-77cf-89d8-5efd54e12b76', '01a167a4-a19e-7f59-8802-faf4d5438a24'),
	('01a167a4-a1ae-7e92-9717-ca233ce7aff5', '2026-10-23 07:23:24.974924+00', '2026-10-23 07:23:24.974936+00', 0, 3837, '01a167a4-8c01-791b-8fd5-d671e097cf38', '01a167a4-a19e-7f59-8802-faf4d5438a24');


--
-- Data for Name: finance_virtualaccount; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_virtualaccount VALUES
	('01a167a4-7843-787c-959d-095d3c0da2f0', '2026-10-23 07:23:14.372075+00', '2026-10-23 07:23:14.372088+00', '9910482910', 'Wema Bank', 'KURA / Ibrahim Musa', 'ACTIVE', '01a167a4-7806-7845-84c2-07dc98cf5ff8', 'seed-demo-dva', NULL, '', NULL, 0),
	('01a167a4-7bf0-7219-8b1b-76e9f7bcca15', '2026-10-23 07:23:15.312952+00', '2026-10-23 07:23:15.315233+00', '9910482911', 'Wema Bank', 'KURA / Fatima Okoro', 'ACTIVE', '01a167a4-7bde-7ce0-84c7-e7789e83448f', 'seed-pathb-dva', NULL, '', NULL, 0),
	('01a167a4-7cff-716a-b182-e04c72f01720', '2026-10-23 07:23:15.584005+00', '2026-10-23 07:23:15.584012+00', '1000082741', 'Wema Bank', 'KURA / Adeyemi Logistics (VCU fleet)', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', 'seed-dva-KR-FLEET-VCU', NULL, '', NULL, 0),
	('01a167a4-7e39-7fe2-9c61-e616bd34ea66', '2026-10-23 07:23:15.897144+00', '2026-10-23 07:23:15.897151+00', '1000097970', 'Wema Bank', 'KURA / Okonkwo Delivery (no telematics)', 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758', 'seed-dva-KR-FLEET-NOVCU', NULL, '', NULL, 0),
	('01a167a4-7ece-74c9-90ba-1a978ec31d4e', '2026-10-23 07:23:16.046676+00', '2026-10-23 07:23:16.046683+00', '1000069646', 'Wema Bank', 'KURA / Ada Rider', 'ACTIVE', '01a167a4-7ebb-755a-b831-72e5448454f4', 'seed-dva-KR-RIDER-01', NULL, '', NULL, 0),
	('01a167a4-7f1c-7ef4-b1c8-490cd2ba8d21', '2026-10-23 07:23:16.125047+00', '2026-10-23 07:23:16.125054+00', '1000069743', 'Wema Bank', 'KURA / Bola Rider', 'ACTIVE', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', 'seed-dva-KR-RIDER-02', NULL, '', NULL, 0),
	('01a167a4-7f7d-7e8f-9a0b-71a12617c3a7', '2026-10-23 07:23:16.221256+00', '2026-10-23 07:23:16.221264+00', '1000069840', 'Wema Bank', 'KURA / Chika Rider', 'ACTIVE', '01a167a4-7f6c-71b8-88a6-6e1743605298', 'seed-dva-KR-RIDER-03', NULL, '', NULL, 0),
	('01a167a4-7fca-78fe-9a12-8441c625b5da', '2026-10-23 07:23:16.299088+00', '2026-10-23 07:23:16.299097+00', '1000069937', 'Wema Bank', 'KURA / Dami Rider', 'ACTIVE', '01a167a4-7fbb-777e-9593-0f102470eebd', 'seed-dva-KR-RIDER-04', NULL, '', NULL, 0),
	('01a167a4-8017-7535-b217-0a7aadae132d', '2026-10-23 07:23:16.375227+00', '2026-10-23 07:23:16.375234+00', '1000070034', 'Wema Bank', 'KURA / Efe Rider', 'ACTIVE', '01a167a4-8006-7d28-8eb9-0fa045178cc0', 'seed-dva-KR-RIDER-05', NULL, '', NULL, 0),
	('01a167a4-806a-7272-a21d-07350fd203e1', '2026-10-23 07:23:16.458585+00', '2026-10-23 07:23:16.458593+00', '1000070131', 'Wema Bank', 'KURA / Femi Rider', 'ACTIVE', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', 'seed-dva-KR-RIDER-06', NULL, '', NULL, 0),
	('01a167a4-80b9-7518-b6d9-b3cf6bf9e71e', '2026-10-23 07:23:16.537738+00', '2026-10-23 07:23:16.537745+00', '1000070228', 'Wema Bank', 'KURA / Gani Rider', 'ACTIVE', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', 'seed-dva-KR-RIDER-07', NULL, '', NULL, 0),
	('01a167a4-8105-7e3e-8d57-a1dfb90dd6bc', '2026-10-23 07:23:16.61358+00', '2026-10-23 07:23:16.613587+00', '1000070325', 'Wema Bank', 'KURA / Hana Rider', 'ACTIVE', '01a167a4-80f9-7131-89f8-e074dc97447d', 'seed-dva-KR-RIDER-08', NULL, '', NULL, 0);


--
-- Data for Name: finance_wallet; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.finance_wallet VALUES
	('01a167a4-7bed-7d6c-996c-184ef8594c92', '2026-10-23 07:23:15.309961+00', '2026-10-23 07:23:15.309968+00', 0, 0, 'ACTIVE', '01a167a4-7bde-7ce0-84c7-e7789e83448f'),
	('01a167a4-7837-7847-b77a-a590df102c9f', '2026-10-23 07:23:14.359596+00', '2026-10-23 07:23:16.816759+00', 0, 0, 'ACTIVE', '01a167a4-7806-7845-84c2-07dc98cf5ff8'),
	('01a167a4-7ecc-74ca-9b6c-a5a75f520324', '2026-10-23 07:23:16.044489+00', '2026-10-23 07:23:22.044746+00', 0, 0, 'ACTIVE', '01a167a4-7ebb-755a-b831-72e5448454f4'),
	('01a167a4-8014-729c-b506-4f9fc708aa9e', '2026-10-23 07:23:16.372729+00', '2026-10-23 07:23:23.788292+00', 0, 0, 'ACTIVE', '01a167a4-8006-7d28-8eb9-0fa045178cc0'),
	('01a167a4-7cfd-798d-9bcc-096fd893e062', '2026-10-23 07:23:15.58144+00', '2026-10-23 07:23:20.66616+00', 0, 0, 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925'),
	('01a167a4-7f1a-73d2-b337-99104183a4e5', '2026-10-23 07:23:16.1229+00', '2026-10-23 07:23:22.490239+00', 0, 0, 'ACTIVE', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7'),
	('01a167a4-8065-7532-99c3-825764e697ad', '2026-10-23 07:23:16.453311+00', '2026-10-23 07:23:24.187991+00', 0, 0, 'ACTIVE', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe'),
	('01a167a4-7f7a-777e-8cd9-0db3268aad75', '2026-10-23 07:23:16.219083+00', '2026-10-23 07:23:23.123665+00', 0, 0, 'ACTIVE', '01a167a4-7f6c-71b8-88a6-6e1743605298'),
	('01a167a4-80b7-7c94-a160-9948d70eb1a0', '2026-10-23 07:23:16.535691+00', '2026-10-23 07:23:24.476451+00', 0, 0, 'ACTIVE', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb'),
	('01a167a4-7e36-7519-96b4-60201828456b', '2026-10-23 07:23:15.894978+00', '2026-10-23 07:23:21.487973+00', 0, 0, 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758'),
	('01a167a4-7fc8-7073-b4f2-9cf03fbf8e73', '2026-10-23 07:23:16.297032+00', '2026-10-23 07:23:23.404883+00', 0, 0, 'ACTIVE', '01a167a4-7fbb-777e-9593-0f102470eebd'),
	('01a167a4-8103-734b-9861-91e759dd59f0', '2026-10-23 07:23:16.611339+00', '2026-10-23 07:23:24.952686+00', 0, 0, 'ACTIVE', '01a167a4-80f9-7131-89f8-e074dc97447d');


--
-- Data for Name: integrations_pspwebhookevent; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.integrations_pspwebhookevent VALUES
	('01a167a4-a225-7719-b0a9-7e8df8b2c108', '2026-10-23 07:23:25.09407+00', '2026-10-23 07:23:25.094083+00', 'PAYSTACK', 'seed-evt-001', 'transfer.success', '{"n": 1, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a22b-76d6-9283-758643a33652', '2026-10-23 07:23:25.0996+00', '2026-10-23 07:23:25.099607+00', 'NOMBA', 'seed-evt-002', 'charge.failed', '{"n": 2, "seed": true}', 'IGNORED', ''),
	('01a167a4-a22d-7091-9068-4b2b091a55d2', '2026-10-23 07:23:25.10187+00', '2026-10-23 07:23:25.101878+00', 'PAYSTACK', 'seed-evt-003', 'refund.processed', '{"n": 3, "seed": true}', 'FAILED', ''),
	('01a167a4-a230-7838-afe8-43d1cacb00e5', '2026-10-23 07:23:25.104443+00', '2026-10-23 07:23:25.104452+00', 'NOMBA', 'seed-evt-004', 'charge.success', '{"n": 4, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a232-7702-813f-3688eaaeecff', '2026-10-23 07:23:25.106864+00', '2026-10-23 07:23:25.106872+00', 'PAYSTACK', 'seed-evt-005', 'transfer.success', '{"n": 5, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a235-7e30-af7e-48cc6c9d6f11', '2026-10-23 07:23:25.109393+00', '2026-10-23 07:23:25.109401+00', 'NOMBA', 'seed-evt-006', 'charge.failed', '{"n": 6, "seed": true}', 'IGNORED', ''),
	('01a167a4-a237-793e-a761-e847bf6412b0', '2026-10-23 07:23:25.111784+00', '2026-10-23 07:23:25.111793+00', 'PAYSTACK', 'seed-evt-007', 'refund.processed', '{"n": 7, "seed": true}', 'FAILED', 'signature'),
	('01a167a4-a239-712d-b24e-df3d2c0ea0db', '2026-10-23 07:23:25.114098+00', '2026-10-23 07:23:25.114108+00', 'NOMBA', 'seed-evt-008', 'charge.success', '{"n": 8, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a23c-7e9c-a441-c752825c661f', '2026-10-23 07:23:25.116407+00', '2026-10-23 07:23:25.116415+00', 'PAYSTACK', 'seed-evt-009', 'transfer.success', '{"n": 9, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a23e-7318-b2cb-7d69faff91bf', '2026-10-23 07:23:25.118724+00', '2026-10-23 07:23:25.118731+00', 'NOMBA', 'seed-evt-010', 'charge.failed', '{"n": 10, "seed": true}', 'IGNORED', ''),
	('01a167a4-a240-727f-9ded-563fbeec8736', '2026-10-23 07:23:25.12102+00', '2026-10-23 07:23:25.121027+00', 'PAYSTACK', 'seed-evt-011', 'refund.processed', '{"n": 11, "seed": true}', 'FAILED', ''),
	('01a167a4-a243-74dd-ac53-e03d7be38a24', '2026-10-23 07:23:25.123259+00', '2026-10-23 07:23:25.123267+00', 'NOMBA', 'seed-evt-012', 'charge.success', '{"n": 12, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a245-70fe-8877-b06787f6715b', '2026-10-23 07:23:25.125596+00', '2026-10-23 07:23:25.125603+00', 'PAYSTACK', 'seed-evt-013', 'transfer.success', '{"n": 13, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a247-7b9a-b469-3fb1d359223d', '2026-10-23 07:23:25.127921+00', '2026-10-23 07:23:25.127929+00', 'NOMBA', 'seed-evt-014', 'charge.failed', '{"n": 14, "seed": true}', 'IGNORED', 'signature'),
	('01a167a4-a24a-78ec-b90b-c9ef223dc2c2', '2026-10-23 07:23:25.130216+00', '2026-10-23 07:23:25.130224+00', 'PAYSTACK', 'seed-evt-015', 'refund.processed', '{"n": 15, "seed": true}', 'FAILED', ''),
	('01a167a4-a24c-7d08-bbf1-6a030ea56248', '2026-10-23 07:23:25.132555+00', '2026-10-23 07:23:25.132565+00', 'NOMBA', 'seed-evt-016', 'charge.success', '{"n": 16, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a24e-71f7-be3e-5eaa3090b5c8', '2026-10-23 07:23:25.134828+00', '2026-10-23 07:23:25.134835+00', 'PAYSTACK', 'seed-evt-017', 'transfer.success', '{"n": 17, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a250-7c2f-b5d4-3f258a8bfc24', '2026-10-23 07:23:25.137035+00', '2026-10-23 07:23:25.137043+00', 'NOMBA', 'seed-evt-018', 'charge.failed', '{"n": 18, "seed": true}', 'IGNORED', ''),
	('01a167a4-a253-7633-8f25-778f0dd45459', '2026-10-23 07:23:25.139247+00', '2026-10-23 07:23:25.139255+00', 'PAYSTACK', 'seed-evt-019', 'refund.processed', '{"n": 19, "seed": true}', 'FAILED', ''),
	('01a167a4-a255-79c0-9834-fb0df7a3bab0', '2026-10-23 07:23:25.141625+00', '2026-10-23 07:23:25.141634+00', 'NOMBA', 'seed-evt-020', 'charge.success', '{"n": 20, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a258-72d4-b094-fc9566a03115', '2026-10-23 07:23:25.144269+00', '2026-10-23 07:23:25.144279+00', 'PAYSTACK', 'seed-evt-021', 'transfer.success', '{"n": 21, "seed": true}', 'PROCESSED', 'signature'),
	('01a167a4-a25a-78ce-ad37-9dca2c3985c2', '2026-10-23 07:23:25.146869+00', '2026-10-23 07:23:25.146877+00', 'NOMBA', 'seed-evt-022', 'charge.failed', '{"n": 22, "seed": true}', 'IGNORED', ''),
	('01a167a4-a25d-7d6e-94e4-790bc093a73a', '2026-10-23 07:23:25.149509+00', '2026-10-23 07:23:25.149517+00', 'PAYSTACK', 'seed-evt-023', 'refund.processed', '{"n": 23, "seed": true}', 'FAILED', ''),
	('01a167a4-a25f-73c8-8d44-97a36c4db1b9', '2026-10-23 07:23:25.151944+00', '2026-10-23 07:23:25.151952+00', 'NOMBA', 'seed-evt-024', 'charge.success', '{"n": 24, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a262-76a1-87e8-21081f4e48b8', '2026-10-23 07:23:25.154698+00', '2026-10-23 07:23:25.154706+00', 'PAYSTACK', 'seed-evt-025', 'transfer.success', '{"n": 25, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a265-7faf-bccb-5b84052c57cb', '2026-10-23 07:23:25.157294+00', '2026-10-23 07:23:25.157302+00', 'NOMBA', 'seed-evt-026', 'charge.failed', '{"n": 26, "seed": true}', 'IGNORED', ''),
	('01a167a4-a267-7a77-adce-c05a960771cc', '2026-10-23 07:23:25.159645+00', '2026-10-23 07:23:25.159653+00', 'PAYSTACK', 'seed-evt-027', 'refund.processed', '{"n": 27, "seed": true}', 'FAILED', ''),
	('01a167a4-a269-7403-9ba0-70efe5738982', '2026-10-23 07:23:25.161975+00', '2026-10-23 07:23:25.161983+00', 'NOMBA', 'seed-evt-028', 'charge.success', '{"n": 28, "seed": true}', 'RECEIVED', 'signature'),
	('01a167a4-a26c-73a6-a7f4-c6c35201af61', '2026-10-23 07:23:25.164256+00', '2026-10-23 07:23:25.164263+00', 'PAYSTACK', 'seed-evt-029', 'transfer.success', '{"n": 29, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a26e-7e23-a1e5-f3f3811caaca', '2026-10-23 07:23:25.166649+00', '2026-10-23 07:23:25.166658+00', 'NOMBA', 'seed-evt-030', 'charge.failed', '{"n": 30, "seed": true}', 'IGNORED', ''),
	('01a167a4-a270-7f3d-9407-4286ca7e58bb', '2026-10-23 07:23:25.169028+00', '2026-10-23 07:23:25.169036+00', 'PAYSTACK', 'seed-evt-031', 'refund.processed', '{"n": 31, "seed": true}', 'FAILED', ''),
	('01a167a4-a273-7a77-a010-3599a0e07165', '2026-10-23 07:23:25.17123+00', '2026-10-23 07:23:25.171237+00', 'NOMBA', 'seed-evt-032', 'charge.success', '{"n": 32, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a275-7fc0-bce4-63402a2c7c03', '2026-10-23 07:23:25.173799+00', '2026-10-23 07:23:25.17381+00', 'PAYSTACK', 'seed-evt-033', 'transfer.success', '{"n": 33, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a278-76d7-a46b-a14f1c9b9c3b', '2026-10-23 07:23:25.176262+00', '2026-10-23 07:23:25.176271+00', 'NOMBA', 'seed-evt-034', 'charge.failed', '{"n": 34, "seed": true}', 'IGNORED', ''),
	('01a167a4-a27a-7240-86b9-1d1cbcad76a9', '2026-10-23 07:23:25.178696+00', '2026-10-23 07:23:25.178704+00', 'PAYSTACK', 'seed-evt-035', 'refund.processed', '{"n": 35, "seed": true}', 'FAILED', 'signature'),
	('01a167a4-a27c-76ad-9c24-7e84ae7993c4', '2026-10-23 07:23:25.181025+00', '2026-10-23 07:23:25.181034+00', 'NOMBA', 'seed-evt-036', 'charge.success', '{"n": 36, "seed": true}', 'RECEIVED', ''),
	('01a167a4-a27f-710d-98eb-804556a5dba1', '2026-10-23 07:23:25.183336+00', '2026-10-23 07:23:25.183344+00', 'PAYSTACK', 'seed-evt-037', 'transfer.success', '{"n": 37, "seed": true}', 'PROCESSED', ''),
	('01a167a4-a281-73d8-87c8-7f1c3193f847', '2026-10-23 07:23:25.185755+00', '2026-10-23 07:23:25.185763+00', 'NOMBA', 'seed-evt-038', 'charge.failed', '{"n": 38, "seed": true}', 'IGNORED', ''),
	('01a167a4-a284-7062-b037-203457a1a992', '2026-10-23 07:23:25.188289+00', '2026-10-23 07:23:25.188297+00', 'PAYSTACK', 'seed-evt-039', 'refund.processed', '{"n": 39, "seed": true}', 'FAILED', ''),
	('01a167a4-a286-7512-9191-d7490de6a537', '2026-10-23 07:23:25.190705+00', '2026-10-23 07:23:25.190713+00', 'NOMBA', 'seed-evt-040', 'charge.success', '{"n": 40, "seed": true}', 'RECEIVED', '');


--
-- Data for Name: mobility_batterytype; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_batterytype VALUES
	('01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '2026-10-23 07:23:14.380967+00', '2026-10-23 07:23:14.389443+00', 'Kura PowerCore 72V 45Ah', 'KURA Energy Labs', 3.24, 72, 'MOTORCYCLE', NULL, NULL, 'SIGNED', 'ACTIVE', 2900, 50);


--
-- Data for Name: mobility_battery; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_battery VALUES
	('01a167a4-7862-76d3-8640-b4e2838bdb02', '2026-10-23 07:23:14.402792+00', '2026-10-23 07:23:14.412081+00', 'BAT-YBA-01', 'AVAILABLE', 96, 97, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7868-762c-985d-4bec18963f4d', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-786f-7a60-8292-3f0957d4ccb5', '2026-10-23 07:23:14.41546+00', '2026-10-23 07:23:14.418685+00', 'BAT-YBA-02', 'AVAILABLE', 97, 97, 16, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7871-7325-915c-a4e6927c4585', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7874-7a92-a321-30b21b50d604', '2026-10-23 07:23:14.420941+00', '2026-10-23 07:23:14.423886+00', 'BAT-YBA-03', 'AVAILABLE', 98, 97, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7876-760c-8808-ac56bf0e4d6d', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-787a-7e01-824f-267221e2d1c1', '2026-10-23 07:23:14.426255+00', '2026-10-23 07:23:14.429993+00', 'BAT-YBA-04', 'AVAILABLE', 99, 97, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-787c-7d5e-8ca1-971462532f9e', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7880-7baf-86eb-f5e17ce19498', '2026-10-23 07:23:14.432661+00', '2026-10-23 07:23:14.436088+00', 'BAT-YBA-05', 'AVAILABLE', 100, 97, 19, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7882-782f-83fd-1e4a3332ee2f', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-788a-7236-953e-5bfce5e37181', '2026-10-23 07:23:14.442536+00', '2026-10-23 07:23:14.44728+00', 'BAT-YBA-06', 'AVAILABLE', 95, 97, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-788d-73dd-bbee-3b17e814cd2a', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7892-7cc9-9657-19c95561452d', '2026-10-23 07:23:14.450802+00', '2026-10-23 07:23:14.455716+00', 'BAT-YBA-07', 'AVAILABLE', 96, 97, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7896-77ae-bf51-fd1080a72106', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-789b-7828-8523-00ec0f65231a', '2026-10-23 07:23:14.460009+00', '2026-10-23 07:23:14.464962+00', 'BAT-YBA-08', 'AVAILABLE', 97, 97, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-789e-7af8-b431-8451509eddd9', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78a4-71fd-b753-6b4ed877fcd6', '2026-10-23 07:23:14.468699+00', '2026-10-23 07:23:14.47509+00', 'BAT-YBA-09', 'AVAILABLE', 98, 97, 23, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78a9-7c7e-97e6-ff94a9fe74e3', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78ae-7ecb-b157-952e4306338d', '2026-10-23 07:23:14.478345+00', '2026-10-23 07:23:14.481927+00', 'BAT-YBA-10', 'AVAILABLE', 99, 97, 24, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78b0-7287-814d-afc5dfecce41', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78b4-7cc7-a7ee-fc26c510092d', '2026-10-23 07:23:14.484288+00', '2026-10-23 07:23:14.496269+00', 'BAT-YBA-11', 'AVAILABLE', 100, 97, 25, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78b6-7f9b-8b4d-44132693e097', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78c6-74a8-ae29-72f3a6a6c57d', '2026-10-23 07:23:14.502553+00', '2026-10-23 07:23:14.507117+00', 'BAT-YBA-12', 'CHARGING', 83, 98, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78c9-73eb-8f4a-fb7e4ba65b4c', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78ce-71dd-bd46-5c96ab3fb18f', '2026-10-23 07:23:14.510312+00', '2026-10-23 07:23:14.514469+00', 'BAT-YBA-13', 'CHARGING', 87, 98, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78d1-7b95-92c9-3c00ba4c9877', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78d4-7122-bd74-cb817b44f200', '2026-10-23 07:23:14.516898+00', '2026-10-23 07:23:14.520278+00', 'BAT-YBA-14', 'CHARGING', 91, 98, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-78d7-7142-b913-15e5d3431fd1', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78e2-769e-9804-d9aa1fef0086', '2026-10-23 07:23:14.5311+00', '2026-10-23 07:23:14.536473+00', 'BAT-SUR-01', 'AVAILABLE', 96, 97, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-78e6-7188-bde3-d9d821b1560b', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78ed-75e2-b860-7dbe77e83e36', '2026-10-23 07:23:14.54142+00', '2026-10-23 07:23:14.546916+00', 'BAT-SUR-02', 'AVAILABLE', 97, 97, 16, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-78f0-7c0b-9822-868b60703704', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-78f6-777d-902d-b5086344beaa', '2026-10-23 07:23:14.551173+00', '2026-10-23 07:23:14.557628+00', 'BAT-SUR-03', 'AVAILABLE', 98, 97, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-78fb-76af-b531-c98e9d131e41', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7902-7695-b5b8-f8b2aa36d6ed', '2026-10-23 07:23:14.562506+00', '2026-10-23 07:23:14.568301+00', 'BAT-SUR-04', 'AVAILABLE', 99, 97, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-7905-71bc-8116-8d843cd27e61', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-790d-75a3-b63d-3171f2f50541', '2026-10-23 07:23:14.573681+00', '2026-10-23 07:23:14.579379+00', 'BAT-SUR-05', 'AVAILABLE', 100, 97, 19, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-7911-73ed-8686-b51355fc11d3', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7917-7436-a7dc-d9bfb96aa096', '2026-10-23 07:23:14.584268+00', '2026-10-23 07:23:14.589695+00', 'BAT-SUR-06', 'AVAILABLE', 95, 97, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-791b-7239-84d7-1a03ac1cbaa0', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7922-75f0-84a9-bcdc0a9480fa', '2026-10-23 07:23:14.594747+00', '2026-10-23 07:23:14.607937+00', 'BAT-SUR-07', 'AVAILABLE', 96, 97, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-792c-7319-b9ab-597377cc7a03', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7933-71b7-b2e9-2514266b5f64', '2026-10-23 07:23:14.611209+00', '2026-10-23 07:23:14.616414+00', 'BAT-SUR-08', 'AVAILABLE', 97, 97, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-7936-729f-bdaa-eb5b15a4d9b8', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-793b-743f-bf17-05aa1cdc3566', '2026-10-23 07:23:14.619381+00', '2026-10-23 07:23:14.622623+00', 'BAT-SUR-09', 'CHARGING', 71, 98, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-793d-7c81-baf7-e0fe65a88d5a', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7940-713c-a252-cb05cf3609f6', '2026-10-23 07:23:14.624986+00', '2026-10-23 07:23:14.627565+00', 'BAT-SUR-10', 'CHARGING', 75, 98, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-78dd-714d-a206-e1f0949f4bc8', '01a167a4-7942-7291-8a28-bdfbbab5fc19', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-794b-77db-a2d7-bd94fc42f19e', '2026-10-23 07:23:14.635908+00', '2026-10-23 07:23:14.639722+00', 'BAT-IKJ-01', 'AVAILABLE', 96, 97, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-794e-7e36-918d-a60dacf875e3', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7952-7522-8c96-11e0e581ff77', '2026-10-23 07:23:14.642358+00', '2026-10-23 07:23:14.648599+00', 'BAT-IKJ-02', 'AVAILABLE', 97, 97, 16, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7957-7974-b759-197fa31f9d1a', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-795b-7d68-ba50-b1000afa8ef9', '2026-10-23 07:23:14.651414+00', '2026-10-23 07:23:14.66474+00', 'BAT-IKJ-03', 'AVAILABLE', 98, 97, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7966-78f7-93a8-28e14ff1139a', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-796e-7056-b475-7f7547d7efe5', '2026-10-23 07:23:14.670947+00', '2026-10-23 07:23:14.675186+00', 'BAT-IKJ-04', 'AVAILABLE', 99, 97, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7971-78c1-a4d3-d444429e436b', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7975-7f66-9729-60819d67d381', '2026-10-23 07:23:14.677707+00', '2026-10-23 07:23:14.681316+00', 'BAT-IKJ-05', 'AVAILABLE', 100, 97, 19, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7978-710d-929e-c073b7a37e6c', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-797b-7303-be66-f37804a0109b', '2026-10-23 07:23:14.684049+00', '2026-10-23 07:23:14.68942+00', 'BAT-IKJ-06', 'AVAILABLE', 95, 97, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7980-799b-ac11-a9e67eed05de', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7983-7034-8d69-b8d7932fd232', '2026-10-23 07:23:14.691258+00', '2026-10-23 07:23:14.694036+00', 'BAT-IKJ-07', 'AVAILABLE', 96, 97, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7984-7a7b-aba4-30e204d52cb2', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7989-77d5-a2fd-0bcbcb34b010', '2026-10-23 07:23:14.697336+00', '2026-10-23 07:23:14.699751+00', 'BAT-IKJ-08', 'AVAILABLE', 97, 97, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-798a-7cba-a354-1f9b704d9edb', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-798e-7f18-9679-93cf57d1c0bd', '2026-10-23 07:23:14.702924+00', '2026-10-23 07:23:14.705104+00', 'BAT-IKJ-09', 'AVAILABLE', 98, 97, 23, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7990-7bae-930d-64d744ea695c', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7992-74b6-a5fc-a091a4de4b92', '2026-10-23 07:23:14.706838+00', '2026-10-23 07:23:14.709354+00', 'BAT-IKJ-10', 'AVAILABLE', 99, 97, 24, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7994-7144-b304-36de10944050', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7996-7393-a273-2d43e13acbe1', '2026-10-23 07:23:14.710961+00', '2026-10-23 07:23:14.713575+00', 'BAT-IKJ-11', 'AVAILABLE', 100, 97, 25, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-7998-7e94-9ac9-831a1ee89e78', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-799b-7f00-a5c1-023b51184e2f', '2026-10-23 07:23:14.715429+00', '2026-10-23 07:23:14.717693+00', 'BAT-IKJ-12', 'CHARGING', 83, 98, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-799c-7aca-acc2-ef8941feb395', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-799f-72af-940c-0366e6e32fda', '2026-10-23 07:23:14.719984+00', '2026-10-23 07:23:14.722551+00', 'BAT-IKJ-13', 'CHARGING', 87, 98, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-79a1-73c9-a88d-bb9b40038bef', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79a4-7120-a9ac-e4d35dbd9b60', '2026-10-23 07:23:14.724691+00', '2026-10-23 07:23:14.727797+00', 'BAT-IKJ-14', 'CHARGING', 91, 98, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7947-7871-97d7-5cc0fb487bd2', '01a167a4-79a6-7278-b11d-37fa22465b13', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79ae-7593-a319-a9a445ee3b9b', '2026-10-23 07:23:14.73501+00', '2026-10-23 07:23:14.738858+00', 'BAT-VI-01', 'AVAILABLE', 96, 97, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79b1-7356-95d0-9933466d57d5', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79b4-70a4-889f-877c1184ae69', '2026-10-23 07:23:14.74062+00', '2026-10-23 07:23:14.742741+00', 'BAT-VI-02', 'AVAILABLE', 97, 97, 16, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79b5-7a6a-b83d-3f6ea18b755a', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79b8-7961-bb10-9b49bc45cd87', '2026-10-23 07:23:14.744331+00', '2026-10-23 07:23:14.746485+00', 'BAT-VI-03', 'AVAILABLE', 98, 97, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79b9-7cc1-af53-a24ab8ef4adf', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79bc-745e-8485-fe5f5d8fa637', '2026-10-23 07:23:14.748136+00', '2026-10-23 07:23:14.750173+00', 'BAT-VI-04', 'AVAILABLE', 99, 97, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79bd-7a0f-89d4-c55fdf348a48', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79bf-70f6-8399-9f7970d62eb1', '2026-10-23 07:23:14.752102+00', '2026-10-23 07:23:14.754134+00', 'BAT-VI-05', 'AVAILABLE', 100, 97, 19, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79c1-7354-9fe6-5cc68d22cf0c', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79c4-7069-96e3-180a49885d79', '2026-10-23 07:23:14.75627+00', '2026-10-23 07:23:14.763304+00', 'BAT-VI-06', 'AVAILABLE', 95, 97, 20, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79ca-73df-beff-e97bccc365d8', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79cc-71be-ab5c-847cb427f9a5', '2026-10-23 07:23:14.764988+00', '2026-10-23 07:23:14.768373+00', 'BAT-VI-07', 'AVAILABLE', 96, 97, 21, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79cf-7b09-a0a6-0bc4ac99cb08', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-80bc-7938-a110-a78fbd95a388', '2026-10-23 07:23:16.540489+00', '2026-10-23 07:23:16.544414+00', 'BAT-D07LAG', 'ISSUED', 78, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79d2-7cde-adf1-ba9d1f86b510', '2026-10-23 07:23:14.770572+00', '2026-10-23 07:23:14.775089+00', 'BAT-VI-08', 'AVAILABLE', 97, 97, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79d5-70bb-a921-928f685f24bc', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79d9-721a-88ff-bc76cb66d0b6', '2026-10-23 07:23:14.778173+00', '2026-10-23 07:23:14.782015+00', 'BAT-VI-09', 'CHARGING', 71, 98, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79dc-719c-b257-1b33a7854c18', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-8107-77e0-aeda-c4012f6116ae', '2026-10-23 07:23:16.616105+00', '2026-10-23 07:23:16.619886+00', 'BAT-D08LAG', 'ISSUED', 62, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79df-7d8f-b05d-b466c7dd77d7', '2026-10-23 07:23:14.784139+00', '2026-10-23 07:23:14.78628+00', 'BAT-VI-10', 'CHARGING', 75, 98, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79ab-7d58-842a-da264f6efd82', '01a167a4-79e1-7f2c-a0c0-7d7283030e95', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79e9-7b2b-b2b5-9bbf53418a46', '2026-10-23 07:23:14.793616+00', '2026-10-23 07:23:14.79719+00', 'BAT-EPE-01', 'AVAILABLE', 96, 97, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-79eb-79b8-ba7c-6600b5fd273f', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79ef-72de-86ac-6855a9e94ddb', '2026-10-23 07:23:14.799173+00', '2026-10-23 07:23:14.802313+00', 'BAT-EPE-02', 'AVAILABLE', 97, 97, 16, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-79f1-7c9c-8aff-53fcf9be1d5e', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-79f9-71eb-978c-40076838b7d2', '2026-10-23 07:23:14.809656+00', '2026-10-23 07:23:14.81667+00', 'BAT-EPE-03', 'AVAILABLE', 98, 97, 17, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-79fe-7fa6-b4cd-932e85cedbd7', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7a03-7785-a6e6-daee9b98afb7', '2026-10-23 07:23:14.819462+00', '2026-10-23 07:23:14.823254+00', 'BAT-EPE-04', 'AVAILABLE', 99, 97, 18, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-7a06-75be-84f3-3671c6ee9fb4', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7a08-7e18-8716-a2b147442622', '2026-10-23 07:23:14.824978+00', '2026-10-23 07:23:14.827427+00', 'BAT-EPE-05', 'AVAILABLE', 100, 97, 19, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-7a0a-769a-93e3-bf122e2fd8cd', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7a0d-7daa-ae14-4db038a74a3e', '2026-10-23 07:23:14.829695+00', '2026-10-23 07:23:14.833583+00', 'BAT-EPE-06', 'CHARGING', 59, 98, 14, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-7a10-7c4f-8ad7-8248501eb20f', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7a13-7591-9276-0e77ba1462b9', '2026-10-23 07:23:14.835723+00', '2026-10-23 07:23:14.838808+00', 'BAT-EPE-07', 'CHARGING', 63, 98, 15, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-79e5-767b-a18f-24d9e5476e14', '01a167a4-7a15-7cba-b22e-64cba25c90fe', 'HUB_SLOT', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7a1e-7722-97b6-4c196feb13ec', '2026-10-23 07:23:14.846265+00', '2026-10-23 07:23:14.857268+00', 'BAT-MNT-8819', 'ISSUED', 68, 99, 22, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7a22-7d46-a453-ade13e8c6bb6', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7d03-77b4-b0e0-b5fcd9455a50', '2026-10-23 07:23:15.587192+00', '2026-10-23 07:23:15.596717+00', 'BAT-TVCU01', 'ISSUED', 93, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7d0e-760e-81b2-9686102ed6ba', '2026-10-23 07:23:15.599123+00', '2026-10-23 07:23:15.609965+00', 'BAT-TVCU02', 'ISSUED', 94, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7d20-7221-befa-d80ea966bfc8', '2026-10-23 07:23:15.617072+00', '2026-10-23 07:23:15.628447+00', 'BAT-TVCU03', 'ISSUED', 55, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7e3c-7a2f-94a5-c90c6a67a22f', '2026-10-23 07:23:15.901156+00', '2026-10-23 07:23:15.907105+00', 'BAT-ETNV01', 'ISSUED', 79, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7e44-75cb-85de-1700cd4217c6', '2026-10-23 07:23:15.908955+00', '2026-10-23 07:23:15.915135+00', 'BAT-ETNV02', 'ISSUED', 82, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7ed0-7506-92e4-5debd8e97491', '2026-10-23 07:23:16.049024+00', '2026-10-23 07:23:16.052838+00', 'BAT-D01LAG', 'ISSUED', 70, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7f1f-7d0b-af74-b5671d901d2a', '2026-10-23 07:23:16.128111+00', '2026-10-23 07:23:16.131818+00', 'BAT-D02LAG', 'ISSUED', 62, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7f7f-72cc-a506-79dc976ca4e9', '2026-10-23 07:23:16.223478+00', '2026-10-23 07:23:16.227368+00', 'BAT-D03LAG', 'ISSUED', 86, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-7fcd-7cb2-aac5-894324c82678', '2026-10-23 07:23:16.301608+00', '2026-10-23 07:23:16.305247+00', 'BAT-D04LAG', 'ISSUED', 62, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-8019-7b52-8c8b-98ec511f2b2a', '2026-10-23 07:23:16.377311+00', '2026-10-23 07:23:16.380808+00', 'BAT-D05LAG', 'ISSUED', 86, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL),
	('01a167a4-806d-782f-bb97-31747c92e809', '2026-10-23 07:23:16.461234+00', '2026-10-23 07:23:16.465772+00', 'BAT-D06LAG', 'ISSUED', 62, 97, 10, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'VEHICLE', NULL, NULL, '', 'MANUAL', NULL, NULL);


--
-- Data for Name: mobility_petrolengine; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_petrolengine VALUES
	('01a167a4-7bfd-793d-946c-b355d2e81c47', '2026-10-23 07:23:15.325244+00', '2026-10-23 07:23:15.330879+00', 'PE-YMH-15-8821', 'Yamaha', 'F15CMH', '15', 'FAIR', '["https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=960&q=80", "https://images.unsplash.com/photo-1646904748822-373f0fd5ea52?auto=format&fit=crop&w=960&q=80"]', 'STORED', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=640&q=80', NULL, '[]', '{"location": "Makoko waterside", "oem_serial": "6AHL-123456", "intake_notes": "Light oil seep at lower unit; photos logged."}', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7721-7980-b8ed-6cb600490387', NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', ''),
	('01a167a4-7c19-71ad-91fb-abb31b6b6b2f', '2026-10-23 07:23:15.353799+00', '2026-10-23 07:23:15.355796+00', 'PE-SUZ-40-1102', 'Suzuki', 'DF40A', '40', 'GOOD', '["https://images.unsplash.com/photo-1703181226028-b8845511bf59?auto=format&fit=crop&w=960&q=80"]', 'RELEASE_REQUESTED', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=640&q=80', NULL, '[]', '{"release_note": "Owner selling canoe — awaiting ops release"}', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7721-7980-b8ed-6cb600490387', NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', ''),
	('01a167a4-7c1d-755a-8d80-5d3da0588819', '2026-10-23 07:23:15.357469+00', '2026-10-23 07:23:15.359413+00', 'PE-YMH-40-4401', 'Yamaha', 'F40FETL', '40', 'POOR', '["https://images.unsplash.com/photo-1558980664-1db506751c6c?auto=format&fit=crop&w=960&q=80"]', 'RELEASED', 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=640&q=80', '2026-07-25 07:23:15.356581+00', '["https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=960&q=80"]', '{"disposition": "Returned to owner after plan exit"}', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-7721-7980-b8ed-6cb600490387', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7721-7980-b8ed-6cb600490387', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '');


--
-- Data for Name: mobility_plan; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_plan VALUES
	('01a167a4-7a2b-79f5-b59a-6a4c85fad5d7', '2026-10-23 07:23:14.859585+00', '2026-10-23 07:23:14.859592+00', 'PLAN-PAY-SWAP', 'Pay-per-swap', 'MOTORCYCLE', NULL, NULL, 45000, true, false, '', 'swap', 'ACTIVE'),
	('01a167a4-7a2f-72fb-bb22-9a71282a9add', '2026-10-23 07:23:14.863598+00', '2026-10-23 07:23:14.863607+00', 'PLAN-DAILY', 'Daily', 'MOTORCYCLE', 1, 2, 120000, true, false, '', 'day', 'ACTIVE'),
	('01a167a4-7a32-7d38-96a4-c59f9c0edeb8', '2026-10-23 07:23:14.866167+00', '2026-10-23 07:23:14.866174+00', 'PLAN-WEEKLY-UNLTD', 'Weekly', 'MOTORCYCLE', 7, NULL, 650000, true, false, '', 'week', 'ACTIVE'),
	('01a167a4-7a37-7a41-9334-679fbeeab062', '2026-10-23 07:23:14.871358+00', '2026-10-23 07:23:14.871366+00', 'PLAN-MONTHLY-FLEET', 'Monthly', 'MOTORCYCLE', 30, NULL, 2400000, true, false, '', 'month', 'ACTIVE'),
	('01a167a4-7a3b-7532-be27-80c73011831b', '2026-10-23 07:23:14.875811+00', '2026-10-23 07:23:14.875819+00', 'PLAN-TRI-PAY-SWAP', 'Pay-per-swap', 'TRICYCLE', NULL, NULL, 65000, true, false, '', 'swap', 'ACTIVE'),
	('01a167a4-7a41-72eb-a440-94931893d544', '2026-10-23 07:23:14.881302+00', '2026-10-23 07:23:14.881315+00', 'PLAN-TRI-DAILY', 'Daily', 'TRICYCLE', 1, 3, 180000, true, false, '', 'day', 'ACTIVE'),
	('01a167a4-7a43-7168-b2fc-d968678b669b', '2026-10-23 07:23:14.883996+00', '2026-10-23 07:23:14.884005+00', 'PLAN-TRI-WEEKLY', 'Weekly', 'TRICYCLE', 7, 18, 950000, true, false, '', 'week', 'ACTIVE'),
	('01a167a4-7a46-79d9-b3de-a779eb109f86', '2026-10-23 07:23:14.88663+00', '2026-10-23 07:23:14.886637+00', 'PLAN-TRI-MONTHLY', 'Monthly', 'TRICYCLE', 30, NULL, 3500000, true, false, '', 'month', 'ACTIVE'),
	('01a167a4-7a49-7f9e-9a66-af2d404e6d0d', '2026-10-23 07:23:14.889917+00', '2026-10-23 07:23:14.889926+00', 'PLAN-BOAT-PAY-SWAP', 'Pay-per-swap', 'BOAT', NULL, NULL, 120000, true, false, '', 'swap', 'ACTIVE'),
	('01a167a4-7a4c-7d2f-a955-23b22bb2816f', '2026-10-23 07:23:14.892556+00', '2026-10-23 07:23:14.892565+00', 'PLAN-BOAT-DAILY', 'Daily', 'BOAT', 1, 2, 350000, true, false, '', 'day', 'ACTIVE'),
	('01a167a4-7a4e-7e67-a6bc-6fa594300707', '2026-10-23 07:23:14.895062+00', '2026-10-23 07:23:14.89507+00', 'PLAN-BOAT-WEEKLY', 'Weekly', 'BOAT', 7, 12, 1800000, true, false, '', 'week', 'ACTIVE'),
	('01a167a4-7a52-70e1-a4c1-4b70e83b8cc6', '2026-10-23 07:23:14.898621+00', '2026-10-23 07:23:14.89863+00', 'PLAN-BOAT-MONTHLY', 'Monthly', 'BOAT', 30, NULL, 6500000, true, false, '', 'month', 'ACTIVE');


--
-- Data for Name: mobility_vehiclemodel; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_vehiclemodel VALUES
	('01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '2026-10-23 07:23:14.842591+00', '2026-10-23 07:23:14.842598+00', 'Silversun', 'Titan EV 72V', 'MOTORCYCLE', '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, NULL),
	('01a167a4-7bf5-7941-a4fb-0fbf348c6ae8', '2026-10-23 07:23:15.317261+00', '2026-10-23 07:23:15.317268+00', 'Silversun', 'Lagoon Canoe EB', 'BOAT', '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, NULL);


--
-- Data for Name: mobility_vehicle; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_vehicle VALUES
	('01a167a4-7a22-7d46-a453-ade13e8c6bb6', '2026-10-23 07:23:14.850776+00', '2026-10-23 07:23:14.850784+00', 'LAG-839-XY', 'ACTIVE', '01a167a4-7806-7845-84c2-07dc98cf5ff8', '01a167a4-7a1e-7722-97b6-4c196feb13ec', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', NULL, '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7bf7-7523-9ac4-92fc3709168c', '2026-10-23 07:23:15.319752+00', '2026-10-23 07:23:15.473399+00', 'MK-HULL-07', 'ACTIVE', '01a167a4-7bde-7ce0-84c7-e7789e83448f', NULL, '01a167a4-7bf5-7941-a4fb-0fbf348c6ae8', '', 'hw-makoko-mk07', 'KURA-BOAT-MK07', 'ENGINE_SWAP', '01a167a4-7bfd-793d-946c-b355d2e81c47', '8e97c5712fca67f3b5f4ad10ff0f06cf44243a25f2f4d75c0fff6ffe899810dc', NULL),
	('01a167a4-7d24-7bd5-a201-f614a6bd382f', '2026-10-23 07:23:15.620276+00', '2026-10-23 07:23:15.621923+00', 'FLEET-VCU-03', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7d20-7221-befa-d80ea966bfc8', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'VCU-HW-03', '', 'EV_FIRST', NULL, '8827883afdc66b32236ad06b9cf7cd4def10d1a2cc3f90a781db129945dbf104', NULL),
	('01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', '2026-10-23 07:23:15.589479+00', '2026-10-23 07:23:15.787025+00', 'FLEET-VCU-01', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7d03-77b4-b0e0-b5fcd9455a50', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'VCU-HW-01', '', 'EV_FIRST', NULL, 'cde73aa9e8b18436ee5d5df58618604616af170a0956a0a1af1cdc96b88c2459', '01a167a4-7d83-7427-869f-fb5645df586d'),
	('01a167a4-7d12-747d-96bb-0f8bf3bf8a54', '2026-10-23 07:23:15.602209+00', '2026-10-23 07:23:15.800018+00', 'FLEET-VCU-02', 'ACTIVE', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-7d0e-760e-81b2-9686102ed6ba', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'VCU-HW-02', '', 'EV_FIRST', NULL, '2be3276b6e0993d781face68ac16a897c06574caafb9b82c472518d129110dcd', '01a167a4-7dc2-7e7b-99b0-78aceac440c2'),
	('01a167a4-7e41-7191-98f0-ce0e80c19c48', '2026-10-23 07:23:15.905521+00', '2026-10-23 07:23:15.905531+00', 'FLEET-NV-01', 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-7e3c-7a2f-94a5-c90c6a67a22f', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-FLEET-NV-01', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7e47-7eaa-933d-972bd39f1638', '2026-10-23 07:23:15.911194+00', '2026-10-23 07:23:15.911201+00', 'FLEET-NV-02', 'ACTIVE', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-7e44-75cb-85de-1700cd4217c6', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-FLEET-NV-02', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7ed3-7e50-ba34-f56136b6667c', '2026-10-23 07:23:16.05119+00', '2026-10-23 07:23:16.051197+00', 'RID-01-LAG', 'ACTIVE', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-7ed0-7506-92e4-5debd8e97491', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-01-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7f22-7569-ad5e-42906c0b6c29', '2026-10-23 07:23:16.130337+00', '2026-10-23 07:23:16.130344+00', 'RID-02-LAG', 'ACTIVE', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-7f1f-7d0b-af74-b5671d901d2a', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-02-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7f81-76f8-9450-3747ce5a3d64', '2026-10-23 07:23:16.225968+00', '2026-10-23 07:23:16.225976+00', 'RID-03-LAG', 'ACTIVE', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-7f7f-72cc-a506-79dc976ca4e9', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-03-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-7fcf-75e7-801e-908c166781cd', '2026-10-23 07:23:16.303808+00', '2026-10-23 07:23:16.303816+00', 'RID-04-LAG', 'ACTIVE', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-7fcd-7cb2-aac5-894324c82678', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-04-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-801b-7646-a9e2-71bf35ffc06e', '2026-10-23 07:23:16.379456+00', '2026-10-23 07:23:16.379464+00', 'RID-05-LAG', 'ACTIVE', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-8019-7b52-8c8b-98ec511f2b2a', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-05-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-8070-7711-aee6-0eb7f63a0c64', '2026-10-23 07:23:16.46427+00', '2026-10-23 07:23:16.464278+00', 'RID-06-LAG', 'ACTIVE', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-806d-782f-bb97-31747c92e809', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-06-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-80be-70f2-9c62-8700694a86d9', '2026-10-23 07:23:16.543007+00', '2026-10-23 07:23:16.543014+00', 'RID-07-LAG', 'ACTIVE', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-80bc-7938-a110-a78fbd95a388', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-07-LAG', '', 'EV_FIRST', NULL, '', NULL),
	('01a167a4-810a-77c2-aaf1-703aef0bb3e4', '2026-10-23 07:23:16.618409+00', '2026-10-23 07:23:16.618416+00', 'RID-08-LAG', 'ACTIVE', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-8107-77e0-aeda-c4012f6116ae', '01a167a4-7a1a-7c8e-a49b-7ea57338e92c', '', 'HW-RID-08-LAG', '', 'EV_FIRST', NULL, '', NULL);


--
-- Data for Name: mobility_reservation; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_reservation VALUES
	('01a167a4-7a5d-7139-9360-73f2ce6ebafd', '2026-10-23 07:23:14.909752+00', '2026-10-23 07:23:14.943443+00', 'KB-4921', 'CONFIRMED', 'PAYSTACK', '2026-10-23 07:41:14.943243+00', '01a167a4-7806-7845-84c2-07dc98cf5ff8', NULL, '01a167a4-781d-7709-bd5a-8457dd57fd58', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', '01a167a4-7a22-7d46-a453-ade13e8c6bb6', 0, '', 'APP', '', 0, '', 0);


--
-- Data for Name: mobility_subscription; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_swap; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_swap VALUES
	('01a167a4-8b90-7de4-861f-45a77d9f1071', '2026-10-23 07:23:19.32054+00', '2026-10-23 07:23:19.320564+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-01', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-22 07:23:19.302919+00', '', '2026-10-22 06:23:19.302919+00', '01a167a4-8bfc-7025-aba5-bdf58465316d', NULL),
	('01a167a4-8b91-7234-848d-54fc18049c74', '2026-10-23 07:23:19.421525+00', '2026-10-23 07:23:19.421543+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-02', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-21 07:23:19.302919+00', '', '2026-10-21 06:23:19.302919+00', '01a167a4-8c24-71d3-9332-5c08ed196b69', NULL),
	('01a167a4-8b92-7bd9-ba1f-8bad5690b8a8', '2026-10-23 07:23:19.503928+00', '2026-10-23 07:23:19.503957+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-03', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-20 07:23:19.302919+00', '', '2026-10-20 06:23:19.302919+00', '01a167a4-8c77-7b4f-8715-b120189965c3', NULL),
	('01a167a4-8b93-7f0c-b02c-6d02c566de41', '2026-10-23 07:23:19.585548+00', '2026-10-23 07:23:19.585578+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-04', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-19 07:23:19.302919+00', '', '2026-10-19 06:23:19.302919+00', '01a167a4-8cca-7b42-b43d-3705ce0e3a29', NULL),
	('01a167a4-8b94-764e-a61d-8b104617553a', '2026-10-23 07:23:19.679521+00', '2026-10-23 07:23:19.679565+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-05', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-18 07:23:19.302919+00', '', '2026-10-18 06:23:19.302919+00', '01a167a4-8d3c-7529-882b-1c10d5fa5d0c', NULL),
	('01a167a4-8b95-7865-a161-3ee59f5be80c', '2026-10-23 07:23:19.808801+00', '2026-10-23 07:23:19.808826+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-06', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-17 07:23:19.302919+00', '', '2026-10-17 06:23:19.302919+00', '01a167a4-8d9b-7069-9ebc-db2003d400c4', NULL),
	('01a167a4-8b96-7037-93ec-2b5745922e6d', '2026-10-23 07:23:19.851095+00', '2026-10-23 07:23:19.851104+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-07', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-16 07:23:19.302919+00', '', '2026-10-16 06:23:19.302919+00', '01a167a4-8dba-746c-bd50-b272947f1285', NULL),
	('01a167a4-8b97-7b1b-9591-a03d93306ce6', '2026-10-23 07:23:19.882768+00', '2026-10-23 07:23:19.882777+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-01-08', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a', 'HUB_APP', '2026-10-15 07:23:19.302919+00', '', '2026-10-15 06:23:19.302919+00', '01a167a4-8ddd-71f7-8953-d4f4a938af55', NULL),
	('01a167a4-8b98-7857-bdcb-9aaa9f6fd717', '2026-10-23 07:23:19.924694+00', '2026-10-23 07:23:19.924705+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-01', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-22 06:23:19.302919+00', '', '2026-10-22 05:23:19.302919+00', '01a167a4-8e07-7b58-80bc-fcaa78d3bf49', NULL),
	('01a167a4-8b99-7ed1-a25b-7bed2cd239b5', '2026-10-23 07:23:19.961992+00', '2026-10-23 07:23:19.962001+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-02', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-21 06:23:19.302919+00', '', '2026-10-21 05:23:19.302919+00', '01a167a4-8e2c-7749-982f-859e68b7e8ec', NULL),
	('01a167a4-8b9a-7732-a366-3f909d80df1e', '2026-10-23 07:23:19.999711+00', '2026-10-23 07:23:19.999722+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-03', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-20 06:23:19.302919+00', '', '2026-10-20 05:23:19.302919+00', '01a167a4-8e55-7a5a-bd75-18fba45394bd', NULL),
	('01a167a4-8b9b-7cea-a8db-254b6ceae07e', '2026-10-23 07:23:20.046895+00', '2026-10-23 07:23:20.046911+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-04', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-19 06:23:19.302919+00', '', '2026-10-19 05:23:19.302919+00', '01a167a4-8e8b-795e-945c-ed99d5686bba', NULL),
	('01a167a4-8b9c-7e74-a7ea-45b2c25ddd92', '2026-10-23 07:23:20.102798+00', '2026-10-23 07:23:20.102812+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-05', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-18 06:23:19.302919+00', '', '2026-10-18 05:23:19.302919+00', '01a167a4-8ec5-7031-9599-34b63a530f88', NULL),
	('01a167a4-8b9d-7bcb-8ec2-d63686b9ba75', '2026-10-23 07:23:20.160629+00', '2026-10-23 07:23:20.160638+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-06', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-17 06:23:19.302919+00', '', '2026-10-17 05:23:19.302919+00', '01a167a4-8ef3-73a9-bf66-8f57f2341a7a', NULL),
	('01a167a4-8b9e-78ed-a188-8e9a14dbbe67', '2026-10-23 07:23:20.195114+00', '2026-10-23 07:23:20.195122+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-07', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-16 06:23:19.302919+00', '', '2026-10-16 05:23:19.302919+00', '01a167a4-8f11-79ab-8e71-265310164147', NULL),
	('01a167a4-8b9f-7be9-8968-8472f1e8e5cf', '2026-10-23 07:23:20.224504+00', '2026-10-23 07:23:20.224512+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-02-08', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7d12-747d-96bb-0f8bf3bf8a54', 'HUB_APP', '2026-10-15 06:23:19.302919+00', '', '2026-10-15 05:23:19.302919+00', '01a167a4-8f31-75b2-a140-10c157e7d5cb', NULL),
	('01a167a4-8ba0-7320-bf1b-f860465505d6', '2026-10-23 07:23:20.256371+00', '2026-10-23 07:23:20.256382+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-01', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-22 05:23:19.302919+00', '', '2026-10-22 04:23:19.302919+00', '01a167a4-8f50-710e-9209-cb7876834b5e', NULL),
	('01a167a4-8ba1-770b-97b5-56c1b927bfda', '2026-10-23 07:23:20.289141+00', '2026-10-23 07:23:20.289157+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-02', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-21 05:23:19.302919+00', '', '2026-10-21 04:23:19.302919+00', '01a167a4-8f76-763c-8bd8-5234aa38f9b5', NULL),
	('01a167a4-8ba2-757f-b2ef-76ffa5567b97', '2026-10-23 07:23:20.332542+00', '2026-10-23 07:23:20.332553+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-03', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-20 05:23:19.302919+00', '', '2026-10-20 04:23:19.302919+00', '01a167a4-8fa4-7268-b679-2b279321986a', NULL),
	('01a167a4-8ba3-7a12-9908-e9f86c8d66d5', '2026-10-23 07:23:20.380998+00', '2026-10-23 07:23:20.381017+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-04', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-19 05:23:19.302919+00', '', '2026-10-19 04:23:19.302919+00', '01a167a4-8fd4-7c49-8851-9155bfcc527a', NULL),
	('01a167a4-8ba4-7d93-a5b0-c9917254cdf1', '2026-10-23 07:23:20.432476+00', '2026-10-23 07:23:20.43249+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-05', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-18 05:23:19.302919+00', '', '2026-10-18 04:23:19.302919+00', '01a167a4-900d-7da9-896a-dd4a47fce3c3', NULL),
	('01a167a4-8ba5-7331-ad86-12e497459b37', '2026-10-23 07:23:20.488936+00', '2026-10-23 07:23:20.488951+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-06', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-17 05:23:19.302919+00', '', '2026-10-17 04:23:19.302919+00', '01a167a4-9049-7dde-b9a8-3109aa8dd43d', NULL),
	('01a167a4-8ba6-7e07-9065-016213cc34d6', '2026-10-23 07:23:20.551536+00', '2026-10-23 07:23:20.55155+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-07', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-16 05:23:19.302919+00', '', '2026-10-16 04:23:19.302919+00', '01a167a4-9089-7eaa-9de9-e1b441fde44e', NULL),
	('01a167a4-8ba7-77cf-a6fe-1f84128b04b7', '2026-10-23 07:23:20.622177+00', '2026-10-23 07:23:20.622192+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-VCU-03-08', '01a167a4-7cef-7505-9b73-a3569914f925', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7d24-7bd5-a201-f614a6bd382f', 'HUB_APP', '2026-10-15 05:23:19.302919+00', '', '2026-10-15 04:23:19.302919+00', '01a167a4-90dd-7b11-ba35-3e312c52192b', NULL),
	('01a167a4-8ba8-71eb-91e5-bd969c11e853', '2026-10-23 07:23:20.71565+00', '2026-10-23 07:23:20.715669+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-01', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-22 04:23:19.302919+00', '', '2026-10-22 03:23:19.302919+00', '01a167a4-912d-7197-91a4-4353d9e36ff4', NULL),
	('01a167a4-8ba9-70ae-9639-be235691590b', '2026-10-23 07:23:20.784819+00', '2026-10-23 07:23:20.784843+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-02', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-21 04:23:19.302919+00', '', '2026-10-21 03:23:19.302919+00', '01a167a4-9182-72af-9b29-6b6cdbe1b6b0', NULL),
	('01a167a4-8baa-7226-8fa9-85209f93c6e5', '2026-10-23 07:23:20.858927+00', '2026-10-23 07:23:20.858936+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-03', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-20 04:23:19.302919+00', '', '2026-10-20 03:23:19.302919+00', '01a167a4-91ad-79b7-8042-047aadbd13cc', NULL),
	('01a167a4-8bab-79e2-bed3-45757022fcfc', '2026-10-23 07:23:20.893805+00', '2026-10-23 07:23:20.893813+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-04', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-19 04:23:19.302919+00', '', '2026-10-19 03:23:19.302919+00', '01a167a4-91cc-750f-aba1-3dfb019ef350', NULL),
	('01a167a4-8bac-791f-a3a9-57de6392a1c2', '2026-10-23 07:23:20.922547+00', '2026-10-23 07:23:20.92256+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-05', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-18 04:23:19.302919+00', '', '2026-10-18 03:23:19.302919+00', '01a167a4-91ea-7644-b162-a507d9ecca54', NULL),
	('01a167a4-8bad-747b-adb0-d379700f49e6', '2026-10-23 07:23:20.953245+00', '2026-10-23 07:23:20.953253+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-06', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-17 04:23:19.302919+00', '', '2026-10-17 03:23:19.302919+00', '01a167a4-9208-788a-b8ef-3e5fc58dd203', NULL),
	('01a167a4-8bae-7d07-807b-2b1c301afd26', '2026-10-23 07:23:20.982956+00', '2026-10-23 07:23:20.982965+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-07', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-16 04:23:19.302919+00', '', '2026-10-16 03:23:19.302919+00', '01a167a4-9227-733d-996f-002123856c88', NULL),
	('01a167a4-8baf-7a15-b8f3-8954b0b2721b', '2026-10-23 07:23:21.016308+00', '2026-10-23 07:23:21.016318+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-01-08', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7e41-7191-98f0-ce0e80c19c48', 'HUB_APP', '2026-10-15 04:23:19.302919+00', '', '2026-10-15 03:23:19.302919+00', '01a167a4-924a-7c04-b2aa-e3b0843c19c8', NULL),
	('01a167a4-8bb0-7adc-9685-c3b37d1cc1c3', '2026-10-23 07:23:21.053451+00', '2026-10-23 07:23:21.053461+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-01', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-22 03:23:19.302919+00', '', '2026-10-22 02:23:19.302919+00', '01a167a4-9272-7c8b-86f1-24dbcb3a162f', NULL),
	('01a167a4-8bb1-7ebe-a76b-9be13289e4d2', '2026-10-23 07:23:21.094357+00', '2026-10-23 07:23:21.094368+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-02', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-21 03:23:19.302919+00', '', '2026-10-21 02:23:19.302919+00', '01a167a4-929e-7a48-9df2-358364dc58f0', NULL),
	('01a167a4-8bb2-79ac-8c75-e766921282c3', '2026-10-23 07:23:21.142628+00', '2026-10-23 07:23:21.142638+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-03', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-20 03:23:19.302919+00', '', '2026-10-20 02:23:19.302919+00', '01a167a4-92de-7990-a35a-f8afabdb1abb', NULL),
	('01a167a4-8bb3-7608-8674-20cb5aa96d26', '2026-10-23 07:23:21.21808+00', '2026-10-23 07:23:21.218096+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-04', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-19 03:23:19.302919+00', '', '2026-10-19 02:23:19.302919+00', '01a167a4-931e-70e6-b16c-01894aa3f2a4', NULL),
	('01a167a4-8bb4-7a94-be99-73f1c63fe2a9', '2026-10-23 07:23:21.286491+00', '2026-10-23 07:23:21.286505+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-05', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-18 03:23:19.302919+00', '', '2026-10-18 02:23:19.302919+00', '01a167a4-9363-7d0b-a13e-866ab734a4b8', NULL),
	('01a167a4-8bb5-7d54-b1f2-02c8277c98e5', '2026-10-23 07:23:21.344761+00', '2026-10-23 07:23:21.344781+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-06', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-17 03:23:19.302919+00', '', '2026-10-17 02:23:19.302919+00', '01a167a4-9399-78d2-a07f-700e4896e676', NULL),
	('01a167a4-8bb6-7030-9976-b9b680e2a49a', '2026-10-23 07:23:21.402689+00', '2026-10-23 07:23:21.402701+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-07', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-16 03:23:19.302919+00', '', '2026-10-16 02:23:19.302919+00', '01a167a4-93dd-7b0f-b8a6-5c6c96df84c3', NULL),
	('01a167a4-8bb7-7d27-9538-2def0cc8feaa', '2026-10-23 07:23:21.462358+00', '2026-10-23 07:23:21.462376+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-FLEET-NV-02-08', '01a167a4-7e21-77a9-92f4-6bcf3d154758', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7e84-77e4-9908-3555dc283c0d', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-7e47-7eaa-933d-972bd39f1638', 'HUB_APP', '2026-10-15 03:23:19.302919+00', '', '2026-10-15 02:23:19.302919+00', '01a167a4-9412-7a85-8edc-3356629b22b7', NULL),
	('01a167a4-8bb8-716e-838c-cb5785200027', '2026-10-23 07:23:21.52578+00', '2026-10-23 07:23:21.525795+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-01', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-22 07:23:19.302919+00', '', '2026-10-22 06:23:19.302919+00', '01a167a4-9466-75bc-8779-a65e915a602f', NULL),
	('01a167a4-8bb9-71d8-baf0-fca40df7a058', '2026-10-23 07:23:21.609872+00', '2026-10-23 07:23:21.609884+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-02', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-21 07:23:19.302919+00', '', '2026-10-21 06:23:19.302919+00', '01a167a4-94ac-71f4-8a34-954cacbdefe0', NULL),
	('01a167a4-8bba-7c0d-8759-757c1f030104', '2026-10-23 07:23:21.682396+00', '2026-10-23 07:23:21.682417+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-03', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-20 07:23:19.302919+00', '', '2026-10-20 06:23:19.302919+00', '01a167a4-94f4-7c17-847a-4e2839226fa5', NULL),
	('01a167a4-8bbb-7041-84a8-0e6acd9ea5cd', '2026-10-23 07:23:21.753025+00', '2026-10-23 07:23:21.753043+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-04', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-19 07:23:19.302919+00', '', '2026-10-19 06:23:19.302919+00', '01a167a4-954e-7e7a-9c12-36d41e9f17de', NULL),
	('01a167a4-8bbc-7ea4-b1a5-d9d4fc985700', '2026-10-23 07:23:21.853414+00', '2026-10-23 07:23:21.853444+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-05', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-18 07:23:19.302919+00', '', '2026-10-18 06:23:19.302919+00', '01a167a4-95a6-757c-9cbb-c9c041ad55fa', NULL),
	('01a167a4-8bbd-770a-840c-79ff4f66d4b9', '2026-10-23 07:23:21.911576+00', '2026-10-23 07:23:21.911585+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-06', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-17 07:23:19.302919+00', '', '2026-10-17 06:23:19.302919+00', '01a167a4-95cd-7525-860c-03ef0827cc10', NULL),
	('01a167a4-8bbe-7b03-a04e-db3637c536eb', '2026-10-23 07:23:21.954925+00', '2026-10-23 07:23:21.954935+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-07', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-16 07:23:19.302919+00', '', '2026-10-16 06:23:19.302919+00', '01a167a4-95f4-7bf8-8515-45b79c8fd4f6', NULL),
	('01a167a4-8bbf-7a58-9769-1e8b60007e09', '2026-10-23 07:23:21.996445+00', '2026-10-23 07:23:21.996458+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-01-LAG-08', '01a167a4-7ebb-755a-b831-72e5448454f4', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7ec3-7e89-b409-c055b70c07de', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-7ed3-7e50-ba34-f56136b6667c', 'HUB_APP', '2026-10-15 07:23:19.302919+00', '', '2026-10-15 06:23:19.302919+00', '01a167a4-963f-7906-8b94-d0682d0394af', NULL),
	('01a167a4-8bc0-7e18-843d-6ac440998dbd', '2026-10-23 07:23:22.074363+00', '2026-10-23 07:23:22.074372+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-01', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-22 06:23:19.302919+00', '', '2026-10-22 05:23:19.302919+00', '01a167a4-967b-71a1-a9a1-cb0901669e69', NULL),
	('01a167a4-8bc1-7f98-a9e3-45127bcc716d', '2026-10-23 07:23:22.137498+00', '2026-10-23 07:23:22.137509+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-02', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-21 06:23:19.302919+00', '', '2026-10-21 05:23:19.302919+00', '01a167a4-96af-7fcc-9aa8-39e2c893c373', NULL),
	('01a167a4-8bc2-786f-a4fb-c5248f5ba585', '2026-10-23 07:23:22.175683+00', '2026-10-23 07:23:22.175695+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-03', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-20 06:23:19.302919+00', '', '2026-10-20 05:23:19.302919+00', '01a167a4-96db-7aa0-8fde-7aa242a0f38d', NULL),
	('01a167a4-8bc3-7261-a5d8-72ad0570a15a', '2026-10-23 07:23:22.230548+00', '2026-10-23 07:23:22.230557+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-04', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-19 06:23:19.302919+00', '', '2026-10-19 05:23:19.302919+00', '01a167a4-9712-7368-b9e9-78058a8fe451', NULL),
	('01a167a4-8bc4-72fa-a91a-4dd8a3756c95', '2026-10-23 07:23:22.272941+00', '2026-10-23 07:23:22.272952+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-05', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-18 06:23:19.302919+00', '', '2026-10-18 05:23:19.302919+00', '01a167a4-973f-7f98-b287-b3dd1fd4b063', NULL),
	('01a167a4-8bc5-763a-bfd0-ea8de63a3344', '2026-10-23 07:23:22.346153+00', '2026-10-23 07:23:22.346188+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-06', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-17 06:23:19.302919+00', '', '2026-10-17 05:23:19.302919+00', '01a167a4-978d-77fd-bbe6-5b3e4e78c7e7', NULL),
	('01a167a4-8bc6-75ee-bb57-f82bdb305b52', '2026-10-23 07:23:22.413116+00', '2026-10-23 07:23:22.413155+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-07', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-16 06:23:19.302919+00', '', '2026-10-16 05:23:19.302919+00', '01a167a4-97cd-7614-89e4-a31c50f17be2', NULL),
	('01a167a4-8bc7-7d01-8f6d-7e3e2f0c5095', '2026-10-23 07:23:22.469895+00', '2026-10-23 07:23:22.469907+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-02-LAG-08', '01a167a4-7f0c-70f2-afdf-89e0dab1f4e7', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f11-71c3-ac5a-b9691b3e9d9e', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-7f22-7569-ad5e-42906c0b6c29', 'HUB_APP', '2026-10-15 06:23:19.302919+00', '', '2026-10-15 05:23:19.302919+00', '01a167a4-97fb-79b6-8ceb-83d41d16640c', NULL),
	('01a167a4-8bc8-781b-b16b-8824cf8cf608', '2026-10-23 07:23:22.520712+00', '2026-10-23 07:23:22.520722+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-01', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-22 05:23:19.302919+00', '', '2026-10-22 04:23:19.302919+00', '01a167a4-982c-7ea4-96e5-1e15c53d39e3', NULL),
	('01a167a4-8bc9-7232-b2e4-e974694da0e4', '2026-10-23 07:23:22.561126+00', '2026-10-23 07:23:22.561142+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-02', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-21 05:23:19.302919+00', '', '2026-10-21 04:23:19.302919+00', '01a167a4-9859-71a8-be38-03bb0fc2b7eb', NULL),
	('01a167a4-8bca-7646-b480-4a255644042e', '2026-10-23 07:23:22.633725+00', '2026-10-23 07:23:22.633749+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-03', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-20 05:23:19.302919+00', '', '2026-10-20 04:23:19.302919+00', '01a167a4-98ed-7c0a-8573-1a55b5fe694b', NULL),
	('01a167a4-8bcb-7292-8ad6-16963ea79d54', '2026-10-23 07:23:22.79931+00', '2026-10-23 07:23:22.799322+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-04', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-19 05:23:19.302919+00', '', '2026-10-19 04:23:19.302919+00', '01a167a4-994e-73da-bdd2-535fe3f7169b', NULL),
	('01a167a4-8bcc-7ab9-bfe6-81b24515529d', '2026-10-23 07:23:22.853636+00', '2026-10-23 07:23:22.853646+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-05', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-18 05:23:19.302919+00', '', '2026-10-18 04:23:19.302919+00', '01a167a4-9993-7a47-bc0b-9e2e0fbb889f', NULL),
	('01a167a4-8bcd-7658-8aa4-a0e4c570d5fa', '2026-10-23 07:23:22.987612+00', '2026-10-23 07:23:22.987623+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-06', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-17 05:23:19.302919+00', '', '2026-10-17 04:23:19.302919+00', '01a167a4-9a00-72c3-b4ce-a10043f64364', NULL),
	('01a167a4-8bce-7051-822c-301572288efc', '2026-10-23 07:23:23.028037+00', '2026-10-23 07:23:23.028047+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-07', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-16 05:23:19.302919+00', '', '2026-10-16 04:23:19.302919+00', '01a167a4-9a3e-7c8a-b61a-21b53321cd14', NULL),
	('01a167a4-8bcf-727b-a3b8-ebf38914dee7', '2026-10-23 07:23:23.096671+00', '2026-10-23 07:23:23.096683+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-03-LAG-08', '01a167a4-7f6c-71b8-88a6-6e1743605298', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7f73-7d10-a099-0093c0d03192', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-7f81-76f8-9450-3747ce5a3d64', 'HUB_APP', '2026-10-15 05:23:19.302919+00', '', '2026-10-15 04:23:19.302919+00', '01a167a4-9a75-7e72-838b-31baab9822fd', NULL),
	('01a167a4-8bd0-799e-81e7-c5b7669406f2', '2026-10-23 07:23:23.147833+00', '2026-10-23 07:23:23.147844+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-01', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-22 04:23:19.302919+00', '', '2026-10-22 03:23:19.302919+00', '01a167a4-9aa3-7f1b-b8ca-fea760624897', NULL),
	('01a167a4-8bd1-74fa-99f5-ea9c2dc85c78', '2026-10-23 07:23:23.187374+00', '2026-10-23 07:23:23.187382+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-02', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-21 04:23:19.302919+00', '', '2026-10-21 03:23:19.302919+00', '01a167a4-9ac2-78f0-8607-8c9f8cd4f0f1', NULL),
	('01a167a4-8bd2-7897-b4c1-e5f33994288d', '2026-10-23 07:23:23.218607+00', '2026-10-23 07:23:23.218616+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-03', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-20 04:23:19.302919+00', '', '2026-10-20 03:23:19.302919+00', '01a167a4-9ae6-7fd0-aa61-8c03b98d137b', NULL),
	('01a167a4-8bd3-77b8-bcb0-fa58f7ca4487', '2026-10-23 07:23:23.255776+00', '2026-10-23 07:23:23.255786+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-04', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-19 04:23:19.302919+00', '', '2026-10-19 03:23:19.302919+00', '01a167a4-9b09-74ea-aed0-6fd1899a1a34', NULL),
	('01a167a4-8bd4-796e-b1bd-04e3ee2f1c4a', '2026-10-23 07:23:23.291476+00', '2026-10-23 07:23:23.291484+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-05', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-18 04:23:19.302919+00', '', '2026-10-18 03:23:19.302919+00', '01a167a4-9b2a-7245-82d4-7bfdb7143523', NULL),
	('01a167a4-8bd5-761c-8ed1-c30b9aac7c73', '2026-10-23 07:23:23.320594+00', '2026-10-23 07:23:23.320602+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-06', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-17 04:23:19.302919+00', '', '2026-10-17 03:23:19.302919+00', '01a167a4-9b47-788d-ac43-0b7548060a89', NULL),
	('01a167a4-8bd6-70bb-a2ea-66b934ddf8eb', '2026-10-23 07:23:23.352508+00', '2026-10-23 07:23:23.352518+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-07', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-16 04:23:19.302919+00', '', '2026-10-16 03:23:19.302919+00', '01a167a4-9b6a-751a-bc32-4bd46920d559', NULL),
	('01a167a4-8bd7-762e-b988-7b2a60f213cb', '2026-10-23 07:23:23.386689+00', '2026-10-23 07:23:23.3867+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-04-LAG-08', '01a167a4-7fbb-777e-9593-0f102470eebd', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7fc0-762b-8a12-15a7e308b3fa', '01a167a4-79ab-7d58-842a-da264f6efd82', NULL, NULL, NULL, '01a167a4-7fcf-75e7-801e-908c166781cd', 'HUB_APP', '2026-10-15 04:23:19.302919+00', '', '2026-10-15 03:23:19.302919+00', '01a167a4-9b8e-785d-a6b7-feb048ee78ee', NULL),
	('01a167a4-8bd8-7980-84ef-6d1bbeeaa7f1', '2026-10-23 07:23:23.426363+00', '2026-10-23 07:23:23.426373+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-01', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-22 03:23:19.302919+00', '', '2026-10-22 02:23:19.302919+00', '01a167a4-9bb6-75a7-8662-d5e303e9284d', NULL),
	('01a167a4-8bd9-742a-83a0-37602cffb80b', '2026-10-23 07:23:23.466969+00', '2026-10-23 07:23:23.46698+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-02', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-21 03:23:19.302919+00', '', '2026-10-21 02:23:19.302919+00', '01a167a4-9be1-729b-b95c-92c8caff4dcd', NULL),
	('01a167a4-8bda-7d00-a99e-7df256afb870', '2026-10-23 07:23:23.514481+00', '2026-10-23 07:23:23.514497+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-03', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-20 03:23:19.302919+00', '', '2026-10-20 02:23:19.302919+00', '01a167a4-9c14-7e21-bf68-100f9768201e', NULL),
	('01a167a4-8bdb-79c5-b2b4-c8d1a42a41a6', '2026-10-23 07:23:23.564532+00', '2026-10-23 07:23:23.564546+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-04', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-19 03:23:19.302919+00', '', '2026-10-19 02:23:19.302919+00', '01a167a4-9c44-7ea3-9f75-df1e51f5419c', NULL),
	('01a167a4-8bdc-79ad-96bb-5b059cb6c3c7', '2026-10-23 07:23:23.609862+00', '2026-10-23 07:23:23.609873+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-05', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-18 03:23:19.302919+00', '', '2026-10-18 02:23:19.302919+00', '01a167a4-9c70-780b-b7a6-e3dde6d982d8', NULL),
	('01a167a4-8bdd-7a0f-8624-281aa3ef6146', '2026-10-23 07:23:23.67485+00', '2026-10-23 07:23:23.674866+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-06', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-17 03:23:19.302919+00', '', '2026-10-17 02:23:19.302919+00', '01a167a4-9cb7-7189-af8e-dc71b7d5bddf', NULL),
	('01a167a4-8bde-7fb2-b022-ca8c24f42f46', '2026-10-23 07:23:23.721846+00', '2026-10-23 07:23:23.721857+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-07', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-16 03:23:19.302919+00', '', '2026-10-16 02:23:19.302919+00', '01a167a4-9cda-7efd-8c3c-eedf7ceebeb7', NULL),
	('01a167a4-8bdf-7632-964b-025a0c8c7ab4', '2026-10-23 07:23:23.765679+00', '2026-10-23 07:23:23.765692+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-05-LAG-08', '01a167a4-8006-7d28-8eb9-0fa045178cc0', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-800d-7dfa-a1a1-ab10fd3d80b8', '01a167a4-79e5-767b-a18f-24d9e5476e14', NULL, NULL, NULL, '01a167a4-801b-7646-a9e2-71bf35ffc06e', 'HUB_APP', '2026-10-15 03:23:19.302919+00', '', '2026-10-15 02:23:19.302919+00', '01a167a4-9d0d-76f4-989f-f4166c30a75d', NULL),
	('01a167a4-8be0-7d5b-8312-59b59b741a08', '2026-10-23 07:23:23.810945+00', '2026-10-23 07:23:23.810956+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-01', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-22 07:23:19.302919+00', '', '2026-10-22 06:23:19.302919+00', '01a167a4-9d3b-7387-9e44-614b4f9c7097', NULL),
	('01a167a4-8be1-7484-b276-0d8d23dac62f', '2026-10-23 07:23:23.858902+00', '2026-10-23 07:23:23.858925+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-02', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-21 07:23:19.302919+00', '', '2026-10-21 06:23:19.302919+00', '01a167a4-9d77-79e7-8142-74fd2ca5c2ee', NULL),
	('01a167a4-8be2-7181-acc4-8e3052f44fdc', '2026-10-23 07:23:23.944939+00', '2026-10-23 07:23:23.944955+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-03', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-20 07:23:19.302919+00', '', '2026-10-20 06:23:19.302919+00', '01a167a4-9de2-7143-bfcc-d08e8197fa4b', NULL),
	('01a167a4-8be3-78a9-8663-1f329b46aa4d', '2026-10-23 07:23:24.02282+00', '2026-10-23 07:23:24.022829+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-04', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-19 07:23:19.302919+00', '', '2026-10-19 06:23:19.302919+00', '01a167a4-9e06-78c9-b580-3809cc9998da', NULL),
	('01a167a4-8be4-70a6-9780-9d31bd525bc8', '2026-10-23 07:23:24.053652+00', '2026-10-23 07:23:24.053667+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-05', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-18 07:23:19.302919+00', '', '2026-10-18 06:23:19.302919+00', '01a167a4-9e28-75e0-a83b-34bbca704f03', NULL),
	('01a167a4-8be5-7ebc-84a4-63fe71bb73f8', '2026-10-23 07:23:24.093084+00', '2026-10-23 07:23:24.093096+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-06', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-17 07:23:19.302919+00', '', '2026-10-17 06:23:19.302919+00', '01a167a4-9e4e-7eb4-9ac1-8b013935a7de', NULL),
	('01a167a4-8be6-7f28-a7ae-eabc132392a5', '2026-10-23 07:23:24.130324+00', '2026-10-23 07:23:24.130336+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-07', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-16 07:23:19.302919+00', '', '2026-10-16 06:23:19.302919+00', '01a167a4-9e78-78c8-8d80-d025d2cac397', NULL),
	('01a167a4-8be7-78ec-8ca9-8d5f21ca79eb', '2026-10-23 07:23:24.170828+00', '2026-10-23 07:23:24.170835+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-06-LAG-08', '01a167a4-8058-7b8e-8d5d-a5cc11de7bfe', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-805e-7833-ba95-4a0401ca54ed', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, NULL, '01a167a4-8070-7711-aee6-0eb7f63a0c64', 'HUB_APP', '2026-10-15 07:23:19.302919+00', '', '2026-10-15 06:23:19.302919+00', '01a167a4-9e9d-75ed-a792-279e8cd28c35', NULL),
	('01a167a4-8be8-7b51-b26a-1b488faffe82', '2026-10-23 07:23:24.206154+00', '2026-10-23 07:23:24.206163+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-01', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-22 06:23:19.302919+00', '', '2026-10-22 05:23:19.302919+00', '01a167a4-9ebd-7a9f-8b3e-ba911f82c52e', NULL),
	('01a167a4-8be9-75dd-92a4-bea9eb1180f9', '2026-10-23 07:23:24.23638+00', '2026-10-23 07:23:24.236388+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-02', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-21 06:23:19.302919+00', '', '2026-10-21 05:23:19.302919+00', '01a167a4-9edb-7c6c-b9bb-566381c3712a', NULL),
	('01a167a4-8bea-7321-8de4-68e50910afa5', '2026-10-23 07:23:24.265223+00', '2026-10-23 07:23:24.265233+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-03', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-20 06:23:19.302919+00', '', '2026-10-20 05:23:19.302919+00', '01a167a4-9ef8-7930-858c-59fba3e7fd6e', NULL),
	('01a167a4-8beb-7929-b29a-ab1f96aa5547', '2026-10-23 07:23:24.295772+00', '2026-10-23 07:23:24.295781+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-04', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-19 06:23:19.302919+00', '', '2026-10-19 05:23:19.302919+00', '01a167a4-9f18-7145-b565-3099132ebbb0', NULL),
	('01a167a4-8bec-7c60-a480-aa90a659bf1f', '2026-10-23 07:23:24.328922+00', '2026-10-23 07:23:24.32893+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-05', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-18 06:23:19.302919+00', '', '2026-10-18 05:23:19.302919+00', '01a167a4-9f3e-734b-bd16-ca4bd3989149', NULL),
	('01a167a4-8bed-7e3b-9ed4-845f1fa75531', '2026-10-23 07:23:24.373233+00', '2026-10-23 07:23:24.373248+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-06', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-17 06:23:19.302919+00', '', '2026-10-17 05:23:19.302919+00', '01a167a4-9f69-724d-984e-924c6b68c49a', NULL),
	('01a167a4-8bee-7365-9017-69960677fca0', '2026-10-23 07:23:24.417877+00', '2026-10-23 07:23:24.417892+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-07', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-16 06:23:19.302919+00', '', '2026-10-16 05:23:19.302919+00', '01a167a4-9f98-7f70-b595-9db8ac04ae11', NULL),
	('01a167a4-8bef-792e-915b-9edaaba6b686', '2026-10-23 07:23:24.460561+00', '2026-10-23 07:23:24.460571+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-07-LAG-08', '01a167a4-80ad-7039-a67d-fcc39b7a9ebb', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80b2-7703-a9ff-76f3ed8d1daa', '01a167a4-78dd-714d-a206-e1f0949f4bc8', NULL, NULL, NULL, '01a167a4-80be-70f2-9c62-8700694a86d9', 'HUB_APP', '2026-10-15 06:23:19.302919+00', '', '2026-10-15 05:23:19.302919+00', '01a167a4-9fbd-7ba8-a57a-561237637227', NULL),
	('01a167a4-8bf0-7bfd-90c9-7b7c932edc37', '2026-10-23 07:23:24.497095+00', '2026-10-23 07:23:24.497104+00', 13, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-01', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-22 05:23:19.302919+00', '', '2026-10-22 04:23:19.302919+00', '01a167a4-9fea-7327-a362-1fdfcb314781', NULL),
	('01a167a4-8bf1-7ac7-889a-7b602beed578', '2026-10-23 07:23:24.54334+00', '2026-10-23 07:23:24.543351+00', 14, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-02', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-21 05:23:19.302919+00', '', '2026-10-21 04:23:19.302919+00', '01a167a4-a014-77b6-8196-49071d8d9129', NULL),
	('01a167a4-8bf2-7f4e-b8f6-2bce21a76d9d', '2026-10-23 07:23:24.58914+00', '2026-10-23 07:23:24.589163+00', 15, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-03', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-20 05:23:19.302919+00', '', '2026-10-20 04:23:19.302919+00', '01a167a4-a051-7d08-bc32-e64076608f8a', NULL),
	('01a167a4-8bf3-747a-916e-694fd598b2cb', '2026-10-23 07:23:24.650925+00', '2026-10-23 07:23:24.650936+00', 16, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-04', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-19 05:23:19.302919+00', '', '2026-10-19 04:23:19.302919+00', '01a167a4-a088-7bd1-8947-f1c51100a309', NULL),
	('01a167a4-8bf4-7490-b937-3ba9c3a21a9b', '2026-10-23 07:23:24.710763+00', '2026-10-23 07:23:24.710785+00', 17, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-05', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-18 05:23:19.302919+00', '', '2026-10-18 04:23:19.302919+00', '01a167a4-a0c9-7969-a7a2-2c8a6e6702d0', NULL),
	('01a167a4-8bf5-7fbf-96d7-28396438b206', '2026-10-23 07:23:24.782751+00', '2026-10-23 07:23:24.782772+00', 18, 95, 'WALLET', 45000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-06', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-17 05:23:19.302919+00', '', '2026-10-17 04:23:19.302919+00', '01a167a4-a10d-7451-ba87-f1afe6b53a90', NULL),
	('01a167a4-8bf6-7a39-a2ba-08c0a400163a', '2026-10-23 07:23:24.853339+00', '2026-10-23 07:23:24.853361+00', 19, 95, 'WALLET', 50000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-07', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-16 05:23:19.302919+00', '', '2026-10-16 04:23:19.302919+00', '01a167a4-a15c-7433-a3c0-f90634f4660c', NULL),
	('01a167a4-8bf7-7d48-b12f-d59b500bbbba', '2026-10-23 07:23:24.923542+00', '2026-10-23 07:23:24.923555+00', 20, 95, 'WALLET', 55000, 10465, false, 'COMPLETED', 'seed-swap-RID-08-LAG-08', '01a167a4-80f9-7131-89f8-e074dc97447d', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-80fd-718a-9afd-c02d1c61e832', '01a167a4-7947-7871-97d7-5cc0fb487bd2', NULL, NULL, NULL, '01a167a4-810a-77c2-aaf1-703aef0bb3e4', 'HUB_APP', '2026-10-15 05:23:19.302919+00', '', '2026-10-15 04:23:19.302919+00', '01a167a4-a19a-7ac8-87d4-731e8ce37377', NULL);


--
-- Data for Name: mobility_batteryevent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_bayholdpolicy; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_discountcampaign; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_discountredemption; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_eboarder; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_eboarder VALUES
	('01a167a4-7c06-7b61-8931-3f9e12c88f94', '2026-10-23 07:23:15.334296+00', '2026-10-23 07:23:15.334304+00', 'EB-LAG-7741', 'Asobo', 'Lagoon 6', 6000, '15', 48, 'LONG', 'ISSUED', '2026-10-05 07:23:15.332109+00', '{}', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', NULL, '01a167a4-7bf7-7523-9ac4-92fc3709168c'),
	('01a167a4-7c0b-74ac-8a3b-a6a755fe6dba', '2026-10-23 07:23:15.339938+00', '2026-10-23 07:23:15.339946+00', 'EB-YBA-1102', 'Asobo', 'Lagoon 6', 6000, '15', 48, 'LONG', 'IN_STOCK', NULL, '{}', NULL, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL),
	('01a167a4-7c0e-7fee-94a1-9dd2be2569cf', '2026-10-23 07:23:15.343009+00', '2026-10-23 07:23:15.343017+00', 'EB-YBA-1103', 'Asobo', 'Lagoon 6', 6000, '15', 48, 'LONG', 'IN_STOCK', NULL, '{}', NULL, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL),
	('01a167a4-7c11-71d7-9804-cd8fa93d7234', '2026-10-23 07:23:15.345191+00', '2026-10-23 07:23:15.345197+00', 'EB-YBA-2201', 'Asobo', 'Lagoon 10', 10000, '25', 48, 'LONG', 'IN_STOCK', NULL, '{}', NULL, '01a167a4-784c-7c6c-8ea1-c3c0a55e4b7c', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL);


--
-- Data for Name: mobility_hubslot; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_hubslot VALUES
	('01a167a4-7868-762c-985d-4bec18963f4d', '2026-10-23 07:23:14.408616+00', '2026-10-23 07:23:14.408631+00', 1, 'READY', '01a167a4-7862-76d3-8640-b4e2838bdb02', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7871-7325-915c-a4e6927c4585', '2026-10-23 07:23:14.417691+00', '2026-10-23 07:23:14.4177+00', 2, 'READY', '01a167a4-786f-7a60-8292-3f0957d4ccb5', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7876-760c-8808-ac56bf0e4d6d', '2026-10-23 07:23:14.422919+00', '2026-10-23 07:23:14.422927+00', 3, 'READY', '01a167a4-7874-7a92-a321-30b21b50d604', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-787c-7d5e-8ca1-971462532f9e', '2026-10-23 07:23:14.428665+00', '2026-10-23 07:23:14.428676+00', 4, 'READY', '01a167a4-787a-7e01-824f-267221e2d1c1', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7882-782f-83fd-1e4a3332ee2f', '2026-10-23 07:23:14.434948+00', '2026-10-23 07:23:14.434957+00', 5, 'READY', '01a167a4-7880-7baf-86eb-f5e17ce19498', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-788d-73dd-bbee-3b17e814cd2a', '2026-10-23 07:23:14.445418+00', '2026-10-23 07:23:14.44543+00', 6, 'READY', '01a167a4-788a-7236-953e-5bfce5e37181', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-7896-77ae-bf51-fd1080a72106', '2026-10-23 07:23:14.454401+00', '2026-10-23 07:23:14.454417+00', 7, 'READY', '01a167a4-7892-7cc9-9657-19c95561452d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-789e-7af8-b431-8451509eddd9', '2026-10-23 07:23:14.463296+00', '2026-10-23 07:23:14.463313+00', 8, 'READY', '01a167a4-789b-7828-8523-00ec0f65231a', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78a9-7c7e-97e6-ff94a9fe74e3', '2026-10-23 07:23:14.473365+00', '2026-10-23 07:23:14.473381+00', 9, 'READY', '01a167a4-78a4-71fd-b753-6b4ed877fcd6', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78b0-7287-814d-afc5dfecce41', '2026-10-23 07:23:14.480924+00', '2026-10-23 07:23:14.480934+00', 10, 'READY', '01a167a4-78ae-7ecb-b157-952e4306338d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78b6-7f9b-8b4d-44132693e097', '2026-10-23 07:23:14.486708+00', '2026-10-23 07:23:14.486718+00', 11, 'READY', '01a167a4-78b4-7cc7-a7ee-fc26c510092d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78c9-73eb-8f4a-fb7e4ba65b4c', '2026-10-23 07:23:14.505872+00', '2026-10-23 07:23:14.505885+00', 12, 'CHARGING', '01a167a4-78c6-74a8-ae29-72f3a6a6c57d', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78d1-7b95-92c9-3c00ba4c9877', '2026-10-23 07:23:14.513229+00', '2026-10-23 07:23:14.513239+00', 13, 'CHARGING', '01a167a4-78ce-71dd-bd46-5c96ab3fb18f', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78d7-7142-b913-15e5d3431fd1', '2026-10-23 07:23:14.519308+00', '2026-10-23 07:23:14.519317+00', 14, 'CHARGING', '01a167a4-78d4-7122-bd74-cb817b44f200', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78d9-7bc4-8829-fff86f4234e7', '2026-10-23 07:23:14.521576+00', '2026-10-23 07:23:14.521587+00', 15, 'EMPTY', NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78da-7804-82bb-7b8e7e11f0c7', '2026-10-23 07:23:14.523168+00', '2026-10-23 07:23:14.523179+00', 16, 'EMPTY', NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64'),
	('01a167a4-78e6-7188-bde3-d9d821b1560b', '2026-10-23 07:23:14.534439+00', '2026-10-23 07:23:14.534453+00', 1, 'READY', '01a167a4-78e2-769e-9804-d9aa1fef0086', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-78f0-7c0b-9822-868b60703704', '2026-10-23 07:23:14.545289+00', '2026-10-23 07:23:14.545308+00', 2, 'READY', '01a167a4-78ed-75e2-b860-7dbe77e83e36', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-78fb-76af-b531-c98e9d131e41', '2026-10-23 07:23:14.555313+00', '2026-10-23 07:23:14.555331+00', 3, 'READY', '01a167a4-78f6-777d-902d-b5086344beaa', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7905-71bc-8116-8d843cd27e61', '2026-10-23 07:23:14.566043+00', '2026-10-23 07:23:14.566056+00', 4, 'READY', '01a167a4-7902-7695-b5b8-f8b2aa36d6ed', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7911-73ed-8686-b51355fc11d3', '2026-10-23 07:23:14.577704+00', '2026-10-23 07:23:14.577718+00', 5, 'READY', '01a167a4-790d-75a3-b63d-3171f2f50541', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-791b-7239-84d7-1a03ac1cbaa0', '2026-10-23 07:23:14.588021+00', '2026-10-23 07:23:14.588036+00', 6, 'READY', '01a167a4-7917-7436-a7dc-d9bfb96aa096', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-792c-7319-b9ab-597377cc7a03', '2026-10-23 07:23:14.605357+00', '2026-10-23 07:23:14.605373+00', 7, 'READY', '01a167a4-7922-75f0-84a9-bcdc0a9480fa', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7936-729f-bdaa-eb5b15a4d9b8', '2026-10-23 07:23:14.614424+00', '2026-10-23 07:23:14.614439+00', 8, 'READY', '01a167a4-7933-71b7-b2e9-2514266b5f64', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-793d-7c81-baf7-e0fe65a88d5a', '2026-10-23 07:23:14.621469+00', '2026-10-23 07:23:14.621479+00', 9, 'CHARGING', '01a167a4-793b-743f-bf17-05aa1cdc3566', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7942-7291-8a28-bdfbbab5fc19', '2026-10-23 07:23:14.626701+00', '2026-10-23 07:23:14.626712+00', 10, 'CHARGING', '01a167a4-7940-713c-a252-cb05cf3609f6', '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7944-7cc7-b5f3-a3d0740c90f5', '2026-10-23 07:23:14.628673+00', '2026-10-23 07:23:14.628681+00', 11, 'EMPTY', NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-7945-7b98-a980-a4886c1c72a3', '2026-10-23 07:23:14.629531+00', '2026-10-23 07:23:14.629537+00', 12, 'EMPTY', NULL, '01a167a4-78dd-714d-a206-e1f0949f4bc8'),
	('01a167a4-794e-7e36-918d-a60dacf875e3', '2026-10-23 07:23:14.638493+00', '2026-10-23 07:23:14.638505+00', 1, 'READY', '01a167a4-794b-77db-a2d7-bd94fc42f19e', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7957-7974-b759-197fa31f9d1a', '2026-10-23 07:23:14.64722+00', '2026-10-23 07:23:14.64723+00', 2, 'READY', '01a167a4-7952-7522-8c96-11e0e581ff77', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7966-78f7-93a8-28e14ff1139a', '2026-10-23 07:23:14.662871+00', '2026-10-23 07:23:14.662882+00', 3, 'READY', '01a167a4-795b-7d68-ba50-b1000afa8ef9', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7971-78c1-a4d3-d444429e436b', '2026-10-23 07:23:14.673712+00', '2026-10-23 07:23:14.673725+00', 4, 'READY', '01a167a4-796e-7056-b475-7f7547d7efe5', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7978-710d-929e-c073b7a37e6c', '2026-10-23 07:23:14.680157+00', '2026-10-23 07:23:14.680167+00', 5, 'READY', '01a167a4-7975-7f66-9729-60819d67d381', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7980-799b-ac11-a9e67eed05de', '2026-10-23 07:23:14.688649+00', '2026-10-23 07:23:14.688658+00', 6, 'READY', '01a167a4-797b-7303-be66-f37804a0109b', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7984-7a7b-aba4-30e204d52cb2', '2026-10-23 07:23:14.693079+00', '2026-10-23 07:23:14.693088+00', 7, 'READY', '01a167a4-7983-7034-8d69-b8d7932fd232', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-798a-7cba-a354-1f9b704d9edb', '2026-10-23 07:23:14.699027+00', '2026-10-23 07:23:14.699033+00', 8, 'READY', '01a167a4-7989-77d5-a2fd-0bcbcb34b010', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7990-7bae-930d-64d744ea695c', '2026-10-23 07:23:14.704428+00', '2026-10-23 07:23:14.704434+00', 9, 'READY', '01a167a4-798e-7f18-9679-93cf57d1c0bd', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7994-7144-b304-36de10944050', '2026-10-23 07:23:14.708603+00', '2026-10-23 07:23:14.708609+00', 10, 'READY', '01a167a4-7992-74b6-a5fc-a091a4de4b92', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-7998-7e94-9ac9-831a1ee89e78', '2026-10-23 07:23:14.712707+00', '2026-10-23 07:23:14.712714+00', 11, 'READY', '01a167a4-7996-7393-a273-2d43e13acbe1', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-799c-7aca-acc2-ef8941feb395', '2026-10-23 07:23:14.716864+00', '2026-10-23 07:23:14.716871+00', 12, 'CHARGING', '01a167a4-799b-7f00-a5c1-023b51184e2f', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-79a1-73c9-a88d-bb9b40038bef', '2026-10-23 07:23:14.721803+00', '2026-10-23 07:23:14.72181+00', 13, 'CHARGING', '01a167a4-799f-72af-940c-0366e6e32fda', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-79a6-7278-b11d-37fa22465b13', '2026-10-23 07:23:14.726298+00', '2026-10-23 07:23:14.726306+00', 14, 'CHARGING', '01a167a4-79a4-7120-a9ac-e4d35dbd9b60', '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-79a8-7a13-a1ef-2e9a804883f1', '2026-10-23 07:23:14.729028+00', '2026-10-23 07:23:14.729035+00', 15, 'EMPTY', NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-79a9-78ed-8986-ba00e767f89b', '2026-10-23 07:23:14.73001+00', '2026-10-23 07:23:14.730018+00', 16, 'EMPTY', NULL, '01a167a4-7947-7871-97d7-5cc0fb487bd2'),
	('01a167a4-79b1-7356-95d0-9933466d57d5', '2026-10-23 07:23:14.737855+00', '2026-10-23 07:23:14.737866+00', 1, 'READY', '01a167a4-79ae-7593-a319-a9a445ee3b9b', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79b5-7a6a-b83d-3f6ea18b755a', '2026-10-23 07:23:14.742061+00', '2026-10-23 07:23:14.742067+00', 2, 'READY', '01a167a4-79b4-70a4-889f-877c1184ae69', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79b9-7cc1-af53-a24ab8ef4adf', '2026-10-23 07:23:14.745827+00', '2026-10-23 07:23:14.745834+00', 3, 'READY', '01a167a4-79b8-7961-bb10-9b49bc45cd87', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79bd-7a0f-89d4-c55fdf348a48', '2026-10-23 07:23:14.749541+00', '2026-10-23 07:23:14.749547+00', 4, 'READY', '01a167a4-79bc-745e-8485-fe5f5d8fa637', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79c1-7354-9fe6-5cc68d22cf0c', '2026-10-23 07:23:14.753477+00', '2026-10-23 07:23:14.753484+00', 5, 'READY', '01a167a4-79bf-70f6-8399-9f7970d62eb1', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79ca-73df-beff-e97bccc365d8', '2026-10-23 07:23:14.762534+00', '2026-10-23 07:23:14.762541+00', 6, 'READY', '01a167a4-79c4-7069-96e3-180a49885d79', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79cf-7b09-a0a6-0bc4ac99cb08', '2026-10-23 07:23:14.76737+00', '2026-10-23 07:23:14.767381+00', 7, 'READY', '01a167a4-79cc-71be-ab5c-847cb427f9a5', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79d5-70bb-a921-928f685f24bc', '2026-10-23 07:23:14.77406+00', '2026-10-23 07:23:14.774071+00', 8, 'READY', '01a167a4-79d2-7cde-adf1-ba9d1f86b510', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79dc-719c-b257-1b33a7854c18', '2026-10-23 07:23:14.780711+00', '2026-10-23 07:23:14.780739+00', 9, 'CHARGING', '01a167a4-79d9-721a-88ff-bc76cb66d0b6', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79e1-7f2c-a0c0-7d7283030e95', '2026-10-23 07:23:14.785615+00', '2026-10-23 07:23:14.785623+00', 10, 'CHARGING', '01a167a4-79df-7d8f-b05d-b466c7dd77d7', '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79e2-7fb7-adf7-eb7dc9f2a25f', '2026-10-23 07:23:14.787074+00', '2026-10-23 07:23:14.78708+00', 11, 'EMPTY', NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79e3-7d61-a2ee-ae1f14c9e31f', '2026-10-23 07:23:14.787809+00', '2026-10-23 07:23:14.787816+00', 12, 'EMPTY', NULL, '01a167a4-79ab-7d58-842a-da264f6efd82'),
	('01a167a4-79eb-79b8-ba7c-6600b5fd273f', '2026-10-23 07:23:14.795381+00', '2026-10-23 07:23:14.795389+00', 1, 'READY', '01a167a4-79e9-7b2b-b2b5-9bbf53418a46', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-79f1-7c9c-8aff-53fcf9be1d5e', '2026-10-23 07:23:14.801504+00', '2026-10-23 07:23:14.801512+00', 2, 'READY', '01a167a4-79ef-72de-86ac-6855a9e94ddb', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-79fe-7fa6-b4cd-932e85cedbd7', '2026-10-23 07:23:14.814976+00', '2026-10-23 07:23:14.814988+00', 3, 'READY', '01a167a4-79f9-71eb-978c-40076838b7d2', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-7a06-75be-84f3-3671c6ee9fb4', '2026-10-23 07:23:14.82247+00', '2026-10-23 07:23:14.822478+00', 4, 'READY', '01a167a4-7a03-7785-a6e6-daee9b98afb7', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-7a0a-769a-93e3-bf122e2fd8cd', '2026-10-23 07:23:14.826611+00', '2026-10-23 07:23:14.826618+00', 5, 'READY', '01a167a4-7a08-7e18-8716-a2b147442622', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-7a10-7c4f-8ad7-8248501eb20f', '2026-10-23 07:23:14.832717+00', '2026-10-23 07:23:14.832726+00', 6, 'CHARGING', '01a167a4-7a0d-7daa-ae14-4db038a74a3e', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-7a15-7cba-b22e-64cba25c90fe', '2026-10-23 07:23:14.837473+00', '2026-10-23 07:23:14.837481+00', 7, 'CHARGING', '01a167a4-7a13-7591-9276-0e77ba1462b9', '01a167a4-79e5-767b-a18f-24d9e5476e14'),
	('01a167a4-7a17-7e79-b9f4-ec023b391f2a', '2026-10-23 07:23:14.839812+00', '2026-10-23 07:23:14.839819+00', 8, 'EMPTY', NULL, '01a167a4-79e5-767b-a18f-24d9e5476e14');


--
-- Data for Name: mobility_pricematrix; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: mobility_retrofit; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_retrofit VALUES
	('01a167a4-7c14-7d42-9992-37193c7ed88e', '2026-10-23 07:23:15.348862+00', '2026-10-23 07:23:15.348869+00', 'EB-LAG-7741', '{"hull": true, "kill": true, "cable": true, "float": true, "mount": true, "throttle": true}', 'ACTIVATED', '["https://images.unsplash.com/photo-1623220988124-bcd1bad9a408?auto=format&fit=crop&w=960&q=80"]', '2026-10-05 07:23:15.346904+00', '{"commissioned_by": "Yaba Path B bay"}', '01a167a4-7bde-7ce0-84c7-e7789e83448f', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7bfd-793d-946c-b355d2e81c47', '01a167a4-7bf7-7523-9ac4-92fc3709168c', '01a167a4-7c06-7b61-8931-3f9e12c88f94');


--
-- Data for Name: mobility_telemetryevent; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_telemetryevent VALUES
	('01a167a4-7c99-73a6-a8fb-3f8daae3ca8e', '2026-10-23 07:23:15.481821+00', '2026-10-23 07:23:15.48183+00', '2026-10-23 01:23:15.48157+00', 88, 6.4955, 3.3862, 12, 420, 'manual', 'seed-makoko-day', '{"hub_note": "Manual SOC ping at waterside", "agent_phone": "+2348098765432"}', NULL, '01a167a4-7bf7-7523-9ac4-92fc3709168c'),
	('01a167a4-7c9e-7e42-9065-b1922450c059', '2026-10-23 07:23:15.486311+00', '2026-10-23 07:23:15.486317+00', '2026-10-23 02:23:15.48157+00', 76, 6.4963, 3.3867000000000003, 13, 423.5, 'manual', 'seed-makoko-day', '{"hub_note": "Manual SOC ping at waterside", "agent_phone": "+2348098765432"}', NULL, '01a167a4-7bf7-7523-9ac4-92fc3709168c'),
	('01a167a4-7c9f-701f-be02-ad60c4ad5c12', '2026-10-23 07:23:15.487703+00', '2026-10-23 07:23:15.48771+00', '2026-10-23 03:23:15.48157+00', 64, 6.4971, 3.3872, 14, 427, 'manual', 'seed-makoko-day', '{"hub_note": "Manual SOC ping at waterside", "agent_phone": "+2348098765432"}', NULL, '01a167a4-7bf7-7523-9ac4-92fc3709168c'),
	('01a167a4-7ca0-70e1-86a7-cbc0fbebdd42', '2026-10-23 07:23:15.488586+00', '2026-10-23 07:23:15.488594+00', '2026-10-23 04:23:15.48157+00', 51, 6.4979, 3.3877, 15, 430.5, 'manual', 'seed-makoko-day', '{"hub_note": "Manual SOC ping at waterside", "agent_phone": "+2348098765432"}', NULL, '01a167a4-7bf7-7523-9ac4-92fc3709168c');


--
-- Data for Name: mobility_vehicleassignment; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_vehicleassignment VALUES
	('01a167a4-7dcb-7e6b-b018-0bf80d9a3f5b', '2026-10-23 07:23:15.787895+00', '2026-10-23 07:23:15.787901+00', '2026-10-23 07:23:15.783291+00', NULL, 'seed day shift', '01a167a4-7d83-7427-869f-fb5645df586d', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-7dd8-7400-98c8-59715848cee7', '2026-10-23 07:23:15.800997+00', '2026-10-23 07:23:15.801004+00', '2026-10-23 07:23:15.797863+00', NULL, 'seed night', '01a167a4-7dc2-7e7b-99b0-78aceac440c2', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54');


--
-- Data for Name: mobility_vehiclecommand; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.mobility_vehiclecommand VALUES
	('01a167a4-a1bb-7ff5-9d75-192e57187607', '2026-10-23 07:23:24.988229+00', '2026-10-23 07:23:24.988254+00', 'ENABLE_DRIVING', 'QUEUED', 'seed-FLEET-VCU-01-ENABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-a1c4-75db-85a3-5ff96a95b7ba', '2026-10-23 07:23:24.996964+00', '2026-10-23 07:23:24.996989+00', 'DISABLE_DRIVING', 'SENT', 'seed-FLEET-VCU-01-DISABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-a1c9-70db-b3c4-e48b2cfee34d', '2026-10-23 07:23:25.002634+00', '2026-10-23 07:23:25.002671+00', 'REQUEST_STATE', 'ACKED', 'seed-FLEET-VCU-01-REQUEST_STATE', '', '2026-10-23 07:23:25.001137+00', '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-a1ce-7bfe-b48a-5824111b3732', '2026-10-23 07:23:25.007041+00', '2026-10-23 07:23:25.007064+00', 'UNLOCK_BATTERY', 'FAILED', 'seed-FLEET-VCU-01-UNLOCK_BATTERY', 'timeout', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-a1d2-7a1e-9f41-70e7ed24f435', '2026-10-23 07:23:25.010487+00', '2026-10-23 07:23:25.010508+00', 'DRAW_ATTENTION', 'QUEUED', 'seed-FLEET-VCU-01-DRAW_ATTENTION', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d05-7a26-adbc-d03fb2d1fe0a'),
	('01a167a4-a1d5-7c7e-9881-3dc5bec876f8', '2026-10-23 07:23:25.014019+00', '2026-10-23 07:23:25.014039+00', 'ENABLE_DRIVING', 'QUEUED', 'seed-FLEET-VCU-02-ENABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54'),
	('01a167a4-a1d9-7a2e-a774-2143c2a59854', '2026-10-23 07:23:25.018176+00', '2026-10-23 07:23:25.018197+00', 'DISABLE_DRIVING', 'SENT', 'seed-FLEET-VCU-02-DISABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54'),
	('01a167a4-a1dd-794c-a2b3-cc0297bba4b8', '2026-10-23 07:23:25.022282+00', '2026-10-23 07:23:25.022304+00', 'REQUEST_STATE', 'ACKED', 'seed-FLEET-VCU-02-REQUEST_STATE', '', '2026-10-23 07:23:25.021799+00', '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54'),
	('01a167a4-a1e1-715e-a306-b0b10386725d', '2026-10-23 07:23:25.026018+00', '2026-10-23 07:23:25.02604+00', 'UNLOCK_BATTERY', 'FAILED', 'seed-FLEET-VCU-02-UNLOCK_BATTERY', 'timeout', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54'),
	('01a167a4-a1e7-7633-8724-2051572da036', '2026-10-23 07:23:25.033985+00', '2026-10-23 07:23:25.034018+00', 'DRAW_ATTENTION', 'QUEUED', 'seed-FLEET-VCU-02-DRAW_ATTENTION', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d12-747d-96bb-0f8bf3bf8a54'),
	('01a167a4-a1ed-7c21-9045-3b3127ba8c9c', '2026-10-23 07:23:25.037523+00', '2026-10-23 07:23:25.037541+00', 'ENABLE_DRIVING', 'QUEUED', 'seed-FLEET-VCU-03-ENABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d24-7bd5-a201-f614a6bd382f'),
	('01a167a4-a1f0-7cb6-887c-d5f2e3e94c3c', '2026-10-23 07:23:25.040955+00', '2026-10-23 07:23:25.040974+00', 'DISABLE_DRIVING', 'SENT', 'seed-FLEET-VCU-03-DISABLE_DRIVING', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d24-7bd5-a201-f614a6bd382f'),
	('01a167a4-a1f4-7150-be35-0404e69f233d', '2026-10-23 07:23:25.044392+00', '2026-10-23 07:23:25.044427+00', 'REQUEST_STATE', 'ACKED', 'seed-FLEET-VCU-03-REQUEST_STATE', '', '2026-10-23 07:23:25.044172+00', '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d24-7bd5-a201-f614a6bd382f'),
	('01a167a4-a1f7-74b4-aa48-374def807eac', '2026-10-23 07:23:25.047454+00', '2026-10-23 07:23:25.047466+00', 'UNLOCK_BATTERY', 'FAILED', 'seed-FLEET-VCU-03-UNLOCK_BATTERY', 'timeout', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d24-7bd5-a201-f614a6bd382f'),
	('01a167a4-a1f9-7d5d-b140-320e5119423f', '2026-10-23 07:23:25.050059+00', '2026-10-23 07:23:25.05007+00', 'DRAW_ATTENTION', 'QUEUED', 'seed-FLEET-VCU-03-DRAW_ATTENTION', '', NULL, '01a167a4-76c8-7974-b319-46c2676f9c4e', '01a167a4-7d24-7bd5-a201-f614a6bd382f');


--
-- Data for Name: notifications_notification; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: operations_alert; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.operations_alert VALUES
	('01a167a4-7a84-78cf-82c9-638d0eb0d1b1', '2026-10-23 07:23:14.948265+00', '2026-10-23 07:23:14.948275+00', 'LOW_INVENTORY', 'WARNING', 'Ready batteries below threshold at Yaba', false, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, 'IN_APP', '', NULL, 'OPEN'),
	('01a167a4-7bb6-79f2-a605-c496f4802c5c', '2026-10-23 07:23:15.255015+00', '2026-10-23 07:23:15.255023+00', 'SOLAR_FAULT', 'WARNING', 'HUB-YBA-01 inverter string B offline — using grid.', false, NULL, '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, 'IN_APP', '', NULL, 'OPEN');


--
-- Data for Name: operations_alertrule; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.operations_alertrule VALUES
	('01a167a4-a1ff-71dd-b6dc-3a21042553f4', '2026-10-23 07:23:25.0558+00', '2026-10-23 07:23:25.055811+00', 'Low inventory Yaba', 'LOW_INVENTORY', 'WARNING', '{"value": 5}', '["IN_APP", "SMS"]', 30, 'ACTIVE', '01a167a4-76c8-7974-b319-46c2676f9c4e'),
	('01a167a4-a207-73c5-a726-ca6eb0daad78', '2026-10-23 07:23:25.063581+00', '2026-10-23 07:23:25.063594+00', 'Hub offline', 'HUB_OFFLINE', 'CRITICAL', '{"value": 1}', '["IN_APP", "SMS"]', 30, 'ACTIVE', '01a167a4-76c8-7974-b319-46c2676f9c4e'),
	('01a167a4-a216-768d-88d7-98878e8abc1d', '2026-10-23 07:23:25.079097+00', '2026-10-23 07:23:25.079111+00', 'Cash limit', 'CASH_LIMIT', 'WARNING', '{"value": 200000}', '["IN_APP", "SMS"]', 30, 'ACTIVE', '01a167a4-76c8-7974-b319-46c2676f9c4e'),
	('01a167a4-a21c-7476-b9a8-9d39ee2627da', '2026-10-23 07:23:25.084211+00', '2026-10-23 07:23:25.084222+00', 'Payment failures', 'PAYMENT_FAILURE', 'WARNING', '{"value": 3}', '["IN_APP", "SMS"]', 30, 'ACTIVE', '01a167a4-76c8-7974-b319-46c2676f9c4e'),
	('01a167a4-a21e-7f00-a252-a8e1e0e6c268', '2026-10-23 07:23:25.086839+00', '2026-10-23 07:23:25.086847+00', 'Paused solar (demo)', 'SOLAR_FAULT', 'INFO', '{"value": 1}', '["IN_APP", "SMS"]', 30, 'PAUSED', '01a167a4-76c8-7974-b319-46c2676f9c4e');


--
-- Data for Name: operations_shift; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.operations_shift VALUES
	('01a167a4-7bca-739a-87fb-4d2b489d318f', '2026-10-23 07:23:15.274321+00', '2026-10-23 07:23:15.274329+00', '2026-10-23 07:23:15.27434+00', NULL, 200000, NULL, 'OPEN', '01a167a4-774e-7c8c-a622-90979fd67673', '01a167a4-7858-7ef0-ba28-d5be8d1e7d64', NULL, NULL, '', NULL, NULL, false);


--
-- Data for Name: operations_cashdeposit; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: operations_inventorycount; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: operations_override; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: risk_riskrule; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: risk_riskevent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: risk_riskvelocitygrant; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: support_supportcase; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: support_caseevent; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: token_blacklist_outstandingtoken; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: token_blacklist_blacklistedtoken; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: accounts_role_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_role_permissions_id_seq', 130, true);


--
-- Name: accounts_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_user_groups_id_seq', 1, false);


--
-- Name: accounts_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.accounts_user_user_permissions_id_seq', 1, false);


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 1, false);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 1, false);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 1, false);


--
-- Name: token_blacklist_blacklistedtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_blacklistedtoken_id_seq', 1, false);


--
-- Name: token_blacklist_outstandingtoken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.token_blacklist_outstandingtoken_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--


