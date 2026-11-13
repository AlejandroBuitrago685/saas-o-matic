CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`company_name_search` text NOT NULL,
	`tax_id` text NOT NULL,
	`tax_id_type` text NOT NULL,
	`country` text NOT NULL,
	`contact_email` text NOT NULL,
	`plan` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT "customers_id_ck" CHECK(length("customers"."id") = 36 AND "customers"."id" = lower("customers"."id")),
	CONSTRAINT "customers_company_name_ck" CHECK(length("customers"."company_name") BETWEEN 2 AND 200),
	CONSTRAINT "customers_company_name_search_ck" CHECK(length("customers"."company_name_search") <= 1000),
	CONSTRAINT "customers_tax_id_ck" CHECK(length("customers"."tax_id") BETWEEN 1 AND 32 AND "customers"."tax_id" NOT GLOB '*[^A-Z0-9]*'),
	CONSTRAINT "customers_tax_id_type_ck" CHECK("customers"."tax_id_type" IN ('DNI', 'NIE', 'CIF', 'VAT', 'EIN')),
	CONSTRAINT "customers_country_ck" CHECK("customers"."country" IN ('ES', 'PT', 'FR', 'DE', 'IT', 'GB', 'US')),
	CONSTRAINT "customers_contact_email_ck" CHECK(length("customers"."contact_email") <= 254 AND "customers"."contact_email" = lower("customers"."contact_email")),
	CONSTRAINT "customers_plan_ck" CHECK("customers"."plan" IN ('STARTER', 'BUSINESS', 'ENTERPRISE')),
	CONSTRAINT "customers_created_at_ck" CHECK(typeof("customers"."created_at") = 'integer' AND "customers"."created_at" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_country_tax_id_uq` ON `customers` (`country`,`tax_id`);--> statement-breakpoint
CREATE INDEX `customers_name_search_idx` ON `customers` (`company_name_search`,`id`);--> statement-breakpoint
CREATE TABLE `simulation_tiers` (
	`simulation_id` text NOT NULL,
	`tier` integer NOT NULL,
	`from_user` integer NOT NULL,
	`to_user` integer,
	`units` integer NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`subtotal_cents` integer NOT NULL,
	PRIMARY KEY(`simulation_id`, `tier`),
	FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "simulation_tiers_tier_ck" CHECK(typeof("simulation_tiers"."tier") = 'integer' AND "simulation_tiers"."tier" >= 1),
	CONSTRAINT "simulation_tiers_from_user_ck" CHECK(typeof("simulation_tiers"."from_user") = 'integer' AND "simulation_tiers"."from_user" >= 1),
	CONSTRAINT "simulation_tiers_to_user_ck" CHECK("simulation_tiers"."to_user" IS NULL OR (typeof("simulation_tiers"."to_user") = 'integer' AND "simulation_tiers"."to_user" >= "simulation_tiers"."from_user")),
	CONSTRAINT "simulation_tiers_units_ck" CHECK(typeof("simulation_tiers"."units") = 'integer' AND "simulation_tiers"."units" > 0),
	CONSTRAINT "simulation_tiers_unit_price_cents_ck" CHECK(typeof("simulation_tiers"."unit_price_cents") = 'integer' AND "simulation_tiers"."unit_price_cents" > 0),
	CONSTRAINT "simulation_tiers_subtotal_cents_ck" CHECK("simulation_tiers"."subtotal_cents" = "simulation_tiers"."units" * "simulation_tiers"."unit_price_cents")
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`active_users` integer NOT NULL,
	`storage_gb` integer NOT NULL,
	`api_calls_per_month` integer NOT NULL,
	`currency` text NOT NULL,
	`tariff_code` text NOT NULL,
	`base_cents` integer NOT NULL,
	`tax_country` text NOT NULL,
	`tax_rate_bps` integer NOT NULL,
	`tax_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "simulations_id_ck" CHECK(length("simulations"."id") = 36 AND "simulations"."id" = lower("simulations"."id")),
	CONSTRAINT "simulations_active_users_ck" CHECK(typeof("simulations"."active_users") = 'integer' AND "simulations"."active_users" BETWEEN 1 AND 10000),
	CONSTRAINT "simulations_storage_gb_ck" CHECK(typeof("simulations"."storage_gb") = 'integer' AND "simulations"."storage_gb" BETWEEN 0 AND 100000),
	CONSTRAINT "simulations_api_calls_per_month_ck" CHECK(typeof("simulations"."api_calls_per_month") = 'integer' AND "simulations"."api_calls_per_month" BETWEEN 0 AND 1000000000),
	CONSTRAINT "simulations_currency_ck" CHECK("simulations"."currency" = 'EUR'),
	CONSTRAINT "simulations_tariff_code_ck" CHECK(length("simulations"."tariff_code") BETWEEN 1 AND 50),
	CONSTRAINT "simulations_base_cents_ck" CHECK(typeof("simulations"."base_cents") = 'integer' AND "simulations"."base_cents" >= 0),
	CONSTRAINT "simulations_tax_country_ck" CHECK("simulations"."tax_country" IN ('ES', 'PT', 'FR', 'DE', 'IT', 'GB', 'US')),
	CONSTRAINT "simulations_tax_rate_bps_ck" CHECK(typeof("simulations"."tax_rate_bps") = 'integer' AND "simulations"."tax_rate_bps" BETWEEN 0 AND 10000),
	CONSTRAINT "simulations_tax_cents_ck" CHECK(typeof("simulations"."tax_cents") = 'integer' AND "simulations"."tax_cents" >= 0),
	CONSTRAINT "simulations_total_cents_ck" CHECK("simulations"."total_cents" = "simulations"."base_cents" + "simulations"."tax_cents"),
	CONSTRAINT "simulations_created_at_ck" CHECK(typeof("simulations"."created_at") = 'integer' AND "simulations"."created_at" > 0)
);
--> statement-breakpoint
CREATE INDEX `simulations_customer_created_idx` ON `simulations` (`customer_id`,"created_at" desc,"id" desc);