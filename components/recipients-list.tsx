"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  createdAt: Date;
}

interface RecipientsListProps {
  initialRecipients: Recipient[];
}

export function RecipientsList({ initialRecipients }: RecipientsListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this recipient?")) {
      return;
    }

    setLoadingId(id);
    try {
      const response = await fetch(`/api/recipients?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipient");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete recipient");
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setLoadingId(id);
    try {
      const response = await fetch("/api/recipients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: !currentActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update recipient");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update recipient");
    } finally {
      setLoadingId(null);
    }
  };

  if (initialRecipients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No recipients configured. Add your first recipient above.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {initialRecipients.map((recipient) => (
          <TableRow key={recipient.id}>
            <TableCell className="font-medium">{recipient.email}</TableCell>
            <TableCell className="text-muted-foreground">
              {recipient.name || "—"}
            </TableCell>
            <TableCell>
              {recipient.active ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(recipient.createdAt), "MMM dd, yyyy")}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(recipient.id, recipient.active)}
                  disabled={loadingId === recipient.id}
                  title={recipient.active ? "Deactivate" : "Activate"}
                >
                  {loadingId === recipient.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : recipient.active ? (
                    <ToggleRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(recipient.id)}
                  disabled={loadingId === recipient.id}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
