-- Large test schema with internal relationships

-- Users table
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);

-- Products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  sku text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

-- Orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Order items (line items)
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  transaction_id text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- Addresses table
CREATE TABLE public.addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  postal_code text NOT NULL,
  country text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Reviews table
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Tags table
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);

-- Product tags (many-to-many)
CREATE TABLE public.product_tags (
  product_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT product_tags_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT product_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);

-- Wishlists table
CREATE TABLE public.wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wishlists_pkey PRIMARY KEY (id),
  CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Inventory table
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Shipping methods table
CREATE TABLE public.shipping_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_price numeric NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  CONSTRAINT shipping_methods_pkey PRIMARY KEY (id)
);

-- Order shipping
CREATE TABLE public.order_shipping (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  shipping_method_id uuid NOT NULL,
  tracking_number text UNIQUE,
  estimated_delivery timestamp with time zone,
  actual_delivery timestamp with time zone,
  CONSTRAINT order_shipping_pkey PRIMARY KEY (id),
  CONSTRAINT order_shipping_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_shipping_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id)
);

-- Discount codes table
CREATE TABLE public.discount_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  min_purchase_amount numeric DEFAULT 0,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  valid_from timestamp with time zone NOT NULL,
  valid_until timestamp with time zone NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT discount_codes_pkey PRIMARY KEY (id)
);

-- Order discounts (many-to-many)
CREATE TABLE public.order_discounts (
  order_id uuid NOT NULL,
  discount_code_id uuid NOT NULL,
  discount_amount numeric NOT NULL,
  CONSTRAINT order_discounts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_discounts_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id)
);

-- Notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- User sessions table
CREATE TABLE public.user_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  ip_address text,
  user_agent text,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Product variants (sizes, colors, etc.)
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric,
  is_available boolean NOT NULL DEFAULT true,
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Variant inventory
CREATE TABLE public.variant_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT variant_inventory_pkey PRIMARY KEY (id),
  CONSTRAINT variant_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);

-- Cart items
CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  variant_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id)
);

-- Product images
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Product attributes (custom attributes like "material", "dimensions", etc.)
CREATE TABLE public.product_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  attribute_name text NOT NULL,
  attribute_value text NOT NULL,
  CONSTRAINT product_attributes_pkey PRIMARY KEY (id),
  CONSTRAINT product_attributes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Favorites (similar to wishlist but more general)
CREATE TABLE public.favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT favorites_pkey PRIMARY KEY (id),
  CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Recently viewed
CREATE TABLE public.recently_viewed (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recently_viewed_pkey PRIMARY KEY (id),
  CONSTRAINT recently_viewed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT recently_viewed_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Reports/Analytics events
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- ============================================================================
-- Tables with ALTER TABLE foreign key constraints (pg_dump style)
-- ============================================================================

-- Companies table (no FKs in CREATE, added via ALTER)
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE,
  plan_type text NOT NULL DEFAULT 'free',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- Departments table
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_id uuid NOT NULL,
  manager_id uuid,
  budget numeric,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);

-- Add FK via ALTER TABLE (company relationship)
ALTER TABLE public.departments ADD CONSTRAINT departments_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- Employees table
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  salary numeric,
  hire_date timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

-- Add FKs via ALTER TABLE
ALTER TABLE public.employees ADD CONSTRAINT employees_department_id_fkey
  FOREIGN KEY (department_id) REFERENCES public.departments(id);

ALTER TABLE public.employees ADD CONSTRAINT employees_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Projects table
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  company_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);

ALTER TABLE public.projects ADD CONSTRAINT projects_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- Tasks table
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.employees(id);

-- Comments table
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id)
);

ALTER TABLE public.comments ADD CONSTRAINT comments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.comments ADD CONSTRAINT comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.users(id);

-- Attachments table
CREATE TABLE public.attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT attachments_pkey PRIMARY KEY (id)
);

ALTER TABLE public.attachments ADD CONSTRAINT attachments_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.attachments ADD CONSTRAINT attachments_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.users(id);

-- Time entries table
CREATE TABLE public.time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  duration_minutes integer NOT NULL,
  description text,
  date timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT time_entries_pkey PRIMARY KEY (id)
);

ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Milestones table
CREATE TABLE public.milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  target_date timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  CONSTRAINT milestones_pkey PRIMARY KEY (id)
);

ALTER TABLE public.milestones ADD CONSTRAINT milestones_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Task dependencies table (self-referencing tasks)
CREATE TABLE public.task_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  depends_on_task_id uuid NOT NULL,
  dependency_type text NOT NULL DEFAULT 'finish_to_start',
  CONSTRAINT task_dependencies_pkey PRIMARY KEY (id),
  CONSTRAINT task_dependencies_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id)
);

ALTER TABLE public.task_dependencies ADD CONSTRAINT task_dependencies_depends_on_fkey
  FOREIGN KEY (depends_on_task_id) REFERENCES public.tasks(id);

-- Labels table
CREATE TABLE public.labels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  CONSTRAINT labels_pkey PRIMARY KEY (id)
);

ALTER TABLE public.labels ADD CONSTRAINT labels_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Task labels (many-to-many) - using ALTER TABLE
CREATE TABLE public.task_labels (
  task_id uuid NOT NULL,
  label_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.task_labels ADD CONSTRAINT task_labels_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.task_labels ADD CONSTRAINT task_labels_label_id_fkey
  FOREIGN KEY (label_id) REFERENCES public.labels(id);

-- Sprints table
CREATE TABLE public.sprints (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  name text NOT NULL,
  goal text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  CONSTRAINT sprints_pkey PRIMARY KEY (id)
);

ALTER TABLE public.sprints ADD CONSTRAINT sprints_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

-- Task sprints (many-to-many) - tasks can belong to multiple sprints
CREATE TABLE public.task_sprints (
  task_id uuid NOT NULL,
  sprint_id uuid NOT NULL
);

ALTER TABLE public.task_sprints ADD CONSTRAINT task_sprints_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);

ALTER TABLE public.task_sprints ADD CONSTRAINT task_sprints_sprint_id_fkey
  FOREIGN KEY (sprint_id) REFERENCES public.sprints(id);

-- Team members (employees in projects)
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (id)
);

ALTER TABLE public.team_members ADD CONSTRAINT team_members_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.team_members ADD CONSTRAINT team_members_employee_id_fkey
  FOREIGN KEY (employee_id) REFERENCES public.employees(id);

-- Activity log
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid,
  task_id uuid,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id)
);

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_task_id_fkey
  FOREIGN KEY (task_id) REFERENCES public.tasks(id);
