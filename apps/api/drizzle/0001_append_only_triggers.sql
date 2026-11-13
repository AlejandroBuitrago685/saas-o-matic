-- Custom SQL migration file, put your code below! --
-- Append-only tables (D-29, 04-base-de-datos §2.4): customers are only created and read, and simulations are
-- immutable snapshots. The database rejects any UPDATE or DELETE, whatever the code does.
CREATE TRIGGER `customers_no_update` BEFORE UPDATE ON `customers` BEGIN SELECT RAISE(ABORT, 'customers is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER `customers_no_delete` BEFORE DELETE ON `customers` BEGIN SELECT RAISE(ABORT, 'customers is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER `simulations_no_update` BEFORE UPDATE ON `simulations` BEGIN SELECT RAISE(ABORT, 'simulations is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER `simulations_no_delete` BEFORE DELETE ON `simulations` BEGIN SELECT RAISE(ABORT, 'simulations is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER `simulation_tiers_no_update` BEFORE UPDATE ON `simulation_tiers` BEGIN SELECT RAISE(ABORT, 'simulation_tiers is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER `simulation_tiers_no_delete` BEFORE DELETE ON `simulation_tiers` BEGIN SELECT RAISE(ABORT, 'simulation_tiers is append-only'); END;
