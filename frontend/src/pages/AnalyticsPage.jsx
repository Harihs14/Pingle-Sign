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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  FileText,
  Search,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyticsApi, documentsApi } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const StatusCard = ({
  title,
  count,
  total,
  icon: Icon,
  color,
  description,
}) => {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold mb-1">{count}</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${color.replace(
                "text-",
                "bg-"
              )} transition-all`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const getStatusBadge = (status) => {
  const variants = {
    completed: { variant: "default", className: "bg-emerald-500" },
    pending: { variant: "secondary", className: "bg-amber-500" },
    expired: { variant: "destructive", className: "bg-red-500" },
  };

  const config = variants[status] || variants.pending;

  return (
    <Badge className={config.className} variant={config.variant}>
      {status}
    </Badge>
  );
};

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

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      await loadAnalyticsData();
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [statsData, docs] = await Promise.all([
        analyticsApi.getStats(),
        documentsApi.getAll(),
      ]);
      setStats(statsData);
      setDocuments(docs);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Status filter
      if (statusFilter !== "all" && doc.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const templateName = (doc.template_name || "").toLowerCase();
        const signerName = (doc.signer_name || "").toLowerCase();
        const signerEmail = (doc.signer_email || "").toLowerCase();

        return (
          templateName.includes(query) ||
          signerName.includes(query) ||
          signerEmail.includes(query)
        );
      }

      return true;
    });
  }, [documents, statusFilter, searchQuery]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track document signing status and performance
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
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Status Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatusCard
                title="Sent"
                count={stats?.sent || 0}
                total={stats?.sent || 1}
                icon={Send}
                color="text-blue-500"
                description="Total documents sent"
              />
              <StatusCard
                title="Accepted"
                count={stats?.completed || 0}
                total={stats?.sent || 1}
                icon={CheckCircle2}
                color="text-emerald-500"
                description="Successfully signed"
              />
              <StatusCard
                title="Waiting"
                count={stats?.pending || 0}
                total={stats?.sent || 1}
                icon={Clock}
                color="text-amber-500"
                description="Awaiting signature"
              />
              <StatusCard
                title="Rejected/Expired"
                count={stats?.expired || 0}
                total={stats?.sent || 1}
                icon={XCircle}
                color="text-red-500"
                description="Expired or rejected"
              />
            </div>

            {/* Documents Table */}
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  View and filter all document signing requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by template, name, or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Waiting</SelectItem>
                      <SelectItem value="completed">Accepted</SelectItem>
                      <SelectItem value="expired">Rejected/Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents found</p>
                    <p className="text-sm mt-2">
                      {documents.length === 0
                        ? "No documents have been sent yet"
                        : "Try adjusting your filters"}
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
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((document) => (
                        <TableRow key={document.id}>
                          <TableCell className="font-medium">
                            {document.template_name || "Untitled Template"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">
                                {document.signer_name || "N/A"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {document.signer_email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(document.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(document.created_at)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {document.completed_at
                              ? formatDate(document.completed_at)
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {document.status === "completed" &&
                            document.signed_pdf_path ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={async () => {
                                  // Open signed PDF in new tab
                                  const pdfUrl = `${
                                    import.meta.env.VITE_API_URL ||
                                    "http://localhost:3001"
                                  }/${document.signed_pdf_path}`;

                                  // Try to open the PDF
                                  const newWindow = window.open(
                                    pdfUrl,
                                    "_blank"
                                  );

                                  // Check if file exists by trying to fetch it
                                  try {
                                    const response = await fetch(pdfUrl, {
                                      method: "HEAD",
                                    });
                                    if (!response.ok) {
                                      // File doesn't exist
                                      newWindow?.close();
                                      alert(
                                        "The signed PDF file is not available. It may have been deleted or not created properly."
                                      );
                                    }
                                  } catch (error) {
                                    console.error("Error checking PDF:", error);
                                    // If fetch fails, still try to open (might be CORS)
                                  }
                                }}
                                className="h-8 w-8"
                                title="View signed PDF"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                -
                              </span>
                            )}
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

export default AnalyticsPage;
