import React, { useState, useEffect, useMemo } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Zap,
} from "lucide-react";
import { analyticsApi, documentsApi, templatesApi } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendValue,
  trendDirection,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mb-2">{description}</p>
        )}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              trendDirection === "up" ? "text-emerald-600" : "text-red-600"
            )}
          >
            {trendDirection === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await loadDashboardData();
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Optimize: getStats already fetches documents and templates
      // So we only need to call getStats and getRecentDocuments
      const [statsData, recent] = await Promise.all([
        analyticsApi.getStats(),
        analyticsApi.getRecentDocuments(10),
      ]);
      setStats(statsData);
      setRecentDocuments(recent);
      // Use stats data for allDocuments and templates counts
      setAllDocuments([]); // We don't need full list for dashboard
      setTemplates([]); // We don't need full list for dashboard
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = useMemo(() => {
    if (!stats || stats.sent === 0) return 0;
    return Math.round((stats.completed / stats.sent) * 100);
  }, [stats]);

  const todayStats = useMemo(() => {
    if (!recentDocuments.length) return { sent: 0, completed: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayDocs = recentDocuments.filter((doc) => {
      const docDate = new Date(doc.created_at);
      return docDate >= today;
    });

    return {
      sent: todayDocs.length,
      completed: todayDocs.filter((d) => d.status === "completed").length,
    };
  }, [recentDocuments]);

  const weeklyStats = useMemo(() => {
    if (!recentDocuments.length) return { sent: 0, completed: 0 };
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const weekDocs = recentDocuments.filter((doc) => {
      const docDate = new Date(doc.created_at);
      return docDate >= weekAgo;
    });

    return {
      sent: weekDocs.length,
      completed: weekDocs.filter((d) => d.status === "completed").length,
    };
  }, [recentDocuments]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: {
        variant: "default",
        className: "bg-emerald-500",
      },
      pending: {
        variant: "secondary",
        className: "bg-amber-500",
      },
      expired: {
        variant: "destructive",
        className: "bg-red-500",
      },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge className={config.className} variant={config.variant}>
        {status}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Overview of your document signing activity and performance metrics
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Templates"
                value={stats?.totalTemplates || 0}
                icon={FileText}
                description="Active templates in system"
              />
              <StatCard
                title="Documents Sent"
                value={stats?.sent || 0}
                icon={Send}
                description="Total signing requests"
                trend={todayStats.sent > 0 ? `${todayStats.sent} today` : null}
                trendDirection={todayStats.sent > 0 ? "up" : null}
              />
              <StatCard
                title="Completed"
                value={stats?.completed || 0}
                icon={CheckCircle2}
                description="Successfully signed"
                trend={`${completionRate}% completion rate`}
                trendDirection="up"
              />
              <StatCard
                title="Pending"
                value={stats?.pending || 0}
                icon={Clock}
                description="Awaiting signature"
              />
            </div>

            {/* Secondary Stats and Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    This Week
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Sent
                      </span>
                      <span className="text-lg font-semibold">
                        {weeklyStats.sent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Completed
                      </span>
                      <span className="text-lg font-semibold text-emerald-600">
                        {weeklyStats.completed}
                      </span>
                    </div>
                    {weeklyStats.sent > 0 && (
                      <Progress
                        value={(weeklyStats.completed / weeklyStats.sent) * 100}
                        className="h-2"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {completionRate}%
                      </span>
                      <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Progress value={completionRate} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {stats?.completed || 0} of {stats?.sent || 0} documents
                      completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm">Accepted</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.completed || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Waiting</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.pending || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Expired</span>
                      </div>
                      <span className="font-semibold">
                        {stats?.expired || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Documents Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest document signing requests and activity
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Zap className="h-3 w-3" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {recentDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents yet</p>
                    <p className="text-sm mt-2">
                      Start by creating a template and sending it for signing
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template</TableHead>
                        <TableHead>Signer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {doc.template_name || "Untitled Template"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">
                                {doc.signer_name || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.signer_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(doc.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {doc.completed_at
                              ? formatDate(doc.completed_at)
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
