import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
  jsonb,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const repoInventory = pgTable(
  "repo_inventory",
  {
    id: varchar("id", { length: 32 }).primaryKey(), // cuid2
    org: text("org").notNull(),
    repoId: integer("repo_id").notNull(),
    repoName: text("repo_name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    visibility: text("visibility").notNull(), // public/private/internal
    url: text("url").notNull(),

    primaryLanguage: text("primary_language"),
    frameworks: jsonb("frameworks").$type<string[]>().default([]),
    buildTools: jsonb("build_tools").$type<string[]>().default([]),
    packageManagers: jsonb("package_managers").$type<string[]>().default([]),
    container: jsonb("container").$type<string[]>().default([]),
    ciCd: jsonb("ci_cd").$type<string[]>().default([]),
    deployTargets: jsonb("deploy_targets").$type<string[]>().default([]),
    infraAsCode: jsonb("infra_as_code").$type<string[]>().default([]),
    databases: jsonb("databases").$type<string[]>().default([]),
    messaging: jsonb("messaging").$type<string[]>().default([]),
    testing: jsonb("testing").$type<string[]>().default([]),
    lintFormat: jsonb("lint_format").$type<string[]>().default([]),

    lastScannedAt: timestamp("last_scanned_at"),
    detectionScore: real("detection_score"),
    evidence: jsonb("evidence").$type<Record<string, any>>().default({}),
    missingSignals: jsonb("missing_signals").$type<string[]>().default([]),

    policyStatus: text("policy_status"), // compliant / drift / unknown
    policyViolations: jsonb("policy_violations").$type<Record<string, any>>(),

    // GitHub repository metadata
    repoUpdatedAt: timestamp("repo_updated_at"), // Last update from GitHub (pushed_at)
    repoPushedAt: timestamp("repo_pushed_at"), // Last push from GitHub

    // Contributors information
    contributors: jsonb("contributors").$type<Array<{
      login: string;
      avatarUrl: string;
      profileUrl: string;
      contributions: number;
    }>>(),
    contributorsCount: integer("contributors_count").default(0),
    contributorsUpdatedAt: timestamp("contributors_updated_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    repoOrgIdUnique: uniqueIndex("repo_org_id_unique").on(table.org, table.repoId),
  })
);

export const orgMembers = pgTable(
  "org_members",
  {
    id: varchar("id", { length: 32 }).primaryKey(), // cuid2
    org: text("org").notNull(),
    username: text("username").notNull(),
    userId: integer("user_id").notNull(),
    name: text("name"),
    avatarUrl: text("avatar_url").notNull(),
    profileUrl: text("profile_url").notNull(),
    role: text("role").notNull(), // "admin" | "member"

    // Statistics (cached)
    repositoryCount: integer("repository_count").default(0),
    lastActiveAt: timestamp("last_active_at"),

    // Metadata
    lastSyncedAt: timestamp("last_synced_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgUsernameUnique: uniqueIndex("org_username_unique").on(table.org, table.username),
  })
);
