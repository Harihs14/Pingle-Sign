  import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { templatesApi } from "@/services/api";
import {
  Trash2,
  PenTool,
  Stamp,
  Building2,
  UserCircle,
  Mail,
  Calendar,
  FileText,
  Briefcase,
  CheckSquare,
  Type,
  X,
  Square,
  GripVertical,
  Clipboard,
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Download,
  Printer,
  Maximize,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Set up PDF.js worker - using local worker file from public folder to avoid CORS issues
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const BOX_FIELD_TYPES = new Set(["signature", "stamp"]);
const TEXT_STYLE_FIELD_TYPES = new Set([
  "initial",
  "company",
  "fullname",
  "email",
  "signdate",
  "text",
  "jobtitle",
]);
const CONFIGURABLE_FIELD_TYPES = new Set([...TEXT_STYLE_FIELD_TYPES]);

const DEFAULT_TEXT_STYLE = {
  fontSize: 14,
  color: "#1f2933",
  fontWeight: "500",
  fontFamily: "Inter, sans-serif",
};

const FIELD_TYPES = [
  { id: "signature", label: "Signature", icon: PenTool },
  { id: "initial", label: "Initial", icon: Type },
  { id: "stamp", label: "Stamp", icon: Stamp },
  { id: "company", label: "Company", icon: Building2 },
  { id: "fullname", label: "Full name", icon: UserCircle },
  { id: "email", label: "Email", icon: Mail },
  { id: "signdate", label: "Sign date", icon: Calendar },
  { id: "text", label: "Text", icon: FileText },
  { id: "jobtitle", label: "Job title", icon: Briefcase },
  { id: "checkbox", label: "Checkbox", icon: CheckSquare },
];

const FIELD_TYPE_MAP = FIELD_TYPES.reduce((acc, field) => {
  acc[field.id] = field;
  return acc;
}, {});

const slugify = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const generateApiKey = (placeholderType, existingPlaceholders) => {
  const baseLabel = FIELD_TYPE_MAP[placeholderType]?.label || placeholderType;
  const base = slugify(baseLabel) || slugify(placeholderType) || "field";
  const existingKeys = new Set(
    existingPlaceholders
      .map((placeholder) => placeholder.apiKey)
      .filter(Boolean)
  );

  if (!existingKeys.has(base)) {
    return base;
  }

  let suffix = 2;
  let candidate = `${base}_${suffix}`;
  while (existingKeys.has(candidate)) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }
  return candidate;
};

const hexToRgb = (hex) => {
  const value = (hex || "").replace("#", "");

  if (!value) {
    return { r: 31, g: 41, b: 51 };
  }

  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value.padEnd(6, "0").slice(0, 6);

  const numeric = parseInt(normalized, 16);
  if (Number.isNaN(numeric)) {
    return { r: 31, g: 41, b: 51 };
  }

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
};

const normalizePlaceholders = (placeholders = []) => {
  const normalized = [];

  placeholders.forEach((placeholder) => {
    if (!placeholder) return;

    const isConfigurable = CONFIGURABLE_FIELD_TYPES.has(placeholder.type);
    const basePlaceholder = {
      ...placeholder,
      label:
        placeholder.label ||
        (isConfigurable ? placeholder.apiKey : null) ||
        FIELD_TYPE_MAP[placeholder.type]?.label ||
        "Field",
      width:
        placeholder.width ??
        (BOX_FIELD_TYPES.has(placeholder.type) ? 0.2 : 0.18),
      height:
        placeholder.height ??
        (BOX_FIELD_TYPES.has(placeholder.type) ? 0.08 : 0.05),
      textStyle: {
        ...DEFAULT_TEXT_STYLE,
        ...(placeholder.textStyle || {}),
      },
    };

    const withApiKey = {
      ...basePlaceholder,
      apiKey: isConfigurable
        ? basePlaceholder.apiKey ||
          generateApiKey(basePlaceholder.type, normalized)
        : undefined,
    };

    if (
      withApiKey.apiKey &&
      normalized.some((p) => p.apiKey === withApiKey.apiKey)
    ) {
      withApiKey.apiKey = generateApiKey(withApiKey.type, normalized);
    }

    normalized.push(withApiKey);
  });

  return normalized;
};

const createPlaceholder = (
  fieldId,
  page,
  position = { x: 0, y: 0 },
  existingPlaceholders = []
) => {
  const fieldType = FIELD_TYPE_MAP[fieldId];
  const baseLabel = fieldType?.label || "Field";
  const sameTypeCount = existingPlaceholders.filter(
    (placeholder) => placeholder.type === fieldId
  ).length;
  const preferredSlug = slugify(baseLabel);
  const isConfigurable = CONFIGURABLE_FIELD_TYPES.has(fieldId);
  let preferredKey = isConfigurable ? preferredSlug || fieldId : null;

  if (isConfigurable) {
    if (fieldId === "fullname" || fieldId === "initial") {
      preferredKey = "signerName";
    } else if (fieldId === "email") {
      preferredKey = "signerEmail";
    } else if (fieldId === "signdate") {
      preferredKey = "signDate";
    } else if (fieldId === "company") {
      preferredKey = "signerCompany";
    } else if (!preferredKey) {
      preferredKey = fieldId;
    }
  }

  const defaults = {
    width: BOX_FIELD_TYPES.has(fieldId) ? 0.2 : 0.18,
    height: BOX_FIELD_TYPES.has(fieldId) ? 0.08 : 0.05,
  };

  const placeholder = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: fieldId,
    page,
    x: position.x,
    y: position.y,
    label: isConfigurable
      ? preferredKey
      : sameTypeCount
      ? `${baseLabel} ${sameTypeCount + 1}`
      : baseLabel,
    width: defaults.width,
    height: defaults.height,
    textStyle: { ...DEFAULT_TEXT_STYLE },
    apiKey: isConfigurable ? preferredKey : undefined,
  };

  let resolvedApiKey = placeholder.apiKey;
  if (isConfigurable) {
    const apiKeyInUse = existingPlaceholders.some(
      (item) => item.apiKey === preferredKey
    );
    resolvedApiKey = apiKeyInUse
      ? generateApiKey(fieldId, [...existingPlaceholders, placeholder])
      : preferredKey;
  }

  return {
    ...placeholder,
    apiKey: resolvedApiKey,
  };
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const PDFEditor = ({
  pdfData,
  fileName,
  templateId,
  templateName,
  onSave,
  onBack,
  onSaveSuccess,
  onDocumentInfo,
  onDirtyChange,
}) => {
  const [numPages, setNumPages] = useState(null);
  const [signingPlaceholders, setSigningPlaceholders] = useState([]);
  const [gridGuides, setGridGuides] = useState({
    vertical: [],
    horizontal: [],
  });
  const [selectedPlaceholder, setSelectedPlaceholder] = useState(null);
  const [draggedField, setDraggedField] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeStart, setResizeStart] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const pageRefs = useRef({});
  const containerRef = useRef(null);
  const [detailsSidebarOpen, setDetailsSidebarOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [copiedPlaceholder, setCopiedPlaceholder] = useState(null); // For copy/paste
  const sortedPlaceholders = useMemo(() => {
    return [...signingPlaceholders].sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page;
      }
      return (a.label || "").localeCompare(b.label || "");
    });
  }, [signingPlaceholders]);
  const configurablePlaceholders = useMemo(
    () =>
      sortedPlaceholders.filter((placeholder) =>
        CONFIGURABLE_FIELD_TYPES.has(placeholder.type)
      ),
    [sortedPlaceholders]
  );
  // Compute grid positions from existing placeholders for perfect alignment
  const gridPositions = useMemo(() => {
    const vertical = new Set([0, 1]); // Always include page edges
    const horizontal = new Set([0, 1]); // Always include page edges

    // Add all placeholder positions and edges to grid
    signingPlaceholders.forEach((placeholder) => {
      vertical.add(placeholder.x);
      vertical.add(placeholder.x + placeholder.width);
      horizontal.add(placeholder.y);
      horizontal.add(placeholder.y + placeholder.height);
    });

    return {
      vertical: Array.from(vertical).sort((a, b) => a - b),
      horizontal: Array.from(horizontal).sort((a, b) => a - b),
    };
  }, [signingPlaceholders]);
  const activePlaceholderId =
    dragStart?.placeholderId || resizeStart?.placeholderId || null;
  const activePlaceholderPage = useMemo(() => {
    if (!activePlaceholderId) {
      return null;
    }
    const placeholder = signingPlaceholders.find(
      (item) => item.id === activePlaceholderId
    );
    return placeholder?.page ?? null;
  }, [activePlaceholderId, signingPlaceholders]);
  const accordionValue = useMemo(() => {
    if (
      selectedPlaceholder &&
      configurablePlaceholders.some((p) => p.id === selectedPlaceholder)
    ) {
      return String(selectedPlaceholder);
    }
    return "";
  }, [configurablePlaceholders, selectedPlaceholder]);
  const duplicateApiKeys = useMemo(() => {
    const counts = new Map();
    configurablePlaceholders.forEach((placeholder) => {
      const key = placeholder.apiKey;
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [configurablePlaceholders]);

  const sampleRequestBody = useMemo(() => {
    const hasFullName = configurablePlaceholders.some(
      (placeholder) => placeholder.type === "fullname"
    );
    const hasEmailField = configurablePlaceholders.some(
      (placeholder) => placeholder.type === "email"
    );

    const dataEntries = {};

    configurablePlaceholders.forEach((placeholder) => {
      if (!placeholder.apiKey) return;
      if (
        ["fullname", "initial", "email", "signdate"].includes(placeholder.type)
      ) {
        return;
      }

      dataEntries[placeholder.apiKey] = "";
    });

    const body = {
      templateId: templateId || 12345,
      signerEmail: hasEmailField ? "" : "",
      signerName: hasFullName ? "" : "",
      data: dataEntries,
    };

    if (Object.keys(dataEntries).length === 0) {
      body.data = {};
    }

    return JSON.stringify(body, null, 2);
  }, [configurablePlaceholders, templateId]);

  const autoFilledNotes = useMemo(() => {
    const notes = [];
    if (
      configurablePlaceholders.some(
        (placeholder) => placeholder.type === "signdate"
      )
    ) {
      notes.push("signdate is filled automatically with the current date.");
    }
    if (
      configurablePlaceholders.some(
        (placeholder) => placeholder.type === "email"
      )
    ) {
      notes.push(
        "signerEmail pulls from the top-level signerEmail you provide when creating the signing request."
      );
    }
    if (
      configurablePlaceholders.some(
        (placeholder) => placeholder.type === "fullname"
      )
    ) {
      notes.push(
        "fullname uses the signerName provided in the signing request."
      );
    }
    return notes;
  }, [configurablePlaceholders]);
  const [copiedRequestBody, setCopiedRequestBody] = useState(false);
  const copyTimeoutRef = useRef(null);
  const handleCopyRequestBody = async () => {
    try {
      await navigator.clipboard.writeText(sampleRequestBody);
      setCopiedRequestBody(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopiedRequestBody(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (error) {
      console.error("Unable to copy request body:", error);
    }
  };

  const scrollToPage = useCallback((pageNumber, behavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;

    // Wait for page to be rendered if not available yet
    const pageElement = pageRefs.current[pageNumber];
    if (!pageElement) {
      // Retry after a short delay if page element isn't ready
      setTimeout(() => {
        const retryElement = pageRefs.current[pageNumber];
        if (retryElement && containerRef.current) {
          const offset = Math.max(0, retryElement.offsetTop - 24);
          containerRef.current.scrollTo({
            top: offset,
            behavior,
          });
        }
      }, 100);
      return;
    }

    const offset = Math.max(0, pageElement.offsetTop - 24);
    container.scrollTo({
      top: offset,
      behavior,
    });

    // Update current page state
    setCurrentPage(pageNumber);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadPDF();
  }, [pdfData]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !numPages) {
      return undefined;
    }

    const handleScroll = () => {
      const scrollCenter = container.scrollTop + container.clientHeight / 2;
      let closestPage = null;
      let minDistance = Number.POSITIVE_INFINITY;

      for (let page = 1; page <= numPages; page += 1) {
        const element = pageRefs.current[page];
        if (!element) continue;

        const pageCenter = element.offsetTop + element.offsetHeight / 2;
        const distance = Math.abs(pageCenter - scrollCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestPage = page;
        }
      }

      if (closestPage != null) {
        setCurrentPage((prev) => (prev === closestPage ? prev : closestPage));
      }
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages]);

  // Load placeholders when templateId changes - with proper cleanup
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;

    const loadPlaceholders = async () => {
      if (!templateId) {
        if (isMounted) {
          setSigningPlaceholders([]);
        }
        return;
      }

      try {
        const template = await templatesApi.getById(templateId);

        // Check if request was cancelled
        if (cancelled || !isMounted) return;

        if (template) {
          // Backend returns: { success: true, data: { placeholders: [...] } }
          // API service extracts data, so template.placeholders should exist
          const placeholders = template.placeholders || [];

          if (Array.isArray(placeholders) && placeholders.length > 0) {
            const normalized = normalizePlaceholders(placeholders);
            if (isMounted && !cancelled) {
              setSigningPlaceholders(normalized);
            }
          } else {
            if (isMounted && !cancelled) {
              setSigningPlaceholders([]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading template placeholders:", error);
        if (isMounted && !cancelled) {
          setSigningPlaceholders([]);
        }
      }
    };

    loadPlaceholders();

    return () => {
      cancelled = true;
      isMounted = false;
    };
  }, [templateId]);

  // Debug: Log when placeholders change
  useEffect(() => {
    console.log("Placeholders state updated:", signingPlaceholders);
  }, [signingPlaceholders]);

  useEffect(() => {
    if (typeof onDirtyChange === "function") {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // Removed loadTemplatePlaceholders - now using templatesApi in useEffect

  const savePlaceholders = async (placeholdersToSave = signingPlaceholders) => {
    if (!templateId) return;
    try {
      await fetch(`${API_BASE_URL}/api/templates/${templateId}/placeholders`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ placeholders: placeholdersToSave }),
      });
    } catch (error) {
      console.error("Error saving placeholders:", error);
    }
  };

  const loadPDF = async () => {
    try {
      const loadedDoc = await PDFDocument.load(pdfData);
      setPdfDoc(loadedDoc);
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    if (typeof onDocumentInfo === "function") {
      onDocumentInfo({ numPages });
    }
    setCurrentPage((prev) => Math.min(prev, numPages || 1));
  };

  const handleDragStart = (e, fieldType) => {
    setDraggedField(fieldType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const updatePlaceholder = (placeholderId, updates) => {
    setSigningPlaceholders((prev) =>
      prev.map((placeholder) => {
        if (placeholder.id !== placeholderId) return placeholder;

        const normalizedApiKey =
          Object.prototype.hasOwnProperty.call(updates, "apiKey") &&
          typeof updates.apiKey === "string"
            ? updates.apiKey.trim()
            : undefined;
        const sanitizedKey =
          normalizedApiKey && normalizedApiKey.length > 0
            ? normalizedApiKey
            : undefined;

        const nextTextStyle = updates.textStyle
          ? {
              ...DEFAULT_TEXT_STYLE,
              ...placeholder.textStyle,
              ...updates.textStyle,
            }
          : placeholder.textStyle;

        const nextPlaceholder = {
          ...placeholder,
          ...updates,
          textStyle: nextTextStyle,
        };

        if (
          sanitizedKey !== undefined &&
          CONFIGURABLE_FIELD_TYPES.has(placeholder.type)
        ) {
          nextPlaceholder.apiKey = sanitizedKey;
          nextPlaceholder.label =
            sanitizedKey || FIELD_TYPE_MAP[placeholder.type]?.label || "Field";
        } else if (
          normalizedApiKey === undefined &&
          Object.prototype.hasOwnProperty.call(updates, "apiKey") &&
          CONFIGURABLE_FIELD_TYPES.has(placeholder.type)
        ) {
          nextPlaceholder.apiKey = undefined;
          nextPlaceholder.label =
            FIELD_TYPE_MAP[placeholder.type]?.label || "Field";
        }

        return nextPlaceholder;
      })
    );
    setIsDirty(true);
  };

  const handleTextStyleChange = (placeholderId, key, value) => {
    updatePlaceholder(placeholderId, {
      textStyle: {
        ...signingPlaceholders.find((p) => p.id === placeholderId)?.textStyle,
        [key]: value,
      },
    });
  };

  const handleDrop = (e, pageNum) => {
    e.preventDefault();
    if (!draggedField) return;

    const pageElement = pageRefs.current[pageNum];
    if (!pageElement) return;

    const rect = pageElement.getBoundingClientRect();
    const dropX = (e.clientX - rect.left) / rect.width;
    const dropY = (e.clientY - rect.top) / rect.height;

    let createdPlaceholder = null;
    setSigningPlaceholders((prev) => {
      const basePlaceholder = createPlaceholder(
        draggedField,
        pageNum,
        { x: 0, y: 0 },
        prev
      );

      let adjustedX = dropX;
      let adjustedY = dropY;

      if (BOX_FIELD_TYPES.has(draggedField)) {
        adjustedX = Math.max(
          0,
          Math.min(1 - basePlaceholder.width, dropX - basePlaceholder.width / 2)
        );
        adjustedY = Math.max(
          0,
          Math.min(
            1 - basePlaceholder.height,
            dropY - basePlaceholder.height / 2
          )
        );
      } else {
        adjustedX = Math.max(0, Math.min(1 - basePlaceholder.width, dropX));
        adjustedY = Math.max(0, Math.min(1 - basePlaceholder.height, dropY));
      }

      const nextPlaceholder = {
        ...basePlaceholder,
        x: adjustedX,
        y: adjustedY,
      };

      createdPlaceholder = nextPlaceholder;

      return [...prev, nextPlaceholder];
    });

    setDraggedField(null);
    setCurrentPage(pageNum);
    if (createdPlaceholder) {
      setSelectedPlaceholder(createdPlaceholder.id);
      if (CONFIGURABLE_FIELD_TYPES.has(createdPlaceholder.type)) {
        setDetailsSidebarOpen(true);
      }
    }
  };

  const handlePlaceholderMouseDown = (e, placeholderId) => {
    e.stopPropagation();

    // Don't start dragging if clicking on resize handle
    if (e.target.closest(".resize-handle")) {
      return;
    }

    setSelectedPlaceholder(placeholderId);

    // Start dragging if clicking on placeholder content
    setIsDragging(true);
    const placeholder = signingPlaceholders.find((p) => p.id === placeholderId);
    if (placeholder) {
      setCurrentPage(placeholder.page);
      const pageElement = pageRefs.current[placeholder.page];
      if (pageElement) {
        const rect = pageElement.getBoundingClientRect();
        const placeholderElement = e.currentTarget;
        const placeholderRect = placeholderElement.getBoundingClientRect();

        setDragStart({
          placeholderId,
          offsetX: (e.clientX - placeholderRect.left) / rect.width,
          offsetY: (e.clientY - placeholderRect.top) / rect.height,
          startX: placeholder.x,
          startY: placeholder.y,
        });
      }
    }
  };

  const handleResizeStart = (e, placeholderId, corner) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      placeholderId,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      startWidth:
        signingPlaceholders.find((p) => p.id === placeholderId)?.width || 0,
      startHeight:
        signingPlaceholders.find((p) => p.id === placeholderId)?.height || 0,
      startXPos:
        signingPlaceholders.find((p) => p.id === placeholderId)?.x || 0,
      startYPos:
        signingPlaceholders.find((p) => p.id === placeholderId)?.y || 0,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Handle dragging placeholders
      if (isDragging && dragStart) {
        const placeholder = signingPlaceholders.find(
          (p) => p.id === dragStart.placeholderId
        );
        if (!placeholder) return;

        const pageElement = pageRefs.current[placeholder.page];
        if (!pageElement) return;

        const rect = pageElement.getBoundingClientRect();
        const rawX = (e.clientX - rect.left) / rect.width - dragStart.offsetX;
        const rawY = (e.clientY - rect.top) / rect.height - dragStart.offsetY;

        // Free movement - no grid snapping during drag for smooth, natural movement
        // Grid snapping is disabled to allow completely free positioning
        const finalX = rawX;
        const finalY = rawY;

        const newX = Math.max(0, Math.min(1 - placeholder.width, finalX));
        const newY = Math.max(0, Math.min(1 - placeholder.height, finalY));

        setGridGuides({
          vertical: [newX, newX + placeholder.width],
          horizontal: [newY, newY + placeholder.height],
        });

        setSigningPlaceholders(
          signingPlaceholders.map((p) =>
            p.id === dragStart.placeholderId ? { ...p, x: newX, y: newY } : p
          )
        );
        return;
      }

      // Handle resizing placeholders
      if (!isResizing || !resizeStart) return;

      const placeholder = signingPlaceholders.find(
        (p) => p.id === resizeStart.placeholderId
      );
      if (!placeholder) return;

      const pageElement = pageRefs.current[placeholder.page];
      if (!pageElement) return;

      const rect = pageElement.getBoundingClientRect();
      const deltaX = (e.clientX - resizeStart.startX) / rect.width;
      const deltaY = (e.clientY - resizeStart.startY) / rect.height;

      let newWidth = resizeStart.startWidth;
      let newHeight = resizeStart.startHeight;
      let newX = resizeStart.startXPos;
      let newY = resizeStart.startYPos;

      // Determine constraints based on field type
      const isBoxType = BOX_FIELD_TYPES.has(placeholder.type);
      const isTextType = TEXT_STYLE_FIELD_TYPES.has(placeholder.type);

      if (resizeStart.corner.includes("e")) {
        const maxWidth = isBoxType ? 0.5 : 1;
        const minWidth = isBoxType ? 0.05 : 0.01;
        const rawWidth = resizeStart.startWidth + deltaX;
        // Snap width to grid positions relative to start position
        const relativePositions = gridPositions.vertical
          .map((v) => v - resizeStart.startXPos)
          .filter((v) => v > 0 && v <= 1);
        const snappedWidth =
          relativePositions.length > 0
            ? snapToGrid(rawWidth, relativePositions, 0.02)
            : rawWidth;
        newWidth = Math.max(minWidth, Math.min(maxWidth, snappedWidth));
      }
      if (resizeStart.corner.includes("w")) {
        const maxWidth = isBoxType ? 0.5 : 1;
        const minWidth = isBoxType ? 0.05 : 0.01;
        const rawWidth = resizeStart.startWidth - deltaX;
        const rawX = resizeStart.startXPos + deltaX;
        // Snap X position to grid
        const snappedX = snapToGrid(rawX, gridPositions.vertical, 0.02);
        // Calculate width based on snapped position
        const snappedWidth =
          resizeStart.startXPos + resizeStart.startWidth - snappedX;
        newWidth = Math.max(minWidth, Math.min(maxWidth, snappedWidth));
        newX = Math.max(0, Math.min(1 - newWidth, snappedX));
      }
      if (resizeStart.corner.includes("s")) {
        const minHeight = isBoxType ? 0.03 : isTextType ? 0.02 : 0.01;
        const maxHeight = isBoxType ? 0.3 : isTextType ? 0.15 : 0.5;
        const rawHeight = resizeStart.startHeight + deltaY;
        // Snap height to grid positions relative to start position
        const relativePositions = gridPositions.horizontal
          .map((h) => h - resizeStart.startYPos)
          .filter((h) => h > 0 && h <= 1);
        const snappedHeight =
          relativePositions.length > 0
            ? snapToGrid(rawHeight, relativePositions, 0.02)
            : rawHeight;
        newHeight = Math.max(minHeight, Math.min(maxHeight, snappedHeight));
      }
      if (resizeStart.corner.includes("n")) {
        const minHeight = isBoxType ? 0.03 : isTextType ? 0.02 : 0.01;
        const maxHeight = isBoxType ? 0.3 : isTextType ? 0.15 : 0.5;
        const rawY = resizeStart.startYPos + deltaY;
        // Snap Y position to grid
        const snappedY = snapToGrid(rawY, gridPositions.horizontal, 0.02);
        // Calculate height based on snapped position
        const snappedHeight =
          resizeStart.startYPos + resizeStart.startHeight - snappedY;
        newHeight = Math.max(minHeight, Math.min(maxHeight, snappedHeight));
        newY = Math.max(0, Math.min(1 - newHeight, snappedY));
      }

      setGridGuides({
        vertical: [newX, newX + newWidth],
        horizontal: [newY, newY + newHeight],
      });

      setSigningPlaceholders(
        signingPlaceholders.map((p) =>
          p.id === resizeStart.placeholderId
            ? { ...p, x: newX, y: newY, width: newWidth, height: newHeight }
            : p
        )
      );
    };

    const handleMouseUp = () => {
      if (isDragging || isResizing) {
        setIsDragging(false);
        setIsResizing(false);
        setDragStart(null);
        setResizeStart(null);
        setGridGuides({ vertical: [], horizontal: [] });
        if (templateId && !isDirty) {
          savePlaceholders();
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragStart,
    isDragging,
    signingPlaceholders,
    isResizing,
    resizeStart,
    templateId,
    gridPositions,
    isDirty,
  ]);

  const handleDeletePlaceholder = useCallback((id) => {
    setSigningPlaceholders((prev) => prev.filter((p) => p.id !== id));
    setSelectedPlaceholder((prevSelected) =>
      prevSelected === id ? null : prevSelected
    );
    setIsDirty(true);
  }, []);

  // Keyboard shortcuts: ESC to deselect, DELETE to remove, Ctrl+C to copy, Ctrl+V to paste
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable
      ) {
        // Allow DELETE in input fields for normal text deletion, but not for field deletion
        if (
          (e.key === "Delete" || e.key === "Backspace") &&
          (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        ) {
          return; // Allow normal deletion in input fields
        }
        // Allow ESC in input fields to blur
        if (e.key === "Escape") {
          return; // Let ESC work normally in inputs (blur, etc.)
        }
      }

      // ESC: Deselect selected field (only if not in an input)
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedPlaceholder(null);
        return;
      }

      // DELETE or BACKSPACE: Remove selected field (only if not typing in an input)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedPlaceholder
      ) {
        e.preventDefault();
        handleDeletePlaceholder(selectedPlaceholder);
        return;
      }

      // Ctrl+C or Cmd+C: Copy selected field
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedPlaceholder) {
        // Allow normal copy if text is selected in an input/textarea
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
          return; // Let normal copy work
        }

        e.preventDefault();
        const placeholder = signingPlaceholders.find(
          (p) => p.id === selectedPlaceholder
        );
        if (placeholder) {
          setCopiedPlaceholder({ ...placeholder });
          // Also copy to clipboard for external pasting
          try {
            navigator.clipboard.writeText(
              JSON.stringify({ type: "placeholder", data: placeholder })
            );
          } catch (err) {
            // Ignore clipboard errors
          }
        }
        return;
      }

      // Ctrl+V or Cmd+V: Paste copied field (only when not in input/textarea)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "v" &&
        copiedPlaceholder &&
        currentPage
      ) {
        // Allow normal paste if focused in input/textarea
        if (
          e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable
        ) {
          return; // Let normal paste work
        }

        e.preventDefault();
        const sourcePlaceholder = copiedPlaceholder;

        // Create a new placeholder with same properties but new ID and position
        const newPlaceholder = {
          ...sourcePlaceholder,
          id: Date.now() + Math.floor(Math.random() * 1000),
          page: currentPage,
          // Offset position slightly to avoid exact overlap
          x: Math.min(0.95, sourcePlaceholder.x + 0.05),
          y: Math.min(0.95, sourcePlaceholder.y + 0.05),
        };

        // Generate new API key if it's a configurable field
        if (CONFIGURABLE_FIELD_TYPES.has(newPlaceholder.type)) {
          const existingKeys = signingPlaceholders
            .map((p) => p.apiKey)
            .filter(Boolean);

          if (
            newPlaceholder.apiKey &&
            existingKeys.includes(newPlaceholder.apiKey)
          ) {
            newPlaceholder.apiKey = generateApiKey(
              newPlaceholder.type,
              signingPlaceholders
            );
            newPlaceholder.label = newPlaceholder.apiKey;
          }
        }

        setSigningPlaceholders((prev) => [...prev, newPlaceholder]);
        setSelectedPlaceholder(newPlaceholder.id);
        setIsDirty(true);

        // Open details sidebar if it's a configurable field
        if (CONFIGURABLE_FIELD_TYPES.has(newPlaceholder.type)) {
          setDetailsSidebarOpen(true);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    selectedPlaceholder,
    signingPlaceholders,
    copiedPlaceholder,
    currentPage,
    handleDeletePlaceholder,
  ]);

  const fileObject = useMemo(() => ({ data: pdfData }), [pdfData]);

  const handleSave = async () => {
    if (!templateId) {
      alert("No template ID available. Cannot save.");
      return;
    }

    try {
      setSaveStatus("saving");
      const payload = {
        placeholders: signingPlaceholders,
        templateName,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/templates/${templateId}/placeholders`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to save: ${response.statusText}`
        );
      }

      const result = await response.json();
      setIsDirty(false);
      setSaveStatus("success");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 3000);

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Error saving template:", error);
      setSaveStatus("error");
      alert(error.message || "Failed to save template. Please try again.");

      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Optimized snap to grid - early return if no positions
  const snapToGrid = useCallback((value, positions, threshold = 0.01) => {
    if (!positions || positions.length === 0) return value;
    let closest = value;
    let minDiff = threshold;
    for (let i = 0; i < positions.length; i++) {
      const diff = Math.abs(positions[i] - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = positions[i];
      }
    }
    return closest;
  }, []);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } fixed lg:sticky lg:top-[52px] inset-y-0 left-0 z-30 w-72 bg-card/95 lg:bg-card/50 border-r flex flex-col backdrop-blur-sm transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none`}
        >
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-1">
                Fields
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag to add to PDF
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close field sidebar</span>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 mb-4 sm:mb-5">
              {FIELD_TYPES.map((field) => {
                const IconComponent = field.icon;
                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, field.id)}
                    className="group cursor-grab active:cursor-grabbing border border-border bg-background text-foreground transition-all flex items-center justify-between gap-1.5 px-2 py-1.5 text-xs shadow-sm hover:bg-muted"
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{field.label}</span>
                    </div>
                    <IconComponent className="h-4 w-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Request body
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] uppercase tracking-wide"
                  onClick={handleCopyRequestBody}
                >
                  {copiedRequestBody ? (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Clipboard className="mr-1 h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="rounded-md border border-border/60 bg-muted/60 p-3 text-[11px] leading-relaxed text-left whitespace-pre-wrap">
                {sampleRequestBody}
              </pre>
              {autoFilledNotes.length > 0 && (
                <ul className="space-y-1">
                  {autoFilledNotes.map((note, index) => (
                    <li
                      key={index}
                      className="text-[10px] text-muted-foreground"
                    >
                      • {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 p-3 sm:p-4 border-t bg-background/95 backdrop-blur-sm shadow-lg">
            <Button
              onClick={handleSave}
              className="w-full text-sm sm:text-base"
              disabled={saveStatus === "saving" || !templateId}
            >
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "success"
                ? "✓ Saved!"
                : templateId
                ? "Save Template"
                : "Save PDF"}
            </Button>
            {saveStatus === "success" && (
              <p className="text-xs text-green-600 mt-2 text-center">
                Template saved successfully
              </p>
            )}
            {saveStatus === "error" && (
              <p className="text-xs text-destructive mt-2 text-center">
                Failed to save template
              </p>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {detailsSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setDetailsSidebarOpen(false)}
          />
        )}

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto bg-muted/40 relative"
          onDragOver={handleDragOver}
        >
          <Document
            file={fileObject}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex justify-center items-center h-96 rounded-md border border-dashed border-border/60 bg-white/70 text-sm text-muted-foreground">
                Loading PDF...
              </div>
            }
            error={
              <div className="flex justify-center items-center h-96 rounded-md border border-dashed border-destructive/40 bg-destructive/10 text-sm text-destructive">
                Error loading PDF. Please try again.
              </div>
            }
          >
            {numPages ? (
              <div
                className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-6"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setSelectedPlaceholder(null);
                  }
                }}
              >
                {Array.from({ length: numPages }, (_, index) => {
                  const pageNumber = index + 1;
                  const pagePlaceholders = signingPlaceholders.filter(
                    (placeholder) => placeholder.page === pageNumber
                  );
                  const showGuides =
                    activePlaceholderPage === pageNumber &&
                    gridGuides.vertical.length > 0 &&
                    gridGuides.horizontal.length > 0;

                  return (
                    <div
                      key={pageNumber}
                      className="relative flex w-full justify-center"
                      onDragOver={handleDragOver}
                      onDrop={(event) => handleDrop(event, pageNumber)}
                    >
                      <div
                        ref={(element) => {
                          if (element) {
                            pageRefs.current[pageNumber] = element;
                          } else {
                            delete pageRefs.current[pageNumber];
                          }
                        }}
                        data-page-number={pageNumber}
                        className="relative inline-block w-full"
                        onMouseDown={(event) => {
                          if (event.target === event.currentTarget) {
                            setSelectedPlaceholder(null);
                            setCurrentPage(pageNumber);
                            scrollToPage(pageNumber, "smooth");
                          }
                        }}
                      >
                        <Page
                          pageNumber={pageNumber}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="max-w-full h-auto"
                          width={Math.min(
                            (window.innerWidth - 96) * zoom,
                            1100
                          )}
                        />

                        {showGuides && (
                          <div className="absolute inset-0 pointer-events-none">
                            <div
                              className="absolute inset-y-0 border-l border-dashed border-primary/40"
                              style={{
                                left: `${gridGuides.vertical[0] * 100}%`,
                              }}
                            />
                            <div
                              className="absolute inset-y-0 border-l border-dashed border-primary/40"
                              style={{
                                left: `${gridGuides.vertical[1] * 100}%`,
                              }}
                            />
                            <div
                              className="absolute inset-x-0 border-t border-dashed border-primary/40"
                              style={{
                                top: `${gridGuides.horizontal[0] * 100}%`,
                              }}
                            />
                            <div
                              className="absolute inset-x-0 border-t border-dashed border-primary/40"
                              style={{
                                top: `${gridGuides.horizontal[1] * 100}%`,
                              }}
                            />
                          </div>
                        )}

                        {pagePlaceholders.map((placeholder) => {
                          const fieldType = FIELD_TYPE_MAP[placeholder.type];
                          const isBoxType = BOX_FIELD_TYPES.has(
                            placeholder.type
                          );
                          const isCheckbox = placeholder.type === "checkbox";
                          const textStyle = {
                            color:
                              placeholder.textStyle?.color ||
                              DEFAULT_TEXT_STYLE.color,
                            fontSize: `${
                              placeholder.textStyle?.fontSize * 1.2 ||
                              DEFAULT_TEXT_STYLE.fontSize
                            }px`,
                            fontWeight:
                              placeholder.textStyle?.fontWeight ||
                              DEFAULT_TEXT_STYLE.fontWeight,
                            fontFamily:
                              placeholder.textStyle?.fontFamily ||
                              DEFAULT_TEXT_STYLE.fontFamily,
                            lineHeight: "1.2",
                          };

                          const containerClasses = [
                            "absolute",
                            "cursor-move",
                            "transition-all",
                            "z-20",
                            "pointer-events-auto",
                            "border",
                            "border-dashed",
                            "border-primary/70",
                            "bg-primary/5",
                            "flex",
                            "items-center",
                          ];
                          if (selectedPlaceholder === placeholder.id) {
                            containerClasses.push(
                              "border-primary",
                              "bg-primary/15",
                              "shadow-lg"
                            );
                          }

                          const labelWrapperClasses = [
                            "flex",
                            "items-center",
                            "gap-2",
                            "px-2",
                            "py-1",
                            "select-none",
                            "text-xs",
                            "font-medium",
                            "text-primary",
                          ];

                          return (
                            <div
                              key={placeholder.id}
                              className={containerClasses
                                .filter(Boolean)
                                .join(" ")}
                              style={{
                                left: `${placeholder.x * 100}%`,
                                top: `${placeholder.y * 100}%`,
                                width: `${
                                  Math.min(
                                    Math.max(placeholder.width, 0.01),
                                    1
                                  ) * 100
                                }%`,
                                height: `${
                                  Math.min(
                                    Math.max(placeholder.height, 0.01),
                                    1
                                  ) * 100
                                }%`,
                              }}
                              onMouseDown={(event) =>
                                handlePlaceholderMouseDown(
                                  event,
                                  placeholder.id
                                )
                              }
                            >
                              {isCheckbox ? (
                                <div className="flex items-center justify-center w-full h-full">
                                  <div
                                    className={`h-full w-full flex items-center justify-center border-2 rounded ${
                                      selectedPlaceholder === placeholder.id
                                        ? "border-primary"
                                        : "border-primary/70"
                                    } bg-primary/5`}
                                  >
                                    <Square
                                      className="h-3 w-3 md:h-4 md:w-4"
                                      style={{ color: textStyle.color }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className={labelWrapperClasses.join(" ")}>
                                  {isBoxType && fieldType && (
                                    <fieldType.icon className="h-3.5 w-3.5 text-primary" />
                                  )}
                                  <span
                                    className={
                                      BOX_FIELD_TYPES.has(placeholder.type)
                                        ? ""
                                        : "whitespace-nowrap"
                                    }
                                    style={
                                      BOX_FIELD_TYPES.has(placeholder.type)
                                        ? undefined
                                        : textStyle
                                    }
                                  >
                                    {placeholder.label}
                                  </span>
                                </div>
                              )}
                              {selectedPlaceholder === placeholder.id && (
                                <>
                                  {/* Delete button */}
                                  <div className="absolute -top-6 right-0 flex items-center gap-1 z-30">
                                    <button
                                      type="button"
                                      className="flex h-6 w-6 items-center justify-center rounded border border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeletePlaceholder(placeholder.id);
                                      }}
                                      title="Delete field"
                                    >
                                      <Trash2
                                        style={{
                                          height: "0.875rem",
                                          width: "0.875rem",
                                        }}
                                      />
                                    </button>
                                  </div>
                                  {/* Resize handles for all field types */}
                                  {
                                    <>
                                      {/* Top-left */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary hover:scale-110 transition-all"
                                        style={{
                                          top: "-0.2em",
                                          left: "-0.2em",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "nwse-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "nw"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Top-right */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary hover:scale-110 transition-all"
                                        style={{
                                          top: "-0.2em",
                                          right: "-0.2em",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "nesw-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "ne"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Bottom-left */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary hover:scale-110 transition-all"
                                        style={{
                                          bottom: "-0.2em",
                                          left: "-0.2em",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "nesw-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "sw"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Bottom-right */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary hover:scale-110 transition-all"
                                        style={{
                                          bottom: "-0.2em",
                                          right: "-0.2em",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "nwse-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "se"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Top */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary transition-all"
                                        style={{
                                          top: "-0.2em",
                                          left: "50%",
                                          transform: "translateX(-50%)",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "ns-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "n"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Bottom */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary transition-all"
                                        style={{
                                          bottom: "-0.2em",
                                          left: "50%",
                                          transform: "translateX(-50%)",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "ns-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "s"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Left */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary transition-all"
                                        style={{
                                          top: "50%",
                                          left: "-0.2em",
                                          transform: "translateY(-50%)",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "ew-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "w"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                      {/* Right */}
                                      <div
                                        className="resize-handle absolute bg-primary/80 border border-primary/60 rounded-full z-30 hover:bg-primary transition-all"
                                        style={{
                                          top: "50%",
                                          right: "-0.2em",
                                          transform: "translateY(-50%)",
                                          height: "0.4em",
                                          width: "0.4em",
                                          cursor: "ew-resize",
                                        }}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          handleResizeStart(
                                            e,
                                            placeholder.id,
                                            "e"
                                          );
                                        }}
                                        title="Resize"
                                      />
                                    </>
                                  }
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Document>
        </div>

        <div
          className={`${
            detailsSidebarOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
          } fixed lg:sticky lg:top-0 inset-y-0 right-0 z-30 w-80 bg-card/95 lg:bg-card/50 border-l flex flex-col backdrop-blur-sm transition-transform duration-300 ease-in-out shadow-lg lg:shadow-none`}
        >
          <div className="p-4 sm:p-6 border-b flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold mb-1">
                Details
              </h2>
              <p className="text-xs text-muted-foreground">
                API keys & styling
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setDetailsSidebarOpen(false)}
              >
                <span className="sr-only">Close details sidebar</span>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set the JSON key that this field should read from when you create
              a signing request. The label that appears on the PDF updates
              automatically to mirror the key you enter.
            </p>

            {configurablePlaceholders.length > 0 ? (
              <Accordion
                type="single"
                collapsible
                value={accordionValue}
                onValueChange={(value) => {
                  setSelectedPlaceholder(value ? Number(value) : null);
                  if (value) {
                    setDetailsSidebarOpen(true);
                  }
                }}
                className="space-y-2"
              >
                {configurablePlaceholders.map((placeholder) => {
                  const fieldType = FIELD_TYPE_MAP[placeholder.type];
                  const isDuplicate = duplicateApiKeys.has(placeholder.apiKey);
                  return (
                    <AccordionItem
                      key={placeholder.id}
                      value={String(placeholder.id)}
                      className={`rounded-md border bg-background/60 backdrop-blur-sm ${
                        isDuplicate ? "border-destructive/60" : "border-border"
                      }`}
                    >
                      <AccordionTrigger
                        className="px-3 py-2 hover:no-underline"
                        onClick={() => setSelectedPlaceholder(placeholder.id)}
                      >
                        <div className="flex w-full items-center gap-3 text-left">
                          {fieldType && (
                            <fieldType.icon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-tight">
                              {placeholder.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Page {placeholder.page} ·{" "}
                              {placeholder.apiKey || "Set API key"}
                              {isDuplicate && (
                                <span className="ml-2 text-destructive">
                                  (duplicate)
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-4 pt-0">
                        <div className="space-y-4 pt-3">
                          <div className="space-y-2">
                            <Label htmlFor={`api-key-${placeholder.id}`}>
                              JSON key
                            </Label>
                            <Input
                              id={`api-key-${placeholder.id}`}
                              value={placeholder.apiKey || ""}
                              onChange={(event) =>
                                updatePlaceholder(placeholder.id, {
                                  apiKey: event.target.value,
                                })
                              }
                              placeholder="e.g. name, bank_account, signerEmail"
                            />
                            {isDuplicate && (
                              <p className="text-xs text-destructive">
                                Duplicate key detected—choose a unique value to
                                map fields correctly.
                              </p>
                            )}
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Match the value you send in your request payload,
                              e.g.
                              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                data
                              </code>
                              keys like
                              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                templateId
                              </code>
                              ,
                              <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                                signerEmail
                              </code>
                              ).
                            </p>
                          </div>

                          {TEXT_STYLE_FIELD_TYPES.has(placeholder.type) && (
                            <div className="space-y-3 rounded-md border border-dashed border-border/70 bg-muted/40 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Text styling
                              </p>
                              <div className="flex items-end gap-3">
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`font-size-${placeholder.id}`}
                                  >
                                    Font size
                                  </Label>
                                  <Input
                                    id={`font-size-${placeholder.id}`}
                                    type="number"
                                    min={8}
                                    max={72}
                                    value={
                                      placeholder.textStyle?.fontSize ||
                                      DEFAULT_TEXT_STYLE.fontSize
                                    }
                                    onChange={(event) =>
                                      handleTextStyleChange(
                                        placeholder.id,
                                        "fontSize",
                                        Number(event.target.value) ||
                                          DEFAULT_TEXT_STYLE.fontSize
                                      )
                                    }
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label
                                    htmlFor={`font-color-${placeholder.id}`}
                                  >
                                    Color
                                  </Label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <input
                                      id={`font-color-${placeholder.id}`}
                                      type="color"
                                      value={
                                        placeholder.textStyle?.color ||
                                        DEFAULT_TEXT_STYLE.color
                                      }
                                      onChange={(event) =>
                                        handleTextStyleChange(
                                          placeholder.id,
                                          "color",
                                          event.target.value
                                        )
                                      }
                                      className="h-9 w-9 cursor-pointer rounded-md border border-input bg-transparent p-1"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label
                                  htmlFor={`font-weight-${placeholder.id}`}
                                >
                                  Font weight
                                </Label>
                                <select
                                  id={`font-weight-${placeholder.id}`}
                                  value={
                                    placeholder.textStyle?.fontWeight ||
                                    DEFAULT_TEXT_STYLE.fontWeight
                                  }
                                  onChange={(event) =>
                                    handleTextStyleChange(
                                      placeholder.id,
                                      "fontWeight",
                                      event.target.value
                                    )
                                  }
                                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                >
                                  <option value="400">Regular</option>
                                  <option value="500">Medium</option>
                                  <option value="600">Semi-bold</option>
                                  <option value="700">Bold</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {BOX_FIELD_TYPES.has(placeholder.type) && (
                            <p className="text-xs text-muted-foreground">
                              Resize the box directly on the PDF canvas to
                              adjust the signature or stamp area.
                            </p>
                          )}

                          <div className="pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                handleDeletePlaceholder(placeholder.id)
                              }
                            >
                              Remove Field
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="rounded-md border border-dashed border-border/70 bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Drag fields onto the PDF to configure their API keys and
                  styling.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFEditor;
