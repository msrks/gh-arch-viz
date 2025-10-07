import { Octokit } from "@octokit/rest";

/**
 * Create an Octokit instance with the provided access token
 */
export function makeOctokit(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}

/**
 * List all repositories in an organization
 */
export async function listOrgRepos(
  octokit: Octokit,
  org: string
) {
  const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
    org,
    type: "all", // Include public, private, and internal repos
    per_page: 100,
  });

  return repos.map((r) => ({
    repoId: r.id,
    name: r.name,
    owner: r.owner?.login || org,
    url: r.html_url,
    defaultBranch: r.default_branch || "main",
    visibility: r.visibility || "public",
    primaryLanguage: r.language || null,
    updatedAt: r.updated_at ? new Date(r.updated_at) : null,
    pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
  }));
}

/**
 * List all repositories accessible by a specific team
 */
export async function listTeamRepos(
  octokit: Octokit,
  org: string,
  teamSlug: string
) {
  const repos = await octokit.paginate(octokit.rest.teams.listReposInOrg, {
    org,
    team_slug: teamSlug,
    per_page: 100,
  });

  return repos.map((r) => ({
    repoId: r.id,
    name: r.name,
    owner: r.owner?.login || org,
    url: r.html_url,
    defaultBranch: r.default_branch || "main",
    visibility: r.visibility || "public",
    primaryLanguage: r.language || null,
    updatedAt: r.updated_at ? new Date(r.updated_at) : null,
    pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
  }));
}

/**
 * Get the file tree for a repository branch
 */
export async function getRepoTree(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string
) {
  try {
    const { data: branchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch,
    });

    const { data: tree } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branchData.commit.sha,
      recursive: "1",
    });

    return tree.tree; // [{ path, type, sha }]
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      console.warn(`Branch ${branch} not found in ${owner}/${repo}`);
      return [];
    }
    throw error;
  }
}

/**
 * Get text content of a file in a repository
 */
export async function getText(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (!Array.isArray(response.data) && "content" in response.data) {
      return Buffer.from(response.data.content, "base64").toString("utf8");
    }

    return null;
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(octokit: Octokit) {
  const { data } = await octokit.rest.rateLimit.get();
  return {
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
    limit: data.rate.limit,
  };
}

/**
 * List all members in an organization
 */
export async function listOrgMembers(
  octokit: Octokit,
  org: string
) {
  const members = await octokit.paginate(octokit.rest.orgs.listMembers, {
    org,
    per_page: 100,
  });

  return members.map((m) => ({
    username: m.login,
    userId: m.id,
    avatarUrl: m.avatar_url,
    profileUrl: m.html_url,
  }));
}

/**
 * Get user details including name
 */
export async function getUserDetails(
  octokit: Octokit,
  username: string
) {
  const { data } = await octokit.rest.users.getByUsername({
    username,
  });

  return {
    name: data.name,
    company: data.company,
    location: data.location,
    bio: data.bio,
  };
}

/**
 * Get member role in organization
 */
export async function getMemberRole(
  octokit: Octokit,
  org: string,
  username: string
): Promise<"admin" | "member"> {
  const { data } = await octokit.rest.orgs.getMembershipForUser({
    org,
    username,
  });

  return data.role as "admin" | "member";
}

/**
 * List all teams in an organization
 */
export async function listOrgTeams(
  octokit: Octokit,
  org: string
) {
  const teams = await octokit.paginate(octokit.rest.teams.list, {
    org,
    per_page: 100,
  });

  return teams.map((t) => ({
    teamId: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    privacy: t.privacy,
  }));
}

/**
 * List all members of a team
 */
export async function listTeamMembers(
  octokit: Octokit,
  org: string,
  teamSlug: string
) {
  const members = await octokit.paginate(octokit.rest.teams.listMembersInOrg, {
    org,
    team_slug: teamSlug,
    per_page: 100,
  });

  return members.map((m) => ({
    username: m.login,
    userId: m.id,
  }));
}

/**
 * Get team membership role for a user
 */
export async function getTeamMembershipRole(
  octokit: Octokit,
  org: string,
  teamSlug: string,
  username: string
): Promise<"maintainer" | "member"> {
  try {
    const { data } = await octokit.rest.teams.getMembershipForUserInOrg({
      org,
      team_slug: teamSlug,
      username,
    });
    return data.role as "maintainer" | "member";
  } catch (error: unknown) {
    const err = error as { status?: number };
    if (err.status === 404) {
      return "member"; // Default to member if not found
    }
    throw error;
  }
}

/**
 * List repository languages (only those with >= threshold percentage)
 */
export async function listRepoLanguages(
  octokit: Octokit,
  owner: string,
  repo: string,
  threshold: number = 20
): Promise<Array<{ name: string; percentage: number }>> {
  try {
    const { data } = await octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // Calculate total bytes
    const totalBytes = Object.values(data).reduce((sum, bytes) => sum + bytes, 0);

    if (totalBytes === 0) {
      return [];
    }

    // Calculate percentages and filter by threshold
    const languages = Object.entries(data)
      .map(([name, bytes]) => ({
        name,
        percentage: Math.round((bytes / totalBytes) * 100),
      }))
      .filter((lang) => lang.percentage >= threshold)
      .sort((a, b) => b.percentage - a.percentage);

    return languages;
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 404 || err.status === 403) {
      console.warn(`Could not fetch languages for ${owner}/${repo}:`, err.message || "Unknown error");
      return [];
    }
    throw error;
  }
}

/**
 * List repository contributors (top 10 only)
 */
export async function listRepoContributors(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<Array<{
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
}>> {
  try {
    // Fetch first page only (per_page=100) to get top contributors
    const { data } = await octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
      anon: "false", // Exclude anonymous contributors
    });

    // Filter out bots and take top 10
    return data
      .filter((c) => c.type === "User")
      .slice(0, 10)
      .map((c) => ({
        login: c.login || "",
        avatarUrl: c.avatar_url || "",
        profileUrl: c.html_url || "",
        contributions: c.contributions || 0,
      }));
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    // Handle 404 (empty repo, no contributors) or 403 (rate limit)
    if (err.status === 404 || err.status === 403) {
      console.warn(`Could not fetch contributors for ${owner}/${repo}:`, err.message || "Unknown error");
      return [];
    }
    throw error;
  }
}
