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
  } catch (error: any) {
    if (error.status === 404) {
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
  } catch (error: any) {
    if (error.status === 404) {
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
