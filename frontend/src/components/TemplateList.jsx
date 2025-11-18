import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  Trash2,
  Search,
  Calendar,
  Edit,
  MoreVertical,
  ArrowUpRight,
  Send,
  Loader2,
  X,
  CheckCircle2,
  Mail,
  Link,
  Shield,
  Copy,
} from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { templatesApi, documentsApi } from "@/services/api";
import { ScrollArea } from "@/components/ui/scroll-area";

const AUTO_FILLED_FIELD_TYPES = new Set([
  "fullname",
  "initial",
  "email",
  "signdate",
]);

const TemplateList = ({ onSelectTemplate, onNewTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendDialogLoading, setSendDialogLoading] = useState(false);
  const [sendDialogTemplate, setSendDialogTemplate] = useState(null);
  const [sendDataFields, setSendDataFields] = useState([]);
  const [sendForm, setSendForm] = useState({
    signerName: "",
    signerEmail: "",
    data: {},
  });
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sendFeedback, setSendFeedback] = useState(null);
  const [sendDialogError, setSendDialogError] = useState("");
  const [sendSuccessDialogOpen, setSendSuccessDialogOpen] = useState(false);
  const [sendSuccessDetails, setSendSuccessDetails] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await templatesApi.getAll();
      // Ensure we have an array
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !pdfFile) {
      alert("Please provide a template name and upload a PDF file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("name", templateName);
      formData.append("pdf", pdfFile);

      const data = await templatesApi.create(formData);
      setOpen(false);
      setTemplateName("");
      setPdfFile(null);
      onNewTemplate(data.id, pdfFile);
      fetchTemplates();
    } catch (error) {
      console.error("Error creating template:", error);
      alert(error.message || "Failed to create template");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (id, e) => {
    e.stopPropagation();
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await templatesApi.delete(templateToDelete);
      fetchTemplates();
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error("Error deleting template:", error);
      alert(error.message || "Failed to delete template");
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleEditName = (template, e) => {
    e.stopPropagation();
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
  };

  const handleSaveName = async (templateId) => {
    if (!editingTemplateName.trim()) {
      alert("Template name cannot be empty");
      return;
    }

    try {
      setUpdatingName(true);
      await templatesApi.updateName(templateId, editingTemplateName.trim());
      setEditingTemplateId(null);
      setEditingTemplateName("");
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template name:", error);
      alert(error.message || "Failed to update template name");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTemplateId(null);
    setEditingTemplateName("");
  };

  const handleSelectTemplate = async (template) => {
    try {
      const data = await templatesApi.getById(template.id);
      onSelectTemplate(data);
    } catch (error) {
      console.error("Error loading template:", error);
      alert(error.message || "Failed to load template");
    }
  };

  const filteredTemplates = useMemo(() => {
    // Ensure templates is an array
    const templatesArray = Array.isArray(templates) ? templates : [];

    if (!searchQuery.trim()) {
      return templatesArray;
    }
    const query = searchQuery.trim().toLowerCase();
    return templatesArray.filter((template) =>
      template.name.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const resetSendDialogState = () => {
    setSendDialogTemplate(null);
    setSendDialogLoading(false);
    setSendDataFields([]);
    setSendForm({
      signerName: "",
      signerEmail: "",
      data: {},
    });
    setSendingRequest(false);
    setSendFeedback(null);
    setSendDialogError("");
  };

  const parseDataFields = (placeholders = []) => {
    const uniqueFields = new Map();
    placeholders.forEach((placeholder) => {
      if (!placeholder || !placeholder.apiKey) return;
      const normalizedType = String(placeholder.type || "")
        .toLowerCase()
        .trim();
      if (AUTO_FILLED_FIELD_TYPES.has(normalizedType)) {
        return;
      }
      if (!uniqueFields.has(placeholder.apiKey)) {
        uniqueFields.set(placeholder.apiKey, {
          key: placeholder.apiKey,
          label: placeholder.label || placeholder.apiKey,
        });
      }
    });
    return Array.from(uniqueFields.values());
  };

  const handleOpenSendDialog = async (template, event) => {
    event?.stopPropagation();
    resetSendDialogState();
    setSendDialogOpen(true);
    setSendDialogLoading(true);
    setSendDialogTemplate({ id: template.id, name: template.name });

    try {
      const data = await templatesApi.getById(template.id);
      const placeholders = Array.isArray(data.placeholders)
        ? data.placeholders
        : [];
      const parsedFields = parseDataFields(placeholders);
      setSendDialogTemplate({
        id: data.id,
        name: data.name,
      });
      setSendDataFields(parsedFields);
      setSendForm({
        signerName: "",
        signerEmail: "",
        data: parsedFields.reduce((acc, field) => {
          acc[field.key] = "";
          return acc;
        }, {}),
      });
    } catch (error) {
      console.error("Error loading template for send request:", error);
      setSendDialogError(error.message || "Failed to load template details.");
    } finally {
      setSendDialogLoading(false);
    }
  };

  const handleSendInputChange = (field, value) => {
    setSendForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendDataChange = (key, value) => {
    setSendForm((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        [key]: value,
      },
    }));
  };

  const handleCopySigningLink = () => {
    if (!sendSuccessDetails?.signingUrl) return;
    if (typeof navigator === "undefined" || !navigator?.clipboard) {
      return;
    }
    navigator.clipboard
      .writeText(sendSuccessDetails.signingUrl)
      .catch(() => {});
  };

  const sendRequestPreview = useMemo(() => {
    if (!sendDialogTemplate) {
      return "";
    }

    const payload = {
      templateId: sendDialogTemplate.id,
      signerEmail: sendForm.signerEmail,
      signerName: sendForm.signerName,
      data: {},
    };

    if (sendDataFields.length > 0) {
      sendDataFields.forEach((field) => {
        payload.data[field.key] = sendForm.data?.[field.key] ?? "";
      });
    } else {
      payload.data = Object.keys(sendForm.data || {}).length
        ? sendForm.data
        : {};
    }

    return JSON.stringify(payload, null, 2);
  }, [sendDataFields, sendDialogTemplate, sendForm]);

  const handleSendSigningRequest = async () => {
    if (!sendDialogTemplate) return;
    const signerName = sendForm.signerName.trim();
    const signerEmail = sendForm.signerEmail.trim();

    if (!signerName || !signerEmail) {
      setSendFeedback({
        type: "error",
        message: "Signer name and email are required.",
      });
      return;
    }

    const payload = {
      templateId: sendDialogTemplate.id,
      signerName,
      signerEmail,
      data: sendDataFields.reduce((acc, field) => {
        acc[field.key] = sendForm.data?.[field.key]?.trim() || "";
        return acc;
      }, {}),
    };

    setSendingRequest(true);
    setSendFeedback(null);

    try {
      const response = await documentsApi.create(payload);
      setSendSuccessDetails({
        templateName: sendDialogTemplate?.name || "",
        signerName,
        signerEmail,
        signingUrl: response?.signingUrl || "",
        token: response?.token || "",
      });
      setSendSuccessDialogOpen(true);
      handleSendDialogChange(false);
    } catch (error) {
      console.error("Failed to send signing request:", error);
      setSendFeedback({
        type: "error",
        message: error.message || "Failed to send signing request.",
      });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendDialogChange = (nextOpen) => {
    if (!nextOpen) {
      resetSendDialogState();
    }
    setSendDialogOpen(nextOpen);
  };

  const isSendDisabled =
    sendingRequest ||
    sendDialogLoading ||
    !sendDialogTemplate ||
    !sendForm.signerName.trim() ||
    !sendForm.signerEmail.trim();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-6 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage your PDF signing templates
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Upload a PDF file and give it a name to create a new signing
                  template.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g. Master Service Agreement"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-file">PDF File</Label>
                  <Input
                    id="template-file"
                    type="file"
                    accept=".pdf"
                    onChange={(event) => setPdfFile(event.target.files[0])}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setTemplateName("");
                    setPdfFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} disabled={uploading}>
                  {uploading ? "Uploading…" : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-6 py-6">
        {/* Search and Stats */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search templates…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {templates.length}{" "}
              {templates.length === 1 ? "template" : "templates"}
            </Badge>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {templates.length === 0
                  ? "No templates yet"
                  : `No templates match "${searchQuery}"`}
              </h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {templates.length === 0
                  ? "Get started by creating your first template"
                  : "Try adjusting your search terms"}
              </p>
              {templates.length === 0 && (
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {editingTemplateId === template.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingTemplateName}
                            onChange={(e) =>
                              setEditingTemplateName(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveName(template.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={updatingName}
                            autoFocus
                            className="text-lg font-semibold h-8"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveName(template.id);
                              }}
                              disabled={updatingName}
                              className="h-6 text-xs"
                            >
                              {updatingName ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelEdit();
                              }}
                              disabled={updatingName}
                              className="h-6 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              Created {formatDate(template.created_at)}
                            </span>
                          </CardDescription>
                        </>
                      )}
                    </div>
                    {editingTemplateId !== template.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTemplate(template);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleOpenSendDialog(template, e)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Request
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleEditName(template, e)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteClick(template.id, e)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      Template #{template.id}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectTemplate(template);
                      }}
                    >
                      Open
                      <ArrowUpRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              template and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={sendDialogOpen} onOpenChange={handleSendDialogChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-3xl overflow-hidden p-0"
        >
          <div className="px-6 pt-6">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle>Send Signing Request</DialogTitle>
                <DialogDescription>
                  Fill in the required fields and send the signing email
                  directly from the template.
                </DialogDescription>
              </DialogHeader>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1 rounded-full border border-border/60 bg-background/60 hover:bg-muted"
                  aria-label="Close dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <ScrollArea className="max-h-[75vh] px-6 pb-6">
            <div className="space-y-6">
              {sendDialogError && (
                <Alert variant="destructive" className="border-destructive/40">
                  <AlertTitle>Unable to load template</AlertTitle>
                  <AlertDescription>{sendDialogError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-lg border bg-card/40 shadow-sm">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Template Details
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reference info pulled from the selected template.
                  </p>
                </div>
                <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="send-template-id">Template ID</Label>
                    <Input
                      id="send-template-id"
                      value={sendDialogTemplate?.id ?? ""}
                      disabled
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="send-template-name">Template Name</Label>
                    <Input
                      id="send-template-name"
                      value={sendDialogTemplate?.name ?? ""}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card/40 shadow-sm">
                <div className="border-b px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    Signer Information
                  </p>
                  <p className="text-xs text-muted-foreground">
                    These details personalize the email and signing link.
                  </p>
                </div>
                <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="send-signer-name">Signer Name</Label>
                    <Input
                      id="send-signer-name"
                      placeholder="Jane Doe"
                      value={sendForm.signerName}
                      onChange={(event) =>
                        handleSendInputChange("signerName", event.target.value)
                      }
                      disabled={sendDialogLoading}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="send-signer-email">Signer Email</Label>
                    <Input
                      id="send-signer-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={sendForm.signerEmail}
                      onChange={(event) =>
                        handleSendInputChange("signerEmail", event.target.value)
                      }
                      disabled={sendDialogLoading}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card/40 shadow-sm">
                <div className="border-b px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Request Data
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Values mapped to each fillable placeholder in the
                      template.
                    </p>
                  </div>
                  {sendDialogLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading…
                    </div>
                  )}
                </div>
                {sendDialogLoading ? (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    Fetching template placeholders…
                  </div>
                ) : sendDataFields.length > 0 ? (
                  <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                    {sendDataFields.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={`send-data-${field.key}`}>
                          {field.label}
                        </Label>
                        <Input
                          id={`send-data-${field.key}`}
                          placeholder={`Enter ${field.label?.toLowerCase()}`}
                          value={sendForm.data?.[field.key] ?? ""}
                          onChange={(event) =>
                            handleSendDataChange(field.key, event.target.value)
                          }
                          disabled={sendingRequest}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    This template doesn’t require additional payload fields.
                  </div>
                )}
              </div>

              {sendRequestPreview && (
                <div className="rounded-lg border bg-card/40 shadow-sm">
                  <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">
                      JSON Preview
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mirror of the payload that will be sent to the API.
                    </p>
                  </div>
                  <div className="px-4 py-4">
                    <pre className="rounded-md border bg-muted/70 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                      {sendRequestPreview}
                    </pre>
                  </div>
                </div>
              )}

              {sendFeedback && (
                <Alert
                  variant={
                    sendFeedback.type === "error" ? "destructive" : "default"
                  }
                  className={
                    sendFeedback.type === "success"
                      ? "border-green-300 bg-green-50 text-green-900"
                      : undefined
                  }
                >
                  <AlertTitle>
                    {sendFeedback.type === "success" ? "Success" : "Heads up"}
                  </AlertTitle>
                  <AlertDescription>{sendFeedback.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 border-t bg-background/80 px-6 py-4">
            <Button
              variant="outline"
              onClick={() => handleSendDialogChange(false)}
              disabled={sendingRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendSigningRequest}
              disabled={isSendDisabled}
            >
              {sendingRequest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sendSuccessDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSendSuccessDialogOpen(false);
            setSendSuccessDetails(null);
          } else {
            setSendSuccessDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md p-0 gap-0">
          <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl font-semibold">
                Request Sent
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Signing link sent to{" "}
                <span className="font-medium text-foreground">
                  {sendSuccessDetails?.signerName || "recipient"}
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-8 pb-6 space-y-4">
            {sendSuccessDetails?.signingUrl && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Signing Link
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={sendSuccessDetails.signingUrl}
                    readOnly
                    className="h-9 font-mono text-xs bg-muted/50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySigningLink}
                    className="h-9 w-9 shrink-0"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t px-8 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setSendSuccessDialogOpen(false);
                setSendSuccessDetails(null);
              }}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setSendSuccessDialogOpen(false);
                setSendSuccessDetails(null);
                setSendDialogOpen(true);
              }}
              className="w-full sm:w-auto"
            >
              Send Another
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplateList;
