CREATE TABLE "users" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "full_name" TEXT,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "categories" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "parent_id" VARCHAR(255),
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "products" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "category_id" VARCHAR(255) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" VARCHAR(255) NOT NULL,
  "sku" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "orders" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "status" TEXT NOT NULL,
  "total_amount" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "order_items" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "order_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price" VARCHAR(255) NOT NULL
);

CREATE TABLE "payments" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "order_id" VARCHAR(255) NOT NULL UNIQUE,
  "amount" VARCHAR(255) NOT NULL,
  "payment_method" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "transaction_id" TEXT UNIQUE,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "addresses" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "street" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postal_code" TEXT NOT NULL,
  "country" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL
);

CREATE TABLE "reviews" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "comment" TEXT,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "tags" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "product_tags" (
  "product_id" VARCHAR(255) NOT NULL,
  "tag_id" VARCHAR(255) NOT NULL
);

CREATE TABLE "wishlists" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "inventory" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "product_id" VARCHAR(255) NOT NULL UNIQUE,
  "quantity" INTEGER NOT NULL,
  "last_updated" TIMESTAMP NOT NULL
);

CREATE TABLE "shipping_methods" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "base_price" VARCHAR(255) NOT NULL,
  "is_available" BOOLEAN NOT NULL
);

CREATE TABLE "order_shipping" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "order_id" VARCHAR(255) NOT NULL UNIQUE,
  "shipping_method_id" VARCHAR(255) NOT NULL,
  "tracking_number" TEXT UNIQUE,
  "estimated_delivery" TIMESTAMP,
  "actual_delivery" TIMESTAMP
);

CREATE TABLE "discount_codes" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "discount_type" TEXT NOT NULL,
  "discount_value" VARCHAR(255) NOT NULL,
  "min_purchase_amount" VARCHAR(255),
  "max_uses" INTEGER,
  "current_uses" INTEGER NOT NULL,
  "valid_from" TIMESTAMP NOT NULL,
  "valid_until" TIMESTAMP NOT NULL,
  "is_active" BOOLEAN NOT NULL
);

CREATE TABLE "order_discounts" (
  "order_id" VARCHAR(255) NOT NULL,
  "discount_code_id" VARCHAR(255) NOT NULL,
  "discount_amount" VARCHAR(255) NOT NULL
);

CREATE TABLE "notifications" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT,
  "is_read" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "user_sessions" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "session_token" TEXT NOT NULL UNIQUE,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "last_activity" TIMESTAMP NOT NULL
);

CREATE TABLE "product_variants" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "sku" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "price" VARCHAR(255),
  "is_available" BOOLEAN NOT NULL
);

CREATE TABLE "variant_inventory" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "variant_id" VARCHAR(255) NOT NULL UNIQUE,
  "quantity" INTEGER NOT NULL,
  "last_updated" TIMESTAMP NOT NULL
);

CREATE TABLE "cart_items" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "variant_id" VARCHAR(255),
  "quantity" INTEGER NOT NULL
);

CREATE TABLE "product_images" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "url" TEXT NOT NULL,
  "alt_text" TEXT,
  "sort_order" INTEGER NOT NULL,
  "is_primary" BOOLEAN NOT NULL
);

CREATE TABLE "product_attributes" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "attribute_name" TEXT NOT NULL,
  "attribute_value" TEXT NOT NULL
);

CREATE TABLE "favorites" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "recently_viewed" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "product_id" VARCHAR(255) NOT NULL,
  "viewed_at" TIMESTAMP NOT NULL
);

CREATE TABLE "analytics_events" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255),
  "event_type" TEXT NOT NULL,
  "event_data" VARCHAR(255),
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "companies" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "domain" TEXT UNIQUE,
  "plan_type" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "departments" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "company_id" VARCHAR(255) NOT NULL,
  "manager_id" VARCHAR(255),
  "budget" VARCHAR(255)
);

CREATE TABLE "employees" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "department_id" VARCHAR(255) NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "role" TEXT NOT NULL,
  "salary" VARCHAR(255),
  "hire_date" TIMESTAMP NOT NULL
);

CREATE TABLE "projects" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "company_id" VARCHAR(255) NOT NULL,
  "status" TEXT NOT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP
);

CREATE TABLE "tasks" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "project_id" VARCHAR(255) NOT NULL,
  "assigned_to" VARCHAR(255),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "due_date" TIMESTAMP,
  "completed_at" TIMESTAMP
);

CREATE TABLE "comments" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "task_id" VARCHAR(255) NOT NULL,
  "author_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "attachments" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "task_id" VARCHAR(255) NOT NULL,
  "uploaded_by" VARCHAR(255) NOT NULL,
  "filename" TEXT NOT NULL,
  "file_url" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "created_at" TIMESTAMP NOT NULL
);

CREATE TABLE "time_entries" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "task_id" VARCHAR(255) NOT NULL,
  "employee_id" VARCHAR(255) NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP NOT NULL
);

CREATE TABLE "milestones" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "project_id" VARCHAR(255) NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "target_date" TIMESTAMP NOT NULL,
  "completed_at" TIMESTAMP
);

CREATE TABLE "task_dependencies" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "task_id" VARCHAR(255) NOT NULL,
  "depends_on_task_id" VARCHAR(255) NOT NULL,
  "dependency_type" TEXT NOT NULL
);

CREATE TABLE "labels" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "project_id" VARCHAR(255) NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL
);

CREATE TABLE "task_labels" (
  "task_id" VARCHAR(255) NOT NULL,
  "label_id" VARCHAR(255) NOT NULL,
  "assigned_at" TIMESTAMP NOT NULL
);

CREATE TABLE "sprints" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "project_id" VARCHAR(255) NOT NULL,
  "name" TEXT NOT NULL,
  "goal" TEXT,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "status" TEXT NOT NULL
);

CREATE TABLE "task_sprints" (
  "task_id" VARCHAR(255) NOT NULL,
  "sprint_id" VARCHAR(255) NOT NULL
);

CREATE TABLE "team_members" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "project_id" VARCHAR(255) NOT NULL,
  "employee_id" VARCHAR(255) NOT NULL,
  "role" TEXT NOT NULL,
  "joined_at" TIMESTAMP NOT NULL
);

CREATE TABLE "activity_log" (
  "id" VARCHAR(255) PRIMARY KEY NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "project_id" VARCHAR(255),
  "task_id" VARCHAR(255),
  "action" TEXT NOT NULL,
  "details" VARCHAR(255),
  "created_at" TIMESTAMP NOT NULL
);

ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_parent_id" FOREIGN KEY ("parent_id") REFERENCES "categories" ("id");

ALTER TABLE "products" ADD CONSTRAINT "fk_products_category_id" FOREIGN KEY ("category_id") REFERENCES "categories" ("id");

ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders" ("id");

ALTER TABLE "order_items" ADD CONSTRAINT "fk_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_order_id" FOREIGN KEY ("order_id") REFERENCES "orders" ("id");

ALTER TABLE "addresses" ADD CONSTRAINT "fk_addresses_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "product_tags" ADD CONSTRAINT "fk_product_tags_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "product_tags" ADD CONSTRAINT "fk_product_tags_tag_id" FOREIGN KEY ("tag_id") REFERENCES "tags" ("id");

ALTER TABLE "wishlists" ADD CONSTRAINT "fk_wishlists_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "wishlists" ADD CONSTRAINT "fk_wishlists_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "inventory" ADD CONSTRAINT "fk_inventory_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "order_shipping" ADD CONSTRAINT "fk_order_shipping_order_id" FOREIGN KEY ("order_id") REFERENCES "orders" ("id");

ALTER TABLE "order_shipping" ADD CONSTRAINT "fk_order_shipping_shipping_method_id" FOREIGN KEY ("shipping_method_id") REFERENCES "shipping_methods" ("id");

ALTER TABLE "order_discounts" ADD CONSTRAINT "fk_order_discounts_order_id" FOREIGN KEY ("order_id") REFERENCES "orders" ("id");

ALTER TABLE "order_discounts" ADD CONSTRAINT "fk_order_discounts_discount_code_id" FOREIGN KEY ("discount_code_id") REFERENCES "discount_codes" ("id");

ALTER TABLE "notifications" ADD CONSTRAINT "fk_notifications_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "user_sessions" ADD CONSTRAINT "fk_user_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "variant_inventory" ADD CONSTRAINT "fk_variant_inventory_variant_id" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id");

ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "cart_items" ADD CONSTRAINT "fk_cart_items_variant_id" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id");

ALTER TABLE "product_images" ADD CONSTRAINT "fk_product_images_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "product_attributes" ADD CONSTRAINT "fk_product_attributes_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "favorites" ADD CONSTRAINT "fk_favorites_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "recently_viewed" ADD CONSTRAINT "fk_recently_viewed_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "recently_viewed" ADD CONSTRAINT "fk_recently_viewed_product_id" FOREIGN KEY ("product_id") REFERENCES "products" ("id");

ALTER TABLE "analytics_events" ADD CONSTRAINT "fk_analytics_events_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "task_dependencies" ADD CONSTRAINT "fk_task_dependencies_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_company_id" FOREIGN KEY ("company_id") REFERENCES "companies" ("id");

ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_department_id" FOREIGN KEY ("department_id") REFERENCES "departments" ("id");

ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "projects" ADD CONSTRAINT "fk_projects_company_id" FOREIGN KEY ("company_id") REFERENCES "companies" ("id");

ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_assigned_to" FOREIGN KEY ("assigned_to") REFERENCES "employees" ("id");

ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "comments" ADD CONSTRAINT "fk_comments_author_id" FOREIGN KEY ("author_id") REFERENCES "users" ("id");

ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id");

ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "time_entries" ADD CONSTRAINT "fk_time_entries_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id");

ALTER TABLE "milestones" ADD CONSTRAINT "fk_milestones_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "task_dependencies" ADD CONSTRAINT "fk_task_dependencies_depends_on_task_id" FOREIGN KEY ("depends_on_task_id") REFERENCES "tasks" ("id");

ALTER TABLE "labels" ADD CONSTRAINT "fk_labels_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "task_labels" ADD CONSTRAINT "fk_task_labels_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "task_labels" ADD CONSTRAINT "fk_task_labels_label_id" FOREIGN KEY ("label_id") REFERENCES "labels" ("id");

ALTER TABLE "sprints" ADD CONSTRAINT "fk_sprints_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "task_sprints" ADD CONSTRAINT "fk_task_sprints_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");

ALTER TABLE "task_sprints" ADD CONSTRAINT "fk_task_sprints_sprint_id" FOREIGN KEY ("sprint_id") REFERENCES "sprints" ("id");

ALTER TABLE "team_members" ADD CONSTRAINT "fk_team_members_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "team_members" ADD CONSTRAINT "fk_team_members_employee_id" FOREIGN KEY ("employee_id") REFERENCES "employees" ("id");

ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");

ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_project_id" FOREIGN KEY ("project_id") REFERENCES "projects" ("id");

ALTER TABLE "activity_log" ADD CONSTRAINT "fk_activity_log_task_id" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id");