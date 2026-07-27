CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`yield_text` text,
	`servings` real,
	`prep_time_minutes` integer,
	`cook_time_minutes` integer,
	`total_time_minutes` integer,
	`cuisine` text,
	`dish_name` text,
	`search_aliases_json` text DEFAULT '[]' NOT NULL,
	`notes` text,
	`favorite` integer DEFAULT false NOT NULL,
	`source_url` text,
	`canonical_url` text,
	`cleaned_text` text,
	`content_fingerprint` text,
	`json_ld_present` integer DEFAULT false NOT NULL,
	`image_object_key` text,
	`image_source_url` text,
	`image_content_type` text,
	`image_warning` text,
	`inferred_fields_json` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_canonical_url_uidx` ON `recipes` (`canonical_url`);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_content_fingerprint_uidx` ON `recipes` (`content_fingerprint`);
--> statement-breakpoint
CREATE TABLE `ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`original_text` text NOT NULL,
	`name` text NOT NULL,
	`amount` real,
	`amount_max` real,
	`unit` text,
	`qualitative` text,
	`preparation` text,
	`optional` integer DEFAULT false NOT NULL,
	`pantry_default` integer DEFAULT false NOT NULL,
	`group_label` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `instructions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`text` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_uidx` ON `tags` (`name`);
--> statement-breakpoint
CREATE TABLE `recipe_tags` (
	`recipe_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_tags_uidx` ON `recipe_tags` (`recipe_id`,`tag_id`);
--> statement-breakpoint
CREATE TABLE `import_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text,
	`source_text` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`stage_message` text,
	`error` text,
	`recipe_id` integer,
	`duplicate_of_recipe_id` integer,
	`image_warning` text,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`locked_at` text,
	`completed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`duplicate_of_recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);
--> statement-breakpoint
CREATE TABLE `swiggy_oauth_clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text,
	`redirect_uri` text NOT NULL,
	`metadata_json` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `swiggy_oauth_clients_client_id_unique` ON `swiggy_oauth_clients` (`client_id`);
--> statement-breakpoint
CREATE TABLE `swiggy_oauth_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`state` text NOT NULL,
	`code_verifier` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `swiggy_oauth_states_state_unique` ON `swiggy_oauth_states` (`state`);
--> statement-breakpoint
CREATE TABLE `swiggy_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`access_token` text NOT NULL,
	`token_type` text DEFAULT 'Bearer' NOT NULL,
	`scope` text,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `food_proposals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`address_id` text NOT NULL,
	`address_display` text,
	`offers_json` text DEFAULT '[]' NOT NULL,
	`selected_offer_id` text,
	`selected_customization_json` text,
	`captured_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `food_proposals_recipe_uidx` ON `food_proposals` (`recipe_id`);
--> statement-breakpoint
CREATE TABLE `ingredient_baskets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`address_id` text NOT NULL,
	`address_display` text,
	`target_servings` real NOT NULL,
	`source_servings` real,
	`lines_json` text DEFAULT '[]' NOT NULL,
	`estimated_total` real,
	`captured_at` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_baskets_recipe_uidx` ON `ingredient_baskets` (`recipe_id`);
--> statement-breakpoint
CREATE TABLE `cart_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`address_id` text NOT NULL,
	`address_display` text,
	`payload_hash` text NOT NULL,
	`live_cart_snapshot_json` text NOT NULL,
	`proposed_payload_json` text NOT NULL,
	`warnings_json` text DEFAULT '[]' NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE VIRTUAL TABLE recipes_fts USING fts5(
  title,
  ingredients,
  tags,
  content=''
);
--> statement-breakpoint
CREATE TRIGGER recipes_fts_ai AFTER INSERT ON recipes BEGIN
  INSERT INTO recipes_fts(rowid, title, ingredients, tags)
  VALUES (
    new.id,
    new.title,
    '',
    ''
  );
END;
--> statement-breakpoint
CREATE TRIGGER recipes_fts_ad AFTER DELETE ON recipes BEGIN
  INSERT INTO recipes_fts(recipes_fts, rowid, title, ingredients, tags)
  VALUES('delete', old.id, old.title, '', '');
END;
--> statement-breakpoint
CREATE TRIGGER recipes_fts_au AFTER UPDATE ON recipes BEGIN
  INSERT INTO recipes_fts(recipes_fts, rowid, title, ingredients, tags)
  VALUES('delete', old.id, old.title, '', '');
  INSERT INTO recipes_fts(rowid, title, ingredients, tags)
  VALUES (
    new.id,
    new.title,
    COALESCE((SELECT group_concat(name, ' ') FROM ingredients WHERE recipe_id = new.id), ''),
    COALESCE((
      SELECT group_concat(t.name, ' ')
      FROM recipe_tags rt
      JOIN tags t ON t.id = rt.tag_id
      WHERE rt.recipe_id = new.id
    ), '')
  );
END;
