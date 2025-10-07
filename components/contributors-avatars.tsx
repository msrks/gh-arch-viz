import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Contributor = {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
};

interface ContributorsAvatarsProps {
  contributors: Contributor[] | null;
  maxDisplay?: number;
}

export function ContributorsAvatars({
  contributors,
  maxDisplay = 3,
}: ContributorsAvatarsProps) {
  if (!contributors || contributors.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const displayContributors = contributors.slice(0, maxDisplay);

  return (
    <TooltipProvider>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {displayContributors.map((contributor, index) => (
            <Tooltip key={contributor.login}>
              <TooltipTrigger asChild>
                <a
                  href={contributor.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative inline-block"
                  style={{ zIndex: displayContributors.length - index }}
                >
                  <Avatar className="h-7 w-7 border-2 border-background hover:border-primary transition-colors">
                    <AvatarImage
                      src={contributor.avatarUrl}
                      alt={contributor.login}
                    />
                    <AvatarFallback>
                      {contributor.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </a>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  @{contributor.login} ({contributor.contributions}{" "}
                  contributions)
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        {/* {remaining > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                +{remaining}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="max-w-xs">
                <p className="font-semibold mb-1">Other contributors:</p>
                {contributors.slice(maxDisplay).map((c) => (
                  <p key={c.login} className="text-sm">
                    @{c.login} ({c.contributions})
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )} */}
      </div>
    </TooltipProvider>
  );
}
