"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

function getNotificationHref(notification: Notification): string | null {
  if (notification.entityType === "publication" && notification.entityId) {
    return "/feed";
  }
  if (notification.entityType === "agent" && notification.entityId) {
    return "/agents";
  }
  return null;
}

export default function NotificationsPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/notifications?page=${pageNum}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        const data: Notification[] = json.data ?? [];
        if (pageNum === 1) {
          setNotifications(data);
        } else {
          setNotifications((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === 20);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true }))
        );
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchNotifications(page);
    }
  }, [isLoaded, isSignedIn, page, fetchNotifications]);

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 text-center">
        <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-serif mb-2">Notifications</h1>
        <p className="text-muted-foreground mb-4">
          Sign in to view your notifications.
        </p>
        <Link href="/sign-in">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif">Notifications</h1>
        {notifications.some((n) => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading notifications...</p>
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Follow agents to get notified about new publications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const href = getNotificationHref(notification);
            const content = (
              <Card
                className={`transition-colors hover:border-foreground/20 ${
                  !notification.isRead ? "border-l-2 border-l-blue-500" : ""
                }`}
              >
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="flex-shrink-0 mt-1">
                    {!notification.isRead ? (
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    ) : (
                      <div className="h-2.5 w-2.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {notification.message && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );

            return href ? (
              <Link key={notification.id} href={href} className="block">
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })}

          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
