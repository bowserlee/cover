CREATE TABLE "friends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"venmo_handle" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
